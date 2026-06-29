import type { ZObject, Bundle } from 'zapier-platform-core';
import { listRecords, flatten, byTimeDesc } from '../lib/records';
import type { FlatRecord } from '../lib/records';

// Polling trigger: fires when a record is created OR updated. We synthesize a
// dedupe id from recordId + lastModifiedTime so an edit looks "new" to Zapier.
const perform = async (z: ZObject, bundle: Bundle): Promise<FlatRecord[]> => {
  const records = await listRecords(z, bundle, {
    tableId: bundle.inputData.tableId as string,
    viewId: bundle.inputData.viewId as string | undefined,
  });
  return records
    .map((r) => {
      const flat = flatten(r);
      return {
        ...flat,
        id: `${flat.id}@${flat.lastModifiedTime || flat.createdTime}`,
        recordId: flat.id,
      };
    })
    .sort(byTimeDesc('lastModifiedTime'));
};

export default {
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
    // Only stable system keys here. Field names are dynamic (they differ per
    // table/user and get spread to the top level by flatten()), so we must NOT
    // hard-code field names like Name/Status — they won't appear in a live run,
    // which fails Zapier's T004 "static sample is a subset of live keys" check.
    sample: {
      id: 'recXXXXXXXXXXXX@2026-01-01T00:00:00.000Z',
      recordId: 'recXXXXXXXXXXXX',
      createdTime: '2026-01-01T00:00:00.000Z',
      lastModifiedTime: '2026-01-01T00:00:00.000Z',
      fields: {},
    },
  },
};
