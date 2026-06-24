'use strict';

const { apiUrl } = require('../lib/client');

// Hidden trigger powering the "Table" dropdown. Depends on a chosen baseId.
const perform = async (z, bundle) => {
  const { baseId } = bundle.inputData;
  if (!baseId) return [];
  const response = await z.request({ url: apiUrl(bundle, `/base/${baseId}/table`) });
  return (response.data || []).map((table) => ({
    id: table.id,
    name: table.name,
  }));
};

module.exports = {
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
