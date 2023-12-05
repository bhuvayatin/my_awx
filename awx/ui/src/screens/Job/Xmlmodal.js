import { Modal, Title } from '@patternfly/react-core';
import { InventoriesAPI } from 'api';
import React, { useState } from 'react';
import { useEffect } from 'react';
import styled from 'styled-components';

function Xmlmodal({ isOpen, onClose, job_id, ip_address, islogmodal }) {
  const Header = styled.div`
  display: flex;
  svg {
    margin-right: 16px",
  }
`;
  const [log, setLog] = useState([]);
  const [xml, setXml] = useState([]);
  console.log("🚀 ~ file: Xmlmodal.js:16 ~ Xmlmodal ~ xml:", xml)

  useEffect(() => {
    if (islogmodal) {
      get_log();
      const intervalId = setInterval(get_log, 5000);
      return () => clearInterval(intervalId);
    }else{
      get_xml();
      const intervalId = setInterval(get_xml, 5000);
      return () => clearInterval(intervalId);
    }
  }, []);
  const get_log = async () => {
    var payload = {
      ip_address,
      job_id: parseInt(job_id),
    };
    try {
      const { data } = await InventoriesAPI.get_log(payload);
      setLog(data?.data);
      return data;
    } catch (error) {
      console.log('🚀 ~ file: DataModal.js:202 ~ fetchData ~ error:', error);
    }
  };
  const get_xml = async() =>{
    var payload = {
      ip_address,
      job_id: parseInt(job_id),
    };
    try {
      const { data } = await InventoriesAPI.get_xml(payload);
      setXml(data?.data);
      return data;
    } catch (error) {
      console.log('🚀 ~ file: DataModal.js:202 ~ fetchData ~ error:', error);
    }
  }
  const customHeader = (
    <Header>
      <Title id="alert-modal-header-label" size="2xl" headingLevel="h2">
        {islogmodal && 'Logs'}
      </Title>
    </Header>
  );
  return (
    <Modal
      header={customHeader}
      aria-label={`Alert modal`}
      aria-labelledby="alert-modal-header-label"
      isOpen={isOpen}
      // variant="small"
      onClose={onClose}
    >
      <div>{islogmodal ? log?.map((item) => <p>{item?.text}</p>) : 'xml'}</div>
    </Modal>
  );
}

export default Xmlmodal;
