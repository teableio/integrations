import type { ZObject, Bundle } from 'zapier-platform-core';
import type { IRecord } from '@teable/openapi';
import { apiUrl } from './client';
import { fetchFields } from './fields';

// Teable record writes can't accept attachment cell values inline — those need
// uploaded `{ token }` objects, not a URL string (a URL in the record body is
// silently dropped). Teable's per-cell endpoint instead takes a `fileUrl` and
// fetches the file server-side:
//   POST /table/{tableId}/record/{recordId}/{fieldId}/uploadAttachment
// So the write actions: (1) write the non-attachment fields, then (2) append
// each attachment field's URL(s) via this endpoint.
//
// NOTE: Teable validates fileUrl server-side and rejects hosts it doesn't trust
// ("Url reject" — e.g. cdn.zapier.com). Such failures are non-fatal here: the
// record write already succeeded, so we log and skip rather than fail the step.

const ATTACHMENT_TYPE = 'attachment';
// Fixed boundary for a single text field (fileUrl) — no binary file is sent, so
// hand-building the multipart body avoids depending on a FormData stream impl.
const BOUNDARY = '----TeableZapierFormBoundary7MA4YWxkTrZu0gW';

// An attachment input may arrive as one URL, several comma/newline-separated, or
// an array (Zapier list field). Normalise to a clean URL list.
const toUrlList = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
};

const multipartFileUrl = (url: string): string =>
  `--${BOUNDARY}\r\n` +
  `Content-Disposition: form-data; name="fileUrl"\r\n\r\n` +
  `${url}\r\n` +
  `--${BOUNDARY}--\r\n`;

export interface SplitFields {
  // Fields safe to send in the record POST/PATCH body.
  writeFields: Record<string, unknown>;
  // Attachment fields, keyed by fieldId (the uploadAttachment endpoint needs the
  // field id, not its name), with the URL(s) to append.
  attachments: Array<{ fieldId: string; urls: string[] }>;
}

// Separate attachment fields (by table schema) from the rest of the collected
// fields, so the caller can write the rest inline and upload the attachments.
const splitAttachmentFields = async (
  z: ZObject,
  bundle: Bundle,
  tableId: string,
  fields: Record<string, unknown>,
): Promise<SplitFields> => {
  const schema = await fetchFields(z, bundle, tableId);
  const byName = new Map(schema.map((f) => [f.name, f]));
  const writeFields: Record<string, unknown> = {};
  const attachments: Array<{ fieldId: string; urls: string[] }> = [];
  Object.keys(fields).forEach((name) => {
    const field = byName.get(name);
    if (field && field.type === ATTACHMENT_TYPE) {
      const urls = toUrlList(fields[name]);
      if (urls.length) attachments.push({ fieldId: field.id, urls });
    } else {
      writeFields[name] = fields[name];
    }
  });
  return { writeFields, attachments };
};

// Append each URL to its attachment cell via uploadAttachment (Teable fetches the
// fileUrl server-side). Best-effort: a rejected/unreachable URL is logged and
// skipped so it never fails the record write that already succeeded. Teable
// returns the updated record on each call; we return the last success.
const uploadAttachmentUrls = async (
  z: ZObject,
  bundle: Bundle,
  tableId: string,
  recordId: string,
  attachments: Array<{ fieldId: string; urls: string[] }>,
): Promise<IRecord | undefined> => {
  let last: IRecord | undefined;
  for (const { fieldId, urls } of attachments) {
    for (const url of urls) {
      try {
        const response = await z.request<IRecord>({
          method: 'POST',
          url: apiUrl(bundle, `/table/${tableId}/record/${recordId}/${fieldId}/uploadAttachment`),
          headers: { 'content-type': `multipart/form-data; boundary=${BOUNDARY}` },
          body: multipartFileUrl(url),
        });
        last = response.data as IRecord;
      } catch (err) {
        z.console.log(`Attachment upload skipped for ${url}: ${(err as Error).message}`);
      }
    }
  }
  return last;
};

export { splitAttachmentFields, uploadAttachmentUrls };
