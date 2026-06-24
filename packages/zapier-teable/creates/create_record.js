'use strict';

const { apiUrl } = require('../lib/client');
const { flatten } = require('../lib/records');
const { dynamicRecordFields, collectFieldsObject } = require('../lib/fields');

// POST /api/table/{tableId}/record  body: { fieldKeyType, typecast, records: [{ fields }] }
const perform = async (z, bundle) => {
  const fields = collectFieldsObject(bundle.inputData);
  const response = await z.request({
    method: 'POST',
    url: apiUrl(bundle, `/table/${bundle.inputData.tableId}/record`),
    body: {
      fieldKeyType: 'name',
      typecast: true, // coerce strings to selects/dates/numbers like Airtable does
      records: [{ fields }],
    },
  });
  const created = (response.data && response.data.records && response.data.records[0]) || {};
  return flatten(created);
};

module.exports = {
  key: 'create_record',
  noun: 'Record',
  display: {
    label: 'Create Record',
    description: 'Creates a new record in a Teable table.',
  },
  operation: {
    inputFields: [
      {
        key: 'baseId',
        label: 'Base',
        type: 'string',
        required: true,
        dynamic: 'bases.id.name',
        altersDynamicFields: true,
      },
      {
        key: 'tableId',
        label: 'Table',
        type: 'string',
        required: true,
        dynamic: 'tables.id.name',
        altersDynamicFields: true,
      },
      dynamicRecordFields, // expands into one input per writable field
    ],
    perform,
    sample: {
      id: 'recXXXXXXXXXXXX',
      createdTime: '2026-01-01T00:00:00.000Z',
      fields: { Name: 'Acme', Status: 'open' },
      Name: 'Acme',
      Status: 'open',
    },
  },
};
