import 'styled-components/macro';
import React from 'react';
import { Modal, Title } from '@patternfly/react-core';
import styled from 'styled-components';

function DataModal({ onClose, isOpen }) {
  const Header = styled.div`
    display: flex;
    svg {
      margin-right: 16px;
    }
  `;
  const customHeader = (
    <Header>
      <Title id="alert-modal-header-label" size="2xl" headingLevel="h2">
        Firewall Data
      </Title>
    </Header>
  );
  return (
    <Modal
      header={customHeader}
      aria-label={`Alert modal`}
      aria-labelledby="alert-modal-header-label"
      isOpen={isOpen}
      variant="small"
      title="Firewall Data"
      ouiaId="alert-modal"
      onClose={onClose}
    >
      <p>Hey DAta</p>
    </Modal>
  );
}

export default DataModal;
