'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotification } from '@/contexts/NotificationContext';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  lastLogin: string | null;
  emailVerified: string | null;
  status: 'active' | 'inactive' | 'banned';
  totalUploads: number;
  totalActivities: number;
  storageUsed: number;
  uploads: Array<{
    id: string;
    fileName: string;
    fileKey: string;
    fileSize: number;
    fileType: string;
    uploadedAt: string;
  }>;
  activities: Array<{
    id: string;
    type: string;
    message: string;
    createdAt: string;
    ipAddress?: string;
  }>;
  accounts: Array<{
    provider: string;
    type: string;
  }>;

  banInfo?: {
    banType: string;
    reason: string;
    bannedAt: string;
    bannedBy: {
      name: string;
      email: string;
    };
  };
}

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onUserUpdate?: () => void;
}

export default function UserProfileModal({ 
  isOpen, 
  onClose, 
  userId, 
  onUserUpdate 
}: UserProfileModalProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [banType, setBanType] = useState('account');
  const { showNotification } = useNotification();

  const fetchUserProfile = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/profile`);
      if (!response.ok) throw new Error('Failed to fetch user profile');
      
      const data = await response.json();
      setProfile(data);
    } catch {
      // Error handled by notification
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load user profile',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  }, [userId, showNotification]);

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserProfile();
    }
  }, [isOpen, userId, fetchUserProfile]);

  const handleUserAction = async (action: string, data: Record<string, unknown> = {}) => {
    setActionLoading(action);
    try {
      const response = await fetch(`/api/admin/users/${userId}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, ...data }),
      });

      if (!response.ok) throw new Error(`Failed to ${action}`);
      
      const result = await response.json();
      
      showNotification({
        type: 'success',
        title: 'Success',
        message: result.message || `${action} completed successfully`,
        duration: 5000
      });

      // Refresh profile and parent component
      await fetchUserProfile();
      onUserUpdate?.();
      
      // Close ban modal if it was open
      if (action === 'ban') {
        setBanModalOpen(false);
        setBanReason('');
      }
    } catch {
      // Error handled by notification
      showNotification({
        type: 'error',
        title: 'Error',
        message: `Failed to ${action}`,
        duration: 5000
      });
    } finally {
      setActionLoading(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 30) return `${diffInDays} days ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
    return `${Math.floor(diffInDays / 365)} years ago`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'inactive': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'banned': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'USER': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '👤' },
    { id: 'uploads', label: 'Uploads', icon: '📁' },
    { id: 'activity', label: 'Activity', icon: '📊' },
    { id: 'security', label: 'Security', icon: '🔒' },
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-gradient-to-br from-gray-900/95 via-purple-900/20 to-gray-900/95 backdrop-blur-xl rounded-2xl border border-purple-500/30 shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
          ) : profile ? (
            <div className="flex h-[90vh]">
              {/* Header & Sidebar */}
              <div className="w-80 bg-gradient-to-b from-purple-500/10 to-purple-500/5 border-r border-purple-500/30 p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">User Profile</h2>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* User Info */}
                <div className="mb-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <span className="text-xl font-bold text-white">
                        {profile.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{profile.name}</h3>
                      <p className="text-sm text-gray-400">{profile.email}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 mb-4">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getRoleColor(profile.role)}`}>
                      {profile.role}
                    </span>
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getStatusColor(profile.status)}`}>
                      {profile.status === 'active' ? 'Active' : profile.status === 'banned' ? 'Banned' : 'Inactive'}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Joined:</span>
                      <span className="text-white">{formatTimeAgo(profile.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Last Login:</span>
                      <span className="text-white">
                        {profile.lastLogin ? formatTimeAgo(profile.lastLogin) : 'Never'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Storage:</span>
                      <span className="text-white">{formatFileSize(profile.storageUsed)}</span>
                    </div>
                  </div>
                </div>

                {/* Navigation */}
                <nav className="space-y-2 mb-6">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-all flex items-center gap-3 ${
                        activeTab === tab.id
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'text-gray-300 hover:bg-purple-500/10 hover:text-white'
                      }`}
                    >
                      <span className="text-lg">{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                </nav>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <button
                    onClick={() => handleUserAction('reset-password')}
                    disabled={actionLoading === 'reset-password'}
                    className="w-full px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30 hover:bg-blue-500/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {actionLoading === 'reset-password' ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2m-2-2h-3m-3 7h3m-3 0a2 2 0 01-2-2m0 0a2 2 0 01-2-2m2 2v3" />
                        </svg>
                        Reset Password
                      </>
                    )}
                  </button>

                  {profile.status === 'banned' ? (
                    <button
                      onClick={() => handleUserAction('unban')}
                      disabled={actionLoading === 'unban'}
                      className="w-full px-4 py-2 bg-green-500/20 text-green-400 rounded-lg border border-green-500/30 hover:bg-green-500/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {actionLoading === 'unban' ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-400"></div>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Unban User
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => setBanModalOpen(true)}
                      className="w-full px-4 py-2 bg-red-500/20 text-red-400 rounded-lg border border-red-500/30 hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                      </svg>
                      Ban User
                    </button>
                  )}
                </div>
              </div>

              {/* Main Content */}
              <div className="flex-1 overflow-hidden">
                <div className="h-full overflow-y-auto p-6">
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                      <h3 className="text-2xl font-semibold text-white">Overview</h3>
                      
                      {/* Stats Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-[rgba(20,20,35,0.6)] rounded-xl p-4 border border-gray-800/40">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">📁</span>
                            <div>
                              <p className="text-xl font-bold text-white">{profile.totalUploads}</p>
                              <p className="text-sm text-gray-400">Total Uploads</p>
                            </div>
                          </div>
                        </div>
                        <div className="bg-[rgba(20,20,35,0.6)] rounded-xl p-4 border border-gray-800/40">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">💾</span>
                            <div>
                              <p className="text-xl font-bold text-white">{formatFileSize(profile.storageUsed)}</p>
                              <p className="text-sm text-gray-400">Storage Used</p>
                            </div>
                          </div>
                        </div>
                        <div className="bg-[rgba(20,20,35,0.6)] rounded-xl p-4 border border-gray-800/40">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">📊</span>
                            <div>
                              <p className="text-xl font-bold text-white">{profile.totalActivities}</p>
                              <p className="text-sm text-gray-400">Activities</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Account Details */}
                      <div className="bg-[rgba(20,20,35,0.6)] rounded-xl p-6 border border-gray-800/40">
                        <h4 className="text-lg font-semibold text-white mb-4">Account Details</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-[rgba(15,15,25,0.5)] rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-400">Account Status</span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                profile.status === 'active' 
                                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                  : profile.status === 'banned'
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                  : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                              }`}>
                                {profile.status === 'active' ? 'Active' : profile.status === 'banned' ? 'Banned' : 'Inactive'}
                              </span>
                            </div>
                          </div>

                          {profile.banInfo && (
                            <div className="bg-[rgba(15,15,25,0.5)] rounded-lg p-4">
                              <div className="flex items-center justify-between">
                                <span className="text-gray-400">Ban Type</span>
                                <span className="text-red-400 font-medium">{profile.banInfo.banType}</span>
                              </div>
                            </div>
                          )}

                          <div className="bg-[rgba(15,15,25,0.5)] rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-400">Role</span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                profile.role === 'ADMIN' 
                                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                                  : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              }`}>
                                {profile.role}
                              </span>
                            </div>
                          </div>

                          <div className="bg-[rgba(15,15,25,0.5)] rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-400">Member Since</span>
                              <span className="text-white">{formatTimeAgo(profile.createdAt)}</span>
                            </div>
                          </div>
                        </div>

                        {profile.banInfo && (
                          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                            <h4 className="text-red-400 font-semibold mb-2">Ban Information</h4>
                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="text-gray-400">Reason: </span>
                                <span className="text-white">{profile.banInfo.reason}</span>
                              </div>
                              <div>
                                <span className="text-gray-400">Banned by: </span>
                                <span className="text-white">{profile.banInfo.bannedBy.name}</span>
                              </div>
                              <div>
                                <span className="text-gray-400">Banned on: </span>
                                <span className="text-white">{formatTimeAgo(profile.banInfo.bannedAt)}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'uploads' && (
                    <div className="space-y-6">
                      <h3 className="text-2xl font-semibold text-white">Uploads ({profile.uploads.length})</h3>
                      
                      <div className="space-y-3">
                        {profile.uploads.map((upload) => (
                          <div key={upload.id} className="bg-[rgba(20,20,35,0.6)] rounded-xl p-4 border border-gray-800/40">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                                  <span className="text-xs font-bold text-white">
                                    {upload.fileType.split('/')[0].toUpperCase().slice(0, 2)}
                                  </span>
                                </div>
                                <div>
                                  <p className="text-white font-medium">{upload.fileName}</p>
                                  <p className="text-sm text-gray-400">
                                    {formatFileSize(upload.fileSize)} • {formatTimeAgo(upload.uploadedAt)}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <button className="text-blue-400 hover:text-blue-300 text-sm">
                                  View File
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {profile.uploads.length === 0 && (
                          <div className="text-center py-8 text-gray-400">
                            No uploads found
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'activity' && (
                    <div className="space-y-6">
                      <h3 className="text-2xl font-semibold text-white">Recent Activity</h3>
                      
                      <div className="space-y-3">
                        {profile.activities.map((activity) => (
                          <div key={activity.id} className="bg-[rgba(20,20,35,0.6)] rounded-xl p-4 border border-gray-800/40">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-white">{activity.message}</p>
                                <p className="text-sm text-gray-400">
                                  {formatTimeAgo(activity.createdAt)}
                                  {activity.ipAddress && ` • ${activity.ipAddress}`}
                                </p>
                              </div>
                              <span className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded text-xs">
                                {activity.type}
                              </span>
                            </div>
                          </div>
                        ))}
                        
                        {profile.activities.length === 0 && (
                          <div className="text-center py-8 text-gray-400">
                            No activity found
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'security' && (
                    <div className="space-y-6">
                      <h3 className="text-2xl font-semibold text-white">Security</h3>
                      
                      <div className="bg-[rgba(20,20,35,0.6)] rounded-xl p-6 border border-gray-800/40">
                        <h4 className="text-lg font-semibold text-white mb-4">Account Security</h4>
                        <div className="space-y-3">
                          <div className="text-center py-4 text-gray-400">
                            Security settings and information
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-96">
              <p className="text-gray-400">Failed to load user profile</p>
            </div>
          )}
        </motion.div>

        {/* Ban Modal */}
        {banModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[80] flex items-center justify-center p-4"
            onClick={() => setBanModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-gradient-to-br from-gray-900/95 via-red-900/20 to-gray-900/95 backdrop-blur-xl rounded-2xl border border-red-500/30 shadow-2xl max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Ban User</h3>
                    <p className="text-sm text-gray-400">This action will restrict user access</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Ban Type</label>
                    <select
                      value={banType}
                      onChange={(e) => setBanType(e.target.value)}
                      className="w-full px-3 py-2 bg-black/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="account">Account Ban (disable account)</option>
                      <option value="email">Email Ban (prevent new registrations)</option>
                      <option value="ip">IP Ban (block IP addresses)</option>
                      <option value="full">Full Ban (account + email + IP)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Reason</label>
                    <textarea
                      value={banReason}
                      onChange={(e) => setBanReason(e.target.value)}
                      placeholder="Enter ban reason..."
                      rows={3}
                      className="w-full px-3 py-2 bg-black/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 placeholder-gray-400 resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setBanModalOpen(false)}
                    className="flex-1 px-4 py-2.5 bg-gray-700/50 hover:bg-gray-700/70 text-gray-300 hover:text-white rounded-lg border border-gray-600/50 transition-all duration-200 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleUserAction('ban', { reason: banReason, banType })}
                    disabled={actionLoading === 'ban'}
                    className="flex-1 px-4 py-2.5 bg-red-500/80 hover:bg-red-500 text-white rounded-lg border border-red-500/50 transition-all duration-200 font-medium shadow-lg hover:shadow-red-500/25 disabled:opacity-50"
                  >
                    {actionLoading === 'ban' ? 'Banning...' : 'Ban User'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}