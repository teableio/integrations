'use strict';

const { apiUrl } = require('../lib/client');
const { flatten } = require('../lib/records');
const { dynamicRecordFields, collectFieldsObject } = require('../lib/fields');

// PATCH /api/table/{tableId}/record/{recordId}  body: { fieldKeyType, typecast, record: { fields } }
const perform = async (z, bundle) => {
  const fields = collectFieldsObject(bundle.inputData);
  const response = await z.request({
    method: 'PATCH',
    url: apiUrl(bundle, `/table/${bundle.inputData.tableId}/record/${bundle.inputData.recordId}`),
    body: {
      fieldKeyType: 'name',
      typecast: true,
      record: { fields },
    },
  });
  return flatten(response.data || {});
};

module.exports = {
  key: 'update_record',
  noun: 'Record',
  display: {
    label: 'Update Record',
    description: 'Updates an existing record by its ID.',
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
        key: 'recordId',
        label: 'Record ID',
        type: 'string',
        required: true,
        helpText: 'The `rec…` id of the record to update (e.g. from a trigger step).',
      },
      dynamicRecordFields,
    ],
    perform,
    sample: {
      id: 'recXXXXXXXXXXXX',
      lastModifiedTime: '2026-01-01T00:00:00.000Z',
      fields: { Name: 'Acme', Status: 'paid' },
      Name: 'Acme',
      Status: 'paid',
    },
  },
};
