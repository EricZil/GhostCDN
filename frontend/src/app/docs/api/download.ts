import { ApiEndpoint } from './types';

export const downloadEndpoints: ApiEndpoint[] = [
  {
    method: 'GET',
    path: '/api/v1/files',
    description: 'List all files in your account with pagination and filtering options',
    statusCodes: [
      { code: 200, description: 'Files retrieved successfully' },
      { code: 401, description: 'Invalid or missing API key' },
      { code: 403, description: 'Insufficient permissions (requires files.read)' },
      { code: 429, description: 'Rate limit exceeded' },
      { code: 500, description: 'Internal server error' }
    ],
    parameters: [
      { name: 'page', type: 'number', required: false, description: 'Page number for pagination (default: 1)' },
      { name: 'limit', type: 'number', required: false, description: 'Number of files per page (max: 100, default: 20)' },
      { name: 'search', type: 'string', required: false, description: 'Search term for filename filtering' },
      { name: 'fileType', type: 'string', required: false, description: 'Filter by MIME type (e.g., image/jpeg)' },
      { name: 'sortBy', type: 'string', required: false, description: 'Sort field: createdAt, originalName, fileSize, downloadCount (default: createdAt)' },
      { name: 'sortOrder', type: 'string', required: false, description: 'Sort direction: asc or desc (default: desc)' },
      { name: 'isPublic', type: 'boolean', required: false, description: 'Filter by public/private status' },
    ],
    examples: [
      {
        language: 'curl',
        code: `curl -X GET "https://api.ghostcdn.xyz/v1/files?page=1&limit=20&search=profile&sortBy=createdAt&sortOrder=desc" \\
  -H "Authorization: Bearer gcdn_your_api_key"`
      },
      {
        language: 'javascript',
        code: `const params = new URLSearchParams({
  page: '1',
  limit: '20',
  search: 'profile',
  sortBy: 'createdAt',
  sortOrder: 'desc'
});

const response = await fetch(\`https://api.ghostcdn.xyz/v1/files?\${params}\`, {
  headers: {
    'Authorization': 'Bearer gcdn_your_api_key'
  }
});

if (response.ok) {
  const result = await response.json();
  console.log('Files:', result.data.files);
  console.log('Total:', result.data.pagination.total);
} else {
  console.error('Error:', response.status, await response.text());
}`
      }
    ],
    response: `{
  "success": true,
  "data": {
    "files": [
      {
        "id": "file_abc123def456",
        "originalName": "profile-photo.jpg",
        "customName": "My Profile Photo",
        "url": "https://cdn.ghostcdn.xyz/user_abc123/def456-profile-photo.jpg",
        "thumbnailUrl": "https://cdn.ghostcdn.xyz/user_abc123/def456-profile-photo_thumb.jpg",
        "fileSize": 2048000,
        "fileType": "image/jpeg",
        "isPublic": true,
        "downloadCount": 42,
        "tags": ["profile", "avatar"],
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}`
  },
  {
    method: 'GET',
    path: '/api/v1/files/:fileId',
    description: 'Get detailed metadata for a specific file',
    statusCodes: [
      { code: 200, description: 'File metadata retrieved successfully' },
      { code: 401, description: 'Invalid or missing API key' },
      { code: 403, description: 'Insufficient permissions (requires files.read)' },
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
        code: `curl -X GET "https://api.ghostcdn.xyz/v1/files/file_abc123def456" \\
  -H "Authorization: Bearer gcdn_your_api_key"`
      },
      {
        language: 'javascript',
        code: `const fileId = 'file_abc123def456';
const response = await fetch(\`https://api.ghostcdn.xyz/v1/files/\${fileId}\`, {
  headers: {
    'Authorization': 'Bearer gcdn_your_api_key'
  }
});

if (response.ok) {
  const result = await response.json();
  console.log('File details:', result.data);
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
    "customName": "My Profile Photo",
    "url": "https://cdn.ghostcdn.xyz/user_abc123/def456-profile-photo.jpg",
    "thumbnailUrl": "https://cdn.ghostcdn.xyz/user_abc123/def456-profile-photo_thumb.jpg",
    "fileSize": 2048000,
    "fileType": "image/jpeg",
    "isPublic": true,
    "downloadCount": 42,
    "tags": ["profile", "avatar"],
    "metadata": {
      "width": 1920,
      "height": 1080,
      "format": "JPEG",
      "hasAlpha": false,
      "colorSpace": "sRGB"
    },
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}`
  }
];