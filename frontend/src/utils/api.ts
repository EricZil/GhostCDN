/**
 * API utility functions for interacting with the GhostCDN backend
 */

/**
 * Upload options for file uploads
 */
export interface UploadOptions {
  filename?: string;
  preserveFilename?: boolean;
  optimize?: boolean;
  preserveExif?: boolean;
  generateThumbnails?: boolean;
  skipOptimization?: boolean;
}

/**
 * Get a presigned URL for direct upload as a guest user
 * @param fileInfo Information about the file to upload
 * @param options Upload options
 * @returns Promise with the presigned URL result
 */
export async function getGuestPresignedUrl(
  fileInfo: { filename: string; contentType: string; fileSize: number },
  options: UploadOptions = {}
): Promise<{
  success: boolean;
  message: string;
  data?: {
    presignedUrl: string;
    fileKey: string;
    cdnUrl: string;
    provider: string;
    contentType: string;
  };
  quota?: {
    currentUsage: number;
    storageLimit: number;
    availableSpace: number;
  };
}> {
  const requestData = {
    ...fileInfo,
    ...options,
  };
  
  // Use the secure server-side proxy
  const response = await fetch('/api/proxy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      endpoint: 'upload/presigned/guest',
      method: 'POST',
      body: requestData,
    }),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to get presigned URL');
  }
  
  return response.json();
}

/**
 * Get a presigned URL for direct upload as a registered user
 * @param fileInfo Information about the file to upload
 * @param token Authentication token
 * @param userFolderName User's folder name (UUID)
 * @param options Upload options
 * @returns Promise with the presigned URL result
 */
export async function getUserPresignedUrl(
  fileInfo: { filename: string; contentType: string; fileSize: number },
  token: string,
  userFolderName: string,
  options: UploadOptions = {}
): Promise<{
  success: boolean;
  message: string;
  data?: {
    presignedUrl: string;
    fileKey: string;
    cdnUrl: string;
    provider: string;
    contentType: string;
  };
  quota?: {
    currentUsage: number;
    storageLimit: number;
    availableSpace: number;
  };
}> {
  const requestData = {
    ...fileInfo,
    ...options,
    userFolderName,
  };
  
  // Use the secure server-side proxy with Authorization header
  const response = await fetch('/api/proxy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      endpoint: 'upload/presigned/user',
      method: 'POST',
      body: requestData,
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to get presigned URL');
  }
  
  return response.json();
}

/**
 * Upload a file directly to storage using a presigned URL
 * @param file The file to upload
 * @param presignedUrl The presigned URL for upload
 * @param contentType The content type of the file
 * @param onProgress Optional progress callback
 * @returns Promise that resolves when the upload is complete
 */
export async function uploadFileWithPresignedUrl(
  file: File,
  presignedUrl: string,
  contentType: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    // Set up progress tracking
    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          onProgress(percentComplete);
        }
      };
    }
    
    // Set up completion handler
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };
    
    // Set up error handler
    xhr.onerror = () => {
      reject(new Error('Network error during upload'));
    };
    
    // Open the request
    xhr.open('PUT', presignedUrl);
    
    // Set content type
    xhr.setRequestHeader('Content-Type', contentType);
    
    // Send the file
    xhr.send(file);
  });
}

/**
 * Complete a guest upload after direct upload is finished
 * @param fileKey The key of the uploaded file
 * @param options Post-processing options
 * @returns Promise with the completion result
 */
export async function completeGuestUpload(
  fileKey: string,
  options: { generateThumbnails?: boolean; skipOptimization?: boolean } = {}
): Promise<{
  success: boolean;
  message: string;
  data?: {
    url: string;
    key: string;
    provider: string;
    thumbnails?: {
      small: string;
      medium: string;
      large: string;
    }
  }
}> {
  const requestData = {
    ...options,
  };
  
  // Use the secure server-side proxy
  const response = await fetch('/api/proxy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      endpoint: `upload/complete/guest/${encodeURIComponent(fileKey)}`,
      method: 'POST',
      body: requestData,
    }),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to complete upload');
  }
  
  return response.json();
}

/**
 * Complete a user upload after direct upload is finished
 * @param fileKey The key of the uploaded file
 * @param token Authentication token
 * @param options Post-processing options
 * @returns Promise with the completion result
 */
export async function completeUserUpload(
  fileKey: string,
  token: string,
  options: { generateThumbnails?: boolean; skipOptimization?: boolean } = {}
): Promise<{
  success: boolean;
  message: string;
  data?: {
    url: string;
    key: string;
    provider: string;
    thumbnails?: {
      small: string;
      medium: string;
      large: string;
    }
  }
}> {
  const requestData = {
    ...options,
  };
  
  // Use the secure server-side proxy with Authorization header
  const response = await fetch('/api/proxy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      endpoint: `upload/complete/user/${encodeURIComponent(fileKey)}`,
      method: 'POST',
      body: requestData,
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to complete upload');
  }
  
  return response.json();
}

/**
 * Check the status of storage providers
 * @returns Promise with the storage status
 */
export async function checkStorageStatus(): Promise<{
  success: boolean;
  message: string;
  providers: {
    'digitalocean-spaces': string;
  }
}> {
  // Use the secure server-side proxy
  const response = await fetch('/api/proxy?endpoint=health/storage', {
    method: 'GET',
  });
  
  if (!response.ok) {
    throw new Error('Failed to check storage status');
  }
  
  return response.json();
}

 
/**
 * API Key Management Functions
 */

export interface ApiKey {
  id: string;
  name: string;
  permissions: {
    files: {
      read: boolean;
      write: boolean;
      delete: boolean;
    };
  };
  lastUsed: string | null;
  usageCount: number;
  createdAt: string;
  expiresAt: string | null;
  isActive: boolean;
}

export interface ApiKeyUsage {
  totalRequests: number;
  dailyUsage: Array<{
    date: string;
    requests: number;
    avgResponseTime: number;
  }>;
  statusCodes: Array<{
    statusCode: number;
    count: number;
  }>;
  topEndpoints: Array<{
    endpoint: string;
    requests: number;
    avgResponseTime: number;
  }>;
  period: string;
}

/**
 * Get all API keys for the authenticated user
 * @param token JWT authentication token
 * @returns Promise with the API keys list
 */
export async function getApiKeys(token: string): Promise<{
  success: boolean;
  data: {
    keys: ApiKey[];
    total: number;
  };
}> {
  const response = await fetch('/api/proxy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      endpoint: 'keys',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to fetch API keys');
  }

  return response.json();
}

/**
 * Create a new API key
 * @param token JWT authentication token
 * @param keyData API key creation data
 * @returns Promise with the created API key
 */
export async function createApiKey(
  token: string,
  keyData: {
    name: string;
    permissions: {
      files: { read: boolean; write: boolean; delete: boolean };
    };
    expiresIn?: number | null;
  }
): Promise<{
  success: boolean;
  data: ApiKey & { key: string };
  message: string;
}> {
  const response = await fetch('/api/proxy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      endpoint: 'keys',
      method: 'POST',
      body: keyData,
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to create API key');
  }

  return response.json();
}

/**
 * Update an API key
 * @param token JWT authentication token
 * @param keyId API key ID
 * @param updates Updates to apply
 * @returns Promise with the updated API key
 */
export async function updateApiKey(
  token: string,
  keyId: string,
  updates: {
    name?: string;
    permissions?: {
      files: { read: boolean; write: boolean; delete: boolean };
    };
    isActive?: boolean;
  }
): Promise<{
  success: boolean;
  data: ApiKey;
  message: string;
}> {
  const response = await fetch('/api/proxy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      endpoint: `keys/${keyId}`,
      method: 'PUT',
      body: updates,
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to update API key');
  }

  return response.json();
}

/**
 * Delete an API key
 * @param token JWT authentication token
 * @param keyId API key ID
 * @returns Promise with the deletion result
 */
export async function deleteApiKey(
  token: string,
  keyId: string
): Promise<{
  success: boolean;
  message: string;
}> {
  const response = await fetch('/api/proxy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      endpoint: `keys/${keyId}`,
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to delete API key');
  }

  return response.json();
}

/**
 * Rotate an API key
 * @param token JWT authentication token
 * @param keyId API key ID
 * @returns Promise with the new API key
 */
export async function rotateApiKey(
  token: string,
  keyId: string
): Promise<{
  success: boolean;
  data: ApiKey & { key: string };
  message: string;
}> {
  const response = await fetch('/api/proxy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      endpoint: `keys/${keyId}/rotate`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to rotate API key');
  }

  return response.json();
}

/**
 * Get usage statistics for an API key
 * @param token JWT authentication token
 * @param keyId API key ID
 * @param days Number of days to fetch (default: 30)
 * @returns Promise with the usage statistics
 */
export async function getApiKeyUsage(
  token: string,
  keyId: string,
  days: number = 30
): Promise<{
  success: boolean;
  data: ApiKeyUsage;
}> {
  const response = await fetch('/api/proxy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      endpoint: `keys/${keyId}/usage?days=${days}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to fetch usage statistics');
  }

  return response.json();
}