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
} from '@patternfly/react-table';
import {
  Alert,
  AlertActionCloseButton,
  AlertVariant,
  Bullseye,
  Button,
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
import { TextInput } from '@patternfly/react-core';
import { InventoriesAPI, JobTemplatesAPI } from 'api';
import StatusLabel from 'components/StatusLabel';
import AlertModal from 'components/AlertModal';
import { useWebsocketForIP } from 'hooks/useWebsocket';

const ComposableTableTree = () => {
  const columnNames = {
    Firewall_Serial: 'Firewall Serial',
    name: 'Name',
    IP_Address: 'IP Address',
    Firewall_State: 'Firewall_State',
    // HA_Group_ID: 'HA Group ID',
    Software_Version: 'Software Version',
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
      Firewalls: [],
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

  const [getdata, setGetdata] = useState(childdata);
  const [issubmit, setIssubmit] = useState(false);
  // Calculate the start and end indices for the current page
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  const [isLoading, setIsLoading] = useState(false);
  const ws = useRef(null);

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
      console.log(
        '🚀 ~ file: InventoryTable.js:156 ~ handleSubmit ~ error:',
        error
      );
    }
  };

  // useEffect(() => {
  //   if (issubmit) {
  //     ws.current = new WebSocket(
  //       `${window.location.protocol === 'http:' ? 'ws:' : 'wss:'}//${
  //         window.location.host
  //       }${window.location.pathname}websocket/updatefirewall/`
  //     );

  //     const connect = () => {
  //       const xrftoken = `; ${document.cookie}`
  //         .split('; csrftoken=')
  //         .pop()
  //         .split(';')
  //         .shift();
  //       ws.current.send(
  //         JSON.stringify({
  //           ip_addresses: [
  //             '10.215.18.83',
  //             '10.215.18.84',
  //             '10.215.18.85',
  //             '10.215.18.86',
  //             '10.215.18.87',
  //           ],
  //         })
  //       );
  //     };
  //     ws.current.onopen = connect;

  //     ws.current.onmessage = (e) => {
  //       // setLastMessage(JSON.parse(e.data));

  //       const ipstatus = JSON.parse(e.data);
  //       const updatedChilddata = getdata.map((group) => {
  //         const updatedFirewalls = group.Firewalls.map((firewall) => {
  //           const ip = firewall.IP_Address;
  //           const newStatus = ipstatus[ip] || firewall.status;
  //           return { ...firewall, status: newStatus };
  //         });

  //         return { ...group, Firewalls: updatedFirewalls };
  //       });
  //       // console.log('updatedChilddata',updatedChilddata);
  //       // setGetdata(updatedChilddata);
  //     };

  //     ws.current.onclose = (e) => {
  //       if (e.code !== 1000) {
  //         // eslint-disable-next-line no-console
  //         console.debug('Socket closed. Reconnecting...', e);
  //         setTimeout(() => {
  //           connect();
  //         }, 1000);
  //       }
  //     };

  //     ws.current.onerror = (err) => {
  //       // eslint-disable-next-line no-console
  //       console.debug('Socket error: ', err, 'Disconnecting...');
  //       ws.current.close();
  //     };

  //     return () => {
  //       ws.current.close();
  //     };
  //   }
  // }, [issubmit]);
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
              const yamlObject = yaml.load(data?.variables);
              const jsonObject = yamlObject?.all?.children?.panoramas?.children;
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
      if (error?.response?.data?.Error) {
        console.log(
          '🚀 ~ file: LegacyTableTree.js:274 ~ getFirewall ~ error?.response?.data?.Error:',
          error?.response?.data?.Error
        );
      } else {
        console.log(
          '🚀 ~ file: LegacyTableTree.js:277 ~ getFirewall ~ error?.response?.statusText:',
          error?.response?.statusText
        );
      }
      console.log(
        '🚀 ~ file: InventoryTable.js:177 ~ handleSubmit ~ error:',
        error
      );
    }
  };
  useEffect(() => {
    if (selectedOption) {
      GetPanoramaVersion();
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
        <Td dataLabel={columnNames.name} treeRow={treeRow}>
          {node.name}
        </Td>
        <Td dataLabel={columnNames.Firewall_Serial}>{node?.Firewall_Serial}</Td>
        <Td dataLabel={columnNames.IP_Address}>{node?.IP_Address}</Td>
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
        {/* <Td dataLabel={columnNames.HA_Group_ID}>{node?.hapair}</Td> */}
        <Td dataLabel={columnNames.Software_Version}>{node?.version}</Td>
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
    let children = parent?.Firewalls?.map((child) => ({
      name: child['Device_Name'],
      Firewall_Serial: child['Firewall_Serial'],
      IP_Address: child['IP_Address'],
      status: child['Firewall_State'] == true ? 'Connected' : 'Disconnected',
      // hapair: child['HA_Group_ID'],
      version: child['Software_Version'],
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
  function callsocket(ip_address, id) {
    console.log('🚀 ~ file: LegacyTableTree.js:582 ~ callsocket ~ id:', id);
    console.log(
      '🚀 ~ file: LegacyTableTree.js:582 ~ callsocket ~ ip_address:',
      ip_address
    );
    ws.current = new WebSocket(
      `${window.location.protocol === 'http:' ? 'ws:' : 'wss:'}//${
        window.location.host
      }${window.location.pathname}websocket/updatefirewall/`
    );
    const connect = () => {
      const xrftoken = `; ${document.cookie}`
        .split('; csrftoken=')
        .pop()
        .split(';')
        .shift();
      ws.current.send(
        JSON.stringify({
          ip_addresses: ip_address,
          job_id: id,
        })
      );
    };
    ws.current.onopen = connect;
    ws.current.onmessage = (e) => {
      // setLastMessage(JSON.parse(e.data));
      const ipstatus = JSON.parse(e.data);
      const updatedChilddata = getdata.map((group) => {
        const updatedFirewalls = group.Firewalls.map((firewall) => {
          const ip = firewall.IP_Address;
          const newStatus = ipstatus[ip] || firewall.status;
          return { ...firewall, status: newStatus };
        });
        return { ...group, Firewalls: updatedFirewalls };
      });
      console.log('updatedChilddata', updatedChilddata);
      // setGetdata(updatedChilddata);
    };
    ws.current.onclose = (e) => {
      if (e.code !== 1000) {
        // eslint-disable-next-line no-console
        console.debug('Socket closed. Reconnecting...', e);
        setTimeout(() => {
          connect();
        }, 1000);
      }
    };
    ws.current.onerror = (err) => {
      // eslint-disable-next-line no-console
      console.debug('Socket error: ', err, 'Disconnecting...');
      ws.current.close();
    };
    return () => {
      ws.current.close();
    };
  }
  const handleSubmit = async () => {
    const selectedRows = data?.reduce((result, parent) => {
      if (selectedNodeNames.includes(parent.name)) {
        const parentRow = { parent: parent.name, child: [] };

        const childRows = parent.children
          ? parent.children
              .filter((child) => selectedNodeNames.includes(child.name))
              .map((child) => child.IP_Address)
          : [];

        parentRow.child = childRows;

        // Only add to result if there are child rows
        if (parentRow.child.length > 0) {
          result.push(parentRow);
        }
      } else {
        const childRows = parent.children
          ? parent.children
              .filter((child) => selectedNodeNames.includes(child.name))
              .map((child) => child.IP_Address)
          : [];

        result.push(
          ...childRows.map((child) => ({ parent: parent.name, child }))
        );
      }

      return result;
    }, []);

    if (selectedRows && software_version) {
      const mergedRows = selectedRows?.map((item) => item.child);
      const payload = {
        credential_passwords: {},
        extra_vars: {
          inventory_hostname: mergedRows,
        },
        panos_version_input: software_version,
      };
      try {
        const { data } = await JobTemplatesAPI.launch(11, {
          extra_vars: payload,
        });
        callsocket(mergedRows, data?.id);
        history.push(
          `/jobs/playbook/${data.id}/fresult?variableName=${data.id}`
        );
      } catch (error) {
        console.log(
          '🚀 ~ file: InventoryTable.js:177 ~ handleSubmit ~ error:',
          error
        );
      }
    } else if (!selectedRows) {
      alert('please select the Firewalls');
    } else if (software_version == undefined || software_version == '') {
      alert('please select the Software version');
    }
    // setIssubmit(true);
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
                    <Th width={20}>{columnNames.name}</Th>
                    <Th width={20}>{columnNames.Firewall_Serial}</Th>
                    <Th width={20}>{columnNames.IP_Address}</Th>
                    <Th width={20}>{columnNames.Firewall_State}</Th>
                    {/* <Th width={20}>{columnNames.HA_Group_ID}</Th> */}
                    <Th width={20}>{columnNames.Software_Version}</Th>
                  </Tr>
                </Thead>
                <Tbody>{renderRows(pageData)}</Tbody>{' '}
              </>
            ) : (
              <Tr>
                <Td colSpan={8}>
                  <Bullseye>
                    <div>
                      <Title headingLevel="h2" size="lg">
                        No firewalls avaiable in the listed inventory file:
                        <b>{selectinventoryname}</b>.
                      </Title>
                      <br />
                      <EmptyStateBody>
                        Please choose a different file.
                      </EmptyStateBody>
                    </div>
                  </Bullseye>
                </Td>
              </Tr>
            )}
          </TableComposable>
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
      <div>
        {selectedOption && (
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
                <SelectOption key={index} value={option} isPlaceholder={false}>
                  {option}
                </SelectOption>
              ))}
            </Select>
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
    </>
  );
};

export default ComposableTableTree;
