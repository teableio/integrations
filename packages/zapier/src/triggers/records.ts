import type { ZObject, Bundle } from 'zapier-platform-core';
import { listRecords } from '../lib/records';
import type { DropdownItem } from '../lib/types';

// How many records each dropdown page loads. Zapier calls perform again (with an
// incremented bundle.meta.page) when the user clicks "Load more".
const PAGE_SIZE = 100;

// Hidden trigger powering the "Record" dropdown on actions/searches that take a
// recordId (Update, Delete, Find Record by ID). Depends on a chosen tableId and
// pages through the table so large tables stay reachable. Each record is
// labelled by its primary field value (Teable's `name`), falling back to the id.
const perform = async (z: ZObject, bundle: Bundle): Promise<DropdownItem[]> => {
  const tableId = bundle.inputData.tableId as string | undefined;
  if (!tableId) return [];
  const page = (bundle.meta && (bundle.meta.page as number)) || 0;
  const records = await listRecords(z, bundle, {
    tableId,
    take: PAGE_SIZE,
    skip: page * PAGE_SIZE,
  });
  return records.map((r) => ({
    id: r.id,
    name: r.name && r.name !== '' ? r.name : r.id,
  }));
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
