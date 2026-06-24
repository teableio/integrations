'use strict';

const { listRecords, flatten, byTimeDesc } = require('../lib/records');

// Polling trigger: fires for each newly CREATED record. Zapier de-dupes by `id`,
// so we just return the most recent page newest-first.
const perform = async (z, bundle) => {
  const records = await listRecords(z, bundle, {
    tableId: bundle.inputData.tableId,
    viewId: bundle.inputData.viewId,
    take: 100,
  });
  return records.map(flatten).sort(byTimeDesc('createdTime'));
};

module.exports = {
  key: 'new_record',
  noun: 'Record',
  display: {
    label: 'New Record',
    description: 'Triggers when a new record is created in a table.',
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
        helpText: 'Limit to records in a specific view. Leave blank for all records.',
      },
    ],
    perform,
    sample: {
      id: 'recXXXXXXXXXXXX',
      createdTime: '2026-01-01T00:00:00.000Z',
      lastModifiedTime: '2026-01-01T00:00:00.000Z',
      fields: { Name: 'Acme', Status: 'open' },
      Name: 'Acme',
      Status: 'open',
    },
  },
};
