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
    name: 'Name',
    ip_address: 'IP Address',
    status:'Status',
    hapair:'Hapair',
    version:'Version'
  };
  const pageSize = 10;
  // Static Data JSON
  const childdata = [
    {
      name: 'device_group1',
      firewalls: [
        {
          device_name: 'PA_VN-86',
          ip_address: '10.215.18.83',
          status: 'connected',
          hapair: '1d3',
          version: '9.0.1',
        },
        {
          device_name: 'PA_VN-87',
          ip_address: '10.215.18.84',
          status: 'connected',
          hapair: '1d3',
          version: '9.0.1',
        },
        {
          device_name: 'PA_VN-88',
          ip_address: '10.215.18.85',
          status: 'connected',
          hapair: '1d4',
          version: '9.0.1',
        },
        {
          device_name: 'PA_VN-89',
          ip_address: '10.215.18.86',
          status: 'connected',
          hapair: '1d4',
          version: '9.0.1',
        },
        {
          device_name: 'PA_VN-90',
          ip_address: '10.215.18.87',
          status: 'connected',
          hapair: '1d5',
          version: '9.0.1',
        },
      ],
    },
    {
      name: '',
      firewalls: [],
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
    let children = parent?.firewalls?.map((child) => ({
      name: child['device_name'],
      ip_address: child['ip_address'],
      status: child['status'],
      hapair: child['hapair'],
      version: child['version'],
    }));
    return {
      name: parent['name'] == '' ? 'No Device Group' : parent['name'],
      children,
    };
  });
  console.log('🚀 ~ file: LegacyTableTree.js:377 ~ data ~ data:', data);

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
                <Th width={30}>{columnNames.name}</Th>
                <Th width={20}>{columnNames.ip_address}</Th>
                <Th width={20}>{columnNames.status}</Th>
                <Th width={20}>{columnNames.hapair}</Th>
                <Th width={20}>{columnNames.version}</Th>

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
