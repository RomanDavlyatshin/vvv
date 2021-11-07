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
import { Component, Version } from '../../lib/types';
import Question from '../Question';

interface ColumnDetails {
  [key: string]: unknown;
}

const C = {
  white: 'rgb(204, 204, 204)',
  shade1: `rgb(60, 60, 60)`,
  shade2: `rgb(45, 45, 45)`,
  shade3: `rgb(30, 30, 30)`,

  green: `rgb(106, 138, 85)`,

  blue1: `rgb(59 75 86)`,
  blue2: `rgb(61 100 126)`,
  blue3: `rgb(14 99 156)`,
};

const L = {
  paddingSm: `7px`,
  paddingMd: `15px`,
};

const S = {
  td: styled.td`
    background-color: ${C.shade2};
    border: 1px solid ${C.shade3};
    color: ${C.white};
    padding: ${L.paddingSm} ${L.paddingMd};
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

  const tableInstance = useTable({ columns, data });
  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } = tableInstance;

  return (
    <div>
      <Question>
        <span>Display "latests" row</span>
        <span>| by date? by semver tag?</span>
        <span>| add filtering and sorting?</span>
        <span>| or display this data ONLY in SETUPS?</span>
      </Question>
      <table {...getTableProps()}>
        <thead>
          {headerGroups.map(headerGroup => (
            <S.tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map(column => (
                <S.th {...column.getHeaderProps()}>{column.render('Header')}</S.th>
              ))}
            </S.tr>
          ))}
        </thead>
        {/* Apply the table body props */}
        <tbody {...getTableBodyProps()}>
          {rows.map(row => {
            prepareRow(row);
            return (
              <S.tr {...row.getRowProps()}>
                {row.cells.map(cell => {
                  return <S.td {...cell.getCellProps()}>{cell.render('Cell')}</S.td>;
                })}
              </S.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
