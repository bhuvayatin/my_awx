import React, { useEffect, useState, useCallback } from 'react';
import {
  TableComposable,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  TreeRowWrapper,
} from '@patternfly/react-table';
import {
  Bullseye,
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateVariant,
  Pagination,
  Select,
  SelectOption,
  SelectVariant,
  Title,
} from '@patternfly/react-core';
import LeafIcon from '@patternfly/react-icons/dist/esm/icons/leaf-icon';
import FolderIcon from '@patternfly/react-icons/dist/esm/icons/folder-icon';
import FolderOpenIcon from '@patternfly/react-icons/dist/esm/icons/folder-open-icon';
import { CubesIcon } from '@patternfly/react-icons';
import useRequest from 'hooks/useRequest';
import yaml from 'js-yaml';
import { TextInput } from '@patternfly/react-core';
import { InventoriesAPI } from 'api';

const ComposableTableTree = () => {
  const columnNames = {
    '@name': 'Name',
  };
  const pageSize = 10;
  // Static Data JSON
  const childdata = [
    {
      '@name': 'Worldwide Firewall',
      devices: {},
    },
    {
      '@name': 'Richardson_Corp',
      description: 'Palo Alto Firewalls Deployed in Richardson TX, USA.',
      devices: {
        entry: [
          {
            '@name': '013201004704',
          },
          {
            '@name': '013201004796',
          },
        ],
      },
    },
    {
      '@name': 'AMER Firewall',
      devices: {
        type: 'array',
      },
    },
    {
      '@name': 'Compellent_RVB',
      description: 'Compellent, Eden Prarie, MN ',
      devices: {
        entry: [
          {
            '@name': '013201005242',
          },
          {
            '@name': '013201005247',
          },
        ],
      },
    },
    {
      '@name': 'EMEA FireWall',
      devices: {},
    },
    {
      '@name': 'APAC Firewall',
      devices: {
        type: 'array',
      },
    },
    {
      '@name': 'Zurich Lab Firewall',
      description: 'DellEMC Zurich',
      devices: {},
    },
    {
      '@name': 'OKC_Internet_Breakout',
      description: 'OKC Internet Breakout FWs',
      devices: {
        entry: [
          {
            '@name': '016401011362',
          },
          {
            '@name': '016401011356',
          },
        ],
      },
    },
    {
      '@name': 'PS2_FAAS_Lab',
      description: 'PS2 FAAS Lab Internet Firewalls',
      devices: {
        type: 'array',
        entry: [
          {
            '@name': '010401007261',
          },
          {
            '@name': '010401007262',
          },
        ],
      },
    },
    {
      '@name': 'MEX_CSC_IWAN',
      description: {
        type: 'string',
        text: 'DMVPN FW Torre Mayor MX',
      },
      devices: {
        type: 'array',
        entry: [
          {
            '@name': '010401007481',
          },
        ],
      },
    },
    {
      '@name': 'Dublin_OH_PAFWIWAN',
      description: 'DMVPN Firewall Located in Dublin OH USA',
      devices: {},
    },
    {
      '@name': 'GBLON Internet Breakout',
      description: 'GreenField Site London Creechurch Lane',
      devices: {
        entry: [
          {
            '@name': '010401007175',
          },
          {
            '@name': '010401007187',
          },
        ],
      },
    },
    {
      '@name': 'Austin Cloud DMZ',
      description:
        'Firewall connection between Dell Corp and Cloud Providers: GCP, Azure and AWS',
      devices: {
        entry: [
          {
            '@name': '013101009509',
          },
          {
            '@name': '013101009567',
          },
          {
            '@name': '013101001019',
          },
          {
            '@name': '013101006335',
          },
        ],
      },
    },
    {
      '@name': 'Hyderabad BNPP',
      description: 'BNPP- Hyderabad ,India.',
      devices: {
        entry: [
          {
            '@name': '010401007370',
          },
          {
            '@name': '010401002270',
          },
        ],
      },
    },
    {
      '@name': 'Core Controller-EMC',
      description:
        'All firewalls used in the ring-fence core controller project for L-EMC sites only. L2 firewalls only.',
      devices: {},
    },
    {
      '@name': 'Apex_Core_Controller_MFG',
      description:
        'two PA 5250 in active-active using full template configuration',
      devices: {
        entry: [
          {
            '@name': '013101004270',
          },
          {
            '@name': '013101004254',
          },
        ],
      },
    },
    {
      '@name': 'Hopkinton Core Controller',
      description:
        'two PA 5250 in active-active using full template configuration',
      devices: {
        entry: [
          {
            '@name': '013101004298',
          },
          {
            '@name': '013101004300',
          },
        ],
      },
    },
    {
      '@name': 'Durham Cloud DMZ',
      description: 'Firewalls in Durham for Cloud DMZ',
      devices: {
        entry: [
          {
            '@name': '013101004392',
          },
          {
            '@name': '013101004433',
          },
        ],
      },
    },
    {
      '@name': 'Core Controller-DELL',
      description:
        'All firewalls used in the ring-fence core controller project for L-Dell sites only. L2 firewalls only.',
      devices: {},
    },
    {
      '@name': 'EMFP-Lodz_Core_Controller_MFG',
      description:
        'Two PA-5250 in active-active using full template configuration',
      devices: {
        entry: [
          {
            '@name': '013101004947',
          },
          {
            '@name': '013101004957',
          },
        ],
      },
    },
    {
      '@name': 'Franklin_Core_Controller_MFG',
      description:
        'Device Group for PA 5250 in active-active for Franklin Manufacturing',
      devices: {
        entry: [
          {
            '@name': '013101004074',
          },
          {
            '@name': '013101004258',
          },
        ],
      },
    },
    {
      '@name': 'Santa _Clara_Core_Controller',
      description:
        'twp PA 5250 in active-active using full template configuraiton',
      devices: {
        entry: [
          {
            '@name': '013101004173',
          },
          {
            '@name': '013101012353',
          },
        ],
      },
    },
    {
      '@name': 'Austin_PCI_Networks',
      description: 'Austin PCI Firewalls',
      devices: {
        entry: [
          {
            '@name': '013101004885',
          },
          {
            '@name': '013101001919',
          },
          {
            '@name': '013101006601',
          },
          {
            '@name': '013101005052',
          },
        ],
      },
    },
    {
      '@name': 'Halle_Corp',
      description: 'Halle Germany Internet Breakout',
      devices: {
        entry: [
          {
            '@name': '016401002788',
          },
          {
            '@name': '016401002814',
          },
        ],
      },
    },
    {
      '@name': 'PC1 PCF PCI POC',
      description: 'Proof of concept',
      devices: {
        entry: [
          {
            '@name': '015451000004707',
          },
          {
            '@name': '015451000004706',
          },
        ],
      },
    },
    {
      '@name': 'Azure-China-Internet-North',
      devices: {
        entry: [
          {
            '@name': '007257000068923',
          },
          {
            '@name': '007257000068919',
          },
        ],
      },
    },
    {
      '@name': 'Azure-China-MPLS-North',
      devices: {
        entry: [
          {
            '@name': '007257000068927',
          },
          {
            '@name': '007257000068933',
          },
        ],
      },
    },
    {
      '@name': 'Limerick_Corp',
      devices: {
        entry: [
          {
            '@name': '013201014119',
          },
          {
            '@name': '013201013474',
          },
        ],
      },
    },
    {
      '@name': 'Azure-China-Internet-East',
      devices: {
        entry: [
          {
            '@name': '007257000069464',
          },
          {
            '@name': '007257000069465',
          },
        ],
      },
    },
    {
      '@name': 'Azure-China-MPLS-East',
      devices: {
        entry: [
          {
            '@name': '007257000069458',
          },
          {
            '@name': '007257000069457',
          },
        ],
      },
    },
    {
      '@name': 'Austin_PS3_CORPE',
      description: 'Austin PS3 Corp External Firewalls',
      devices: {
        entry: [
          {
            '@name': '013201012467',
          },
          {
            '@name': '013201012613',
          },
        ],
      },
    },
    {
      '@name': 'OKC ProManage',
      description: 'Nashville Pro Manage Firewalls, Supporting Honeywell',
      devices: {
        entry: [
          {
            '@name': '016401011321',
          },
          {
            '@name': '016401011361',
          },
        ],
      },
    },
    {
      '@name': 'PS3 PCF PCI POC',
      description: 'Proof of Concept',
      devices: {
        entry: [
          {
            '@name': '015451000005135',
          },
          {
            '@name': '015451000005133',
          },
        ],
      },
    },
    {
      '@name': 'Austin-Dell-Aviation',
      devices: {},
    },
    {
      '@name': 'Bangalore ProManage',
      description: {
        type: 'string',
        text: 'Bangalore ProManage Firewalls, Supporting Honeywell',
      },
      devices: {
        type: 'array',
        entry: [
          {
            '@name': '016401003071',
          },
          {
            '@name': '016401003070',
          },
        ],
      },
    },
    {
      '@name': 'Casablanca ProManage',
      description: {
        type: 'string',
        text: 'Casablanca ProManage HoneyWell',
      },
      devices: {
        type: 'array',
        entry: [
          {
            '@name': '016401003004',
          },
          {
            '@name': '016401002957',
          },
        ],
      },
    },
    {
      '@name': 'Munich_Corp',
      description: {
        type: 'string',
        text: 'Munich Corporate Firewalls',
      },
      devices: {
        type: 'array',
        entry: [
          {
            '@name': '011901017445',
          },
          {
            '@name': '011901017719',
          },
        ],
      },
    },
    {
      '@name': 'Bucharest ProManage',
      description: 'Bucharest Honeywell',
      devices: {},
    },
    {
      '@name': 'Panama ProManage',
      description: 'Panama Pro Manage firewalls, supporting Honeywell',
      devices: {
        entry: [
          {
            '@name': '016401003063',
          },
          {
            '@name': '016401002843',
          },
        ],
      },
    },
    {
      '@name': 'Bratislava_Corp',
      description: 'Bratislava_Corp_PA_FW',
      devices: {
        entry: [
          {
            '@name': '016401002407',
          },
          {
            '@name': '016401002401',
          },
        ],
      },
    },
    {
      '@name': 'Dalian ProManage',
      devices: {
        type: 'array',
        entry: [
          {
            '@name': '016401002986',
          },
          {
            '@name': '016401002784',
          },
        ],
      },
    },
    {
      '@name': 'Gurgaon ProManage',
      description: 'Gurgaon ProManage Honeywell',
      devices: {
        entry: [
          {
            '@name': '016401003074',
          },
          {
            '@name': '016401003075',
          },
        ],
      },
    },
    {
      '@name': 'Limerick_ICORP',
      devices: {
        entry: [
          {
            '@name': '016401002408',
          },
          {
            '@name': '016401002813',
          },
        ],
      },
    },
    {
      '@name': 'Montpellier_Corp',
      description: 'Montpellier corp firewalls',
      devices: {
        entry: [
          {
            '@name': '016401002786',
          },
          {
            '@name': '016401002385',
          },
        ],
      },
    },
    {
      '@name': 'Limerick_Ecomm',
      devices: {
        entry: [
          {
            '@name': '016401002753',
          },
          {
            '@name': '016401002402',
          },
        ],
      },
    },
    {
      '@name': 'Cherrywood_Corp',
      devices: {
        type: 'array',
        entry: [
          {
            '@name': '016401002403',
          },
          {
            '@name': '016401002399',
          },
        ],
      },
    },
    {
      '@name': 'Austin_PS3_CORPI',
      description: 'Austin PS3 Corp Internal Firewalls',
      devices: {
        entry: [
          {
            '@name': '013101004839',
          },
          {
            '@name': '013101005647',
          },
        ],
      },
    },
    {
      '@name': 'PS3_MDC_DMZ_DEV',
      description: {
        type: 'string',
        text: 'PS3 MDC Dev firewalls ',
      },
      devices: {
        type: 'array',
        entry: [
          {
            '@name': '013101006400',
          },
          {
            '@name': '013101006404',
          },
        ],
      },
    },
    {
      '@name': 'Austin_PCI_IAAS',
      description:
        'PCI Infrastructure as a Service (PC1, PS3) - Virtual Palo Alto VM-500s',
      devices: {
        entry: [
          {
            '@name': '015451000006294',
          },
          {
            '@name': '015451000006293',
          },
          {
            '@name': '015451000006283',
          },
          {
            '@name': '015451000006284',
          },
        ],
      },
    },
    {
      '@name': 'SaoPaulo_Corp',
      description: {
        type: 'string',
        text: 'Sao Paulo Brazil Corporate Firewalls',
      },
      devices: {
        type: 'array',
        entry: [
          {
            '@name': '016201009682',
          },
          {
            '@name': '016201009722',
          },
        ],
      },
    },
    {
      '@name': 'SaoPaulo_IWAN',
      devices: {
        entry: [
          {
            '@name': '010401008178',
          },
        ],
      },
    },
    {
      '@name': 'Argentina Corp',
      devices: {
        entry: [
          {
            '@name': '016201021587',
          },
          {
            '@name': '016201006170',
          },
        ],
      },
    },
    {
      '@name': 'Austin_PC1_CORPE',
      description: 'Austin PC1 Corp External Firewalls',
      devices: {
        entry: [
          {
            '@name': '013201012460',
          },
          {
            '@name': '013201001433',
          },
        ],
      },
    },
    {
      '@name': 'Austin_PC1_CORPI',
      description: 'Austin PC1 Corp Internal Firewalls',
      devices: {
        entry: [
          {
            '@name': '013101005538',
          },
          {
            '@name': '013101010350',
          },
        ],
      },
    },
    {
      '@name': 'Durham_MDC_DMZ',
      description: 'Durham MDC DMZ Firewalls',
      devices: {
        entry: [
          {
            '@name': '013101006389',
          },
          {
            '@name': '013101004644',
          },
        ],
      },
    },
    {
      '@name': 'Xiamen_Corp',
      description: 'Xiamen Corp Firewalls',
      devices: {
        entry: [
          {
            '@name': '013101001574',
          },
          {
            '@name': '013101004918',
          },
        ],
      },
    },
    {
      '@name': 'Austin_IPv6_Ecom',
      description: 'Device Group for IPv6 Ecom firewalls in Austin DCs',
      devices: {
        entry: [
          {
            '@name': '013201011980',
          },
          {
            '@name': '013201012017',
          },
          {
            '@name': '013201011773',
          },
          {
            '@name': '013201011987',
          },
        ],
      },
    },
    {
      '@name': 'Bangalore_Dell4_Corp',
      description: 'Bangalore 4 Corp Firewall',
      devices: {
        entry: [
          {
            '@name': '013101009290',
          },
          {
            '@name': '013101009288',
          },
        ],
      },
    },
    {
      '@name': 'Cyberjaya_Corp',
      description: 'Cyberjaya Corp Firewalls',
      devices: {
        entry: [
          {
            '@name': '013101004777',
          },
          {
            '@name': '013101004842',
          },
        ],
      },
    },
    {
      '@name': 'EMF1-Lim Core Contoller',
      description: {
        type: 'string',
        text: 'Two PA-5250 in active-active using full template configuration',
      },
      devices: {
        type: 'array',
        entry: [
          {
            '@name': '013101004713',
          },
          {
            '@name': '013101004695',
          },
        ],
      },
    },
    {
      '@name': 'Austin_OSP',
      description: {
        type: 'string',
        text: 'Citrix to Horizon',
      },
      devices: {
        type: 'array',
        entry: [
          {
            '@name': '013101008363',
          },
          {
            '@name': '013101008371',
          },
          {
            '@name': '013101008664',
          },
          {
            '@name': '013101008587',
          },
        ],
      },
    },
    {
      '@name': 'APCC1_Core_Controller',
      description: 'APCC1, Penang',
      devices: {
        entry: [
          {
            '@name': '013101004778',
          },
          {
            '@name': '013101004782',
          },
        ],
      },
    },
    {
      '@name': 'Cork_Core_Controller_MFG',
      description:
        'Two PA-5250 in active-active using full template configuration',
      devices: {
        entry: [
          {
            '@name': '013101004911',
          },
          {
            '@name': '013101004907',
          },
        ],
      },
    },
    {
      '@name': 'CCC4_Core_Controller_MFG',
      description: 'CCC4 Xiamen China',
      devices: {
        entry: [
          {
            '@name': '013101004780',
          },
          {
            '@name': '013101004789',
          },
        ],
      },
    },
    {
      '@name': 'CCC2_Core_Controller_MFG',
      description: 'CCC2 Xiamen China',
      devices: {
        entry: [
          {
            '@name': '013101009347',
          },
          {
            '@name': '013101009333',
          },
        ],
      },
    },
    {
      '@name': 'KUL_Core_Controller',
      description: 'Cyberjaya Kuala Lumpur',
      devices: {
        entry: [
          {
            '@name': '013101009142',
          },
          {
            '@name': '013101009169',
          },
        ],
      },
    },
    {
      '@name': 'IDS_Global',
      description: 'Global Device Group for IDS TAP Mode Palo Altos ',
      devices: {},
    },
    {
      '@name': 'RTP_IDS',
      description: {
        type: 'string',
        text: 'Device group for RTP North Carolina IDS TAP Mode',
      },
      devices: {
        type: 'array',
        entry: [
          {
            '@name': '013101009270',
          },
        ],
      },
    },
    {
      '@name': 'APCC2_Core_Controller_MFG',
      description: 'APCC2, Penang',
      devices: {
        entry: [
          {
            '@name': '013101004566',
          },
          {
            '@name': '013101011147',
          },
        ],
      },
    },
    {
      '@name': 'CCC6_Core_Controller_MFG',
      description: 'CCC6 Xiamen China',
      devices: {
        entry: [
          {
            '@name': '013101015796',
          },
          {
            '@name': '013101004861',
          },
        ],
      },
    },
    {
      '@name': 'BGL6_IDS',
      description: {
        type: 'string',
        text: 'Device group for Bangalore-6 IDS TAP Mode',
      },
      devices: {
        type: 'array',
        entry: [
          {
            '@name': '013101009943',
          },
        ],
      },
    },
    {
      '@name': 'Austin_DDC_INET_SVCS',
      description: 'PKS/DTC/SRS DMZ PC1 and PS3 Firewalls',
      devices: {
        entry: [
          {
            '@name': '015701001382',
          },
          {
            '@name': '015701001383',
          },
          {
            '@name': '015701001381',
          },
          {
            '@name': '015701001380',
          },
        ],
      },
    },
    {
      '@name': 'Austin_IPV6_INET_SVCS',
      description: 'Device Group for IPv6 PC1 and PS3 Inet Services Firewalls',
      devices: {
        entry: [
          {
            '@name': '013101010750',
          },
          {
            '@name': '013101010755',
          },
          {
            '@name': '013101010638',
          },
          {
            '@name': '013101010650',
          },
        ],
      },
    },
    {
      '@name': 'Durham_IPV6_INET_SVCS',
      description: 'Durham IPv6 Firewall for SRS Deployment',
      devices: {
        entry: [
          {
            '@name': '013101010578',
          },
          {
            '@name': '013101010691',
          },
        ],
      },
    },
    {
      '@name': 'Japan_Extranet',
      devices: {
        type: 'array',
      },
    },
    {
      '@name': 'Austin_ST1',
      description: 'Device Group for STI PAW VPN OOB Firewalls',
      devices: {
        entry: [
          {
            '@name': '016401009022',
          },
          {
            '@name': '016401009014',
          },
        ],
      },
    },
    {
      '@name': 'Austin_ECOM_Inside',
      description: 'Device Group for Austin ECOM PS3 and PC1 Firewalls',
      devices: {
        entry: [
          {
            '@name': '015701001455',
          },
          {
            '@name': '015701001452',
          },
          {
            '@name': '015701001450',
          },
          {
            '@name': '015701001461',
          },
        ],
      },
    },
    {
      '@name': 'Austin_ECOM_Outside',
      description: 'Device Group for Austin ECOM PS3 and PC1 Firewalls',
      devices: {
        entry: [
          {
            '@name': '015701001457',
          },
          {
            '@name': '015701001453',
          },
          {
            '@name': '015701001437',
          },
          {
            '@name': '015701001448',
          },
        ],
      },
    },
    {
      '@name': 'Hopkinton_Experience_Lounge',
      description:
        'Device group for Hop04 Experience Lounge Contact:  Andrew Garcia andrew.garcia2dell.com Chandler Beacham chandler_beachamdell.com',
      devices: {
        entry: [
          {
            '@name': '016401009721',
          },
          {
            '@name': '016401009688',
          },
        ],
      },
    },
    {
      '@name': 'Franklin_IDS',
      description: {
        type: 'string',
        text: 'Device Group for Franklin IDS TAP Mode',
      },
      devices: {
        type: 'array',
        entry: [
          {
            '@name': '012501006701',
          },
        ],
      },
    },
    {
      '@name': 'Austin_Default',
      description: 'Device Group for Austin Default Firewalls',
      devices: {
        entry: [
          {
            '@name': '013101008374',
          },
          {
            '@name': '013101008373',
          },
        ],
      },
    },
    {
      '@name': 'Durham_IDS',
      description: {
        type: 'string',
        text: 'Device Group for Durham IDS TAP Mode',
      },
      devices: {
        type: 'array',
        entry: [
          {
            '@name': '012501006857',
          },
        ],
      },
    },
    {
      '@name': 'SantaClara_IDS',
      description: {
        type: 'string',
        text: 'Device Group for Santa Clara IDS TAP Mode',
      },
      devices: {
        type: 'array',
        entry: [
          {
            '@name': '013201024454',
          },
        ],
      },
    },
    {
      '@name': 'Durham_Secure_Cabinet',
      description: 'CyberSecurity Isolation Firewall',
      devices: {
        entry: [
          {
            '@name': '016201027174',
          },
          {
            '@name': '016201027171',
          },
        ],
      },
    },
    {
      '@name': 'Global_User_ID',
      description: 'Device Group for all USER_ID Hub Firewalls',
      devices: {
        entry: [
          {
            '@name': '007951000170928',
          },
          {
            '@name': '007951000171110',
          },
          {
            '@name': '007951000170930',
          },
          {
            '@name': '007951000170931',
          },
          {
            '@name': '015451000029695',
          },
          {
            '@name': '015451000029696',
          },
        ],
      },
    },
    {
      '@name': 'Austin_Extranet',
      description: 'Device Group for Austin Extranet Firewalls',
      devices: {
        entry: [
          {
            '@name': '015701001428',
          },
          {
            '@name': '015701001427',
          },
          {
            '@name': '015701001417',
          },
          {
            '@name': '015701001430',
          },
        ],
      },
    },
    {
      '@name': 'Hopkinton_2_IDS',
      description: 'Device Group for Hopkinton 2nd IDS Tap Mode',
      devices: {
        entry: [
          {
            '@name': '016401009035',
          },
        ],
      },
    },
    {
      '@name': 'Durham_Core',
      description: 'Durham DMZ inside',
      devices: {
        entry: [
          {
            '@name': '012501007205',
          },
          {
            '@name': '012501006994',
          },
        ],
      },
    },
    {
      '@name': 'Durham_Inet',
      description: 'Durham DMZ Outside',
      devices: {
        entry: [
          {
            '@name': '012501007263',
          },
          {
            '@name': '012501007285',
          },
        ],
      },
    },
    {
      '@name': 'Durham_Default',
      description: {
        type: 'string',
        text: 'Durham default path to the internet ',
      },
      devices: {
        type: 'array',
        entry: [
          {
            '@name': '013101012044',
          },
          {
            '@name': '013101012033',
          },
        ],
      },
    },
    {
      '@name': 'Singapore_Default',
      devices: {
        entry: [
          {
            '@name': '016401009948',
          },
          {
            '@name': '016401010060',
          },
        ],
      },
    },
    {
      '@name': 'Japan_Corp',
      devices: {
        type: 'array',
        entry: [
          {
            '@name': '013201024827',
          },
          {
            '@name': '013201024339',
          },
        ],
      },
    },
    {
      '@name': 'Hopkinton_1_IDS',
      description: {
        type: 'string',
        text: 'Device group for Hokinton 1 IDS TAP Mode',
      },
      devices: {
        type: 'array',
        entry: [
          {
            '@name': '013201026859',
          },
        ],
      },
    },
    {
      '@name': 'Singapore_Corp',
      description: {
        type: 'string',
        text: 'Singapore Core and Inet',
      },
      devices: {
        type: 'array',
        entry: [
          {
            '@name': '013201025536',
          },
          {
            '@name': '013201025532',
          },
        ],
      },
    },
    {
      '@name': 'Las_Vegas_Core_Controllers',
      description: 'Firewalls for Las Vegas Colo Location',
      devices: {
        entry: [
          {
            '@name': '015701001708',
          },
          {
            '@name': '015701001709',
          },
        ],
      },
    },
    {
      '@name': 'Durham_Citrix',
      description: 'Durham Citrix',
      devices: {
        entry: [
          {
            '@name': '016401010195',
          },
          {
            '@name': '016401010227',
          },
        ],
      },
    },
    {
      '@name': 'Atlanta_Core_Controllers',
      description: 'Firewalls for Atlanta Colo location',
      devices: {
        entry: [
          {
            '@name': '015701001670',
          },
          {
            '@name': '015701001662',
          },
        ],
      },
    },
    {
      '@name': 'Sydney_Core',
      devices: {},
    },
    {
      '@name': 'Austin_DellFI',
      description: {
        type: 'string',
        text: 'Device Group for Austin Dell FI Wireless Firewalls',
      },
      devices: {
        type: 'array',
        entry: [
          {
            '@name': '016401009082',
          },
          {
            '@name': '016401009099',
          },
        ],
      },
    },
    {
      '@name': 'Austin_Experience_Lounge',
      description:
        'Device Group for Austin Experience Lounge Firewalls Contact:  Andrew Garcia andrew.garcia2dell.com Chandler Beacham chandler_beachamdell.com',
      devices: {
        entry: [
          {
            '@name': '016401009116',
          },
          {
            '@name': '016401009013',
          },
        ],
      },
      'reference-templates': {
        member: ['FW_auspc1pafwexplounge'],
      },
    },
    {
      '@name': 'INBAN17_INET',
      devices: {
        type: 'array',
        entry: [
          {
            '@name': '016401010010',
          },
          {
            '@name': '016401010054',
          },
        ],
      },
    },
    {
      '@name': 'Santa_Clara_Core',
      description: {
        type: 'string',
        text: 'Santa Clara Core Firewalls',
      },
      devices: {
        type: 'array',
        entry: [
          {
            '@name': '012501007766',
          },
          {
            '@name': '012501007790',
          },
        ],
      },
    },
    {
      '@name': 'Santa_Clara_Inet',
      description: {
        type: 'string',
        text: 'Santa Clara Inet Firewalls',
      },
      devices: {
        type: 'array',
        entry: [
          {
            '@name': '012501007793',
          },
          {
            '@name': '012501007795',
          },
        ],
      },
    },
    {
      '@name': 'Santa_Clara_Default',
      description: 'Santa Clara Default Firewalls',
      devices: {
        entry: [
          {
            '@name': '012501007798',
          },
          {
            '@name': '012501001169',
          },
        ],
      },
    },
    {
      '@name': 'INBAN17_Core',
      devices: {
        entry: [
          {
            '@name': '016401010047',
          },
          {
            '@name': '016401010024',
          },
        ],
      },
    },
    {
      '@name': 'GCP_Brazil_Default',
      description: {
        type: 'string',
        text: 'Device Group for GCP southamerica-east1 (saea1) Brazil Firewalls',
      },
      devices: {
        type: 'array',
        entry: [
          {
            '@name': '007958000200150',
          },
          {
            '@name': '007958000204267',
          },
        ],
      },
    },
    {
      '@name': 'Cork_Default',
      description: 'Cork Default Firewalls',
      devices: {
        entry: [
          {
            '@name': '013101011908',
          },
          {
            '@name': '013101011904',
          },
        ],
      },
    },
    {
      '@name': 'Cork_Core',
      description: 'Cork DMZ Core Firewalls',
      devices: {
        entry: [
          {
            '@name': '016401010043',
          },
          {
            '@name': '016401010166',
          },
        ],
      },
    },
    {
      '@name': 'Cork_Inet',
      description: {
        type: 'string',
        text: 'Cork DMZ Inet Firewalls',
      },
      devices: {
        type: 'array',
        entry: [
          {
            '@name': '016401010187',
          },
          {
            '@name': '016401010037',
          },
        ],
      },
    },
    {
      '@name': 'GCP_US_EAST_Default',
      description:
        'GCP firewalls for US EAST Virginia region. us-east4 (eaus4)',
      devices: {
        entry: [
          {
            '@name': '007958000216333',
          },
          {
            '@name': '007958000217002',
          },
        ],
      },
    },
    {
      '@name': 'EMC_Dellfi',
      devices: {
        entry: [
          {
            '@name': '016401010198',
          },
          {
            '@name': '016401010176',
          },
          {
            '@name': '016401010603',
          },
          {
            '@name': '016401010604',
          },
          {
            '@name': '013201024144',
          },
          {
            '@name': '013201024145',
          },
          {
            '@name': '016401013261',
          },
          {
            '@name': '016401013135',
          },
        ],
      },
    },
    {
      '@name': 'Austin_PS3_EDUNET',
      devices: {
        type: 'array',
        entry: [
          {
            '@name': '016401011871',
          },
          {
            '@name': '016401011881',
          },
        ],
      },
    },
    {
      '@name': 'Dublin_EDDTMS_Inet',
      description: 'DTMS ED datacenter external FWs',
      devices: {
        entry: [
          {
            '@name': '013101013715',
          },
          {
            '@name': '013101013709',
          },
        ],
      },
    },
    {
      '@name': 'Dublin_EDDTMS_Core',
      description: 'DTMS ED datacenter core FWs',
      devices: {
        entry: [
          {
            '@name': '013101013664',
          },
          {
            '@name': '013101013723',
          },
        ],
      },
    },
    {
      '@name': 'Franklin_EDUNET',
      devices: {
        entry: [
          {
            '@name': '016401011466',
          },
          {
            '@name': '016401011849',
          },
        ],
      },
    },
    {
      '@name': 'ICC1_Core_Controller_MFG',
      description: 'India, ICC',
      devices: {
        entry: [
          {
            '@name': '013101004790',
          },
          {
            '@name': '013101004742',
          },
        ],
      },
    },
    {
      '@name': 'GCP_India_Default',
      description: 'GCP Firewalls for asia-south-1 India Location',
      devices: {
        entry: [
          {
            '@name': '007958000231446',
          },
          {
            '@name': '007958000231447',
          },
        ],
      },
    },
    {
      '@name': 'Frankfurt_EDUNET',
      description: 'Frankfurt EDUNET Firewalls',
      devices: {
        entry: [
          {
            '@name': '013201028609',
          },
          {
            '@name': '013201028605',
          },
        ],
      },
    },
    {
      '@name': 'Atlanta_ECOM',
      description: 'Device Group for Atlanta LHS Switch Colo Ecom Firewalls',
      devices: {
        entry: [
          {
            '@name': '015701001669',
          },
          {
            '@name': '015701001668',
          },
        ],
      },
    },
    {
      '@name': 'BRH_Core_Controler_MFG',
      devices: {
        entry: [
          {
            '@name': '013101004553',
          },
          {
            '@name': '013101004564',
          },
        ],
      },
    },
    {
      '@name': 'Penang_EDUNET',
      devices: {
        entry: [
          {
            '@name': '016401012346',
          },
          {
            '@name': '016401012550',
          },
        ],
      },
    },
    {
      '@name': 'Las_Vegas_ECOM',
      description: {
        type: 'string',
        text: 'Device Group for Las Vegas Ecom Firewalls',
      },
      devices: {
        type: 'array',
        entry: [
          {
            '@name': '015701001707',
          },
          {
            '@name': '015701001710',
          },
        ],
      },
    },
    {
      '@name': 'GCP_EMEA_West_Default',
      description: {
        type: 'string',
        text: 'GCP firewalls for EMEA West region. eu-west2 (euw2)',
      },
      devices: {
        type: 'array',
        entry: [
          {
            '@name': '007958000260655',
          },
          {
            '@name': '007958000260678',
          },
        ],
      },
    },
    {
      '@name': 'ODM_Juarez_Foxconn',
      description: {
        type: 'string',
        text: 'Device Group for the ODM firewalls at Juarez Foxconn Manufacturing ',
      },
      devices: {
        type: 'array',
        entry: [
          {
            '@name': '016401012747',
          },
          {
            '@name': '016401012469',
          },
        ],
      },
    },
    {
      '@name': 'Dubai_Corp',
      devices: {
        entry: [
          {
            '@name': '016401011944',
          },
          {
            '@name': '016401011939',
          },
        ],
      },
    },
    {
      '@name': 'Austin Bank Segmentation',
      description: {
        type: 'string',
        text: 'PS3 and PC1 Bank firewalls',
      },
      devices: {
        type: 'array',
        entry: [
          {
            '@name': '013101014290',
          },
          {
            '@name': '013101014100',
          },
          {
            '@name': '013101014072',
          },
          {
            '@name': '013101014073',
          },
        ],
      },
    },
    {
      '@name': 'Bangalore_Outbound',
      description: 'Bangalore 6 Outbound L-EMC Firewall',
      devices: {
        entry: [
          {
            '@name': '013101004779',
          },
          {
            '@name': '013101004775',
          },
        ],
      },
    },
    {
      '@name': 'Cork_IDS',
      description: {
        type: 'string',
        text: 'Device Group for Cork IDS TAP Mode',
      },
      devices: {
        type: 'array',
        entry: [
          {
            '@name': '013201028772',
          },
        ],
      },
    },
    {
      '@name': 'Cork_DellFI',
      description: 'Device Group for Cork Wifi',
      devices: {},
    },
    {
      '@name': 'EMFP_Corp',
      devices: {
        entry: [
          {
            '@name': '016401002993',
          },
          {
            '@name': '016401002985',
          },
        ],
      },
    },
    {
      '@name': 'Herzliya_IDS',
      description: 'Device Group for Herzliya IDS TAP Mode',
      devices: {
        entry: [
          {
            '@name': '016401012030',
          },
        ],
      },
    },
    {
      '@name': 'Herzilya_kasha_Payroll',
      description: {
        type: 'string',
        text: 'Herzilya Kasha Payroll firewall',
      },
      devices: {
        type: 'array',
        entry: [
          {
            '@name': '011901046457',
          },
          {
            '@name': '011901046517',
          },
        ],
      },
    },
    {
      '@name': 'SwitchColo_DDC_INET_AaS',
      description:
        'Switch Colo DDC Internet Services, Customer Hosting, SRS, ETC, for Atlanta and Las Vegas Colo. As A Service for Internet hosting devices',
      devices: {
        entry: [
          {
            '@name': '015701001666',
          },
          {
            '@name': '015701001665',
          },
          {
            '@name': '015701001706',
          },
          {
            '@name': '015701001697',
          },
        ],
      },
      'reference-templates': {
        member: ['FW_uslhspafwinetsvcddc', 'FW_uslaspafwinetsvcddc'],
      },
    },
    {
      '@name': 'Singapore_IDS',
      devices: {
        entry: [
          {
            '@name': '016401011643',
          },
        ],
      },
    },
    {
      '@name': 'Sydney_Default',
      description: 'Sydney Outbound EMC',
      devices: {
        entry: [
          {
            '@name': '016401009697',
          },
        ],
      },
    },
    {
      '@name': 'Azure_SouthCentralUS_Default',
      devices: {
        entry: [
          {
            '@name': '007957000287736',
          },
          {
            '@name': '007957000289899',
          },
          {
            '@name': '007957000300333',
          },
          {
            '@name': '007957000300338',
          },
        ],
      },
    },
    {
      '@name': 'Hopkinton_Core',
      description: 'Hopkinton Core DMZ firewall',
      devices: {
        entry: [
          {
            '@name': '012501007957',
          },
          {
            '@name': '012501007774',
          },
        ],
      },
    },
    {
      '@name': 'Franklin_Default',
      description: 'franklin Default outbound',
      devices: {
        entry: [
          {
            '@name': '012501008393',
          },
          {
            '@name': '012501008389',
          },
        ],
      },
    },
    {
      '@name': 'SwitchColo_Shared_Services_DMZ',
      description:
        'Device Group for Switch Colo Data Centers for the Shared/Foundational Services DMZ',
      devices: {
        entry: [
          {
            '@name': '015701001691',
          },
          {
            '@name': '015701001711',
          },
          {
            '@name': '015701001672',
          },
          {
            '@name': '015701001677',
          },
        ],
      },
      'reference-templates': {
        member: ['FW_uslaspafwfsz'],
      },
    },
    {
      '@name': 'Hopkinton_Inet',
      description: 'Hopkinton internet DMZ',
      devices: {
        entry: [
          {
            '@name': '016401011681',
          },
          {
            '@name': '016401011698',
          },
        ],
      },
    },
    {
      '@name': 'SwitchColo_Default',
      description: 'Device Group for Switch Colo Default Corp DMZ Firewalls',
      devices: {
        entry: [
          {
            '@name': '019901001405',
          },
          {
            '@name': '019901001400',
          },
          {
            '@name': '019901001297',
          },
          {
            '@name': '019901001386',
          },
        ],
      },
      'reference-templates': {
        member: ['FW_uslhspafwdefaultsw'],
      },
    },
    {
      '@name': 'HOP_UDDTMS_CORE',
      description: 'DTMS UD datacenter core FWs',
      devices: {
        entry: [
          {
            '@name': '013201021827',
          },
          {
            '@name': '013201028522',
          },
        ],
      },
    },
    {
      '@name': 'HOP_UDDTMS_INET',
      description: 'DTMS UD datacenter external FWs',
      devices: {
        entry: [
          {
            '@name': '013201021821',
          },
          {
            '@name': '013201034489',
          },
        ],
      },
    },
    {
      '@name': 'HOP_UDDTMS176_CORE',
      description: {
        type: 'string',
        text: 'DTMS 176 UD datacenter core FWs',
      },
      devices: {
        type: 'array',
        entry: [
          {
            '@name': '013101013481',
          },
          {
            '@name': '013101013613',
          },
        ],
      },
    },
    {
      '@name': 'HOP_UDDTMS176_INET',
      description: 'DTMS 176 UD datacenter external FWs',
      devices: {
        entry: [
          {
            '@name': '013101013108',
          },
          {
            '@name': '013101013504',
          },
        ],
      },
    },
    {
      '@name': 'SwitchColo_Extranet',
      description:
        'Device Group for Las Vegas (LAS) and ATL (LHS) Extranet Firewalls',
      devices: {
        entry: [
          {
            '@name': '013201024189',
          },
          {
            '@name': '013201024699',
          },
          {
            '@name': '013201024819',
          },
          {
            '@name': '013201024828',
          },
        ],
      },
      'reference-templates': {
        member: ['FW_uslaspafwextranetsw'],
      },
    },
    {
      '@name': 'Franklin_DC_Core_Controller',
      description: {
        type: 'string',
        text: 'Franklin DC Core Controller',
      },
      devices: {
        type: 'array',
        entry: [
          {
            '@name': '013101014016',
          },
          {
            '@name': '013101013997',
          },
        ],
      },
    },
    {
      '@name': 'Santa_Clara_Dellfi',
      description: 'Santa Clara Dellfi Wireless 5450',
      devices: {
        entry: [
          {
            '@name': '016401012871',
          },
          {
            '@name': '016401013662',
          },
        ],
      },
    },
    {
      '@name': 'Austin_PS3_Services_External',
      description: {
        type: 'string',
        text: 'Austin PS3 services external firewalls',
      },
      devices: {
        type: 'array',
        entry: [
          {
            '@name': '013101014126',
          },
          {
            '@name': '013101014128',
          },
        ],
      },
    },
    {
      '@name': 'Sydney_Outbound',
      description: 'AUSYDPAFWDEF Chatswood',
      devices: {
        entry: [
          {
            '@name': '013101014159',
          },
          {
            '@name': '013101014075',
          },
        ],
      },
    },
    {
      '@name': 'Sydney_Corp',
      devices: {
        entry: [
          {
            '@name': '016401009768',
          },
          {
            '@name': '016401009742',
          },
        ],
      },
    },
    {
      '@name': 'Austin_PS3_PKI',
      devices: {
        type: 'array',
        entry: [
          {
            '@name': '012501009610',
          },
          {
            '@name': '012501008466',
          },
        ],
      },
      'reference-templates': {
        type: 'array',
        member: [
          {
            type: 'string',
            text: 'FW_usaps3pafwpki',
          },
        ],
      },
    },
    {
      '@name': 'Austin_PC1_PKI',
      description: 'Austin PC1 PKI Firewalls',
      devices: {
        entry: [
          {
            '@name': '012501008418',
          },
          {
            '@name': '012501008467',
          },
        ],
      },
      'reference-templates': {
        member: ['FW_usapc1pafwpki'],
      },
    },
    {
      '@name': 'Austin_PS3_Services_Internal',
      description: 'Austin PS3 Services Internal Firewalls',
      devices: {
        entry: [
          {
            '@name': '013101014149',
          },
          {
            '@name': '013101014076',
          },
        ],
      },
      'reference-templates': {
        member: ['FW_usaps3pafwsvci'],
      },
    },
    {
      '@name': 'Johannesburg_Corp',
      description: {
        type: 'string',
        text: 'Johannesburg Corp Firewalls',
      },
      devices: {
        type: 'array',
        entry: [
          {
            '@name': '016401014111',
          },
          {
            '@name': '016401014078',
          },
        ],
      },
    },
    {
      '@name': 'Xiamen_Ecom',
      description: {
        type: 'string',
        text: 'Xiamen Ecom Firewall',
      },
      devices: {
        type: 'array',
        entry: [
          {
            '@name': '013201032028',
          },
          {
            '@name': '013201032003',
          },
        ],
      },
    },
    {
      '@name': 'Xiamen_Extranet',
      description: {
        type: 'string',
        text: 'Xiamen Extranet Firewall',
      },
      devices: {
        type: 'array',
        entry: [
          {
            '@name': '013201032016',
          },
          {
            '@name': '013201032018',
          },
        ],
      },
    },
    {
      '@name': 'Austin_DATASEG',
      description: 'Austin PC1 & PS3 Data Segmentation',
      devices: {
        entry: [
          {
            '@name': '013101015208',
          },
          {
            '@name': '013101015025',
          },
          {
            '@name': '013101015119',
          },
          {
            '@name': '013101015236',
          },
        ],
      },
      'reference-templates': {
        member: ['FW_usaps3pafwdataseg', 'FW_usapc1pafwdataseg'],
      },
    },
    {
      '@name': 'Casablanca_Corp',
      description: {
        type: 'string',
        text: 'Casablanca Corp Firewalls',
      },
      devices: {
        type: 'array',
        entry: [
          {
            '@name': '016401014663',
          },
          {
            '@name': '016401014783',
          },
        ],
      },
    },
    {
      '@name': 'CCC4_IWAN',
      devices: {
        type: 'array',
        entry: [
          {
            '@name': '013201034471',
          },
        ],
      },
    },
    {
      '@name': 'Beijing_Corp',
      devices: {
        type: 'array',
        entry: [
          {
            '@name': '013101014580',
          },
          {
            '@name': '013101014784',
          },
        ],
      },
    },
    {
      '@name': 'SwitchColo_PCI_Networks',
      description:
        'Device Group For Switch Colo -Atlanta - Las Vegas - PCI Networks',
      devices: {
        entry: [
          {
            '@name': '024401000689',
          },
          {
            '@name': '024401000652',
          },
          {
            '@name': '024401000679',
          },
          {
            '@name': '024401000628',
          },
        ],
      },
    },
    {
      '@name': 'Penang_CORP',
      description: 'Penang Corp Firewalls',
      devices: {
        entry: [
          {
            '@name': '016401014634',
          },
          {
            '@name': '016401014836',
          },
        ],
      },
    },
    {
      '@name': 'Penang ECOM',
      description: 'Penang ECOM Firewalls',
      devices: {
        entry: [
          {
            '@name': '013201032863',
          },
          {
            '@name': '013201032900',
          },
        ],
      },
    },
    {
      '@name': 'MYBMT_Corp',
      description: 'APCC2 Corp Firewalls',
      devices: {
        entry: [
          {
            '@name': '016401014827',
          },
          {
            '@name': '016401014839',
          },
        ],
      },
    },
    {
      '@name': 'Penang_Extranet',
      description: {
        type: 'string',
        text: 'Penang_Extranet_Firewalls',
      },
      devices: {
        type: 'array',
        entry: [
          {
            '@name': '013201032834',
          },
          {
            '@name': '013201032848',
          },
        ],
      },
    },
    {
      '@name': 'Cyberjaya_DellFI',
      description: 'Device Group for Cyberjaya DellFi Wireless Firewall',
      devices: {
        entry: [
          {
            '@name': '013201032437',
          },
          {
            '@name': '013201032442',
          },
        ],
      },
    },
    {
      '@name': 'APCC1_Extranet',
      description: {
        type: 'string',
        text: 'APCC1 Extranet firewall',
      },
      devices: {
        type: 'array',
        entry: [
          {
            '@name': '016401014819',
          },
          {
            '@name': '016401014808',
          },
        ],
      },
    },
    {
      '@name': 'APCC2_IWAN',
      devices: {
        entry: [
          {
            '@name': '013201032717',
          },
        ],
      },
    },
    {
      '@name': 'Penang_CORP01',
      description: 'Penang Corporate FWs',
      devices: {
        entry: [
          {
            '@name': '013201032871',
          },
          {
            '@name': '013201032868',
          },
        ],
      },
    },
    {
      '@name': 'Taipei_Corp',
      description: {
        type: 'string',
        text: 'Taipei Corp Firewalls',
      },
      devices: {
        type: 'array',
        entry: [
          {
            '@name': '013201031807',
          },
          {
            '@name': '013201031694',
          },
        ],
      },
    },
    {
      '@name': 'Mexico_Corp',
      description: 'Mexico Corp Firewalls',
      devices: {
        entry: [
          {
            '@name': '013201032805',
          },
          {
            '@name': '013201032820',
          },
        ],
      },
      'reference-templates': {
        member: ['FW_mxmex05pafwcorp'],
      },
    },
    {
      '@name': 'Cyberjaya_Extranet_Internal',
      description: {
        type: 'string',
        text: 'Cyberjaya_Extranet_Internal firewall',
      },
      devices: {
        type: 'array',
        entry: [
          {
            '@name': '016401014061',
          },
          {
            '@name': '016401014063',
          },
        ],
      },
    },
    {
      '@name': 'Cyberjaya_Extranet_External',
      description: {
        type: 'string',
        text: 'Cyberjaya_Extranet_External firewall',
      },
      devices: {
        type: 'array',
        entry: [
          {
            '@name': '016401013996',
          },
          {
            '@name': '016401014170',
          },
        ],
      },
    },
    {
      '@name': 'Mexico_DellFi',
      description: 'Mexico Park Plaza Dellfi Firewalls',
      devices: {
        entry: [
          {
            '@name': '024201000677',
          },
          {
            '@name': '024201000683',
          },
        ],
      },
      'reference-templates': {
        member: ['FW_mxmex2pafwdellfi'],
      },
    },
    {
      '@name': 'AWS_US_EAST_Default',
      description: 'AWS firewalls for US EAST us-east1',
      devices: {
        entry: [
          {
            '@name': '007955000349959',
          },
          {
            '@name': '007955000349960',
          },
        ],
      },
    },
    {
      '@name': 'APEX_Lab',
      description: 'two 5280s USRRXPAFWLab01/02',
      devices: {
        entry: [
          {
            '@name': '015701001628',
          },
          {
            '@name': '015701001629',
          },
        ],
      },
    },
    {
      '@name': 'Master_Key_rotation',
      description: 'Master key rotation',
      devices: {
        entry: [
          {
            '@name': '007951000373828',
          },
          {
            '@name': '007951000373827',
          },
        ],
      },
    },
  ];

  const [expandedNodeName, setExpandedNodeName] = useState(null);
  const [expandedDetailsNodeNames, setExpandedDetailsNodeNames] = useState([]);
  const [selectinventory, setSelectinventory] = useState(null);
  const [isopenversion, setIsOpenversion] = useState(false);
  const [selectedNodeNames, setSelectedNodeNames] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [gethostname, setGethostname] = useState([]);
  const [username, setUsername] = useState('');
  const [access_token, SetAccess_token] = useState('');
  const [panoramalist, setPanoramalist] = useState(childdata);
  const [password, setPassword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Calculate the start and end indices for the current page
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  const [isLoading, setIsLoading] = useState(false);

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
      console.log(
        '🚀 ~ file: InventoryTable.js:177 ~ handleSubmit ~ error:',
        error
      );
    }
  };

  // call inventory detail
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
            console.log(
              '🚀 ~ file: LegacyTableTree.js:111 ~ fetchData ~ User"@name":',
              Username
            );
            SetAccess_token(Username);
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
              const yamlObject = yaml.load(cleanedJsonString);
              console.log(
                '🚀 ~ file: LegacyTableTree.js:142 ~ fetchData ~ yamlObject:',
                yamlObject
              );
              const jsonObject = yamlObject?.all?.children?.panoramas;
              const ansibleHosts = [];
              const Username = JSON.parse(cleanedJsonString)?.all?.vars;
              SetAccess_token(Username);
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
              setGethostname(ansibleHosts);
            } catch (yamlError) {
              console.error('Error parsing data:', yamlError);
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

  useEffect(() => {
    if (selectedOption) {
      GetPanoramaVersion();
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
    console.log(
      '🚀 ~ file: LegacyTableTree.js:2904 ~ ComposableTableTree ~ node:',
      node
    );

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
        checkboxId: `checkbox_id_${node.name
          .toLowerCase()
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
        <Td dataLabel={columnNames} treeRow={treeRow}>
          {node.name}
        </Td>
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
  const data = panoramalist?.map((parent) => {
    let children = parent?.devices?.entry?.map((child) => ({
      name: child['@name'],
    }));
    return { name: parent['@name'], children };
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
  // Get Value Of The Inventory
  const onSelectinventory = (event, selection) => {
    setSelectinventory(selection);
    setIsOpen(false);
  };

  //   Get Value Of The Panoramas Devices
  const onSelecversion = (event, selection) => {
    setSelectedOption(selection);
    setIsOpenversion(false);
  };

  // const handleSubmit = () => {
  //   const selectedRows = data.flatMap((parent) => {
  //     const parentRow = selectedNodeNames.includes(parent.name)
  //       ? { parent: parent.name, child: null }
  //       : null;

  //     const childRows = parent.children
  //       ? parent.children
  //           .filter((child) => selectedNodeNames.includes(child.name))
  //           .map((child) => ({ parent: parent.name, child: child.name }))
  //       : [];

  //     return parentRow ? [parentRow, ...childRows] : childRows;
  //   });

  //   console.log(selectedRows);
  // };

  //   OnSubmit Create One Payload For POST API

  const handleSubmit = () => {
    const selectedRows = data.reduce((result, parent) => {
      const parentRow = selectedNodeNames.includes(parent.name)
        ? { parent: parent.name, child: [] }
        : null;

      const childRows = parent.children
        ? parent.children
            .filter((child) => selectedNodeNames.includes(child.name))
            .map((child) => child.name)
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
    const payload = {
      mergedRows,
      username,
      password,
    };
    console.log(payload);
  };

  return (
    <>
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
          <TableComposable isTreeTable aria-label="Tree table">
            <Thead>
              <Tr>
                <Th width={40}>{columnNames.name}</Th>
              </Tr>
            </Thead>
            <Tbody>{renderRows(pageData)}</Tbody>
          </TableComposable>
          {/* Pagination */}
          <Pagination
            itemCount={data.length}
            perPage={pageSize}
            page={currentPage}
            onSetPage={(_, page) => setCurrentPage(page)}
          />
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
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px' }}>
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
      </div>
      <div
        style={{
          padding: '10px',
          width: '100%',
        }}
      >
        <Button onClick={handleSubmit}>Submit</Button>
      </div>
    </>
  );
};

export default ComposableTableTree;
