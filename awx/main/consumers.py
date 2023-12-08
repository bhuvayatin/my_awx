import json
import logging
import time
import hmac
import asyncio
import redis
import requests
import xml.etree.ElementTree as ET
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
    SOLAR_WIND_MUTE = "solar_wind_mute"
    BACKUP = "backup"
    CLEANUP = "cleanup"   
    DOWNLOAD = "download"
    INSTALL = "install"
    REBOOT = "reboot"
    LOGIN = "login"
    SOLAR_WIND_UNMUTE = "solar_wind_unmute"
    UPDATED = "updated"
    ERROR = "error"

class UpdateFirewallsConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()

    async def disconnect(self, close_code):
        pass
    
    # Function to send the export request and save the response
    async def export_and_save(self, params, filename, job_id, ip):
        from awx.main.models import UpdateFirewallBackupFile

        # Define the API endpoint
        url = f'https://{ip}/api/'
        try:
            response = requests.get(url, params=params, verify=False, timeout=10)
            if response.status_code == 200:
                firewall_backup_file = await sync_to_async(UpdateFirewallBackupFile.objects.create)(
                    job_id=job_id,
                    ip_address=ip,
                    file_name=filename,
                    xml_content=response.content
                )
                with open(filename, 'wb') as file:
                    file.write(response.content)
                print(f'Successfully saved to {filename}')
                return True
            else:
                print(f'Failed to save to {filename}')
                return False
        except Exception as e:
            print(f'Failed to save to {filename}')
            return False

    async def create_firewall_status_log(self, job_id, ip, text):
        from awx.main.models import UpdateFirewallStatusLogs
        firewall_log = await sync_to_async(UpdateFirewallStatusLogs.objects.create)(
                    job_id=job_id,
                    ip_address=ip,
                    text=text
                )

    async def download_firewalls(self, firewall, ip, job_id, api_key, version_to_download, current_version):
        await self.create_firewall_status_log(job_id, ip, "downloading started")

        # Define the API endpoint
        url = f'https://{ip}/api/'

        # Define the parameters for the get request
        params_get = {
            'type': 'op',
            'cmd': '<request><system><software><check></check></software></system></request>',
            'key': api_key
        }

        # Send the get request
        response = requests.get(url, params=params_get, verify=False)

        # Check the response
        if response.status_code == 200:
            print('Successfully retrieved software versions')
            await self.create_firewall_status_log(job_id, ip, "Successfully retrieved the current software versions")
            root = ET.fromstring(response.text)
            entry = root.find(f".//versions/entry[version='{version_to_download}']")
            if entry is not None and entry.find('downloaded').text == 'yes':
                print(f'Software version {version_to_download} is already downloaded')
                await self.create_firewall_status_log(job_id, ip, f'Software version {version_to_download} is already downloaded')
            else:
                # Define the parameters for the download request
                params_download = {
                    'type': 'op',
                    'cmd': f'<request><system><software><download><version>{version_to_download}</version></download></software></system></request>',
                    'key': api_key
                }

                # Send the download request
                response = requests.get(url, params=params_download, verify=False)

                # Check the response
                if response.status_code == 200:
                    print(f'Successfully started download of software version {version_to_download}')
                    await self.create_firewall_status_log(job_id, ip,f'Started downloading the targeted software version: {version_to_download}')
                else:
                    print(f'Failed to start download of software version {version_to_download}')
                    await self.create_firewall_status_log(job_id, ip,f'Failed to start download of software version {version_to_download}')

                # Wait for the download to complete
                for i in range(15):  # Try 10 times
                    response = requests.get(url, params=params_get, verify=False)
                    if response.status_code == 200:
                        root = ET.fromstring(response.text)
                        entry = root.find(f".//versions/entry[version='{version_to_download}']")
                        if entry is not None and entry.find('downloaded').text == 'yes':
                            print(f'Successfully downloaded software version {version_to_download}')
                            await self.create_firewall_status_log(job_id, ip,f'Successfully downloaded software version {version_to_download}')
                            break
                    print('Waiting for download to complete...')
                    await self.create_firewall_status_log(job_id, ip,f'Waiting for download to complete...')
                    await asyncio.sleep(60)  # Wait for 60 seconds before checking again
                else:
                    print('Download did not complete after 10 minutes')
                    await self.create_firewall_status_log(job_id, ip,f'Maximum tries reached and software download failed after 15 mins')
                    return False #todo : Error
        await self.create_firewall_status_log(job_id, ip, "downloading completed")
        return False
    
    async def solar_wind_mute_firewalls(self, firewall, ip, job_id, api_key, version_to_download, current_version):
        await self.create_firewall_status_log(job_id, ip, "solar_wind_mute started")
        await asyncio.sleep(10)
        await self.create_firewall_status_log(job_id, ip, "This module is not implmeneted yet.")
        await self.create_firewall_status_log(job_id, ip, "solar_wind_mute completed")
        return True

    async def backup_firewalls(self, firewall, ip, job_id, api_key, version_to_download, current_version):
        await self.create_firewall_status_log(job_id, ip, "backup started")
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

        file1 = f'backup_file/{ip}_{current_version}_config_backup.xml'
        # Export and save the configuration
        file1_result = await self.export_and_save(params_config, file1, job_id, ip)

        file2 = f'backup_file/{ip}_{current_version}_device_state_backup.xml'
        # Export and save the device state
        file2_result = await self.export_and_save(params_device_state, file2, job_id, ip)
        if file1_result and file2_result:
            await self.create_firewall_status_log(job_id, ip, "Successfully downloaded all back file")
            return True
        else:
            await self.create_firewall_status_log(job_id, ip, "Backup files are not downloading")
        return False

    async def cleanup_firewalls(self, firewall, ip, job_id, api_key, version_to_download, current_version):
        await self.create_firewall_status_log(job_id, ip, f'Removing all the old software from {ip}')
        
        # Define the API endpoint
        url = f'https://{ip}/api/'

        # Define the parameters for the get request
        params_get = {
            'type': 'op',
            'cmd': '<request><system><software><check></check></software></system></request>',
            'key': api_key
        }

        # Send the get request
        response = requests.get(url, params=params_get, verify=False)

        # Check the response
        if response.status_code == 200:
            await self.create_firewall_status_log(job_id, ip, f'Successfully retrieved software versions for {ip}')
            root = ET.fromstring(response.text)
            
            for entry in root.findall('.//versions/entry'):
                
                downloaded = entry.find('downloaded').text
                current = entry.find('current').text
                version = entry.find('version').text
                
                if downloaded == 'yes' and current == 'no':
                    params_delete = {
                        'type': 'op',
                        'cmd': f'<request><system><software><delete><version>{version}</version></delete></software></system></request>',
                        'key': api_key
                    }
                    response = requests.get(url, params=params_delete, verify=False)
                    if response.status_code == 200:
                        await self.create_firewall_status_log(job_id, ip, f'Successfully deleted software version {version}')
                        
                    else:
                        await self.create_firewall_status_log(job_id, ip, f"Failed to delete software version {version}")
        else:
            await self.create_firewall_status_log(job_id, ip, f'Failed to retrieve software versions')

        await self.create_firewall_status_log(job_id, ip, 'Successfully deleted all the old softwares')
        return True

    async def install_firewalls(self, firewall, ip, job_id, api_key, version_to_download, current_version):
        await self.create_firewall_status_log(job_id, ip, f'Installing {version_to_download} on {ip}')
                                              
        # Define the API endpoint
        url = f'https://{ip}/api/'

        # Define the parameters for the install request
        params_install = {
            'type': 'op',
            'cmd': f'<request><system><software><install><version>{version_to_download}</version></install></software></system></request>',
            'key': api_key
        }

        # Send the install request
        response = requests.get(url, params=params_install, verify=False)

        # Check the response
        if response.status_code == 200:
            print(f'Successfully installed software version {version_to_download}')
            await self.create_firewall_status_log(job_id, ip, f'Successfully installed software version {version_to_download}')
        else:
            print(f'Failed to install software version {version_to_download}')
            await self.create_firewall_status_log(job_id, ip, f'Failed to install software version {version_to_download}')

        params_get = {
            'type': 'op',
            'cmd': '<request><system><software><check></check></software></system></request>',
            'key': api_key
        }

        for i in range(10):  # Try 10 times
            response = requests.get(url, params=params_get, verify=False)
            if response.status_code == 200:
                root = ET.fromstring(response.text)
                entry = root.find(f".//versions/entry[version='{version_to_download}']")
                if entry is not None and entry.find('current').text == 'yes':
                    print(f'Successfully installed software version {version_to_download}')
                    await self.create_firewall_status_log(job_id, ip, f'Successfully installed software version {version_to_download}')
                    break
            print('Waiting for installation to complete...')
            await self.create_firewall_status_log(job_id, ip, f'Waiting for installation to complete...')
            await asyncio.sleep(60)  # Wait for 60 seconds before checking again
        else:
            print('Installation did not complete after 10 minutes')
            await self.create_firewall_status_log(job_id, ip, f'Installation did not complete after 10 minutes')
            return False
        return True
    
    async def reboot_firewalls(self, firewall, ip, job_id, api_key, version_to_download, current_version):
        await self.create_firewall_status_log(job_id, ip, f'Rebooting started on  {ip}')
        
        # Define the API endpoint
        url = f'https://{ip}/api/'

        # Define the parameters for the reboot request
        params_reboot = {
            'type': 'op',
            'cmd': '<request><restart><system></system></restart></request>',
            'key': api_key
        }

        # Send the reboot request
        response = requests.get(url, params=params_reboot, verify=False)

        # Check the response
        if response.status_code == 200:
            print('Successfully rebooted the firewall')
            await self.create_firewall_status_log(job_id, ip, f'Successfully rebooted {ip}')
        else:
            print('Failed to reboot the firewall')
            await self.create_firewall_status_log(job_id, ip, f'Failed to reboot {ip}')
            return False  #todo: every time it return False show the error

        # Define the parameters for the get request
        params_get = {
            'type': 'op',
            'cmd': '<request><system><software><check></check></software></system></request>',
            'key': api_key
        }

        for i in range(10): 
            await asyncio.sleep(60)
            await self.create_firewall_status_log(job_id, ip, f'{ip} Waiting for firewall to reboot...')

        # Wait for the firewall to come back online
        for i in range(10):  # Try 20 times
            try:
                response = requests.get(url, params=params_get, verify=False)
                if response.status_code == 200:
                    print('Firewall is back online')
                    await self.create_firewall_status_log(job_id, ip, f'{ip} is back online')
                    break
            except requests.exceptions.RequestException:
                print('Waiting for firewall to reboot...')
                await self.create_firewall_status_log(job_id, ip, f'{ip} Waiting for firewall to reboot...')
                await asyncio.sleep(60) # Wait for 60 seconds before checking again
        else:
            print('Firewall did not come back online after 10 minutes')
            await self.create_firewall_status_log(job_id, ip, f'{ip} did not come back online after 20 minutes')
            return False #sys.exit()  # Stop the script execution

        # Check the installed software version
        response = requests.get(url, params=params_get, verify=False)
        if response.status_code == 200:
            root = ET.fromstring(response.text)
            entry = root.find(f".//sw-version")
            if entry is not None and entry.text == version_to_download:
                print(f'Successfully installed software version {version_to_download}')
                await self.create_firewall_status_log(job_id, ip, f'Successfully installed software version {version_to_download}')
            else:
                print(f'Failed to install software version {version_to_download}')
                await self.create_firewall_status_log(job_id, ip, f'Failed to install software version {version_to_download}')
                return False

        await self.create_firewall_status_log(job_id, ip, "Rebooting completed.")
        return True
    
    async def commit_firewalls(self, firewall, ip, job_id, api_key, version_to_download, current_version):
        await self.create_firewall_status_log(job_id, ip, "commit started")
        await asyncio.sleep(10)
        await self.create_firewall_status_log(job_id, ip, "commit completed")
        return True
    
    async def ping_firewalls(self, firewall, ip, job_id, api_key, version_to_download, current_version):
        await self.create_firewall_status_log(job_id, ip, "ping started")
        await asyncio.sleep(10)
        await self.create_firewall_status_log(job_id, ip, "ping completed")
        return True
    
    async def login_firewalls(self, firewall, ip, job_id, api_key, version_to_download, current_version):
        await self.create_firewall_status_log(job_id, ip, "login started")
        await asyncio.sleep(10)
        await self.create_firewall_status_log(job_id, ip, "login completed")
        return True
    
    async def solar_wind_unmute_firewalls(self, firewall, ip, job_id, api_key, version_to_download, current_version):
        await self.create_firewall_status_log(job_id, ip, "solar_wind_unmute started")
        await asyncio.sleep(10)
        await self.create_firewall_status_log(job_id, ip, "solar_wind_unmute completed")
        return True

    async def updated_firewalls(self, firewall, ip, job_id, api_key, version_to_download, current_version):
        await self.create_firewall_status_log(job_id, ip, "ip_addtess updated successfully")
        return True


    async def process_firewall_status(self, firewall, result, group_name, ip, status_sequence, name, job_id, api_key, update_version, current_version):
        for new_status in status_sequence:

            task_method = getattr(self, f"{new_status.value.lower()}_firewalls")
            _result = await task_method(firewall, ip, job_id, api_key, update_version, current_version)
            if _result:
                result[group_name][ip] = {"status": new_status.value, "name": name}
                firewall.status = new_status.value
                await sync_to_async(firewall.save)()
                await self.send(text_data=json.dumps(result))
            else:
                result[group_name][ip] = {"status": 'error', "name": name}
                firewall.status = 'error'
                await sync_to_async(firewall.save)()
                await self.send(text_data=json.dumps(result))
                error_occurred = True
                break
        return not error_occurred


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
                    
                    FirewallStatus.SOLAR_WIND_MUTE,
                    FirewallStatus.BACKUP,
                    FirewallStatus.CLEANUP,
                    FirewallStatus.DOWNLOAD,
                    FirewallStatus.INSTALL,
                    FirewallStatus.REBOOT,
                    FirewallStatus.LOGIN,
                    FirewallStatus.SOLAR_WIND_UNMUTE,
                    FirewallStatus.UPDATED
                ]
                tasks.append(self.process_firewall_status(firewall, result, firewall.group_name, response, status_sequence, firewall.name, job_id, firewall.api_key, firewall.update_version, firewall.current_version))

            elif firewall.status == FirewallStatus.SOLAR_WIND_MUTE.value:
                status_sequence = [
                    FirewallStatus.BACKUP,
                    FirewallStatus.CLEANUP,
                    FirewallStatus.DOWNLOAD,
                    FirewallStatus.INSTALL,
                    FirewallStatus.REBOOT,
                    FirewallStatus.LOGIN,
                    FirewallStatus.SOLAR_WIND_UNMUTE,
                    FirewallStatus.UPDATED
                ]
                tasks.append(self.process_firewall_status(firewall, result, firewall.group_name, response, status_sequence, firewall.name, job_id, firewall.api_key, firewall.update_version, firewall.current_version))

            elif firewall.status == FirewallStatus.BACKUP.value:
                status_sequence = [
                    FirewallStatus.CLEANUP,
                    FirewallStatus.DOWNLOAD,
                    FirewallStatus.INSTALL,
                    FirewallStatus.REBOOT,
                    FirewallStatus.LOGIN,
                    FirewallStatus.SOLAR_WIND_UNMUTE,
                    FirewallStatus.UPDATED
                ]
                tasks.append(self.process_firewall_status(firewall, result, firewall.group_name, response, status_sequence, firewall.name, job_id, firewall.api_key, firewall.update_version, firewall.current_version))
            
            elif firewall.status == FirewallStatus.CLEANUP.value:
                status_sequence = [
                    FirewallStatus.DOWNLOAD,
                    FirewallStatus.INSTALL,
                    FirewallStatus.REBOOT,
                    FirewallStatus.LOGIN,
                    FirewallStatus.SOLAR_WIND_UNMUTE,
                    FirewallStatus.UPDATED
                ]
                tasks.append(self.process_firewall_status(firewall, result, firewall.group_name, response, status_sequence, firewall.name, job_id, firewall.api_key, firewall.update_version, firewall.current_version))

            elif firewall.status == FirewallStatus.DOWNLOAD.value:
                status_sequence = [
                    FirewallStatus.INSTALL,
                    FirewallStatus.REBOOT,
                    FirewallStatus.LOGIN,
                    FirewallStatus.SOLAR_WIND_UNMUTE,
                    FirewallStatus.UPDATED
                ]
                tasks.append(self.process_firewall_status(firewall, result, firewall.group_name, response, status_sequence, firewall.name, job_id, firewall.api_key, firewall.update_version, firewall.current_version))
            
            elif firewall.status == FirewallStatus.INSTALL.value:
                status_sequence = [
                    FirewallStatus.REBOOT,
                    FirewallStatus.LOGIN,
                    FirewallStatus.SOLAR_WIND_UNMUTE,
                    FirewallStatus.UPDATED
                ]
                tasks.append(self.process_firewall_status(firewall, result, firewall.group_name, response, status_sequence, firewall.name, job_id, firewall.api_key, firewall.update_version, firewall.current_version))
            
            elif firewall.status == FirewallStatus.REBOOT.value:
                status_sequence = [
                    FirewallStatus.LOGIN,
                    FirewallStatus.SOLAR_WIND_UNMUTE,
                    FirewallStatus.UPDATED
                ]
                tasks.append(self.process_firewall_status(firewall, result, firewall.group_name, response, status_sequence, firewall.name, job_id, firewall.api_key, firewall.update_version, firewall.current_version))
            
            elif firewall.status == FirewallStatus.LOGIN.value:
                status_sequence = [
                    FirewallStatus.SOLAR_WIND_UNMUTE,
                    FirewallStatus.UPDATED
                ]
                tasks.append(self.process_firewall_status(firewall, result, firewall.group_name, response, status_sequence, firewall.name, job_id), firewall.api_key, firewall.update_version, firewall.current_version)
            
            elif firewall.status == FirewallStatus.SOLAR_WIND_UNMUTE.value:
                status_sequence =FirewallStatus.UPDATED
                tasks.append(self.change_next_status(firewall, result, firewall.group_name, response, status_sequence, firewall.name))
            
            elif firewall.status == FirewallStatus.ERROR.value:
                pass
        
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
        update_version = text_data_json.get('update_version')
        api_key = text_data_json.get('api_key')

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
                        defaults={'group_name': group_name, 'status': 'waiting', 'sequence': sequence, 'name': i['name'], 'api_key':api_key, 'update_version':update_version, 'current_version':i['current_version']}
                    )
                    response_data[group_name][i['ip']] = {"status":"waiting", "name":i['name']}
            await self.send(text_data=json.dumps(response_data))
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
                            FirewallStatus.SOLAR_WIND_MUTE,
                            FirewallStatus.BACKUP,
                            FirewallStatus.CLEANUP,
                            FirewallStatus.DOWNLOAD,
                            FirewallStatus.INSTALL,
                            FirewallStatus.REBOOT,
                            FirewallStatus.LOGIN,
                            FirewallStatus.SOLAR_WIND_UNMUTE,
                            FirewallStatus.UPDATED
                        ]
                        tasks.append(self.process_firewall_status(firewall_status, response_data, group_name, i['ip'], status_sequence, i['name'], job_id, api_key, update_version, i['current_version']))
            
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