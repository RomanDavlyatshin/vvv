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

export default () => (
  <Formik
    initialValues={{ id: '', name: '' }}
    validate={values => {
      const errors: any = {};
      // if (!values.email) {
      //   errors.email = 'Required';
      // } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(values.email)) {
      //   errors.email = 'Invalid email address';
      // }
      return errors;
    }}
    onSubmit={async (values, { setSubmitting }) => {
      try {
        const ledger = await connection.getLedgerInstance();
        if (!ledger) return;
        await ledger.addComponent(values);
      } catch (e) {
        alert('failed to update ledger ' + (e as any)?.message || JSON.stringify(e));
      } finally {
        setSubmitting(false);
      }
    }}
  >
    {({ isSubmitting }) => (
      <Form>
        <h3>Enter new component parameters</h3>
        <label htmlFor="id">Unique id</label>
        <Field type="text" name="id" placeholder="foo-bar" />
        <ErrorMessage name="id" component="div" />
        <label htmlFor="id">Human-readable name</label>
        <Field type="text" name="name" placeholder="Foo Bar" />
        <ErrorMessage name="name" component="div" />
        <button type="submit" disabled={isSubmitting}>
          Submit
        </button>
        {isSubmitting && <div>submitting...</div>}
      </Form>
    )}
  </Formik>
);
