import type { ZObject, Bundle } from 'zapier-platform-core';
import type { IRecord, IRecordsVo } from '@teable/openapi';
import { apiUrl } from '../lib/client';
import { flatten } from '../lib/records';
import type { FlatRecord } from '../lib/records';
import { dynamicRecordFields, collectFieldsObject } from '../lib/fields';
import { splitAttachmentFields, uploadAttachmentUrls } from '../lib/attachments';

// POST /api/table/{tableId}/record  body: { fieldKeyType, typecast, records: [{ fields }] }
// Attachment fields can't be written inline, so they're split out and appended
// from their URL(s) via uploadAttachment after the record exists.
const perform = async (z: ZObject, bundle: Bundle): Promise<FlatRecord> => {
  const tableId = bundle.inputData.tableId as string;
  const { writeFields, attachments } = await splitAttachmentFields(
    z,
    bundle,
    tableId,
    collectFieldsObject(bundle.inputData),
  );
  const response = await z.request<IRecordsVo>({
    method: 'POST',
    url: apiUrl(bundle, `/table/${tableId}/record`),
    body: {
      fieldKeyType: 'name',
      typecast: true, // coerce strings to selects/dates/numbers like Airtable does
      records: [{ fields: writeFields }],
    },
  });
  const created = (response.data && response.data.records && response.data.records[0]) || {};
  const recordId = (created as IRecord).id;
  if (recordId && attachments.length) {
    const updated = await uploadAttachmentUrls(z, bundle, tableId, recordId, attachments);
    if (updated) return flatten(updated);
  }
  return flatten(created as IRecordsVo['records'][number]);
};

export default {
  key: 'create_record',
  noun: 'Record',
  display: {
    label: 'Create Record',
    description: 'Creates a new record in a Teable table.',
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
      dynamicRecordFields, // expands into one input per writable field
    ],
    perform,
    sample: {
      id: 'recXXXXXXXXXXXX',
      createdTime: '2026-01-01T00:00:00.000Z',
      fields: { Name: 'Acme', Status: 'open' },
      Name: 'Acme',
      Status: 'open',
    },
  },
};
