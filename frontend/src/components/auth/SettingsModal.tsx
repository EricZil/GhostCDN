'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useSession, signIn } from 'next-auth/react';
import { getGravatarUrl, checkGravatarExists, getSmartGravatarUrl } from '@/utils/gravatar';
import { useNotification } from '@/contexts/NotificationContext';
import { useDashboard } from '@/hooks/useDashboard';
import Image from 'next/image';
import ApiKeysTab from './ApiKeysTab';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { logout } = useAuth();
  const { data: session } = useSession();
  const { showNotification } = useNotification();
  const [activeTab, setActiveTab] = useState<'profile' | 'social' | 'storage' | 'api'>('profile');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [copiedUserId, setCopiedUserId] = useState(false);
  const [hasGravatar, setHasGravatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [connectedAccounts, setConnectedAccounts] = useState<Array<Record<string, unknown>>>([]);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);

  // Dashboard hook for storage data
  const {
    loading: storageLoading,
    dashboardStats,
    storageInfo,
    storageQuery,
    formatFileSize,
  } = useDashboard();

  useEffect(() => {
    const initializeAvatar = async () => {
      if (!session?.user?.email) return;

      // If user already has an image (from social login), use that
      if (session.user.image) {
        setAvatarUrl(session.user.image);
        setHasGravatar(false); // It's not a Gravatar, it's a social login image
        return;
      }

      // Check if user has a Gravatar (with caching)
      const gravatarExists = await checkGravatarExists(session.user.email);
      setHasGravatar(gravatarExists);
      
      // Always set an avatar URL - either real Gravatar or identicon fallback
      if (gravatarExists) {
        setAvatarUrl(getGravatarUrl(session.user.email));
      } else {
        // Use smart Gravatar URL that provides identicon fallback
        setAvatarUrl(getSmartGravatarUrl(session.user.email));
      }
    };

    initializeAvatar();
  }, [session?.user?.email, session?.user?.image]);

  // Fetch connected accounts
  useEffect(() => {
    const fetchConnectedAccounts = async () => {
      if (!session?.user?.id) return;
      
      try {
        const response = await fetch('/api/auth/accounts');
        if (response.ok) {
          const accounts = await response.json();
          setConnectedAccounts(accounts);
        }
      } catch {
      }
    };

    fetchConnectedAccounts();
  }, [session?.user?.id]);

  // Fetch storage data when storage tab is opened
  useEffect(() => {
    if (activeTab === 'storage' && session?.user?.email && !storageInfo) {
      storageQuery.refetch();
    }
  }, [activeTab, session?.user?.email, storageInfo, storageQuery]);

  // Check for OAuth callback results
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    const callbackUrl = urlParams.get('callbackUrl');
      
      // Check if we just returned from OAuth
      if (callbackUrl && callbackUrl.includes('/api/auth/callback/')) {
        if (error) {
          showNotification({
            type: 'error',
            title: 'Connection Failed',
            message: `Failed to connect your account. Please try again.`,
            duration: 6000
          });
        } else {
          // Check if we have a new account connected
          const provider = callbackUrl.includes('github') ? 'GitHub' : 'Google';
          showNotification({
            type: 'success',
            title: 'Account Connected!',
            message: `Successfully connected your ${provider} account.`,
            duration: 5000
          });
        }
        
        // Clean up URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
      }
  }, [showNotification]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      onClose();
    } catch {
    } finally {
      setIsLoggingOut(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUserId(true);
    setTimeout(() => setCopiedUserId(false), 2000);
  };

  const handleSocialConnect = async (provider: string) => {
    setIsConnecting(provider);
    try {
      const result = await signIn(provider, { 
        callbackUrl: window.location.href,
        redirect: false 
      });
      
      if (result?.error) {
        showNotification({
          type: 'error',
          title: 'Connection Failed',
          message: `Failed to connect your ${provider} account. ${result.error}`,
          duration: 6000
        });
      } else if (result?.ok) {
        showNotification({
          type: 'success',
          title: 'Account Connected!',
          message: `Successfully connected your ${provider} account.`,
          duration: 5000
        });
        
        // Refresh connected accounts
        const response = await fetch('/api/auth/accounts');
        if (response.ok) {
          const accounts = await response.json();
          setConnectedAccounts(accounts);
        }
      }
    } catch {
      // Handle connection error silently
    } finally {
      setIsConnecting(null);
    }
  };

  const handleSocialDisconnect = async (provider: string) => {
    try {
      const response = await fetch(`/api/auth/accounts/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        showNotification({
          type: 'success',
          title: 'Account Disconnected',
          message: `Successfully disconnected your ${provider} account.`,
          duration: 4000
        });
        
        // Refresh connected accounts
        const accountsResponse = await fetch('/api/auth/accounts');
        if (accountsResponse.ok) {
          const accounts = await accountsResponse.json();
          setConnectedAccounts(accounts);
        }
      } else {
        showNotification({
          type: 'error',
          title: 'Disconnect Failed',
          message: data.error || `Failed to disconnect your ${provider} account.`,
          duration: 6000
        });
      }
    } catch {
      // Handle disconnection error silently
    }
  };



  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with blur */}
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
            className="fixed inset-0 flex items-center justify-center z-50 p-8"
          >
            <div className="bg-gradient-to-br from-gray-900/95 via-black/95 to-purple-900/95 backdrop-blur-2xl rounded-3xl shadow-[0_32px_64px_rgba(0,0,0,0.4),0_0_50px_rgba(124,58,237,0.15)] w-full max-w-[95vw] h-[90vh] overflow-hidden border border-purple-500/30">
                              {/* Header */}
                <div className="relative px-10 py-8">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 via-pink-600/5 to-purple-600/5"></div>
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
                        Account Settings
                      </h2>
                      <p className="text-gray-400 text-sm mt-1">Manage your profile, connections, and preferences</p>
                    </div>
                  </div>
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

              <div className="flex h-[calc(90vh-140px)]">
                {/* Sidebar */}
                <div className="w-96 bg-gradient-to-b from-purple-500/5 via-purple-500/3 to-pink-500/5 border-r border-purple-500/30 p-8">
                  <nav className="space-y-3">
                    <button
                      onClick={() => setActiveTab('profile')}
                      className={`w-full text-left px-5 py-4 rounded-xl text-base font-medium transition-all duration-200 ${
                        activeTab === 'profile'
                          ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.3)] border border-purple-500/30'
                          : 'text-gray-300 hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-pink-500/10 hover:text-white hover:border hover:border-purple-500/20'
                      }`}
                    >
                      <div className="flex items-center">
                        <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Profile
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveTab('social')}
                      className={`w-full text-left px-5 py-4 rounded-xl text-base font-medium transition-all duration-200 ${
                        activeTab === 'social'
                          ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.3)] border border-purple-500/30'
                          : 'text-gray-300 hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-pink-500/10 hover:text-white hover:border hover:border-purple-500/20'
                      }`}
                    >
                      <div className="flex items-center">
                        <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Social Connections
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveTab('storage')}
                      className={`w-full text-left px-5 py-4 rounded-xl text-base font-medium transition-all duration-200 ${
                        activeTab === 'storage'
                          ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.3)] border border-purple-500/30'
                          : 'text-gray-300 hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-pink-500/10 hover:text-white hover:border hover:border-purple-500/20'
                      }`}
                    >
                      <div className="flex items-center">
                        <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                        </svg>
                        Storage
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveTab('api')}
                      className={`w-full text-left px-5 py-4 rounded-xl text-base font-medium transition-all duration-200 ${
                        activeTab === 'api'
                          ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.3)] border border-purple-500/30'
                          : 'text-gray-300 hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-pink-500/10 hover:text-white hover:border hover:border-purple-500/20'
                      }`}
                    >
                      <div className="flex items-center">
                        <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                        API Keys
                      </div>
                    </button>
                  </nav>

                  <div className="mt-auto pt-8 border-t border-gradient-to-r from-purple-500/30 to-pink-500/30">
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="w-full text-left px-5 py-4 rounded-xl text-base font-medium text-red-400 hover:bg-gradient-to-r hover:from-red-500/10 hover:to-red-600/10 transition-all duration-200 disabled:opacity-50 hover:border hover:border-red-500/30"
                    >
                      <div className="flex items-center">
                        {isLoggingOut ? (
                          <svg className="animate-spin w-6 h-6 mr-3" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        ) : (
                          <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                        )}
                        Logout
                      </div>
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-10">
                  <AnimatePresence mode="wait">
                    {activeTab === 'profile' && (
                      <motion.div
                        key="profile"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.2 }}
                      >
                        <h3 className="text-2xl font-semibold text-white mb-6">Profile Information</h3>
                        
                        {/* Profile Picture Section */}
                        <div className="mb-8">
                          <label className="block text-sm font-medium text-gray-300 mb-4">Profile Picture</label>
                          <div className="flex items-center space-x-6">
                            <div className="relative">
                              <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-800 border-4 border-purple-500/20">
                                {avatarUrl ? (
                                  <Image
                                    src={avatarUrl}
                                    alt="Profile"
                                    width={128}
                                    height={128}
                                    className="w-full h-full object-cover"
                                    onError={() => {
                                      // If image fails to load, fallback to initials
                                      setAvatarUrl(null);
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-600 text-white text-3xl font-bold">
                                    {session?.user?.name?.charAt(0)?.toUpperCase() || session?.user?.email?.charAt(0)?.toUpperCase() || '?'}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="space-y-3">
                                {/* Avatar source info */}
                                {session?.user?.image ? (
                                  <p className="text-sm text-blue-400">📷 Profile picture from your social account</p>
                                ) : hasGravatar && avatarUrl ? (
                                  <p className="text-sm text-blue-400">📷 Profile picture from your Gravatar account</p>
                                ) : (
                                  <p className="text-sm text-gray-400">Using generated avatar</p>
                                )}
                                
                                {/* Profile picture source help */}
                                {session?.user?.image ? (
                                  <div className="text-xs text-gray-500">
                                    <p>This image comes from your connected social account. To change it, update your profile on that platform.</p>
                                  </div>
                                ) : hasGravatar ? (
                                  <div className="text-xs text-gray-500">
                                    <p>Want to change your Gravatar? Visit <a href="https://gravatar.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">gravatar.com</a></p>
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-500">
                                    <p>Get a profile picture across the web! <a href="https://gravatar.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">Create a Gravatar</a></p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                            <div className="px-4 py-3 bg-black/50 border border-gray-800 rounded-lg text-white text-lg">
                              {session?.user?.name || 'Not set'}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                            <div className="px-4 py-3 bg-black/50 border border-gray-800 rounded-lg text-white text-lg">
                              {session?.user?.email || 'Not set'}
                            </div>
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-300 mb-2">User ID</label>
                            <div className="flex items-center relative">
                              <div className="flex-1 px-4 py-3 bg-black/50 border border-gray-800 rounded-l-lg text-white font-mono text-base group">
                                <span className="blur-sm group-hover:blur-none transition-all duration-300 cursor-pointer">
                                  {session?.user?.id || 'Not available'}
                                </span>
                              </div>
                              <button
                                onClick={() => copyToClipboard(session?.user?.id || '')}
                                className="px-4 py-3 border border-l-0 border-gray-800 rounded-r-lg bg-purple-500/10 hover:bg-purple-500/20 transition-all relative group"
                              >
                                <AnimatePresence>
                                  {copiedUserId ? (
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0.8 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      exit={{ opacity: 0, scale: 0.8 }}
                                      className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-3 py-1 rounded-md text-sm whitespace-nowrap"
                                    >
                                      Copied!
                                    </motion.div>
                                  ) : null}
                                </AnimatePresence>
                                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Account Type</label>
                            <div className="px-4 py-3 bg-black/50 border border-gray-800 rounded-lg">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                {session?.user?.role || 'USER'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activeTab === 'social' && (
                      <motion.div
                        key="social"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-2xl font-semibold text-white">Social Connections</h3>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-sm text-green-400 font-medium">Secure OAuth</span>
                          </div>
                        </div>
                        
                        <div className="bg-gradient-to-br from-purple-500/5 to-pink-500/5 rounded-xl p-6 border border-purple-500/20 mb-8">
                          <div className="flex items-start space-x-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0">
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                            </div>
                            <div>
                              <h4 className="text-lg font-semibold text-white mb-2">Connect Your Accounts</h4>
                              <p className="text-gray-300 text-sm leading-relaxed">
                                Link your GitHub and Google accounts for seamless sign-in and enhanced security. 
                                Your connected accounts will automatically sync your profile information and provide 
                                backup authentication methods.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {/* GitHub Connection */}
                          <div className="bg-gradient-to-r from-gray-900/50 to-gray-800/50 rounded-xl border border-gray-700/50 p-6 hover:border-gray-600/50 transition-all duration-300">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center border border-gray-700">
                                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 0C5.373 0 0 5.373 0 12C0 17.303 3.438 21.8 8.205 23.385C8.805 23.498 9.025 23.127 9.025 22.81C9.025 22.523 9.015 21.768 9.01 20.768C5.672 21.492 4.968 19.158 4.968 19.158C4.422 17.773 3.633 17.403 3.633 17.403C2.546 16.659 3.717 16.675 3.717 16.675C4.922 16.759 5.555 17.912 5.555 17.912C6.625 19.746 8.364 19.216 9.05 18.909C9.158 18.132 9.467 17.603 9.81 17.303C7.145 17 4.343 15.971 4.343 11.374C4.343 10.063 4.812 8.993 5.579 8.153C5.455 7.85 5.044 6.629 5.696 4.977C5.696 4.977 6.704 4.655 8.997 6.207C9.954 5.941 10.98 5.808 12 5.803C13.02 5.808 14.047 5.941 15.006 6.207C17.297 4.655 18.303 4.977 18.303 4.977C18.956 6.63 18.545 7.851 18.421 8.153C19.191 8.993 19.656 10.064 19.656 11.374C19.656 15.983 16.849 16.998 14.177 17.295C14.607 17.667 15 18.397 15 19.517C15 21.12 14.985 22.41 14.985 22.81C14.985 23.129 15.204 23.504 15.815 23.385C20.565 21.797 24 17.3 24 12C24 5.373 18.627 0 12 0Z"/>
                                  </svg>
                                </div>
                                <div>
                                  <h4 className="text-lg font-semibold text-white">GitHub</h4>
                                  <p className="text-sm text-gray-400">
                                    {connectedAccounts.find(acc => acc.provider === 'github') 
                                      ? `Connected as @${connectedAccounts.find(acc => acc.provider === 'github')?.username || 'GitHub User'}`
                                      : 'Connect your GitHub account for easy sign-in'
                                    }
                                  </p>
                                </div>
                              </div>
                              <div>
                                {connectedAccounts.find(acc => acc.provider === 'github') ? (
                                  <button
                                    onClick={() => handleSocialDisconnect('github')}
                                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg border border-red-500/30 transition-all duration-200 text-sm font-medium"
                                  >
                                    Disconnect
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleSocialConnect('github')}
                                    disabled={isConnecting === 'github'}
                                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {isConnecting === 'github' ? (
                                      <div className="flex items-center space-x-2">
                                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        <span>Connecting...</span>
                                      </div>
                                    ) : 'Connect'}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Google Connection */}
                          <div className="bg-gradient-to-r from-blue-900/20 to-blue-800/20 rounded-xl border border-blue-700/30 p-6 hover:border-blue-600/40 transition-all duration-300">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.66 15.63 16.88 16.79 15.71 17.57V20.34H19.28C21.36 18.42 22.56 15.6 22.56 12.25Z" fill="#4285F4"/>
                                    <path d="M12 23C14.97 23 17.46 22 19.28 20.34L15.71 17.57C14.73 18.23 13.48 18.63 12 18.63C9.13 18.63 6.72 16.74 5.82 14.15H2.14V17.01C3.94 20.57 7.65 23 12 23Z" fill="#34A853"/>
                                    <path d="M5.82 14.15C5.6 13.52 5.48 12.84 5.48 12.15C5.48 11.46 5.6 10.78 5.82 10.15V7.29H2.14C1.41 8.7 1 10.37 1 12.15C1 13.93 1.41 15.6 2.14 17.01L5.82 14.15Z" fill="#FBBC05"/>
                                    <path d="M12 5.67C13.62 5.67 15.06 6.22 16.19 7.29L19.36 4.12C17.46 2.39 14.97 1.33 12 1.33C7.65 1.33 3.94 3.76 2.14 7.32L5.82 10.18C6.72 7.59 9.13 5.67 12 5.67Z" fill="#EA4335"/>
                                  </svg>
                                </div>
                                <div>
                                  <h4 className="text-lg font-semibold text-white">Google</h4>
                                  <p className="text-sm text-gray-400">
                                    {connectedAccounts.find(acc => acc.provider === 'google') 
                                      ? `Connected as ${connectedAccounts.find(acc => acc.provider === 'google')?.username || 'Google User'}`
                                      : 'Connect your Google account for easy sign-in'
                                    }
                                  </p>
                                </div>
                              </div>
                              <div>
                                {connectedAccounts.find(acc => acc.provider === 'google') ? (
                                  <button
                                    onClick={() => handleSocialDisconnect('google')}
                                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg border border-red-500/30 transition-all duration-200 text-sm font-medium"
                                  >
                                    Disconnect
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleSocialConnect('google')}
                                    disabled={isConnecting === 'google'}
                                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition-all duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {isConnecting === 'google' ? (
                                      <div className="flex items-center space-x-2">
                                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        <span>Connecting...</span>
                                      </div>
                                    ) : 'Connect'}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Security Notice */}
                        <div className="mt-8 bg-green-500/10 border border-green-500/30 rounded-xl p-6">
                          <div className="flex items-start space-x-3">
                            <svg className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <div>
                              <h4 className="text-green-300 font-semibold mb-1">Secure Authentication</h4>
                              <p className="text-green-300/80 text-sm leading-relaxed">
                                All social connections use industry-standard OAuth 2.0 authentication. We never store your social media passwords, 
                                and you can disconnect any account at any time. Your privacy and security are our top priorities.
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activeTab === 'storage' && (
                      <motion.div
                        key="storage"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.2 }}
                      >
                        <h3 className="text-2xl font-semibold text-white mb-6">Storage Usage</h3>
                        
                        {storageLoading ? (
                          <div className="bg-purple-500/5 rounded-xl p-8 border border-purple-500/20 flex items-center justify-center">
                            <div className="text-center">
                              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                              <p className="text-gray-400">Loading storage data...</p>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-purple-500/5 rounded-xl p-8 border border-purple-500/20">
                            <div className="mb-6">
                              <div className="flex justify-between text-base mb-3">
                                <span className="text-gray-400">Storage Used</span>
                                <span className="font-medium text-white text-lg">
                                  {storageInfo ? `${formatFileSize(storageInfo.totalSize)} / ${formatFileSize(storageInfo.storageLimit)}` : '0 GB / 10 GB'}
                                </span>
                              </div>
                              <div className="w-full bg-gray-800 rounded-full h-3">
                                <div 
                                  className="bg-gradient-to-r from-purple-600 to-pink-600 h-3 rounded-full transition-all duration-500" 
                                  style={{ width: `${storageInfo?.storagePercentage ? Math.min(storageInfo.storagePercentage, 100) : 0}%` }} 
                                />
                              </div>
                              <p className="text-sm text-gray-500 mt-2">
                                {storageInfo ? formatFileSize(storageInfo.available) : '10 GB'} available
                              </p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                              <div className="bg-black/50 p-6 rounded-xl border border-gray-800">
                                <div className="text-3xl font-bold text-white mb-1">
                                  {storageInfo?.totalFiles !== undefined ? storageInfo.totalFiles.toLocaleString() : dashboardStats?.totalUploads?.toLocaleString() || '0'}
                                </div>
                                <div className="text-sm text-gray-400">Total Files</div>
                              </div>
                              <div className="bg-black/50 p-6 rounded-xl border border-gray-800">
                                <div className="text-3xl font-bold text-white mb-1">
                                  {storageInfo?.totalSize !== undefined ? formatFileSize(storageInfo.totalSize) : dashboardStats?.storageUsed ? formatFileSize(dashboardStats.storageUsed) : '0 MB'}
                                </div>
                                <div className="text-sm text-gray-400">Total Size</div>
                              </div>
                              <div className="bg-black/50 p-6 rounded-xl border border-gray-800">
                                <div className="text-3xl font-bold text-white mb-1">
                                  {dashboardStats?.bandwidthUsed !== undefined ? formatFileSize(dashboardStats.bandwidthUsed) : '∞'}
                                </div>
                                <div className="text-sm text-gray-400">Bandwidth</div>
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="mt-8">
                          <h4 className="text-lg font-medium text-white mb-4">Storage Provider</h4>
                          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
                            <div className="flex items-start">
                              <svg className="w-6 h-6 text-blue-400 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                              <div>
                                <p className="text-base text-blue-300 font-medium mb-1">DigitalOcean Spaces</p>
                                <p className="text-sm text-blue-300/70">Your files are stored in DigitalOcean Spaces for reliable performance and scalability. Enjoy fast global CDN distribution and organized folder structure.</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activeTab === 'api' && (
                      <motion.div
                        key="api"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ApiKeysTab />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}