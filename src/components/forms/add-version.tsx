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
import connection from '../../github/connection';
import SelectField from './generic/select-field';
import useLedgerData from '../../github/hooks/use-ledger-data';
import Spinner from '../spinner';
import { useState } from 'react';
import { Component } from '../../lib/types';

export default () => {
  return (
    <>
      <h3>New version</h3>
      <RenderStuff />
    </>
  );
};

function RenderStuff() {
  const { isLoading, data } = useLedgerData();
  if (isLoading) return <Spinner>Loading available components...</Spinner>;

  if (!data) return <Spinner>No data. Contact dev team</Spinner>;

  if (!Array.isArray(data.components) || data.components.length === 0) {
    return <Spinner>No available components. Create components first</Spinner>;
  }

  return <RenderForm components={data.components} />;
}

function RenderForm(props: { components: Component[] }) {
  const components = props.components.map(x => ({ value: x.id, label: x.name }));
  const [versionPlaceholder, setVersionPlaceholder] = useState('x.y.z');

  const awesomeHandler = async (selectedValue: unknown) => {};
  /*
    
    // add version
    <ComponentPicker
      onSelect = {(component) => setPlaceholder(component.version))
    >

    <ComponentPicker
      onSelect = {(component) => showVersionInput(component.id))
    >

  */

  const mapper = async (value: string) => {
    const ledger = await connection.getLedgerInstance();
    if (!ledger) return;
    const latestVersion = await ledger.getLatestComponentVersion(value);
  };

  return (
    <Formik
      initialValues={{ component: '', tag: '', date: '' }}
      onSubmit={async (values, { setSubmitting }) => {
        try {
          const ledger = await connection.getLedgerInstance();
          if (!ledger) return;

          await ledger.addVersion({
            component: values.component,
            tag: values.tag,
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
          <label htmlFor="add-version-field-component-id">Component</label>
          <Field
            id="add-version-field-component-id"
            name={'component'}
            component={SelectField(awesomeHandler)}
            // component={SelectField(async (componentId: string, form) => {
            //   const ledger = await connection.getLedgerInstance();
            //   if (!ledger) return;
            //   const latestVersion = await ledger.getLatestComponentVersion(componentId);
            //   if (!latestVersion) {
            //     setVersionPlaceholder('x.y.z');
            //     return;
            //   }
            //   setVersionPlaceholder(`latest is ${latestVersion.tag}`);
            // })}
            options={components}
          />
          <ErrorMessage name="component-id" component="div" />

          <label htmlFor="add-version-field-tag">Version Tag</label>
          <Field id="add-component-field-tag" type="text" name="tag" placeholder={versionPlaceholder} />
          <ErrorMessage name="tag" component="div" />

          <button type="submit" disabled={isSubmitting}>
            Submit
          </button>
          {isSubmitting && <div>submitting...</div>}
        </Form>
      )}
    </Formik>
  );
}
