import type { ZObject, Bundle, HttpRequestOptionsWithUrl } from 'zapier-platform-core';
import { apiBase } from '../lib/client';

// Raw, authenticated HTTP passthrough to the Teable API. The Bearer token is
// attached by the beforeRequest middleware (index.ts), so any endpoint the
// connection's OAuth scopes allow can be called — handy for endpoints this
// integration doesn't wrap yet.
const perform = async (z: ZObject, bundle: Bundle): Promise<Record<string, unknown>> => {
  const { httpMethod, url, queryParams, headers, body } = bundle.inputData as {
    httpMethod?: string;
    url: string;
    queryParams?: Record<string, string>;
    headers?: Record<string, string>;
    body?: string;
  };
  const method = (httpMethod || 'GET').toUpperCase();

  // Accept a full URL, or a path resolved against the instance's /api base
  // (e.g. "/table/tblXXXX/record").
  const fullUrl = /^https?:\/\//i.test(url)
    ? url
    : `${apiBase()}${url.startsWith('/') ? url : `/${url}`}`;

  const request: HttpRequestOptionsWithUrl = {
    method: method as HttpRequestOptionsWithUrl['method'],
    url: fullUrl,
    params: queryParams || {},
    headers: headers || {},
  };

  // Attach a body for write methods. Parse the user's text as JSON when
  // possible; otherwise pass it through as-is.
  if (body && method !== 'GET' && method !== 'DELETE') {
    try {
      request.body = JSON.parse(body);
      request.headers = { 'content-type': 'application/json', ...request.headers };
    } catch {
      request.body = body;
    }
  }

  const response = await z.request(request);
  const data = response.data;
  if (Array.isArray(data)) return { result: data };
  if (data && typeof data === 'object') return data as Record<string, unknown>;
  return { result: data };
};

export default {
  key: 'api_request',
  noun: 'API Request',
  display: {
    label: 'API Request (Beta)',
    description:
      'An advanced action that makes a raw, authenticated HTTP request to the Teable API — useful for endpoints this integration does not cover yet.',
  },
  operation: {
    inputFields: [
      {
        key: 'httpMethod',
        label: 'Method',
        type: 'string',
        required: true,
        default: 'GET',
        choices: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      },
      {
        key: 'url',
        label: 'URL or Path',
        type: 'string',
        required: true,
        helpText:
          'A full URL, or a path resolved against your instance API base — e.g. `/table/tblXXXX/record`.',
      },
      { key: 'queryParams', label: 'Query Params', dict: true, required: false },
      { key: 'headers', label: 'Headers', dict: true, required: false },
      {
        key: 'body',
        label: 'Body (JSON)',
        type: 'text',
        required: false,
        helpText:
          'Raw JSON body for POST/PUT/PATCH, e.g. `{"fieldKeyType":"name","records":[{"fields":{"Name":"Acme"}}]}`.',
      },
    ],
    perform,
    sample: { result: 'Response from the called endpoint' },
  },
};
