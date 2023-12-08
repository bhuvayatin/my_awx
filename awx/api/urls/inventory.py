# Copyright (c) 2017 Ansible, Inc.
# All Rights Reserved.

from django.urls import re_path

from awx.api.views.inventory import (
    InventoryList,
    InventoryDetail,
    ConstructedInventoryDetail,
    ConstructedInventoryList,
    InventoryActivityStreamList,
    InventoryInputInventoriesList,
    InventoryJobTemplateList,
    InventoryAccessList,
    InventoryObjectRolesList,
    InventoryInstanceGroupsList,
    InventoryLabelList,
    InventoryCopy,
    GetVersion,
    GetPanorama,
    GetFireWallsData,
    GetInterFaceDetails,
    HighAvailability,
    GeneralInformation,
    SessionInformation,
    FirewallStatusLogs,
    FirewallBackupFile,
    FirewallProcessStop,
    GenerateAPIKey
)
from awx.api.views import (
    InventoryHostsList,
    InventoryGroupsList,
    InventoryInventorySourcesList,
    InventoryInventorySourcesUpdate,
    InventoryAdHocCommandsList,
    InventoryRootGroupsList,
    InventoryScriptView,
    InventoryTreeView,
    InventoryVariableData,
)


urls = [
    re_path(r'^$', InventoryList.as_view(), name='inventory_list'),
    re_path(r'^(?P<pk>[0-9]+)/$', InventoryDetail.as_view(), name='inventory_detail'),
    re_path(r'^(?P<pk>[0-9]+)/hosts/$', InventoryHostsList.as_view(), name='inventory_hosts_list'),
    re_path(r'^(?P<pk>[0-9]+)/groups/$', InventoryGroupsList.as_view(), name='inventory_groups_list'),
    re_path(r'^(?P<pk>[0-9]+)/root_groups/$', InventoryRootGroupsList.as_view(), name='inventory_root_groups_list'),
    re_path(r'^(?P<pk>[0-9]+)/variable_data/$', InventoryVariableData.as_view(), name='inventory_variable_data'),
    re_path(r'^(?P<pk>[0-9]+)/script/$', InventoryScriptView.as_view(), name='inventory_script_view'),
    re_path(r'^(?P<pk>[0-9]+)/tree/$', InventoryTreeView.as_view(), name='inventory_tree_view'),
    re_path(r'^(?P<pk>[0-9]+)/inventory_sources/$', InventoryInventorySourcesList.as_view(), name='inventory_inventory_sources_list'),
    re_path(r'^(?P<pk>[0-9]+)/input_inventories/$', InventoryInputInventoriesList.as_view(), name='inventory_input_inventories'),
    re_path(r'^(?P<pk>[0-9]+)/update_inventory_sources/$', InventoryInventorySourcesUpdate.as_view(), name='inventory_inventory_sources_update'),
    re_path(r'^(?P<pk>[0-9]+)/activity_stream/$', InventoryActivityStreamList.as_view(), name='inventory_activity_stream_list'),
    re_path(r'^(?P<pk>[0-9]+)/job_templates/$', InventoryJobTemplateList.as_view(), name='inventory_job_template_list'),
    re_path(r'^(?P<pk>[0-9]+)/ad_hoc_commands/$', InventoryAdHocCommandsList.as_view(), name='inventory_ad_hoc_commands_list'),
    re_path(r'^(?P<pk>[0-9]+)/access_list/$', InventoryAccessList.as_view(), name='inventory_access_list'),
    re_path(r'^(?P<pk>[0-9]+)/object_roles/$', InventoryObjectRolesList.as_view(), name='inventory_object_roles_list'),
    re_path(r'^(?P<pk>[0-9]+)/instance_groups/$', InventoryInstanceGroupsList.as_view(), name='inventory_instance_groups_list'),
    re_path(r'^(?P<pk>[0-9]+)/labels/$', InventoryLabelList.as_view(), name='inventory_label_list'),
    re_path(r'^(?P<pk>[0-9]+)/copy/$', InventoryCopy.as_view(), name='inventory_copy'),
    re_path(r'^get/version/$', GetVersion.as_view(), name='get_version'),
    re_path(r'^get/panorama/$', GetPanorama.as_view(), name='get_panorama'),
    re_path(r'^get/firewalls/$', GetFireWallsData.as_view(), name='get_firewalls_data'),
    re_path(r'^get/interface_details/$', GetInterFaceDetails.as_view(), name='get_firewalls_data'),
    re_path(r'^get/high_availability/$', HighAvailability.as_view(), name='get_firewalls_data'),
    re_path(r'^get/general_information/$', GeneralInformation.as_view(), name='get_general_information'),
    re_path(r'^get/session_information/$', SessionInformation.as_view(), name='get_session_information'),
    re_path(r'^get/firewall_status_logs/$', FirewallStatusLogs.as_view(), name='get_firewall_status_logs'),
    re_path(r'^get/firewall_backup_file/$', FirewallBackupFile.as_view(), name='get_firewall_backup_file'),
    re_path(r'^get/firewall_process_stop/$', FirewallProcessStop.as_view(), name='stop_firewall_process'),
    re_path(r'^get/generate_api_key/$', GenerateAPIKey.as_view(), name='generate_api_key'),
    
    
]

# Constructed inventory special views
constructed_inventory_urls = [
    re_path(r'^$', ConstructedInventoryList.as_view(), name='constructed_inventory_list'),
    re_path(r'^(?P<pk>[0-9]+)/$', ConstructedInventoryDetail.as_view(), name='constructed_inventory_detail'),
]

__all__ = ['urls', 'constructed_inventory_urls']
