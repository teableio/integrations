import type { ZObject, Bundle } from 'zapier-platform-core';
import { apiUrl } from '../lib/client';
import type { TeableView, DropdownItem } from '../lib/types';

// Hidden trigger powering the "View" dropdown. Depends on a chosen tableId.
const perform = async (z: ZObject, bundle: Bundle): Promise<DropdownItem[]> => {
  const { tableId } = bundle.inputData;
  z.console.log(`views dropdown: tableId=${tableId ?? '(none)'}`);
  if (!tableId) return [];
  const response = await z.request<TeableView[]>({
    url: apiUrl(bundle, `/table/${tableId}/view`),
  });
  const items = (response.data || []).map((view) => ({
    id: view.id,
    name: view.name,
  }));
  z.console.log(`views dropdown: ${items.length} view(s) for table ${tableId}`);
  return items;
};

export default {
  key: 'views',
  noun: 'View',
  display: {
    label: 'List Views',
    description: 'Internal trigger used to populate the View dropdown.',
    hidden: true,
  },
  operation: {
    inputFields: [{ key: 'tableId', type: 'string', required: true }],
    perform,
    sample: { id: 'viwXXXXXXXXXXXX', name: 'Grid view' },
  },
};
