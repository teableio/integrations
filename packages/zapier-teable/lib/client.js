'use strict';

// With OAuth the Teable instance is fixed per OAuth App (the authorize/token
// endpoints live on a specific host), so the base URL comes from the
// TEABLE_INSTANCE_URL env var rather than a per-connection field.
// Set it to the bare origin, e.g. https://xxxx.ngrok-free.app — no /api, no
// trailing slash. `/api` is appended here.
const rawInstance = () =>
  (process.env.TEABLE_INSTANCE_URL || 'https://app.teable.io').trim().replace(/\/+$/, '');

const apiBase = () => {
  const base = rawInstance();
  return base.endsWith('/api') ? base : `${base}/api`;
};

// `bundle` is accepted for call-site compatibility but no longer used — the
// instance is global to the OAuth app now.
const apiUrl = (_bundle, path) => `${apiBase()}${path}`;

module.exports = { rawInstance, apiBase, apiUrl };
