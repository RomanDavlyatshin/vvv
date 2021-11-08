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
import { useTable, usePagination } from 'react-table';
import ElapsedTimer from '../elapsed-timer';
import { Component, Version } from '../../lib/types';
import Question from '../question';
import { T } from './styles';
import { ColumnDetails } from './types';
import { Pagination } from './Pagination';
import { sortBy } from './util';

type VersionTableProps = {
  components: Component[];
  versions: Version[];
};

export default function VersionTable(props: VersionTableProps) {
  const { components, versions } = props;

  const data = React.useMemo<ColumnDetails[]>(
    () =>
      versions.sort(sortBy('date')).map(x => ({
        release: x.date,
        [x.componentId]: x.tag,
      })),
    [], // FIXME
  );

  const columns = React.useMemo(
    () => [
      {
        Header: 'Release date',
        accessor: 'release',
        Cell: (props: any) => {
          return <ElapsedTimer start={props.row.values.release} />;
        },
      },
      ...components.map(c => ({ Header: c.name, accessor: c.id })),
    ],
    [], // FIXME
  );

  const tableInstance = useTable({ columns, data, initialState: { pageSize: 5 } } as any, usePagination);
  const { getTableProps, getTableBodyProps, headerGroups, prepareRow } = tableInstance;
  const { page }: any = tableInstance;

  // FIXME useMemo gets called in vain
  if (components.length === 0) {
    return <div>no components</div>;
  }
  if (versions.length === 0) {
    return <div>no versions</div>;
  }

  return (
    <div>
      <Question>
        <span>1. Filter tags "stable only" | "prerelease" | "experimental", etc</span>
        <br />
        <span>2. Allow sorting by either date or semver</span>
        <br />
        <span>3. Display latests row in setups</span>
      </Question>
      <table {...getTableProps()}>
        <thead>
          {headerGroups.map(headerGroup => (
            <T.Tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map(column => (
                <T.Th {...column.getHeaderProps()}>{column.render('Header')}</T.Th>
              ))}
            </T.Tr>
          ))}
        </thead>
        {/* Apply the table body props */}
        <tbody {...getTableBodyProps()}>
          {page.map((row: any) => {
            prepareRow(row);
            return (
              <T.Tr {...row.getRowProps()}>
                {row.cells.map((cell: any) => {
                  return <T.Td {...cell.getCellProps()}>{cell.render('Cell')}</T.Td>;
                })}
              </T.Tr>
            );
          })}
        </tbody>
      </table>
      <Pagination tableInstance={tableInstance} />
    </div>
  );
}
