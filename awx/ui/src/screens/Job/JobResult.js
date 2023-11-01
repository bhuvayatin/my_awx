/* eslint-disable react/jsx-no-useless-fragment */
import React, { useEffect } from 'react';
import { t } from '@lingui/macro';
import { Tr, Td } from '@patternfly/react-table';
import styled from 'styled-components';
import { CardBody as _CardBody } from 'components/Card';
import DatalistToolbar from 'components/DataListToolbar';
import PaginatedTable, {
  HeaderRow,
  HeaderCell,
} from 'components/PaginatedTable';
import { getJobModel } from 'util/jobs';
import { getQSConfig } from 'util/qs';

const QS_CONFIG = getQSConfig('job_output', {
  order_by: 'counter',
});

const CardBody = styled(_CardBody)`
  display: flex;
  flex-flow: column;
  height: calc(100vh - 267px);
`;

function JobResult({job, result, setResult}) {

  useEffect(() => {
    async function fetchData() {
      if (result) {
        return;
      }
      const response = await getJobModel(job.type).readEvents(job.id, {
        order_by: '-counter',
        limit: 5000000
      });
      const events = response.data.results;
      events.forEach((event) => {
        if (event.event_data?.res?.awx_result) {
          setResult(event.event_data.res.awx_result);
        }
      });
    }
    fetchData();
  }, [job.finished]);

  const columns = result?.columns.map(column => (
    {
      name: column.name,
      key: t`${column.rowKey}__icontains`
    }
  ));

  if (columns && columns.length) {
    columns[0].isDefault = true;
  }

  return !result?.rows
  ?
    <div style={{ width: "100%", display: "flex" }}>
      <CardBody>
        {job.finished ? "This job did not produce a result." : "Job is currently running..."}
      </CardBody>
    </div>
  : (
    <>
      <div style={{ width: "100%", display: "flex" }}>
        <CardBody>
          <PaginatedTable
            items={result.rows}
            itemCount={result.rows.length}
            pluralizedItemName={t`Results`}
            qsConfig={QS_CONFIG}
            // toolbarSearchColumns={columns}
            // toolbarSortColumns={columns}
            headerRow={
              <HeaderRow qsConfig={QS_CONFIG}>
                {result?.columns.map(column => (
                  <HeaderCell>{column.name ? column.name : column.rowKey}</HeaderCell>
                ))}
              </HeaderRow>
            }
            renderToolbar={(props) => (
              <DatalistToolbar
                {...props}
                qsConfig={QS_CONFIG}
              />
            )}
            renderRow={(row) => (
              <Tr>
                <Td />
                {result?.columns.map(column => (
                  <Td dataLabel={column.name || column.rowKey}>
                    {(Object.prototype.hasOwnProperty.call(row, column.rowKey) ? String(row[column.rowKey]) : '' )}
                  </Td>
                ))}
              </Tr>
            )}
          />
        </CardBody>
      </div>
    </>
  );
}

export default JobResult;