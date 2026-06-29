import type { ZObject, Bundle } from 'zapier-platform-core';
import type { IRecord, IRecordsVo } from '@teable/openapi';
import { apiUrl } from '../lib/client';
import { flatten } from '../lib/records';
import type { FlatRecord } from '../lib/records';
import { dynamicRecordFields, collectFieldsObject } from '../lib/fields';
import { splitAttachmentFields, uploadAttachmentUrls } from '../lib/attachments';

// Upsert: find a record by a chosen match field and update it, else create one.
//
// Composed entirely from the SAME Teable endpoints the other actions use:
//   - search : GET  /table/{tableId}/record?filterByTql={Field} = "value"  (like find_record)
//   - update : PATCH /table/{tableId}/record/{recordId}                     (like update_record)
//   - create : POST  /table/{tableId}/record                               (like create_record)
//
// The `matchField` dropdown is powered by the `fields` trigger, where id === name,
// so the submitted value IS the field name. That name is also how dynamic field
// inputs are keyed (`fields__<name>`), so the user-entered match value is just the
// field value under that name in the collected fields object.

// POST one record, typecasting strings like create_record does. Returns it flattened.
const createRecord = async (
  z: ZObject,
  bundle: Bundle,
  fields: Record<string, unknown>,
): Promise<FlatRecord> => {
  const response = await z.request<IRecordsVo>({
    method: 'POST',
    url: apiUrl(bundle, `/table/${bundle.inputData.tableId}/record`),
    body: {
      fieldKeyType: 'name',
      typecast: true, // coerce strings to selects/dates/numbers like Airtable does
      records: [{ fields }],
    },
  });
  const created = (response.data && response.data.records && response.data.records[0]) || {};
  return flatten(created as IRecordsVo['records'][number]);
};

// PATCH an existing record by id, mirroring update_record. Returns it flattened.
const updateRecord = async (
  z: ZObject,
  bundle: Bundle,
  recordId: string,
  fields: Record<string, unknown>,
): Promise<FlatRecord> => {
  const response = await z.request<IRecord>({
    method: 'PATCH',
    url: apiUrl(bundle, `/table/${bundle.inputData.tableId}/record/${recordId}`),
    body: {
      fieldKeyType: 'name',
      typecast: true,
      record: { fields },
    },
  });
  return flatten((response.data || {}) as IRecord);
};

// GET the first record where {matchField} = "value", via TQL — same mechanism as
// find_record, but capped at one row since we only need a single match to update.
const findFirstMatch = async (
  z: ZObject,
  bundle: Bundle,
  matchField: string,
  value: unknown,
): Promise<IRecord | undefined> => {
  // Escape double quotes in the user value so the TQL string stays valid.
  const safe = String(value == null ? '' : value).replace(/"/g, '\\"');
  const filterByTql = `{${matchField}} = "${safe}"`;
  const response = await z.request<IRecordsVo>({
    url: apiUrl(bundle, `/table/${bundle.inputData.tableId}/record`),
    params: { fieldKeyType: 'name', take: 1, filterByTql },
  });
  const records = (response.data && response.data.records) || [];
  return records[0];
};

const perform = async (z: ZObject, bundle: Bundle): Promise<FlatRecord> => {
  const tableId = bundle.inputData.tableId as string;
  const all = collectFieldsObject(bundle.inputData);
  const matchField = bundle.inputData.matchField as string | undefined;
  // collectFieldsObject keys by field name and drops empty/null/undefined, so a
  // present key here means the user supplied a non-empty match value. Match on
  // the original value (the match field is never an attachment).
  const matchValue = matchField ? all[matchField] : undefined;

  // Attachment fields can't be written inline; split them out and append after.
  const { writeFields, attachments } = await splitAttachmentFields(z, bundle, tableId, all);

  let record: FlatRecord;
  // No match field chosen, or its value is empty/missing → treat as "no match"
  // and just create. (find_record-style TQL on an empty value isn't meaningful.)
  if (!matchField || matchValue === undefined) {
    record = await createRecord(z, bundle, writeFields);
  } else {
    const existing = await findFirstMatch(z, bundle, matchField, matchValue);
    // If multiple rows match, findFirstMatch already returned the first.
    record =
      existing && existing.id
        ? await updateRecord(z, bundle, existing.id, writeFields)
        : await createRecord(z, bundle, writeFields);
  }

  if (record.id && attachments.length) {
    const updated = await uploadAttachmentUrls(z, bundle, tableId, record.id, attachments);
    if (updated) return flatten(updated);
  }
  return record;
};

export default {
  key: 'create_or_update_record',
  noun: 'Record',
  display: {
    label: 'Create or Update Record',
    description: 'Find a record by a match field and update it, or create a new one.',
  },
  operation: {
    inputFields: [
      {
        key: 'baseId',
        label: 'Base',
        type: 'string',
        required: true,
        dynamic: 'bases.id.name',
        altersDynamicFields: true,
      },
      {
        key: 'tableId',
        label: 'Table',
        type: 'string',
        required: true,
        dynamic: 'tables.id.name',
        altersDynamicFields: true,
      },
      {
        key: 'matchField',
        label: 'Match Field',
        type: 'string',
        required: true,
        dynamic: 'fields.id.name',
        helpText:
          'The field used to find an existing record. If a record has the same value in this field, it is updated; otherwise a new record is created.',
      },
      dynamicRecordFields, // expands into one input per writable field
    ],
    perform,
    sample: {
      id: 'recXXXXXXXXXXXX',
      createdTime: '2026-01-01T00:00:00.000Z',
      // Field names are dynamic per table — don't hard-code them, or the static
      // sample fails Zapier's T004 subset check against a real run's keys.
      fields: {},
    },
  },
};
