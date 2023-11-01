import React, { useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  TableComposable,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
} from '@patternfly/react-table';
import {
  Bullseye,
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateVariant,
  Select,
  SelectOption,
  SelectVariant,
  Spinner,
  Title,
} from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';
import useRequest from 'hooks/useRequest';
import { InventoriesAPI, JobTemplatesAPI, SystemJobTemplatesAPI } from 'api';
import yaml from 'js-yaml';
import useToast, { AlertVariant } from 'hooks/useToast';
import { t } from '@lingui/macro';

function InventoryTable() {
  const history = useHistory();
  const { addToast, Toast, toastProps } = useToast();

  const [gethostname, setGethostname] = useState([]);
  const [selectinventory, setSelectinventory] = useState(null);
  const [selectinventoryname, setSelectinventoryname] = useState(null);
  const [selectversion, setselectversion] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isopenversion, setIsOpenversion] = useState(false);
  const [selectedRepoNames, setSelectedRepoNames] = React.useState([]);
  const [isLoading, setIsLoading] = useState(false);
  console.log(
    '🚀 ~ file: InventoryTable.js:43 ~ InventoryTable ~ isLoading:',
    isLoading
  );
  const [issave, setIssave] = useState(false);

  const erroralert = useCallback(
    (msg) => {
      addToast({
        id: 1,
        title: t`${msg}`,
        variant: AlertVariant.danger,
        hasTimeout: true,
      });
    },
    [addToast]
  );

  const columnNames = {
    name: 'Host Name',
    status: 'Host Status',
  };
  const versionData = ['9.0.0', '9.0.1', '9.0.2', '9.0.3', '9.0.4'];

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

          const Username = JSON.parse(cleanedJsonString)?.all?.vars;
          try {
            // Try parsing as JSON
            const jsonObject =
              JSON.parse(cleanedJsonString)?.all?.children?.firewalls?.children
                ?.fw_dev?.children;
            // setGethostname(
            //   Object.keys(jsonObject).map((key) => jsonObject[key])
            //   );
            const ansibleHosts = [];

            // Loop through the firewallData object to extract ansible_host values
            for (const firewallName in jsonObject) {
              const hosts = jsonObject[firewallName].hosts;

              if (hosts) {
                for (const hostName in hosts) {
                  const ansibleHost = hosts[hostName].ansible_host;
                  if (ansibleHost) {
                    ansibleHosts.push(ansibleHost);
                  }
                }
              }
            }

            // Code for Get version
            if (ansibleHosts?.length > 0) {
              const hostVersions = [];
              for (const host of ansibleHosts) {
                try {
                  const version = await GetVersion(host, Username);
                  hostVersions.push({ host, version });
                } catch (error) {
                  console.error(
                    `Error getting version for host ${host}:`,
                    error
                  );
                }
              }
              console.log(
                '🚀 ~ file: InventoryTable.js:123 ~ fetchData ~ hostVersions:',
                hostVersions
              );
              setGethostname(hostVersions);
            }
          } catch (jsonError) {
            try {
              // If parsing as JSON fails, try parsing as YAML
              const yamlObject = yaml.load(data?.variables)?.all?.children
                ?.firewalls?.children?.fw_dev?.children;
              // setGethostname(
              //   Object.keys(yamlObject).map((key) => yamlObject[key])
              // );
              const ansibleHosts = [];
              // Loop through the firewallData object to extract ansible_host values
              for (const firewallName in yamlObject) {
                const hosts = yamlObject[firewallName].hosts;

                if (hosts) {
                  for (const hostName in hosts) {
                    const ansibleHost = hosts[hostName].ansible_host;
                    if (ansibleHost) {
                      ansibleHosts.push(ansibleHost);
                    }
                  }
                }
              }
              // Code for Get version
              if (ansibleHosts?.length > 0) {
                const hostVersions = [];
                for (const host of ansibleHosts) {
                  try {
                    const version = await GetVersion(host, Username);
                    hostVersions.push({ host, version });
                  } catch (error) {
                    console.error(
                      `Error getting version for host ${host}:`,
                      error
                    );
                  }
                }
                console.log(
                  '🚀 ~ file: InventoryTable.js:176 ~ fetchData ~ hostVersions:',
                  hostVersions
                );
              }
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

  // UseEffect for call Inventory list api
  useEffect(() => {
    fetchInventories();
  }, [fetchInventories]);

  const onToggle = (isOpen) => {
    setIsOpen(isOpen);
  };
  const onToggleversion = (isopenversion) => {
    setIsOpenversion(isopenversion);
  };
  const onSelectinventory = (event, selection, isPlaceholder) => {
    if (!isPlaceholder) {
      const selectedOption = results.find((option) => option.id === selection);
      // setSelectInventory(selectedOption);
      setSelectinventoryname(selectedOption?.name);
    }
    setSelectinventory(selection);
    setIsOpen(false);
  };
  const onSelecversion = (event, selection) => {
    setselectversion(selection);
    setIsOpenversion(false);
  };

  const primaryLoadingProps = {};
  if (issave) {
    primaryLoadingProps.spinnerAriaValueText = 'Loading';
    primaryLoadingProps.spinnerAriaLabelledBy = 'primary-loading-button';
    primaryLoadingProps.isLoading = true;
  }

  const handleSubmit = async () => {
    setIssave(true);
    if (selectinventory && selectedRepoNames?.length !== 0 && selectversion) {
      const payload = {
        credential_passwords: {},
        extra_vars: {
          inventory_hostname: selectedRepoNames,
          panos_version_input: selectversion,
        },
      };
      try {
        const { data } = await JobTemplatesAPI.launch(11, {
          extra_vars: payload,
        });
        console.log(
          '🚀 ~ file: InventoryTable.js:175 ~ handleSubmit ~ data:',
          data
        );
        history.push(`/jobs/playbook/${data.id}/output`);
      } catch (error) {
        console.log(
          '🚀 ~ file: InventoryTable.js:177 ~ handleSubmit ~ error:',
          error
        );
      }
    } else if (!selectinventory) {
      const msg = 'please select the Inventory';
      erroralert(msg);
    } else if (!selectversion) {
      const msg = 'please select the version';
      erroralert(msg);
    } else if (selectedRepoNames?.length === 0) {
      const msg = 'please select the Firewall';
      erroralert(msg);
    }
    setIssave(false);
  };

  const setRepoSelected = (repo, isSelecting = true) =>
    setSelectedRepoNames((prevSelected) => {
      const otherSelectedRepoNames = prevSelected.filter((r) => r !== repo);
      return isSelecting
        ? [...otherSelectedRepoNames, repo]
        : otherSelectedRepoNames;
    });
  const selectAllRepos = (isSelecting = true) =>
    setSelectedRepoNames(isSelecting ? gethostname.map((r) => r) : []);
  const areAllReposSelected = selectedRepoNames.length === gethostname?.length;
  const isRepoSelected = (repo) => selectedRepoNames.includes(repo);
  const [recentSelectedRowIndex, setRecentSelectedRowIndex] =
    React.useState(null);
  const [shifting, setShifting] = React.useState(false);
  const onSelectRepo = (repo, rowIndex, isSelecting) => {
    if (shifting && recentSelectedRowIndex !== null) {
      const numberSelected = rowIndex - recentSelectedRowIndex;
      const intermediateIndexes =
        numberSelected > 0
          ? Array.from(
              new Array(numberSelected + 1),
              (_x, i) => i + recentSelectedRowIndex
            )
          : Array.from(
              new Array(Math.abs(numberSelected) + 1),
              (_x, i) => i + rowIndex
            );
      intermediateIndexes.forEach((index) =>
        setRepoSelected(gethostname[index], isSelecting)
      );
    } else {
      setRepoSelected(repo, isSelecting);
    }
    setRecentSelectedRowIndex(rowIndex);
  };
  React.useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Shift') {
        setShifting(true);
      }
    };
    const onKeyUp = (e) => {
      if (e.key === 'Shift') {
        setShifting(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const GetVersion = async (data, username) => {
    const payload = {
      host: data,
      username: username?.username,
      password: username?.password,
    };
    try {
      const { data } = await InventoriesAPI.readHostVersion(payload);
      console.log(
        '🚀 ~ file: InventoryTable.js:175 ~ handleSubmit ~ data:',
        data[0]
      );
      return data[0];
    } catch (error) {
      console.log(
        '🚀 ~ file: InventoryTable.js:177 ~ handleSubmit ~ error:',
        error
      );
    }
  };
  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '10px',
          width: '100%',
        }}
      >
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
          <label htmlFor="software" style={{ margin: '0 8px' }}>
            Select Software:
          </label>
          <Select
            id="software"
            variant={SelectVariant.single}
            onSelect={onSelecversion}
            onToggle={onToggleversion}
            isOpen={isopenversion}
            selections={selectversion}
            placeholderText="Select a Version "
            width={200}
          >
            {versionData.map((option, index) => (
              <SelectOption key={index} value={option} isPlaceholder={false}>
                {option}
              </SelectOption>
            ))}
          </Select>
        </div>
        <Toast {...toastProps} />
      </div>
      {/* {selectinventory ? (
        isLoading ? (
          <>
            <TableComposable aria-label="Selectable table">
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
              ) : (
                <>
                  <Thead>
                    <Tr>
                      <Th
                        select={{
                          onSelect: (_event, isSelecting) =>
                            selectAllRepos(isSelecting),
                          isSelected: areAllReposSelected,
                        }}
                      />
                      <Th>{columnNames.name}</Th>
                      <Th>{columnNames.status}</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {gethostname?.map((repo, rowIndex) => (
                      <Tr key={rowIndex}>
                        <Td
                          select={{
                            rowIndex,
                            onSelect: (_event, isSelecting) =>
                              onSelectRepo(repo, rowIndex, isSelecting),
                            isSelected: isRepoSelected(repo),
                          }}
                        />
                        <Td dataLabel={columnNames.name}>{repo?.host}</Td>
                        <Td dataLabel={columnNames.status}>{repo?.version}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </>
              )}
            </TableComposable>
            <div
              style={{
                padding: '10px',
                width: '100%',
              }}
            >
              <Button onClick={handleSubmit} {...primaryLoadingProps}>
                Submit
              </Button>
            </div>
          </>
        ) : (
          <TableComposable aria-label="Empty state table">
            <Tbody>
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
            </Tbody>
          </TableComposable>
        )
      ) : (
        <TableComposable aria-label="Empty state table">
          <Tbody>
            <Tr>
              <Td colSpan={8}>
                <Bullseye>
                  <EmptyState variant={EmptyStateVariant.small}>
                    <EmptyStateIcon icon={CubesIcon} />
                    <Title headingLevel="h2" size="lg">
                      No Firewalls Found
                    </Title>
                    <EmptyStateBody>
                      Please add Firewalls to populate this list
                    </EmptyStateBody>
                  </EmptyState>
                </Bullseye>
              </Td>
            </Tr>
          </Tbody>
        </TableComposable>
      )} */}

      {selectinventory ? (
        <>
          <TableComposable aria-label="Selectable table">
            <Tbody>
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
              ) : gethostname.length > 0 ? (
                <>
                  <Thead>
                    <Tr>
                      <Th
                        select={{
                          onSelect: (_event, isSelecting) =>
                            selectAllRepos(isSelecting),
                          isSelected: areAllReposSelected,
                        }}
                      />
                      <Th>{columnNames.name}</Th>
                      <Th>{columnNames.status}</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {gethostname?.map((repo, rowIndex) => (
                      <Tr key={rowIndex}>
                        <Td
                          select={{
                            rowIndex,
                            onSelect: (_event, isSelecting) =>
                              onSelectRepo(repo, rowIndex, isSelecting),
                            isSelected: isRepoSelected(repo),
                          }}
                        />
                        <Td dataLabel={columnNames.name}>{repo?.host}</Td>
                        <Td dataLabel={columnNames.status}>{repo?.version}</Td>
                      </Tr>
                    ))}
                  </Tbody>
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
            </Tbody>
          </TableComposable>
          <div
            style={{
              padding: '10px',
              width: '100%',
            }}
          >
            <Button onClick={handleSubmit} {...primaryLoadingProps}>
              Submit
            </Button>
          </div>
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
                      No Firewalls Found
                    </Title>
                    <EmptyStateBody>
                      Please add Firewalls to populate this list
                    </EmptyStateBody>
                  </EmptyState>
                </Bullseye>
              </Td>
            </Tr>
          </Tbody>
        </TableComposable>
      )}
    </div>
  );
}

export default InventoryTable;
