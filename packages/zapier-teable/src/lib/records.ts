import type { ZObject, Bundle } from 'zapier-platform-core';
// Type-only: the app must NOT import @teable/openapi at runtime.
// `IRecord` (re-exported from the package root) is the record shape Teable
// returns; `IRecordsVo` is the list-endpoint response envelope.
import type { IRecord, IRecordsVo } from '@teable/openapi';
import { apiUrl } from './client';

// The flattened record shape we hand back to Zapier: id + timestamps, the raw
// `fields` object, plus each field value spread to the top level.
export interface FlatRecord {
  id: string;
  createdTime?: string;
  lastModifiedTime?: string;
  fields: Record<string, unknown>;
  [key: string]: unknown;
}

// Teable returns records as { id, fields:{...}, createdTime, lastModifiedTime }.
// Flatten for Zapier: keep id + timestamps, and spread the field values up so
// users can map them directly, while also exposing the raw `fields` object.
const flatten = (record: IRecord): FlatRecord => ({
  id: record.id,
  createdTime: record.createdTime,
  lastModifiedTime: record.lastModifiedTime,
  fields: record.fields || {},
  ...record.fields,
});

interface ListRecordsOptions {
  tableId: string;
  viewId?: string;
  take?: number;
}

// Fetch a page of records. No outbound webhook exists in Teable's public API,
// so triggers poll this endpoint and Zapier de-dupes by the returned `id`.
const listRecords = async (
  z: ZObject,
  bundle: Bundle,
  { tableId, viewId, take = 100 }: ListRecordsOptions,
): Promise<IRecord[]> => {
  const params: Record<string, unknown> = { take, fieldKeyType: 'name' };
  if (viewId) params.viewId = viewId;
  const response = await z.request<IRecordsVo>({
    url: apiUrl(bundle, `/table/${tableId}/record`),
    params,
  });
  return (response.data && response.data.records) || [];
};

const byTimeDesc =
  (key: keyof FlatRecord) =>
  (a: FlatRecord, b: FlatRecord): number =>
    new Date((b[key] as string) || 0).getTime() - new Date((a[key] as string) || 0).getTime();

export { flatten, listRecords, byTimeDesc };
