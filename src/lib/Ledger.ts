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

type LedgerData = {
  components: any;
  versions: any;
  setups: any;
  tests: any;
};

let ledger: Ledger;
export default function getLedger(octokitAuthToken: string, ledgerRepo: LedgerRepoOptions) {
  if (ledger) return ledger;
  ledger = new Ledger({
    octokitAuthToken,
    ledgerRepo,
  });
  return ledger;
}

class Ledger {
  octokit: Octokit | undefined;
  auth: string;
  ledgerRepo: LedgerRepoOptions;

  ledgerFilePath: string = 'ledger.json';
  defaultData: LedgerData = {
    components: [],
    versions: [],
    setups: [],
    tests: [],
  };

  data: LedgerData | undefined;
  sha: string | undefined;

  constructor(options: { octokitAuthToken: string; ledgerRepo: LedgerRepoOptions }) {
    const { octokitAuthToken, ledgerRepo } = options;
    this.auth = octokitAuthToken;
    this.ledgerRepo = ledgerRepo;
  }

  public init() {
    if (this.octokit) return;
    this.octokit = new Octokit({ auth: this.auth });
  }

  async fetch() {
    if (!this.octokit) return;
    const response = await this.octokit.request(
      `GET /repos/${this.ledgerRepo.owner}/${this.ledgerRepo.name}/contents/${this.ledgerFilePath}`,
      {
        raw: true,
      },
    );
    if (response.status !== 200) {
      throw new Error(`Failed to load ledger data: ${response.data.error}`);
    }
    this.updateData(response.data);
  }

  public async addComponent() {
    await this.addTo('components', { name: 'Drill4J Admin Backend', id: 'admin-backend' });
  }

  public async addSetup() {
    await this.addTo('setups', {
      id: 'single-java-agent',
      name: 'Single Java Agent',
      components: ['admin-backend', 'admin-ui', 'java-agent', 'java-autotest-agent'],
    });
  }

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

  updateData(data: any) {
    this.data = this.deserialize(data.content);
    this.sha = data.sha;
  }

  async addTo(property: string, value: any, message = 'by Drill4J@VVVBot') {
    if (!this.octokit) return;
    if (!this.data) {
      this.data = this.defaultData;
    }

    (this.data as any)[property] = [...(this.data as any)[property], value];

    const response = await this.octokit.request(
      `PUT /repos/${this.ledgerRepo.owner}/${this.ledgerRepo.name}/contents/${this.ledgerFilePath}`,
      {
        message,
        content: this.serialize(this.data),
        sha: this.sha,
      },
    );
    if (response.status !== 200) {
      throw new Error(`Failed to update ledger data: ${response.data.error}`);
    }
    this.updateData(response.data);
  }

  deserialize(rawData: any): LedgerData {
    return {
      ...rawData.data,
      content: JSON.parse(b64_to_utf8(rawData.content)),
    };
  }

  serialize(data: LedgerData): string {
    return utf8_to_b64(JSON.stringify(data));
  }
}
