import type { ZObject, Bundle } from 'zapier-platform-core';
import type { IRecordsVo } from '@teable/openapi';
import { apiUrl } from '../lib/client';
import { flatten } from '../lib/records';
import type { FlatRecord } from '../lib/records';
import { dynamicRecordFields, collectFieldsObject } from '../lib/fields';

// POST /api/table/{tableId}/record  body: { fieldKeyType, typecast, records: [{ fields }] }
const perform = async (z: ZObject, bundle: Bundle): Promise<FlatRecord> => {
  const fields = collectFieldsObject(bundle.inputData);
  const response = await z.request<IRecordsVo>({
    method: 'POST',
    url: apiUrl(bundle, `/table/${bundle.inputData.tableId}/record`),
    body: {
      fieldKeyType: 'name',
      typecast: true, // coerce strings to selects/dates/numbers like Airtable does
      records: [{ fields }],
    },
  });
  const created = (response.data && response.data.records && response.data.records[0]) || {};
  return flatten(created as IRecordsVo['records'][number]);
};

export default {
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
