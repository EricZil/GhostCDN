'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotification } from '@/contexts/NotificationContext';
import { useSession } from 'next-auth/react';
import {
  getApiKeys,
  createApiKey,
  deleteApiKey,
  rotateApiKey,
  getApiKeyUsage,
  type ApiKey,
  type ApiKeyUsage
} from '@/utils/api';

export default function ApiKeysTab() {
  const { data: session } = useSession();
  const { showNotification } = useNotification();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [selectedKeyUsage, setSelectedKeyUsage] = useState<ApiKeyUsage | null>(null);
  const [newKeyData, setNewKeyData] = useState<{
    name: string;
    permissions: {
      files: { read: boolean; write: boolean; delete: boolean };
      analytics: { read: boolean };
    };
    expiresIn: number | null;
  }>({
    name: '',
    permissions: {
      files: { read: true, write: true, delete: false },
      analytics: { read: true }
    },
    expiresIn: 365
  });
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Get JWT token from server
  const getJwtToken = async (): Promise<string> => {
    try {
      const response = await fetch('/api/auth/jwt');
      if (!response.ok) {
        throw new Error('Failed to get JWT token');
      }
      const data = await response.json();
      if (!data.success || !data.token) {
        throw new Error('Invalid JWT response');
      }
      return data.token;
    } catch (error) {
      console.error('Error getting JWT token:', error);
      throw new Error('Failed to get authentication token');
    }
  };

  // Fetch API keys
  const fetchApiKeys = useCallback(async () => {
    try {
      const token = await getJwtToken();
      const data = await getApiKeys(token);
      setApiKeys(data.data.keys);
    } catch (error: unknown) {
      console.error('Error fetching API keys:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to load API keys',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  // Create new API key
  const createNewApiKey = async () => {
    if (!newKeyData.name.trim()) {
      showNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please enter a name for your API key',
        duration: 4000
      });
      return;
    }

    setCreating(true);
    try {
      const token = await getJwtToken();
      const data = await createApiKey(token, newKeyData);
      
      setGeneratedKey(data.data.key);
      setApiKeys(prev => [data.data, ...prev]);
      showNotification({
        type: 'success',
        title: 'API Key Created',
        message: 'Your new API key has been generated successfully',
        duration: 5000
      });
      
      // Reset form
      setNewKeyData({
        name: '',
        permissions: {
          files: { read: true, write: true, delete: false },
          analytics: { read: true }
        },
        expiresIn: 365
      });
    } catch (error: unknown) {
      showNotification({
        type: 'error',
        title: 'Creation Failed',
        message: error instanceof Error ? error.message : 'Failed to create API key',
        duration: 5000
      });
    } finally {
      setCreating(false);
    }
  };

  // Delete API key handler
  const deleteApiKeyHandler = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return;
    }

    try {
      const token = await getJwtToken();
      await deleteApiKey(token, keyId);
      
      setApiKeys(prev => prev.filter(key => key.id !== keyId));
      showNotification({
        type: 'success',
        title: 'API Key Deleted',
        message: 'The API key has been successfully deleted',
        duration: 4000
      });
    } catch (error: unknown) {
      showNotification({
        type: 'error',
        title: 'Deletion Failed',
        message: error instanceof Error ? error.message : 'Failed to delete API key',
        duration: 5000
      });
    }
  };

  // Rotate API key handler
  const rotateApiKeyHandler = async (keyId: string) => {
    if (!confirm('Are you sure you want to rotate this API key? The old key will stop working immediately.')) {
      return;
    }

    try {
      const token = await getJwtToken();
      const data = await rotateApiKey(token, keyId);
      
      setGeneratedKey(data.data.key);
      setApiKeys(prev => prev.map(key =>
        key.id === keyId ? { ...key, ...data.data } : key
      ));
      showNotification({
        type: 'success',
        title: 'API Key Rotated',
        message: 'Your API key has been rotated successfully',
        duration: 5000
      });
    } catch (error: unknown) {
      showNotification({
        type: 'error',
        title: 'Rotation Failed',
        message: error instanceof Error ? error.message : 'Failed to rotate API key',
        duration: 5000
      });
    }
  };

  // Fetch usage statistics
  const fetchUsageStats = async (keyId: string) => {
    try {
      const token = await getJwtToken();
      const data = await getApiKeyUsage(token, keyId, 30);
      setSelectedKeyUsage(data.data);
      setShowUsageModal(true);
    } catch (error: unknown) {
      showNotification({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to load usage statistics',
        duration: 5000
      });
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string, keyId?: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId || 'generated');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    if (session) {
      fetchApiKeys();
    }
  }, [session, fetchApiKeys]);

  if (loading) {
    return (
      <div className="bg-purple-500/5 rounded-xl p-8 border border-purple-500/20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-gray-400">Loading API keys...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-semibold text-white">API Keys</h3>
        <button
          onClick={() => setShowCreateModal(true)}
          disabled={session?.user?.role !== 'ADMIN' && apiKeys.length >= 1}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Create API Key</span>
          </div>
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 mb-8">
        <div className="flex items-start">
          <svg className="w-6 h-6 text-blue-400 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-base text-blue-300 font-medium mb-1">API Access</p>
            <p className="text-sm text-blue-300/70">
              Use API keys to integrate GhostCDN with your applications. 
              {session?.user?.role !== 'ADMIN' && ' Regular users can create 1 API key. '}
              {session?.user?.role === 'ADMIN' && ' Admin users can create up to 5 API keys. '}
              Keys are used with Bearer token authentication.
            </p>
          </div>
        </div>
      </div>

      {/* API Keys List */}
      {apiKeys.length === 0 ? (
        <div className="bg-gray-500/5 rounded-xl p-12 border border-gray-500/20 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          <h4 className="text-xl font-medium text-white mb-2">No API Keys</h4>
          <p className="text-gray-400 mb-6">Create your first API key to start integrating with GhostCDN</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all duration-200 font-medium"
          >
            Create API Key
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {apiKeys.map((key) => (
            <div key={key.id} className="bg-gradient-to-r from-gray-900/50 to-gray-800/50 rounded-xl border border-gray-700/50 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <h4 className="text-lg font-medium text-white">{key.name}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      key.isActive 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                      {key.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Created:</span>
                      <span className="text-white ml-2">{formatDate(key.createdAt)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Last Used:</span>
                      <span className="text-white ml-2">
                        {key.lastUsed ? formatDate(key.lastUsed) : 'Never'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Usage:</span>
                      <span className="text-white ml-2">{(key.usageCount || 0).toLocaleString()} requests</span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <span className="text-gray-400 text-sm">Permissions:</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {key.permissions.files.read && (
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">Files: Read</span>
                      )}
                      {key.permissions.files.write && (
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">Files: Write</span>
                      )}
                      {key.permissions.files.delete && (
                        <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">Files: Delete</span>
                      )}
                      {key.permissions.analytics.read && (
                        <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">Analytics: Read</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => fetchUsageStats(key.id)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
                    title="View Usage"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => rotateApiKeyHandler(key.id)}
                    className="p-2 text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-all duration-200"
                    title="Rotate Key"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  <button
                    onClick={() => deleteApiKeyHandler(key.id)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                    title="Delete Key"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create API Key Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
              onClick={() => !creating && setShowCreateModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 flex items-center justify-center z-[60] p-4"
            >
              <div className="bg-gradient-to-br from-gray-900/95 via-black/95 to-purple-900/95 backdrop-blur-2xl rounded-2xl shadow-2xl w-full max-w-md border border-purple-500/30">
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-white mb-4">Create API Key</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                      <input
                        type="text"
                        value={newKeyData.name}
                        onChange={(e) => setNewKeyData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="My Application API Key"
                        className="w-full px-3 py-2 bg-black/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                        disabled={creating}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Permissions</label>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={newKeyData.permissions.files.read}
                            onChange={(e) => setNewKeyData(prev => ({
                              ...prev,
                              permissions: {
                                ...prev.permissions,
                                files: { ...prev.permissions.files, read: e.target.checked }
                              }
                            }))}
                            className="mr-2"
                            disabled={creating}
                          />
                          <span className="text-sm text-gray-300">Read Files</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={newKeyData.permissions.files.write}
                            onChange={(e) => setNewKeyData(prev => ({
                              ...prev,
                              permissions: {
                                ...prev.permissions,
                                files: { ...prev.permissions.files, write: e.target.checked }
                              }
                            }))}
                            className="mr-2"
                            disabled={creating}
                          />
                          <span className="text-sm text-gray-300">Upload Files</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={newKeyData.permissions.files.delete}
                            onChange={(e) => setNewKeyData(prev => ({
                              ...prev,
                              permissions: {
                                ...prev.permissions,
                                files: { ...prev.permissions.files, delete: e.target.checked }
                              }
                            }))}
                            className="mr-2"
                            disabled={creating}
                          />
                          <span className="text-sm text-gray-300">Delete Files</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={newKeyData.permissions.analytics.read}
                            onChange={(e) => setNewKeyData(prev => ({
                              ...prev,
                              permissions: {
                                ...prev.permissions,
                                analytics: { ...prev.permissions.analytics, read: e.target.checked }
                              }
                            }))}
                            className="mr-2"
                            disabled={creating}
                          />
                          <span className="text-sm text-gray-300">Read Analytics</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Expires In</label>
                      <select
                        value={newKeyData.expiresIn || ''}
                        onChange={(e) => setNewKeyData(prev => ({ 
                          ...prev, 
                          expiresIn: e.target.value ? parseInt(e.target.value) : null 
                        }))}
                        className="w-full px-3 py-2 bg-black/50 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                        disabled={creating}
                      >
                        <option value="">Never</option>
                        <option value="30">30 days</option>
                        <option value="90">90 days</option>
                        <option value="365">1 year</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex space-x-3 mt-6">
                    <button
                      onClick={() => setShowCreateModal(false)}
                      disabled={creating}
                      className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={createNewApiKey}
                      disabled={creating || !newKeyData.name.trim()}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50"
                    >
                      {creating ? 'Creating...' : 'Create Key'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Generated Key Modal */}
      <AnimatePresence>
        {generatedKey && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 flex items-center justify-center z-[60] p-4"
            >
              <div className="bg-gradient-to-br from-gray-900/95 via-black/95 to-purple-900/95 backdrop-blur-2xl rounded-2xl shadow-2xl w-full max-w-lg border border-purple-500/30">
                <div className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-white">API Key Generated</h3>
                  </div>
                  
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
                    <p className="text-yellow-300 text-sm">
                      <strong>Important:</strong> This is the only time you&apos;ll see this key. Copy it now and store it securely.
                    </p>
                  </div>

                  <div className="bg-black/50 border border-gray-700 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <code className="text-green-400 font-mono text-sm break-all flex-1 mr-3">
                        {generatedKey}
                      </code>
                      <button
                        onClick={() => copyToClipboard(generatedKey)}
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-all duration-200 flex-shrink-0"
                      >
                        {copiedKey === 'generated' ? (
                          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setGeneratedKey(null);
                      setShowCreateModal(false);
                    }}
                    className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all duration-200"
                  >
                    I&apos;ve Saved My Key
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Usage Statistics Modal */}
      <AnimatePresence>
        {showUsageModal && selectedKeyUsage && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
              onClick={() => setShowUsageModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 flex items-center justify-center z-[60] p-4"
            >
              <div className="bg-gradient-to-br from-gray-900/95 via-black/95 to-purple-900/95 backdrop-blur-2xl rounded-2xl shadow-2xl w-full max-w-4xl border border-purple-500/30 max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-white">Usage Statistics</h3>
                    <button
                      onClick={() => setShowUsageModal(false)}
                      className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-black/30 rounded-lg p-4">
                      <div className="text-2xl font-bold text-white">{selectedKeyUsage.totalRequests.toLocaleString()}</div>
                      <div className="text-sm text-gray-400">Total Requests</div>
                    </div>
                    <div className="bg-black/30 rounded-lg p-4">
                      <div className="text-2xl font-bold text-white">
                        {selectedKeyUsage.dailyUsage.length > 0
                          ? Math.round(selectedKeyUsage.dailyUsage.reduce((acc, day) => acc + day.avgResponseTime, 0) / selectedKeyUsage.dailyUsage.length)
                          : 0}ms
                      </div>
                      <div className="text-sm text-gray-400">Avg Response Time</div>
                    </div>
                    <div className="bg-black/30 rounded-lg p-4">
                      <div className="text-2xl font-bold text-white">{selectedKeyUsage.period}</div>
                      <div className="text-sm text-gray-400">Period</div>
                    </div>
                    <div className="bg-black/30 rounded-lg p-4">
                      <div className="text-2xl font-bold text-green-400">
                        {selectedKeyUsage.statusCodes.find(s => s.statusCode >= 200 && s.statusCode < 300)?.count || 0}
                      </div>
                      <div className="text-sm text-gray-400">Success Requests</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Daily Usage Chart */}
                    <div className="bg-black/30 rounded-lg p-4">
                      <h4 className="text-lg font-medium text-white mb-4">Daily Usage</h4>
                      <div className="space-y-2">
                        {selectedKeyUsage.dailyUsage.slice(-7).map((day) => (
                          <div key={day.date} className="flex items-center justify-between">
                            <span className="text-sm text-gray-400">
                              {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                            <div className="flex items-center space-x-2">
                              <div className="w-24 bg-gray-700 rounded-full h-2">
                                <div
                                  className="bg-purple-500 h-2 rounded-full"
                                  style={{
                                    width: `${Math.min(100, (day.requests / Math.max(...selectedKeyUsage.dailyUsage.map(d => d.requests))) * 100)}%`
                                  }}
                                />
                              </div>
                              <span className="text-sm text-white w-12 text-right">{day.requests}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Status Codes */}
                    <div className="bg-black/30 rounded-lg p-4">
                      <h4 className="text-lg font-medium text-white mb-4">Status Codes</h4>
                      <div className="space-y-2">
                        {selectedKeyUsage.statusCodes.map((status) => (
                          <div key={status.statusCode} className="flex items-center justify-between">
                            <span className={`text-sm font-medium ${
                              status.statusCode >= 200 && status.statusCode < 300 ? 'text-green-400' :
                              status.statusCode >= 400 && status.statusCode < 500 ? 'text-yellow-400' :
                              status.statusCode >= 500 ? 'text-red-400' : 'text-gray-400'
                            }`}>
                              {status.statusCode}
                            </span>
                            <div className="flex items-center space-x-2">
                              <div className="w-24 bg-gray-700 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    status.statusCode >= 200 && status.statusCode < 300 ? 'bg-green-500' :
                                    status.statusCode >= 400 && status.statusCode < 500 ? 'bg-yellow-500' :
                                    status.statusCode >= 500 ? 'bg-red-500' : 'bg-gray-500'
                                  }`}
                                  style={{
                                    width: `${Math.min(100, (status.count / selectedKeyUsage.totalRequests) * 100)}%`
                                  }}
                                />
                              </div>
                              <span className="text-sm text-white w-12 text-right">{status.count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Top Endpoints */}
                    <div className="bg-black/30 rounded-lg p-4 lg:col-span-2">
                      <h4 className="text-lg font-medium text-white mb-4">Top Endpoints</h4>
                      <div className="space-y-3">
                        {selectedKeyUsage.topEndpoints.map((endpoint, index) => (
                          <div key={endpoint.endpoint} className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
                                  #{index + 1}
                                </span>
                                <code className="text-sm text-white font-mono">{endpoint.endpoint}</code>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4 text-sm">
                              <div className="text-center">
                                <div className="text-white font-medium">{endpoint.requests}</div>
                                <div className="text-gray-400">requests</div>
                              </div>
                              <div className="text-center">
                                <div className="text-white font-medium">{Math.round(endpoint.avgResponseTime)}ms</div>
                                <div className="text-gray-400">avg time</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}