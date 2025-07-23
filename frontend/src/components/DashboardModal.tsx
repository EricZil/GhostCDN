"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { getGravatarUrl } from '@/utils/gravatar';
import { PointerHighlight } from "@/components/PointerHighlight";
import { useDashboard } from '@/hooks/useDashboard';
import { useNotification } from '@/contexts/NotificationContext';
import { useAdmin } from '@/hooks/useAdmin';

import { SearchFilters } from '@/components/dashboard/FileSearch';
import DuplicateDetection from '@/components/dashboard/DuplicateDetection';
import AdminOverview from '@/components/dashboard/admin/AdminOverview';
import UserProfileModal from '@/components/dashboard/admin/UserProfileModal';
import {
  OverviewTab,
  UploadsTab,
  StorageTab,
  AnalyticsTab,
  ActivityTab,
  AdminUsersTab,
  AdminFilesTab,
  AdminSystemTab,
  AdminLogsTab
} from '@/components/dashboard/tabs';
import { DeleteConfirmModal } from '@/components/dashboard/modals/DeleteConfirmModal';
import { SystemMessageModal } from '@/components/dashboard/modals/SystemMessageModal';

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

  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    fileId: string;
    fileName: string;
  }>({ isOpen: false, fileId: '', fileName: '' });
  const [copiedFileId, setCopiedFileId] = useState<string | null>(null);
  const [expandedFileId, setExpandedFileId] = useState<string | null>(null);
  const [copiedThumbnail, setCopiedThumbnail] = useState<string | null>(null);
  
  // Dashboard hook
  const {
    useUploads,
    storageQuery,
    useActivities,
    deleteFileMutation,
    bulkDeleteMutation,
    bulkDownloadMutation,
    // Legacy compatibility
    dashboardStats,
    storageInfo,
    loading,
    error,
    formatFileSize,
    formatTimeAgo,
  } = useDashboard();

  // Admin hook
  const {
    overviewQuery: adminOverviewQuery,
    useUsers: useAdminUsers,
    useFiles: useAdminFiles,
    settingsQuery: systemSettingsQuery,
    useLogs: useSystemLogs,
    messagesQuery: systemMessagesQuery,
    createMessageMutation,
    updateMessageMutation,
    deleteMessageMutation,
    manualCleanupMutation,
  } = useAdmin();

  // Local state for UI interactions
  const [settingsChanged, setSettingsChanged] = useState(false);
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

  // Storage Tab state
  const [optimizationInProgress, setOptimizationInProgress] = useState(false);
  const [quotaSettings, setQuotaSettings] = useState({
    warningsEnabled: true,
    autoCleanupEnabled: false
  });
  const [reportGenerating, setReportGenerating] = useState(false);





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

  // Use React Query hooks for dashboard data
  const uploadsQuery = useUploads(currentPage, itemsPerPage, searchFilters as unknown as Record<string, unknown>);
  const activitiesQuery = useActivities(1, 20);
  
  // Extract data from queries
  const uploads = uploadsQuery.data?.uploads || [];
  const activities = activitiesQuery.data?.activities || [];
  // Admin queries (only enabled when needed)
  const adminUsersQuery = useAdminUsers('', '', 1, 20);
  const adminFilesQuery = useAdminFiles('', '', 1, 20);
  const systemLogsQuery = useSystemLogs('', '', 1, 50);
  
  // Extract admin data from queries
  const adminUsers = adminUsersQuery.data?.users || [];
  const adminFiles = adminFilesQuery.data?.files || [];
  const adminFileStats = adminFilesQuery.data?.stats;
  const systemLogs = systemLogsQuery.data?.logs || [];
  const systemSettings = systemSettingsQuery.data;
  const systemMessages = systemMessagesQuery.data?.messages || [];
  const adminStats = adminOverviewQuery.data;

  // Remove old useEffect hooks - React Query handles data fetching automatically

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
      await deleteFileMutation.mutateAsync(fileId);
      showNotification({
        type: 'success',
        title: 'File Deleted',
        message: `Successfully deleted "${fileName}"`,
        duration: 4000
      });
    } catch {
      showNotification({
        type: 'error',
        title: 'Delete Failed',
        message: 'Failed to delete file',
        duration: 4000
      });
    }
  };

  const cancelDeleteFile = () => {
    setDeleteConfirmModal({ isOpen: false, fileId: '', fileName: '' });
  };

  // Handle bulk operations
  const handleBulkDelete = async (fileIds: string[]) => {
    try {
      await bulkDeleteMutation.mutateAsync(fileIds);
      setSelectedFiles([]);
      showNotification({
        type: 'success',
        title: 'Files Deleted',
        message: `Successfully deleted ${fileIds.length} files`,
        duration: 4000
      });
    } catch {
      showNotification({
        type: 'error',
        title: 'Delete Failed',
        message: 'Failed to delete files',
        duration: 4000
      });
    }
  };

  const handleBulkDownload = async (fileIds: string[]) => {
    try {
      await bulkDownloadMutation.mutateAsync(fileIds);
      setSelectedFiles([]);
      showNotification({
        type: 'success',
        title: 'Download Started',
        message: `Downloading ${fileIds.length} files`,
        duration: 4000
      });
    } catch {
      showNotification({
        type: 'error',
        title: 'Download Failed',
        message: 'Failed to download files',
        duration: 4000
      });
    }
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
    setSelectedFiles(uploads.map((upload: { id: string }) => upload.id));
  };

  const handleDeselectAll = () => {
    setSelectedFiles([]);
  };

  // Handle search and filtering
  const handleSearch = useCallback((filters: SearchFilters) => {
    setSearchFilters(filters);
    setCurrentPage(1); // Reset to first page when searching
    // React Query will automatically refetch with new filters
  }, []);



  // Handle pagination
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    // React Query will automatically refetch with new page
  }, []);

  const handleItemsPerPageChange = useCallback((newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
    // React Query will automatically refetch with new items per page
  }, []);



  // Message management functions
  const handleCreateMessage = async () => {
    try {
      await createMessageMutation.mutateAsync(messageForm);
      setShowMessageModal(false);
      setMessageForm({ title: '', content: '', type: 'INFO' });
      
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
      await updateMessageMutation.mutateAsync({ messageId, updates: { isActive } });
      
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
      await deleteMessageMutation.mutateAsync(messageId);
      
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
    // React Query will automatically refresh the users list
    if (user?.role === 'ADMIN') {
      adminUsersQuery.refetch();
    }
  };

  // React Query handles data fetching automatically based on dependencies

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

  // Copy thumbnail link handler
  const copyThumbnailToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedThumbnail(type);
    setTimeout(() => setCopiedThumbnail(null), 2000);
  };

  // Storage Tab handlers
  const handleOptimizeFiles = () => {
    setOptimizationInProgress(true);
    // Simulate optimization process
    setTimeout(() => {
      setOptimizationInProgress(false);
      showNotification({
        type: 'success',
        title: 'Optimization Complete',
        message: 'Files have been optimized successfully',
        duration: 3000
      });
    }, 3000);
  };

  const handleQuotaSettingChange = (setting: string, value: boolean) => {
    setQuotaSettings(prev => ({
      ...prev,
      [setting]: value
    }));
    showNotification({
      type: 'info',
      title: 'Setting Updated',
      message: `${setting} has been ${value ? 'enabled' : 'disabled'}`,
      duration: 2000
    });
  };

  const handleGenerateReport = () => {
    setReportGenerating(true);
    // Simulate report generation
    setTimeout(() => {
      setReportGenerating(false);
      showNotification({
        type: 'success',
        title: 'Report Generated',
        message: 'Storage report has been generated successfully',
        duration: 3000
      });
    }, 2000);
  };

  // Toggle file expansion
  const toggleFileExpansion = (fileId: string) => {
    setExpandedFileId(expandedFileId === fileId ? null : fileId);
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
      id: 'duplicates', 
      label: 'Duplicates', 
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V15a2 2 0 01-2 2v0a2 2 0 01-2-2v-2a2 2 0 00-2-2H8z" />
    },

    { 
      id: 'storage', 
      label: 'Storage', 
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    },
    { 
      id: 'analytics', 
      label: 'Analytics', 
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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
      label: 'Analytics', 
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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
  ];

  const tabs = isAdminMode ? adminTabs : userTabs;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <OverviewTab 
            user={user}
            dashboardStats={dashboardStats}
            formatTimeAgo={formatTimeAgo}
            formatFileSize={formatFileSize}
          />
        );

      case 'uploads':
        return (
          <UploadsTab 
            dashboardStats={dashboardStats}
            formatFileSize={formatFileSize}
            uploads={uploads.map((upload: { thumbnails?: unknown; [key: string]: unknown }) => ({
              ...upload,
              thumbnails: upload.thumbnails || undefined
            }))}
            loading={loading}
            selectedFiles={selectedFiles}
            expandedFileId={expandedFileId}
            copiedFileId={copiedFileId}
            copiedThumbnail={copiedThumbnail}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            handleSearch={handleSearch}
            handleSelectAll={handleSelectAll}
            handleDeselectAll={handleDeselectAll}
            handleBulkDelete={handleBulkDelete}
            handleBulkDownload={handleBulkDownload}
            handleFileSelect={handleFileSelect}
            toggleFileExpansion={toggleFileExpansion}
            handleCopyLink={handleCopyLink}
            handleDeleteFile={handleDeleteFile}
            copyThumbnailToClipboard={copyThumbnailToClipboard}
            formatTimeAgo={formatTimeAgo}
            handlePageChange={handlePageChange}
            handleItemsPerPageChange={handleItemsPerPageChange}
          />
        );

      case 'duplicates':
        return (
          <DuplicateDetection 
            onClose={() => setActiveTab('overview')}
          />
        );



      case 'storage':
        return (
          <StorageTab
                  optimizationInProgress={optimizationInProgress}
                  quotaSettings={quotaSettings}
                  reportGenerating={reportGenerating}
                  handleOptimizeFiles={handleOptimizeFiles}
                  handleQuotaSettingChange={handleQuotaSettingChange}
                  handleGenerateReport={handleGenerateReport}
                  storageInfo={storageInfo}
                  loading={loading}
                  error={error}
                  onRefreshStorage={() => storageQuery.refetch()}
                />
        );

      case 'analytics':
        return (
          <AnalyticsTab 
            analytics={null}
            analyticsPeriod="7d"
            handleAnalyticsPeriodChange={() => {}}
          />
        );

      case 'activity':
        return (
          <ActivityTab 
            activities={activities}
            dashboardStats={dashboardStats}
            formatTimeAgo={formatTimeAgo}
            formatFileSize={formatFileSize}
          />
        );

      // Admin tabs
      case 'admin-overview':
        return (
          <AdminOverview 
            adminStats={adminStats || null}
            adminLoading={adminOverviewQuery.isLoading}
            adminFormatFileSize={formatFileSize}
            adminFormatTimeAgo={formatTimeAgo}
          />
        );

      case 'admin-users':
        return (
          <AdminUsersTab 
            adminUsers={adminUsers}
            adminLoading={adminUsersQuery.isLoading}
            adminFormatFileSize={formatFileSize}
            openUserProfile={openUserProfile}
            isAdminUser={isAdminUser}
          />
        );

      case 'admin-files':
        return (
          <AdminFilesTab 
            adminFiles={adminFiles}
            adminFileStats={adminFileStats || null}
            adminLoading={adminFilesQuery.isLoading}
            adminFormatFileSize={formatFileSize}
            adminFormatTimeAgo={formatTimeAgo}
            isAdminFile={isAdminFile}
          />
        );

      case 'admin-analytics':
        return (
          <AnalyticsTab 
            analytics={null}
            analyticsPeriod="7d"
            handleAnalyticsPeriodChange={() => {}}
          />
        );

      case 'admin-system':
        return (
          <AdminSystemTab 
            systemSettings={systemSettings as unknown as Record<string, unknown> || null}
            setSystemSettings={() => {}}
            settingsChanged={settingsChanged}
            setSettingsChanged={setSettingsChanged}
            updateSystemSettings={async () => {}}
            refreshSettings={async () => {}}
            showNotification={(notification) => showNotification({
              type: notification.type as 'success' | 'error' | 'info',
              title: notification.title,
              message: notification.message,
              duration: notification.duration
            })}
            systemMessages={systemMessages}
            setShowMessageModal={setShowMessageModal}
            toggleMessageStatus={toggleMessageStatus}
            deleteMessage={deleteMessage}
            isSystemMessage={isSystemMessage}
            manualCleanup={manualCleanupMutation}
          />
        );

      case 'admin-logs':
        return (
          <AdminLogsTab 
            systemLogs={systemLogs}
            adminLoading={systemLogsQuery.isLoading}
          />
        );

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
                  {isAdminMode ? 'System Administration Panel' : 'Manage your uploads and storage'}
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
          <DeleteConfirmModal
            isOpen={deleteConfirmModal.isOpen}
            fileName={deleteConfirmModal.fileName}
            onConfirm={confirmDeleteFile}
            onCancel={cancelDeleteFile}
          />

          {/* System Message Modal */}
          <SystemMessageModal
            isOpen={showMessageModal}
            messageForm={messageForm}
            setMessageForm={setMessageForm}
            onClose={() => setShowMessageModal(false)}
            onCreateMessage={handleCreateMessage}
          />

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
