'use strict';

const { listRecords, flatten, byTimeDesc } = require('../lib/records');

// Polling trigger: fires when a record is created OR updated. We synthesize a
// dedupe id from recordId + lastModifiedTime so an edit looks "new" to Zapier.
const perform = async (z, bundle) => {
  const records = await listRecords(z, bundle, {
    tableId: bundle.inputData.tableId,
    viewId: bundle.inputData.viewId,
    take: 100,
  });
  return records
    .map((r) => {
      const flat = flatten(r);
      return { ...flat, id: `${flat.id}@${flat.lastModifiedTime || flat.createdTime}`, recordId: flat.id };
    })
    .sort(byTimeDesc('lastModifiedTime'));
};

module.exports = {
  key: 'new_or_updated_record',
  noun: 'Record',
  display: {
    label: 'New or Updated Record',
    description:
      'Triggers when a record is created or modified. Requires the table to track Last Modified Time.',
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
        search: 'tables.id',
      },
      {
        key: 'viewId',
        label: 'View (optional)',
        type: 'string',
        required: false,
      },
    ],
    perform,
    sample: {
      id: 'recXXXXXXXXXXXX@2026-01-01T00:00:00.000Z',
      recordId: 'recXXXXXXXXXXXX',
      createdTime: '2026-01-01T00:00:00.000Z',
      lastModifiedTime: '2026-01-01T00:00:00.000Z',
      fields: { Name: 'Acme', Status: 'paid' },
      Name: 'Acme',
      Status: 'paid',
    },
  },
};
