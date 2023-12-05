import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import {
  TableComposable,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  TreeRowWrapper,
  InnerScrollContainer,
} from '@patternfly/react-table';
import {
  Bullseye,
  Button,
  Checkbox,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateVariant,
  Label,
  Pagination,
  Select,
  SelectOption,
  SelectVariant,
  Spinner,
  Title,
} from '@patternfly/react-core';
import LeafIcon from '@patternfly/react-icons/dist/esm/icons/leaf-icon';
import FolderIcon from '@patternfly/react-icons/dist/esm/icons/folder-icon';
import FolderOpenIcon from '@patternfly/react-icons/dist/esm/icons/folder-open-icon';
import {
  CheckCircleIcon,
  CubesIcon,
  MinusCircleIcon,
} from '@patternfly/react-icons';
import useRequest from 'hooks/useRequest';
import yaml from 'js-yaml';
import { InventoriesAPI, JobTemplatesAPI } from 'api';
import styled from 'styled-components';
import ModalAlert from './ModalAlert';
import DataModal from './DataModal';
import AceEditor from 'react-ace';

import 'ace-builds/src-noconflict/mode-xml';

const ComposableTableTree = () => {
  const columnNames = {
    Firewall_Serial: 'Firewall Serial',
    name: 'Name',
    IP_Address: 'IP Address',
    Firewall_State: 'Firewall State',
    // HA_Group_ID: 'HA Group ID',
    Software_Version: 'Software Version',
    Threat_Version: 'Apps And Threat',
    Hapair_Status: 'Ha Pair Status',
  };
  const pageSize = 10;
  // Static Data JSON
  const childdata = [
    {
      name: 'device_group1',
      Firewalls: [
        {
          Firewall_Serial: '007951000342260',
          Device_Name: 'PA_VN-86',
          IP_Address: '10.215.18.83',
          status: 'connected',
          hapair: '1d3',
          Software_Version: '9.0.1',
          Firewall_State: true,
        },
        {
          Firewall_Serial: '007951000342261',
          Device_Name: 'PA_VN-87',
          IP_Address: '10.215.18.84',
          status: 'connected',
          hapair: '1d3',
          Software_Version: '9.0.1',
          Firewall_State: true,
        },
        {
          Firewall_Serial: '007951000342262',
          Device_Name: 'PA_VN-88',
          IP_Address: '10.215.18.85',
          status: 'connected',
          hapair: '1d4',
          Software_Version: '9.0.1',
          Firewall_State: true,
        },
        {
          Firewall_Serial: '007951000342263',
          Device_Name: 'PA_VN-89',
          IP_Address: '10.215.18.86',
          status: 'connected',
          hapair: '1d4',
          Software_Version: '9.0.1',
          Firewall_State: true,
        },
        {
          Firewall_Serial: '007951000342264',
          Device_Name: 'PA_VN-90',
          IP_Address: '10.215.18.87',
          status: 'connected',
          hapair: '1d5',
          Software_Version: '9.0.1',
          Firewall_State: false,
        },
      ],
    },
    {
      name: '',
      Firewalls: [
        {
          Firewall_Serial: '00795100034228',
          Device_Name: 'PA_VN-867',
          IP_Address: '10.215.18.183',
          status: 'connected',
          hapair: '1d5',
          Software_Version: '9.0.1',
          Firewall_State: true,
        },
      ],
    },
  ];

  const newchilddata = [
    {
      name: 'XSOAR_Upgrade_testing',
      firewalls: [
        {
          hostname: 'PA-VM_85',
          'ip-address': '10.215.18.85',
          'public-ip-address': 'unknown',
          'ha-pair': '111',
          netmask: '255.255.254.0',
          'default-gateway': '10.215.18.1',
          'is-dhcp': 'no',
          'ipv6-address': 'unknown',
          'ipv6-link-local-address': 'fe80::250:56ff:fe9e:1dd2/64',
          'ipv6-default-gateway': 'None',
          'mac-address': '00:50:56:9e:1d:d2',
          time: 'Wed Nov  1 09:07:34 2023',
          uptime: '41 days, 21:15:49',
          devicename: 'PA-VM_85',
          family: 'vm',
          model: 'PA-VM',
          serial: '007951000342260',
          'vm-mac-base': '7C:89:C3:0A:8C:00',
          'vm-mac-count': '256',
          'vm-uuid': '421EA98F-619A-47C1-3100-86238DEB645B',
          'vm-cpuid': 'ESX:57060500FFFB8B1F',
          'vm-license': 'VM-100',
          'vm-mode': 'VMware ESXi',
          'cloud-mode': 'non-cloud',
          'sw-version': '9.0.16-h3',
          'global-protect-client-package-version': '0.0.0',
          'app-version': '8766-8347',
          'app-release-date': '2023/10/17 19:43:26 PDT',
          'av-version': '4361-4874',
          'av-release-date': '2023/02/13 14:15:56 PST',
          'threat-version': '8766-8347',
          'threat-release-date': '2023/10/17 19:43:26 PDT',
          'wf-private-version': '0',
          'wf-private-release-date': 'unknown',
          'url-db': 'paloaltonetworks',
          'wildfire-version': '0',
          'wildfire-release-date': 'None',
          'url-filtering-version': '20231101.20252',
          'global-protect-datafile-version': 'unknown',
          'global-protect-datafile-release-date': 'unknown',
          'global-protect-clientless-vpn-version': '0',
          'global-protect-clientless-vpn-release-date': 'None',
          'logdb-version': '9.0.10',
          plugin_versions: {
            entry: {
              pkginfo: 'vm_series-1.0.5',
              '@name': 'vm_series',
              '@version': '1.0.5',
            },
          },
          'platform-family': 'vm',
          'vpn-disable-mode': 'off',
          'multi-vsys': 'off',
          'operational-mode': 'normal',
          'device-certificate-status': 'None',
          peer_info_state: {
            enabled: 'yes',
            group: {
              mode: 'Active-Passive',
              'local-info': {
                'url-compat': 'Mismatch',
                'app-version': '8766-8347',
                'gpclient-version': 'Not Installed',
                'build-rel': '9.0.16-h3',
                'ha2-port': 'ethernet1/3',
                'av-version': '4361-4874',
                'ha1-gateway': '10.215.18.1',
                'url-version': '20231101.20252',
                'active-passive': {
                  'passive-link-state': 'shutdown',
                  'monitor-fail-holddown': '1',
                },
                'platform-model': 'PA-VM',
                'av-compat': 'Match',
                'ha2-ipaddr': '192.168.1.1/24',
                'vpnclient-compat': 'Match',
                'ha1-ipaddr': '10.215.18.85/23',
                'vm-license': 'vm100',
                'ha2-macaddr': '00:50:56:9e:4d:8c',
                'monitor-fail-holdup': '0',
                priority: '10',
                'preempt-hold': '1',
                state: 'active',
                version: '1',
                'promotion-hold': '2000',
                'threat-compat': 'Match',
                'state-sync': 'Complete',
                'vm-license-compat': 'Mismatch',
                'addon-master-holdup': '500',
                'heartbeat-interval': '2000',
                'ha1-link-mon-intv': '3000',
                'hello-interval': '8000',
                'ha1-port': 'management',
                'ha1-encrypt-imported': 'no',
                'mgmt-ip': '10.215.18.85/23',
                'vpnclient-version': 'Not Installed',
                'preempt-flap-cnt': '0',
                'nonfunc-flap-cnt': '0',
                'threat-version': '8766-8347',
                'ha1-macaddr': '00:50:56:9e:1d:d2',
                'vm-license-type': 'vm100',
                'state-duration': '3618766',
                'max-flaps': '3',
                'ha1-encrypt-enable': 'no',
                'mgmt-ipv6': 'None',
                'state-sync-type': 'ethernet',
                preemptive: 'no',
                'gpclient-compat': 'Match',
                mode: 'Active-Passive',
                'build-compat': 'Mismatch',
                VMS: 'Compat Match',
                'app-compat': 'Match',
              },
              'peer-info': {
                'app-version': '8766-8347',
                'gpclient-version': 'Not Installed',
                'url-version': '0000.00.00.000',
                'build-rel': '9.1.0',
                'ha2-ipaddr': '192.168.1.2',
                'platform-model': 'PA-VM',
                'vm-license': 'VM-100',
                'ha2-macaddr': '00:50:56:9e:a1:d1',
                priority: '100',
                state: 'passive',
                version: '1',
                'last-error-reason': 'User requested',
                'conn-status': 'up',
                'av-version': '4361-4874',
                'vpnclient-version': 'Not Installed',
                'mgmt-ip': '10.215.18.86/23',
                'conn-ha2': {
                  'conn-status': 'up',
                  'conn-ka-enbled': 'no',
                  'conn-primary': 'yes',
                  'conn-desc': 'link status',
                },
                'threat-version': '8766-8347',
                'ha1-macaddr': '00:50:56:9e:ae:f0',
                'conn-ha1': {
                  'conn-status': 'up',
                  'conn-primary': 'yes',
                  'conn-desc': 'heartbeat status',
                },
                'vm-license-type': 'VM-100',
                'state-duration': '1213383',
                'ha1-ipaddr': '10.215.18.86',
                'mgmt-ipv6': 'None',
                'last-error-state': 'suspended',
                preemptive: 'no',
                mode: 'Active-Passive',
                VMS: '1.0.13',
              },
              'link-monitoring': {
                'fail-cond': 'any',
                enabled: 'yes',
                groups: 'None',
              },
              'path-monitoring': {
                vwire: 'None',
                'fail-cond': 'any',
                vlan: 'None',
                enabled: 'yes',
                vrouter: 'None',
              },
              'running-sync': 'not synchronized',
              'running-sync-enabled': 'yes',
            },
          },
        },
        {
          hostname: 'PA-VM_86',
          'ip-address': '10.215.18.86',
          'public-ip-address': 'unknown',
          'ha-pair': '111',
          netmask: '255.255.254.0',
          'default-gateway': '10.215.18.1',
          'is-dhcp': 'no',
          'ipv6-address': 'unknown',
          'ipv6-link-local-address': 'fe80::250:56ff:fe9e:aef0/64',
          'ipv6-default-gateway': 'None',
          'mac-address': '00:50:56:9e:ae:f0',
          time: 'Wed Nov  1 09:07:35 2023',
          uptime: '14 days, 1:07:19',
          devicename: 'PA-VM_86',
          family: 'vm',
          model: 'PA-VM',
          serial: '007951000342259',
          'vm-mac-base': '7C:89:C1:89:7A:00',
          'vm-mac-count': '256',
          'vm-uuid': '421E1A8C-FEF5-7BDF-90D3-CD096E92F569',
          'vm-cpuid': 'ESX:57060500FFFB8B1F',
          'vm-license': 'VM-100',
          'vm-mode': 'VMware ESXi',
          'cloud-mode': 'non-cloud',
          'sw-version': '9.1.0',
          'global-protect-client-package-version': '0.0.0',
          'app-version': '8766-8347',
          'app-release-date': '2023/10/17 19:43:26 PDT',
          'av-version': '4361-4874',
          'av-release-date': 'None',
          'threat-version': '8766-8347',
          'threat-release-date': '2023/10/17 19:43:26 PDT',
          'wf-private-version': '0',
          'wf-private-release-date': 'unknown',
          'url-db': 'paloaltonetworks',
          'wildfire-version': '0',
          'wildfire-release-date': 'None',
          'url-filtering-version': '0000.00.00.000',
          'global-protect-datafile-version': 'unknown',
          'global-protect-datafile-release-date': 'unknown',
          'global-protect-clientless-vpn-version': '0',
          'global-protect-clientless-vpn-release-date': 'None',
          'logdb-version': '9.1.21',
          plugin_versions: {
            entry: {
              pkginfo: 'vm_series-1.0.13',
              '@name': 'vm_series',
              '@version': '1.0.13',
            },
          },
          'platform-family': 'vm',
          'vpn-disable-mode': 'off',
          'multi-vsys': 'off',
          'operational-mode': 'normal',
          peer_info_state: {
            enabled: 'yes',
            group: {
              mode: 'Active-Passive',
              'local-info': {
                'url-compat': 'Mismatch',
                'app-version': '8766-8347',
                'gpclient-version': 'Not Installed',
                'build-rel': '9.1.0',
                'ha2-port': 'ethernet1/3',
                'av-version': '4361-4874',
                'ha1-gateway': '10.215.18.1',
                'url-version': '0000.00.00.000',
                'active-passive': {
                  'passive-link-state': 'shutdown',
                  'monitor-fail-holddown': '1',
                },
                'platform-model': 'PA-VM',
                'av-compat': 'Match',
                'ha2-ipaddr': '192.168.1.2/24',
                'vpnclient-compat': 'Match',
                'ha1-ipaddr': '10.215.18.86/23',
                'vm-license': 'VM-100',
                'ha2-macaddr': '00:50:56:9e:a1:d1',
                'monitor-fail-holdup': '0',
                priority: '100',
                'preempt-hold': '1',
                state: 'passive',
                version: '1',
                'promotion-hold': '2000',
                'threat-compat': 'Match',
                'state-sync': 'Complete',
                'addon-master-holdup': '500',
                'heartbeat-interval': '2000',
                'ha1-link-mon-intv': '3000',
                'hello-interval': '8000',
                'ha1-port': 'management',
                'ha1-encrypt-imported': 'no',
                'mgmt-ip': '10.215.18.86/23',
                'vpnclient-version': 'Not Installed',
                'preempt-flap-cnt': '0',
                'nonfunc-flap-cnt': '0',
                'threat-version': '8766-8347',
                'ha1-macaddr': '00:50:56:9e:ae:f0',
                'state-duration': '1213383',
                'max-flaps': '3',
                'ha1-encrypt-enable': 'no',
                'mgmt-ipv6': 'None',
                'state-sync-type': 'ethernet',
                preemptive: 'no',
                'gpclient-compat': 'Match',
                mode: 'Active-Passive',
                'build-compat': 'Mismatch',
                VMS: 'Compat Match',
                'app-compat': 'Match',
              },
              'peer-info': {
                'app-version': '8766-8347',
                'gpclient-version': 'Not Installed',
                'url-version': '20231101.20252',
                'build-rel': '9.0.16-h3',
                'ha2-ipaddr': '192.168.1.1',
                'platform-model': 'PA-VM',
                'vm-license': 'vm100',
                'ha2-macaddr': '00:50:56:9e:4d:8c',
                priority: '10',
                state: 'active',
                version: '1',
                'conn-status': 'up',
                'av-version': '4361-4874',
                'vpnclient-version': 'Not Installed',
                'mgmt-ip': '10.215.18.85/23',
                'conn-ha2': {
                  'conn-status': 'up',
                  'conn-ka-enbled': 'no',
                  'conn-primary': 'yes',
                  'conn-desc': 'link status',
                },
                'threat-version': '8766-8347',
                'ha1-macaddr': '00:50:56:9e:1d:d2',
                'conn-ha1': {
                  'conn-status': 'up',
                  'conn-primary': 'yes',
                  'conn-desc': 'heartbeat status',
                },
                'state-duration': '1213389',
                'ha1-ipaddr': '10.215.18.85',
                'mgmt-ipv6': 'None',
                preemptive: 'no',
                mode: 'Active-Passive',
                VMS: '1.0.5',
              },
              'link-monitoring': {
                'fail-cond': 'any',
                enabled: 'yes',
                groups: 'None',
              },
              'path-monitoring': {
                vwire: 'None',
                'fail-cond': 'any',
                vlan: 'None',
                enabled: 'yes',
                vrouter: 'None',
              },
              'running-sync': 'not synchronized',
              'running-sync-enabled': 'yes',
            },
          },
        },
      ],
    },
    {
      name: '',
      firewalls: [
        {
          hostname: 'PA-VM_87',
          'ip-address': '10.215.18.180',
          'public-ip-address': 'unknown',
          netmask: '255.255.254.0',
          'ha-pair': '112',
          'default-gateway': '10.215.18.1',
          'is-dhcp': 'no',
          'ipv6-address': 'unknown',
          'ipv6-link-local-address': 'fe80::250:56ff:fe9e:1dd2/64',
          'ipv6-default-gateway': 'None',
          'mac-address': '00:50:56:9e:1d:d2',
          time: 'Wed Nov  1 09:07:34 2023',
          uptime: '41 days, 21:15:49',
          devicename: 'PA-VM_87',
          family: 'vm',
          model: 'PA-VM',
          serial: '007951000342260',
          'vm-mac-base': '7C:89:C3:0A:8C:00',
          'vm-mac-count': '256',
          'vm-uuid': '421EA98F-619A-47C1-3100-86238DEB645B',
          'vm-cpuid': 'ESX:57060500FFFB8B1F',
          'vm-license': 'VM-100',
          'vm-mode': 'VMware ESXi',
          'cloud-mode': 'non-cloud',
          'sw-version': '9.0.16-h3',
          'global-protect-client-package-version': '0.0.0',
          'app-version': '8766-8347',
          'app-release-date': '2023/10/17 19:43:26 PDT',
          'av-version': '4361-4874',
          'av-release-date': '2023/02/13 14:15:56 PST',
          'threat-version': '8766-8347',
          'threat-release-date': '2023/10/17 19:43:26 PDT',
          'wf-private-version': '0',
          'wf-private-release-date': 'unknown',
          'url-db': 'paloaltonetworks',
          'wildfire-version': '0',
          'wildfire-release-date': 'None',
          'url-filtering-version': '20231101.20252',
          'global-protect-datafile-version': 'unknown',
          'global-protect-datafile-release-date': 'unknown',
          'global-protect-clientless-vpn-version': '0',
          'global-protect-clientless-vpn-release-date': 'None',
          'logdb-version': '9.0.10',
          plugin_versions: {
            entry: {
              pkginfo: 'vm_series-1.0.5',
              '@name': 'vm_series',
              '@version': '1.0.5',
            },
          },
          'platform-family': 'vm',
          'vpn-disable-mode': 'off',
          'multi-vsys': 'off',
          'operational-mode': 'normal',
          'device-certificate-status': 'None',
          peer_info_state: {
            enabled: 'yes',
            group: {
              mode: 'Active-Passive',
              'local-info': {
                'url-compat': 'Mismatch',
                'app-version': '8766-8347',
                'gpclient-version': 'Not Installed',
                'build-rel': '9.0.16-h3',
                'ha2-port': 'ethernet1/3',
                'av-version': '4361-4874',
                'ha1-gateway': '10.215.18.1',
                'url-version': '20231101.20252',
                'active-passive': {
                  'passive-link-state': 'shutdown',
                  'monitor-fail-holddown': '1',
                },
                'platform-model': 'PA-VM',
                'av-compat': 'Match',
                'ha2-ipaddr': '192.168.1.1/24',
                'vpnclient-compat': 'Match',
                'ha1-ipaddr': '10.215.18.85/23',
                'vm-license': 'vm100',
                'ha2-macaddr': '00:50:56:9e:4d:8c',
                'monitor-fail-holdup': '0',
                priority: '10',
                'preempt-hold': '1',
                state: 'active',
                version: '1',
                'promotion-hold': '2000',
                'threat-compat': 'Match',
                'state-sync': 'Complete',
                'vm-license-compat': 'Mismatch',
                'addon-master-holdup': '500',
                'heartbeat-interval': '2000',
                'ha1-link-mon-intv': '3000',
                'hello-interval': '8000',
                'ha1-port': 'management',
                'ha1-encrypt-imported': 'no',
                'mgmt-ip': '10.215.18.85/23',
                'vpnclient-version': 'Not Installed',
                'preempt-flap-cnt': '0',
                'nonfunc-flap-cnt': '0',
                'threat-version': '8766-8347',
                'ha1-macaddr': '00:50:56:9e:1d:d2',
                'vm-license-type': 'vm100',
                'state-duration': '3618766',
                'max-flaps': '3',
                'ha1-encrypt-enable': 'no',
                'mgmt-ipv6': 'None',
                'state-sync-type': 'ethernet',
                preemptive: 'no',
                'gpclient-compat': 'Match',
                mode: 'Active-Passive',
                'build-compat': 'Mismatch',
                VMS: 'Compat Match',
                'app-compat': 'Match',
              },
              'peer-info': {
                'app-version': '8766-8347',
                'gpclient-version': 'Not Installed',
                'url-version': '0000.00.00.000',
                'build-rel': '9.1.0',
                'ha2-ipaddr': '192.168.1.2',
                'platform-model': 'PA-VM',
                'vm-license': 'VM-100',
                'ha2-macaddr': '00:50:56:9e:a1:d1',
                priority: '100',
                state: 'passive',
                version: '1',
                'last-error-reason': 'User requested',
                'conn-status': 'up',
                'av-version': '4361-4874',
                'vpnclient-version': 'Not Installed',
                'mgmt-ip': '10.215.18.86/23',
                'conn-ha2': {
                  'conn-status': 'up',
                  'conn-ka-enbled': 'no',
                  'conn-primary': 'yes',
                  'conn-desc': 'link status',
                },
                'threat-version': '8766-8347',
                'ha1-macaddr': '00:50:56:9e:ae:f0',
                'conn-ha1': {
                  'conn-status': 'up',
                  'conn-primary': 'yes',
                  'conn-desc': 'heartbeat status',
                },
                'vm-license-type': 'VM-100',
                'state-duration': '1213383',
                'ha1-ipaddr': '10.215.18.86',
                'mgmt-ipv6': 'None',
                'last-error-state': 'suspended',
                preemptive: 'no',
                mode: 'Active-Passive',
                VMS: '1.0.13',
              },
              'link-monitoring': {
                'fail-cond': 'any',
                enabled: 'yes',
                groups: 'None',
              },
              'path-monitoring': {
                vwire: 'None',
                'fail-cond': 'any',
                vlan: 'None',
                enabled: 'yes',
                vrouter: 'None',
              },
              'running-sync': 'not synchronized',
              'running-sync-enabled': 'yes',
            },
          },
        },
      ],
    },
  ];

  const version_info = ['9.1.0', '9.1.1', '9.1.2', '9.1.3', '9.1.4'];
  const history = useHistory();
  const [expandedNodeName, setExpandedNodeName] = useState(null);
  const [expandedDetailsNodeNames, setExpandedDetailsNodeNames] = useState([]);
  const [selectinventory, setSelectinventory] = useState(null);
  const [isopenversion, setIsOpenversion] = useState(false);
  const [selectinventoryname, setSelectinventoryname] = useState(null);
  const [selectedNodeNames, setSelectedNodeNames] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [gethostname, setGethostname] = useState([]);
  const [username, setUsername] = useState('');
  const [access_token, SetAccess_token] = useState('');
  const [panoramalist, setPanoramalist] = useState(childdata);
  const [password, setPassword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [software_version, setSoftware_version] = useState('');
  const [isopensoftware_version, setIsopenoftware_version] = useState(false);

  const [getdata, setGetdata] = useState(newchilddata);
  const [iserror, setIserror] = useState(false);
  const [datamodal, setDatamodal] = useState(false);
  const [iserrormsg, setIserrormsg] = useState('');
  const [isChecked, setIsChecked] = useState(false);
  const [ip_address, setIp_address] = useState();
  // Calculate the start and end indices for the current page
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  const [isLoading, setIsLoading] = useState(false);
  // const lastMessage = useWebsocketForIP(['10.215.18.83', '10.215.18.84', '10.215.18.85']);
  // Call Hooks to make list api call for the inventory
  const {
    result: { results },
    error: contentError,
    request: fetchInventories,
  } = useRequest(
    useCallback(async () => {
      const [response, actionsResponse] = await Promise.all([
        InventoriesAPI.read(),
        InventoriesAPI.readOptions(),
      ]);
      return {
        results: response.data.results,
      };
    }, []),
    {
      results: [],
    }
  );

  const GetPanoramaVersion = async () => {
    const payload = {
      host: selectedOption,
      access_token: access_token?.access_token,
    };
    try {
      const { data } = await InventoriesAPI.readPanoramaVersion(payload);
      if (!data?.Error) {
        setPanoramalist(data?.result?.entry);
      }
      return data;
    } catch (error) {
      setIserror(true);
      setIserrormsg(error?.response?.data?.Error);
    }
  };

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const { data } = await InventoriesAPI.readDetail(selectinventory);
        if (data?.variables !== '') {
          const cleanedJsonString = data?.variables
            ?.replace(/\n/g, '')
            .replace(/  +/g, '');
          try {
            const Username = JSON.parse(cleanedJsonString)?.all?.vars;
            SetAccess_token(Username);
            localStorage.setItem('api_key', Username?.access_token);
            // Try parsing as JSON
            const jsonObject =
              JSON.parse(cleanedJsonString)?.all?.children?.panoramas?.children;
            // setGethostname(
            //   Object.keys(jsonObject).map((key) => jsonObject[key])
            //   );

            // Loop through the firewallData object to extract ansible_host values
            const ansibleHosts = [];

            for (const firewallName in jsonObject) {
              const hosts = jsonObject[firewallName].hosts;

              if (hosts) {
                for (const hostName in hosts) {
                  const ansibleHost = hosts[hostName]?.ansible_host;

                  if (ansibleHost) {
                    ansibleHosts.push(ansibleHost);
                  }
                }
              }
            }

            setGethostname(ansibleHosts);
          } catch (jsonError) {
            try {
              // If parsing as JSON fails, try parsing as YAML
              const yamlObject = yaml.load(data?.variables);
              const jsonObject = yamlObject?.all?.children?.panoramas?.children;
              const ansibleHosts = [];
              const Username = JSON.parse(cleanedJsonString)?.all?.vars;
              SetAccess_token(Username);
              localStorage.setItem('api_key', Username?.access_token);
              for (const firewallName in jsonObject) {
                const hosts = jsonObject[firewallName].hosts;

                if (hosts) {
                  for (const hostName in hosts) {
                    const ansibleHost = hosts[hostName]?.ansible_host;

                    if (ansibleHost) {
                      ansibleHosts.push(ansibleHost);
                    }
                  }
                }
              }

              setGethostname(ansibleHosts);
            } catch (yamlError) {
              console.error('Error parsing data:', yamlError);
              setGethostname([]);
            }
          }
        } else {
          setGethostname([]);
        }
        setIsLoading(false);
      } catch (error) {
        console.log(' error:', error);
      }
    }
    if (selectinventory) {
      fetchData();
    }
  }, [selectinventory]);

  const getFirewall = async () => {
    const payload = {
      host: selectedOption,
      access_token: access_token?.access_token,
    };

    try {
      setIsLoading(true);
      const data = await InventoriesAPI.readfirewallsVersion(payload);
      if (data?.data !== undefined) {
        setGetdata(data?.data?.data);
        setIsLoading(false);
      } else {
        alert('No Data Found');
      }
      return data;
    } catch (error) {
      setIsLoading(false);
      setIserror(true);
      if (error?.response?.data?.Error) {
        console.log(
          '🚀 ~ file: LegacyTableTree.js:274 ~ getFirewall ~ error?.response?.data?.Error:',
          error?.response?.data?.Error
        );
        setIserrormsg(error?.response?.data?.Error);
      } else {
        console.log(
          '🚀 ~ file: LegacyTableTree.js:277 ~ getFirewall ~ error?.response?.statusText:',
          error?.response?.statusText
        );
        setIserror(true);
        setIserrormsg(error?.response?.statusText);
      }
    }
  };
  useEffect(() => {
    if (selectedOption) {
      // GetPanoramaVersion();
      getFirewall();
    }
  }, [selectedOption]);
  // UseEffect for call Inventory list api
  useEffect(() => {
    fetchInventories();
  }, [fetchInventories]);

  const getDescendants = (node) => {
    if (!node.children || !node.children.length) {
      return [node];
    } else {
      let children = [];
      node.children.forEach((child) => {
        children = [...children, ...getDescendants(child)];
      });
      return children;
    }
  };

  const areAllDescendantsSelected = (node) =>
    getDescendants(node).every((n) => selectedNodeNames.includes(n.name));

  const areSomeDescendantsSelected = (node) =>
    getDescendants(node).some((n) => selectedNodeNames.includes(n.name));

  const isNodeChecked = (node) => {
    if (areAllDescendantsSelected(node)) {
      return true;
    }
    if (areSomeDescendantsSelected(node)) {
      return null;
    }
    return false;
  };

  //   Render Function For The Table Row
  const renderRows = (
    [node, ...remainingNodes],
    level = 1,
    posinset = 1,
    rowIndex = 0,
    isHidden = false
  ) => {
    if (!node) {
      return [];
    }
    const isExpanded = expandedNodeName === node.name;
    const isDetailsExpanded = expandedDetailsNodeNames.includes(node.name);
    const isChecked = isNodeChecked(node);
    let icon = <LeafIcon />;

    if (node.children) {
      icon = isExpanded ? (
        <FolderOpenIcon aria-hidden />
      ) : (
        <FolderIcon aria-hidden />
      );
    }

    const treeRow = {
      onCollapse: () => {
        setExpandedNodeName((prevExpanded) =>
          prevExpanded === node.name ? null : node.name
        );
      },
      onToggleRowDetails: () =>
        setExpandedDetailsNodeNames((prevDetailsExpanded) => {
          const otherDetailsExpandedNodeNames = prevDetailsExpanded.filter(
            (name) => name !== node.name
          );
          return isDetailsExpanded
            ? otherDetailsExpandedNodeNames
            : [...otherDetailsExpandedNodeNames, node];
        }),
      onCheckChange: (_event, isChecking) => {
        const nodeNamesToCheck = getDescendants(node).map((n) => n.name);
        setSelectedNodeNames((prevSelected) => {
          const otherSelectedNodeNames = prevSelected.filter(
            (name) => !nodeNamesToCheck.includes(name)
          );
          return !isChecking
            ? otherSelectedNodeNames
            : [...otherSelectedNodeNames, ...nodeNamesToCheck];
        });
      },
      rowIndex,
      props: {
        isExpanded,
        isDetailsExpanded,
        isHidden,
        'aria-level': level,
        'aria-posinset': posinset,
        'aria-setsize': node.children ? node.children.length : 0,
        isChecked,
        checkboxId: `checkbox_id_${node?.name
          ?.toLowerCase()
          .replace(/\s+/g, '_')}`,
        icon,
      },
    };

    const childRows =
      node.children && node.children.length
        ? renderRows(
            node.children,
            level + 1,
            1,
            rowIndex + 1,
            !isExpanded || isHidden
          )
        : [];

    return [
      <TreeRowWrapper key={rowIndex} row={{ props: treeRow.props }}>
        <Td dataLabel={columnNames.name} treeRow={treeRow}>
          {node.name}
        </Td>
        <Td dataLabel={columnNames.Firewall_Serial}>{node?.Firewall_Serial}</Td>
        <Td dataLabel={columnNames.IP_Address}>
          <a
            onClick={() => {
              if (level == 2) {
                setDatamodal(true);
                setIp_address(node?.IP_Address);
              }
            }}
          >
            {node?.IP_Address}
          </a>
        </Td>
        <Td dataLabel={columnNames.Firewall_State}>
          {node?.status && node?.status == 'Connected' && (
            <Label variant="outline" color={'green'} icon={<CheckCircleIcon />}>
              {node?.status}
            </Label>
          )}
          {node?.status && node?.status == 'Disconnected' && (
            <Label variant="outline" color={'red'} icon={<MinusCircleIcon />}>
              {node?.status}
            </Label>
          )}
        </Td>
        <Td dataLabel={columnNames.Hapair_Status}>
          {node?.Hapair_Status == 'active' && (
            <Label color="green" icon={<CheckCircleIcon />}>
              {node?.Hapair_Status}
            </Label>
          )}
          {node?.Hapair_Status == 'passive' && (
            <Label color="gold" icon={<MinusCircleIcon />}>
              {node?.Hapair_Status}
            </Label>
          )}
        </Td>
        <Td dataLabel={columnNames.Threat_Version}>{node?.Threat_Version}</Td>
        <Td dataLabel={columnNames.version}>{node?.version}</Td>
      </TreeRowWrapper>,
      ...childRows,
      ...renderRows(
        remainingNodes,
        level,
        posinset + 1,
        rowIndex + 1 + childRows.length,
        isHidden
      ),
    ];
  };

  // Get Data From Data JSON And Filter Accroding To Our Neew
  const data = getdata?.map((parent) => {
    let children = parent?.firewalls?.map((child) => ({
      name: child['devicename'],
      Firewall_Serial: child['serial'],
      IP_Address: child['ip-address'],
      status: child['serial'] == true ? 'Connected' : 'Disconnected',
      // hapair: child['HA_Group_ID'],
      version: child['sw-version'],
      Threat_Version: child['threat-version'],
      Hapair_Status: child['peer_info_state']['group']['local-info']['state'],
    }));
    return {
      name: parent['name'] == '' ? 'No Device Group' : parent['name'],
      children,
    };
  });

  // Slice Data Accroding To The Current Page
  const pageData = data?.slice(startIndex, endIndex);

  // OnToggle Inventory DropDown
  const onToggle = (isOpen) => {
    setIsOpen(isOpen);
  };
  //   OnToggle Panoramas Devices DropDown
  const onToggleversion = (isopenversion) => {
    setIsOpenversion(isopenversion);
  };
  const onTogglesoftwareversion = (isopenoftware_version) => {
    setIsopenoftware_version(isopenoftware_version);
  };
  // Get Value Of The Inventory
  const onSelectinventory = (event, selection, isPlaceholder) => {
    if (!isPlaceholder) {
      const selectedOption = results.find((option) => option.id === selection);
      // setSelectInventory(selectedOption);
      setSelectinventoryname(selectedOption?.name);
    }
    setSelectinventory(selection);
    setIsOpen(false);
  };

  const onSelectsoftwareversion = (event, selection) => {
    setSoftware_version(selection);
    setIsopenoftware_version(false);
  };
  //   Get Value Of The Panoramas Devices
  const onSelecversion = (event, selection) => {
    setSelectedOption(selection);
    setIsOpenversion(false);
  };

  //   OnSubmit Create One Payload For POST API

  const handleSubmit = async () => {
    const selectedRows = data.reduce((result, parent) => {
      const parentRow = selectedNodeNames.includes(parent.name)
        ? { parent: parent.name, child: [] }
        : null;

      const childRows = parent.children
        ? parent.children
            .filter((child) => selectedNodeNames.includes(child.name))
            .map((child) => ({ ip: child.IP_Address, name: child.name }))
        : [];

      if (parentRow) {
        const existingRow = result.find(
          (row) => row.parent === parentRow.parent
        );

        if (existingRow) {
          existingRow.child.push(...childRows);
        } else {
          parentRow.child = childRows;
          result.push(parentRow);
        }
      } else {
        result.push(
          ...childRows.map((child) => ({
            parent: parent.name,
            child,
          }))
        );
      }

      return result;
    }, []);
    const mergedRows = selectedRows.reduce((result, row) => {
      const existingRow = result.find((r) => r.parent === row.parent);

      if (existingRow) {
        if (Array.isArray(existingRow.child)) {
          existingRow.child.push(row.child);
        } else {
          existingRow.child = [existingRow.child, row.child];
        }
      } else {
        result.push({ parent: row.parent, child: [row.child] });
      }

      return result;
    }, []);
    const payload_ip = selectedRows?.map((item) => item.child);
    const payload = {
      credential_passwords: {},
      extra_vars: {
        inventory_hostname: payload_ip,
      },
      panos_version_input: software_version,
    };
    try {
      const { data } = await JobTemplatesAPI.launch(11, {
        extra_vars: payload,
      });
      // callsocket(mergedRows, data?.id);
      if (data) {
        history.push({
          pathname: `/jobs/playbook/${data.id}/fresult`,
          state: { id: data?.id, ip: mergedRows, sequence: isChecked },
        });
      }
    } catch (error) {
      console.log(
        '🚀 ~ file: InventoryTable.js:177 ~ handleSubmit ~ error:',
        error
      );
    }
  };
  var xmlContent = `
<root>
  <element attribute="value">Content</element>
  <!-- More XML content here -->
</root>
`;
useEffect(()=>{
  fetchXmlContent()
},[])
const fetchXmlContent = async () => {
  const response = await fetch('/home/yatin/Downloads/xmldata.xml');
  const xmlText = await response.text();

  // Parse the XML string using DOMParser
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
  const formattedXml = new XMLSerializer().serializeToString(xmlDoc);
  console.log("🚀 ~ file: LegacyTableTree.js:1146 ~ fetchXmlContent ~ formattedXml:", formattedXml)
};

  const closeModal = () => {
    setIserror(false);
  };
  const closeDataModal = () => {
    setDatamodal(false);
  };
  const handleCheckboxChange = (isChecked) => {
    // Perform any additional logic here
    console.log('Checkbox is now:', isChecked);

    // Update the state
    setIsChecked(isChecked);
  };

  // Mode Stict Data

  return (
    <>
      {iserror && (
        <ModalAlert
          variant="error"
          isOpen={iserror}
          title={`Error!`}
          onClose={closeModal}
        >
          <p>{iserrormsg}</p>
        </ModalAlert>
      )}
      {datamodal && (
        <DataModal
          isOpen={datamodal}
          onClose={closeDataModal}
          ip={ip_address}
        />
      )}
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px' }}>
        <div>
          <label htmlFor="firewall-select" style={{ margin: '0 8px' }}>
            Select Inventory:
          </label>
          <Select
            id="firewall-select"
            variant={SelectVariant.single}
            onSelect={onSelectinventory}
            onToggle={onToggle}
            isOpen={isOpen}
            selections={selectinventory}
            placeholderText="Select a Inventory"
            width={200}
          >
            {results.map((option, index) => (
              <SelectOption
                key={option?.name}
                value={option?.id}
                isPlaceholder={false}
              >
                {option?.name}
              </SelectOption>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="firewall-select" style={{ margin: '0 8px' }}>
            Select Panoramas Devices:
          </label>
          <Select
            id="firewall-select"
            variant={SelectVariant.single}
            onSelect={onSelecversion}
            onToggle={onToggleversion}
            isOpen={isopenversion}
            selections={selectedOption}
            placeholderText="Select a Panoramas Devices"
            width={250}
          >
            {gethostname.map((option, index) => (
              <SelectOption key={index} value={option} isPlaceholder={false}>
                {option}
              </SelectOption>
            ))}
          </Select>
        </div>
      </div>
      {selectedOption ? (
        <>
          <InnerScrollContainer>
            <TableComposable isTreeTable aria-label="Tree table">
              {isLoading ? (
                <Tr>
                  <Td
                    colSpan={2}
                    align={'center'}
                    style={{ display: 'flex', justifyContent: 'center' }}
                  >
                    <Spinner size="lg" />
                  </Td>
                </Tr>
              ) : getdata?.length > 0 ? (
                <>
                  <Thead>
                    <Tr>
                      <Th>{columnNames.name}</Th>
                      <Th>{columnNames.Firewall_Serial}</Th>
                      <Th>{columnNames.IP_Address}</Th>
                      <Th>{columnNames.Firewall_State}</Th>
                      <Th>{columnNames.Hapair_Status}</Th>
                      <Th>{columnNames.Threat_Version}</Th>
                      <Th>{columnNames.Software_Version}</Th>
                    </Tr>
                  </Thead>
                  <Tbody>{renderRows(pageData)}</Tbody>{' '}
                </>
              ) : (
                <TableComposable aria-label="Empty state table">
                  <Tbody>
                    <Tr>
                      <Td colSpan={8}>
                        <Bullseye>
                          <EmptyState variant={EmptyStateVariant.small}>
                            <EmptyStateIcon icon={CubesIcon} />
                            <Title headingLevel="h2" size="lg">
                              No Panoramas Found
                            </Title>
                            <EmptyStateBody>
                              Please add Panoramas to populate this list
                            </EmptyStateBody>
                          </EmptyState>
                        </Bullseye>
                      </Td>
                    </Tr>
                  </Tbody>
                </TableComposable>
              )}
            </TableComposable>
          </InnerScrollContainer>
          {/* Pagination */}
          {getdata?.length > 0 && (
            <Pagination
              itemCount={data.length}
              perPage={pageSize}
              page={currentPage}
              onSetPage={(_, page) => setCurrentPage(page)}
            />
          )}
        </>
      ) : (
        <TableComposable aria-label="Empty state table">
          <Tbody>
            <Tr>
              <Td colSpan={8}>
                <Bullseye>
                  <EmptyState variant={EmptyStateVariant.small}>
                    <EmptyStateIcon icon={CubesIcon} />
                    <Title headingLevel="h2" size="lg">
                      No Panoramas Found
                    </Title>
                    <EmptyStateBody>
                      Please add Panoramas to populate this list
                    </EmptyStateBody>
                  </EmptyState>
                </Bullseye>
              </Td>
            </Tr>
          </Tbody>
        </TableComposable>
      )}
      {/* <div style={{ display: 'flex', alignItems: 'center', padding: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '10px' }}>
          <label htmlFor="username" style={{ margin: '0 8px' }}>
            Username
          </label>
          <TextInput
            // value={username}
            type="text"
            onChange={(_event, value) =>
              setUsername(value?.currentTarget?.value)
            }
            aria-label="Enter Username"
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', padding: '10px' }}>
          <label htmlFor="password" style={{ margin: '0 8px' }}>
            Password
          </label>
          <TextInput
            // value={password}
            type="password"
            onChange={(_event, value) => {
              setPassword(value?.currentTarget?.value);
            }}
            aria-label="text input example with calendar icon"
          />
        </div>
      </div> */}
      <div style={{ paddingTop: '10px' }}>
        {selectedOption && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '10px',
              alignItems: 'center',
            }}
          >
            <div>
              <label htmlFor="firewall-select" style={{ margin: '0 8px' }}>
                Select Software Version:
              </label>
              <Select
                id="firewall-select"
                variant={SelectVariant.single}
                onSelect={onSelectsoftwareversion}
                onToggle={onTogglesoftwareversion}
                isOpen={isopensoftware_version}
                selections={software_version}
                placeholderText="Select a Version"
                width={250}
              >
                {version_info.map((option, index) => (
                  <SelectOption
                    key={index}
                    value={option}
                    isPlaceholder={false}
                  >
                    {option}
                  </SelectOption>
                ))}
              </Select>
            </div>
            <div>
              <Checkbox
                id="body-check-1"
                label="Enable MultiThread"
                isChecked={isChecked}
                onChange={handleCheckboxChange}
              />
            </div>
          </div>
        )}
      </div>
      <div
        style={{
          padding: '10px',
          width: '100%',
        }}
      >
        <Button onClick={handleSubmit}>Submit</Button>
      </div>
      <AceEditor
        mode="xml"
        readOnly={true}
        value={xmlContent}
        editorProps={{ $blockScrolling: true }}
        style={{ width: '100%', height: '500px' }}
      />
    </>
  );
};

export default ComposableTableTree;
