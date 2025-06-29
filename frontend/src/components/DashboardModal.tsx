"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { getGravatarUrl } from '@/utils/gravatar';
import { PointerHighlight } from "@/components/PointerHighlight";
import { useDashboard } from '@/hooks/useDashboard';
import { useNotification } from '@/contexts/NotificationContext';
import { useAdmin } from '@/hooks/useAdmin';
import { useSettings } from '@/contexts/SettingsContext';
import ViewsChart from '@/components/dashboard/ViewsChart';
import StorageChart from '@/components/dashboard/StorageChart';
import TopFilesChart from '@/components/dashboard/TopFilesChart';
import FileSearch, { SearchFilters } from '@/components/dashboard/FileSearch';
import Pagination from '@/components/dashboard/Pagination';
import BulkActions from '@/components/dashboard/BulkActions';
import AdminOverview from '@/components/dashboard/admin/AdminOverview';
import AdminCachePerformance from '@/components/dashboard/admin/AdminCachePerformance';
import UserProfileModal from '@/components/dashboard/admin/UserProfileModal';

interface DashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  uploads: number;
  storageUsed: number;
  role: string;
  status: string;
}

interface AdminFile {
  fileName: string;
  fileSize: number;
  viewCount: number;
  uploadedAt: string;
  owner?: { name: string };
}

interface SystemMessage {
  id: string;
  title: string;
  content: string;
  type: 'INFO' | 'WARNING' | 'CRITICAL';
  isActive: boolean;
  createdAt: string;
}

const isAdminUser = (user: unknown): user is AdminUser => {
  return typeof user === 'object' && user !== null && 
    'name' in user && 'email' in user;
};

const isAdminFile = (file: unknown): file is AdminFile => {
  return typeof file === 'object' && file !== null && 
    'fileName' in file && 'fileSize' in file;
};

const isSystemMessage = (message: unknown): message is SystemMessage => {
  return typeof message === 'object' && message !== null && 
    'id' in message && 'title' in message;
};

export default function DashboardModal({ isOpen, onClose }: DashboardModalProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const { showNotification } = useNotification();
  const { refreshSettings } = useSettings();
  

  
  // New state for advanced features
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    query: '',
    fileType: 'all',
    dateRange: 'all',
    sizeRange: 'all',
    sortBy: 'uploadedAt',
    sortOrder: 'desc'
  });
  const [analyticsPeriod, setAnalyticsPeriod] = useState('7d');
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    fileId: string;
    fileName: string;
  }>({ isOpen: false, fileId: '', fileName: '' });
  const [copiedFileId, setCopiedFileId] = useState<string | null>(null);
  
  // Dashboard hook
  const {
    loading,
    dashboardStats,
    uploads,
    analytics,
    storageInfo,
    activities,
    fetchOverview,
    fetchUploads,
    fetchAnalytics,
    fetchStorage,
    fetchActivities,
    deleteFile,
    bulkDeleteFiles,
    formatFileSize,
    formatTimeAgo,
  } = useDashboard();

  // Admin hook
  const {
    loading: adminLoading,
    fetchAdminOverview,
    fetchUsers,
    fetchAdminFiles,
    fetchAdminAnalytics,
    fetchSystemSettings,
    updateSystemSettings,
    fetchSystemLogs,
    fetchSystemMessages,
    createSystemMessage,
    updateSystemMessage,
    deleteSystemMessage,
    formatFileSize: adminFormatFileSize,
    formatTimeAgo: adminFormatTimeAgo,
  } = useAdmin();

  // Admin state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [adminStats, setAdminStats] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [adminFiles, setAdminFiles] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [adminFileStats, setAdminFileStats] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [systemSettings, setSystemSettings] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [systemLogs, setSystemLogs] = useState<any[]>([]);
  const [settingsChanged, setSettingsChanged] = useState(false);
  
  // System Messages state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [systemMessages, setSystemMessages] = useState<any[]>([]);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageForm, setMessageForm] = useState({
    title: '',
    content: '',
    type: 'INFO' as 'CRITICAL' | 'WARNING' | 'INFO'
  });
  
  // User Profile Modal state
  const [userProfileModal, setUserProfileModal] = useState({
    isOpen: false,
    userId: ''
  });

  // Load user avatar
  useEffect(() => {
    if (user) {
      if (user.image) {
        setAvatarUrl(user.image);
      } else if (user.email) {
        setAvatarUrl(getGravatarUrl(user.email, 128));
      }
    }
  }, [user]);

  // Load dashboard data when modal opens
  useEffect(() => {
    if (isOpen && user) {
      fetchOverview();
      fetchUploads(1, itemsPerPage);
      fetchStorage();
      fetchActivities();
    }
  }, [isOpen, user, fetchOverview, fetchUploads, fetchStorage, fetchActivities, itemsPerPage]);

  // Load analytics data when analytics tab is active
  useEffect(() => {
    if (isOpen && activeTab === 'analytics' && user) {
      fetchAnalytics(analyticsPeriod);
    }
  }, [isOpen, activeTab, user, fetchAnalytics, analyticsPeriod]);

  // Load storage data when storage tab is active
  useEffect(() => {
    if (isOpen && activeTab === 'storage' && user) {
      fetchStorage();
    }
  }, [isOpen, activeTab, user, fetchStorage]);

  // Load admin data when admin tabs are active
  useEffect(() => {
    if (isOpen && isAdminMode && user?.role === 'ADMIN') {
      if (activeTab === 'admin-overview') {
        fetchAdminOverview().then(setAdminStats).catch(() => {});
      } else if (activeTab === 'admin-users') {
        fetchUsers().then(data => setAdminUsers(data.users)).catch(() => {});
      } else if (activeTab === 'admin-files') {
        fetchAdminFiles().then(data => {
          setAdminFiles(data.files);
          setAdminFileStats(data.stats);
        }).catch(() => {});
      } else if (activeTab === 'admin-analytics') {
        fetchAdminAnalytics().catch(() => {});
      } else if (activeTab === 'admin-system') {
        fetchSystemSettings().then(setSystemSettings).catch(() => {});
      } else if (activeTab === 'admin-logs') {
        fetchSystemLogs().then(data => setSystemLogs(data.logs)).catch(() => {});
      }
    }
  }, [isOpen, isAdminMode, activeTab, user, fetchAdminOverview, fetchUsers, fetchAdminFiles, fetchAdminAnalytics, fetchSystemSettings, fetchSystemLogs]);

  // Message management functions - moved before useEffect
  const loadSystemMessages = useCallback(async () => {
    try {
      const data = await fetchSystemMessages();
      setSystemMessages(data.messages);
    } catch {
    }
  }, [fetchSystemMessages, setSystemMessages]);

  // Load system messages when admin-system tab is active
  useEffect(() => {
    if (isOpen && isAdminMode && activeTab === 'admin-system' && user?.role === 'ADMIN') {
      loadSystemMessages();
    }
  }, [isOpen, isAdminMode, activeTab, user, loadSystemMessages]);

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Handle file deletion
  const handleDeleteFile = (fileId: string, fileName: string) => {
    setDeleteConfirmModal({
      isOpen: true,
      fileId,
      fileName
    });
  };

  const confirmDeleteFile = async () => {
    const { fileId, fileName } = deleteConfirmModal;
    setDeleteConfirmModal({ isOpen: false, fileId: '', fileName: '' });

    try {
      await deleteFile(fileId);
      showNotification({
        type: 'success',
        title: 'File Deleted',
        message: `Successfully deleted "${fileName}"`,
        duration: 4000
      });
    } catch {
    }
  };

  const cancelDeleteFile = () => {
    setDeleteConfirmModal({ isOpen: false, fileId: '', fileName: '' });
  };

  // Handle bulk operations
  const handleBulkDelete = async (fileIds: string[]) => {
    try {
      await bulkDeleteFiles(fileIds);
      setSelectedFiles([]);
      showNotification({
        type: 'success',
        title: 'Files Deleted',
        message: `Successfully deleted ${fileIds.length} files`,
        duration: 4000
      });
    } catch {
    }
  };

  const handleBulkDownload = async (fileIds: string[]) => {
    // Implementation for bulk download
    showNotification({
      type: 'info',
      title: 'Download Started',
      message: `Preparing ${fileIds.length} files for download`,
      duration: 3000
    });
  };

  // Handle file selection
  const handleFileSelect = (fileId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedFiles(prev => [...prev, fileId]);
    } else {
      setSelectedFiles(prev => prev.filter(id => id !== fileId));
    }
  };

  const handleSelectAll = () => {
    setSelectedFiles(uploads.map(upload => upload.id));
  };

  const handleDeselectAll = () => {
    setSelectedFiles([]);
  };

  // Handle search and filtering
  const handleSearch = useCallback((filters: SearchFilters) => {
    setSearchFilters(filters);
    setCurrentPage(1); // Reset to first page when searching
    fetchUploads(1, itemsPerPage, filters as unknown as Record<string, unknown>);
  }, [fetchUploads, itemsPerPage]);

  // Handle pagination
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    fetchUploads(page, itemsPerPage, searchFilters as unknown as Record<string, unknown>);
  }, [fetchUploads, itemsPerPage, searchFilters]);

  const handleItemsPerPageChange = useCallback((newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
    fetchUploads(1, newItemsPerPage, searchFilters as unknown as Record<string, unknown>);
  }, [fetchUploads, searchFilters]);

  // Handle analytics period change
  const handleAnalyticsPeriodChange = (period: string) => {
    setAnalyticsPeriod(period);
    fetchAnalytics(period);
  };

  // Message management functions
  const handleCreateMessage = async () => {
    try {
      await createSystemMessage(messageForm);
      setShowMessageModal(false);
      setMessageForm({ title: '', content: '', type: 'INFO' });
      await loadSystemMessages();
      
      showNotification({
        type: 'success',
        title: 'Message Created',
        message: 'System message has been created successfully',
        duration: 4000
      });
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Create Failed',
        message: error instanceof Error ? error.message : 'Failed to create message',
        duration: 6000
      });
    }
  };

  const toggleMessageStatus = async (messageId: string, isActive: boolean) => {
    try {
      await updateSystemMessage(messageId, { isActive });
      await loadSystemMessages();
      
      showNotification({
        type: 'success',
        title: 'Message Updated',
        message: `Message ${isActive ? 'activated' : 'deactivated'} successfully`,
        duration: 4000
      });
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Update Failed',
        message: error instanceof Error ? error.message : 'Failed to update message',
        duration: 6000
      });
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      await deleteSystemMessage(messageId);
      await loadSystemMessages();
      
      showNotification({
        type: 'success',
        title: 'Message Deleted',
        message: 'System message has been deleted successfully',
        duration: 4000
      });
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Delete Failed',
        message: error instanceof Error ? error.message : 'Failed to delete message',
        duration: 6000
      });
    }
  };

  // User management functions
  const openUserProfile = (userId: string) => {
    setUserProfileModal({
      isOpen: true,
      userId
    });
  };

  const closeUserProfile = () => {
    setUserProfileModal({
      isOpen: false,
      userId: ''
    });
  };

  const handleUserUpdate = () => {
    // Refresh users list
    if (user?.role === 'ADMIN') {
      fetchUsers().then(data => setAdminUsers(data.users)).catch(() => {});
    }
  };

  // Add copy to clipboard handler with acknowledgment
  const handleCopyLink = async (fileKey: string, fileId: string) => {
    try {
      const link = `${window.location.origin}/view/${encodeURIComponent(fileKey)}`;
      await navigator.clipboard.writeText(link);
      setCopiedFileId(fileId);
      
      // Show notification
      showNotification({
        type: 'success',
        title: 'Link Copied!',
        message: 'File link has been copied to clipboard',
        duration: 2000
      });
      
      // Reset copy state after 2 seconds
      setTimeout(() => setCopiedFileId(null), 2000);
    } catch {
      showNotification({
        type: 'error',
        title: 'Copy Failed',
        message: 'Failed to copy link to clipboard',
        duration: 3000
      });
    }
  };

  if (!isOpen) return null;

  // Define tabs based on admin mode
  const userTabs = [
    { 
      id: 'overview', 
      label: 'Overview', 
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    },
    { 
      id: 'uploads', 
      label: 'My Uploads', 
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    },
    { 
      id: 'analytics', 
      label: 'Analytics', 
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    },
    { 
      id: 'storage', 
      label: 'Storage', 
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    },
    { 
      id: 'activity', 
      label: 'Activity', 
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    },
  ];

  const adminTabs = [
    { 
      id: 'admin-overview', 
      label: 'System Overview', 
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
    },
    { 
      id: 'admin-users', 
      label: 'User Management', 
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
    },
    { 
      id: 'admin-files', 
      label: 'All Files', 
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    },
    { 
      id: 'admin-analytics', 
      label: 'Global Analytics', 
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    },
    { 
      id: 'admin-system', 
      label: 'System Settings', 
      icon: <>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </>
    },
    { 
      id: 'admin-logs', 
      label: 'System Logs', 
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    },
    { 
      id: 'admin-cache', 
      label: 'Cache Performance', 
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    },
  ];

  const tabs = isAdminMode ? adminTabs : userTabs;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-8">
            {/* Welcome Section */}
            <div className="bg-gradient-to-br from-blue-500/15 via-purple-500/15 to-indigo-500/15 rounded-3xl p-8 border border-blue-500/30 shadow-2xl backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 flex items-center justify-center text-3xl shadow-2xl">
                    👋
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">
                      Welcome back, {user?.name || 'User'}!
                    </h3>
                    <p className="text-lg text-gray-300">
                      Here&apos;s what&apos;s happening with your uploads
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Last login</p>
                  <p className="text-white font-medium">
                    {user?.lastLogin ? formatTimeAgo(user.lastLogin) : 'First time'}
                  </p>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {(dashboardStats ? [
                { 
                  label: 'Total Uploads', 
                  value: dashboardStats.totalUploads.toString(), 
                  change: dashboardStats.uploadsGrowth, 
                  icon: '📤', 
                  color: 'from-green-500 to-emerald-500' 
                },
                { 
                  label: 'Storage Used', 
                  value: formatFileSize(dashboardStats.storageUsed), 
                  change: dashboardStats.storageGrowth, 
                  icon: '💾', 
                  color: 'from-blue-500 to-cyan-500' 
                },
                { 
                  label: 'Total Views', 
                  value: dashboardStats.totalViews.toLocaleString(), 
                  change: dashboardStats.viewsGrowth, 
                  icon: '👁️', 
                  color: 'from-purple-500 to-pink-500' 
                },
                { 
                  label: 'Bandwidth', 
                  value: formatFileSize(dashboardStats.bandwidthUsed), 
                  change: dashboardStats.bandwidthGrowth, 
                  icon: '🌐', 
                  color: 'from-orange-500 to-red-500' 
                },
              ] : [
                { label: 'Total Uploads', value: '...', change: '...', icon: '📤', color: 'from-green-500 to-emerald-500' },
                { label: 'Storage Used', value: '...', change: '...', icon: '💾', color: 'from-blue-500 to-cyan-500' },
                { label: 'Total Views', value: '...', change: '...', icon: '👁️', color: 'from-purple-500 to-pink-500' },
                { label: 'Bandwidth', value: '...', change: '...', icon: '🌐', color: 'from-orange-500 to-red-500' },
              ]).map((stat, index) => (
                <div key={index} className="bg-[rgba(20,20,35,0.8)] rounded-2xl p-6 border border-gray-700/50 shadow-xl backdrop-blur-sm hover:scale-105 transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${stat.color} flex items-center justify-center text-lg shadow-lg`}>
                      {stat.icon}
                    </div>
                    <span className="text-sm text-green-400 font-semibold bg-green-400/10 px-3 py-1 rounded-full border border-green-400/20">{stat.change}</span>
                  </div>
                  <p className="text-3xl font-bold text-white mb-2">{stat.value}</p>
                  <p className="text-base text-gray-300 font-medium">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Recent Activity */}
            <div className="bg-[rgba(20,20,35,0.8)] rounded-2xl p-8 border border-gray-700/50 shadow-xl backdrop-blur-sm">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-xl font-bold text-white">Recent Activity</h4>
                <button className="text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium">
                  View All Activity
                </button>
              </div>
              <div className="space-y-4">
                {(dashboardStats?.recentActivity || []).slice(0, 4).map((activity, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 rounded-xl bg-[rgba(15,15,25,0.7)] border border-gray-700/40 hover:bg-[rgba(25,25,35,0.7)] transition-all duration-200">
                    <div className={`w-3 h-3 rounded-full shadow-lg ${
                      activity.type === 'UPLOAD' ? 'bg-green-500 shadow-green-500/50' : 
                      activity.type === 'DELETE' ? 'bg-red-500 shadow-red-500/50' : 'bg-blue-500 shadow-blue-500/50'
                    }`}></div>
                    <div className="flex-1">
                      <p className="text-base text-white">
                        <span className="font-semibold">{activity.message}</span>
                      </p>
                      <p className="text-sm text-gray-400 mt-1">{formatTimeAgo(activity.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'uploads':
        return (
          <div className="space-y-6">
            {/* Upload Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {dashboardStats ? [
                { label: 'This Month', value: dashboardStats.uploadsThisMonth.toString(), icon: '📅' },
                { label: 'Total Files', value: dashboardStats.totalUploads.toString(), icon: '📁' },
                { label: 'Total Views', value: dashboardStats.totalViews.toLocaleString(), icon: '👁️' },
              ].map((stat, index) => (
                <div key={index} className="bg-[rgba(20,20,35,0.6)] rounded-xl p-4 border border-gray-800/40">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{stat.icon}</span>
                    <div>
                      <p className="text-xl font-bold text-white">{stat.value}</p>
                      <p className="text-sm text-gray-400">{stat.label}</p>
                    </div>
                  </div>
                </div>
              )) : [
                { label: 'This Month', value: '...', icon: '📅' },
                { label: 'Total Files', value: '...', icon: '📁' },
                { label: 'Total Views', value: '...', icon: '👁️' },
              ].map((stat, index) => (
                <div key={index} className="bg-[rgba(20,20,35,0.6)] rounded-xl p-4 border border-gray-800/40">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{stat.icon}</span>
                    <div>
                      <p className="text-xl font-bold text-white">{stat.value}</p>
                      <p className="text-sm text-gray-400">{stat.label}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Search and Filters */}
            <FileSearch
              onSearch={handleSearch}
              totalFiles={uploads.length}
              isLoading={loading}
            />

            {/* Bulk Actions */}
            <BulkActions
              selectedFiles={selectedFiles}
              totalFiles={uploads.length}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
              onBulkDelete={handleBulkDelete}
              onBulkDownload={handleBulkDownload}
              isLoading={loading}
            />

            {/* File List */}
            <div className="bg-[rgba(20,20,35,0.6)] rounded-xl border border-gray-800/40 overflow-hidden">
              <div className="p-4 border-b border-gray-800/40">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-white">Recent Uploads</h4>
                  <button className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                    View All
                  </button>
                </div>
              </div>
              <div className="divide-y divide-gray-800/40">
                {uploads.slice(0, 20).map((file, index) => {
                  const isSelected = selectedFiles.includes(file.id);
                  return (
                    <div key={index} className={`p-4 transition-colors ${isSelected ? 'bg-purple-500/10 border-l-4 border-purple-500' : 'hover:bg-[rgba(30,30,45,0.3)]'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {/* Selection Checkbox */}
                          <button
                            onClick={() => handleFileSelect(file.id, !isSelected)}
                            className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center ${
                              isSelected 
                                ? 'bg-purple-500 border-purple-500' 
                                : 'border-gray-600 hover:border-purple-400'
                            }`}
                          >
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>

                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 flex items-center justify-center">
                            <span className="text-sm">📷</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white truncate max-w-[200px]">{file.fileName}</p>
                            <p className="text-xs text-gray-400">{formatFileSize(file.fileSize)} • {file.fileType} • {formatTimeAgo(file.uploadedAt)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm text-white">{file.viewCount} views</p>
                          </div>
                          <div className="flex items-center gap-3">
                            {/* Enhanced Copy Button */}
                            <button 
                              onClick={() => handleCopyLink(file.fileKey, file.id)}
                              className={`group relative px-3 py-2 rounded-xl border transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                                copiedFileId === file.id
                                  ? 'bg-gradient-to-r from-green-500/30 to-emerald-500/30 border-green-400/50 text-green-300 shadow-lg shadow-green-500/20'
                                  : 'bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border-blue-400/30 text-blue-300 hover:from-blue-500/20 hover:to-indigo-500/20 hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-500/20'
                              }`}
                              title={copiedFileId === file.id ? "Copied!" : "Copy link"}
                            >
                              <div className="flex items-center gap-2">
                                {copiedFileId === file.id ? (
                                  <>
                                    <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span className="text-xs font-medium">Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4 group-hover:rotate-12 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    <span className="text-xs font-medium">Copy</span>
                                  </>
                                )}
                              </div>
                            </button>

                            {/* Enhanced Delete Button */}
                            <button 
                              onClick={() => handleDeleteFile(file.id, file.fileName)}
                              className="group relative px-3 py-2 rounded-xl border bg-gradient-to-r from-red-500/10 to-rose-500/10 border-red-400/30 text-red-300 hover:from-red-500/20 hover:to-rose-500/20 hover:border-red-400/50 hover:shadow-lg hover:shadow-red-500/20 transition-all duration-300 transform hover:scale-105 active:scale-95"
                              title="Delete file"
                            >
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 group-hover:rotate-12 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                <span className="text-xs font-medium">Delete</span>
                              </div>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                                })}
              </div>
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(uploads.length / itemsPerPage)}
              totalItems={uploads.length}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
              isLoading={loading}
            />
          </div>
        );

      case 'analytics':
        return (
          <div className="relative">
            {/* Analytics Content (blurred) */}
            <div className="space-y-6 blur-sm pointer-events-none">
              {/* Analytics Header with Period Selector */}
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-semibold text-white">Analytics Dashboard</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Time Period:</span>
                  <select
                    value={analyticsPeriod}
                    onChange={(e) => handleAnalyticsPeriodChange(e.target.value)}
                    className="px-3 py-2 bg-black/50 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="24h">Last 24 Hours</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="90d">Last 90 Days</option>
                  </select>
                </div>
              </div>

              {/* Analytics Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[rgba(20,20,35,0.6)] rounded-xl p-6 border border-gray-800/40">
                  <h4 className="text-lg font-semibold text-white mb-4">Views Over Time</h4>
                  {analytics ? (
                    <ViewsChart data={analytics.viewsOverTime} period={analyticsPeriod} />
                  ) : (
                    <div className="h-80 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-gray-400">Loading chart...</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-[rgba(20,20,35,0.6)] rounded-xl p-6 border border-gray-800/40">
                  <h4 className="text-lg font-semibold text-white mb-4">Top Performing Files</h4>
                  {analytics ? (
                    <TopFilesChart data={analytics.topFiles} />
                  ) : (
                    <div className="h-80 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-gray-400">Loading chart...</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Detailed Stats */}
              <div className="bg-[rgba(20,20,35,0.6)] rounded-xl p-6 border border-gray-800/40">
                <h4 className="text-lg font-semibold text-white mb-4">Detailed Analytics</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {analytics ? [
                    { 
                      label: 'Avg. Views per File', 
                      value: analytics.averageViewsPerFile ? analytics.averageViewsPerFile.toFixed(1) : '0', 
                      trend: analytics.averageViewsPerFile > 0 ? 'up' : 'neutral' 
                    },
                    { 
                      label: 'Peak Traffic Hour', 
                      value: analytics.peakTrafficHour || 'N/A', 
                      trend: 'neutral' 
                    },
                    { 
                      label: 'Most Popular Format', 
                      value: analytics.mostPopularFormat || 'N/A', 
                      trend: analytics.mostPopularFormat ? 'up' : 'neutral' 
                    },
                    { 
                      label: 'Total Events', 
                      value: analytics.totalEvents ? analytics.totalEvents.toLocaleString() : '0', 
                      trend: analytics.totalEvents > 0 ? 'up' : 'neutral' 
                    },
                  ].map((stat, index) => (
                    <div key={index} className="text-center">
                      <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
                      <p className="text-sm text-gray-400 mb-2">{stat.label}</p>
                      <div className={`inline-flex items-center text-xs px-2 py-1 rounded-full ${
                        stat.trend === 'up' ? 'bg-green-500/20 text-green-400' :
                        stat.trend === 'down' ? 'bg-red-500/20 text-red-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {stat.trend === 'up' ? '↗' : stat.trend === 'down' ? '↘' : '→'}
                      </div>
                    </div>
                  )) : [
                    { label: 'Avg. Views per File', value: '...', trend: 'neutral' },
                    { label: 'Peak Traffic Hour', value: '...', trend: 'neutral' },
                    { label: 'Most Popular Format', value: '...', trend: 'neutral' },
                    { label: 'Total Events', value: '...', trend: 'neutral' },
                  ].map((stat, index) => (
                    <div key={index} className="text-center">
                      <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
                      <p className="text-sm text-gray-400 mb-2">{stat.label}</p>
                      <div className="inline-flex items-center text-xs px-2 py-1 rounded-full bg-gray-500/20 text-gray-400">
                        →
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Full Tab Overlay for Planned Feature */}
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="text-center space-y-6 p-8">
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border border-orange-400/30 flex items-center justify-center">
                  <svg className="w-10 h-10 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-white mb-3">Analytics</h3>
                  <p className="text-xl text-gray-300 mb-2">Possible Feature Update</p>
                  <p className="text-base text-gray-400 max-w-lg mx-auto leading-relaxed">
                    Analytics tracking is being developed. View tracking will be implemented in a future update to provide detailed insights about your uploaded files.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 text-orange-400">
                  <div className="w-3 h-3 bg-orange-400 rounded-full animate-pulse"></div>
                  <span className="text-base font-medium">Coming Soon</span>
                  <div className="w-3 h-3 bg-orange-400 rounded-full animate-pulse animation-delay-300"></div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'storage':
        return (
          <div className="relative">
            {/* Storage Content (blurred) */}
            <div className="space-y-6 blur-sm pointer-events-none">
              {/* Storage Overview */}
              <div className="bg-[rgba(20,20,35,0.6)] rounded-xl p-6 border border-gray-800/40">
                <h4 className="text-lg font-semibold text-white mb-4">Storage Usage</h4>
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Used: {storageInfo?.totalSize !== undefined ? formatFileSize(storageInfo.totalSize) : '0 KB'}</span>
                    <span className="text-gray-400">Available: {storageInfo?.available !== undefined ? formatFileSize(storageInfo.available) : '10.0 GB'}</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500" 
                      style={{ width: `${storageInfo?.storagePercentage ? Math.min(storageInfo.storagePercentage, 100) : 0}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {storageInfo?.storagePercentage !== undefined && storageInfo?.storageLimit ? 
                      `${storageInfo.storagePercentage.toFixed(1)}% of ${formatFileSize(storageInfo.storageLimit)} used` : 
                      '0.0% of 10.0 GB used'}
                  </p>
                </div>
                
                {/* Storage Breakdown Chart */}
                <div className="mt-6">
                  <h4 className="text-lg font-semibold text-white mb-4">Storage Breakdown by File Type</h4>
                  <div className="bg-[rgba(15,15,25,0.5)] rounded-xl p-6 border border-gray-800/30">
                    {storageInfo ? (
                      <StorageChart data={storageInfo.storageByType} formatFileSize={formatFileSize} />
                    ) : (
                      <div className="h-80 flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                          <p className="text-gray-400">Loading storage data...</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Storage Management */}
              <div className="bg-[rgba(20,20,35,0.6)] rounded-xl p-6 border border-gray-800/40">
                <h4 className="text-lg font-semibold text-white mb-4">Storage Management</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-[rgba(15,15,25,0.5)] rounded-lg border border-gray-800/30">
                    <div>
                      <p className="text-white font-medium">Auto-optimize uploads</p>
                      <p className="text-sm text-gray-400">Automatically compress images to save space</p>
                    </div>
                    <div className="w-12 h-6 bg-blue-500 rounded-full p-1 cursor-pointer">
                      <div className="w-4 h-4 bg-white rounded-full ml-auto"></div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-[rgba(15,15,25,0.5)] rounded-lg border border-gray-800/30">
                    <div>
                      <p className="text-white font-medium">Generate thumbnails</p>
                      <p className="text-sm text-gray-400">Create multiple sizes for better performance</p>
                    </div>
                    <div className="w-12 h-6 bg-gray-600 rounded-full p-1 cursor-pointer">
                      <div className="w-4 h-4 bg-white rounded-full"></div>
                    </div>
                  </div>

                  <button className="w-full p-3 bg-red-500/20 text-red-400 rounded-lg border border-red-500/30 hover:bg-red-500/30 transition-colors">
                    Clear Cache (128 MB)
                  </button>
                </div>
              </div>
            </div>

            {/* Full Tab Overlay for Planned Feature */}
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="text-center space-y-6 p-8">
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-400/30 flex items-center justify-center">
                  <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 1.79 4 4 4h8c0 2.21 1.79 4 4 4h8c2.21 0 4-1.79 4-4V7c0-2.21-1.79-4-4-4H8c-2.21 0-4 1.79-4 4z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h8m-8 4h6" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-white mb-3">Storage Management</h3>
                  <p className="text-xl text-gray-300 mb-2">Advanced Features Coming Soon</p>
                  <p className="text-base text-gray-400 max-w-lg mx-auto leading-relaxed">
                    Auto-optimization, thumbnail generation, and cache management features are being developed to help you manage your storage more efficiently.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 text-blue-400">
                  <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
                  <span className="text-base font-medium">In Development</span>
                  <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse animation-delay-300"></div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'activity':
        return (
          <div className="space-y-6">
            {/* Activity Feed */}
            <div className="bg-[rgba(20,20,35,0.8)] rounded-2xl p-6 border border-gray-700/50 shadow-xl backdrop-blur-sm">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-xl font-bold text-white">Recent Activity</h4>
                <button className="text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium">
                  View All Activity
                </button>
              </div>
              <div className="space-y-4">
                {(activities.length > 0 ? activities : [
                  { type: 'UPLOAD', message: 'No recent activity', createdAt: new Date().toISOString() }
                ]).map((activity, index) => {
                  const getActivityIcon = (type: string) => {
                    switch (type) {
                      case 'UPLOAD': return '📤';
                      case 'DELETE': return '🗑️';
                      case 'VIEW': return '👁️';
                      case 'DOWNLOAD': return '⬇️';
                      case 'SHARE': return '🔗';
                      case 'MILESTONE_REACHED': return '🏆';
                      case 'SETTINGS_CHANGED': return '⚙️';
                      case 'STORAGE_OPTIMIZED': return '⚡';
                      default: return '📋';
                    }
                  };
                  
                    return (
                      <div key={index} className="flex items-center gap-4 p-4 rounded-xl bg-[rgba(15,15,25,0.7)] border border-gray-700/40 hover:bg-[rgba(25,25,35,0.7)] transition-all duration-200">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm">{getActivityIcon(activity.type)}</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-base text-white">{activity.message}</p>
                          <p className="text-sm text-gray-400 mt-1">{formatTimeAgo(activity.createdAt)}</p>
                        </div>
                      </div>
                                         );
                  })}
              </div>
            </div>

            {/* Activity Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[rgba(20,20,35,0.8)] rounded-2xl p-6 border border-gray-700/50 shadow-xl backdrop-blur-sm">
                <h4 className="text-lg font-bold text-white mb-4">This Week</h4>
                <div className="space-y-3">
                  {(dashboardStats ? [
                    { label: 'Uploads', value: dashboardStats.uploadsThisMonth.toString(), color: 'text-green-400' },
                    { label: 'Views', value: dashboardStats.totalViews.toLocaleString(), color: 'text-blue-400' },
                    { label: 'Storage Used', value: formatFileSize(dashboardStats.storageUsed), color: 'text-purple-400' },
                    { label: 'Bandwidth', value: formatFileSize(dashboardStats.bandwidthUsed), color: 'text-orange-400' },
                  ] : [
                    { label: 'Uploads', value: '...', color: 'text-green-400' },
                    { label: 'Views', value: '...', color: 'text-blue-400' },
                    { label: 'Storage Used', value: '...', color: 'text-purple-400' },
                    { label: 'Bandwidth', value: '...', color: 'text-orange-400' },
                  ]).map((stat, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-gray-300">{stat.label}</span>
                      <span className={`font-bold text-lg ${stat.color}`}>{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[rgba(20,20,35,0.8)] rounded-2xl p-6 border border-gray-700/50 shadow-xl backdrop-blur-sm">
                <h4 className="text-lg font-bold text-white mb-4">All Time</h4>
                <div className="space-y-3">
                  {(dashboardStats ? [
                    { label: 'Total Uploads', value: dashboardStats.totalUploads.toString(), color: 'text-green-400' },
                    { label: 'Total Views', value: dashboardStats.totalViews.toLocaleString(), color: 'text-blue-400' },
                    { label: 'Storage Used', value: formatFileSize(dashboardStats.storageUsed), color: 'text-purple-400' },
                    { label: 'Total Bandwidth', value: formatFileSize(dashboardStats.bandwidthUsed), color: 'text-orange-400' },
                  ] : [
                    { label: 'Total Uploads', value: '...', color: 'text-green-400' },
                    { label: 'Total Views', value: '...', color: 'text-blue-400' },
                    { label: 'Storage Used', value: '...', color: 'text-purple-400' },
                    { label: 'Total Bandwidth', value: '...', color: 'text-orange-400' },
                  ]).map((stat, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-gray-300">{stat.label}</span>
                      <span className={`font-bold text-lg ${stat.color}`}>{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      // Admin tabs
      case 'admin-overview':
        return (
          <AdminOverview 
            adminStats={adminStats}
            adminLoading={adminLoading}
            adminFormatFileSize={adminFormatFileSize}
            adminFormatTimeAgo={adminFormatTimeAgo}
          />
        );

      case 'admin-users':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-semibold text-white">User Management</h3>
              <button className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30 hover:bg-blue-500/30 transition-colors">
                + Add User
              </button>
            </div>
            
            <div className="bg-[rgba(20,20,35,0.6)] rounded-xl border border-gray-800/40 overflow-hidden">
              <div className="p-4 border-b border-gray-800/40">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-white">All Users</h4>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Search users..." 
                      className="px-3 py-2 bg-black/50 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <select className="px-3 py-2 bg-black/50 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                      <option>All Roles</option>
                      <option>Admin</option>
                      <option>User</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-gray-800/40">
                {adminUsers.length > 0 ? adminUsers.map((user: unknown, index: number) => {
                  if (!isAdminUser(user)) return null;
                  return (
                  <div key={index} className="p-4 hover:bg-[rgba(30,30,45,0.3)] transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                          <span className="text-sm font-bold text-white">{user.name.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">{user.name}</p>
                          <p className="text-sm text-gray-400">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-sm text-white">{user.uploads}</p>
                          <p className="text-xs text-gray-400">Uploads</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-white">{adminFormatFileSize(user.storageUsed || 0)}</p>
                          <p className="text-xs text-gray-400">Storage</p>
                        </div>
                        <div className="text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.role === 'ADMIN' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                          }`}>
                            {user.role}
                          </span>
                        </div>
                        <div className="text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {user.status}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => openUserProfile(user.id)}
                            className="px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors text-sm font-medium flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Manage
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  );
                }).filter(Boolean) : (
                  <p className="p-8 text-center text-gray-400">
                    {adminLoading ? 'Loading users...' : 'No users found.'}
                  </p>
                )}
              </div>
            </div>
          </div>
        );

      case 'admin-files':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-semibold text-white">Global File Management</h3>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg border border-red-500/30 hover:bg-red-500/30 transition-colors">
                  Bulk Cleanup
                </button>
                <button className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30 hover:bg-blue-500/30 transition-colors">
                  Export Report
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {adminFileStats ? [
                { label: 'Total Files', value: adminFileStats.totalFiles.toLocaleString(), icon: '📁' },
                { label: 'Flagged Content', value: adminFileStats.flaggedFiles.toString(), icon: '⚠️' },
                { label: 'Orphaned Files', value: adminFileStats.orphanedFiles.toString(), icon: '🗑️' },
                { label: 'Large Files (>100MB)', value: adminFileStats.largeFiles.toString(), icon: '📦' },
              ].map((stat, index) => (
                <div key={index} className="bg-[rgba(20,20,35,0.6)] rounded-xl p-4 border border-gray-800/40">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{stat.icon}</span>
                    <div>
                      <p className="text-xl font-bold text-white">{stat.value}</p>
                      <p className="text-sm text-gray-400">{stat.label}</p>
                    </div>
                  </div>
                </div>
              )) : [
                { label: 'Total Files', icon: '📁' },
                { label: 'Flagged Content', icon: '⚠️' },
                { label: 'Orphaned Files', icon: '🗑️' },
                { label: 'Large Files (>100MB)', icon: '📦' },
              ].map((stat, index) => (
                <div key={index} className="bg-[rgba(20,20,35,0.6)] rounded-xl p-4 border border-gray-800/40">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{stat.icon}</span>
                    <div>
                      <p className="text-xl font-bold text-white">
                        {adminLoading ? '...' : '0'}
                      </p>
                      <p className="text-sm text-gray-400">{stat.label}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-[rgba(20,20,35,0.6)] rounded-xl border border-gray-800/40 overflow-hidden">
              <div className="p-4 border-b border-gray-800/40">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-white">All Files</h4>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Search files..." 
                      className="px-3 py-2 bg-black/50 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <select className="px-3 py-2 bg-black/50 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                      <option>All Types</option>
                      <option>Images</option>
                      <option>Videos</option>
                      <option>Documents</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {adminFiles.length > 0 ? (
                  <div className="divide-y divide-gray-800/40">
                    {adminFiles.map((file: unknown, index: number) => {
                      if (!isAdminFile(file)) return null;
                      return (
                      <div key={index} className="p-4 hover:bg-[rgba(30,30,45,0.3)] transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                              <span className="text-xs font-bold text-white">
                                {file.fileName.split('.').pop()?.toUpperCase().slice(0, 2) || 'FL'}
                              </span>
                            </div>
                            <div>
                              <p className="text-white font-medium truncate max-w-xs">{file.fileName}</p>
                              <p className="text-sm text-gray-400">{file.owner?.name || 'Unknown'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-center">
                              <p className="text-sm text-white">{adminFormatFileSize(file.fileSize)}</p>
                              <p className="text-xs text-gray-400">Size</p>
                            </div>
                            <div className="text-center">
                              <p className="text-sm text-white">{file.viewCount || 0}</p>
                              <p className="text-xs text-gray-400">Views</p>
                            </div>
                            <div className="text-center">
                              <p className="text-sm text-white">{adminFormatTimeAgo(file.uploadedAt)}</p>
                              <p className="text-xs text-gray-400">Uploaded</p>
                            </div>
                            <div className="flex gap-2">
                              <button className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                              <button className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                                            );
                    }).filter(Boolean)}
                  </div>
                ) : (
                  <p className="p-8 text-center text-gray-400">
                    {adminLoading ? 'Loading files...' : 'No files found.'}
                  </p>
                )}
              </div>
            </div>
          </div>
        );

      case 'admin-analytics':
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-semibold text-white">Global Analytics</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[rgba(20,20,35,0.6)] rounded-xl p-6 border border-gray-800/40">
                <h4 className="text-lg font-semibold text-white mb-4">Platform Usage</h4>
                <div className="h-80 flex items-center justify-center">
                  <p className="text-gray-400">Global analytics charts would be implemented here</p>
                </div>
              </div>
              <div className="bg-[rgba(20,20,35,0.6)] rounded-xl p-6 border border-gray-800/40">
                <h4 className="text-lg font-semibold text-white mb-4">Geographic Distribution</h4>
                <div className="h-80 flex items-center justify-center">
                  <p className="text-gray-400">World map with usage statistics would be here</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'admin-system':
        const handleSettingToggle = (key: string, value: boolean) => {
          setSystemSettings((prev: Record<string, unknown>) => ({ ...prev, [key]: value }));
          setSettingsChanged(true);
        };

        const handleSettingChange = (key: string, value: string | number) => {
          setSystemSettings((prev: Record<string, unknown>) => ({ ...prev, [key]: value }));
          setSettingsChanged(true);
        };

        const saveSettings = async () => {
          try {
            await updateSystemSettings(systemSettings);
            setSettingsChanged(false);
            
            // Refresh public settings context
            await refreshSettings();
            
            showNotification({
              type: 'success',
              title: 'Settings Updated',
              message: 'System settings have been saved successfully',
              duration: 4000
            });
          } catch {
          }
        };

        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-semibold text-white">System Settings</h3>
              {settingsChanged && (
                <button
                  onClick={saveSettings}
                  className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg border border-green-500/30 hover:bg-green-500/30 transition-colors"
                >
                  Save Changes
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[rgba(20,20,35,0.6)] rounded-xl p-6 border border-gray-800/40">
                <h4 className="text-lg font-semibold text-white mb-4">Platform Configuration</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-[rgba(15,15,25,0.5)] rounded-lg border border-gray-800/30">
                    <div>
                      <p className="text-white font-medium">User Registration</p>
                      <p className="text-sm text-gray-400">Allow new user signups</p>
                    </div>
                    <button
                      onClick={() => handleSettingToggle('userRegistration', !systemSettings?.userRegistration)}
                      className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${
                        systemSettings?.userRegistration ? 'bg-blue-500' : 'bg-gray-600'
                      }`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                        systemSettings?.userRegistration ? 'ml-auto' : ''
                      }`}></div>
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-[rgba(15,15,25,0.5)] rounded-lg border border-gray-800/30">
                    <div>
                      <p className="text-white font-medium">Maintenance Mode</p>
                      <p className="text-sm text-gray-400">Temporarily disable the platform</p>
                    </div>
                    <button
                      onClick={() => handleSettingToggle('maintenanceMode', !systemSettings?.maintenanceMode)}
                      className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${
                        systemSettings?.maintenanceMode ? 'bg-red-500' : 'bg-gray-600'
                      }`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                        systemSettings?.maintenanceMode ? 'ml-auto' : ''
                      }`}></div>
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="bg-[rgba(20,20,35,0.6)] rounded-xl p-6 border border-gray-800/40">
                <h4 className="text-lg font-semibold text-white mb-4">Storage Limits</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Guest Upload Limit (MB)</label>
                    <input 
                      type="number" 
                      value={systemSettings?.guestUploadLimit || 10}
                      onChange={(e) => handleSettingChange('guestUploadLimit', parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-black/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">User Storage Limit (GB)</label>
                    <input 
                      type="number" 
                      value={systemSettings?.userStorageLimit || 10}
                      onChange={(e) => handleSettingChange('userStorageLimit', parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-black/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Max File Size (MB)</label>
                    <input 
                      type="number" 
                      value={systemSettings?.maxFileSize || 100}
                      onChange={(e) => handleSettingChange('maxFileSize', parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-black/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* System Messages Section */}
            <div className="bg-[rgba(20,20,35,0.6)] rounded-xl p-6 border border-gray-800/40">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-lg font-semibold text-white">System Messages</h4>
                  <p className="text-sm text-gray-400">Manage announcements displayed on the main page</p>
                </div>
                <button
                  onClick={() => setShowMessageModal(true)}
                  className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30 hover:bg-blue-500/30 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Message
                </button>
              </div>
              
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {systemMessages.length > 0 ? systemMessages.map((message: unknown) => {
                  if (!isSystemMessage(message)) return null;
                  return (
                  <div key={message.id} className="flex items-center justify-between p-3 bg-[rgba(15,15,25,0.5)] rounded-lg border border-gray-800/30">
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`w-3 h-3 rounded-full ${
                        message.type === 'CRITICAL' ? 'bg-red-500' :
                        message.type === 'WARNING' ? 'bg-yellow-500' : 'bg-blue-500'
                      }`}></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{message.title}</p>
                        <p className="text-xs text-gray-400">{message.type} • {new Date(message.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleMessageStatus(message.id, !message.isActive)}
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          message.isActive 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-gray-500/20 text-gray-400'
                        }`}
                      >
                        {message.isActive ? 'Active' : 'Inactive'}
                      </button>
                      <button
                        onClick={() => deleteMessage(message.id)}
                        className="p-1 text-red-400 hover:text-red-300 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  );
                }).filter(Boolean) : (
                  <div className="text-center py-8 text-gray-400">
                    No system messages created yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'admin-logs':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-semibold text-white">System Logs</h3>
              <div className="flex gap-2">
                <select className="px-3 py-2 bg-black/50 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option>All Levels</option>
                  <option>Error</option>
                  <option>Warning</option>
                  <option>Info</option>
                </select>
                <button className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30 hover:bg-blue-500/30 transition-colors">
                  Export Logs
                </button>
              </div>
            </div>
            
            <div className="bg-[rgba(20,20,35,0.6)] rounded-xl border border-gray-800/40 overflow-hidden">
              <div className="p-4 border-b border-gray-800/40">
                <h4 className="text-lg font-semibold text-white">Recent System Events</h4>
              </div>
              <div className="max-h-96 overflow-y-auto font-mono text-sm">
                {systemLogs.length > 0 ? systemLogs.map((log, index) => (
                  <div key={index} className="p-3 border-b border-gray-800/20 hover:bg-[rgba(30,30,45,0.3)] transition-colors">
                    <div className="flex items-center gap-4">
                      <span className="text-gray-500 text-xs">{log.time}</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        log.level === 'ERROR' ? 'bg-red-500/20 text-red-400' :
                        log.level === 'WARN' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {log.level}
                      </span>
                      <span className="text-white flex-1">{log.message}</span>
                      <span className="text-gray-400 text-xs">{log.user}</span>
                    </div>
                  </div>
                )) : (
                  <div className="p-8 text-center text-gray-400">
                    {adminLoading ? 'Loading system logs...' : 'No system logs available.'}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'admin-cache':
        return <AdminCachePerformance />;

      default:
        return (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-400">Content for {activeTab} tab coming soon...</p>
          </div>
        );
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div className="relative w-full max-w-[95vw] h-[90vh] bg-gradient-to-br from-gray-900/95 via-black/95 to-purple-900/95 backdrop-blur-2xl rounded-3xl border border-purple-500/30 shadow-[0_32px_64px_rgba(0,0,0,0.4),0_0_50px_rgba(124,58,237,0.15)] overflow-hidden"
                 onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="relative px-10 py-6">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 via-pink-600/5 to-purple-600/5"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center">
                    <span className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-500 to-blue-600 tracking-tight font-geist-mono whitespace-nowrap">
                      GHOST&nbsp;
                    </span>
                    <PointerHighlight 
                      rectangleClassName="border-blue-500/50 dark:border-blue-500/50"
                      pointerClassName="text-blue-500"
                      containerClassName="inline-block"
                    >
                      <span className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-500 to-blue-600 tracking-tight font-geist-mono whitespace-nowrap">
                        CDN
                      </span>
                    </PointerHighlight>
                  </div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
                      {isAdminMode && (
                        <span className="relative">
                          <span className="bg-gradient-to-r from-red-400 via-orange-400 to-red-500 bg-clip-text text-transparent font-black tracking-wider">
                            ADMIN
                          </span>
                          <span className="absolute -inset-1 bg-gradient-to-r from-red-500/20 to-orange-500/20 blur-lg rounded-lg"></span>
                          <span className="text-white/80 mx-2">•</span>
                        </span>
                      )}
                      Dashboard
                    </h2>
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-gradient-to-r from-blue-500 text-white shadow-lg shadow-blue-500/25 border border-blue-400/30 animate-pulse">
                      BETA
                    </span>
                  </div>
                </div>
                <p className="text-gray-400 text-sm mt-1">
                  {isAdminMode ? 'System Administration Panel' : 'Manage your uploads and view analytics'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Admin Toggle Button - Only show for ADMIN users */}
              {user?.role === 'ADMIN' && (
                <motion.button
                  onClick={() => {
                    setIsAdminMode(!isAdminMode);
                    setActiveTab(isAdminMode ? 'overview' : 'admin-overview');
                  }}
                  className={`relative p-3 rounded-xl transition-all duration-300 group ${
                    isAdminMode 
                      ? 'bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/30 text-red-300 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
                      : 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 text-purple-300 hover:bg-gradient-to-r hover:from-purple-500/20 hover:to-pink-500/20 hover:border-purple-400/30'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title={isAdminMode ? 'Switch to User Mode' : 'Switch to Admin Mode'}
                >
                  <div className="relative">
                    <motion.div
                      animate={{ 
                        rotate: isAdminMode ? 180 : 0,
                        scale: isAdminMode ? 1.1 : 1
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      {isAdminMode ? (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </motion.div>
                    
                    {/* Glowing effect for admin mode */}
                    {isAdminMode && (
                      <motion.div
                        className="absolute inset-0 bg-red-500/20 rounded-xl blur-md"
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                  </div>
                </motion.button>
              )}

              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-all duration-200 p-3 hover:bg-white/10 rounded-xl group"
              >
                <svg
                  className="w-6 h-6 group-hover:rotate-90 transition-transform duration-200"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Sidebar */}
          <div className="w-72 bg-gradient-to-b from-purple-500/5 via-purple-500/3 to-pink-500/5 border-r border-purple-500/30 p-4 flex flex-col">
            <nav className="space-y-3 flex-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left px-5 py-4 rounded-xl text-base font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.3)] border border-purple-500/30'
                      : 'text-gray-300 hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-pink-500/10 hover:text-white hover:border hover:border-purple-500/20'
                  }`}
                >
                    <div className="flex items-center">
                      <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {tab.icon}
                      </svg>
                      {tab.label}
                    </div>
                </button>
              ))}
            </nav>

            {/* User Info - Moved to bottom */}
            <div className="mt-auto pt-2">
              <div className="p-3 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-pink-500/10 rounded-xl border border-purple-500/20 shadow-lg backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 via-purple-600 to-pink-600 flex items-center justify-center shadow-lg overflow-hidden">
                      {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                          src={avatarUrl} 
                          alt={user?.name || 'User'} 
                          className="w-full h-full object-cover"
                          onError={() => setAvatarUrl(null)}
                        />
                      ) : (
                        <span className="text-lg font-bold text-white">
                          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-[rgba(15,15,25,0.9)] rounded-full shadow-lg"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{user?.name || 'User'}</p>
                    <div className="flex items-center gap-2 mt-1">
                    </div>
                  </div>
                </div>
                
                {/* Quick stats */}
                <div className="mt-2 pt-2 border-t border-purple-500/20">
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div>
                      <p className="text-base font-bold text-white">
                        {dashboardStats ? dashboardStats.totalUploads : '...'}
                      </p>
                      <p className="text-xs text-gray-400">Uploads</p>
                    </div>
                    <div>
                      <p className="text-base font-bold text-white">
                        {dashboardStats ? formatFileSize(dashboardStats.storageUsed) : '...'}
                      </p>
                      <p className="text-xs text-gray-400">Storage</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-hidden bg-gradient-to-br from-[rgba(10,10,20,0.3)] to-[rgba(15,15,25,0.3)]">
            <div className="h-full overflow-y-auto p-6 dashboard-scroll">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {renderTabContent()}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
            </div>
          </motion.div>

          {/* Delete Confirmation Modal */}
          {deleteConfirmModal.isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
              onClick={cancelDeleteFile}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-gradient-to-br from-gray-900/95 via-red-900/20 to-gray-900/95 backdrop-blur-xl rounded-2xl border border-red-500/30 shadow-2xl max-w-md w-full mx-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                      <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Delete File</h3>
                      <p className="text-sm text-gray-400">This action cannot be undone.</p>
                    </div>
                  </div>
                  
                  <p className="text-gray-300 mb-6">
                    Are you sure you want to delete <span className="font-semibold text-white">&quot;{deleteConfirmModal.fileName}&quot;</span>? 
                    This will permanently remove it from your storage.
                  </p>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={cancelDeleteFile}
                      className="flex-1 px-4 py-2.5 bg-gray-700/50 hover:bg-gray-700/70 text-gray-300 hover:text-white rounded-lg border border-gray-600/50 transition-all duration-200 font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmDeleteFile}
                      className="flex-1 px-4 py-2.5 bg-red-500/80 hover:bg-red-500 text-white rounded-lg border border-red-500/50 transition-all duration-200 font-medium shadow-lg hover:shadow-red-500/25"
                    >
                      Delete File
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* System Message Modal */}
          {showMessageModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
              onClick={() => setShowMessageModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-gradient-to-br from-gray-900/95 via-purple-900/20 to-gray-900/95 backdrop-blur-xl rounded-2xl border border-purple-500/30 shadow-2xl max-w-2xl w-full mx-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Create System Message</h3>
                      <p className="text-sm text-gray-400">Send an announcement to all users on the main page</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-300 mb-2">Message Title</label>
                      <input
                        type="text"
                        value={messageForm.title}
                        onChange={(e) => setMessageForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Enter message title..."
                        className="w-full px-3 py-2 bg-black/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-300 mb-2">Message Content</label>
                      <textarea
                        value={messageForm.content}
                        onChange={(e) => setMessageForm(prev => ({ ...prev, content: e.target.value }))}
                        placeholder="Enter your message content..."
                        rows={4}
                        className="w-full px-3 py-2 bg-black/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 resize-none"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-300 mb-2">Message Type</label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { value: 'INFO', label: 'Information', color: 'blue', description: 'General announcements' },
                          { value: 'WARNING', label: 'Warning', color: 'yellow', description: 'Important notices' },
                          { value: 'CRITICAL', label: 'Critical', color: 'red', description: 'Urgent alerts' }
                        ].map((type) => (
                          <button
                            key={type.value}
                            onClick={() => setMessageForm(prev => ({ ...prev, type: type.value as 'INFO' | 'WARNING' | 'CRITICAL' }))}
                            className={`p-3 rounded-lg border transition-all ${
                              messageForm.type === type.value
                                ? `border-${type.color}-500 bg-${type.color}-500/20`
                                : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded-full mx-auto mb-2 ${
                              type.color === 'blue' ? 'bg-blue-500' :
                              type.color === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                            }`}></div>
                            <p className="text-sm font-medium text-white">{type.label}</p>
                            <p className="text-xs text-gray-400 mt-1">{type.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setShowMessageModal(false)}
                      className="flex-1 px-4 py-2.5 bg-gray-700/50 hover:bg-gray-700/70 text-gray-300 hover:text-white rounded-lg border border-gray-600/50 transition-all duration-200 font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateMessage}
                      disabled={!messageForm.title || !messageForm.content}
                      className="flex-1 px-4 py-2.5 bg-blue-500/80 hover:bg-blue-500 text-white rounded-lg border border-blue-500/50 transition-all duration-200 font-medium shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Create Message
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* User Profile Modal */}
          <UserProfileModal
            isOpen={userProfileModal.isOpen}
            onClose={closeUserProfile}
            userId={userProfileModal.userId}
            onUserUpdate={handleUserUpdate}
          />
        </>
      )}
    </AnimatePresence>
  );
} 