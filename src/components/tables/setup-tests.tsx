/*
 * Copyright 2020 EPAM Systems
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import React from 'react';
import styled from 'styled-components';
import { useTable } from 'react-table';
import ElapsedTimer from '../elapsed-timer';
import { Setup, TestResult } from '../../lib/types';
import ComponentsVersionsMap from '../components-versions-map';
import { C, L } from '../styles';
import NoRender from '../no-render';

interface ColumnDetails {
  [key: string]: unknown;
}

const S = {
  td: styled.td`
    background-color: ${C.shade2};
    border: 1px solid ${C.shade3};
    color: ${C.white};
    padding: ${L.paddingSm} ${L.paddingMd};
    vertical-align: top;
    :empty {
      background-color: rgba(45, 45, 45, 0.8);
    }
  `,
  th: styled.th`
    background-color: ${C.shade2};
    border: 1px solid ${C.shade3};
    color: ${C.white};
    padding: ${L.paddingSm} ${L.paddingMd};
  `,
  tr: styled.tr`
    :hover {
      outline: 4px solid ${C.blue1};
    }
  `,
};

const sortBy = (prop: any) => (b: any, a: any) => b[prop] > a[prop] ? -1 : b[prop] < a[prop] ? 1 : 0;

type VersionTableProps = {
  setup: Setup;
  // components: Component[];
  tests: TestResult[];
};

export default function SetupTestsTable(props: VersionTableProps) {
  const { tests } = props;
  const data = React.useMemo<ColumnDetails[]>(
    () =>
      tests.sort(sortBy('date')).map(x => ({
        date: x.date,
        status: x.status,
        description: x.description,
        componentVersionMap: x.componentVersionMap,
      })),
    [],
  );

  const columns = React.useMemo(
    () => [
      {
        Header: 'Date',
        accessor: 'date', // FIXME redundant?
        Cell: (props: any) => {
          return <ElapsedTimer start={props.row.values.date} />;
        },
      },
      {
        Header: 'Description',
        accessor: 'description',
      },
      {
        Header: 'Status',
        accessor: 'status',
      },
      {
        Header: 'Versions',
        accessor: 'componentVersionMap',
        Cell: (props: any) => {
          return (
            <NoRender label="versions">
              <ComponentsVersionsMap data={props.row.values.componentVersionMap} />
            </NoRender>
          );
        },
      },
      // ...components.map(c => ({ Header: c.name, accessor: c.id })),
    ],
    [],
  );

  const tableInstance = useTable({ columns, data });
  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } = tableInstance;

  return (
    <div>
      <table {...getTableProps()}>
        <thead>
          {
            // Loop over the header rows
            headerGroups.map(headerGroup => (
              // Apply the header row props
              <S.tr {...headerGroup.getHeaderGroupProps()}>
                {
                  // Loop over the headers in each row
                  headerGroup.headers.map(column => (
                    // Apply the header cell props
                    <S.th {...column.getHeaderProps()}>
                      {
                        // Render the header
                        column.render('Header')
                      }
                    </S.th>
                  ))
                }
              </S.tr>
            ))
          }
        </thead>
        {/* Apply the table body props */}
        <tbody {...getTableBodyProps()}>
          {
            // Loop over the table rows
            rows.map(row => {
              // Prepare the row for display
              prepareRow(row);
              return (
                // Apply the row props
                <S.tr {...row.getRowProps()}>
                  {
                    // Loop over the rows cells
                    row.cells.map(cell => {
                      // Apply the cell props
                      return (
                        <S.td {...cell.getCellProps()}>
                          {
                            // Render the cell contents
                            cell.render('Cell')
                          }
                        </S.td>
                      );
                    })
                  }
                </S.tr>
              );
            })
          }
        </tbody>
      </table>
    </div>
  );
}
