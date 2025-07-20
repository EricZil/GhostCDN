"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useDashboard } from '@/hooks/useDashboard';
import { useNotification } from '@/contexts/NotificationContext';
import { useAuth } from '@/contexts/AuthContext';

interface DuplicateGroup {
  fileSize: number;
  fileName: string;
  count: number;
  potentialSavings: number;
  files: Array<{
    id: string;
    fileName: string;
    fileKey: string;
    fileSize: number;
    fileType: string;
    uploadedAt: string;
    viewCount: number;
    thumbnails?: {
      small: string;
      medium: string;
      large: string;
    };
  }>;
}

interface DuplicateDetectionProps {
  onClose: () => void;
}

export default function DuplicateDetection({ onClose }: DuplicateDetectionProps) {
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const { user } = useAuth();
  const { fetchDuplicates, bulkDeleteFiles, formatFileSize, formatTimeAgo } = useDashboard();
  const { showNotification } = useNotification();

  const loadDuplicates = useCallback(async () => {
    if (!user?.email) return;
    
    setLoading(true);
    try {
      const data = await fetchDuplicates();
      setDuplicates(data.duplicateGroups || []);
    } catch {
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load duplicate files',
        duration: 4000
      });
    } finally {
      setLoading(false);
    }
  }, [user?.email, fetchDuplicates, showNotification]);

  useEffect(() => {
    loadDuplicates();
  }, [loadDuplicates]);

  const handleFileSelect = (fileId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedFiles(prev => [...prev, fileId]);
    } else {
      setSelectedFiles(prev => prev.filter(id => id !== fileId));
    }
  };

  const handleSelectAllInGroup = (group: DuplicateGroup, keepNewest = true) => {
    const sortedFiles = [...group.files].sort((a, b) => 
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
    
    const filesToSelect = keepNewest ? sortedFiles.slice(1) : sortedFiles;
    const fileIds = filesToSelect.map(f => f.id);
    
    setSelectedFiles(prev => {
      const filtered = prev.filter(id => !group.files.some(f => f.id === id));
      return [...filtered, ...fileIds];
    });
  };

  const handleBulkDelete = async () => {
    if (selectedFiles.length === 0) return;
    
    try {
      await bulkDeleteFiles(selectedFiles);
      setSelectedFiles([]);
      await loadDuplicates(); // Refresh the list
      
      showNotification({
        type: 'success',
        title: 'Files Deleted',
        message: `Successfully deleted ${selectedFiles.length} duplicate files`,
        duration: 4000
      });
    } catch {
      showNotification({
        type: 'error',
        title: 'Delete Failed',
        message: 'Failed to delete selected files',
        duration: 4000
      });
    }
  };

  const toggleGroupExpansion = (groupKey: string) => {
    setExpandedGroup(expandedGroup === groupKey ? null : groupKey);
  };

  const totalPotentialSavings = duplicates.reduce((sum, group) => sum + group.potentialSavings, 0);
  const totalDuplicateFiles = duplicates.reduce((sum, group) => sum + (group.count - 1), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Duplicate Detection</h2>
          <p className="text-gray-400">
            Found {duplicates.length} groups with {totalDuplicateFiles} duplicate files
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Summary Stats */}
      {duplicates.length > 0 && (
        <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{duplicates.length}</div>
              <div className="text-sm text-gray-300">Duplicate Groups</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{totalDuplicateFiles}</div>
              <div className="text-sm text-gray-300">Duplicate Files</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400">{formatFileSize(totalPotentialSavings)}</div>
              <div className="text-sm text-gray-300">Potential Savings</div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedFiles.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-red-600/20 to-pink-600/20 border border-red-500/30 rounded-xl p-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-white font-medium">
              {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedFiles([])}
                className="px-3 py-1 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Clear Selection
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Selected
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Duplicate Groups */}
      {duplicates.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No Duplicates Found</h3>
          <p className="text-gray-400">Your files are well organized with no duplicates detected.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {duplicates.map((group, index) => {
            const groupKey = `${group.fileName}-${group.fileSize}`;
            const isExpanded = expandedGroup === groupKey;
            
            return (
              <motion.div
                key={groupKey}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden"
              >
                {/* Group Header */}
                <div className="p-4 border-b border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center">
                        <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2v0a2 2 0 01-2-2v-2a2 2 0 00-2-2H8z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{group.fileName}</h3>
                        <p className="text-sm text-gray-400">
                          {group.count} copies • {formatFileSize(group.fileSize)} each • 
                          <span className="text-orange-400">Save {formatFileSize(group.potentialSavings)}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSelectAllInGroup(group, true)}
                        className="px-3 py-1 text-sm bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 rounded border border-orange-500/30 transition-colors"
                      >
                        Select Older
                      </button>
                      <button
                        onClick={() => toggleGroupExpansion(groupKey)}
                        className="p-2 text-gray-400 hover:text-white transition-colors"
                      >
                        <svg 
                          className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Files List */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 space-y-3">
                        {group.files.map((file) => {
                          const isSelected = selectedFiles.includes(file.id);
                          
                          return (
                            <div
                              key={file.id}
                              className={`flex items-center gap-4 p-3 rounded-lg border transition-all ${
                                isSelected 
                                  ? 'bg-red-500/20 border-red-500/50' 
                                  : 'bg-gray-700/30 border-gray-600 hover:border-gray-500'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => handleFileSelect(file.id, e.target.checked)}
                                className="w-4 h-4 text-red-500 bg-gray-700 border-gray-600 rounded focus:ring-red-500"
                              />
                              
                              {file.thumbnails?.medium && (
                                <Image
                                  src={file.thumbnails.medium}
                                  alt={file.fileName}
                                  width={40}
                                  height={40}
                                  className="w-10 h-10 rounded object-cover"
                                />
                              )}
                              
                              <div className="flex-1">
                                <div className="font-medium text-white">{file.fileName}</div>
                                <div className="text-sm text-gray-400">
                                  Uploaded {formatTimeAgo(file.uploadedAt)} • {file.viewCount} views
                                </div>
                              </div>
                              
                              <div className="text-right">
                                <div className="text-sm text-gray-300">{formatFileSize(file.fileSize)}</div>
                                <div className="text-xs text-gray-500">{file.fileType}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}