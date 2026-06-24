'use strict';

// Pure unit tests for the helper libs. These need NO credentials and NO network,
// so they always run (and are safe in CI). Logic-only coverage of the bits most
// likely to break: URL building, record flattening, field collection.

const { apiBase, apiUrl } = require('../lib/client');
const { flatten, byTimeDesc } = require('../lib/records');
const { collectFieldsObject } = require('../lib/fields');

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
    const flat = flatten({ id: 'rec2' });
    expect(flat.id).toBe('rec2');
    expect(flat.fields).toEqual({});
  });

  it('byTimeDesc sorts newest first', () => {
    const rows = [
      { createdTime: '2026-01-01T00:00:00.000Z' },
      { createdTime: '2026-03-01T00:00:00.000Z' },
      { createdTime: '2026-02-01T00:00:00.000Z' },
    ];
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
      collectFieldsObject({ tableId: 'tbl1', fields__Name: 'Acme', fields__Status: 'open' })
    ).toEqual({ Name: 'Acme', Status: 'open' });
  });

  it('drops empty/null/undefined values', () => {
    expect(
      collectFieldsObject({ fields__A: '', fields__B: null, fields__C: undefined, fields__D: 0 })
    ).toEqual({ D: 0 });
  });
});
