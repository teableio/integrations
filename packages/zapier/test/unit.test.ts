// Pure unit tests for the helper libs. These need NO credentials and NO network,
// so they always run (and are safe in CI). Logic-only coverage of the bits most
// likely to break: URL building, record flattening, field collection.

import type { ZObject, HttpRequestOptionsWithUrl } from 'zapier-platform-core';

import App from '../src';
import { apiBase, apiUrl } from '../src/lib/client';
import { flatten, byTimeDesc } from '../src/lib/records';
import type { FlatRecord } from '../src/lib/records';
import { collectFieldsObject } from '../src/lib/fields';

describe('lib/client apiBase (driven by TEABLE_INSTANCE_URL)', () => {
  const ORIGINAL = process.env.TEABLE_INSTANCE_URL;
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.TEABLE_INSTANCE_URL;
    else process.env.TEABLE_INSTANCE_URL = ORIGINAL;
  });

  it('appends /api when missing', () => {
    process.env.TEABLE_INSTANCE_URL = 'https://app.teable.io';
    expect(apiBase()).toBe('https://app.teable.io/api');
  });

  it('tolerates a trailing slash', () => {
    process.env.TEABLE_INSTANCE_URL = 'https://app.teable.io/';
    expect(apiBase()).toBe('https://app.teable.io/api');
  });

  it('does not double up an existing /api suffix', () => {
    process.env.TEABLE_INSTANCE_URL = 'https://self.host/api';
    expect(apiBase()).toBe('https://self.host/api');
  });

  it('falls back to the default host when no URL is set', () => {
    delete process.env.TEABLE_INSTANCE_URL;
    expect(apiBase()).toBe('https://app.teable.io/api');
  });

  it('apiUrl joins base + path', () => {
    process.env.TEABLE_INSTANCE_URL = 'https://app.teable.io';
    expect(apiUrl(null, '/space')).toBe('https://app.teable.io/api/space');
  });
});

// Every dropdown is powered by an endpoint the backend guards with a specific
// permission, and a missing scope fails silently: the request 403s and the
// dropdown just renders empty. `base|read_all` is the one that bit us — the Base
// dropdown calls GET /api/base/access/all, which is guarded by `base|read_all`,
// not by `base|read`. Pin the whole set so a scope can't be dropped again.
describe('authentication OAuth scopes', () => {
  const scopes = App.authentication.oauth2Config.authorizeUrl.params.scope.split(' ');

  it.each([
    ['base|read_all', 'GET /api/base/access/all — the Base dropdown'],
    ['table|read', 'GET /api/base/:baseId/table — the Table dropdown'],
    ['view|read', 'GET /api/table/:tableId/view — the View dropdown'],
    ['field|read', 'GET /api/table/:tableId/field — the field inputs'],
    ['record|read', 'GET /api/table/:tableId/record — triggers and searches'],
    ['record|create', 'POST /api/table/:tableId/record'],
    ['record|update', 'PATCH /api/table/:tableId/record/:recordId + attachment upload'],
    ['record|delete', 'DELETE /api/table/:tableId/record/:recordId'],
    ['user|email_read', 'GET /api/auth/user — the connection label'],
  ])('requests %s (%s)', (scope) => {
    expect(scopes).toContain(scope);
  });
});

// The preemptive-refresh middleware is the first beforeRequest hook. It must
// throw RefreshAuthError for a stale token BEFORE the request goes out (so the
// API never logs a 401), and must stay out of the way everywhere else.
describe('beforeRequest preemptive token refresh', () => {
  class RefreshAuthError extends Error {}
  const z = { errors: { RefreshAuthError } } as unknown as ZObject;
  const middleware = App.beforeRequest[0] as (
    request: HttpRequestOptionsWithUrl,
    z: ZObject,
    bundle: { authData?: Record<string, unknown> },
  ) => HttpRequestOptionsWithUrl;

  const teableUrl = `${apiBase()}/table/tbl1/record`;
  const run = (url: string, authData?: Record<string, unknown>) =>
    middleware({ url }, z, { authData });

  it('throws RefreshAuthError when the token is past expiry', () => {
    expect(() => run(teableUrl, { access_token: 't', expires_at: Date.now() - 1000 })).toThrow(
      RefreshAuthError,
    );
  });

  it('throws within the safety margin (about to expire)', () => {
    expect(() => run(teableUrl, { access_token: 't', expires_at: Date.now() + 30 * 1000 })).toThrow(
      RefreshAuthError,
    );
  });

  it('passes through when the token is still fresh', () => {
    const req = run(teableUrl, { access_token: 't', expires_at: Date.now() + 10 * 60 * 1000 });
    expect(req.url).toBe(teableUrl);
  });

  it('handles expires_at stored as a string (authData round-trip)', () => {
    expect(() =>
      run(teableUrl, { access_token: 't', expires_at: String(Date.now() - 1000) }),
    ).toThrow(RefreshAuthError);
  });

  it('skips legacy connections without expires_at (falls back to the 401 path)', () => {
    const req = run(teableUrl, { access_token: 't' });
    expect(req.url).toBe(teableUrl);
  });

  it('never blocks the token endpoint itself (refresh must not dead-lock)', () => {
    const tokenUrl = `${apiBase()}/oauth/access_token`;
    const req = run(tokenUrl, { access_token: 't', expires_at: Date.now() - 1000 });
    expect(req.url).toBe(tokenUrl);
  });

  it('ignores requests to third-party hosts (attachment downloads)', () => {
    const external = 'https://files.example.com/a.png';
    const req = run(external, { access_token: 't', expires_at: Date.now() - 1000 });
    expect(req.url).toBe(external);
  });
});

describe('lib/records flatten', () => {
  it('spreads fields up while keeping id/timestamps and raw fields', () => {
    const flat = flatten({
      id: 'rec1',
      createdTime: '2026-01-01T00:00:00.000Z',
      lastModifiedTime: '2026-01-02T00:00:00.000Z',
      fields: { Name: 'Acme', Status: 'open' },
    });
    expect(flat.id).toBe('rec1');
    expect(flat.Name).toBe('Acme');
    expect(flat.fields).toEqual({ Name: 'Acme', Status: 'open' });
  });

  it('handles a record with no fields object', () => {
    const flat = flatten({ id: 'rec2' } as Parameters<typeof flatten>[0]);
    expect(flat.id).toBe('rec2');
    expect(flat.fields).toEqual({});
  });

  it('byTimeDesc sorts newest first', () => {
    const rows = [
      { createdTime: '2026-01-01T00:00:00.000Z' },
      { createdTime: '2026-03-01T00:00:00.000Z' },
      { createdTime: '2026-02-01T00:00:00.000Z' },
    ] as FlatRecord[];
    const sorted = [...rows].sort(byTimeDesc('createdTime'));
    expect(sorted.map((r) => r.createdTime)).toEqual([
      '2026-03-01T00:00:00.000Z',
      '2026-02-01T00:00:00.000Z',
      '2026-01-01T00:00:00.000Z',
    ]);
  });
});

describe('lib/fields collectFieldsObject', () => {
  it('keeps only fields__ keys and strips the prefix', () => {
    expect(
      collectFieldsObject({ tableId: 'tbl1', fields__Name: 'Acme', fields__Status: 'open' }),
    ).toEqual({ Name: 'Acme', Status: 'open' });
  });

  it('drops empty/null/undefined values', () => {
    expect(
      collectFieldsObject({ fields__A: '', fields__B: null, fields__C: undefined, fields__D: 0 }),
    ).toEqual({ D: 0 });
  });
});

// create_or_update_record decides "create only" vs "search then upsert" purely from
// the submitted inputs: the match value is the collected field value under the chosen
// matchField name (matchField's dropdown is fields.id.name, so its value IS the field
// name, the same key collectFieldsObject uses). An undefined match value ⇒ create only.
// This is the exact predicate the action's perform() uses, exercised without network.
const resolveMatchValue = (
  inputData: Record<string, unknown>,
): { matchValue: unknown; createOnly: boolean } => {
  const fields = collectFieldsObject(inputData);
  const matchField = inputData.matchField as string | undefined;
  const matchValue = matchField ? fields[matchField] : undefined;
  return { matchValue, createOnly: !matchField || matchValue === undefined };
};

describe('create_or_update_record match-value resolution', () => {
  it('resolves the match value from the field input keyed by the match field name', () => {
    const { matchValue, createOnly } = resolveMatchValue({
      tableId: 'tbl1',
      matchField: 'Email',
      fields__Email: 'a@b.com',
      fields__Name: 'Acme',
    });
    expect(matchValue).toBe('a@b.com');
    expect(createOnly).toBe(false);
  });

  it('falls back to create-only when the match value is empty', () => {
    // collectFieldsObject drops '' so the match key is absent ⇒ no match value.
    const { matchValue, createOnly } = resolveMatchValue({
      tableId: 'tbl1',
      matchField: 'Email',
      fields__Email: '',
      fields__Name: 'Acme',
    });
    expect(matchValue).toBeUndefined();
    expect(createOnly).toBe(true);
  });

  it('falls back to create-only when no match field is chosen', () => {
    const { createOnly } = resolveMatchValue({ tableId: 'tbl1', fields__Name: 'Acme' });
    expect(createOnly).toBe(true);
  });

  it('treats a falsy-but-present match value (0) as a real match, not create-only', () => {
    const { matchValue, createOnly } = resolveMatchValue({
      tableId: 'tbl1',
      matchField: 'Count',
      fields__Count: 0,
    });
    expect(matchValue).toBe(0);
    expect(createOnly).toBe(false);
  });
});
