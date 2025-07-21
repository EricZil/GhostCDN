import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FileSearch, { SearchFilters } from '../FileSearch';
import BulkActions from '../BulkActions';
import ThumbnailLinks from '../../upload/ThumbnailLinks';
import Pagination from '../Pagination';

interface Upload {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileKey: string;
  uploadedAt: string;
  viewCount: number;
  uploadSource?: 'web' | 'cli';
  hasThumbnails?: boolean;
  thumbnails?: {
    small: string;
    medium: string;
    large: string;
  } | null;
}

interface DashboardStats {
  uploadsThisMonth: number;
  totalUploads: number;
  totalViews: number;
  storageUsed: number;
}

interface UploadsTabProps {
  dashboardStats: DashboardStats | null;
  uploads: Upload[];
  loading: boolean;
  selectedFiles: string[];
  expandedFileId: string | null;
  copiedFileId: string | null;
  copiedThumbnail: string | null;
  currentPage: number;
  itemsPerPage: number;
  formatFileSize: (bytes: number) => string;
  formatTimeAgo: (date: string) => string;
  handleSearch: (filters: SearchFilters) => void;
  handleFileSelect: (fileId: string, selected: boolean) => void;
  handleSelectAll: () => void;
  handleDeselectAll: () => void;
  handleBulkDelete: (fileIds: string[]) => Promise<void>;
  handleBulkDownload: (fileIds: string[]) => Promise<void>;
  toggleFileExpansion: (fileId: string) => void;
  handleCopyLink: (fileKey: string, fileId: string) => void;
  copyThumbnailToClipboard: (url: string, type: string) => void;
  handleDeleteFile: (fileId: string, fileName: string) => void;
  handlePageChange: (page: number) => void;
  handleItemsPerPageChange: (itemsPerPage: number) => void;
}

// Helper function to check if a file is an image type
const isImageFile = (fileType: string): boolean => {
  return fileType.startsWith('image/');
};

// Helper function to render upload source badge
const renderUploadSourceBadge = (uploadSource?: 'web' | 'cli') => {
  if (uploadSource === 'cli') {
    return (
      <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs font-medium flex items-center gap-1">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3" />
        </svg>
        CLI Upload
      </span>
    );
  }
  return null;
};

// Helper function to render thumbnail badge (only for images with thumbnails)
const renderThumbnailBadge = (fileType: string, hasThumbnails?: boolean) => {
  if (isImageFile(fileType) && hasThumbnails) {
    return (
      <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full text-xs font-medium flex items-center gap-1">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Thumbs
      </span>
    );
  }
  return null;
};

export const UploadsTab: React.FC<UploadsTabProps> = ({
  dashboardStats,
  uploads,
  loading,
  selectedFiles,
  expandedFileId,
  copiedFileId,
  copiedThumbnail,
  currentPage,
  itemsPerPage,
  formatFileSize,
  formatTimeAgo,
  handleSearch,
  handleFileSelect,
  handleSelectAll,
  handleDeselectAll,
  handleBulkDelete,
  handleBulkDownload,
  toggleFileExpansion,
  handleCopyLink,
  copyThumbnailToClipboard,
  handleDeleteFile,
  handlePageChange,
  handleItemsPerPageChange
}) => {
  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-indigo-500/10 rounded-2xl p-6 border border-blue-500/20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold text-white mb-2">My Uploads</h3>
            <p className="text-gray-300">Manage and organize your uploaded files</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {dashboardStats ? [
            { label: 'This Month', value: dashboardStats.uploadsThisMonth.toString(), icon: '📅', color: 'from-green-500 to-emerald-500' },
            { label: 'Total Files', value: dashboardStats.totalUploads.toString(), icon: '📁', color: 'from-blue-500 to-cyan-500' },
            { label: 'Total Views', value: dashboardStats.totalViews.toLocaleString(), icon: '👁️', color: 'from-purple-500 to-pink-500' },
            { label: 'Storage Used', value: formatFileSize(dashboardStats.storageUsed), icon: '💾', color: 'from-orange-500 to-red-500' },
          ].map((stat, index) => (
            <div key={index} className="bg-black/20 rounded-xl p-4 border border-gray-700/50 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                  <span className="text-lg">{stat.icon}</span>
                </div>
                <div>
                  <p className="text-lg font-bold text-white">{stat.value}</p>
                  <p className="text-xs text-gray-400">{stat.label}</p>
                </div>
              </div>
            </div>
          )) : [
            { label: 'This Month', value: '...', icon: '📅', color: 'from-green-500 to-emerald-500' },
            { label: 'Total Files', value: '...', icon: '📁', color: 'from-blue-500 to-cyan-500' },
            { label: 'Total Views', value: '...', icon: '👁️', color: 'from-purple-500 to-pink-500' },
            { label: 'Storage Used', value: '...', icon: '💾', color: 'from-orange-500 to-red-500' },
          ].map((stat, index) => (
            <div key={index} className="bg-black/20 rounded-xl p-4 border border-gray-700/50 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg animate-pulse`}>
                  <span className="text-lg">{stat.icon}</span>
                </div>
                <div>
                  <p className="text-lg font-bold text-white">{stat.value}</p>
                  <p className="text-xs text-gray-400">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Enhanced Search and Filters */}
      <div className="bg-[rgba(20,20,35,0.6)] rounded-xl border border-gray-800/40 p-4">
        <FileSearch
          onSearch={handleSearch}
          totalFiles={uploads.length}
          isLoading={loading}
        />
      </div>

      {/* Enhanced Bulk Actions - Only show when files are selected */}
      <AnimatePresence>
        {selectedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="bg-[rgba(20,20,35,0.6)] rounded-xl border border-gray-800/40 p-4">
              <BulkActions
                selectedFiles={selectedFiles}
                totalFiles={uploads.length}
                uploads={uploads}
                onSelectAll={handleSelectAll}
                onDeselectAll={handleDeselectAll}
                onBulkDelete={handleBulkDelete}
                onBulkDownload={handleBulkDownload}
                isLoading={loading}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Redesigned File List */}
      <div className="bg-[rgba(20,20,35,0.6)] rounded-xl border border-gray-800/40 overflow-hidden">
        <div className="p-4 border-b border-gray-800/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-white">File Library</h4>
              <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium">
                {uploads.length} files
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white transition-colors">
                Sort by Date
              </button>
              <button className="px-3 py-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors">
                View All
              </button>
            </div>
          </div>
        </div>
        
        <div className="divide-y divide-gray-800/40">
          {uploads.slice(0, 20).map((file, index) => {
            const isSelected = selectedFiles.includes(file.id);
            const isExpanded = expandedFileId === file.id;
            return (
              <div key={index} className={`transition-all duration-200 ${
                isSelected ? 'bg-purple-500/10 border-l-4 border-purple-500' : 'hover:bg-[rgba(30,30,45,0.3)]'
              }`}>
                {/* Main File Row */}
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {/* Enhanced Selection Checkbox */}
                      <button
                        onClick={() => handleFileSelect(file.id, !isSelected)}
                        className={`w-5 h-5 rounded-lg border-2 transition-all duration-200 flex items-center justify-center ${
                          isSelected 
                            ? 'bg-purple-500 border-purple-500 shadow-lg shadow-purple-500/30' 
                            : 'border-gray-600 hover:border-purple-400 hover:shadow-lg hover:shadow-purple-500/20'
                        }`}
                      >
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>

                      {/* Enhanced File Preview */}
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 flex items-center justify-center overflow-hidden shadow-lg">
                        {isImageFile(file.fileType) && file.hasThumbnails && file.thumbnails?.small ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={file.thumbnails.small}
                            alt={file.fileName}
                            className="w-full h-full object-cover rounded-lg"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = '<span class="text-lg">📷</span>';
                              }
                            }}
                          />
                        ) : (
                          <span className="text-lg">
                            {isImageFile(file.fileType) ? '📷' :
                             file.fileType.startsWith('video/') ? '🎥' :
                             file.fileType.startsWith('audio/') ? '🎵' :
                             file.fileType.includes('pdf') ? '📄' :
                             file.fileType.includes('zip') || file.fileType.includes('archive') ? '📦' :
                             '📁'}
                          </span>
                        )}
                      </div>
                      
                      {/* Enhanced File Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-white truncate">{file.fileName}</p>
                          <div className="flex items-center gap-2">
                            {renderUploadSourceBadge(file.uploadSource)}
                            {renderThumbnailBadge(file.fileType, file.hasThumbnails)}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            {formatFileSize(file.fileSize)}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {formatTimeAgo(file.uploadedAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {file.viewCount} views
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Enhanced Action Buttons */}
                    <div className="flex items-center gap-2">
                      {/* Thumbnail Toggle Button - Only show for images with thumbnails */}
                      {isImageFile(file.fileType) && file.hasThumbnails && (
                        <button
                          onClick={() => toggleFileExpansion(file.id)}
                          className={`group relative px-3 py-2 rounded-xl border transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                            isExpanded
                              ? 'bg-gradient-to-r from-purple-500/30 to-indigo-500/30 border-purple-400/50 text-purple-300 shadow-lg shadow-purple-500/20'
                              : 'bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border-purple-400/30 text-purple-300 hover:from-purple-500/20 hover:to-indigo-500/20 hover:border-purple-400/50 hover:shadow-lg hover:shadow-purple-500/20'
                          }`}
                          title={isExpanded ? "Hide thumbnails" : "Show thumbnails"}
                        >
                          <div className="flex items-center gap-2">
                            <svg className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : 'group-hover:scale-110'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-xs font-medium">
                              {isExpanded ? 'Hide' : 'Links'}
                            </span>
                          </div>
                        </button>
                      )}

                      {/* Copy Link Button */}
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

                      {/* Delete Button */}
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

                {/* Thumbnail Links Expansion - Only for images with thumbnails */}
                <AnimatePresence>
                  {isExpanded && isImageFile(file.fileType) && file.hasThumbnails && file.thumbnails && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-gray-800/40 bg-[rgba(15,15,25,0.5)]"
                    >
                      <div className="p-6">
                        <ThumbnailLinks
                        thumbnails={file.thumbnails && {
                          small: file.thumbnails.small || '',
                          medium: file.thumbnails.medium || '',
                          large: file.thumbnails.large || ''
                        }}
                        copied={copiedThumbnail || false}
                        copyToClipboard={copyThumbnailToClipboard}
                      />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* Enhanced Pagination */}
      <div className="bg-[rgba(20,20,35,0.6)] rounded-xl border border-gray-800/40 p-4">
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
    </div>
  );
};