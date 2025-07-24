import { ApiEndpoint } from './types';

export const uploadEndpoints: ApiEndpoint[] = [
  {
    method: 'POST',
    path: '/api/v1/files/presigned-url',
    description: 'Generate a presigned URL for secure file upload to cloud storage',
    statusCodes: [
      { code: 200, description: 'Presigned URL generated successfully' },
      { code: 400, description: 'Missing required parameters or invalid file info' },
      { code: 401, description: 'Invalid or missing API key' },
      { code: 403, description: 'Insufficient permissions (requires files.write)' },
      { code: 429, description: 'Rate limit exceeded' },
      { code: 500, description: 'Internal server error' }
    ],
    parameters: [
      { name: 'filename', type: 'string', required: true, description: 'Original filename with extension' },
      { name: 'contentType', type: 'string', required: true, description: 'MIME type of the file (e.g., image/jpeg, video/mp4)' },
      { name: 'fileSize', type: 'number', required: true, description: 'File size in bytes' },
      { name: 'preserveFilename', type: 'boolean', required: false, description: 'Keep original filename in CDN URL (default: false)' },
      { name: 'optimize', type: 'boolean', required: false, description: 'Enable automatic image optimization (default: true)' },
      { name: 'preserveExif', type: 'boolean', required: false, description: 'Preserve EXIF metadata in images (default: false)' },
      { name: 'generateThumbnails', type: 'boolean', required: false, description: 'Generate thumbnail variants (default: false)' },
    ],
    examples: [
      {
        language: 'curl',
        code: `curl -X POST "https://api.ghostcdn.xyz/v1/files/presigned-url" \\
  -H "Authorization: Bearer gcdn_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "filename": "profile-photo.jpg",
    "contentType": "image/jpeg",
    "fileSize": 2048000,
    "preserveFilename": true,
    "optimize": true,
    "generateThumbnails": true
  }'`
      },
      {
        language: 'javascript',
        code: `const response = await fetch('https://api.ghostcdn.xyz/v1/files/presigned-url', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer gcdn_your_api_key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    filename: 'profile-photo.jpg',
    contentType: 'image/jpeg',
    fileSize: 2048000,
    preserveFilename: true,
    optimize: true,
    generateThumbnails: true
  })
});

if (response.ok) {
  const { data } = await response.json();
  console.log('Upload URL:', data.uploadUrl);
  console.log('File Key:', data.fileKey);
} else {
  console.error('Error:', response.status, await response.text());
}`
      },
      {
        language: 'python',
        code: `import requests
import json

url = "https://api.ghostcdn.xyz/v1/files/presigned-url"
headers = {
    "Authorization": "Bearer gcdn_your_api_key",
    "Content-Type": "application/json"
}
data = {
    "filename": "profile-photo.jpg",
    "contentType": "image/jpeg",
    "fileSize": 2048000,
    "preserveFilename": True,
    "optimize": True,
    "generateThumbnails": True
}

response = requests.post(url, headers=headers, json=data)

if response.status_code == 200:
    result = response.json()
    print(f"Upload URL: {result['data']['uploadUrl']}")
    print(f"File Key: {result['data']['fileKey']}")
else:
    print(f"Error {response.status_code}: {response.text}")`
      }
    ],
    response: `{
  "success": true,
  "data": {
    "uploadUrl": "https://storage.ghostcdn.xyz/upload/...",
    "fileKey": "user_abc123/def456-profile-photo.jpg",
    "fields": {
      "key": "user_abc123/def456-profile-photo.jpg",
      "policy": "eyJleHBpcmF0aW9uIjoiMjAyNC0wMS0wMVQwMTowMDowMFoiLCJjb25kaXRpb25zIjpbXX0=",
      "signature": "abc123def456...",
      "x-amz-algorithm": "AWS4-HMAC-SHA256",
      "x-amz-credential": "...",
      "x-amz-date": "20240101T000000Z"
    },
    "expiresAt": "2024-01-01T01:00:00Z"
  },
  "message": "Presigned URL generated successfully"
}`
  },
  {
    method: 'POST',
    path: '/api/v1/files/complete-upload/:fileKey',
    description: 'Complete the upload process after uploading to the presigned URL',
    statusCodes: [
      { code: 201, description: 'Upload completed successfully' },
      { code: 400, description: 'Missing or invalid file key' },
      { code: 401, description: 'Invalid or missing API key' },
      { code: 403, description: 'Insufficient permissions (requires files.write)' },
      { code: 404, description: 'File key not found or upload not initiated' },
      { code: 429, description: 'Rate limit exceeded' },
      { code: 500, description: 'Internal server error' }
    ],
    parameters: [
      { name: 'fileKey', type: 'string', required: true, description: 'File key from presigned URL response (URL parameter)' },
      { name: 'customName', type: 'string', required: false, description: 'Custom display name for the file' },
      { name: 'isPublic', type: 'boolean', required: false, description: 'Make file publicly accessible (default: true)' },
      { name: 'tags', type: 'array', required: false, description: 'Array of tags for file organization' },
      { name: 'generateThumbnails', type: 'boolean', required: false, description: 'Generate thumbnail variants (default: false)' },
    ],
    examples: [
      {
        language: 'curl',
        code: `curl -X POST "https://api.ghostcdn.xyz/v1/files/complete-upload/user_abc123%2Fdef456-profile-photo.jpg" \\
  -H "Authorization: Bearer gcdn_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "customName": "My Profile Photo",
    "isPublic": true,
    "tags": ["profile", "avatar", "user-content"],
    "generateThumbnails": true
  }'`
      },
      {
        language: 'javascript',
        code: `const fileKey = encodeURIComponent('user_abc123/def456-profile-photo.jpg');
const response = await fetch(\`https://api.ghostcdn.xyz/v1/files/complete-upload/\${fileKey}\`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer gcdn_your_api_key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    customName: 'My Profile Photo',
    isPublic: true,
    tags: ['profile', 'avatar', 'user-content'],
    generateThumbnails: true
  })
});

if (response.ok) {
  const result = await response.json();
  console.log('File URL:', result.data.url);
  console.log('File ID:', result.data.id);
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
    "tags": ["profile", "avatar", "user-content"],
    "createdAt": "2024-01-01T00:00:00Z",
    "downloadCount": 0
  },
  "message": "Upload completed successfully"
}`
  }
];