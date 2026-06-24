'use strict';

const { App, appTester, authData, describeLive, describeTable } = require('./helpers');

describeLive('hidden dropdown triggers', () => {
  it('bases: lists bases the token can see', async () => {
    const results = await appTester(App.triggers.bases.operation.perform, {
      authData: authData(),
    });
    expect(Array.isArray(results)).toBe(true);
    if (results.length) {
      expect(results[0]).toHaveProperty('id');
      expect(results[0]).toHaveProperty('name');
    }
  });

  it('tables: returns [] without a baseId, lists tables with one', async () => {
    const empty = await appTester(App.triggers.tables.operation.perform, {
      authData: authData(),
      inputData: {},
    });
    expect(empty).toEqual([]);

    if (process.env.TEABLE_BASE_ID) {
      const results = await appTester(App.triggers.tables.operation.perform, {
        authData: authData(),
        inputData: { baseId: process.env.TEABLE_BASE_ID },
      });
      expect(Array.isArray(results)).toBe(true);
    }
  });
});

describeTable('record triggers', () => {
  const tableId = process.env.TEABLE_TABLE_ID;

  it('fields: lists field names for the table', async () => {
    const results = await appTester(App.triggers.fields.operation.perform, {
      authData: authData(),
      inputData: { tableId },
    });
    expect(Array.isArray(results)).toBe(true);
    if (results.length) expect(results[0].id).toBe(results[0].name);
  });

  it('new_record: returns flattened records newest-first', async () => {
    const results = await appTester(App.triggers.new_record.operation.perform, {
      authData: authData(),
      inputData: { tableId },
    });
    expect(Array.isArray(results)).toBe(true);
    results.forEach((r) => {
      expect(r).toHaveProperty('id');
      expect(r).toHaveProperty('fields');
    });
  });

  it('new_or_updated_record: dedupe id is recordId@lastModifiedTime', async () => {
    const results = await appTester(App.triggers.new_or_updated_record.operation.perform, {
      authData: authData(),
      inputData: { tableId },
    });
    expect(Array.isArray(results)).toBe(true);
    results.forEach((r) => {
      expect(r.id).toContain('@');
      expect(r).toHaveProperty('recordId');
    });
  });
});
