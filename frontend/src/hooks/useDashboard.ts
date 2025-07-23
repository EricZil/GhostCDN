import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

export interface DashboardStats {
  totalUploads: number;
  uploadsGrowth: string;
  storageUsed: number;
  storageGrowth: string;
  totalViews: number;
  viewsGrowth: string;
  bandwidthUsed: number;
  bandwidthGrowth: string;
  uploadsThisMonth: number;
  recentActivity: Activity[];
}

export interface Upload {
  id: string;
  fileName: string;
  fileKey: string;
  fileSize: number;
  fileType: string;
  mimeType?: string;
  width?: number;
  height?: number;
  uploadedAt: string;
  viewCount: number;
  thumbnails?: {
    small: string;
    medium: string;
    large: string;
  } | null;
}

export interface Activity {
  type: string;
  message: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface Analytics {
  viewsOverTime: Record<string, unknown>[];
  topFiles: Array<{
    fileName: string;
    fileKey: string;
    views: number;
  }>;
  eventDistribution: Record<string, unknown>[];
  period: string;
  totalEvents: number;
  averageViewsPerFile: number;
  mostPopularFormat: string | null;
  peakTrafficHour: string;
}

export interface StorageInfo {
  totalFiles: number;
  totalSize: number;
  storageLimit: number;
  storagePercentage: number;
  storageByType: Array<{
    type: string;
    size: number;
    count: number;
    percentage: string;
  }>;
  available: number;
  weeklyGrowthRate?: number;
  timestamp?: string;
}

// Query keys for consistent caching
export const dashboardQueryKeys = {
  overview: (userEmail: string) => ['dashboard', 'overview', userEmail] as const,
  uploads: (userEmail: string, page?: number, limit?: number, filters?: Record<string, unknown>) => 
    ['dashboard', 'uploads', userEmail, page, limit, filters] as const,
  analytics: (userEmail: string, period?: string) => ['dashboard', 'analytics', userEmail, period] as const,
  storage: (userEmail: string) => ['dashboard', 'storage', userEmail] as const,
  activities: (userEmail: string, page?: number, limit?: number) => 
    ['dashboard', 'activities', userEmail, page, limit] as const,
  duplicates: (userEmail: string) => ['dashboard', 'duplicates', userEmail] as const,
} as const;

export function useDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Generic API call function
  const callDashboardAPI = useCallback(async (
    endpoint: string, 
    method: 'GET' | 'POST' | 'DELETE' = 'GET',
    body?: Record<string, unknown>,
    queryParams?: Record<string, string>
  ) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    const params = new URLSearchParams({ endpoint });
    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        params.append(key, value);
      });
    }

    const config: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body && method !== 'GET') {
      config.body = JSON.stringify(body);
    }

    const response = await fetch(`/api/dashboard?${params.toString()}`, config);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'API call failed');
    }

    return response.json();
  }, [user]);

  // Dashboard overview query
  const overviewQuery = useQuery({
    queryKey: dashboardQueryKeys.overview(user?.email || ''),
    queryFn: async () => {
      const response = await callDashboardAPI('overview');
      if (response.success) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to fetch overview');
    },
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });

  // Uploads query with pagination and filters
  const useUploads = (page = 1, limit = 20, filters?: Record<string, unknown>) => {
    return useQuery({
      queryKey: dashboardQueryKeys.uploads(user?.email || '', page, limit, filters),
      queryFn: async () => {
        const queryParams: Record<string, string> = {
          page: page.toString(),
          limit: limit.toString()
        };
        
        // Add filter parameters
        if (filters) {
          if (filters.query) queryParams.query = String(filters.query);
          if (filters.fileType && filters.fileType !== 'all') queryParams.fileType = String(filters.fileType);
          if (filters.dateRange && filters.dateRange !== 'all') queryParams.dateRange = String(filters.dateRange);
          if (filters.sizeRange && filters.sizeRange !== 'all') queryParams.sizeRange = String(filters.sizeRange);
          if (filters.sortBy) queryParams.sortBy = String(filters.sortBy);
          if (filters.sortOrder) queryParams.order = String(filters.sortOrder);
        }
        
        const response = await callDashboardAPI('uploads', 'GET', undefined, queryParams);
        if (response.success) {
          return response.data;
        }
        throw new Error(response.message || 'Failed to fetch uploads');
      },
      enabled: !!user?.email,
      staleTime: 2 * 60 * 1000, // 2 minutes
      gcTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    });
  };

  // Analytics query
  const useAnalytics = (period = '7d') => {
    return useQuery({
      queryKey: dashboardQueryKeys.analytics(user?.email || '', period),
      queryFn: async () => {
        const response = await callDashboardAPI('analytics', 'GET', undefined, { period });
        if (response.success) {
          return response.data;
        }
        throw new Error(response.message || 'Failed to fetch analytics');
      },
      enabled: !!user?.email,
      staleTime: 10 * 60 * 1000, // 10 minutes
      gcTime: 15 * 60 * 1000, // 15 minutes
      refetchOnWindowFocus: false,
    });
  };

  // Storage info query
  const storageQuery = useQuery({
    queryKey: dashboardQueryKeys.storage(user?.email || ''),
    queryFn: async () => {
      const response = await callDashboardAPI('storage');
      if (response.success) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to fetch storage info');
    },
    enabled: !!user?.email,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 8 * 60 * 1000, // 8 minutes
    refetchOnWindowFocus: false,
  });

  // Activities query
  const useActivities = (page = 1, limit = 20) => {
    return useQuery({
      queryKey: dashboardQueryKeys.activities(user?.email || '', page, limit),
      queryFn: async () => {
        const response = await callDashboardAPI('activity', 'GET', undefined, {
          page: page.toString(),
          limit: limit.toString()
        });
        if (response.success) {
          return response.data;
        }
        throw new Error(response.message || 'Failed to fetch activities');
      },
      enabled: !!user?.email,
      staleTime: 1 * 60 * 1000, // 1 minute
      gcTime: 3 * 60 * 1000, // 3 minutes
      refetchOnWindowFocus: false,
    });
  };

  // Delete file mutation
  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const response = await callDashboardAPI('delete', 'DELETE', { fileId });
      if (response.success) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to delete file');
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.uploads(user?.email || '') });
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.overview(user?.email || '') });
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.storage(user?.email || '') });
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.activities(user?.email || '') });
    },
  });

  // Log activity
  const logActivity = useCallback(async (type: string, message: string, metadata?: Record<string, unknown>) => {
    try {
      await callDashboardAPI('activity', 'POST', {
        type,
        message,
        metadata,
        ipAddress: '', // Will be filled by backend
        userAgent: navigator.userAgent
      });
    } catch {
      // Silently handle activity logging errors
    }
  }, [callDashboardAPI]);

  // Bulk delete files mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (fileIds: string[]) => {
      const response = await callDashboardAPI('files/bulk', 'DELETE', { fileIds });
      if (response.success) {
        await logActivity('DELETE', `Bulk deleted ${fileIds.length} files`);
        return response.data;
      }
      throw new Error(response.message || 'Failed to delete files');
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.uploads(user?.email || '') });
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.overview(user?.email || '') });
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.storage(user?.email || '') });
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.activities(user?.email || '') });
    },
  });

  // Bulk download files mutation
  const bulkDownloadMutation = useMutation({
    mutationFn: async (fileIds: string[]) => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const params = new URLSearchParams({
        endpoint: 'files/bulk-download'
      });

      const response = await fetch(`/api/dashboard?${params.toString()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileIds })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to download files');
      }

      // Check if response is JSON (single file) or binary (zip file)
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        // Single file download - JSON response
        const result = await response.json();
        
        if (result.success) {
          const file = result.file;
          
          try {
            // Fetch the file as blob to force download
            const fileResponse = await fetch(file.downloadUrl);
            const blob = await fileResponse.blob();
            const url = window.URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = file.fileName;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up the object URL
            window.URL.revokeObjectURL(url);
          } catch {
            // Fallback: open in new tab if blob download fails
            window.open(file.downloadUrl, '_blank');
          }
        }
      } else {
        // Multiple files download - ZIP file response
        await logActivity('DOWNLOAD', `Bulk download initiated for ${fileIds.length} files`);
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // Extract filename from Content-Disposition header or use default
        const contentDisposition = response.headers.get('content-disposition');
        let fileName = `files_${Date.now()}.zip`;
        if (contentDisposition) {
          const fileNameMatch = contentDisposition.match(/filename="(.+)"/i);
          if (fileNameMatch) {
            fileName = fileNameMatch[1];
          }
        }
        
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
      
      return { success: true };
    },
  });

  // Duplicates query
  const duplicatesQuery = useQuery({
    queryKey: dashboardQueryKeys.duplicates(user?.email || ''),
    queryFn: async () => {
      const response = await callDashboardAPI('duplicates');
      if (response.success) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to find duplicates');
    },
    enabled: false, // Only run when explicitly triggered
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Track analytics event
  const trackEvent = useCallback(async (imageId: string, event: string, metadata?: Record<string, unknown>) => {
    try {
      await callDashboardAPI('track', 'POST', {
        imageId,
        event,
        ipAddress: '', // Will be filled by backend
        userAgent: navigator.userAgent,
        referer: window.location.href,
        ...metadata
      });
    } catch {
      // Silently handle event tracking errors
    }
  }, [callDashboardAPI]);

  // Utility functions
  const formatFileSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatTimeAgo = (date: string): string => {
    const now = new Date();
    const past = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    
    return past.toLocaleDateString();
  };

  return {
    // Queries
    overviewQuery,
    useUploads,
    useAnalytics,
    storageQuery,
    useActivities,
    duplicatesQuery,
    
    // Mutations
    deleteFileMutation,
    bulkDeleteMutation,
    bulkDownloadMutation,
    
    // Legacy state for backward compatibility (will be removed)
    dashboardStats: overviewQuery.data,
    storageInfo: storageQuery.data,
    loading: overviewQuery.isLoading || storageQuery.isLoading,
    error: overviewQuery.error?.message || storageQuery.error?.message || null,
    
    // Utilities
    trackEvent,
    logActivity,
    formatFileSize,
    formatTimeAgo,
    
    // Query client for manual invalidation
    queryClient,
  };
}