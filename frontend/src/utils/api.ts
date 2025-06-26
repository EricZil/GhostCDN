/**
 * API utility functions for interacting with the GhostCDN backend
 */

interface UploadOptions {
  filename?: string;
  optimize?: boolean;
  preserveExif?: boolean;
  generateThumbnails?: boolean;
}

/**
 * Upload a file as a guest user
 * @param file The file to upload
 * @param options Upload options
 * @returns Promise with the upload result
 */
export async function uploadGuestFile(file: File, options: UploadOptions = {}): Promise<{ 
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
  const formData = new FormData();
  formData.append('file', file);
  
  // Add options to form data
  if (options.filename) {
    formData.append('filename', options.filename);
  }
  
  if (options.optimize !== undefined) {
    formData.append('optimize', options.optimize.toString());
  }
  
  if (options.preserveExif !== undefined) {
    formData.append('preserveExif', options.preserveExif.toString());
  }
  
  if (options.generateThumbnails !== undefined) {
    formData.append('generateThumbnails', options.generateThumbnails.toString());
  }
  
  // Use the secure server-side proxy
  const response = await fetch('/api/proxy/upload?type=guest', {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Upload failed');
  }
  
  return response.json();
}

/**
 * Upload a file as a registered user
 * @param file The file to upload
 * @param token Authentication token
 * @param options Upload options
 * @returns Promise with the upload result
 */
export async function uploadUserFile(file: File, token: string, options: UploadOptions = {}): Promise<{
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
  const formData = new FormData();
  formData.append('file', file);
  
  // Add options to form data
  if (options.filename) {
    formData.append('filename', options.filename);
  }
  
  if (options.optimize !== undefined) {
    formData.append('optimize', options.optimize.toString());
  }
  
  if (options.preserveExif !== undefined) {
    formData.append('preserveExif', options.preserveExif.toString());
  }
  
  if (options.generateThumbnails !== undefined) {
    formData.append('generateThumbnails', options.generateThumbnails.toString());
  }
  
  // Add the auth token to the form data
  formData.append('token', token);
  
  // Use the secure server-side proxy
  const response = await fetch('/api/proxy/upload?type=user', {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Upload failed');
  }
  
  return response.json();
}

/**
 * Delete a file
 * @param fileKey The key of the file to delete
 * @param isRegisteredUser Whether the file belongs to a registered user
 * @param token Optional authentication token
 * @returns Promise with the delete result
 */
export async function deleteFile(
  fileKey: string, 
  isRegisteredUser: boolean = false, 
  token?: string
): Promise<{ success: boolean; message: string }> {
  // Use the secure server-side proxy
  const response = await fetch('/api/proxy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      endpoint: `upload/${fileKey}`,
      method: 'DELETE',
      body: { 
        isRegisteredUser,
        token
      }
    }),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Delete failed');
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