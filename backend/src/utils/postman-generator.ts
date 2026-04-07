import { TenantField } from '@prisma/client';

interface PostmanVariable {
  key: string;
  value: string;
  type?: string;
}

interface PostmanUrl {
  raw: string;
  protocol?: string;
  host: string[];
  port?: string;
  path: string[];
  query?: { key: string; value: string; description?: string }[];
  variable?: { key: string; value: string }[];
}

interface PostmanHeader {
  key: string;
  value: string;
}

interface PostmanBody {
  mode: string;
  raw?: string;
  formdata?: { key: string; value: string; type?: string }[];
}

interface PostmanRequest {
  method: string;
  url: PostmanUrl;
  header?: PostmanHeader[];
  body?: PostmanBody;
  description?: string;
}

interface PostmanItem {
  name: string;
  request: PostmanRequest;
  response?: unknown[];
  event?: {
    listen: string;
    script: {
      exec: string[];
      type: string;
    };
  }[];
}

interface PostmanFolder {
  name: string;
  item: PostmanItem[];
}

interface PostmanAuth {
  type: string;
  bearer: PostmanVariable[];
}

interface PostmanInfo {
  name: string;
  schema: string;
  description?: string;
}

interface PostmanCollection {
  info: PostmanInfo;
  auth?: PostmanAuth;
  variable?: PostmanVariable[];
  item: (PostmanItem | PostmanFolder)[];
}

export function generatePostmanCollection(
  tenantSlug: string,
  tenantName: string,
  fields: TenantField[],
  accessToken?: string
): PostmanCollection {
  // Build sample data from fields for documentation
  const sampleData: Record<string, unknown> = {};
  for (const field of fields) {
    if (!['IMAGE', 'IMAGE_MULTI', 'FILE'].includes(field.type)) {
      switch (field.type) {
        case 'TEXT':
          sampleData[field.key] = `Sample ${field.label}`;
          break;
        case 'NUMBER':
        case 'PRICE':
        case 'AREA':
          sampleData[field.key] = 0;
          break;
        case 'CHECKBOX':
          sampleData[field.key] = false;
          break;
        case 'SELECT':
          sampleData[field.key] = 'option1';
          break;
        case 'MULTISELECT':
          sampleData[field.key] = ['option1', 'option2'];
          break;
        case 'DATERANGE':
          sampleData[field.key] = '2026-04-06 to 2026-04-13';
          break;
        case 'LOCATION':
          sampleData[field.key] = { address: '123 Main St', lat: 40.7128, lng: -74.0060 };
          break;
        default:
          sampleData[field.key] = '';
      }
    }
  }

  const collection: PostmanCollection = {
    info: {
      name: `${tenantName} Portal API`,
      description: `Backend API for ${tenantName} Admin Portal & Mobile App. Auth: POST /admin/auth/login → use token as Bearer <JWT_TOKEN>. Mobile API: Include Access-Token header with {{ACCESS_TOKEN}}.`,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    variable: [
      {
        key: 'baseUrl',
        value: process.env.POSTMAN_BASE_URL || 'http://localhost:3002',
        type: 'string',
      },
      {
        key: 'JWT_TOKEN',
        value: '',
        type: 'string',
      },
      {
        key: 'ACCESS_TOKEN',
        value: accessToken || '',
        type: 'string',
      },
    ],
    item: [
      {
        name: 'Auth',
        item: [
          {
            name: 'Login',
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    'var jsonData = pm.response.json();',
                    'if (jsonData.response_data && jsonData.response_data.token) {',
                    '    pm.collectionVariables.set(\'JWT_TOKEN\', jsonData.response_data.token);',
                    '}',
                    'pm.test(\'Has token\', function() {',
                    '    pm.expect(jsonData.response_data.token).to.be.ok;',
                    '});',
                  ],
                  type: 'text/javascript',
                },
              },
            ],
            request: {
              method: 'POST',
              header: [
                {
                  key: 'Content-Type',
                  value: 'application/json',
                },
              ],
              body: {
                mode: 'raw',
                raw: JSON.stringify({
                  email: '{{ADMIN_EMAIL}}',
                  password: '{{ADMIN_PASSWORD}}',
                }, null, 2),
              },
              url: {
                raw: `{{baseUrl}}/api/${tenantSlug}/auth/login`,
                protocol: 'http',
                host: ['localhost'],
                port: '3002',
                path: ['api', tenantSlug, 'auth', 'login'],
              },
              description: `Login as tenant admin for ${tenantName}. Update ADMIN_EMAIL and ADMIN_PASSWORD variables with your tenant admin credentials. Saves JWT_TOKEN for subsequent requests.`,
            },
          },
        ],
      },
      {
        name: 'Projects',
        item: [
          {
            name: 'GET Project Listings',
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    'pm.test(\'Status 200\', function() {',
                    '    pm.response.to.have.status(200);',
                    '});',
                    'pm.test(\'Has response_data\', function() {',
                    '    var jsonData = pm.response.json();',
                    '    pm.expect(jsonData.response_data).to.exist;',
                    '});',
                  ],
                  type: 'text/javascript',
                },
              },
            ],
            request: {
              method: 'GET',
              header: [
                {
                  key: 'Accept',
                  value: 'application/json',
                },
                {
                  key: 'Access-Token',
                  value: '{{ACCESS_TOKEN}}',
                },
              ],
              url: {
                raw: `{{baseUrl}}/api/${tenantSlug}/projects`,
                protocol: 'http',
                host: ['localhost'],
                port: '3002',
                path: ['api', tenantSlug, 'projects'],
              },
              description: 'Returns list of active projects for this tenant. Requires Access-Token header. Optional query params: page, limit, filter (active|archived|drafts|all).',
            },
          },
          {
            name: 'Create Project',
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    'pm.test(\'Status 200\', function() {',
                    '    pm.response.to.have.status(200);',
                    '});',
                    'pm.test(\'Has response_data\', function() {',
                    '    var jsonData = pm.response.json();',
                    '    pm.expect(jsonData.response_data).to.exist;',
                    '});',
                  ],
                  type: 'text/javascript',
                },
              },
            ],
            request: {
              method: 'POST',
              header: [
                {
                  key: 'Content-Type',
                  value: 'application/json',
                },
                {
                  key: 'Accept',
                  value: 'application/json',
                },
                {
                  key: 'Access-Token',
                  value: '{{ACCESS_TOKEN}}',
                },
              ],
              body: {
                mode: 'raw',
                raw: JSON.stringify(sampleData, null, 2),
              },
              url: {
                raw: `{{baseUrl}}/api/${tenantSlug}/projects`,
                protocol: 'http',
                host: ['localhost'],
                port: '3002',
                path: ['api', tenantSlug, 'projects'],
              },
              description: `Create a new project with dynamic fields. Body includes all field keys defined in your portal schema. Current fields: ${fields.map(f => `${f.key} (${f.label})`).join(', ')}.`,
            },
          },
        ],
      },
    ],
  };

  return collection;
}
