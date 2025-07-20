'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotification } from '@/contexts/NotificationContext';

interface Upload {
  id: string;
  fileKey: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
  viewCount: number;
  thumbnails?: {
    small: string;
    medium: string;
    large: string;
  } | null;
}

interface BulkActionsProps {
  selectedFiles: string[];
  totalFiles: number;
  uploads: Upload[];
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkDelete: (fileIds: string[]) => Promise<void>;
  onBulkDownload: (fileIds: string[]) => Promise<void>;
  isLoading: boolean;
}

export default function BulkActions({
  selectedFiles,
  totalFiles,
  uploads,
  onSelectAll,
  onDeselectAll,
  onBulkDelete,
  onBulkDownload,
  isLoading
}: BulkActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const { showNotification } = useNotification();

  const isAllSelected = selectedFiles.length === totalFiles && totalFiles > 0;

  const handleBulkDelete = async () => {
    if (selectedFiles.length === 0) return;
    
    setIsDeleting(true);
    try {
      await onBulkDelete(selectedFiles);
      setShowConfirmDelete(false);
    } catch {
      // Handle bulk delete error silently
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDownload = async () => {
    if (selectedFiles.length === 0) return;
    
    setIsDownloading(true);
    try {
      await onBulkDownload(selectedFiles);
    } catch {
      // Handle bulk download error silently
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-xl p-4 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          {/* Selection Info */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded border-2 border-purple-500 bg-purple-500 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-white font-medium">
                {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
              </span>
            </div>

            {/* Select All/None */}
            <button
              onClick={isAllSelected ? onDeselectAll : onSelectAll}
              disabled={isLoading}
              className="text-sm text-purple-300 hover:text-purple-200 transition-colors disabled:opacity-50"
            >
              {isAllSelected ? 'Deselect all' : `Select all (${totalFiles})`}
            </button>
          </div>

          {/* Bulk Actions */}
          <div className="flex items-center gap-2">
            {/* Download Selected */}
            <button
              onClick={handleBulkDownload}
              disabled={isLoading || isDownloading}
              className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg border border-blue-500/30 transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDownloading ? (
                <div className="w-4 h-4 border-2 border-blue-300 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
              Download
            </button>

            {/* Copy Links */}
            <button
                onClick={async () => {
                  try {
                    // Get the actual file data for selected files
                    const selectedFileData = uploads.filter(upload => selectedFiles.includes(upload.id));
                    
                    // Create proper shareable URLs using fileKey
                    const links = selectedFileData.map(file => 
                      `${window.location.origin}/view/${file.fileKey}`
                    );
                    
                    await navigator.clipboard.writeText(links.join('\n'));
                    
                    showNotification({
                      type: 'success',
                      title: 'Links Copied',
                      message: `${selectedFiles.length} shareable link${selectedFiles.length !== 1 ? 's' : ''} copied to clipboard`,
                      duration: 3000
                    });
                  } catch {
                    showNotification({
                      type: 'error',
                      title: 'Copy Failed',
                      message: 'Failed to copy links to clipboard',
                      duration: 4000
                    });
                  }
                }}
                disabled={isLoading}
              className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg border border-green-500/30 transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy Links
            </button>

            {/* Delete Selected */}
            <button
              onClick={() => setShowConfirmDelete(true)}
              disabled={isLoading || isDeleting}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg border border-red-500/30 transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? (
                <div className="w-4 h-4 border-2 border-red-300 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              )}
              Delete
            </button>

            {/* Close Selection */}
            <button
              onClick={onDeselectAll}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showConfirmDelete && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setShowConfirmDelete(false)}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className="bg-gray-900 rounded-2xl border border-red-500/30 p-6 max-w-md w-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Delete Files</h3>
                    <p className="text-sm text-gray-400">This action cannot be undone</p>
                  </div>
                </div>
                
                <p className="text-gray-300 mb-6">
                  Are you sure you want to delete <strong>{selectedFiles.length}</strong> file{selectedFiles.length !== 1 ? 's' : ''}? 
                  This will permanently remove {selectedFiles.length !== 1 ? 'them' : 'it'} from your storage.
                </p>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowConfirmDelete(false)}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Deleting...
                      </>
                    ) : (
                      'Delete Files'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}