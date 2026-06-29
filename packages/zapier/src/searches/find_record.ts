import type { ZObject, Bundle } from 'zapier-platform-core';
import type { IRecordsVo } from '@teable/openapi';
import { apiUrl } from '../lib/client';
import { flatten } from '../lib/records';
import type { FlatRecord } from '../lib/records';

// Find records where a field equals a value, via Teable Query Language (TQL):
//   filterByTql = {Field Name} = "value"
// Returns matches newest-first; Zapier search steps use the first result.
const perform = async (z: ZObject, bundle: Bundle): Promise<FlatRecord[]> => {
  const { tableId, fieldName, value } = bundle.inputData;
  // Escape double quotes in the user value so the TQL string stays valid.
  const safe = String(value == null ? '' : value).replace(/"/g, '\\"');
  const filterByTql = `{${fieldName}} = "${safe}"`;
  const response = await z.request<IRecordsVo>({
    url: apiUrl(bundle, `/table/${tableId}/record`),
    params: { fieldKeyType: 'name', take: 20, filterByTql },
  });
  const records = (response.data && response.data.records) || [];
  return records.map(flatten);
};

export default {
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
      // Field names are dynamic per table — don't hard-code them, or the static
      // sample fails Zapier's T004 subset check against a real run's keys.
      fields: {},
    },
  },
};
