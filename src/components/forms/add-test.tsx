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
import connection from '../../github/connection';
import SelectFieldAsync from './generic/__select-field-async';
import { Ledger } from '../../lib/ledger';

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
        initialValues={{ setupId: '', status: '' }}
        onSubmit={async (values, { setSubmitting }) => {
          try {
            console.log(values);
            // const ledger = await connection.getLedgerInstance();
            // if (!ledger) return;

            // await ledger.addVersion({
            //   componentId: values.component,
            //   tag: values.tag,
            // });

            // window.location.reload(); // pro react development
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
                const ledger = await connection.getLedgerInstance();
                if (!ledger) return;
                const components = await ledger.getSetupComponents(setupId);
                setComponents(components);
              })}
              options={setups}
            />
            <ErrorMessage name="setupId" component="div" />

            <label htmlFor="add-test-field-status">Status</label>
            <Field id="add-component-field-status" type="text" name="status" />
            <ErrorMessage name="status" component="div" />

            <label htmlFor="add-test-field-status">Component Versions</label>
            {/* {!Array.isArray(components) || components.length === 0 ? (
            <Spinner>...select setup first</Spinner>
          ) : (
            components.map(component => (
              <>
                <label htmlFor={`add-test-field-component-${component.id}`}>{component.name}</label>
                <Field id={`add-test-field-component-${component.id}`} name={`component-${component.id}`} />
              </>
            ))
          )} */}
            <Versions components={components} />
            <button type="submit" disabled={isSubmitting}>
              Submit
            </button>
            {isSubmitting && <div>submitting...</div>}
          </Form>
        )}
      </Formik>
    </>
  );
};

function Versions(props: { components: Component[] }) {
  const components = props.components;
  if (!Array.isArray(components) || components.length === 0) return <Spinner>...select setup first</Spinner>;
  return (
    <>
      {components.map(component => (
        <>
          <label htmlFor={`add-test-field-component-${component.id}`}>{component.name}</label>
          <Field
            id={`add-test-field-component-${component.id}`}
            name={`component-${component.id}`}
            component={SelectFieldAsync(
              () => {},
              (x: string) => {
                debugger;
                return new Promise(res => res([{ value: 'iz', label: 'az' }]));
              },
            )}
          />
        </>
      ))}
    </>
  );
}
