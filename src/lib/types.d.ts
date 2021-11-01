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
export type LedgerRepoOptions = { url: string; owner: string; name: string };

export type LedgerData = {
  components: Component[];
  versions: Version[];
  setups: Setup[];
  tests: TestResult[];
};

export type Component = {
  id: string;
  name: string;
};

export type Setup = {
  id: string;
  name: string;
  components: string[];
};

export type RawVersion = {
  component: string;
  tag: string;
};

export type Version = RawVersion & {
  date: string;
};

export type RawTestResult = {
  setupId: string;
  status: string;
  componentVersionMap: Record<string, string>;
};

export type TestResult = RawTestResult & {
  date: string;
};