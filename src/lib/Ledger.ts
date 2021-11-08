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
import semver from 'semver';
import { LedgerRepoOptions, LedgerData, Setup, RawVersion, RawTestResult, Component, Version } from './types';
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

  // PREPARE/ GH INTERFACING
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

  private async addTo(property: string, value: any) {
    const newData = {
      ...this.data,
      [property]: [...(this.data as any)[property], value],
    };

    const response = await (this.octokit as any).request(
      `PUT /repos/${this.ledgerRepo.owner}/${this.ledgerRepo.name}/contents/${this.ledgerFilePath}`,
      {
        message: `new ${property}`,
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

  // CREATE
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
        .findIndex(x => x === newHash) === -1;

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
      componentIds: rawSetupData.componentIds.sort(),
    };

    await this.addTo('setups', data);
  }

  public async addVersion(data: RawVersion) {
    if (!this.checkData(this.data)) {
      throw new Error(`No local data; Check internet connection and make sure that Github and ${this.ledgerRepo.url} are reachable`);
    }

    const { componentId, tag } = data;
    if (!this.isComponentExists(componentId)) {
      throw new Error(`Component with id "${componentId}" does not exist`);
      // const msg = `Component with id ${componentId} does not exist, but it will be added automatically. Later, you can edit it's parameters manually`;
      // this.warning(msg);
      // await this.addComponent({ id: componentId, name: componentId });
    }

    const existingVersion = this.findComponentVersion(componentId, tag);
    if (existingVersion) {
      const msg = `
      Version ${componentId}:${tag} already exists.
      It was created at ${dayjs(existingVersion.date).format('DD/MM/YY hh:mm:ss')}.
      Duplicate version will be added and take priority over the previous one.
      But you will still able to see it in the version table.
    `;
      this.warning(msg);
    }

    await this.addTo('versions', { date: Date.now(), componentId, tag });
  }

  public async addTest(data: RawTestResult) {
    if (!this.checkData(this.data)) {
      throw new Error(`No local data; Check internet connection and make sure that Github and ${this.ledgerRepo.url} are reachable`);
    }

    // existing setup
    const isSetupExists = this.data.setups.findIndex(x => x.id === data.setupId) > -1;
    if (!isSetupExists) {
      const msg = `Setup with id ${data.setupId} doesn't exists.
      Test result will be saved, but will only be visible in raw tests data table.
      Make sure to add ${data.setupId} to setups list.`;
      this.warning(msg);
    }

    // non-empty status
    if (!data.status || typeof data.status !== 'string') {
      throw new Error('Test result must contain non-empty status string');
    }

    throw new Error('CHECK ALL COPONENTS');
    if (Object.keys(data.componentVersionMap).length === 0) {
      throw new Error('Please, specify component versions');
    }

    // existing component versions
    let errorMsg = '';
    for (const componentId in data.componentVersionMap) {
      const versionTag = data.componentVersionMap[componentId];
      const version = this.findComponentVersion(componentId, versionTag);
      if (!version) {
        errorMsg = `${componentId}:${versionTag} does not exists!\n`;
      }
    }
    if (errorMsg) {
      errorMsg += `Test result will be saved, but make sure to add these versions`;
      this.warning(errorMsg);
    }

    await this.addTo('tests', {
      date: Date.now(),
      ...data,
    });
  }

  // GET
  public getLatestComponentVersion(componentId: string) {
    if (!this.data) throw new Error('no data'); // FIXME
    return this.data.versions.filter(x => x.componentId === componentId).sort((a, b) => semver.compare(b.tag, a.tag))[0];
  }

  public getLatests(setupId?: string): Version[] {
    if (!this.data) throw new Error('no data'); // FIXME

    if (setupId) {
      const setup = this.data.setups.find(x => setupId === x.id);
      if (!setup) {
        throw new Error('CRITICAL ERROR: setup with ID not found. Normally, this should not happen. Please contact the development team');
      }
      return setup.componentIds.map(this.getLatestComponentVersion);
    }
    return this.data.components.map(x => x.id).map(this.getLatestComponentVersion);
  }

  public getSetupComponents(setupId: string) {
    if (!this.data) throw new Error('no data'); // FIXME
    const setup = this.data.setups.find(x => x.id === setupId);
    if (!setup) {
      throw new Error(`setup with id "${setupId}" is not found`);
    }
    const components = this.data.components.filter(x => setup.componentIds.includes(x.id));
    if (components.length === 0) {
      this.warning(`getSetupComponents(): setup ${setupId} appears to have no components`);
    }
    return components;
  }

  public getSetupTests(setupId: string) {
    if (!this.data) throw new Error('no data'); // FIXME
    return this.data.tests.filter(x => x.setupId === setupId);
  }

  private findComponentVersion(componentId: string, versionTag: string) {
    if (!this.data) throw new Error('no data'); // FIXME
    const componentVersions = this.data.versions.filter(x => x.componentId === componentId);
    const existingVersion = componentVersions.find(x => x.tag === versionTag);
    return existingVersion;
  }

  // MISC
  private checkData(data: any): data is LedgerData {
    return (
      data &&
      Array.isArray((data as LedgerData).components) &&
      Array.isArray((data as LedgerData).versions) &&
      Array.isArray((data as LedgerData).setups) &&
      Array.isArray((data as LedgerData).tests)
    );
  }

  // TODO deal with polymorphic function signature phobia
  private isComponentExists(id: string, name?: string) {
    if (!this.data) throw new Error('no data'); // FIXME

    if (name) {
      return this.data.components.findIndex(x => x.id === id && x.name === name) > -1;
    }

    return this.data.components.findIndex(x => x.id === id) > -1;
  }

  private warning(msg: string) {
    this.isCli ? console.warn(msg) : alert(msg);
    return;
  }
}
