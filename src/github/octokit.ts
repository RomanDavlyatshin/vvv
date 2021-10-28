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
import gitConnect from './third-party/git-connect/git-connect';
import { Octokit } from '@octokit/core';

const { REACT_APP_GITHUB_OAUTH_APP_CLIENT_ID, REACT_APP_GITHUB_OAUTH_APP_PROXY, REACT_APP_GITHUB_OAUTH_APP_SCOPES } = process.env;
const connection = gitConnect({
  client_id: REACT_APP_GITHUB_OAUTH_APP_CLIENT_ID,
  proxy: REACT_APP_GITHUB_OAUTH_APP_PROXY,
  scope: REACT_APP_GITHUB_OAUTH_APP_SCOPES,

  //expires: 7,  //optional, default: 7; the number of days after cookies expire

  //this options are used and required only for `git-edit` module
  // owner: 'github_username',  //application owner's github username
  // reponame: 'github_reponame', //application's repository name
});

let instance: Octokit;
function getInstance() {
  if (!connection.isConnected()) return false;
  if (instance) return instance;
  const auth = connection.getCookie('github_access_token');
  instance = new Octokit({ auth });
  return instance;
}

function connect() {
  if (!connection.isConnected()) connection.connect();
}

function disconnect() {
  if (connection.isConnected()) connection.disconnect();
}

export interface Connector {
  getInstance: () => false | Octokit;
  connect: () => void;
  disconnect: () => void;
  isConnected: () => boolean;
}

const connector: Connector = {
  getInstance,
  connect,
  disconnect,
  isConnected: () => connection.isConnected(),
};

export default connector;
