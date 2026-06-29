import { version as platformVersion } from 'zapier-platform-core';
import type { ZObject, HttpRequestOptionsWithUrl, HttpResponse } from 'zapier-platform-core';

import authentication from './authentication';
import { rawInstance } from './lib/client';

import bases from './triggers/bases';
import tables from './triggers/tables';
import fields from './triggers/fields';
import views from './triggers/views';
import records from './triggers/records';
import newRecord from './triggers/new_record';
import newOrUpdatedRecord from './triggers/new_or_updated_record';

import createRecord from './creates/create_record';
import updateRecord from './creates/update_record';
import createOrUpdateRecord from './creates/create_or_update_record';
import deleteRecord from './creates/delete_record';
import apiRequest from './creates/api_request';

import findRecord from './searches/find_record';
import findRecordById from './searches/get_record';

// App version comes from package.json. The built entry is dist/index.js, so the
// runtime-relative path is ../package.json. Use a runtime `require` (not an
// `import`) so it stays outside rootDir and still resolves from dist/.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version } = require('../package.json');

// Attach the OAuth access token as a Bearer token — but ONLY on requests to the
// Teable instance. Attachment uploads first download the file from an arbitrary
// external URL; we must not leak the Teable token to that third-party host.
const includeBearerToken = (
  request: HttpRequestOptionsWithUrl,
  z: ZObject,
  bundle: { authData?: { access_token?: string } },
): HttpRequestOptionsWithUrl => {
  const toTeable = typeof request.url === 'string' && request.url.startsWith(rawInstance());
  if (toTeable && bundle.authData && bundle.authData.access_token) {
    request.headers = request.headers || {};
    request.headers.Authorization = `Bearer ${bundle.authData.access_token}`;
  }
  return request;
};

// Turn Teable's API error envelope into a readable Zapier error.
const handleErrors = (response: HttpResponse, z: ZObject): HttpResponse => {
  // Teable access tokens expire in ~10 min. A 401 means "refresh and retry" —
  // throwing RefreshAuthError is what tells Zapier to run refreshAccessToken
  // (autoRefresh) instead of marking the whole connection expired.
  if (response.status === 401) {
    throw new z.errors.RefreshAuthError('Teable session expired; refreshing.');
  }
  if (response.status >= 400) {
    const data = response.json || {};
    const message = data.message || response.content || `HTTP ${response.status}`;
    throw new z.errors.Error(`Teable: ${message}`, 'TeableApiError', response.status);
  }
  return response;
};

const App = {
  version,
  platformVersion,

  // Pass user input through untouched. Zapier's default "cleaning" trims
  // whitespace and drops empty values, which can silently alter field values
  // before they reach Teable. Disabling it globally makes writes predictable.
  flags: { cleanInputData: false },

  authentication,

  beforeRequest: [includeBearerToken],
  afterResponse: [handleErrors],

  // Keyed by each operation's `key`. We use string literals (equal to the
  // module's own `.key`) rather than computed `[x.key]` keys so every entry
  // keeps its own precise type instead of collapsing into a union.
  triggers: {
    bases,
    tables,
    fields,
    views,
    records,
    new_record: newRecord,
    new_or_updated_record: newOrUpdatedRecord,
  },

  creates: {
    create_record: createRecord,
    update_record: updateRecord,
    create_or_update_record: createOrUpdateRecord,
    delete_record: deleteRecord,
    api_request: apiRequest,
  },

  searches: {
    find_record: findRecord,
    find_record_by_id: findRecordById,
  },
};

export = App;
