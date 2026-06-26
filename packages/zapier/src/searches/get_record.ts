import type { ZObject, Bundle } from 'zapier-platform-core';
import type { IRecord } from '@teable/openapi';
import { apiUrl } from '../lib/client';
import { flatten } from '../lib/records';
import type { FlatRecord } from '../lib/records';

// GET /api/table/{tableId}/record/{recordId} — fetch a single record by its id.
// Search steps return an array; a missing id yields [] (not an error) so it
// composes with "find or create" flows.
const perform = async (z: ZObject, bundle: Bundle): Promise<FlatRecord[]> => {
  const { tableId, recordId } = bundle.inputData;
  try {
    const response = await z.request<IRecord>({
      url: apiUrl(bundle, `/table/${tableId}/record/${recordId}`),
      params: { fieldKeyType: 'name' },
    });
    const record = response.data;
    return record && record.id ? [flatten(record as IRecord)] : [];
  } catch (err) {
    const e = err as { status?: number; statusCode?: number; message?: string };
    const status = e.status || e.statusCode || 0;
    if (status === 404 || /404|not\s*found/i.test(String(e.message || ''))) return [];
    throw err;
  }
};

export default {
  key: 'find_record_by_id',
  noun: 'Record',
  display: {
    label: 'Find Record by ID',
    description: 'Finds a specific record using its unique record ID.',
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
        helpText: 'The `rec…` id of the record to fetch (e.g. from a trigger step).',
      },
    ],
    perform,
    sample: {
      id: 'recXXXXXXXXXXXX',
      lastModifiedTime: '2026-01-01T00:00:00.000Z',
      fields: { Name: 'Acme' },
      Name: 'Acme',
    },
  },
};
