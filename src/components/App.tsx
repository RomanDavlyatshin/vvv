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
// import useOctokit from './github/hooks/use-octokit';
// import useUser from './github/hooks/use-user';
import useLedgerData from '../github/hooks/use-ledger-data';
import connection from '../github/connection';
import FormAddComponent from './forms/add-component';
import FormAddSetup from './forms/add-setup';
import FormAddVersion from './forms/add-version';
import FormAddTest from './forms/add-test';
import Spinner from './spinner';
import User from './user';
import Nothing from './placeholder';
import UpdatedTimer from './refreshed-timer';

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
  const { isLoading, data } = useLedgerData();
  return (
    <div className="p-2">
      {isLoading ? <Spinner>Loading ledger data...</Spinner> : <Ledger data={data} />}
      <div className="row mt-5">
        <div className="col-12 col-md-6 col-xl-3">
          <FormAddComponent />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <FormAddSetup />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <FormAddVersion />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <FormAddTest />
        </div>
      </div>
    </div>
  );
}

function Ledger(props: any) {
  const data = props.data;
  console.log('Ledger render', data);
  if (!data) return <Spinner>No data</Spinner>;
  const { components, setups, versions, tests } = data;
  return (
    <div>
      <UpdatedTimer />
      <Stats label="Components" data={components} />
      <Stats label="Setups" data={setups} />
      <Stats label="Versions" data={versions} />
      <Stats label="Tests" data={tests} />
    </div>
  );
}

function Stats(props: any) {
  return (
    <div style={{}}>
      <h3>{props.label}</h3>
      <div>{Array.isArray(props.data) ? props.data.map((x: any) => renderStat(x)) : '...'}</div>
    </div>
  );
}

function renderStat(z: any) {
  return (
    <div key={z.id}>
      {z.name}
      {z.id && `: ${z.id}`}
    </div>
  );
}

export default App;
