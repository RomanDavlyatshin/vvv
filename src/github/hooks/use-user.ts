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
import { useEffect, useState } from 'react';
import OctokitConnector from '../octokit';

export default function () {
  const octokit = OctokitConnector.getInstance();
  const [data, setData] = useState<any>();

  useEffect(() => {
    if (!octokit) return;
    (async () => {
      const response = await octokit.request(`GET /user`);
      if (response.status !== 200) {
        // FIXME
        throw new Error('FIXME');
      }
      setData(response.data);
    })();
  }, [octokit]);

  return data;
}
