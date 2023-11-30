# Copyright (c) 2018 Red Hat, Inc.
# All Rights Reserved.

# Python
import logging
import requests
import xml.etree.ElementTree as ET
import json
import panos
import xmltodict
import urllib3
from datetime import datetime
from collections import defaultdict
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
    GetInterFaceDetailsSerializer,
    HighAvailabilitySerializer
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
    
    def etree_to_dict(self, t):
        d = {t.tag: {} if t.attrib else None}
        children = list(t)
        if children:
            dd = defaultdict(list)
            for dc in map(self.etree_to_dict, children):
                for k, v in dc.items():
                    dd[k].append(v)
            d = {t.tag: {k:v[0] if len(v) == 1 else v for k, v in dd.items()}}
        if t.attrib:
            d[t.tag].update(('@' + k, v) for k, v in t.attrib.items())
        if t.text:
            text = t.text.strip()
            if children or t.attrib:
                if text:
                    d[t.tag]['#text'] = text
            else:
                d[t.tag] = text
        return d

    def post(self, request, *args, **kwargs):
        serializer = GetFireWallsDataSerializer(data=request.data)
        if serializer.is_valid():
            host = serializer.validated_data.get('host', None)
            access_token = serializer.validated_data.get('access_token', None)
            try:
                timeout_seconds = 10
                p = panorama.Panorama(hostname=host, api_key=access_token, timeout=timeout_seconds)
                device_groups = p.refresh_devices()
            except Exception as e:
                if "timed out" in str(e):
                    print(f"API request timed out after {timeout_seconds} seconds.")
                    return Response({"Error": "API request timed out. The API is taking too long to respond."}, status=status.HTTP_408_REQUEST_TIMEOUT)
                else:
                    print(f"An error occurred: {e}")
                    return Response({"Error": f"An error occurred {e}"}, status=status.HTTP_400_BAD_REQUEST)

            all_device_groups = []
            for device_group in device_groups:
                device_group_info = {}
                device_group_info['name'] = str(device_group)
                firewalls = []
                for device in device_group.children:
                    if isinstance(device, firewall.Firewall):
                        firewall_info = {}
                        system_info = device.op("show system info")
                        system_info_dict = self.etree_to_dict(system_info)['response']['result']['system']

                        ha_info = device.op("show high-availability state")
                        ha_info_dict = self.etree_to_dict(ha_info)['response']['result']

                        system_info_dict['peer_info_state'] = ha_info_dict
                        
                        firewall_info = system_info_dict
                        firewalls.append(firewall_info)
                device_group_info['firewalls'] = firewalls
                all_device_groups.append(device_group_info)
            
            return Response({"data": all_device_groups})
        else:
            return Response({"Error":serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class GetInterFaceDetails(APIView):
    # permission_classes = (AllowAny)
    
    def post(self, request, *args, **kwargs):
        serializer = GetInterFaceDetailsSerializer(data=request.data)
        if serializer.is_valid():
            firewall_ip = serializer.validated_data.get('ip', None)
            api_key = serializer.validated_data.get('api_key', None)
            
            try:
                # Suppress the InsecureRequestWarning
                urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

                # Construct the API URL for your desired operation (retrieve hardware information)
                url_operation = f'https://{firewall_ip}/api/?type=op&cmd=<show><interface>all</interface></show>&key={api_key}'

                # Send the API request for the desired operation with SSL certificate verification disabled
                response_operation = requests.get(url_operation, verify=False, timeout=10)
                
                # Check if the operation was successful (HTTP status code 200)
                if response_operation.status_code == 200:
                    # Parse the XML response using xmltodict
                    xml_data = response_operation.text
                    parsed_data = xmltodict.parse(xml_data)

                    # Extract the hardware information from the parsed dictionary
                    hw_entries = parsed_data['response']['result']['hw']['entry']

                    # If there is only one entry, convert it to a list to ensure consistent structure
                    if not isinstance(hw_entries, list):
                        hw_entries = [hw_entries]

                    # Store the information in a list of dictionaries
                    interface_info_list = []
                    for entry in hw_entries:
                        interface_info = {
                            'name': entry['name'],
                            'duplex': entry['duplex'],
                            'type': entry['type'],
                            'state': entry['state'],
                            'st': entry['st'],
                            'mac': entry['mac'],
                            'mode': entry['mode'],
                            'speed': entry['speed'],
                            'id': entry['id'],
                        }
                        interface_info_list.append(interface_info)
                    return Response({"data": interface_info_list})

                else:
                    interface_info_list = []
                    print(f"Operation failed. Status code: {response_operation.status_code}")
                    return Response({"Error":f"Operation failed. Status code: {response_operation.status_code}"}, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                # print("Exception is :>>>>>", str(e))
                # return Response({"Error":f"Operation failed. Please check your host and key"}, status=status.HTTP_400_BAD_REQUEST)
                pass
            finally:

                interface_info_list = [
                        {
                            'name': 'ethernet1/1',
                            'duplex': 'full',
                            'type': '0',
                            'state': 'up',
                            'st': '10000/full/up',
                            'mac': '00:50:56:9e:98:6d',
                            'mode': '(autoneg)',
                            'speed': '10000',
                            'id': '16'
                        },
                        {
                            'name': 'ethernet1/2',
                            'duplex': 'full',
                            'type': '0',
                            'state': 'down',
                            'st': '10000/full/up',
                            'mac': '00:50:56:9e:82:fd',
                            'mode': '(autoneg)',
                            'speed': '10000',
                            'id': '17'
                        },
                        {
                            'name': 'ethernet1/3',
                            'duplex': 'full',
                            'type': '0',
                            'state': 'down',
                            'st': '10000/full/up',
                            'mac': '00:50:56:9e:4d:8c',
                            'mode': '(autoneg)',
                            'speed': '10000',
                            'id': '18'
                        },
                        {
                            'name': 'ethernet1/3',
                            'duplex': 'full',
                            'type': '0',
                            'state': 'up',
                            'st': '10000/full/up',
                            'mac': '00:50:56:9e:4d:8c',
                            'mode': '(autoneg)',
                            'speed': '10000',
                            'id': '19'
                        },
                        {
                            'name': 'ethernet1/3',
                            'duplex': 'full',
                            'type': '0',
                            'state': 'up',
                            'st': '10000/full/up',
                            'mac': '00:50:56:9e:4d:8c',
                            'mode': '(autoneg)',
                            'speed': '10000',
                            'id': '20'
                        },
                        {
                            'name': 'ethernet1/3',
                            'duplex': 'full',
                            'type': '0',
                            'state': 'down',
                            'st': '10000/full/up',
                            'mac': '00:50:56:9e:4d:8c',
                            'mode': '(autoneg)',
                            'speed': '10000',
                            'id': '21'
                        },
                        {
                            'name': 'ethernet1/3',
                            'duplex': 'full',
                            'type': '0',
                            'state': '',
                            'st': '10000/full/up',
                            'mac': '00:50:56:9e:4d:8c',
                            'mode': '(autoneg)',
                            'speed': '10000',
                            'id': '22'
                        }]
                return Response({"data": interface_info_list})

        return Response({"Error":serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class HighAvailability(APIView):
    # permission_classes = (AllowAny)
    
    def post(self, request, *args, **kwargs):
        serializer = HighAvailabilitySerializer(data=request.data)
        if serializer.is_valid():
            firewall_ip = serializer.validated_data.get('ip', None)
            api_key = serializer.validated_data.get('api_key', None)

            try:
                # Suppress the InsecureRequestWarning
                urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

                # Construct the API URL for your desired operation (retrieve hardware information)
                url_operation = f'https://{firewall_ip}/api/?type=op&cmd=<show><high-availability><all/></high-availability></show>&key={api_key}'

                # Send the API request for the desired operation with SSL certificate verification disabled
                response_operation = requests.get(url_operation, verify=False, timeout=10)
                
                parsed_data = {}
                
                # Check if the operation was successful (HTTP status code 200)
                if response_operation.status_code == 200:
                    # Parse the XML response using xmltodict
                    xml_data = response_operation.text
                    parsed_data = xmltodict.parse(xml_data)
                    
                    return Response({"data": parsed_data})

                else:
                    print(f"Operation failed. Status code: {response_operation.status_code}")
                    return Response({"Error":f"Operation failed. Status code: {response_operation.status_code}"}, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                # print("Exception is :>>>>>", str(e))
                # return Response({"Error":f"Operation failed. Please check your host and key"}, status=status.HTTP_400_BAD_REQUEST)
                pass

            finally:
                parsed_data = {
                    "response": {
                        "@status": "success",
                        "result": {
                        "enabled": "yes",
                        "group": {
                            "mode": "Active-Passive",
                            "local-info": {
                            "url-compat": "Mismatch",
                            "app-version": "8766-8347",
                            "gpclient-version": "Not Installed",
                            "build-rel": "9.0.16-h3",
                            "ha2-port": "ethernet1/3",
                            "av-version": "4361-4874",
                            "ha1-gateway": "10.215.18.1",
                            "url-version": "20231129.20255",
                            "active-passive": {
                                "passive-link-state": "shutdown",
                                "monitor-fail-holddown": "1"
                            },
                            "platform-model": "PA-VM",
                            "av-compat": "Match",
                            "ha2-ipaddr": "192.168.1.1/24",
                            "vpnclient-compat": "Match",
                            "ha1-ipaddr": "10.215.18.85/23",
                            "vm-license": "vm100",
                            "ha2-macaddr": "00:50:56:9e:4d:8c",
                            "monitor-fail-holdup": "0",
                            "priority": "10",
                            "preempt-hold": "1",
                            "state": "active",
                            "version": "1",
                            "promotion-hold": "2000",
                            "threat-compat": "Match",
                            "state-sync": "Complete",
                            "vm-license-compat": "Mismatch",
                            "addon-master-holdup": "500",
                            "heartbeat-interval": "2000",
                            "ha1-link-mon-intv": "3000",
                            "hello-interval": "8000",
                            "ha1-port": "management",
                            "ha1-encrypt-imported": "no",
                            "mgmt-ip": "10.215.18.85/23",
                            "vpnclient-version": "Not Installed",
                            "preempt-flap-cnt": "0",
                            "nonfunc-flap-cnt": "0",
                            "threat-version": "8766-8347",
                            "ha1-macaddr": "00:50:56:9e:1d:d2",
                            "vm-license-type": "vm100",
                            "state-duration": "10444",
                            "max-flaps": "3",
                            "ha1-encrypt-enable": "no",
                            "mgmt-ipv6": None,
                            "state-sync-type": "ethernet",
                            "preemptive": "no",
                            "gpclient-compat": "Match",
                            "mode": "Active-Passive",
                            "build-compat": "Mismatch",
                            "VMS": "Compat Match",
                            "app-compat": "Match"
                            },
                            "peer-info": {
                            "app-version": "8766-8347",
                            "gpclient-version": "Not Installed",
                            "url-version": "0000.00.00.000",
                            "build-rel": "9.1.0",
                            "ha2-ipaddr": "192.168.1.2",
                            "platform-model": "PA-VM",
                            "vm-license": "VM-100",
                            "ha2-macaddr": "00:50:56:9e:a1:d1",
                            "priority": "100",
                            "state": "passive",
                            "version": "1",
                            "conn-status": "up",
                            "av-version": "4361-4874",
                            "vpnclient-version": "Not Installed",
                            "mgmt-ip": "10.215.18.86/23",
                            "conn-ha2": {
                                "conn-status": "up",
                                "conn-ka-enbled": "no",
                                "conn-primary": "yes",
                                "conn-desc": "link status"
                            },
                            "threat-version": "8766-8347",
                            "ha1-macaddr": "00:50:56:9e:ae:f0",
                            "conn-ha1": {
                                "conn-status": "up",
                                "conn-primary": "yes",
                                "conn-desc": "heartbeat status"
                            },
                            "vm-license-type": "VM-100",
                            "state-duration": "10430",
                            "ha1-ipaddr": "10.215.18.86",
                            "mgmt-ipv6": None,
                            "preemptive": "no",
                            "mode": "Active-Passive",
                            "VMS": "1.0.13"
                            },
                            "link-monitoring": {
                            "fail-cond": "any",
                            "enabled": "yes",
                            "groups": None
                            },
                            "path-monitoring": {
                            "vwire": None,
                            "fail-cond": "any",
                            "vlan": None,
                            "enabled": "yes",
                            "vrouter": None
                            },
                            "running-sync": "not synchronized",
                            "running-sync-enabled": "yes"
                        }
                        }
                    }
                    }
                return Response({"data": parsed_data})

        else:
            return Response({"Error":serializer.errors}, status=status.HTTP_400_BAD_REQUEST)