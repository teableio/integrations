import type { ZObject, Bundle } from 'zapier-platform-core';
import { apiUrl } from './client';
import type { TeableField, ZapierInputField } from './types';

// Map a Teable field (GET /table/{tableId}/field) to a Zapier input field.
// We key inputs by field NAME because record writes use fieldKeyType=name.
const FIELD_TYPE_MAP: Record<string, string> = {
  number: 'number',
  rating: 'integer',
  checkbox: 'boolean',
  date: 'datetime',
  createdTime: 'datetime',
  lastModifiedTime: 'datetime',
  longText: 'text',
  // Attachments take public file URL(s); the write actions fetch & upload them
  // via Teable's uploadAttachment endpoint. A multi-line box fits several URLs.
  attachment: 'text',
};

// Extra guidance for field types whose raw input isn't self-explanatory.
const FIELD_HELP_TEXT: Record<string, string> = {
  attachment:
    'Public file URL(s) to attach — Teable fetches them. Separate multiple URLs with a comma or new line.',
  link: 'Enter the linked record’s title (matched to an existing record) or its `rec…` id. Plain text that matches nothing is ignored.',
  user: 'Enter the member’s email or user id.',
};

// Field types that are computed/read-only — never offer them as writable inputs.
const READONLY_TYPES = new Set<string>([
  'formula',
  'rollup',
  'autoNumber',
  'createdTime',
  'lastModifiedTime',
  'createdBy',
  'lastModifiedBy',
  'button',
]);

const fetchFields = async (z: ZObject, bundle: Bundle, tableId: string): Promise<TeableField[]> => {
  const response = await z.request<TeableField[]>({
    url: apiUrl(bundle, `/table/${tableId}/field`),
  });
  return response.data || [];
};

// Build Zapier dynamic inputFields from a table's schema. Used by create/update.
const dynamicRecordFields = async (z: ZObject, bundle: Bundle): Promise<ZapierInputField[]> => {
  const tableId = bundle.inputData.tableId as string | undefined;
  if (!tableId) return [];
  const fields = await fetchFields(z, bundle, tableId);
  return fields
    .filter((f) => !READONLY_TYPES.has(f.type))
    .map((f) => {
      const input: ZapierInputField = {
        key: `fields__${f.name}`,
        label: f.name,
        type: FIELD_TYPE_MAP[f.type] || 'string',
        required: false,
      };
      if (FIELD_HELP_TEXT[f.type]) {
        input.helpText = FIELD_HELP_TEXT[f.type];
      }
      if (f.type === 'singleSelect' && f.options && Array.isArray(f.options.choices)) {
        input.choices = f.options.choices.map((c) => c.name);
      }
      if (f.type === 'multipleSelect') {
        input.list = true;
        if (f.options && Array.isArray(f.options.choices)) {
          input.choices = f.options.choices.map((c) => c.name);
        }
      }
      return input;
    });
};

// Collect `fields__<name>` inputs back into a Teable `fields` object.
const collectFieldsObject = (
  inputData: Record<string, unknown> | null | undefined,
): Record<string, unknown> => {
  const fields: Record<string, unknown> = {};
  Object.keys(inputData || {}).forEach((key) => {
    if (key.startsWith('fields__')) {
      const name = key.slice('fields__'.length);
      const value = (inputData as Record<string, unknown>)[key];
      if (value !== undefined && value !== null && value !== '') {
        fields[name] = value;
      }
    }
  });
  return fields;
};

export { fetchFields, dynamicRecordFields, collectFieldsObject };
