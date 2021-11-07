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
      <div className="main-ui">{connection.isConnected() ? <RenderStuff /> : <Nothing />}</div>
    </div>
  );
}

function RenderStuff() {
  const { isLoading, data, ledger } = useLedgerData();
  if (isLoading || !ledger) return <Spinner>Loading ledger data...</Spinner>;

  if (!data) return <Spinner>ledger.json is not initialized. Make sure to follow setup instructions or contact dev team</Spinner>;

  const { components, setups, versions, tests } = data;
  return (
    <div className="px-2">
      <div>
        <div>
          Refreshed <ElapsedTimer />
        </div>
        <Stats label="Components" data={components} />
        <Stats label="Setups" data={setups} />
        <Stats label="Versions" data={versions} keyProp="date" />
        <Stats label="Tests" data={tests} keyProp="date" />
      </div>
      <VersionTable versions={data.versions} components={data.components} />
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

function Stats(props: any) {
  const { label, data, keyProp = 'id' } = props;
  return (
    <div>
      <h3>{label}</h3>
      <div>[{Array.isArray(data) ? data.map((x: any) => renderStat(x[keyProp], x)) : '...'}]</div>
    </div>
  );
}

function renderStat(key: string, data: any) {
  return <div key={key}>{JSON.stringify(data)},</div>;
}

export default App;
