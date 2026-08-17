import type { ZObject, Bundle } from 'zapier-platform-core';
import { apiUrl } from '../lib/client';
import { statusOf } from '../lib/errors';
import type { TeableBase, DropdownItem } from '../lib/types';

// Hidden trigger that powers the "Base" dropdown. GET /api/base/access/all
// returns every base the token can see, across spaces.
const perform = async (z: ZObject, bundle: Bundle): Promise<DropdownItem[]> => {
  let response;
  try {
    response = await z.request<TeableBase[]>({ url: apiUrl(bundle, '/base/access/all') });
  } catch (error) {
    // A 403 here means the connection was authorized before we requested the
    // `base|read_all` scope (see SCOPES in src/authentication.ts). Scopes are
    // fixed at the moment the user authorizes, so neither a retry nor a token
    // refresh can recover — the account has to be reconnected.
    //
    // ExpiredAuthError is what gets that across: Zapier marks the connection as
    // needing attention and walks the user through reconnecting. Letting the
    // raw 403 through instead leaves the dropdown silently empty, which reads
    // as "Teable has no bases" and sends people hunting through their Teable
    // permissions or Zapier support for something neither one can fix.
    if (statusOf(error) === 403) {
      throw new z.errors.ExpiredAuthError(
        'Your Teable connection is missing the "view all bases" permission. Please reconnect your Teable account to continue.',
      );
    }
    throw error;
  }
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
