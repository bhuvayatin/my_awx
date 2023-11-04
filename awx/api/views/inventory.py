# Copyright (c) 2018 Red Hat, Inc.
# All Rights Reserved.

# Python
import logging
import requests
import xml.etree.ElementTree as ET
import json
import panos
from datetime import datetime
import time
from requests.exceptions import Timeout
from pandevice import firewall, panorama
# Django
from django.conf import settings
from django.db.models import Q
from django.contrib.contenttypes.models import ContentType
from django.utils.translation import gettext_lazy as _

# Django REST Framework
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework import status
from rest_framework import serializers

# AWX
from awx.main.models import ActivityStream, Inventory, JobTemplate, Role, User, InstanceGroup, InventoryUpdateEvent, InventoryUpdate

from awx.api.generics import (
    ListCreateAPIView,
    RetrieveUpdateDestroyAPIView,
    SubListAPIView,
    SubListAttachDetachAPIView,
    ResourceAccessList,
    CopyAPIView,
    APIView
)
from awx.api.views.labels import LabelSubListCreateAttachDetachView


from awx.api.serializers import (
    InventorySerializer,
    ConstructedInventorySerializer,
    ActivityStreamSerializer,
    RoleSerializer,
    InstanceGroupSerializer,
    InventoryUpdateEventSerializer,
    JobTemplateSerializer,
    GetVersionSerializer,
    GetPanoramaSerializer,
    GetFireWallsDataSerializer,
    UpdateFireWallsVersionSerializer
)
from awx.api.views.mixin import RelatedJobsPreventDeleteMixin

from awx.api.pagination import UnifiedJobEventPagination


logger = logging.getLogger('awx.api.views.organization')


class InventoryUpdateEventsList(SubListAPIView):
    model = InventoryUpdateEvent
    serializer_class = InventoryUpdateEventSerializer
    parent_model = InventoryUpdate
    relationship = 'inventory_update_events'
    name = _('Inventory Update Events List')
    search_fields = ('stdout',)
    pagination_class = UnifiedJobEventPagination

    def get_queryset(self):
        iu = self.get_parent_object()
        self.check_parent_access(iu)
        return iu.get_event_queryset()

    def finalize_response(self, request, response, *args, **kwargs):
        response['X-UI-Max-Events'] = settings.MAX_UI_JOB_EVENTS
        return super(InventoryUpdateEventsList, self).finalize_response(request, response, *args, **kwargs)


class InventoryList(ListCreateAPIView):
    model = Inventory
    serializer_class = InventorySerializer


class InventoryDetail(RelatedJobsPreventDeleteMixin, RetrieveUpdateDestroyAPIView):
    model = Inventory
    serializer_class = InventorySerializer

    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        kind = self.request.data.get('kind') or kwargs.get('kind')

        # Do not allow changes to an Inventory kind.
        if kind is not None and obj.kind != kind:
            return Response(
                dict(error=_('You cannot turn a regular inventory into a "smart" or "constructed" inventory.')), status=status.HTTP_405_METHOD_NOT_ALLOWED
            )
        return super(InventoryDetail, self).update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        if not request.user.can_access(self.model, 'delete', obj):
            raise PermissionDenied()
        self.check_related_active_jobs(obj)  # related jobs mixin
        try:
            obj.schedule_deletion(getattr(request.user, 'id', None))
            return Response(status=status.HTTP_202_ACCEPTED)
        except RuntimeError as e:
            return Response(dict(error=_("{0}".format(e))), status=status.HTTP_400_BAD_REQUEST)


class ConstructedInventoryDetail(InventoryDetail):
    serializer_class = ConstructedInventorySerializer


class ConstructedInventoryList(InventoryList):
    serializer_class = ConstructedInventorySerializer

    def get_queryset(self):
        r = super().get_queryset()
        return r.filter(kind='constructed')


class InventoryInputInventoriesList(SubListAttachDetachAPIView):
    model = Inventory
    serializer_class = InventorySerializer
    parent_model = Inventory
    relationship = 'input_inventories'

    def is_valid_relation(self, parent, sub, created=False):
        if sub.kind == 'constructed':
            raise serializers.ValidationError({'error': 'You cannot add a constructed inventory to another constructed inventory.'})


class InventoryActivityStreamList(SubListAPIView):
    model = ActivityStream
    serializer_class = ActivityStreamSerializer
    parent_model = Inventory
    relationship = 'activitystream_set'
    search_fields = ('changes',)

    def get_queryset(self):
        parent = self.get_parent_object()
        self.check_parent_access(parent)
        qs = self.request.user.get_queryset(self.model)
        return qs.filter(Q(inventory=parent) | Q(host__in=parent.hosts.all()) | Q(group__in=parent.groups.all()))


class InventoryInstanceGroupsList(SubListAttachDetachAPIView):
    model = InstanceGroup
    serializer_class = InstanceGroupSerializer
    parent_model = Inventory
    relationship = 'instance_groups'


class InventoryAccessList(ResourceAccessList):
    model = User  # needs to be User for AccessLists's
    parent_model = Inventory


class InventoryObjectRolesList(SubListAPIView):
    model = Role
    serializer_class = RoleSerializer
    parent_model = Inventory
    search_fields = ('role_field', 'content_type__model')

    def get_queryset(self):
        po = self.get_parent_object()
        content_type = ContentType.objects.get_for_model(self.parent_model)
        return Role.objects.filter(content_type=content_type, object_id=po.pk)


class InventoryJobTemplateList(SubListAPIView):
    model = JobTemplate
    serializer_class = JobTemplateSerializer
    parent_model = Inventory
    relationship = 'jobtemplates'

    def get_queryset(self):
        parent = self.get_parent_object()
        self.check_parent_access(parent)
        qs = self.request.user.get_queryset(self.model)
        return qs.filter(inventory=parent)


class InventoryLabelList(LabelSubListCreateAttachDetachView):
    parent_model = Inventory


class InventoryCopy(CopyAPIView):
    model = Inventory
    copy_return_serializer_class = InventorySerializer

class GetVersion(APIView):
    # permission_classes = (AllowAny)
    
    def post(self, request, *args, **kwargs):
        serializer = GetVersionSerializer(data=request.data)
        if serializer.is_valid():
            host = serializer.validated_data.get('host', None)
            username = serializer.validated_data.get('username', None)
            password = serializer.validated_data.get('password', None)

        PAN_HOST = f"https://{host}"
        # Get API Key
        url = f"{PAN_HOST}/api?type=keygen&user={username}&password={password}"

        try:
            response = requests.get(url, verify=False, timeout=10)  # Add a timeout for the request
            response.raise_for_status()  # This will raise an error for HTTP errors


            root = ET.fromstring(response.content)
            api_key_element = root.find("./result/key")

            # Check if there's an error message in the XML response
            error_message = root.find(".//line")
            if error_message is not None and "Invalid credentials" in error_message.text:
                return Response({"message":"Invalid credentials. Please check your username and password."})

            api_key = api_key_element.text

            # Get software version using the API key
            url = f"{PAN_HOST}/api?type=op&cmd=<show><system><info></info></system></show>&key={api_key}"
            response = requests.get(url, verify=False, timeout=10)

            root = ET.fromstring(response.content)
            sw_version = root.find("./result/system/sw-version").text

            return Response({"message":f"Palo Alto Software Version: {sw_version}"})

        except requests.HTTPError as e:
            if e.response.status_code == 403:
                return Response({"Error": "Invalid credentials. Please check your username and password."})
            else:
                return Response({"Error":f"HTTP Error {e}"})
        except requests.ConnectionError:
            return Response({"Error: Cannot connect to the server. Please check the IP address."})
        except requests.Timeout:
            return Response({"Error: Connection timed out."})
        except ET.ParseError:
            return Response({"Error parsing the response. Invalid XML received."})
        except Exception as e:
            return Response({"Error":f"An unexpected error occurred {e}"})

class GetPanorama(APIView):
    # permission_classes = (AllowAny)
    
    def post(self, request, *args, **kwargs):
        serializer = GetPanoramaSerializer(data=request.data)
        if serializer.is_valid():
            host = serializer.validated_data.get('host', None)
            access_token = serializer.validated_data.get('access_token', None)

            url = f'{host}/restapi/v10.1/Panorama/DeviceGroups'

            # Headers
            headers = {
                'X-PAN-KEY': access_token,
            }
            try:
                response = requests.get(url, headers=headers, verify=False)
                data = response.json()
                # Check if the request was successful
                return Response({"data": data})
            except Exception as e:
                return Response({"Error":"Invalid credentials. Please check your username and password."}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"Error":"Please check your host and access_token."}, status=status.HTTP_400_BAD_REQUEST)
            


class GetFireWallsData(APIView):
    # permission_classes = (AllowAny)
    
    def post(self, request, *args, **kwargs):
        serializer = GetFireWallsDataSerializer(data=request.data)
        if serializer.is_valid():
            host = serializer.validated_data.get('host', None)
            access_token = serializer.validated_data.get('access_token', None)
            try:
                timeout_seconds = 10
                p = panorama.Panorama(hostname=host, api_key=access_token, timeout=timeout_seconds)                
                device_groups = p.refresh_devices()
                all_device_groups = []
                
                for device_group in device_groups:
                    device_group_info = {}
                    device_group_info['name'] = str(device_group)
                    firewalls = []
                    for device in device_group.children:
                        if isinstance(device, firewall.Firewall):
                            firewall_info = {}
                            firewall_info['Firewall_Serial'] = device.serial
                            firewall_info['Firewall_State'] = device.state.connected
                            
                            system_info = device.op("show system info")
                            
                            firewall_info['Device_Name'] = system_info.find('.//devicename').text
                            firewall_info['IP_Address'] = system_info.find('.//ip-address').text
                            firewall_info['Software_Version'] = system_info.find('.//sw-version').text
                            firewall_info['Certificate Expiry'] = system_info.find('.//device-certificate-status').text
                            
                            # Get HA information
                            ha_info = device.op("show high-availability state")
                            if ha_info.find('.//enabled').text == 'yes':
                                firewall_info['HA_Group_ID'] = ha_info.find('.//group').text 
                                peer_info_serial = ha_info.find('.//peer-info/serial')
                                peer_info_ip = ha_info.find('.//peer-info/mgmt-ip')
                                if peer_info_serial is not None and peer_info_ip is not None:
                                    firewall_info['Peer_Firewall_Serial'] = peer_info_serial.text
                                    firewall_info['Peer_Firewall_IP'] = peer_info_ip.text
                                else:
                                    firewall_info['Peer_Information'] = "Could not find peer information."
                            else:
                                firewall_info['HA_Information'] = "HA is not enabled on this firewall."
                            
                            firewalls.append(firewall_info)
                    
                    device_group_info['Firewalls'] = firewalls
                    all_device_groups.append(device_group_info)
                
                return Response({"data":all_device_groups})
            
            # except TimeoutError:
            #     return Response({"Error": "API request timed out. The API is taking too long to respond."}, status=status.HTTP_408_REQUEST_TIMEOUT)
            except Exception as e:
                return Response({"Error": "API request timed out. The API is taking too long to respond."}, status=status.HTTP_408_REQUEST_TIMEOUT)
        else:
            return Response({"Error":"Please enter a host and access token"}, status=status.HTTP_400_BAD_REQUEST)

import asyncio
from rest_framework.decorators import api_view

class UpdateFireWallsVersion(APIView):
    # permission_classes = (AllowAny)

    async def processing_firewalls(self, ip):
        await asyncio.sleep(10)
        # You can add success checks here, for example:
        success = True  # Replace this with your actual success check logic
        return success

    async def installing_firewalls(self, ip):
        await asyncio.sleep(20)
        # You can add success checks here, for example:
        success = True  # Replace this with your actual success check logic
        return success

    async def update_version(self, ip):
        is_process_success = await self.processing_firewalls(ip)
        is_install_success = await self.installing_firewalls(ip)
        return is_process_success, is_install_success

    @api_view(['POST'])
    async def post(self, request, *args, **kwargs):
        serializer = UpdateFireWallsVersionSerializer(data=request.data)
        if serializer.is_valid():
            ip_addresses = serializer.validated_data.get('ip_addresses', [])
            data = {}

            async def process_ip(ip):
                is_process_success, is_install_success = await self.update_version(ip)
                if is_process_success:
                    status = "processing"
                elif is_install_success:
                    status = "installing"
                else:
                    status = "updated"
                data[ip] = status

            tasks = [process_ip(ip) for ip in ip_addresses]
            await asyncio.gather(*tasks)

            return Response({"data": data}, status=status.HTTP_200_OK)
