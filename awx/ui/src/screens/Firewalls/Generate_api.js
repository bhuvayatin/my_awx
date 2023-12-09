import { t } from '@lingui/macro';
import {
  Button,
  Card,
  PageSection,
  TextInput,
  ClipboardCopy,
  ClipboardCopyVariant,
} from '@patternfly/react-core';
import { InventoriesAPI } from 'api';
import ScreenHeader from 'components/ScreenHeader';
import React, { useState } from 'react';

function Generate_api() {
  const [breadcrumbConfig, setBreadcrumbConfig] = useState({
    '/generate_api_key': t`Generate API Key`,
  });
  const [ip_address, setIp_address] = useState('');

  const [username, setUsername] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [issubmit, setIssubmit] = useState(false);
  const [password, setPassword] = useState('');

  const handleSubmit = async () => {
    const payload = {
      ip_address,
      username,
      password,
    };

    try {
      const { data } = await InventoriesAPI.generate_api_key(payload);
      console.log(
        '🚀 ~ file: FirewallResult.js:201 ~ conststop_proceess= ~ data:',
        data
      );
      setInputValue(data?.data);
      setIssubmit(true);
      return data;
    } catch (error) {
      console.log(
        '🚀 ~ file: FirewallResult.js:206 ~ conststop_proceess= ~ error:',
        error
      );
    }
  };
  return (
    <>
      <ScreenHeader
        streamType="Generate API Ke"
        breadcrumbConfig={breadcrumbConfig}
      />
      <PageSection>
        <Card>
          <form
            style={{
              width: '100%',
              margin: 'auto',
              padding: 20,
            }}
          >
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ width: '50%', padding: '0 20px' }}>
                <div style={{ padding: '10px 0' }}>
                  <label htmlFor="ip_address" style={{ margin: '0 8px' }}>
                    IP address
                  </label>
                </div>
                <div>
                  <TextInput
                    name="ip_address"
                    style={{ width: '100%' }}
                    type="text"
                    onChange={(_event, value) =>
                      setIp_address(value?.currentTarget?.value)
                    }
                    aria-label="Enter IP Address"
                  />
                </div>
              </div>
              <div style={{ width: '50%', padding: '0 20px' }}>
                <div style={{ padding: '10px 0' }}>
                  <label htmlFor="username" style={{ margin: '0 8px' }}>
                    Username
                  </label>
                </div>
                <div>
                  <TextInput
                    name="username"
                    type="text"
                    style={{ width: '100%' }}
                    onChange={(_event, value) =>
                      setUsername(value?.currentTarget?.value)
                    }
                    aria-label="Enter Username"
                  />
                </div>
              </div>
              <div style={{ width: '50%', padding: '0 20px' }}>
                <div style={{ padding: '10px 0' }}>
                  <label htmlFor="password" style={{ margin: '0 8px' }}>
                    Password
                  </label>
                </div>
                <div>
                  <TextInput
                    // value={username}
                    name="password"
                    style={{ width: '100%' }}
                    type="password"
                    onChange={(_event, value) =>
                      setPassword(value?.currentTarget?.value)
                    }
                    aria-label="Enter Password"
                  />
                </div>
              </div>
            </div>
            <Button style={{ margin: '10px 18px' }} onClick={handleSubmit}>
              Submit
            </Button>
          </form>
        </Card>
        {issubmit && (
          <Card style={{ marginTop: 20 }}>
            <ClipboardCopy isReadOnly hoverTip="Copy" clickTip="Copied">
              {inputValue}
            </ClipboardCopy>
          </Card>
        )}
      </PageSection>
    </>
  );
}

export default Generate_api;
