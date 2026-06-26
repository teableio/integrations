import type {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

// Personal Access Token auth. The instance URL lives on the credential so each
// user (cloud or self-hosted) points at their own Teable — unlike the Zapier
// app where the instance is fixed per version.
export class TeableApi implements ICredentialType {
  name = 'teableApi';

  displayName = 'Teable API';

  documentationUrl = 'https://help.teable.io/developer/api';

  properties: INodeProperties[] = [
    {
      displayName: 'Instance URL',
      name: 'baseUrl',
      type: 'string',
      default: 'https://app.teable.io',
      placeholder: 'https://app.teable.io',
      required: true,
      description:
        'Origin of your Teable instance — no trailing slash and no /api suffix (e.g. https://app.teable.io or your self-hosted URL).',
    },
    {
      displayName: 'Access Token',
      name: 'accessToken',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: true,
      description:
        'A Teable personal access token (Teable → Settings → Personal access tokens). Sent as a Bearer token.',
    },
  ];

  // Attach the token as a Bearer header on every request the node makes.
  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: {
        Authorization: '=Bearer {{$credentials.accessToken}}',
      },
    },
  };

  // n8n's "Test" button hits this. /auth/user returns the token's user identity.
  test: ICredentialTestRequest = {
    request: {
      baseURL: '={{$credentials.baseUrl.replace(/\\/$/, "")}}/api',
      url: '/auth/user',
    },
  };
}
