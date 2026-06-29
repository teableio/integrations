import type { ZObject, Bundle } from 'zapier-platform-core';
import { listRecords } from '../lib/records';
import { fetchFields } from '../lib/fields';
import type { DropdownItem } from '../lib/types';

// Hidden trigger powering the "Record" dropdown on actions/searches that take a
// recordId (Update, Delete, Find Record by ID). Depends on a chosen tableId;
// labels each record by its primary field value, falling back to the record id.
const perform = async (z: ZObject, bundle: Bundle): Promise<DropdownItem[]> => {
  const tableId = bundle.inputData.tableId as string | undefined;
  if (!tableId) return [];
  const [records, fields] = await Promise.all([
    listRecords(z, bundle, { tableId, take: 100 }),
    fetchFields(z, bundle, tableId),
  ]);
  const primary = fields.find((f) => f.isPrimary);
  return records.map((r) => {
    const label = primary ? r.fields[primary.name] : undefined;
    return {
      id: r.id,
      name: label != null && label !== '' ? String(label) : r.id,
    };
  });
};

export default {
  key: 'records',
  noun: 'Record',
  display: {
    label: 'List Records',
    description: 'Internal trigger used to populate the Record dropdown.',
    hidden: true,
  },
  operation: {
    inputFields: [{ key: 'tableId', type: 'string', required: true }],
    perform,
    sample: { id: 'recXXXXXXXXXXXX', name: 'Acme' },
  },
};
