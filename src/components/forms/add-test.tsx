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
import useLedgerData from '../../github/hooks/use-ledger-data';
import Spinner from '../spinner';
import { Component, RawTestResult } from '../../lib/types';
import { useState } from 'react';

export default () => {
  return (
    <>
      <h3>New test result</h3>
      <RenderStuff />
    </>
  );
};

function RenderStuff() {
  const { isLoading, data } = useLedgerData();
  if (isLoading) return <Spinner>Loading available setups...</Spinner>;

  if (!data) return <Spinner>No data. Contact dev team</Spinner>;

  if (!Array.isArray(data.setups) || data.setups.length === 0) {
    return <Spinner>No available setups. Create setups first</Spinner>;
  }

  return <RenderForm setups={data.setups} />;
}

function RenderForm(props: { setups: Record<string, any>[] }) {
  const setups = props.setups.map(x => ({ value: x.id, label: x.name }));
  const [components, setComponents] = useState<Component[]>([]);
  return (
    <Formik
      initialValues={{ setupId: '', status: '', componentVersions: '' }}
      onSubmit={async (values, { setSubmitting }) => {
        try {
          console.log(values);
          // const ledger = await connection.getLedgerInstance();
          // if (!ledger) return;

          // await ledger.addVersion({
          //   component: values.component,
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
          <Field id="add-test-field-setup-id" name={'setup'} component={SelectField(() => {})} options={setups} />
          <ErrorMessage name="component-id" component="div" />

          <label htmlFor="add-test-field-status">Status</label>
          <Field id="add-component-field-status" type="text" name="status" />
          <ErrorMessage name="status" component="div" />

          <label htmlFor="add-test-field-status">Component Versions</label>
          {!Array.isArray(components) || components.length === 0 ? (
            <Spinner>...select setup first</Spinner>
          ) : (
            components.map(x => (
              <div>
                {x.name} - {x.id}
              </div>
            ))
          )}
          {/* 
          <Field id="add-component-field-status" type="text" name="status" />
          <ErrorMessage name="status" component="div" /> */}

          {/* {components.map(x => )} */}

          <button type="submit" disabled={isSubmitting}>
            Submit
          </button>
          {isSubmitting && <div>submitting...</div>}
        </Form>
      )}
    </Formik>
  );
}
