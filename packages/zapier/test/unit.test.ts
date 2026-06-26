// Pure unit tests for the helper libs. These need NO credentials and NO network,
// so they always run (and are safe in CI). Logic-only coverage of the bits most
// likely to break: URL building, record flattening, field collection.

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
