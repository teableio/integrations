'use strict';

const authentication = require('./authentication');

const bases = require('./triggers/bases');
const tables = require('./triggers/tables');
const fields = require('./triggers/fields');
const newRecord = require('./triggers/new_record');
const newOrUpdatedRecord = require('./triggers/new_or_updated_record');

const createRecord = require('./creates/create_record');
const updateRecord = require('./creates/update_record');

const findRecord = require('./searches/find_record');

// Attach the OAuth access token as a Bearer token on every outgoing request.
const includeBearerToken = (request, z, bundle) => {
  if (bundle.authData && bundle.authData.access_token) {
    request.headers = request.headers || {};
    request.headers.Authorization = `Bearer ${bundle.authData.access_token}`;
  }
  return request;
};

// Turn Teable's API error envelope into a readable Zapier error.
const handleErrors = (response, z) => {
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

module.exports = {
  version: require('./package.json').version,
  platformVersion: require('zapier-platform-core').version,

  authentication,

  beforeRequest: [includeBearerToken],
  afterResponse: [handleErrors],

  triggers: {
    [bases.key]: bases,
    [tables.key]: tables,
    [fields.key]: fields,
    [newRecord.key]: newRecord,
    [newOrUpdatedRecord.key]: newOrUpdatedRecord,
  },

  creates: {
    [createRecord.key]: createRecord,
    [updateRecord.key]: updateRecord,
  },

  searches: {
    [findRecord.key]: findRecord,
  },
};
