'use strict';

const { apiUrl } = require('../lib/client');

// Hidden trigger that powers the "Base" dropdown. GET /api/base/access/all
// returns every base the token can see, across spaces.
const perform = async (z, bundle) => {
  const response = await z.request({ url: apiUrl(bundle, '/base/access/all') });
  return (response.data || []).map((base) => ({
    id: base.id,
    name: base.name,
  }));
};

module.exports = {
  key: 'bases',
  noun: 'Base',
  display: {
    label: 'List Bases',
    description: 'Internal trigger used to populate the Base dropdown.',
    hidden: true,
  },
  operation: {
    perform,
    sample: { id: 'bseXXXXXXXXXXXX', name: 'My Base' },
  },
};
