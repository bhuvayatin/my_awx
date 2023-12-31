# Copyright (c) 2017 Ansible, Inc.
# All Rights Reserved.

from django.urls import re_path

from awx.api.views import (
    InstanceGroupList,
    InstanceGroupDetail,
    InstanceGroupUnifiedJobsList,
    InstanceGroupInstanceList,
    InstanceGroupAccessList,
    InstanceGroupObjectRolesList,
)


urls = [
    re_path(r'^$', InstanceGroupList.as_view(), name='instance_group_list'),
    re_path(r'^(?P<pk>[0-9]+)/$', InstanceGroupDetail.as_view(), name='instance_group_detail'),
    re_path(r'^(?P<pk>[0-9]+)/jobs/$', InstanceGroupUnifiedJobsList.as_view(), name='instance_group_unified_jobs_list'),
    re_path(r'^(?P<pk>[0-9]+)/instances/$', InstanceGroupInstanceList.as_view(), name='instance_group_instance_list'),
    re_path(r'^(?P<pk>[0-9]+)/access_list/$', InstanceGroupAccessList.as_view(), name='instance_group_access_list'),
    re_path(r'^(?P<pk>[0-9]+)/object_roles/$', InstanceGroupObjectRolesList.as_view(), name='instance_group_object_role_list'),
]

__all__ = ['urls']
