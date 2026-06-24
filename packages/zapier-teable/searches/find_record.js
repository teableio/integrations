'use strict';

const { apiUrl } = require('../lib/client');
const { flatten } = require('../lib/records');

// Find records where a field equals a value, via Teable Query Language (TQL):
//   filterByTql = {Field Name} = "value"
// Returns matches newest-first; Zapier search steps use the first result.
const perform = async (z, bundle) => {
  const { tableId, fieldName, value } = bundle.inputData;
  // Escape double quotes in the user value so the TQL string stays valid.
  const safe = String(value == null ? '' : value).replace(/"/g, '\\"');
  const filterByTql = `{${fieldName}} = "${safe}"`;
  const response = await z.request({
    url: apiUrl(bundle, `/table/${tableId}/record`),
    params: { fieldKeyType: 'name', take: 20, filterByTql },
  });
  const records = (response.data && response.data.records) || [];
  return records.map(flatten);
};

module.exports = {
  key: 'find_record',
  noun: 'Record',
  display: {
    label: 'Find Record',
    description: 'Finds a record where a chosen field equals a value.',
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
      {
        key: 'fieldName',
        label: 'Field',
        type: 'string',
        required: true,
        dynamic: 'fields.id.name',
      },
      { key: 'value', label: 'Value', type: 'string', required: true },
    ],
    perform,
    sample: {
      id: 'recXXXXXXXXXXXX',
      fields: { Name: 'Acme' },
      Name: 'Acme',
    },
  },
};
