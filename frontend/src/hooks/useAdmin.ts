import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

interface AdminStats {
  totalUsers: number;
  totalFiles: number;
  totalStorage: number;
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
    severity: 'high' | 'medium' | 'low';
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
  owner: {
    name: string;
    email: string;
  };
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

// Admin query keys for consistent caching
const adminQueryKeys = {
  overview: () => ['admin', 'overview'],
  users: (search?: string, role?: string, page = 1, limit = 20) => 
    ['admin', 'users', { search, role, page, limit }],
  files: (search?: string, type?: string, page = 1, limit = 20) => 
    ['admin', 'files', { search, type, page, limit }],
  settings: () => ['admin', 'settings'],
  logs: (level?: string, source?: string, page = 1, limit = 50) => 
    ['admin', 'logs', { level, source, page, limit }],
  messages: () => ['admin', 'messages'],
};

export const useAdmin = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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

  // Admin Overview Query
  const overviewQuery = useQuery({
    queryKey: adminQueryKeys.overview(),
    queryFn: async () => {
      const data = await makeAdminRequest('/overview');
      return data as AdminStats;
    },
    enabled: !!user && user.role === 'ADMIN',
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });

  // Users Query
  const useUsers = (search?: string, role?: string, page = 1, limit = 20) => {
    return useQuery({
      queryKey: adminQueryKeys.users(search, role, page, limit),
      queryFn: async () => {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });
        
        if (search) params.append('search', search);
        if (role && role !== 'all') params.append('role', role);

        const data = await makeAdminRequest(`/users?${params}`);
        return data as {
          users: AdminUser[];
          totalUsers: number;
          currentPage: number;
          totalPages: number;
        };
      },
      enabled: !!user && user.role === 'ADMIN',
      staleTime: 2 * 60 * 1000, // 2 minutes
      gcTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    });
  };

  // Update User Mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, updates }: {
      userId: string;
      updates: { role?: string; action?: 'suspend' | 'activate' };
    }) => {
      await makeAdminRequest(`/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },
    onSuccess: () => {
      // Invalidate users queries
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.overview() });
    },
  });

  // Delete User Mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await makeAdminRequest(`/users/${userId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      // Invalidate users queries
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.overview() });
    },
  });

  // Create User Mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: {
      name: string;
      email: string;
      password: string;
      role?: string;
    }) => {
      await makeAdminRequest('/users', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
    },
    onSuccess: () => {
      // Invalidate users queries
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.overview() });
    },
  });

  // Files Query
  const useFiles = (search?: string, type?: string, page = 1, limit = 20) => {
    return useQuery({
      queryKey: adminQueryKeys.files(search, type, page, limit),
      queryFn: async () => {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });
        
        if (search) params.append('search', search);
        if (type && type !== 'all') params.append('type', type);

        const data = await makeAdminRequest(`/files?${params}`);
        return data as {
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
        };
      },
      enabled: !!user && user.role === 'ADMIN',
      staleTime: 3 * 60 * 1000, // 3 minutes
      gcTime: 8 * 60 * 1000, // 8 minutes
      refetchOnWindowFocus: false,
    });
  };



  // System Settings Query
  const settingsQuery = useQuery({
    queryKey: adminQueryKeys.settings(),
    queryFn: async () => {
      const data = await makeAdminRequest('/settings');
      return data as SystemSettings;
    },
    enabled: !!user && user.role === 'ADMIN',
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
  });

  // Update System Settings Mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: Partial<SystemSettings>) => {
      await makeAdminRequest('/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
    },
    onSuccess: () => {
      // Invalidate settings query
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.settings() });
    },
  });

  // System Logs Query
  const useLogs = (level?: string, source?: string, page = 1, limit = 50) => {
    return useQuery({
      queryKey: adminQueryKeys.logs(level, source, page, limit),
      queryFn: async () => {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });
        
        if (level && level !== 'all') params.append('level', level);
        if (source && source !== 'all') params.append('source', source);

        const data = await makeAdminRequest(`/logs?${params}`);
        return data as {
          logs: SystemLog[];
          totalLogs: number;
          currentPage: number;
          totalPages: number;
          sources: string[];
          levels: string[];
        };
      },
      enabled: !!user && user.role === 'ADMIN',
      staleTime: 30 * 1000, // 30 seconds
      gcTime: 2 * 60 * 1000, // 2 minutes
      refetchOnWindowFocus: false,
    });
  };

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

  // System Messages Query
  const messagesQuery = useQuery({
    queryKey: adminQueryKeys.messages(),
    queryFn: async () => {
      const data = await makeAdminRequest('/messages');
      return data as { messages: SystemMessage[] };
    },
    enabled: !!user && user.role === 'ADMIN',
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });

  // Create System Message Mutation
  const createMessageMutation = useMutation({
    mutationFn: async (messageData: {
      title: string;
      content: string;
      type: 'CRITICAL' | 'WARNING' | 'INFO';
    }) => {
      const data = await makeAdminRequest('/messages', {
        method: 'POST',
        body: JSON.stringify(messageData),
      });
      return data as { message: SystemMessage };
    },
    onSuccess: () => {
      // Invalidate messages query
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.messages() });
    },
  });

  // Update System Message Mutation
  const updateMessageMutation = useMutation({
    mutationFn: async ({ messageId, updates }: {
      messageId: string;
      updates: Partial<Pick<SystemMessage, 'title' | 'content' | 'type' | 'isActive'>>;
    }) => {
      const data = await makeAdminRequest(`/messages/${messageId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      return data as { message: SystemMessage };
    },
    onSuccess: () => {
      // Invalidate messages query
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.messages() });
    },
  });

  // Delete System Message Mutation
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      await makeAdminRequest(`/messages/${messageId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      // Invalidate messages query
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.messages() });
    },
  });

  return {
    // Queries
    overviewQuery,
    useUsers,
    useFiles,
    settingsQuery,
    useLogs,
    messagesQuery,
    
    // Mutations
    updateUserMutation,
    deleteUserMutation,
    createUserMutation,
    updateSettingsMutation,
    createMessageMutation,
    updateMessageMutation,
    deleteMessageMutation,
    
    // Legacy state for backward compatibility (will be removed)
    loading: overviewQuery.isLoading || settingsQuery.isLoading || messagesQuery.isLoading,
    error: overviewQuery.error?.message || settingsQuery.error?.message || messagesQuery.error?.message || null,
    
    // Utilities
    formatFileSize,
    formatTimeAgo,
    
    // Query client for manual invalidation
    queryClient,
  };
};