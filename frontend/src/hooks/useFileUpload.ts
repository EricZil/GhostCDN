"use client";

import { useState } from 'react';
import { uploadGuestFile, uploadUserFile } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

interface UploadOptions {
  filename?: string;
  optimize?: boolean;
  preserveExif?: boolean;
  generateThumbnails?: boolean;
}

interface UploadResult {
  success: boolean;
  url: string | null;
  key: string | null;
  provider: string | null;
  thumbnails?: {
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

  const { isAuthenticated, token } = useAuth();

  const estimateOptimization = (file: File): OptimizationEstimate => {
    const originalSize = file.size;
    let estimatedSize = originalSize;
    let compressionRatio = 1;
    
    if (file.type.startsWith('image/')) {
      const fileType = file.type.split('/')[1];
      
      switch (fileType) {
        case 'jpeg':
        case 'jpg':
          compressionRatio = 0.85;
          break;
        case 'png':
          compressionRatio = 0.75;
          break;
        case 'webp':
          compressionRatio = 0.95;
          break;
        case 'gif':
          compressionRatio = 0.98;
          break;
        default:
          compressionRatio = 0.9;
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
  };

  const uploadFile = async (file: File, options: UploadOptions = {}) => {
    if (!file) return;

    setIsUploading(true);
    setProgress(0);
    setError(null);
    
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + 5;
      });
    }, 100);

    try {
      const response = isAuthenticated && token 
        ? await uploadUserFile(file, token, options)
        : await uploadGuestFile(file, options);

      clearInterval(interval);
      setProgress(100);

      if (response.success && response.data) {
        setResult({
          success: true,
          url: response.data.url,
          key: response.data.key,
          provider: response.data.provider,
          thumbnails: response.data.thumbnails || null,
        });
      } else {
        throw new Error(response.message || 'Upload failed');
      }
    } catch (err) {
      clearInterval(interval);
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
  };

  const reset = () => {
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
  };

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