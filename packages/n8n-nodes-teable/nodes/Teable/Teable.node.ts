import {
  NodeConnectionTypes,
  type IExecuteFunctions,
  type ILoadOptionsFunctions,
  type INodeExecutionData,
  type INodePropertyOptions,
  type INodeType,
  type INodeTypeDescription,
} from 'n8n-workflow';

// Helper for loadOptions only — the record operations themselves use declarative
// routing. Builds the URL from the credential's instance URL and attaches auth.
async function teableApiRequest(
  this: ILoadOptionsFunctions,
  method: 'GET',
  endpoint: string,
): Promise<unknown> {
  const creds = await this.getCredentials('teableApi');
  const baseUrl = String(creds.baseUrl).replace(/\/$/, '');
  return this.helpers.httpRequestWithAuthentication.call(this, 'teableApi', {
    method,
    url: `${baseUrl}/api${endpoint}`,
    json: true,
  });
}

export class Teable implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Teable',
    name: 'teable',
    icon: 'file:teable.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: 'Create, read, update and delete records in a Teable base',
    defaults: { name: 'Teable' },
    inputs: [NodeConnectionTypes.Main],
    outputs: [NodeConnectionTypes.Main],
    credentials: [{ name: 'teableApi', required: true }],
    requestDefaults: {
      baseURL: '={{$credentials.baseUrl.replace(/\\/$/, "")}}/api',
      headers: { 'Content-Type': 'application/json' },
    },
    properties: [
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [{ name: 'Record', value: 'record' }],
        default: 'record',
      },

      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['record'] } },
        options: [
          {
            name: 'Create',
            value: 'create',
            action: 'Create a record',
            routing: {
              request: {
                method: 'POST',
                url: '=/table/{{$parameter.tableId}}/record',
                body: {
                  fieldKeyType: 'name',
                  typecast: true,
                  records: '={{ [{ fields: JSON.parse($parameter.fieldsJson || "{}") }] }}',
                },
              },
              output: {
                postReceive: [{ type: 'rootProperty', properties: { property: 'records' } }],
              },
            },
          },
          {
            name: 'Delete',
            value: 'delete',
            action: 'Delete a record',
            routing: {
              request: {
                method: 'DELETE',
                url: '=/table/{{$parameter.tableId}}/record/{{$parameter.recordId}}',
              },
            },
          },
          {
            name: 'Get',
            value: 'get',
            action: 'Get a record',
            routing: {
              request: {
                method: 'GET',
                url: '=/table/{{$parameter.tableId}}/record/{{$parameter.recordId}}',
                qs: { fieldKeyType: 'name' },
              },
            },
          },
          {
            name: 'Get Many',
            value: 'getMany',
            action: 'Get many records',
            routing: {
              request: {
                method: 'GET',
                url: '=/table/{{$parameter.tableId}}/record',
                qs: { fieldKeyType: 'name', take: '={{$parameter.limit}}' },
              },
              output: {
                postReceive: [{ type: 'rootProperty', properties: { property: 'records' } }],
              },
            },
          },
          {
            name: 'Update',
            value: 'update',
            action: 'Update a record',
            routing: {
              request: {
                method: 'PATCH',
                url: '=/table/{{$parameter.tableId}}/record/{{$parameter.recordId}}',
                body: {
                  fieldKeyType: 'name',
                  typecast: true,
                  record: '={{ ({ fields: JSON.parse($parameter.fieldsJson || "{}") }) }}',
                },
              },
            },
          },
        ],
        default: 'getMany',
      },

      // Base + Table dropdowns (dynamic). Table depends on the chosen base.
      {
        displayName: 'Base Name or ID',
        name: 'baseId',
        type: 'options',
        typeOptions: { loadOptionsMethod: 'getBases' },
        required: true,
        default: '',
        description:
          'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
        displayOptions: { show: { resource: ['record'] } },
      },
      {
        displayName: 'Table Name or ID',
        name: 'tableId',
        type: 'options',
        typeOptions: { loadOptionsMethod: 'getTables', loadOptionsDependsOn: ['baseId'] },
        required: true,
        default: '',
        description:
          'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
        displayOptions: { show: { resource: ['record'] } },
      },

      // Record ID — for get / update / delete.
      {
        displayName: 'Record ID',
        name: 'recordId',
        type: 'string',
        required: true,
        default: '',
        placeholder: 'rec…',
        displayOptions: { show: { resource: ['record'], operation: ['get', 'update', 'delete'] } },
      },

      // Fields JSON — for create / update.
      {
        displayName: 'Fields (JSON)',
        name: 'fieldsJson',
        type: 'json',
        default: '{}',
        description:
          'Object of field name → value, e.g. {"Name":"Acme","Status":"open"}. Values are typecast like the Teable UI.',
        displayOptions: { show: { resource: ['record'], operation: ['create', 'update'] } },
      },

      // Limit — for getMany.
      {
        displayName: 'Limit',
        name: 'limit',
        type: 'number',
        typeOptions: { minValue: 1, maxValue: 2000 },
        default: 100,
        description: 'Max number of records to return',
        displayOptions: { show: { resource: ['record'], operation: ['getMany'] } },
      },
    ],
  };

  methods = {
    loadOptions: {
      async getBases(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        const bases = (await teableApiRequest.call(this, 'GET', '/base/access/all')) as Array<{
          id: string;
          name: string;
        }>;
        return (bases || []).map((b) => ({ name: b.name, value: b.id }));
      },

      async getTables(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        const baseId = this.getCurrentNodeParameter('baseId') as string;
        if (!baseId) return [];
        const tables = (await teableApiRequest.call(
          this,
          'GET',
          `/base/${baseId}/table`,
        )) as Array<{ id: string; name: string }>;
        return (tables || []).map((t) => ({ name: t.name, value: t.id }));
      },
    },
  };

  // Declarative routing handles execution; this is required by the interface but
  // is never called for a fully-declarative node.
  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    return [this.getInputData()];
  }
}
