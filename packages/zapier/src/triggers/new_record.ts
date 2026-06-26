import type { ZObject, Bundle } from 'zapier-platform-core';
import { listRecords, flatten, byTimeDesc } from '../lib/records';
import type { FlatRecord } from '../lib/records';

// Polling trigger: fires for each newly CREATED record. Zapier de-dupes by `id`,
// so we just return the most recent page newest-first.
const perform = async (z: ZObject, bundle: Bundle): Promise<FlatRecord[]> => {
  const records = await listRecords(z, bundle, {
    tableId: bundle.inputData.tableId as string,
    viewId: bundle.inputData.viewId as string | undefined,
  });
  return records.map(flatten).sort(byTimeDesc('createdTime'));
};

export default {
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
        // Pass the chosen table down so the View dropdown (which depends on
        // tableId) re-fetches with it in scope.
        altersDynamicFields: true,
      },
      {
        key: 'viewId',
        label: 'View',
        type: 'string',
        required: false,
        dynamic: 'views.id.name',
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
