import json
import logging
import time
import hmac
import asyncio
import redis

from django.core.serializers.json import DjangoJSONEncoder
from django.conf import settings
from django.utils.encoding import force_bytes
from django.contrib.auth.models import User
from asgiref.sync import sync_to_async
from django.db import connection
from collections import defaultdict
from enum import Enum
from channels.generic.websocket import AsyncJsonWebsocketConsumer, AsyncWebsocketConsumer
from channels.layers import get_channel_layer
from channels.db import database_sync_to_async

logger = logging.getLogger('awx.main.consumers')
XRF_KEY = '_auth_user_xrf'


class WebsocketSecretAuthHelper:
    """
    Middlewareish for websockets to verify node websocket broadcast interconnect.

    Note: The "ish" is due to the channels routing interface. Routing occurs
    _after_ authentication; making it hard to apply this auth to _only_ a subset of
    websocket endpoints.
    """

    @classmethod
    def construct_secret(cls):
        nonce_serialized = f"{int(time.time())}"
        payload_dict = {'secret': settings.BROADCAST_WEBSOCKET_SECRET, 'nonce': nonce_serialized}
        payload_serialized = json.dumps(payload_dict)

        secret_serialized = hmac.new(force_bytes(settings.BROADCAST_WEBSOCKET_SECRET), msg=force_bytes(payload_serialized), digestmod='sha256').hexdigest()

        return 'HMAC-SHA256 {}:{}'.format(nonce_serialized, secret_serialized)

    @classmethod
    def verify_secret(cls, s, nonce_tolerance=300):
        try:
            (prefix, payload) = s.split(' ')
            if prefix != 'HMAC-SHA256':
                raise ValueError('Unsupported encryption algorithm')
            (nonce_parsed, secret_parsed) = payload.split(':')
        except Exception:
            raise ValueError("Failed to parse secret")

        try:
            payload_expected = {
                'secret': settings.BROADCAST_WEBSOCKET_SECRET,
                'nonce': nonce_parsed,
            }
            payload_serialized = json.dumps(payload_expected)
        except Exception:
            raise ValueError("Failed to create hash to compare to secret.")

        secret_serialized = hmac.new(force_bytes(settings.BROADCAST_WEBSOCKET_SECRET), msg=force_bytes(payload_serialized), digestmod='sha256').hexdigest()

        if secret_serialized != secret_parsed:
            raise ValueError("Invalid secret")

        # Avoid timing attack and check the nonce after all the heavy lifting
        now = int(time.time())
        nonce_parsed = int(nonce_parsed)
        nonce_diff = now - nonce_parsed
        if abs(nonce_diff) > nonce_tolerance:
            logger.warning(f"Potential replay attack or machine(s) time out of sync by {nonce_diff} seconds.")
            raise ValueError(f"Potential replay attack or machine(s) time out of sync by {nonce_diff} seconds.")

        return True

    @classmethod
    def is_authorized(cls, scope):
        secret = ''
        for k, v in scope['headers']:
            if k.decode("utf-8") == 'secret':
                secret = v.decode("utf-8")
                break
        WebsocketSecretAuthHelper.verify_secret(secret)


class RelayConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        try:
            WebsocketSecretAuthHelper.is_authorized(self.scope)
        except Exception:
            logger.warning(f"client '{self.channel_name}' failed to authorize against the broadcast endpoint.")
            await self.close()
            return

        await self.accept()
        await self.channel_layer.group_add(settings.BROADCAST_WEBSOCKET_GROUP_NAME, self.channel_name)
        logger.info(f"client '{self.channel_name}' joined the broadcast group.")

    async def disconnect(self, code):
        logger.info(f"client '{self.channel_name}' disconnected from the broadcast group.")
        await self.channel_layer.group_discard(settings.BROADCAST_WEBSOCKET_GROUP_NAME, self.channel_name)

    async def internal_message(self, event):
        await self.send(event['text'])

    async def receive_json(self, data):
        (group, message) = unwrap_broadcast_msg(data)
        if group == "metrics":
            message = json.loads(message['text'])
            conn = redis.Redis.from_url(settings.BROKER_URL)
            conn.set(settings.SUBSYSTEM_METRICS_REDIS_KEY_PREFIX + "_instance_" + message['instance'], message['metrics'])
        else:
            await self.channel_layer.group_send(group, message)

    async def consumer_subscribe(self, event):
        await self.send_json(event)

    async def consumer_unsubscribe(self, event):
        await self.send_json(event)


class EventConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope['user']
        if user and not user.is_anonymous:
            await self.accept()
            await self.send_json({"accept": True, "user": user.id})
            # store the valid CSRF token from the cookie so we can compare it later
            # on ws_receive
            cookie_token = self.scope['cookies'].get('csrftoken')
            if cookie_token:
                self.scope['session'][XRF_KEY] = cookie_token
        else:
            logger.error("Request user is not authenticated to use websocket.")
            # TODO: Carry over from channels 1 implementation
            # We should never .accept() the client and close without sending a close message
            await self.accept()
            await self.send_json({"close": True})
            await self.close()

    async def disconnect(self, code):
        current_groups = set(self.scope['session'].pop('groups') if 'groups' in self.scope['session'] else [])
        for group_name in current_groups:
            await self.channel_layer.group_discard(
                group_name,
                self.channel_name,
            )

        await self.channel_layer.group_send(
            settings.BROADCAST_WEBSOCKET_GROUP_NAME,
            {"type": "consumer.unsubscribe", "groups": list(current_groups), "origin_channel": self.channel_name},
        )

    @database_sync_to_async
    def user_can_see_object_id(self, user_access, oid):
        # At this point user is a channels.auth.UserLazyObject object
        # This causes problems with our generic role permissions checking.
        # Specifically, type(user) != User
        # Therefore, get the "real" User objects from the database before
        # calling the access permission methods
        user_access.user = User.objects.get(id=user_access.user.id)
        res = user_access.get_queryset().filter(pk=oid).exists()
        return res

    async def receive_json(self, data):
        from awx.main.access import consumer_access

        user = self.scope['user']
        xrftoken = data.get('xrftoken')
        if not xrftoken or XRF_KEY not in self.scope["session"] or xrftoken != self.scope["session"][XRF_KEY]:
            logger.error(f"access denied to channel, XRF mismatch for {user.username}")
            await self.send_json({"error": "access denied to channel"})
            return

        if 'groups' in data:
            groups = data['groups']
            new_groups = set()
            current_groups = set(self.scope['session'].pop('groups') if 'groups' in self.scope['session'] else [])
            for group_name, v in groups.items():
                if type(v) is list:
                    for oid in v:
                        name = '{}-{}'.format(group_name, oid)
                        access_cls = consumer_access(group_name)
                        if access_cls is not None:
                            user_access = access_cls(user)
                            if not await self.user_can_see_object_id(user_access, oid):
                                await self.send_json({"error": "access denied to channel {0} for resource id {1}".format(group_name, oid)})
                                continue
                        new_groups.add(name)
                else:
                    await self.send_json({"error": "access denied to channel"})
                    logger.error(f"groups must be a list, not {groups}")
                    return

            old_groups = current_groups - new_groups
            for group_name in old_groups:
                await self.channel_layer.group_discard(
                    group_name,
                    self.channel_name,
                )

            if len(old_groups):
                await self.channel_layer.group_send(
                    settings.BROADCAST_WEBSOCKET_GROUP_NAME,
                    {"type": "consumer.unsubscribe", "groups": list(old_groups), "origin_channel": self.channel_name},
                )

            new_groups_exclusive = new_groups - current_groups
            for group_name in new_groups_exclusive:
                await self.channel_layer.group_add(group_name, self.channel_name)

            await self.channel_layer.group_send(
                settings.BROADCAST_WEBSOCKET_GROUP_NAME,
                {"type": "consumer.subscribe", "groups": list(new_groups), "origin_channel": self.channel_name},
            )
            self.scope['session']['groups'] = new_groups
            await self.send_json({"groups_current": list(new_groups), "groups_left": list(old_groups), "groups_joined": list(new_groups_exclusive)})

    async def internal_message(self, event):
        await self.send(event['text'])


class FirewallStatus(Enum):
    WAITING = "waiting"
    DOWNLOADING = "downloading"
    SOLAR_WIND_MUTE = "solar_wind_mute"
    BACKUP = "backup"
    INSTALLING = "installing"
    REBOOTING = "rebooting"
    COMMIT = "commit"
    PING = "ping"
    LOGIN = "login"
    SOLAR_WIND_UNMUTE = "solar_wind_unmute"
    UPDATED = "updated"

class UpdateFirewallsConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()

    async def disconnect(self, close_code):
        pass
    
    async def downloading_firewalls(self, ip):
        await asyncio.sleep(10)
        return True
    
    async def solar_wind_mute_firewalls(self, ip):
        await asyncio.sleep(10)
        return True

    async def backup_firewalls(self, ip):

        # Replace with your firewall details
        hostname = '10.215.18.85'
        api_key = 'LUFRPT1OcGRFZnlUZkNTdTNibU9XeVN4UFdxTmJlYzA9REp3U0w5QzZMc0N4bzFEK1U1cjI2Vk8vMmlEOEt6cEoyMlFYQXMvRTJkVCtHZ29Za0l6Q05tejFTdmg0MnJMbA=='
        config_name = '10.215.18.85'

        # Define the API endpoint
        url = f'https://{hostname}/api/'

        # Define the parameters for the export request
        params_config = {
            'type': 'export',
            'category': 'configuration',
            'action': 'save',
            'key': api_key
        }

        params_device_state = {
            'type': 'export',
            'category': 'device-state',
            'action': 'save',
            'key': api_key
        }
        
        # Function to send the export request and save the response
        def export_and_save(params, filename):
            import xml.etree.ElementTree as ET

            # Create the root element
            root = ET.Element("root")

            # Create child elements
            child1 = ET.SubElement(root, "child1")
            child2 = ET.SubElement(root, "child2")

            # Add some data to the child elements
            child1.text = "Data for Child 1"
            child2.text = "Data for Child 2"

            # Create the XML tree
            tree = ET.ElementTree(root)

            # Write the tree to an XML string
            xml_content = ET.tostring(root, encoding="utf-8", method="xml")

            # Write the tree to an XML file
            # tree.write(filename)

            # with open(filename, 'wb') as file:
            #     file.write(content)
            # print(f'Successfully saved to {filename}')

            return xml_content

        file1 = f'backup_file/{config_name}_config_backup.xml'
        # Export and save the configuration
        xml_content1 = export_and_save(params_config, file1)

        file2 = f'backup_file/{config_name}_device_state_backup.xml'
        # Export and save the device state
        xml_content2 = export_and_save(params_device_state, file2)
        await self.send(text_data=json.dumps({'file1':xml_content1.decode("utf-8"), 'file2':xml_content2.decode("utf-8")}))
        await asyncio.sleep(10)
        return True

    async def installing_firewalls(self, ip):
        await asyncio.sleep(10)
        return True
    
    async def rebooting_firewalls(self, ip):
        await asyncio.sleep(10)
        return True
    
    async def commit_firewalls(self, ip):
        await asyncio.sleep(10)
        return True
    
    async def ping_firewalls(self, ip):
        await asyncio.sleep(10)
        return True
    
    async def login_firewalls(self, ip):
        await asyncio.sleep(10)
        return True

    async def updated_firewalls(self, ip):
        pass
    
    async def solar_wind_unmute_firewalls(self, ip):
        await asyncio.sleep(10)
        return True
    
    async def change_next_status(self, firewall, response_data, group_name, i, status):
        response_data[group_name][i['ip']] = {"status": status.value, "name": i['name']}
        firewall.status = status.value
        await sync_to_async(firewall.save)()
        await self.send(text_data=json.dumps(response_data))
    
    async def change_firewall_status(self, firewall, result, group_name, ip, new_status):
        await self.change_next_status(firewall, result, group_name, ip, new_status)
        task_method = getattr(self, f"{new_status.value.lower()}_firewalls")
        _result = await task_method(ip)
        return _result
    
    async def process_firewall_status(self, firewall, result, group_name, ip, status_sequence):
        for new_status in status_sequence:
            _result = await self.change_firewall_status(firewall, result, group_name, ip, new_status)
        return _result


    @sync_to_async
    def get_firewall_statuses(self, job_id):
        from awx.main.models import UpdateFirewallStatus
        statuses = UpdateFirewallStatus.objects.filter(job_id=job_id).order_by('-updated_at')
        result = defaultdict(dict)
        res = {status.ip_address: status.status for status in statuses}
        for _status in statuses:
            if _status.group_name:
                result[_status.group_name][_status.ip_address] = {"status":_status.status, "name": _status.name}
        return result, res

    async def async_send_initial_status(self, job_id):
        from awx.main.models import UpdateFirewallStatus
        result, response_data  = await self.get_firewall_statuses(job_id)
        await self.send(text_data=json.dumps(result))
        tasks = []
        for response in response_data.keys():
            firewall = await sync_to_async(UpdateFirewallStatus.objects.get)(
                job_id=job_id,
                ip_address=response
            )
            if firewall.group_name not in result:
                result[firewall.group_name] = {}

            if firewall.status == FirewallStatus.WAITING.value:
                status_sequence = [
                    FirewallStatus.DOWNLOADING,
                    FirewallStatus.SOLAR_WIND_MUTE,
                    FirewallStatus.BACKUP,
                    FirewallStatus.INSTALLING,
                    FirewallStatus.REBOOTING,
                    FirewallStatus.COMMIT,
                    FirewallStatus.PING,
                    FirewallStatus.LOGIN,
                    FirewallStatus.SOLAR_WIND_UNMUTE,
                    FirewallStatus.UPDATED
                ]
                # await self.process_firewall_status(firewall, result, firewall.group_name, response, status_sequence)
                tasks.append(self.process_firewall_status(firewall, result, firewall.group_name, response, status_sequence))

            elif firewall.status == FirewallStatus.DOWNLOADING.value:
                status_sequence = [
                    FirewallStatus.SOLAR_WIND_MUTE,
                    FirewallStatus.BACKUP,
                    FirewallStatus.INSTALLING,
                    FirewallStatus.REBOOTING,
                    FirewallStatus.COMMIT,
                    FirewallStatus.PING,
                    FirewallStatus.LOGIN,
                    FirewallStatus.SOLAR_WIND_UNMUTE,
                    FirewallStatus.UPDATED
                ]
                # await self.process_firewall_status(firewall, result, firewall.group_name, response, status_sequence)
                tasks.append(self.process_firewall_status(firewall, result, firewall.group_name, response, status_sequence))
            
            elif firewall.status == FirewallStatus.SOLAR_WIND_MUTE.value:
                status_sequence = [
                    FirewallStatus.BACKUP,
                    FirewallStatus.INSTALLING,
                    FirewallStatus.REBOOTING,
                    FirewallStatus.COMMIT,
                    FirewallStatus.PING,
                    FirewallStatus.LOGIN,
                    FirewallStatus.SOLAR_WIND_UNMUTE,
                    FirewallStatus.UPDATED
                ]
                # await self.process_firewall_status(firewall, result, firewall.group_name, response, status_sequence)
                tasks.append(self.process_firewall_status(firewall, result, firewall.group_name, response, status_sequence))

            elif firewall.status == FirewallStatus.BACKUP.value:
                status_sequence = [
                    FirewallStatus.INSTALLING,
                    FirewallStatus.REBOOTING,
                    FirewallStatus.COMMIT,
                    FirewallStatus.PING,
                    FirewallStatus.LOGIN,
                    FirewallStatus.SOLAR_WIND_UNMUTE,
                    FirewallStatus.UPDATED
                ]
                # await self.process_firewall_status(firewall, result, firewall.group_name, response, status_sequence)
                tasks.append(self.process_firewall_status(firewall, result, firewall.group_name, response, status_sequence))
            
            elif firewall.status == FirewallStatus.INSTALLING.value:
                status_sequence = [
                    FirewallStatus.REBOOTING,
                    FirewallStatus.COMMIT,
                    FirewallStatus.PING,
                    FirewallStatus.LOGIN,
                    FirewallStatus.SOLAR_WIND_UNMUTE,
                    FirewallStatus.UPDATED
                ]
                # await self.process_firewall_status(firewall, result, firewall.group_name, response, status_sequence)
                tasks.append(self.process_firewall_status(firewall, result, firewall.group_name, response, status_sequence))
            
            elif firewall.status == FirewallStatus.REBOOTING.value:
                status_sequence = [
                    FirewallStatus.COMMIT,
                    FirewallStatus.PING,
                    FirewallStatus.LOGIN,
                    FirewallStatus.SOLAR_WIND_UNMUTE,
                    FirewallStatus.UPDATED
                ]
                # await self.process_firewall_status(firewall, result, firewall.group_name, response, status_sequence)
                tasks.append(self.process_firewall_status(firewall, result, firewall.group_name, response, status_sequence))
            
            elif firewall.status == FirewallStatus.COMMIT.value:
                status_sequence = [
                    FirewallStatus.PING,
                    FirewallStatus.LOGIN,
                    FirewallStatus.SOLAR_WIND_UNMUTE,
                    FirewallStatus.UPDATED
                ]
                # await self.process_firewall_status(firewall, result, firewall.group_name, response, status_sequence)
                tasks.append(self.process_firewall_status(firewall, result, firewall.group_name, response, status_sequence))
            
            elif firewall.status == FirewallStatus.PING.value:
                status_sequence = [
                    FirewallStatus.LOGIN,
                    FirewallStatus.SOLAR_WIND_UNMUTE,
                    FirewallStatus.UPDATED
                ]
                # await self.process_firewall_status(firewall, result, firewall.group_name, response, status_sequence)
                tasks.append(self.process_firewall_status(firewall, result, firewall.group_name, response, status_sequence))
            
            elif firewall.status == FirewallStatus.LOGIN.value:
                status_sequence = [
                    FirewallStatus.SOLAR_WIND_UNMUTE,
                    FirewallStatus.UPDATED
                ]
                # await self.process_firewall_status(firewall, result, firewall.group_name, response, status_sequence)
                tasks.append(self.process_firewall_status(firewall, result, firewall.group_name, response, status_sequence))
            
            elif firewall.status == FirewallStatus.SOLAR_WIND_UNMUTE.value:
                status_sequence =FirewallStatus.UPDATED
                # await self.change_next_status(firewall, result, firewall.group_name, response, status_sequence)
                tasks.append(self.change_next_status(firewall, result, firewall.group_name, response, status_sequence))
        
        if firewall.sequence:
            await asyncio.gather(*tasks)
        else:
            for task in tasks:
                await task


    async def receive(self, text_data):
        from awx.main.models import UpdateFirewallStatus
        text_data_json = json.loads(text_data)
        job_id = text_data_json.get('job_id')
        sequence = text_data_json.get('sequence')
        ip_address = text_data_json.get('ip_address', [])

        if ip_address and job_id:
            response_data = {}
            for _ip in ip_address:
                group_name = _ip['parent']
                child = _ip['child']
                
                if group_name not in response_data:
                    response_data[group_name] = {}
                
                for i in child:
                    firewall_status, created = await sync_to_async(UpdateFirewallStatus.objects.get_or_create)(
                        job_id=job_id,
                        ip_address=i['ip'],
                        defaults={'group_name': group_name, 'status': 'waiting', 'sequence': sequence, 'name': i['name']}
                    )
                    response_data[group_name][i['ip']] = {"status":"waiting", "name":i['name']}

            tasks = []
            for _ip in ip_address:
                group_name = _ip['parent']
                child = _ip['child']

                for i in child:
                    firewall_status, created = await sync_to_async(UpdateFirewallStatus.objects.get_or_create)(
                        job_id=job_id,
                        ip_address=i['ip'],
                    )
                    
                    if not created:
                        status_sequence = [
                            FirewallStatus.DOWNLOADING,
                            FirewallStatus.SOLAR_WIND_MUTE,
                            FirewallStatus.BACKUP,
                            FirewallStatus.INSTALLING,
                            FirewallStatus.REBOOTING,
                            FirewallStatus.COMMIT,
                            FirewallStatus.PING,
                            FirewallStatus.LOGIN,
                            FirewallStatus.SOLAR_WIND_UNMUTE,
                            FirewallStatus.UPDATED
                        ]
                        # await self.process_firewall_status(firewall_status, response_data, group_name, i, status_sequence)
                        tasks.append(self.process_firewall_status(firewall_status, response_data, group_name, i, status_sequence))
            
            if sequence:
                await asyncio.gather(*tasks)
            else:
                for task in tasks:
                    await task
        else:
            await self.async_send_initial_status(job_id)


def run_sync(func):
    event_loop = asyncio.new_event_loop()
    event_loop.run_until_complete(func)
    event_loop.close()


def _dump_payload(payload):
    try:
        return json.dumps(payload, cls=DjangoJSONEncoder)
    except ValueError:
        logger.error("Invalid payload to emit")
        return None


def unwrap_broadcast_msg(payload: dict):
    return (payload['group'], payload['message'])


def emit_channel_notification(group, payload):
    payload_dumped = _dump_payload(payload)
    if payload_dumped is None:
        return

    channel_layer = get_channel_layer()

    run_sync(
        channel_layer.group_send(
            group,
            {"type": "internal.message", "text": payload_dumped, "needs_relay": True},
        )
    )
