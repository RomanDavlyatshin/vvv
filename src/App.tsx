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
import useOctokit from './github/hooks/use-octokit';
import useUser from './github/hooks/use-user';
import useLedgerContents from './github/hooks/use-ledger-contents';
import Octokit from './github/octokit';
import './App.css';
import { useState } from 'react';

function App() {
  const connection = useOctokit();
  return (
    <div className="App">
      <header className="App-header">
        {!connection.isConnected() ? (
          <button onClick={() => connection.connect()}>Authenticate using GitHub</button>
        ) : (
          <button onClick={() => connection.disconnect()}>GitHub Logout</button>
        )}
        {connection.isConnected() && <UserData />}
      </header>
    </div>
  );
}

function UserData() {
  const user = useUser();
  const data = useLedgerContents();
  const [isUpdating, setIsUpdating] = useState(false);
  return (
    <div>
      {user ? <div> Hi there {user.login} !</div> : <Spinner> waiting to receive user data... </Spinner>}
      <h2>Ledger</h2>
      <Ledger data={data} />
      <button
        onClick={async () => {
          try {
            setIsUpdating(true);
            await updateLedger(data);
          } catch (e) {
            alert('failed to update ledger ' + (e as any)?.message || JSON.stringify(e));
          } finally {
            setIsUpdating(false);
          }
        }}
      >
        Update Ledger
      </button>
      {isUpdating && <Spinner>Updating ledger...</Spinner>}
    </div>
  );
}

async function updateLedger(data: any) {
  const octokit = Octokit.getInstance();
  if (!octokit) return;

  const { content, sha } = data;
  const { REACT_APP_LEDGER_REPO_OWNER: owner, REACT_APP_LEDGER_REPO_NAME: repo, REACT_APP_LEDGER_REPO_PATH: path } = process.env;

  await octokit.request(`PUT /repos/${owner}/${repo}/contents/${path}`, {
    message: 'foobar',
    content: utf8_to_b64(
      JSON.stringify({
        ...content,
        versions: [...content.versions, { name: 'foo', value: 'bar', date: Date.now() }],
      }),
    ),
    sha,
  });
}

function Spinner(props: any) {
  if (props.children) return <div>{props.children}</div>;
  return <div>...</div>;
}

function Ledger(props: any) {
  const data = props.data;
  if (!data) return <Spinner />;
  if (!data.content) return <Spinner>Ledger content is empty</Spinner>;
  const { components, setups, versions, tests } = data.content;
  return (
    <div>
      <Stats label="Components" data={components} />
      <Stats label="Setups" data={setups} />
      <Stats label="Versions" data={versions} />
      <Stats label="Tests" data={tests} />
    </div>
  );
}

function Stats(props: any) {
  return (
    <div>
      <h3>{props.label}</h3>
      <div>{Array.isArray(props.data) ? props.data.map((x: any) => renderStat(x)) : '...'}</div>
    </div>
  );
}

function renderStat(x: any) {
  return x.map((z: any) => (
    <div>
      {z.name}
      {z.value && `: ${z.value}`}
    </div>
  ));
}

export default App;
