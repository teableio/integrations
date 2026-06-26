import type { ZObject, Bundle } from 'zapier-platform-core';
import { fetchFields } from '../lib/fields';
import type { DropdownItem } from '../lib/types';

// Hidden trigger powering field-name dropdowns (e.g. in Find Record).
const perform = async (z: ZObject, bundle: Bundle): Promise<DropdownItem[]> => {
  const { tableId } = bundle.inputData;
  if (!tableId) return [];
  const fields = await fetchFields(z, bundle, tableId as string);
  // id === name so the selected value is the field name used by filterByTql.
  return fields.map((f) => ({ id: f.name, name: f.name }));
};

export default {
  key: 'fields',
  noun: 'Field',
  display: {
    label: 'List Fields',
    description: 'Internal trigger used to populate field-name dropdowns.',
    hidden: true,
  },
  operation: {
    inputFields: [{ key: 'tableId', type: 'string', required: true }],
    perform,
    sample: { id: 'Name', name: 'Name' },
  },
};
