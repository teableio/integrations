// Small local interfaces for the Teable REST response shapes this app uses.
//
// We type records/record-lists with @teable/openapi's `IRecord` / `IRecordsVo`
// (re-exported from the package root, and a clean match). The field-schema,
// base-list, and table-list shapes, however, are NOT re-exported from
// @teable/openapi's root (only from @teable/core, which we deliberately do not
// add as a direct dependency), so we define minimal local interfaces here
// rather than force an awkward import. These cover exactly the properties the
// app reads — see lib/fields.ts and the dropdown triggers.

// A Teable field as returned by GET /table/{tableId}/field.
export interface TeableField {
  id: string;
  name: string;
  type: string;
  isPrimary?: boolean;
  options?: {
    choices?: Array<{ name: string }>;
  };
}

// A base as returned by GET /base/access/all.
export interface TeableBase {
  id: string;
  name: string;
}

// A table as returned by GET /base/{baseId}/table.
export interface TeableTable {
  id: string;
  name: string;
}

// A view as returned by GET /table/{tableId}/view.
export interface TeableView {
  id: string;
  name: string;
}

// An { id, name } row used to populate Zapier dynamic dropdowns.
export interface DropdownItem {
  id: string;
  name: string;
}

// A Zapier input field definition. Loosely typed to mirror what the dynamic
// field builder produces (a subset of Zapier's PlainInputField schema).
export interface ZapierInputField {
  key: string;
  label?: string;
  type?: string;
  required?: boolean;
  helpText?: string;
  list?: boolean;
  choices?: string[] | Record<string, string>;
  dynamic?: string;
  search?: string;
  altersDynamicFields?: boolean;
}
