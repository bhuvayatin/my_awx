import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionToggle,
  Modal,
  Title,
} from '@patternfly/react-core';
import { DownloadIcon } from '@patternfly/react-icons';
import { InventoriesAPI } from 'api';
import { DateTime } from 'luxon';
import React, { useState } from 'react';
import { useEffect } from 'react';
import styled from 'styled-components';
function FileModal({ isOpen, onClose, job_id, ip_address, islogmodal }) {
  const Header = styled.div`
  display: flex;
  svg {
    margin-right: 16px",
  }
`;
  const [log, setLog] = useState([]);
  const [logdetails, setLogdetails] = useState('');
  const [expanded, setExpanded] = React.useState('');
  const [xml, setXml] = useState({
    file_name: '',
    xml_content: '',
  });
  const [xml1, setXml1] = useState({
    file_name: '',
    xml_content: '',
  });
  const [error, setError] = useState({
    xml: '',
    tzg: '',
  });
  const onToggle = (id) => {
    if (id === expanded) {
      setExpanded('');
    } else {
      setExpanded(id);
    }
  };
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
  const customStyles = {
    accordion: {
      backgroundColor: '#f2f2f2',
      // Add other CSS properties as needed
    },
    body: {
      maxHeight: '350px',
      overflowY: 'scroll',
    },
  };
  const download = async () => {
    if (xml?.xml_content !== undefined) {
      const blob = new Blob([xml?.xml_content], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = xml?.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);
    } else {
      setError((prev) => ({
        ...prev,
        xml: 'Unable to locate the specified resource',
      }));
    }
  };
  const download_file = async () => {
    var payload = {
      ip_address,
      job_id: parseInt(job_id),
      name: xml1.file_name,
    };
    try {
      const  response  = await InventoriesAPI.firewall_backup_tgz_file(payload);

      console.log(
        '🚀 ~ file: FileModal.js:135 ~ constdownload_file= ~ data:',
        response
      );
      const stream = await response.data;
      // Create a Blob from the ArrayBuffer
      const blob = new Blob([await stream], { type: 'application/x-gzip' });

      // Create a temporary link and click it to trigger the download
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = 'your_file.tgz';
      link.click();
    } catch (error) {
      console.log('🚀 ~ file: DataModal.js:202 ~ fetchData ~ error:', error);
    }
  };
  return (
    <Modal
      header={customHeader}
      aria-label={`Alert modal`}
      aria-labelledby="alert-modal-header-label"
      isOpen={isOpen}
      variant={islogmodal ? 'medium' : 'large'}
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
                    return (
                      <p>
                        <b>
                          {DateTime.fromISO(item?.created_at, {
                            zone: 'utc',
                          }).toFormat('MM-dd-yy hh:mm:ss')}{' '}
                          :{' '}
                        </b>
                        {item?.text}
                      </p>
                    );
                  })}
                </td>
              </tr>
            </tbody>
          </table>
        ) : (
          <>
            {xml1?.file_name && xml1?.file_name && (
              <Accordion
                asDefinitionList
                className="accordion"
                style={customStyles.accordion}
              >
                <AccordionItem>
                  <AccordionToggle
                    onClick={() => {
                      onToggle('def-list-toggle2');
                    }}
                    isExpanded={expanded === 'def-list-toggle2'}
                    id="def-list-toggle2"
                  >
                    <div style={{ display: 'flex' }}>
                      {xml?.file_name?.substring(
                        xml?.file_name.lastIndexOf('/') + 1
                      )}
                      <div
                        onClick={() => {
                          download();
                        }}
                        style={{ margin: '0 20px' }}
                      >
                        <DownloadIcon />
                      </div>
                    </div>
                  </AccordionToggle>
                  <AccordionContent
                    id="def-list-expand2"
                    isHidden={expanded !== 'def-list-toggle2'}
                    className="body"
                    style={customStyles.body}
                  >
                    <p>{xml?.xml_content}</p>
                  </AccordionContent>
                </AccordionItem>
                <span style={{ color: 'red' }}>{error.xml}</span>
                <AccordionItem>
                  <AccordionToggle>
                    <div style={{ display: 'flex' }}>
                      {xml1?.file_name?.substring(
                        xml1?.file_name.lastIndexOf('/') + 1
                      )}
                      <div
                        onClick={() => {
                          download_file();
                        }}
                        style={{ margin: '0 20px' }}
                      >
                        <DownloadIcon />
                      </div>
                    </div>
                  </AccordionToggle>
                </AccordionItem>
                <span style={{ color: 'red' }}>{error.tzg}</span>
              </Accordion>
            )}
            {/* {xml1?.file_name && xml1?.file_name ? (
              <table style={{ width: '100%', border: '1px solid #f2f2f2' }}>
                <tbody>
                  <tr style={{ background: '#f2f2f2' }}>
                    <td style={{ padding: '10px', width: '50%' }}>
                      <p style={{ display: 'flex' }}>
                        <span>
                          <b>File:</b>
                        </span>
                        {xml?.file_name?.substring(
                          xml?.file_name.lastIndexOf('/') + 1
                        )}
                        <div
                          onClick={() => {
                            download();
                          }}
                        >
                          <DownloadIcon />
                        </div>
                      </p>
                    </td>
                    <td style={{ padding: '10px', width: '50%' }}>
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
            )} */}
          </>
        )}
      </div>
    </Modal>
  );
}

export default FileModal;
