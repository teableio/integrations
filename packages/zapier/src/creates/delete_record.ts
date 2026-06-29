import type { ZObject, Bundle } from 'zapier-platform-core';
import { apiUrl } from '../lib/client';

// DELETE /api/table/{tableId}/record/{recordId} — permanently delete one record.
const perform = async (z: ZObject, bundle: Bundle): Promise<{ id: string; deleted: boolean }> => {
  const { tableId, recordId } = bundle.inputData as { tableId: string; recordId: string };
  await z.request({
    method: 'DELETE',
    url: apiUrl(bundle, `/table/${tableId}/record/${recordId}`),
  });
  return { id: recordId, deleted: true };
};

export default {
  key: 'delete_record',
  noun: 'Record',
  display: {
    label: 'Delete Record',
    description: 'Permanently deletes a record by its ID.',
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
        // Let users pick a record via the Find Record search instead of pasting
        // a raw id (also satisfies Zapier's "ID field needs a dropdown" check).
        search: 'find_record.id',
        helpText: 'The `rec…` id of the record to delete (e.g. from a trigger step).',
      },
    ],
    perform,
    sample: { id: 'recXXXXXXXXXXXX', deleted: true },
  },
};
