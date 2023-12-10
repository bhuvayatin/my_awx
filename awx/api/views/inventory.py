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
from awx.main.models import UpdateFirewallStatusLogs, UpdateFirewallBackupFile, UpdateFirewallStatus

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
    HighAvailabilitySerializer,
    GeneralInformationSerializer,
    SessionInformationSerializer,
    FirewallStatusInputSerializer,
    FirewallStatusLogsSerializer,
    FirewallBackupFileSerializer,
    FirewallProcessStopSerializer,
    GenerateAPIKeySerializer
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
            # try:
            #     timeout_seconds = 10
            #     p = panorama.Panorama(hostname=host, api_key=access_token, timeout=timeout_seconds)
            #     device_groups = p.refresh_devices()
            # except Exception as e:
            #     if "timed out" in str(e):
            #         print(f"API request timed out after {timeout_seconds} seconds.")
            #         return Response({"Error": "API request timed out. The API is taking too long to respond."}, status=status.HTTP_408_REQUEST_TIMEOUT)
            #     else:
            #         print(f"An error occurred: {e}")
            #         return Response({"Error": f"An error occurred {e}"}, status=status.HTTP_400_BAD_REQUEST)

            # all_device_groups = []
            # for device_group in device_groups:
            #     device_group_info = {}
            #     device_group_info['name'] = str(device_group)
            #     firewalls = []
            #     for device in device_group.children:
            #         if isinstance(device, firewall.Firewall):
            #             firewall_info = {}
            #             system_info = device.op("show system info")
            #             system_info_dict = self.etree_to_dict(system_info)['response']['result']['system']

            #             ha_info = device.op("show high-availability state")
            #             ha_info_dict = self.etree_to_dict(ha_info)['response']['result']

            #             system_info_dict['peer_info_state'] = ha_info_dict
                        
            #             firewall_info = system_info_dict
            #             firewalls.append(firewall_info)
            #     device_group_info['firewalls'] = firewalls
            #     all_device_groups.append(device_group_info)
            
            all_device_groups = {
                "name": "XSOAR_Upgrade_testing4",
                "firewalls": [
                    {
                    "hostname": "PA-VM_85",
                    "ip-address": "10.215.18.85",
                    "public-ip-address": "unknown",
                    "ha-pair": "111",
                    "netmask": "255.255.254.0",
                    "default-gateway": "10.215.18.1",
                    "is-dhcp": "no",
                    "ipv6-address": "unknown",
                    "ipv6-link-local-address": "fe80::250:56ff:fe9e:1dd2/64",
                    "ipv6-default-gateway": None,
                    "mac-address": "00:50:56:9e:1d:d2",
                    "time": "Wed Nov  1 09:07:34 2023",
                    "uptime": "41 days, 21:15:49",
                    "devicename": "PA-VM_85",
                    "family": "vm",
                    "model": "PA-VM",
                    "serial": "007951000342260",
                    "vm-mac-base": "7C:89:C3:0A:8C:00",
                    "vm-mac-count": "256",
                    "vm-uuid": "421EA98F-619A-47C1-3100-86238DEB645B",
                    "vm-cpuid": "ESX:57060500FFFB8B1F",
                    "vm-license": "VM-100",
                    "vm-mode": "VMware ESXi",
                    "cloud-mode": "non-cloud",
                    "sw-version": "9.0.16-h3",
                    "global-protect-client-package-version": "0.0.0",
                    "app-version": "8766-8347",
                    "app-release-date": "2023/10/17 19:43:26 PDT",
                    "av-version": "4361-4874",
                    "av-release-date": "2023/02/13 14:15:56 PST",
                    "threat-version": "8766-8347",
                    "threat-release-date": "2023/10/17 19:43:26 PDT",
                    "wf-private-version": "0",
                    "wf-private-release-date": "unknown",
                    "url-db": "paloaltonetworks",
                    "wildfire-version": "0",
                    "wildfire-release-date": None,
                    "url-filtering-version": "20231101.20252",
                    "global-protect-datafile-version": "unknown",
                    "global-protect-datafile-release-date": "unknown",
                    "global-protect-clientless-vpn-version": "0",
                    "global-protect-clientless-vpn-release-date": None,
                    "logdb-version": "9.0.10",
                    "plugin_versions": {
                        "entry": {
                        "pkginfo": "vm_series-1.0.5",
                        "@name": "vm_series",
                        "@version": "1.0.5"
                        }
                    },
                    "platform-family": "vm",
                    "vpn-disable-mode": "off",
                    "multi-vsys": "off",
                    "operational-mode": "normal",
                    "device-certificate-status": None,
                    "peer_info_state": {
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
                            "url-version": "20231101.20252",
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
                            "state-duration": "3618766",
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
                            "last-error-reason": "User requested",
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
                            "state-duration": "1213383",
                            "ha1-ipaddr": "10.215.18.86",
                            "mgmt-ipv6": None,
                            "last-error-state": "suspended",
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
                    },
                    {
                    "hostname": "PA-VM_86",
                    "ip-address": "10.215.18.86",
                    "public-ip-address": "unknown",
                    "ha-pair": "111",
                    "netmask": "255.255.254.0",
                    "default-gateway": "10.215.18.1",
                    "is-dhcp": "no",
                    "ipv6-address": "unknown",
                    "ipv6-link-local-address": "fe80::250:56ff:fe9e:aef0/64",
                    "ipv6-default-gateway": None,
                    "mac-address": "00:50:56:9e:ae:f0",
                    "time": "Wed Nov  1 09:07:35 2023",
                    "uptime": "14 days, 1:07:19",
                    "devicename": "PA-VM_86",
                    "family": "vm",
                    "model": "PA-VM",
                    "serial": "007951000342259",
                    "vm-mac-base": "7C:89:C1:89:7A:00",
                    "vm-mac-count": "256",
                    "vm-uuid": "421E1A8C-FEF5-7BDF-90D3-CD096E92F569",
                    "vm-cpuid": "ESX:57060500FFFB8B1F",
                    "vm-license": "VM-100",
                    "vm-mode": "VMware ESXi",
                    "cloud-mode": "non-cloud",
                    "sw-version": "9.1.0",
                    "global-protect-client-package-version": "0.0.0",
                    "app-version": "8766-8347",
                    "app-release-date": "2023/10/17 19:43:26 PDT",
                    "av-version": "4361-4874",
                    "av-release-date": None,
                    "threat-version": "8766-8347",
                    "threat-release-date": "2023/10/17 19:43:26 PDT",
                    "wf-private-version": "0",
                    "wf-private-release-date": "unknown",
                    "url-db": "paloaltonetworks",
                    "wildfire-version": "0",
                    "wildfire-release-date": None,
                    "url-filtering-version": "0000.00.00.000",
                    "global-protect-datafile-version": "unknown",
                    "global-protect-datafile-release-date": "unknown",
                    "global-protect-clientless-vpn-version": "0",
                    "global-protect-clientless-vpn-release-date": None,
                    "logdb-version": "9.1.21",
                    "plugin_versions": {
                        "entry": {
                        "pkginfo": "vm_series-1.0.13",
                        "@name": "vm_series",
                        "@version": "1.0.13"
                        }
                    },
                    "platform-family": "vm",
                    "vpn-disable-mode": "off",
                    "multi-vsys": "off",
                    "operational-mode": "normal",
                    "peer_info_state": {
                        "enabled": "yes",
                        "group": {
                        "mode": "Active-Passive",
                        "local-info": {
                            "url-compat": "Mismatch",
                            "app-version": "8766-8347",
                            "gpclient-version": "Not Installed",
                            "build-rel": "9.1.0",
                            "ha2-port": "ethernet1/3",
                            "av-version": "4361-4874",
                            "ha1-gateway": "10.215.18.1",
                            "url-version": "0000.00.00.000",
                            "active-passive": {
                            "passive-link-state": "shutdown",
                            "monitor-fail-holddown": "1"
                            },
                            "platform-model": "PA-VM",
                            "av-compat": "Match",
                            "ha2-ipaddr": "192.168.1.2/24",
                            "vpnclient-compat": "Match",
                            "ha1-ipaddr": "10.215.18.86/23",
                            "vm-license": "VM-100",
                            "ha2-macaddr": "00:50:56:9e:a1:d1",
                            "monitor-fail-holdup": "0",
                            "priority": "100",
                            "preempt-hold": "1",
                            "state": "passive",
                            "version": "1",
                            "promotion-hold": "2000",
                            "threat-compat": "Match",
                            "state-sync": "Complete",
                            "addon-master-holdup": "500",
                            "heartbeat-interval": "2000",
                            "ha1-link-mon-intv": "3000",
                            "hello-interval": "8000",
                            "ha1-port": "management",
                            "ha1-encrypt-imported": "no",
                            "mgmt-ip": "10.215.18.86/23",
                            "vpnclient-version": "Not Installed",
                            "preempt-flap-cnt": "0",
                            "nonfunc-flap-cnt": "0",
                            "threat-version": "8766-8347",
                            "ha1-macaddr": "00:50:56:9e:ae:f0",
                            "state-duration": "1213383",
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
                            "url-version": "20231101.20252",
                            "build-rel": "9.0.16-h3",
                            "ha2-ipaddr": "192.168.1.1",
                            "platform-model": "PA-VM",
                            "vm-license": "vm100",
                            "ha2-macaddr": "00:50:56:9e:4d:8c",
                            "priority": "10",
                            "state": "active",
                            "version": "1",
                            "conn-status": "up",
                            "av-version": "4361-4874",
                            "vpnclient-version": "Not Installed",
                            "mgmt-ip": "10.215.18.85/23",
                            "conn-ha2": {
                            "conn-status": "up",
                            "conn-ka-enbled": "no",
                            "conn-primary": "yes",
                            "conn-desc": "link status"
                            },
                            "threat-version": "8766-8347",
                            "ha1-macaddr": "00:50:56:9e:1d:d2",
                            "conn-ha1": {
                            "conn-status": "up",
                            "conn-primary": "yes",
                            "conn-desc": "heartbeat status"
                            },
                            "state-duration": "1213389",
                            "ha1-ipaddr": "10.215.18.85",
                            "mgmt-ipv6": None,
                            "preemptive": "no",
                            "mode": "Active-Passive",
                            "VMS": "1.0.5"
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
                ]
            }

            return Response({"data": all_device_groups})
        else:
            return Response({"Error":serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class GetFireWallsDetails(APIView):
    def post(self, request, *args, **kwargs):
        serializer = GetFireWallsDataSerializer(data=request.data)
        if serializer.is_valid():
            host = serializer.validated_data.get('host', None)
            access_token = serializer.validated_data.get('access_token', None)
            # TODO

            all_device_groups = [
                {
                    "name": "Service_Conn_Device_Group"
                },
                {
                    "name": "Remote_Network_Device_Group"
                },
                {
                    "name": "FW-Japan_Corp",
                    "firewalls": [
                    {
                        "serial": "013201024827",
                        "ip-address": "10.109.105.131",
                        "status": "connected"
                    },
                    {
                        "serial": "013201024339",
                        "ip-address": "10.109.105.132",
                        "status": "connected"
                    }
                    ]
                },
                {
                    "name": "FW-Bangalore_Dell4_Corp",
                    "firewalls": [
                    {
                        "serial": "013101009290",
                        "ip-address": "10.80.96.104",
                        "status": "connected"
                    },
                    {
                        "serial": "013101009288",
                        "ip-address": "10.80.96.105",
                        "status": "connected"
                    }
                    ]
                },
                {
                    "name": "UID-Distributor",
                    "firewalls": [
                    {
                        "serial": "007951000335528",
                        "ip-address": "10.93.80.243",
                        "status": "connected"
                    },
                    {
                        "serial": "007951000335529",
                        "ip-address": "10.93.80.244",
                        "status": "connected"
                    },
                    {
                        "serial": "007951000335526",
                        "ip-address": "10.93.80.242",
                        "status": "connected"
                    },
                    {
                        "serial": "007951000335525",
                        "ip-address": "10.93.80.241",
                        "status": "connected"
                    },
                    {
                        "serial": "007951000347713",
                        "ip-address": "10.34.179.222",
                        "status": "connected"
                    },
                    {
                        "serial": "007951000347716",
                        "ip-address": "10.34.179.224",
                        "status": "connected"
                    },
                    {
                        "serial": "007951000347714",
                        "ip-address": "10.34.179.223",
                        "status": "connected"
                    },
                    {
                        "serial": "007951000347712",
                        "ip-address": "10.34.179.221",
                        "status": "connected"
                    },
                    {
                        "serial": "007951000331661",
                        "ip-address": "10.174.43.252",
                        "status": "connected"
                    },
                    {
                        "serial": "007951000331660",
                        "ip-address": "10.174.43.253",
                        "status": "connected"
                    },
                    {
                        "serial": "007951000331655",
                        "ip-address": "10.174.43.254",
                        "status": "connected"
                    },
                    {
                        "serial": "007951000331678",
                        "ip-address": "10.174.43.251",
                        "status": "connected"
                    }
                    ]
                }
                ]
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


class GeneralInformation(APIView):
    # permission_classes = (AllowAny)
    
    def post(self, request, *args, **kwargs):
        serializer = GeneralInformationSerializer(data=request.data)
        if serializer.is_valid():
            ip = serializer.validated_data.get('ip', None)
            api_key = serializer.validated_data.get('api_key', None)

            try:
                # Define the API endpoint
                url = f'https://{ip}/api/'

                # Define the parameters for the get request
                params = {
                    'type': 'op',
                    'cmd': '<show><system><info></info></system></show>',
                    'key': api_key
                }

                # Send the get request
                response = requests.get(url, params=params, verify=False, timeout=10)

                # Check the response
                if response.status_code == 200:
                    print('Successfully retrieved configuration')
                    return Response({"data": xmltodict.parse(response.text)})
                else:
                    return Response({"Error":"Failed to retrieve configuration"}, status=status.HTTP_400_BAD_REQUEST)

            except Exception as e:
                # print('Exception is : >>>>>>>>>>>>>',str(e))
                # return Response({"Error":f"Operation failed. Please check your host and key"}, status=status.HTTP_400_BAD_REQUEST)
                pass

            finally:
                general_information = {
                    "response": {
                        "@status": "success",
                        "result": {
                        "system": {
                            "hostname": "PA-VM_85",
                            "ip-address": "10.215.18.85",
                            "public-ip-address": "unknown",
                            "netmask": "255.255.254.0",
                            "default-gateway": "10.215.18.1",
                            "is-dhcp": "no",
                            "ipv6-address": "unknown",
                            "ipv6-link-local-address": "fe80::250:56ff:fe9e:1dd2/64",
                            "ipv6-default-gateway": None,
                            "mac-address": "00:50:56:9e:1d:d2",
                            "time": "Thu Nov 30 18:41:49 2023",
                            "uptime": "0 days, 9:31:22",
                            "devicename": "PA-VM_85",
                            "family": "vm",
                            "model": "PA-VM",
                            "serial": "007951000342260",
                            "vm-mac-base": "7C:89:C3:0A:8C:00",
                            "vm-mac-count": "256",
                            "vm-uuid": "421EA98F-619A-47C1-3100-86238DEB645B",
                            "vm-cpuid": "ESX:57060500FFFB8B1F",
                            "vm-license": "VM-100",
                            "vm-mode": "VMware ESXi",
                            "cloud-mode": "non-cloud",
                            "sw-version": "9.1.0",
                            "global-protect-client-package-version": "0.0.0",
                            "app-version": "8766-8347",
                            "app-release-date": "2023/10/17 19:43:26 PDT",
                            "av-version": "4361-4874",
                            "av-release-date": "2023/02/13 14:15:56 PST",
                            "threat-version": "8766-8347",
                            "threat-release-date": "2023/10/17 19:43:26 PDT",
                            "wf-private-version": "0",
                            "wf-private-release-date": "unknown",
                            "url-db": "paloaltonetworks",
                            "wildfire-version": "0",
                            "wildfire-release-date": None,
                            "url-filtering-version": "0000.00.00.000",
                            "global-protect-datafile-version": "unknown",
                            "global-protect-datafile-release-date": "unknown",
                            "global-protect-clientless-vpn-version": "0",
                            "global-protect-clientless-vpn-release-date": None,
                            "logdb-version": "9.1.21",
                            "plugin_versions": {
                            "entry": {
                                "@name": "vm_series",
                                "@version": "1.0.13",
                                "pkginfo": "vm_series-1.0.13"
                            }
                            },
                            "platform-family": "vm",
                            "vpn-disable-mode": "off",
                            "multi-vsys": "off",
                            "operational-mode": "normal"
                        }
                        }
                    }
                    }
                return Response({"data": general_information})

        else:
            return Response({"Error":serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class SessionInformation(APIView):
    # permission_classes = (AllowAny)
    
    def post(self, request, *args, **kwargs):
        serializer = SessionInformationSerializer(data=request.data)
        if serializer.is_valid():
            ip = serializer.validated_data.get('ip', None)
            api_key = serializer.validated_data.get('api_key', None)

            try:
                # Define the API endpoint
                url = f'https://{ip}/api/'

                # Define the parameters for the get request
                params_session = {
                    'type': 'op',
                    'cmd': '<show><session><info></info></session></show>',
                    'key': api_key
                }

                # Get the session info
                response = requests.get(url, params=params_session, verify=False, timeout=10)
                if response.status_code == 200:
                    print('Successfully retrieved session information')
                    return Response({"data": xmltodict.parse(response.text)})
                else:
                    return Response({"Error":"Failed to retrieve session information"}, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                # print('Exception is : >>>>>>>>>>>>>',str(e))
                # return Response({"Error":f"Operation failed. Please check your host and key"}, status=status.HTTP_400_BAD_REQUEST)
                pass
            
            finally:
                session_information = {
                    "response": {
                        "@status": "success",
                        "result": {
                        "tmo-sctpshutdown": "60",
                        "tcp-nonsyn-rej": "True",
                        "tmo-tcpinit": "5",
                        "tmo-tcp": "3600",
                        "pps": "0",
                        "tmo-tcp-delayed-ack": "250",
                        "num-max": "256000",
                        "age-scan-thresh": "80",
                        "tmo-tcphalfclosed": "120",
                        "num-active": "0",
                        "tmo-sctp": "3600",
                        "dis-def": "60",
                        "num-mcast": "0",
                        "icmp-unreachable-rate": "200",
                        "tmo-tcptimewait": "15",
                        "age-scan-ssf": "8",
                        "tmo-udp": "30",
                        "vardata-rate": "10485760",
                        "age-scan-tmo": "10",
                        "dis-sctp": "30",
                        "dp": "*.dp0",
                        "dis-tcp": "90",
                        "tcp-reject-siw-thresh": "4",
                        "num-udp": "0",
                        "tmo-sctpcookie": "60",
                        "tmo-icmp": "6",
                        "max-pending-mcast": "0",
                        "age-accel-thresh": "80",
                        "tcp-diff-syn-rej": "True",
                        "num-gtpc": "0",
                        "oor-action": "drop",
                        "tmo-def": "30",
                        "num-predict": "0",
                        "age-accel-en": "True",
                        "age-accel-tsf": "2",
                        "hw-offload": "True",
                        "num-icmp": "0",
                        "num-gtpu-active": "0",
                        "tmo-cp": "30",
                        "tcp-strict-rst": "True",
                        "tmo-sctpinit": "5",
                        "strict-checksum": "True",
                        "tmo-tcp-unverif-rst": "30",
                        "num-bcast": "0",
                        "ipv6-fw": "True",
                        "cps": "0",
                        "num-installed": "0",
                        "num-tcp": "0",
                        "dis-udp": "60",
                        "num-sctp-assoc": "0",
                        "num-sctp-sess": "0",
                        "tcp-reject-siw-enable": "False",
                        "tmo-tcphandshake": "10",
                        "hw-udp-offload": "True",
                        "kbps": "0",
                        "num-gtpu-pending": "0"
                        }
                    }
                }
                return Response({"data": session_information})
        else:
            return Response({"Error":serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class FirewallStatusLogs(APIView):
    # permission_classes = (AllowAny)
    
    def post(self, request, *args, **kwargs):
        serializer = FirewallStatusInputSerializer(data=request.data)
        if serializer.is_valid():
            ip_address = serializer.validated_data.get('ip_address', None)
            job_id = serializer.validated_data.get('job_id', None)

            firewall_logs = UpdateFirewallStatusLogs.objects.filter(job_id=job_id, ip_address=ip_address)
            response_serializer = FirewallStatusLogsSerializer(firewall_logs, many=True)
            return Response({"data": response_serializer.data})
        else:
            return Response({"Error":serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class FirewallBackupFile(APIView):
    # permission_classes = (AllowAny)
    
    def post(self, request, *args, **kwargs):
        serializer = FirewallStatusInputSerializer(data=request.data)
        if serializer.is_valid():
            ip_address = serializer.validated_data.get('ip_address', None)
            job_id = serializer.validated_data.get('job_id', None)

            firewall_backup_file = UpdateFirewallBackupFile.objects.filter(job_id=job_id, ip_address=ip_address)
            response_serializer = FirewallBackupFileSerializer(firewall_backup_file, many=True)
            return Response({"data": response_serializer.data})
        else:
            return Response({"Error":serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class FirewallProcessStop(APIView):
    # permission_classes = (AllowAny)
    
    def post(self, request, *args, **kwargs):
        serializer = FirewallProcessStopSerializer(data=request.data)
        if serializer.is_valid():
            ip_address = serializer.validated_data.get('ip_address', [])
            job_id = serializer.validated_data.get('job_id', None)

            erros = []
            for ip in ip_address:
                firewall_status = UpdateFirewallStatus.objects.filter(job_id=job_id, ip_address=ip).first()
                if firewall_status:
                    firewall_status.status = 'stop'
                    firewall_status.save()
                else:
                    erros.append(ip)
            if erros:
                return Response({"message": f"Firewall process is not stopped for {erros}"}, status=status.HTTP_400_BAD_REQUEST)        
            return Response({"message": "Firewall process is stopped"})
        else:
            return Response({"Error":serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


#  TODO need to test
class GenerateAPIKey(APIView):
    # permission_classes = (AllowAny)
    
    def post(self, request, *args, **kwargs):
        serializer = GenerateAPIKeySerializer(data=request.data)
        if serializer.is_valid():
            ip_address = serializer.validated_data.get('ip_address', None)
            username = serializer.validated_data.get('username', None)
            password = serializer.validated_data.get('password', None)

            params =  {
                'type':'keygen',
                'user': username,
                'password': password
            }
            # url = f"https://{ip_address}/api/?type=keygen&user={username}&password={password}"
            url = f'https://{ip_address}/api/'

            key = ''
            try: 
                response = requests.get(url, params=params,verify=False)
                if response.status_code == 200:
                    root = ET.fromstring(response.text)
                    key_element = root.find('.//key')
                    key = key_element.text
                else:
                    key = 'invalid end point or connection timed out'
                    return Response({"Error":key}, status=status.HTTP_400_BAD_REQUEST)             
            except requests.exceptions.RequestException as e:
                key = e.args[0]
                return Response({"Error":key}, status=status.HTTP_400_BAD_REQUEST)
                
            return Response({"data":key})

        else:
            return Response({"Error":serializer.errors}, status=status.HTTP_400_BAD_REQUEST)