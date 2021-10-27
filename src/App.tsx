import React, { useEffect, useState } from 'react';
import logo from './logo.svg';
import './App.css';
import './third-party/git-connect/git-connect'
import { Octokit } from '@octokit/core'

const connection = (window as any).connection({
  client_id: "684e39e0e69952196fd1", //required; your application `client_id` in Github
  proxy: "http://versionion-test-git-proxy.herokuapp.com", //required; Base_URI to your git-proxy server
  scope:'repo,user',
  //scope: 'public_repo,gist', //optional, default: 'public_repo'; Github scopes like repo,gist,user,...
  //expires: 7,  //optional, default: 7; the number of days after coockies expire

  //this options are used and required only for `git-edit` module
  // owner: 'github_username',  //application owner's github username
  // reponame: 'github_reponame', //application's repository name
});

function App() {

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        {!connection.isConnected()
          ? <button onClick={() => githubLogin()}>Authenticate using GitHub</button>
          : <button onClick={() => githubLogout()}>GitHub Logout</button>
        }
        {connection.isConnected() && <UserData/>}
      </header>
    </div>
  );
}
function b64_to_utf8( str ) {
  return decodeURIComponent(escape(window.atob( str )));
}
function UserData() {
  const [data, setData] = useState('');
  useEffect(() => {
    (async ()=> {
      const auth = getCookie('github_access_token');
      const octokit = new Octokit({ auth });

      const owner = 'RomanDavlyatshin';
      const repo = 'ledger';
      const path = 'ledger.json';

      const {
        data,
      } = await octokit.request(`GET /repos/${owner}/${repo}/contents/${path}`, {
        raw: true
      });

      console.log(b64_to_utf8(data));
      console.log(b64_to_utf8(data.contents));
      debugger;
      // const {
      //   data: { login },
      // } = await octokit.request("GET /user");
      // setData(login);
    })()
  }, []);
  return (
    <div>
      <div>data</div>
      { data ? <div> Hi there {data} !</div> : <div> waiting to receive user data... </div> }
      {/* <div>{data.map((x, i) => <div>i</div>)}</div> */}
      <div>end</div>
    </div>
  )
}

function getCookie(name: string) {
  if (!document.cookie) return;
  const cookies = document.cookie.split(';');
  for (let i = 0; i < cookies.length; i++) {
    const [key, value] = cookies[i].split('=');
    if (key === name) return value;
  }
}

function githubLogin() {  
  if (connection.isConnected()) {
    alert('already logged in');
    return;
  }
  connection.connect();
}

function githubLogout() {  
  if (!connection.isConnected()) {
    alert('already logged out');
    return;
  }
  connection.disconnect();
}

export default App;
