import React, { useCallback, useState } from 'react';
import { Route, Switch } from 'react-router-dom';
import {
  Card,
  PageSection,
} from '@patternfly/react-core';
import { t } from '@lingui/macro';
import ScreenHeader from 'components/ScreenHeader/ScreenHeader';
import PersistentFilters from 'components/PersistentFilters/PersistentFilters';
import ComposableTableTree from './LegacyTableTree';

function Firewalls() {
  const [breadcrumbConfig, setBreadcrumbConfig] = useState({
    '/firewalls': t`Update Firewalls`,
  });

  const buildBreadcrumbConfig = useCallback((host) => {
    if (!host) {
      return;
    }
    setBreadcrumbConfig({
      '/firewalls': t`Update Firewalls`,
    });
  }, []);

  return (
    <>
      <ScreenHeader
        streamType="firewalls"
        breadcrumbConfig={breadcrumbConfig}
      />
      <Switch>
        <Route path="/firewalls">
          <PersistentFilters pageKey="firewalls">
            <PageSection>
              <Card>
                <ComposableTableTree />
              </Card>
            </PageSection>
          </PersistentFilters>
        </Route>
      </Switch>
    </>
  );
}

export default Firewalls;