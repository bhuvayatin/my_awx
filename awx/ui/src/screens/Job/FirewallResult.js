import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

function FirewallResult() {
  const location = useLocation();
  const data = location?.state;
  console.log(
    '🚀 ~ file: FirewallResult.js:7 ~ FirewallResult ~ customData:',
    data
  );
  const [newrecord, setNewrecord] = useState();
  const ws = useRef(null);
  useEffect(() => {
    // Create a mock WebSocket server
    // const socket = new WebSocket('wss://localhost:3001/websocket/updatefirewall/');
    // socket.onopen = function () {
    //   socket.send(
    //     JSON.stringify({ ip_addresses: ['183.12.56.18', '183.12.56.19'] })
    //   );
    // };
    // socket.onmessage = function (e) {
    // const response = JSON.parse(e.data);
    // console.log(response);
    // };
    if (data) {
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
            ip_addresses: data?.data,
          })
        );
      };
      ws.current.onopen = connect;

      ws.current.onmessage = (e) => {
        // setLastMessage(JSON.parse(e.data));

        const ipstatus = JSON.parse(e.data);
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
        setNewrecord(updatedFirewalls);
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
    }
  }, [data]);
  return (
    <div>
      FirewallResult{' '}
      {newrecord?.map((hey) => (
        <p>
          {hey?.firewall}-------{hey.status}
        </p>
      ))}
    </div>
  );
}

export default FirewallResult;
