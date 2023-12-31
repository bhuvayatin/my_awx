import { Modal, Title } from '@patternfly/react-core';
import { InventoriesAPI } from 'api';
import React, { useState } from 'react';
import { useEffect } from 'react';
import styled from 'styled-components';

function Logmodal({ isOpen, onClose, job_id, ip_address }) {
    const Header = styled.div`
    display: flex;
    svg {
      margin-right: 16px",
    }
  `;
    const [log, setLog] = useState([]);
    useEffect(() => {
      get_log();
      // if (isOpen) {
        const intervalId = setInterval(get_log, 5000);
      // }
      return () => clearInterval(intervalId);
    }, []);
    const get_log = async () => {
      var payload = {
        ip_address,
        job_id:parseInt(job_id),
      };
      try {
        const { data } = await InventoriesAPI.get_log(payload);
        setLog(data?.data);
        return data;
      } catch (error) {
        console.log('🚀 ~ file: DataModal.js:202 ~ fetchData ~ error:', error);
      }
    };
    const customHeader = (
      <Header>
        <Title id="alert-modal-header-label" size="2xl" headingLevel="h2">
          Logs
        </Title>
      </Header>
    );
    
}

export default Logmodal