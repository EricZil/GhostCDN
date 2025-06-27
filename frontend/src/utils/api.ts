/**
 * API utility functions for interacting with the GhostCDN backend
 */

/**
 * Upload options for file uploads
 */
export interface UploadOptions {
  filename?: string;
  optimize?: boolean;
  preserveExif?: boolean;
  generateThumbnails?: boolean;
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
  }
}> {
  const requestData = {
    ...fileInfo,
    ...options,
  };
  
  // Use the secure server-side proxy
  const response = await fetch('/api/proxy/upload?type=guest&action=presigned', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestData),
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
 * @param options Upload options
 * @returns Promise with the presigned URL result
 */
export async function getUserPresignedUrl(
  fileInfo: { filename: string; contentType: string; fileSize: number },
  token: string,
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
  }
}> {
  const requestData = {
    ...fileInfo,
    ...options,
    token,
  };
  
  // Use the secure server-side proxy
  const response = await fetch('/api/proxy/upload?type=user&action=presigned', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestData),
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
  options: { generateThumbnails?: boolean } = {}
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
    fileKey,
    ...options,
  };
  
  // Use the secure server-side proxy
  const response = await fetch('/api/proxy/upload?type=guest&action=complete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestData),
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
  options: { generateThumbnails?: boolean } = {}
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
    fileKey,
    token,
    ...options,
  };
  
  // Use the secure server-side proxy
  const response = await fetch('/api/proxy/upload?type=user&action=complete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestData),
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
    'cloudflare-r2': string;
    'digitalocean-spaces': string;
  }
}> {
  // Use the secure server-side proxy
  const response = await fetch('/api/proxy?endpoint=storage/status', {
    method: 'GET',
  });
  
  if (!response.ok) {
    throw new Error('Failed to check storage status');
  }
  
  return response.json();
} 