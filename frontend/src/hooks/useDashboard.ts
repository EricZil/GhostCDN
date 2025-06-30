import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardStats {
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

interface Upload {
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

interface Activity {
  type: string;
  message: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

interface Analytics {
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

interface StorageInfo {
  totalFiles: number;
  totalSize: number;
  storageLimit: number;
  storagePercentage: number;
  storageByType: Record<string, unknown>[];
  available: number;
}

export function useDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for different data types
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);

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

  // Fetch dashboard overview
  const fetchOverview = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await callDashboardAPI('overview');
      if (response.success) {
        setDashboardStats(response.data);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch overview';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [callDashboardAPI, user]);

  // Fetch uploads with filters
  const fetchUploads = useCallback(async (page = 1, limit = 20, filters?: Record<string, unknown>) => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
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
        setUploads(response.data.uploads);
        return response.data.pagination;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch uploads';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [callDashboardAPI, user]);

  // Fetch analytics
  const fetchAnalytics = useCallback(async (period = '7d') => {
    try {
      setLoading(true);
      setError(null);
      const response = await callDashboardAPI('analytics', 'GET', undefined, { period });
      if (response.success) {
        setAnalytics(response.data);
      }
    } catch {
      setError('Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  }, [callDashboardAPI]);

  // Fetch storage info
  const fetchStorage = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await callDashboardAPI('storage');
      if (response.success) {
        setStorageInfo(response.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch storage info');
    } finally {
      setLoading(false);
    }
  }, [callDashboardAPI]);

  // Fetch activities
  const fetchActivities = useCallback(async (page = 1, limit = 20) => {
    try {
      setLoading(true);
      setError(null);
      const response = await callDashboardAPI('activity', 'GET', undefined, {
        page: page.toString(),
        limit: limit.toString()
      });
      if (response.success) {
        setActivities(response.data.activities);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch activities');
    } finally {
      setLoading(false);
    }
  }, [callDashboardAPI]);

  // Delete file
  const deleteFile = useCallback(async (fileId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        endpoint: 'file',
        fileId: fileId
      });
      
      const response = await fetch(`/api/dashboard?${params.toString()}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete file');
      }

      const data = await response.json();
      if (data.success) {
        // Refresh uploads after deletion - pass current parameters
        await fetchUploads(1, 20);
        await fetchOverview();
        await fetchStorage();
      }
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete file');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchUploads, fetchOverview, fetchStorage]);

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

  // Bulk delete files
  const bulkDeleteFiles = useCallback(async (fileIds: string[]) => {
    try {
      setLoading(true);
      setError(null);
      const response = await callDashboardAPI('files/bulk', 'DELETE', { fileIds });
      
      if (response.success) {
        // Refresh uploads after deletion - pass current parameters
        await fetchUploads(1, 20);
        await fetchOverview();
        await fetchStorage();
        await logActivity('DELETE', `Bulk deleted ${fileIds.length} files`);
      }
      return response;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete files');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [callDashboardAPI, fetchUploads, fetchOverview, fetchStorage, logActivity]);

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
    // State
    loading,
    error,
    dashboardStats,
    uploads,
    analytics,
    storageInfo,
    activities,
    
    // Actions
    fetchOverview,
    fetchUploads,
    fetchAnalytics,
    fetchStorage,
    fetchActivities,
    deleteFile,
    bulkDeleteFiles,
    trackEvent,
    logActivity,
    
    // Utilities
    formatFileSize,
    formatTimeAgo,
  };
} 