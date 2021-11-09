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
import styled from 'styled-components';

import useLedgerData from '../github/hooks/use-ledger-data';
import connection from '../github/connection';

import Spinner from './spinner';
import User from './user';
import Nothing from './placeholder';

import FormAddComponent from './forms/add-component';
import FormAddSetup from './forms/add-setup';
import FormAddVersion from './forms/add-version';
import FormAddTest from './forms/add-test';
import VersionTable from './tables/version';
import ElapsedTimer from './elapsed-timer';
import SetupTestsTable from './tables/setup-tests';
import { C } from './styles';
import { LedgerData } from '../lib/types';
import NoRender from './no-render';

function App() {
  return (
    <div>
      <div className="header">
        <div style={{ marginRight: '15px' }}>
          {!connection.isConnected() ? ( // TODO useConnection
            <button onClick={() => connection.connect()}>Authenticate using GitHub</button>
          ) : (
            <button onClick={() => connection.disconnect()}>GitHub Logout</button>
          )}
        </div>
        <User />
      </div>
      <div className="main-ui">{connection.isConnected() ? <RenderStuff /> : <Nothing authenticate={() => connection.connect()} />}</div>
    </div>
  );
}

function RenderStuff() {
  const { isLoading, data, ledger } = useLedgerData();
  if (isLoading || !ledger) return <Spinner>Loading ledger data...</Spinner>;

  if (!data) return <Spinner>ledger.json is not initialized. Make sure to follow setup instructions or contact dev team</Spinner>;

  return (
    <div className="px-2">
      <div>
        Refreshed <ElapsedTimer />
      </div>
      <JSONDataStyled>
        <NoRender label="Debug Data">
          <JSONData data={data} />
        </NoRender>
      </JSONDataStyled>
      {/*SETUPS  */}
      <h3 className="mt-3">SETUPS</h3>
      <div className="row">
        {data.setups.map(setup => {
          const setupTests = ledger.getSetupTests(setup.id);
          return (
            <div className="col-12 col-md-6 col-xl-4 mb-3" key={setup.id}>
              <h5>{setup.name}</h5>
              <SetupTestsTable setup={setup} tests={setupTests} />
            </div>
          );
        })}
      </div>
      <h3 className="mt-3">VERSIONS</h3>
      <VersionTable versions={data.versions} components={data.components} ledger={ledger} />

      {/*FORMS  */}
      <div className="row mt-5">
        <div className="col-12 col-md-6 col-xl-3">
          <FormAddComponent ledger={ledger} data={data} />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <FormAddSetup ledger={ledger} data={data} />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <FormAddVersion ledger={ledger} data={data} />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <FormAddTest ledger={ledger} data={data} />
        </div>
      </div>
    </div>
  );
}

const JSONDataStyled = styled.div`
  position: fixed;
  top: 0;
  right: 0;
  font-size: 12px;
  background-color: rgb(0, 0, 0);
  overflow-y: auto;
  max-height: 30vh;
`;
function JSONData({ data }: { data: LedgerData }) {
  return (
    <div className="row">
      <div className="col-3">
        <div>Components</div>
        <Stats label="Components" data={data.components} />
      </div>
      <div className="col-3">
        <div>Setups</div>
        <Stats label="Setups" data={data.setups} />
      </div>
      <div className="col-3">
        <div>Versions</div>
        <Stats label="Versions" data={data.versions} keyProp="date" />
      </div>
      <div className="col-3">
        <div>Tests</div>
        <Stats label="Tests" data={data.tests} keyProp="date" />
      </div>
    </div>
  );
}
function Stats(props: any) {
  const { data, keyProp = 'id' } = props;
  if (!Array.isArray(data)) return <>{'...'}</>;
  return <div>{data.map((x: any) => renderStat(x[keyProp], x))}</div>;
}

function renderStat(key: string, data: any) {
  return (
    <div className="mb-2" key={key}>
      {JSON.stringify(data)},
    </div>
  );
}

export default App;
