import { App, appTester, authData, describeTable } from './helpers';

// Live write round-trip: create → find → update, against a real table.
// WARNING: this writes a real record. Point TEABLE_TABLE_ID at a scratch table.
describeTable('create / find / update round-trip', () => {
  const tableId = process.env.TEABLE_TABLE_ID;
  const fieldName = process.env.TEABLE_FIELD_NAME || 'Name';
  // Unique-ish marker so we can find exactly what we created. No Date.now() in
  // some sandboxes — use a fixed-ish token plus the jest worker id.
  const marker = `zapier-test-${process.env.JEST_WORKER_ID || '1'}`;

  let createdId: string;

  it('create_record: creates a record and flattens the response', async () => {
    const created = await appTester(App.creates.create_record.operation.perform, {
      authData: authData(),
      inputData: { tableId, [`fields__${fieldName}`]: marker },
    });
    expect(created).toHaveProperty('id');
    expect(created.fields[fieldName]).toBe(marker);
    createdId = created.id;
  });

  it('find_record: finds the record we just created via TQL', async () => {
    const results = await appTester(App.searches.find_record.operation.perform, {
      authData: authData(),
      inputData: { tableId, fieldName, value: marker },
    });
    expect(Array.isArray(results)).toBe(true);
    expect(results.some((r) => r.id === createdId)).toBe(true);
  });

  it('update_record: patches the record by id', async () => {
    const updated = await appTester(App.creates.update_record.operation.perform, {
      authData: authData(),
      inputData: { tableId, recordId: createdId, [`fields__${fieldName}`]: `${marker}-updated` },
    });
    expect(updated.id).toBe(createdId);
    expect(updated.fields[fieldName]).toBe(`${marker}-updated`);
  });
});
