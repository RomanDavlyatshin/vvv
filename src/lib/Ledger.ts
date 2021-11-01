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
import { b64_to_utf8, utf8_to_b64 } from './util';

// class TokenObtainer {
//   token: string;

//   getNew() {}
//   discard() {}
// }

type LedgerRepoOptions = { url: string; owner: string; name: string };

export type LedgerData = {
  components: Record<string, any>[];
  versions: Record<string, any>[];
  setups: Setup[];
  tests: Record<string, any>[];
};

type Setup = {
  id: string;
  name: string;
  components: ComponentIds;
};

type ComponentIds = string[];

export default async function getLedger(octokitAuthToken: string, ledgerRepo: LedgerRepoOptions) {
  const ledger = new Ledger({
    octokitAuthToken,
    ledgerRepo,
  });
  await ledger.init();
  return ledger;
}

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

  constructor(options: { octokitAuthToken: string; ledgerRepo: LedgerRepoOptions }) {
    const { octokitAuthToken, ledgerRepo } = options;
    this.auth = octokitAuthToken;
    this.ledgerRepo = ledgerRepo;
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

  private checkData(data: any): data is LedgerData {
    return (
      data &&
      Array.isArray((data as LedgerData).components) &&
      Array.isArray((data as LedgerData).versions) &&
      Array.isArray((data as LedgerData).setups) &&
      Array.isArray((data as LedgerData).tests)
    );
  }

  public async addComponent(data: Record<string, unknown>) {
    if (!this.checkData(this.data)) {
      throw new Error(`No local data; Check internet connection and make sure that Github and ${this.ledgerRepo.url} are reachable`);
    }

    const alreadyExists = this.data.components.findIndex(x => x.id === data.id || x.name === data.name) > -1;
    if (alreadyExists) {
      throw new Error('Component with the same id or name already exists');
    }

    await this.addTo('components', data);
  }

  public async addSetup(rawData: Setup) {
    if (!this.checkData(this.data)) {
      throw new Error(`No local data; Check internet connection and make sure that Github and ${this.ledgerRepo.url} are reachable`);
    }

    const alreadyExists = this.data.setups.findIndex(x => x.id === rawData.id || x.name === rawData.name) > -1;
    if (alreadyExists) {
      throw new Error('Setup with the same id or name already exists');
    }

    if (!Array.isArray(rawData.components) || rawData.components.length === 0) {
      throw new Error('Components array must contain at least one component id');
    }

    // check for components list uniqueness
    // TODO use real hashing
    const getComponentsHash = (components: ComponentIds) => {
      let str = '';
      for (let i = 0; i < components.length; i++) {
        str += components[i];
      }
      return str;
    };
    const newHash = getComponentsHash(rawData.components);
    const isUnique =
      this.data.setups
        .map(x => x.components)
        .map(getComponentsHash)
        .findIndex(hash => hash === newHash) === -1;

    if (!isUnique) {
      throw new Error('Setup with the same list of components already exist');
    }

    debugger;

    const data = {
      ...rawData,
      components: (rawData as any).components.sort(),
    };

    await this.addTo('setups', data);
  }

  // public async addSetup() {
  //   await this.addTo('setups', {
  //     id: 'single-java-agent',
  //     name: 'Single Java Agent',
  //     components: ['admin-backend', 'admin-ui', 'java-agent', 'java-autotest-agent'],
  //   });
  // }

  public async addVersion() {
    await this.addTo('versions', { date: Date.now(), id: 'admin-backend', tag: '0.8.1-215', hash: 'hash-unique1' });
  }

  // public async addTest(sha) {
  // this.fetch()
  // false sense of security?
  // if (this.sha !== sha) throw new Error('data has changed since last fetch')
  public async addTest() {
    await this.addTo('tests', {
      date: Date.now(),
      status: 'passed',
      setup: 'single-java-agent',
      versions: [
        {
          'admin-backend': 'hash-unique1',
        },
        {
          'admin-ui': 'hash-unique2',
        },
        {
          'java-agent': 'hash-unique3',
        },
        {
          'java-autotest-agent': 'hash-unique4',
        },
      ],
    });
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
