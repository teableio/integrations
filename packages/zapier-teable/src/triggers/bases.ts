import type { ZObject, Bundle } from 'zapier-platform-core';
import { apiUrl } from '../lib/client';
import type { TeableBase, DropdownItem } from '../lib/types';

// Hidden trigger that powers the "Base" dropdown. GET /api/base/access/all
// returns every base the token can see, across spaces.
const perform = async (z: ZObject, bundle: Bundle): Promise<DropdownItem[]> => {
  const response = await z.request<TeableBase[]>({ url: apiUrl(bundle, '/base/access/all') });
  return (response.data || []).map((base) => ({
    id: base.id,
    name: base.name,
  }));
};

export default {
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
