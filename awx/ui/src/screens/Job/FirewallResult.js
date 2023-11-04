import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';

function FirewallResult() {
  const { id } = useParams();
  console.log(
    '🚀 ~ file: FirewallResult.js:6 ~ FirewallResult ~ variableName:',
    id
  );
  const location = useLocation();
  const data = location?.state;
  const [newrecord, setNewrecord] = useState();
  const ws = useRef(null);
  useEffect(() => {
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
          job_id: id,
        })
      );
    };
    ws.current.onopen = connect;

    ws.current.onmessage = (e) => {
      // setLastMessage(JSON.parse(e.data));

      const ipstatus = JSON.parse(e.data);
      console.log("🚀 ~ file: FirewallResult.js:39 ~ useEffect ~ ipstatus:", ipstatus)
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
      setNewrecord(Object.entries(ipstatus));
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
  }, []);
  return (
    <div>
      FirewallResult{' '}
      {newrecord?.map(([ip, status]) => (
        <p>
          {ip}-------{status}
        </p>
      ))}
    </div>
  );
}

export default FirewallResult;
