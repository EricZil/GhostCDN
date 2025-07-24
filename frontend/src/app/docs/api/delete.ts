import { ApiEndpoint } from './types';

export const deleteEndpoints: ApiEndpoint[] = [
  {
    method: 'DELETE',
    path: '/api/v1/files/:fileId',
    description: 'Permanently delete a file from storage and database',
    statusCodes: [
      { code: 200, description: 'File deleted successfully' },
      { code: 401, description: 'Invalid or missing API key' },
      { code: 403, description: 'Insufficient permissions (requires files.delete)' },
      { code: 404, description: 'File not found or access denied' },
      { code: 429, description: 'Rate limit exceeded' },
      { code: 500, description: 'Internal server error' }
    ],
    parameters: [
      { name: 'fileId', type: 'string', required: true, description: 'Unique file identifier (URL parameter)' },
    ],
    examples: [
      {
        language: 'curl',
        code: `curl -X DELETE "https://api.ghostcdn.xyz/v1/files/file_abc123def456" \\
  -H "Authorization: Bearer gcdn_your_api_key"`
      },
      {
        language: 'javascript',
        code: `const fileId = 'file_abc123def456';
const response = await fetch(\`https://api.ghostcdn.xyz/v1/files/\${fileId}\`, {
  method: 'DELETE',
  headers: {
    'Authorization': 'Bearer gcdn_your_api_key'
  }
});

if (response.ok) {
  const result = await response.json();
  console.log('File deleted:', result.message);
} else {
  console.error('Error:', response.status, await response.text());
}`
      }
    ],
    response: `{
  "success": true,
  "message": "File deleted successfully",
  "data": {
    "deletedFileId": "file_abc123def456",
    "deletedAt": "2024-01-01T00:00:00Z"
  }
}`
  }
];