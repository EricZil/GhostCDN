"use client";

import { useState, useCallback, useRef } from 'react';
import { 
  getGuestPresignedUrl, 
  getUserPresignedUrl,
  uploadFileWithPresignedUrl,
  completeGuestUpload,
  completeUserUpload,
  UploadOptions 
} from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { optimizeImageFile } from '@/utils/imageOptimizer';

interface UploadResult {
  success: boolean;
  url: string | null;
  key: string | null;
  provider: string | null;
  thumbnails: {
    small: string;
    medium: string;
    large: string;
  } | null;
}

interface OptimizationEstimate {
  originalSize: number;
  estimatedSize: number;
  savingsPercent: number;
  savingsBytes: number;
}

export function useFileUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult>({
    success: false,
    url: null,
    key: null,
    provider: null,
    thumbnails: null,
  });
  
  // Use a ref to track if we're currently resetting to prevent infinite loops
  const isResetting = useRef(false);

  const { isAuthenticated, user } = useAuth();

  const estimateOptimization = useCallback((file: File): OptimizationEstimate => {
    const originalSize = file.size;
    let estimatedSize = originalSize;
    let compressionRatio = 1;
    
    if (file.type.startsWith('image/')) {
      const fileType = file.type.split('/')[1];
      
      switch (fileType) {
        case 'jpeg':
        case 'jpg':
          // JPEG compression is more aggressive on the backend
          compressionRatio = 0.60;
          break;
        case 'png':
          // PNG compression is much more effective with the backend's settings
          compressionRatio = 0.30;
          break;
        case 'webp':
          // WebP is already well compressed, but can still be improved
          compressionRatio = 0.85;
          break;
        case 'gif':
          // GIF compression is limited
          compressionRatio = 0.95;
          break;
        default:
          compressionRatio = 0.70;
      }
    }
    
    estimatedSize = Math.round(originalSize * compressionRatio);
    const savingsBytes = originalSize - estimatedSize;
    const savingsPercent = Math.round((savingsBytes / originalSize) * 100);
    
    return {
      originalSize,
      estimatedSize,
      savingsPercent,
      savingsBytes
    };
  }, []);

  const uploadFile = useCallback(async (file: File, options: UploadOptions = {}) => {
    if (!file) return;

    setIsUploading(true);
    setProgress(0);
    setError(null);
    
    try {
      let fileToUpload = file;
      let clientOptimized = false;
      
      // Step 0: Client-side optimization (if enabled and beneficial)
      if (options.optimize && file.type.startsWith('image/') && typeof window !== 'undefined') {
        setProgress(2);
        try {
          const optimizationResult = await optimizeImageFile(file);
          if (optimizationResult) {
            fileToUpload = optimizationResult.optimizedFile;
            clientOptimized = true;
            console.log(`Client-side optimization: ${file.size} → ${fileToUpload.size} bytes (${Math.round((1 - optimizationResult.stats.compressionRatio) * 100)}% reduction)`);
          }
        } catch (error) {
          console.warn('Client-side optimization failed, falling back to server optimization:', error);
          // Continue with original file and let server handle optimization
        }
      }
      
      // Step 1: Get presigned URL
      const fileInfo = {
        filename: options.filename || file.name,
        contentType: fileToUpload.type,
        fileSize: fileToUpload.size,
      };
      
      setProgress(5);
      
      // Get JWT token for authenticated requests
      let token = null;
      if (isAuthenticated && user?.r2FolderName) {
        try {
          const tokenResponse = await fetch('/api/auth/token');
          if (tokenResponse.ok) {
            const tokenData = await tokenResponse.json();
            token = tokenData.token; // Use the signed JWT token
          }
        } catch {
          // Token fetch failed, will proceed as guest upload
        }
      }
      
      const presignedResponse = isAuthenticated && user?.r2FolderName && token
        ? await getUserPresignedUrl(fileInfo, token, user.r2FolderName, options)
        : await getGuestPresignedUrl(fileInfo, options);
      
      if (!presignedResponse.success || !presignedResponse.data) {
        throw new Error(presignedResponse.message || 'Failed to get presigned URL');
      }
      
      const { presignedUrl, fileKey, contentType } = presignedResponse.data;
      
      setProgress(10);
      
      // Step 2: Upload file directly to storage
      await uploadFileWithPresignedUrl(
        fileToUpload,
        presignedUrl,
        contentType,
        (uploadProgress) => {
          // Map the 0-100 upload progress to 10-90 in our overall progress
          setProgress(10 + (uploadProgress * 0.8));
        }
      );
      
      setProgress(90);
      
      // Step 3: Complete the upload (notify backend)
      const completionOptions = {
        generateThumbnails: options.generateThumbnails,
        // Reduce server-side optimization if client already optimized
        skipOptimization: clientOptimized,
      };
      
      const completionResponse = isAuthenticated && user?.r2FolderName && token
        ? await completeUserUpload(fileKey, token, completionOptions)
        : await completeGuestUpload(fileKey, completionOptions);
      
      setProgress(100);
      
      if (completionResponse.success && completionResponse.data) {
        setResult({
          success: true,
          url: completionResponse.data.url,
          key: completionResponse.data.key,
          provider: completionResponse.data.provider,
          thumbnails: completionResponse.data.thumbnails || null,
        });
      } else {
        throw new Error(completionResponse.message || 'Upload completion failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
      setResult({
        success: false,
        url: null,
        key: null,
        provider: null,
        thumbnails: null,
      });
    } finally {
      setIsUploading(false);
    }
  }, [isAuthenticated, user?.r2FolderName]);

  const reset = useCallback(() => {
    // Prevent infinite loops by checking if we're already resetting
    if (isResetting.current) return;
    
    isResetting.current = true;
    
    // Use setTimeout to break the call stack and prevent infinite loops
    setTimeout(() => {
      setIsUploading(false);
      setProgress(0);
      setError(null);
      setResult({
        success: false,
        url: null,
        key: null,
        provider: null,
        thumbnails: null,
      });
      
      isResetting.current = false;
    }, 0);
  }, []);

  return {
    uploadFile,
    isUploading,
    progress,
    error,
    result,
    reset,
    isAuthenticated,
    estimateOptimization
  };
} 