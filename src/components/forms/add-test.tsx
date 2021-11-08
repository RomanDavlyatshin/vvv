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
import { Formik, Form, Field, ErrorMessage } from 'formik';
import SelectField from './generic/select-field';
import Spinner from '../spinner';
import { Component, LedgerData } from '../../lib/types';
import { useState } from 'react';
import { Ledger } from '../../lib/ledger';
import { startsWith, stripPrefix } from './util';
import Question from '../question';

export default (props: { ledger: Ledger; data: LedgerData }) => {
  if (!Array.isArray(props.data.setups) || props.data.setups.length === 0) {
    return <Spinner>No available setups. Create setups first</Spinner>;
  }
  const setups = props.data.setups.map(x => ({ value: x.id, label: x.name }));
  const [components, setComponents] = useState<Component[]>([]);
  return (
    <>
      <h3>New test result</h3>
      <Formik
        initialValues={{ setupId: '', status: '', description: '' }}
        onSubmit={async ({ setupId, status, description, ...other }, { setSubmitting }) => {
          try {
            const componentVersionMap = Object.entries(other)
              .filter(([key]) => startsWith('component-')(key))
              .reduce((a: Record<string, string>, [key, version]) => {
                a[stripPrefix('component-')(key)] = version;
                return a;
              }, {});

            await props.ledger.addTest({
              setupId,
              status,
              componentVersionMap,
              description,
            });

            window.location.reload(); // pro react development
          } catch (e) {
            alert('failed to update ledger: ' + (e as any)?.message || JSON.stringify(e));
          } finally {
            setSubmitting(false);
          }
        }}
      >
        {({ isSubmitting }) => (
          <Form>
            <label htmlFor="add-test-field-setup-id">Setup</label>
            <Field
              id="add-test-field-setup-id"
              name={'setupId'}
              component={SelectField(async (setupId: string, form) => {
                const components = await props.ledger.getSetupComponents(setupId);
                setComponents(components);
              })}
              options={setups}
            />
            <ErrorMessage name="setupId" component="div" />

            <label htmlFor="add-test-field-status">Status</label>
            <Field id="add-component-field-status" type="text" name="status" placeholder="anything (passed, failed?)" />
            <ErrorMessage name="status" component="div" />

            <label htmlFor="add-test-field-description">Description</label>
            <Field id="add-component-field-description" type="text" name="description" placeholder="something informative" />
            <ErrorMessage name="description" component="div" />

            <label htmlFor="add-test-field-status">Component Versions</label>
            <Versions components={components} />
            <button type="submit" disabled={isSubmitting}>
              Submit
            </button>
            {isSubmitting && <div>submitting...</div>}
          </Form>
        )}
      </Formik>
      <Question>
        <span>IDEA #1: Component version picker</span>
      </Question>
      <Question>
        <span>IDEA #2: Allow to configure hook on test result submission</span>
        <br />
        <span>| {'e.g. if (test.status === "failed") req.("POST our.mail.proxy/?recipients={setup.maintainers}", test)'}</span>
      </Question>
    </>
  );
};

function Versions(props: { components: Component[] }) {
  const components = props.components;
  if (!Array.isArray(components) || components.length === 0) return <Spinner>...select setup first</Spinner>;
  return (
    <table>
      {components.map(component => (
        <tr key={component.id}>
          <td>
            <label style={{ cursor: 'pointer' }} htmlFor={`add-test-field-component-${component.id}`}>
              {component.name}
            </label>
          </td>
          <td>
            <Field id={`add-test-field-component-${component.id}`} type="text" name={`component-${component.id}`} placeholder="x.y.z" />
          </td>
        </tr>
      ))}
    </table>
  );
}
