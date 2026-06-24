import type { ZObject, Bundle } from 'zapier-platform-core';
import { apiUrl, apiBase } from './lib/client';

// Shape of Teable's OAuth token endpoint response.
interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  [key: string]: unknown;
}

// Scopes requested from Teable (format: resource|action). Must be a subset of
// what the OAuth App was granted in Teable → Settings → OAuth Apps.
const SCOPES = [
  'base|read',
  'table|read',
  'field|read',
  'record|read',
  'record|create',
  'record|update',
  'record|delete',
  'user|email_read',
].join(' ');

// Exchange the authorization code for tokens. Teable's token endpoint expects
// form-urlencoded and returns { access_token, refresh_token, expires_in, ... }.
const getAccessToken = async (z: ZObject, bundle: Bundle) => {
  const response = await z.request<TokenResponse>({
    url: `${apiBase()}/oauth/access_token`,
    method: 'POST',
    body: {
      grant_type: 'authorization_code',
      code: bundle.inputData.code,
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      redirect_uri: bundle.inputData.redirect_uri,
    },
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
  });
  return {
    access_token: response.data.access_token,
    refresh_token: response.data.refresh_token,
  };
};

// Teable access tokens are short-lived (~10 min); Zapier auto-refreshes with the
// refresh token. Teable rotates the refresh token each time, so return the new
// one to persist it.
const refreshAccessToken = async (z: ZObject, bundle: Bundle) => {
  const response = await z.request<TokenResponse>({
    url: `${apiBase()}/oauth/access_token`,
    method: 'POST',
    body: {
      grant_type: 'refresh_token',
      refresh_token: bundle.authData.refresh_token,
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
    },
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
  });
  return {
    access_token: response.data.access_token,
    refresh_token: response.data.refresh_token,
  };
};

// Validate a connection with a scoped read the OAuth token actually has access
// to. NOTE: /auth/user/me is NOT OAuth-accessible (returns 403
// restricted_resource) — use /base/access/all, covered by the base|read scope.
// Expiry is handled by handleErrors (401 -> RefreshAuthError) in index.ts.
const test = async (z: ZObject, bundle: Bundle) => {
  const response = await z.request({ url: apiUrl(bundle, '/base/access/all') });
  return response.data;
};

export default {
  type: 'oauth2',
  oauth2Config: {
    // Browser redirect. Uses the env var directly so it resolves at request time.
    authorizeUrl: {
      url: '{{process.env.TEABLE_INSTANCE_URL}}/api/oauth/authorize',
      params: {
        client_id: '{{process.env.CLIENT_ID}}',
        state: '{{bundle.inputData.state}}',
        redirect_uri: '{{bundle.inputData.redirect_uri}}',
        response_type: 'code',
        scope: SCOPES,
      },
    },
    getAccessToken,
    refreshAccessToken,
    autoRefresh: true,
  },
  fields: [],
  test,
  // OAuth tokens can't read user identity (/auth/user/me is restricted), so use
  // a static label.
  connectionLabel: 'Teable',
};
