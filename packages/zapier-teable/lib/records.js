'use strict';

const { apiUrl } = require('./client');

// Teable returns records as { id, fields:{...}, createdTime, lastModifiedTime }.
// Flatten for Zapier: keep id + timestamps, and spread the field values up so
// users can map them directly, while also exposing the raw `fields` object.
const flatten = (record) => ({
  id: record.id,
  createdTime: record.createdTime,
  lastModifiedTime: record.lastModifiedTime,
  fields: record.fields || {},
  ...(record.fields || {}),
});

// Fetch a page of records. No outbound webhook exists in Teable's public API,
// so triggers poll this endpoint and Zapier de-dupes by the returned `id`.
const listRecords = async (z, bundle, { tableId, viewId, take = 100 }) => {
  const params = { take, fieldKeyType: 'name' };
  if (viewId) params.viewId = viewId;
  const response = await z.request({
    url: apiUrl(bundle, `/table/${tableId}/record`),
    params,
  });
  return (response.data && response.data.records) || [];
};

const byTimeDesc = (key) => (a, b) =>
  new Date(b[key] || 0).getTime() - new Date(a[key] || 0).getTime();

module.exports = { flatten, listRecords, byTimeDesc };
