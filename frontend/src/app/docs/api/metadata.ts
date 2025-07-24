import { ApiEndpoint } from './types';

export const metadataEndpoints: ApiEndpoint[] = [
  {
    method: 'PUT',
    path: '/api/v1/files/:fileId',
    description: 'Update file metadata (name, visibility, tags)',
    statusCodes: [
      { code: 200, description: 'File updated successfully' },
      { code: 400, description: 'Invalid request data or parameters' },
      { code: 401, description: 'Invalid or missing API key' },
      { code: 403, description: 'Insufficient permissions (requires files.write)' },
      { code: 404, description: 'File not found or access denied' },
      { code: 429, description: 'Rate limit exceeded' },
      { code: 500, description: 'Internal server error' }
    ],
    parameters: [
      { name: 'fileId', type: 'string', required: true, description: 'Unique file identifier (URL parameter)' },
      { name: 'customName', type: 'string', required: false, description: 'New custom display name for the file' },
      { name: 'isPublic', type: 'boolean', required: false, description: 'Update public/private status' },
      { name: 'tags', type: 'array', required: false, description: 'Array of tags for file organization' },
    ],
    examples: [
      {
        language: 'curl',
        code: `curl -X PUT "https://api.ghostcdn.xyz/v1/files/file_abc123def456" \\
  -H "Authorization: Bearer gcdn_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "customName": "Updated Profile Photo",
    "isPublic": false,
    "tags": ["profile", "avatar", "private"]
  }'`
      },
      {
        language: 'javascript',
        code: `const fileId = 'file_abc123def456';
const response = await fetch(\`https://api.ghostcdn.xyz/v1/files/\${fileId}\`, {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer gcdn_your_api_key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    customName: 'Updated Profile Photo',
    isPublic: false,
    tags: ['profile', 'avatar', 'private']
  })
});

if (response.ok) {
  const result = await response.json();
  console.log('Updated file:', result.data);
} else {
  console.error('Error:', response.status, await response.text());
}`
      }
    ],
    response: `{
  "success": true,
  "data": {
    "id": "file_abc123def456",
    "originalName": "profile-photo.jpg",
    "customName": "Updated Profile Photo",
    "url": "https://cdn.ghostcdn.xyz/user_abc123/def456-profile-photo.jpg",
    "thumbnailUrl": "https://cdn.ghostcdn.xyz/user_abc123/def456-profile-photo_thumb.jpg",
    "fileSize": 2048000,
    "fileType": "image/jpeg",
    "isPublic": false,
    "downloadCount": 42,
    "tags": ["profile", "avatar", "private"],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T12:00:00Z"
  },
  "message": "File updated successfully"
}`
  }
];