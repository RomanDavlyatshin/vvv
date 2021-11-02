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
// const ledger = new Ledger({
//   auth: PERSONAL_ACCESS_TOKEN,
//   ledgerRepoUrl: LEDGER_REPO_URL,
// });
// await ledger.load();

import { Octokit } from '@octokit/core';
import { LedgerRepoOptions, LedgerData, Setup, RawVersion, RawTestResult, Component } from './types';
import { b64_to_utf8, utf8_to_b64 } from './util';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export default async function getLedger(octokitAuthToken: string, ledgerRepo: LedgerRepoOptions) {
  const ledger = new Ledger({
    octokitAuthToken,
    ledgerRepo,
    isCli: false,
  });
  await ledger.init();
  return ledger;
}

type LedgerConstructorOptions = { octokitAuthToken: string; ledgerRepo: LedgerRepoOptions; isCli?: boolean };
export class Ledger {
  private octokit: Octokit | undefined;
  private auth: string;
  private ledgerRepo: LedgerRepoOptions;

  private ledgerFilePath: string = 'ledger.json';
  private defaultData: LedgerData = {
    components: [],
    versions: [],
    setups: [],
    tests: [],
  };

  public data: LedgerData | undefined; // FIXME private
  private sha: string | undefined;

  private isCli: boolean;

  constructor(options: LedgerConstructorOptions) {
    const { octokitAuthToken, ledgerRepo, isCli = true } = options;
    this.auth = octokitAuthToken;
    this.ledgerRepo = ledgerRepo;
    this.isCli = isCli;
  }

  public init() {
    if (this.octokit) return;
    this.octokit = new Octokit({ auth: this.auth });
  }

  public getOctokitInstance() {
    if (!this.octokit) throw new Error('You are not authorized with GitHub account');
    return this.octokit;
  }

  public async fetch() {
    if (!this.octokit) return;
    const response = await this.octokit.request(
      `GET /repos/${this.ledgerRepo.owner}/${this.ledgerRepo.name}/contents/${this.ledgerFilePath}`,
    );
    if (response.status !== 200) {
      throw new Error(`Failed to load ledger data: ${response.data.error}`);
    }
    this.data = this.deserialize(response.data.content);
    this.sha = response.data.sha;
    return this;
  }

  public async addComponent(data: Component) {
    if (!this.checkData(this.data)) {
      throw new Error(`No local data; Check internet connection and make sure that Github and ${this.ledgerRepo.url} are reachable`);
    }

    if (this.isComponentExists(data.id, data.name)) {
      throw new Error('Component with the same id or name already exists');
    }

    await this.addTo('components', data);
  }

  public async addSetup(rawSetupData: Setup) {
    if (!this.checkData(this.data)) {
      throw new Error(`No local data; Check internet connection and make sure that Github and ${this.ledgerRepo.url} are reachable`);
    }

    if (!Array.isArray(rawSetupData.componentIds) || rawSetupData.componentIds.length === 0) {
      throw new Error('Components array must contain at least one component id');
    }

    const alreadyExists = this.data.setups.findIndex(x => x.id === rawSetupData.id || x.name === rawSetupData.name) > -1;
    if (alreadyExists) {
      throw new Error('Setup with the same id or name already exists');
    }

    // check for components list uniqueness
    // TODO use real hashing
    const getComponentsHash = (components: string[]) => {
      let str = '';
      for (let i = 0; i < components.length; i++) {
        str += components[i];
      }
      return str;
    };
    const newHash = getComponentsHash(rawSetupData.componentIds);
    const isUnique =
      this.data.setups
        .map(x => x.componentIds)
        .map(getComponentsHash)
        .findIndex(hash => hash === newHash) === -1;

    if (!isUnique) {
      throw new Error('Setup with the same list of components already exist');
    }

    // validate components existence
    const nonExistentComponents = rawSetupData.componentIds.filter(x => !this.isComponentExists(x));
    if (nonExistentComponents.length > 0) {
      throw new Error(`Components with the following ids do not exist:\n${nonExistentComponents.join('\n')}`);
    }

    const data = {
      ...rawSetupData,
      components: rawSetupData.componentIds.sort(),
    };

    await this.addTo('setups', data);
  }

  // TODO deal with polymorphic function signature phobia
  private isComponentExists(id: string, name?: string) {
    if (!this.data) throw new Error('no data'); // FIXME

    if (name) {
      return this.data.components.findIndex(x => x.id === id && x.name === name) > -1;
    }

    return this.data.components.findIndex(x => x.id === id) > -1;
  }

  public async addVersion(data: RawVersion) {
    if (!this.checkData(this.data)) {
      throw new Error(`No local data; Check internet connection and make sure that Github and ${this.ledgerRepo.url} are reachable`);
    }

    const { component, tag } = data;
    if (!this.isComponentExists(component)) {
      const msg = `Component with id ${component} doesn't exists, but it will be added automatically. Later, you can edit it's parameters manually`;
      this.isCli ? console.warn(msg) : alert(msg);
      await this.addComponent({ id: component, name: component });
    }

    const existingVersion = this.findComponentVersion(component, tag);
    if (existingVersion) {
      const msg = `
      Version ${component}:${tag} already exists.
      It was created at ${dayjs(existingVersion.date).format('DD/MM/YY hh:mm:ss')}.
      Duplicate version will be added and take priority over the previous one.
      But you will still able to see it in the version table.
    `;
      this.isCli ? console.warn(msg) : alert(msg);
    }

    await this.addTo('versions', { date: Date.now(), component, tag });
  }

  public async getLatestComponentVersion(componentId: string) {
    if (!this.data) throw new Error('no data'); // FIXME
    // TODO sort
    return this.data.versions.find(version => version.component === componentId);
  }

  public async addTest(data: RawTestResult) {
    if (!this.checkData(this.data)) {
      throw new Error(`No local data; Check internet connection and make sure that Github and ${this.ledgerRepo.url} are reachable`);
    }

    // existing setup
    const isSetupExists = this.data.setups.findIndex(setup => setup.id === data.setupId) > -1;
    if (!isSetupExists) {
      const msg = `Setup with id ${data.setupId} doesn't exists.
      Test result will be saved, but will only be visible in raw tests data table.
      Make sure to add ${data.setupId} to setups list.`;
      this.isCli ? console.warn(msg) : alert(msg);
    }

    // non-empty status
    if (!data.status || typeof data.status !== 'string') {
      throw new Error('Test result must contain non-empty status string');
    }

    // existing component versions
    let errorMsg = '';
    for (const component in data.componentVersionMap) {
      const versionTag = data.componentVersionMap[component];
      const version = this.findComponentVersion(component, versionTag);
      if (!version) {
        errorMsg = `${component}:${versionTag} does not exists!\n`;
      }
    }
    if (errorMsg) {
      errorMsg += `Test result will be saved, but make sure to add these versions`;
      this.isCli ? console.warn(errorMsg) : alert(errorMsg);
    }

    await this.addTo('tests', {
      date: Date.now(),
      ...data,
    });
  }

  private checkData(data: any): data is LedgerData {
    return (
      data &&
      Array.isArray((data as LedgerData).components) &&
      Array.isArray((data as LedgerData).versions) &&
      Array.isArray((data as LedgerData).setups) &&
      Array.isArray((data as LedgerData).tests)
    );
  }

  private findComponentVersion(component: string, versionTag: string) {
    if (!this.data) throw new Error('no data'); // FIXME
    const componentVersions = this.data.versions.filter(version => version.component === component);
    const existingVersion = componentVersions.find(version => version.tag === versionTag);
    return existingVersion;
  }
  private async addTo(property: string, value: any, message = 'by Drill4J@VVVBot') {
    const newData = {
      ...this.data,
      [property]: [...(this.data as any)[property], value],
    };

    const response = await (this.octokit as any).request(
      `PUT /repos/${this.ledgerRepo.owner}/${this.ledgerRepo.name}/contents/${this.ledgerFilePath}`,
      {
        message,
        content: this.serialize(newData as any),
        sha: this.sha,
      },
    );
    if (response.status !== 200) {
      throw new Error(`Failed to update ledger data: ${response.data.error}`);
    }

    const check = await (this.octokit as any).request(
      `GET /repos/${this.ledgerRepo.owner}/${this.ledgerRepo.name}/contents/${this.ledgerFilePath}`,
    );

    (this.data as any) = newData;
    this.sha = response.data.content.sha;

    if (this.sha !== check.data.sha) {
      const msg = 'CRITICAL ERROR: post-update SHA check failed. Open development console, copy error log and contact the development team';
      console.error(msg, '\n', 'response data', '\n', response, '\n', 'check data', '\n', check, '\n', '---CRITICAL ERROR LOG END---');
      throw new Error(msg);
    }
  }

  private deserialize(rawData: any): LedgerData {
    return JSON.parse(b64_to_utf8(rawData));
  }

  private serialize(data: LedgerData): string {
    return utf8_to_b64(JSON.stringify(data));
  }

  // private test() {
  // console.log('adding...');
  // const c = [];
  // for (let i = 0; i < 10; i++) {
  //   const start = Date.now();
  //   const check = [];
  //   for (let index = 0; index < 10; index++) {
  //     const { a, b } = await this.addTo('components', { name: `Drill4J Admin Backend ${i} - ${index}`, id: 'admin-backend' });
  //     check.push(a === b);
  //   }
  //   const elapsed = Date.now() - start;
  //   console.log('elapsed', elapsed, check);
  //   let f = check.reduce((a, x) => a && x, true);
  //   c.push(f);
  //   console.log('reduced', f);
  //   await this.sleep(60 * 1000);
  // }
  // console.log('done', c);
  // }

  // sleep(ms: number) {
  //   console.log('sleep ms', ms);
  //   return new Promise((resolve, reject) => {
  //     setTimeout(() => {
  //       resolve(null);
  //     }, ms);
  //   });
  // }
}
