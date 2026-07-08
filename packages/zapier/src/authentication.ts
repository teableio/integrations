import type { ZObject, Bundle } from 'zapier-platform-core';
import { apiUrl, apiBase } from './lib/client';

// Shape of Teable's OAuth token endpoint response.
interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  [key: string]: unknown;
}

// Teable's default access-token TTL, used when the token response omits
// expires_in for any reason.
const DEFAULT_EXPIRES_IN_SECONDS = 600;

// Absolute expiry (epoch ms) persisted into authData so beforeRequest can
// refresh proactively instead of burning a 401 on every expired token.
const expiresAt = (expiresIn: number | undefined): number =>
  Date.now() + (Number(expiresIn) > 0 ? Number(expiresIn) : DEFAULT_EXPIRES_IN_SECONDS) * 1000;

// Scopes requested from Teable (format: resource|action). Must be a subset of
// what the OAuth App was granted in Teable → Settings → OAuth Apps.
const SCOPES = [
  'base|read',
  'table|read',
  'field|read',
  'view|read',
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
    expires_at: expiresAt(response.data.expires_in),
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
    expires_at: expiresAt(response.data.expires_in),
  };
};

// Validate the connection AND fetch the account identity for connectionLabel.
// GET /api/auth/user is the OAuth-accessible "user info via access token"
// endpoint (returns { id, name, email, avatar }); the email needs the
// `user|email_read` scope. NOTE: /auth/user/me (no trailing path) is the
// session-only endpoint and returns 403 restricted_resource for OAuth tokens —
// don't use it. Expiry is handled by handleErrors (401 -> RefreshAuthError).
const test = async (z: ZObject, bundle: Bundle) => {
  const response = await z.request({ url: apiUrl(bundle, '/auth/user') });
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
  // Show the account identity from the test() result — email first, then name.
  // If neither is available, leave the connection label empty instead of using
  // a hard-coded app name.
  connectionLabel: (z: ZObject, bundle: Bundle) => {
    const user = (bundle.inputData || {}) as { name?: string; email?: string };
    return user.email || user.name;
  },
};
