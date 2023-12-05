import { Modal, Title } from '@patternfly/react-core';
import { InventoriesAPI } from 'api';
import React, { useState } from 'react';
import { useEffect } from 'react';
import styled from 'styled-components';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-xml';
function Xmlmodal({ isOpen, onClose, job_id, ip_address, islogmodal }) {
  const Header = styled.div`
  display: flex;
  svg {
    margin-right: 16px",
  }
`;
  const [log, setLog] = useState([]);
  const [logdetails, setLogdetails] = useState('');

  const [xml, setXml] = useState({
    file_name: '',
    xml_content: '',
  });
  const [xml1, setXml1] = useState({
    file_name: '',
    xml_content: '',
  });

  useEffect(() => {
    if (islogmodal) {
      get_log();
      const intervalId = setInterval(get_log, 5000);
      return () => clearInterval(intervalId);
    } else {
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
      const textValue = data?.data?.map((item) => item.text).join('\n');
      setLogdetails(textValue);
      return data;
    } catch (error) {
      console.log('🚀 ~ file: DataModal.js:202 ~ fetchData ~ error:', error);
    }
  };
  const get_xml = async () => {
    var payload = {
      ip_address,
      job_id: parseInt(job_id),
    };
    try {
      const { data } = await InventoriesAPI.get_xml(payload);
      const parsedXmlContent = data?.data[0]?.xml_content.slice(2, -1);
      const parsedXmlContent1 = data?.data[1]?.xml_content.slice(2, -1);
      setXml({
        file_name: data?.data[0]?.file_name,
        xml_content: parsedXmlContent,
      });
      setXml1({
        file_name: data?.data[1]?.file_name,
        xml_content: parsedXmlContent1,
      });
      return data;
    } catch (error) {
      console.log('🚀 ~ file: DataModal.js:202 ~ fetchData ~ error:', error);
    }
  };
  const customHeader = (
    <Header>
      <Title id="alert-modal-header-label" size="2xl" headingLevel="h2">
        {islogmodal ? 'Logs Details' : 'Backup File Details'}
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
      <div>
        {islogmodal ? (
          <AceEditor
            mode="plain_text"
            readOnly={true}
            value={logdetails}
            editorProps={{ $blockScrolling: true }}
            style={{ width: '100%', height: '400px' }}
            theme="github"
            fontSize={16}
            className={`pf-c-form-control VariablesDetail___StyledCodeEditor2-sc-1nj9x4t-4 iWcFef`}
          />
        ) : (
          <>
            {xml1?.file_name && xml1?.file_name ? (
              <div style={{ display: 'flex', padding: 20 }}>
                <div style={{ width: '100%', margin: 10 }}>
                  <p>
                    <span>
                      <b>File:</b>
                    </span>
                    {xml?.file_name?.substring(
                      xml?.file_name.lastIndexOf('/') + 1
                    )}
                  </p>
                  <AceEditor
                    mode="xml"
                    readOnly={true}
                    value={`${xml?.xml_content}`}
                    editorProps={{ $blockScrolling: true }}
                    style={{ width: '100%', height: '400px' }}
                    theme="github"
                    fontSize={16}
                    className={`pf-c-form-control VariablesDetail___StyledCodeEditor2-sc-1nj9x4t-4 iWcFef`}
                  />
                </div>
                <div style={{ width: '100%', margin: 10 }}>
                  <p>
                    <span>
                      <b>File:</b>
                    </span>
                    {xml1?.file_name?.substring(
                      xml1?.file_name.lastIndexOf('/') + 1
                    )}
                  </p>
                  <AceEditor
                    mode="xml"
                    readOnly={true}
                    value={`${xml1?.xml_content}`}
                    editorProps={{ $blockScrolling: true }}
                    style={{ width: '100%', height: '400px' }}
                    theme="github"
                    fontSize={16}
                    className={`pf-c-form-control VariablesDetail___StyledCodeEditor2-sc-1nj9x4t-4 iWcFef`}
                  />
                </div>
              </div>
            ) : <p>Please Wait sometime</p>}
          </>
        )}
      </div>
    </Modal>
  );
}

export default Xmlmodal;
