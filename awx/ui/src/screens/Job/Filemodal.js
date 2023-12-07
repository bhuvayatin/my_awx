import { Modal, Title } from '@patternfly/react-core';
import { InventoriesAPI } from 'api';
import React, { useState } from 'react';
import { useEffect } from 'react';
import styled from 'styled-components';
function Filemodal({ isOpen, onClose, job_id, ip_address, islogmodal }) {
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
      setLogdetails(data?.data);
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
          <table style={{ width: '100%', border: '1px solid #f2f2f2' }}>
            <tbody>
              <tr>
                <td
                  style={{ padding: '10px', borderRight: '1px solid #f2f2f2' }}
                >
                  {log?.map((item) => {
                    return <p>{item?.text}</p>;
                  })}
                </td>
              </tr>
            </tbody>
          </table>
        ) : (
          <>
            {xml1?.file_name && xml1?.file_name ? (
              <table style={{ width: '100%', border: '1px solid #f2f2f2' }}>
                <tbody>
                  <tr style={{ background: '#f2f2f2' }}>
                    <td style={{ padding: '10px' }}>
                      <p>
                        <span>
                          <b>File:</b>
                        </span>
                        {xml?.file_name?.substring(
                          xml?.file_name.lastIndexOf('/') + 1
                        )}
                      </p>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <p>
                        <span>
                          <b>File:</b>
                        </span>
                        {xml1?.file_name?.substring(
                          xml1?.file_name.lastIndexOf('/') + 1
                        )}
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        padding: '10px',
                        borderRight: '1px solid #f2f2f2',
                      }}
                    >
                      {xml?.xml_content}
                    </td>
                    <td style={{ padding: '10px' }}>{xml1?.xml_content}</td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <p>Please Wait sometime</p>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

export default Filemodal;
