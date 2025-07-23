import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types for storage data
export interface StorageStats {
  totalFiles: number;
  totalSize: number;
  storageLimit: number;
  storagePercentage: number;
  available: number;
  storageByType: Array<{
    type: string;
    size: number;
    count: number;
    percentage: string;
  }>;
  weeklyGrowthRate: number;
  timestamp: string;
}

export interface OptimizationData {
  largeFiles: {
    count: number;
    files: Array<{
      id: string;
      fileName: string;
      fileSize: number;
      fileType: string;
      uploadedAt: string;
    }>;
    potentialSavings: number;
  };
  duplicates: {
    count: number;
    files: Array<{
      fileName: string;
      fileSize: number;
      count: number;
    }>;
    potentialSavings: number;
  };
  oldFiles: {
    count: number;
    files: Array<{
      id: string;
      fileName: string;
      fileSize: number;
      uploadedAt: string;
    }>;
    potentialSavings: number;
  };
  totalPotentialSavings: number;
  totalOptimizableFiles: number;
}

export interface StorageReport {
  summary: {
    totalFiles: number;
    totalSize: number;
    averageFileSize: number;
    oldestFile: string;
    newestFile: string;
  };
  fileTypes: Array<{
    type: string;
    count: number;
    size: number;
    percentage: number;
  }>;
  recentActivity: Array<{
    date: string;
    uploads: number;
    size: number;
  }>;
  topFiles: Array<{
    id: string;
    filename: string;
    size: number;
    uploadedAt: string;
  }>;
}

// API functions
const fetchStorageStats = async (): Promise<StorageStats> => {
  const response = await fetch('/api/storage?endpoint=stats');
  if (!response.ok) {
    throw new Error('Failed to fetch storage statistics');
  }
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.message || 'Failed to fetch storage statistics');
  }
  return result.data;
};

const fetchOptimizationData = async (): Promise<OptimizationData> => {
  const response = await fetch('/api/storage?endpoint=optimization');
  if (!response.ok) {
    throw new Error('Failed to fetch optimization data');
  }
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.message || 'Failed to fetch optimization data');
  }
  return result.data;
};

const fetchStorageReport = async (): Promise<StorageReport> => {
  const response = await fetch('/api/storage?endpoint=report');
  if (!response.ok) {
    throw new Error('Failed to fetch storage report');
  }
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.message || 'Failed to fetch storage report');
  }
  return result.data;
};

const refreshStorageCache = async (): Promise<void> => {
  const response = await fetch('/api/storage?endpoint=refresh', {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Failed to refresh storage cache');
  }
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.message || 'Failed to refresh storage cache');
  }
};

const executeOptimization = async (optimizationType: string, fileIds?: string[]): Promise<{
  optimizationType: string;
  filesOptimized: number;
  totalSavings: number;
  errors?: string[];
}> => {
  const response = await fetch('/api/storage?endpoint=optimize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      optimizationType,
      fileIds,
    }),
  });
  if (!response.ok) {
    throw new Error('Failed to execute optimization');
  }
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to execute optimization');
  }
  return result.data;
};

// Custom hooks
export const useStorageStats = () => {
  return useQuery({
    queryKey: ['storage', 'stats'],
    queryFn: fetchStorageStats,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useOptimizationData = () => {
  return useQuery({
    queryKey: ['storage', 'optimization'],
    queryFn: fetchOptimizationData,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 20 * 60 * 1000, // 20 minutes
  });
};

export const useStorageReport = () => {
  return useQuery({
    queryKey: ['storage', 'report'],
    queryFn: fetchStorageReport,
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

export const useRefreshStorageCache = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: refreshStorageCache,
    onSuccess: () => {
      // Invalidate all storage-related queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['storage'] });
    },
  });
};

export const useOptimizeStorage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ optimizationType, fileIds }: { optimizationType: string; fileIds?: string[] }) => 
      executeOptimization(optimizationType, fileIds),
    onSuccess: () => {
      // Invalidate storage-related queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['storage'] });
    },
  });
};

// Utility functions
export const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const formatPercentage = (value: number, total: number): string => {
  if (total === 0) return '0%';
  return ((value / total) * 100).toFixed(1) + '%';
};

export const getStorageColor = (percentage: number): string => {
  if (percentage < 50) return 'text-green-400';
  if (percentage < 80) return 'text-yellow-400';
  return 'text-red-400';
};