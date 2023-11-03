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


class UpdateFirewallsConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()
        await self.send_initial_status()

    async def disconnect(self, close_code):
        pass
    
    async def processing_firewalls(self, ip):
        await asyncio.sleep(10)
        return True

    async def installing_firewalls(self, ip):
        await asyncio.sleep(20)
        return True
    
    def send_initial_status(self):
        from awx.main.models import UpdateFirewallStatus
        statuses = UpdateFirewallStatus.objects.all()
        response_data = {status.ip_address: status.status for status in statuses}
        self.send(text_data=json.dumps(response_data))

    async def async_send_initial_status(self):
        await sync_to_async(self.send_initial_status)()

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        ip_addresses = text_data_json.get('ip_addresses', [])
        
        response_data = {}
        for i in ip_addresses:
            response_data[i] = "waiting"

        for ip in ip_addresses:
            response_data[ip] = "processing"
            await self.send(text_data=json.dumps(response_data))
            is_process = await self.processing_firewalls(ip)
            response_data[ip] = "installing"
            await self.send(text_data=json.dumps(response_data))
            is_install = await self.installing_firewalls(ip)
            response_data[ip] = "updated"
            await self.send(text_data=json.dumps(response_data))
            
            from awx.main.models import UpdateFirewallStatus
            status = "updated"
            firewall_status, created = UpdateFirewallStatus.objects.get_or_create(
                job_id=97,
                ip_address=ip,
                defaults={'status': status}
            )
            print('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>',UpdateFirewallStatus.objects.all())
            if not created:
                firewall_status.status = status
                await sync_to_async(firewall_status.save)()
        async def send_initial_status(self):
            async def inner_send_initial_status():
                await self.async_send_initial_status()

            with connection.cursor() as cursor:
                cursor.execute('BEGIN')
                inner_send_initial_status()
                cursor.execute('COMMIT')


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
