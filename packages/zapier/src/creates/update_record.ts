import type { ZObject, Bundle } from 'zapier-platform-core';
import type { IRecord } from '@teable/openapi';
import { apiUrl } from '../lib/client';
import { flatten } from '../lib/records';
import type { FlatRecord } from '../lib/records';
import { dynamicRecordFields, collectFieldsObject } from '../lib/fields';
import { splitAttachmentFields, uploadAttachmentUrls } from '../lib/attachments';

// PATCH /api/table/{tableId}/record/{recordId}  body: { fieldKeyType, typecast, record: { fields } }
// Attachment fields are appended via uploadAttachment (URLs), not the PATCH body.
const perform = async (z: ZObject, bundle: Bundle): Promise<FlatRecord> => {
  const tableId = bundle.inputData.tableId as string;
  const recordId = bundle.inputData.recordId as string;
  const { writeFields, attachments } = await splitAttachmentFields(
    z,
    bundle,
    tableId,
    collectFieldsObject(bundle.inputData),
  );
  const response = await z.request<IRecord>({
    method: 'PATCH',
    url: apiUrl(bundle, `/table/${tableId}/record/${recordId}`),
    body: {
      fieldKeyType: 'name',
      typecast: true,
      record: { fields: writeFields },
    },
  });
  if (attachments.length) {
    const updated = await uploadAttachmentUrls(z, bundle, tableId, recordId, attachments);
    if (updated) return flatten(updated);
  }
  return flatten((response.data || {}) as IRecord);
};

export default {
  key: 'update_record',
  noun: 'Record',
  display: {
    label: 'Update Record',
    description: 'Updates an existing record by its ID.',
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
        key: 'recordId',
        label: 'Record ID',
        type: 'string',
        required: true,
        helpText: 'The `rec…` id of the record to update (e.g. from a trigger step).',
      },
      dynamicRecordFields,
    ],
    perform,
    sample: {
      id: 'recXXXXXXXXXXXX',
      lastModifiedTime: '2026-01-01T00:00:00.000Z',
      // Field names are dynamic per table — don't hard-code them, or the static
      // sample fails Zapier's T004 subset check against a real run's keys.
      fields: {},
    },
  },
};
