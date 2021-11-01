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
import * as dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useState, useEffect } from 'react';

dayjs.extend(relativeTime);

export default function UpdatedTimer(props: any) {
  const [elapsedStr, setElapsedStr] = useState('now');
  const updateFrequency = 1000 * 30;

  useEffect(() => {
    const start = new (dayjs as any)(); // TODO fix dayjs import issue
    setInterval(() => {
      setElapsedStr(start.fromNow());
    }, updateFrequency);
  }, [updateFrequency]);

  return (
    <div>
      Updated <span style={{ color: 'rgb(226,180,128)' }}>{elapsedStr}</span>
    </div>
  );
}
