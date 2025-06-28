import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface AdminStats {
  totalUsers: number;
  totalFiles: number;
  totalStorage: number;
  totalBandwidth: number;
  usersToday: number;
  filesThisWeek: number;
  systemHealth: {
    apiServer: { status: string; uptime: string };
    database: { status: string; uptime: string };
    fileStorage: { status: string; uptime: string };
    cdnNetwork: { status: string; uptime: string };
  };
  recentActivity: Array<{
    action: string;
    details: string;
    time: string;
    severity: string;
    user: string;
  }>;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  lastLogin: string | null;
  uploads: number;
  storageUsed: number;
  status: string;
}

interface AdminFile {
  id: string;
  fileName: string;
  fileKey: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
  viewCount: number;
  owner: {
    name: string;
    email: string;
  };
}

interface AdminAnalytics {
  totalViews: number;
  totalUploads: number;
  topFiles: Array<{
    fileName: string;
    views: number;
    fileSize: number;
  }>;
  userGrowth: number;
  storageGrowth: number;
  period: string;
}

interface SystemSettings {
  userRegistration: boolean;
  guestUploads: boolean;
  maintenanceMode: boolean;
  guestUploadLimit: number;
  userStorageLimit: number;
  maxFileSize: number;
}

interface SystemLog {
  id: string;
  time: string;
  level: string;
  message: string;
  source: string;
  user: string;
  userEmail?: string | null;
  ipAddress?: string | null;
  metadata?: Record<string, unknown> | null;
}

interface SystemMessage {
  id: string;
  title: string;
  content: string;
  type: 'CRITICAL' | 'WARNING' | 'INFO';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    name: string;
    email: string;
  };
}

export const useAdmin = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const makeAdminRequest = useCallback(async (
    endpoint: string, 
    options: RequestInit = {}
  ) => {
    if (!user || user.role !== 'ADMIN') {
      throw new Error('Admin access required');
    }

    const response = await fetch(`/api/admin${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return response.json();
  }, [user]);

  // Admin Overview
  const fetchAdminOverview = useCallback(async (): Promise<AdminStats> => {
    setLoading(true);
    setError(null);
    try {
      const data = await makeAdminRequest('/overview');
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch admin overview';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [makeAdminRequest]);

  // User Management
  const fetchUsers = useCallback(async (
    search?: string, 
    role?: string, 
    page = 1, 
    limit = 20
  ): Promise<{
    users: AdminUser[];
    totalUsers: number;
    currentPage: number;
    totalPages: number;
  }> => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      if (search) params.append('search', search);
      if (role && role !== 'all') params.append('role', role);

      const data = await makeAdminRequest(`/users?${params}`);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch users';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [makeAdminRequest]);

  const updateUser = useCallback(async (
    userId: string, 
    updates: { role?: string; action?: 'suspend' | 'activate' }
  ): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await makeAdminRequest(`/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update user';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [makeAdminRequest]);

  const deleteUser = useCallback(async (userId: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await makeAdminRequest(`/users/${userId}`, {
        method: 'DELETE',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete user';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [makeAdminRequest]);

  const createUser = useCallback(async (userData: {
    name: string;
    email: string;
    password: string;
    role?: string;
  }): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await makeAdminRequest('/users', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create user';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [makeAdminRequest]);

  // File Management
  const fetchAdminFiles = useCallback(async (
    search?: string,
    type?: string,
    page = 1,
    limit = 20
  ): Promise<{
    files: AdminFile[];
    totalFiles: number;
    currentPage: number;
    totalPages: number;
    stats: {
      totalFiles: number;
      largeFiles: number;
      flaggedFiles: number;
      orphanedFiles: number;
    };
  }> => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      if (search) params.append('search', search);
      if (type && type !== 'all') params.append('type', type);

      const data = await makeAdminRequest(`/files?${params}`);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch files';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [makeAdminRequest]);

  // Analytics
  const fetchAdminAnalytics = useCallback(async (period = '7d'): Promise<AdminAnalytics> => {
    setLoading(true);
    setError(null);
    try {
      const data = await makeAdminRequest(`/analytics?period=${period}`);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch analytics';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [makeAdminRequest]);

  // System Settings
  const fetchSystemSettings = useCallback(async (): Promise<SystemSettings> => {
    setLoading(true);
    setError(null);
    try {
      const data = await makeAdminRequest('/settings');
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch settings';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [makeAdminRequest]);

  const updateSystemSettings = useCallback(async (settings: Partial<SystemSettings>): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await makeAdminRequest('/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update settings';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [makeAdminRequest]);

  // System Logs
  const fetchSystemLogs = useCallback(async (
    level?: string,
    source?: string,
    page = 1,
    limit = 50
  ): Promise<{
    logs: SystemLog[];
    totalLogs: number;
    currentPage: number;
    totalPages: number;
    sources: string[];
    levels: string[];
  }> => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      if (level && level !== 'all') params.append('level', level);
      if (source && source !== 'all') params.append('source', source);

      const data = await makeAdminRequest(`/logs?${params}`);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch logs';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [makeAdminRequest]);

  // Utility functions
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const formatTimeAgo = useCallback((dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  }, []);

  // System Messages
  const fetchSystemMessages = useCallback(async (): Promise<{ messages: SystemMessage[] }> => {
    setLoading(true);
    setError(null);
    try {
      const data = await makeAdminRequest('/messages');
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch messages';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [makeAdminRequest]);

  const createSystemMessage = useCallback(async (messageData: {
    title: string;
    content: string;
    type: 'CRITICAL' | 'WARNING' | 'INFO';
  }): Promise<{ message: SystemMessage }> => {
    setLoading(true);
    setError(null);
    try {
      const data = await makeAdminRequest('/messages', {
        method: 'POST',
        body: JSON.stringify(messageData),
      });
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create message';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [makeAdminRequest]);

  const updateSystemMessage = useCallback(async (
    messageId: string,
    updates: Partial<Pick<SystemMessage, 'title' | 'content' | 'type' | 'isActive'>>
  ): Promise<{ message: SystemMessage }> => {
    setLoading(true);
    setError(null);
    try {
      const data = await makeAdminRequest(`/messages/${messageId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update message';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [makeAdminRequest]);

  const deleteSystemMessage = useCallback(async (messageId: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await makeAdminRequest(`/messages/${messageId}`, {
        method: 'DELETE',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete message';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [makeAdminRequest]);

  return {
    loading,
    error,
    
    // Admin Overview
    fetchAdminOverview,
    
    // User Management
    fetchUsers,
    updateUser,
    deleteUser,
    createUser,
    
    // File Management
    fetchAdminFiles,
    
    // Analytics
    fetchAdminAnalytics,
    
    // System Settings
    fetchSystemSettings,
    updateSystemSettings,
    
    // System Logs
    fetchSystemLogs,
    
    // System Messages
    fetchSystemMessages,
    createSystemMessage,
    updateSystemMessage,
    deleteSystemMessage,
    
    // Utilities
    formatFileSize,
    formatTimeAgo,
  };
}; 