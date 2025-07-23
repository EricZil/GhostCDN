import React from 'react';

interface AdminFile {
  fileName: string;
  fileSize: number;

  uploadedAt: string;
  owner?: {
    name: string;
  };
}

interface AdminFileStats {
  totalFiles: number;
  flaggedFiles: number;
  orphanedFiles: number;
  largeFiles: number;
}

interface AdminFilesTabProps {
  adminFiles: unknown[];
  adminFileStats: AdminFileStats | null;
  adminLoading: boolean;
  adminFormatFileSize: (bytes: number) => string;
  adminFormatTimeAgo: (date: string) => string;
  isAdminFile: (file: unknown) => file is AdminFile;
}

export const AdminFilesTab: React.FC<AdminFilesTabProps> = ({
  adminFiles,
  adminFileStats,
  adminLoading,
  adminFormatFileSize,
  adminFormatTimeAgo,
  isAdminFile
}) => {
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
};