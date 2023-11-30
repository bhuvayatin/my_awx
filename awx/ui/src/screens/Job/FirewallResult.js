import { Label, Pagination } from '@patternfly/react-core';
import {
  CheckCircleIcon,
  ClockIcon,
  DownloadIcon,
  SyncAltIcon,
} from '@patternfly/react-icons';
import {
  Table,
  TableComposable,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@patternfly/react-table';
import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useParams, useHistory } from 'react-router-dom';
import DataModal from 'screens/Firewalls/DataModal';
import styled, { keyframes } from 'styled-components';

function FirewallResult() {
  const history = useHistory();
  const { id } = useParams();
  const pageSize = 10;
  const location = useLocation();
  const data = location?.state;
  console.log('🚀 ~ file: FirewallResult.js:27 ~ FirewallResult ~ data:', data);
  const [newrecord, setNewrecord] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [datamodal, setDatamodal] = useState(false);
  const [ip_address, setIp_address] = useState();
  const closeModal = () => {
    setDatamodal(false);
  };
  const ws = useRef(null);
  function callsocket(ip_address, id, sequence) {
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
          ip_address: ip_address,
          job_id: parseInt(id),
          sequence: sequence,
        })
      );
    };
    ws.current.onopen = connect;
    ws.current.onmessage = (e) => {
      // setLastMessage(JSON.parse(e.data));
      const ipstatus = JSON.parse(e.data);
      setNewrecord(ipstatus);
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
  useEffect(() => {
    if (data?.id && data?.ip) {
      callsocket(data?.ip, data?.id, data?.sequence);
      history.replace(
        `/jobs/playbook/${data.id}/fresult?jobid=${data.id}&issquence=${data.sequence}`
      );
    } else {
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
            job_id: parseInt(id),
          })
        );
      };
      ws.current.onopen = connect;

      ws.current.onmessage = (e) => {
        // setLastMessage(JSON.parse(e.data));

        const ipstatus = JSON.parse(e.data);
        console.log(
          '🚀 ~ file: FirewallResult.js:39 ~ useEffect ~ ipstatus:',
          ipstatus
        );
        // const updatedChilddata = getdata.map((group) => {
        const updatedFirewalls = data?.data?.map((firewall) => {
          const ip = firewall;
          //   console.log("🚀 ~ file: FirewallResult.js:53 ~ updatedFirewalls ~ ip:", ip)
          const newStatus = ipstatus[ip];
          //   console.log("🚀 ~ file: FirewallResult.js:55 ~ updatedFirewalls ~ newStatus:", newStatus)
          return { firewall, status: newStatus };
        });

        //   return { ...group, Firewalls: updatedFirewalls };
        // });
        setNewrecord(ipstatus);
        console.log(
          '🚀 ~ file: FirewallResult.js:54 ~ updatedChilddata ~ updatedChilddata:',
          updatedFirewalls
        );
        // console.log('updatedChilddata',updatedChilddata);
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
      // }
    }
  }, []);
  const data1 = {
    device_group1: {
      '10.215.18.83': 'updated',
      '10.215.18.84': 'updated',
      '10.215.18.85': 'installing',
    },
    'No Device Group': {
      '10.215.18.183': 'waiting',
    },
  };
  const columnNames = {
    name: 'Group',
    branches: 'IP Address',
    prs: 'Status',
    device_name:'Name'
  };
  const repositories = [];
  for (const group in newrecord) {
    for (const ip in newrecord[group]) {
      console.log("🚀 ~ file: FirewallResult.js:175 ~ newrecord:", newrecord[group][ip])
      repositories.push({
        name: group,
        branches: ip,
        prs: newrecord[group][ip]?.status,
        device_name:newrecord[group][ip]?.name,
      });
    }
  }
  const Spin = keyframes`
  from {
    transform: rotate(0);
  }
  to {
    transform: rotate(1turn);
  }
`;
  const RunningIcon = styled(SyncAltIcon)`
    animation: ${Spin} 1.75s linear infinite;
  `;
  return (
    <div>
      {datamodal && (
        <DataModal isOpen={datamodal} onClose={closeModal} ip={ip_address}/>
      )}
      <TableComposable isTreeTable aria-label="Tree table">
        <Thead>
          <Tr>
            <Th>{columnNames.device_name}</Th>
            <Th>{columnNames.name}</Th>
            <Th>{columnNames.branches}</Th>
            <Th>{columnNames.prs}</Th>
          </Tr>
        </Thead>
        <Tbody>
          {repositories.map((repo, index) => (
            <Tr key={index}>
              <Td dataLabel={columnNames.device_name}>{repo?.device_name}</Td>
              <Td dataLabel={columnNames.name}>{repo.name}</Td>
              <Td dataLabel={columnNames.branches}>
                <a
                  onClick={() => {
                    setDatamodal(true);
                    setIp_address(repo?.branches);
                  }}
                >
                  {repo.branches}{' '}
                </a>
              </Td>
              <Td dataLabel={columnNames.prs}>
                {repo?.prs == 'updated' && (
                  <Label
                    variant="outline"
                    color={'green'}
                    icon={<CheckCircleIcon />}
                  >
                    {repo?.prs}
                  </Label>
                )}
                {repo?.prs == 'waiting' && (
                  <Label variant="outline" color={'gray'} icon={<ClockIcon />}>
                    {repo?.prs}
                  </Label>
                )}
                {repo?.prs == 'solar_wind_mute' && (
                  <Label
                    variant="outline"
                    color={'blue'}
                    icon={<RunningIcon />}
                  >
                    {repo?.prs}
                  </Label>
                )}
                {repo?.prs == 'downloading' && (
                  <Label
                    variant="outline"
                    color={'purple'}
                    icon={<DownloadIcon />}
                  >
                    {repo?.prs}
                  </Label>
                )}
                {repo?.prs == 'backup' && (
                  <Label
                    variant="outline"
                    color={'blue'}
                    icon={<RunningIcon />}
                  >
                    {repo?.prs}
                  </Label>
                )}
                {repo?.prs == 'installing' && (
                  <Label
                    variant="outline"
                    color={'blue'}
                    icon={<RunningIcon />}
                  >
                    {repo?.prs}
                  </Label>
                )}
                {repo?.prs == 'rebooting' && (
                  <Label
                    variant="outline"
                    color={'blue'}
                    icon={<RunningIcon />}
                  >
                    {repo?.prs}
                  </Label>
                )}
                {repo?.prs == 'commit' && (
                  <Label
                    variant="outline"
                    color={'blue'}
                    icon={<RunningIcon />}
                  >
                    {repo?.prs}
                  </Label>
                )}
                {repo?.prs == 'ping' && (
                  <Label
                    variant="outline"
                    color={'blue'}
                    icon={<RunningIcon />}
                  >
                    {repo?.prs}
                  </Label>
                )}
                {repo?.prs == 'login' && (
                  <Label
                    variant="outline"
                    color={'blue'}
                    icon={<RunningIcon />}
                  >
                    {repo?.prs}
                  </Label>
                )}
                {repo?.prs == 'solar_wind_unmute' && (
                  <Label
                    variant="outline"
                    color={'blue'}
                    icon={<RunningIcon />}
                  >
                    {repo?.prs}
                  </Label>
                )}
              </Td>
            </Tr>
          ))}
        </Tbody>
        <Pagination
          itemCount={repositories?.length}
          perPage={pageSize}
          page={currentPage}
          onSetPage={(_, page) => setCurrentPage(page)}
        />
      </TableComposable>
    </div>
  );
}

export default FirewallResult;
