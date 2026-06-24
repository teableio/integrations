import type { ZObject, Bundle } from 'zapier-platform-core';
import { apiUrl } from '../lib/client';
import type { TeableTable, DropdownItem } from '../lib/types';

// Hidden trigger powering the "Table" dropdown. Depends on a chosen baseId.
const perform = async (z: ZObject, bundle: Bundle): Promise<DropdownItem[]> => {
  const { baseId } = bundle.inputData;
  if (!baseId) return [];
  const response = await z.request<TeableTable[]>({ url: apiUrl(bundle, `/base/${baseId}/table`) });
  return (response.data || []).map((table) => ({
    id: table.id,
    name: table.name,
  }));
};

export default {
  key: 'tables',
  noun: 'Table',
  display: {
    label: 'List Tables',
    description: 'Internal trigger used to populate the Table dropdown.',
    hidden: true,
  },
  operation: {
    inputFields: [{ key: 'baseId', type: 'string', required: true }],
    perform,
    sample: { id: 'tblXXXXXXXXXXXX', name: 'Orders' },
  },
};
