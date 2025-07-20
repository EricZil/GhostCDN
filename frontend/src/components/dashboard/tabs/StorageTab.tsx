import React from 'react';
import { useNotification } from '../../../contexts/NotificationContext';
import { useOptimizationData, useOptimizeStorage, formatBytes } from '../../../hooks/useStorage';
import StorageChart from '../StorageChart';

interface StorageTabProps {
  optimizationInProgress: boolean;
  quotaSettings: {
    warningsEnabled: boolean;
    autoCleanupEnabled: boolean;
  };
  reportGenerating: boolean;
  handleOptimizeFiles: () => void;
  handleQuotaSettingChange: (setting: string, value: boolean) => void;
  handleGenerateReport: () => void;
  storageInfo: {
    totalFiles: number;
    totalSize: number;
    storageLimit: number;
    storagePercentage: number;
    storageByType: Array<{
      type?: string;
      fileType?: string;
      size: number;
      count: number;
      percentage: string;
    }>;
    available: number;
    weeklyGrowthRate?: number;
    timestamp?: string;
  } | null;
  loading: boolean;
  error: string | null;
  onRefreshStorage?: () => void;
}

export const StorageTab: React.FC<StorageTabProps> = ({
  optimizationInProgress,
  quotaSettings,
  reportGenerating,
  handleOptimizeFiles,
  handleQuotaSettingChange,
  handleGenerateReport,
  storageInfo,
  loading,
  error,
  onRefreshStorage
}) => {
  const { showNotification } = useNotification();
  
  // Use optimization hooks
  const { data: optimizationData, isLoading: optimizationLoading, error: optimizationError } = useOptimizationData();
  const optimizeMutation = useOptimizeStorage();
  
  // Use actual data from props
  const statsLoading = loading;
  const statsError = error;
  const storageStats = storageInfo;

  // Transform storage data for chart
  const transformedData = (storageInfo?.storageByType || []).map(item => ({
    type: item.type || 'Unknown',
    size: item.size || 0,
    count: item.count || 0,
    percentage: item.percentage
  }));

  const handleRefreshCache = () => {
    if (onRefreshStorage) {
      onRefreshStorage();
      showNotification({
        type: 'info',
        title: 'Refreshing Storage Data',
        message: 'Storage information is being updated...',
        duration: 2000
      });
    }
  };

  const handleOptimizeStorageFiles = async () => {
    if (!optimizationData || optimizationData.totalOptimizableFiles === 0) {
      showNotification({
        type: 'info',
        title: 'No Optimization Needed',
        message: 'No files found that can be optimized.',
        duration: 3000
      });
      return;
    }

    try {
      // Start with compressing large files if available
      if (optimizationData.largeFiles.count > 0) {
        const result = await optimizeMutation.mutateAsync({
          optimizationType: 'compress',
          fileIds: optimizationData.largeFiles.files.map(f => f.id)
        });
        
        showNotification({
          type: 'success',
          title: 'Optimization Complete',
          message: `Optimized ${result.filesOptimized} files, saved ${formatBytes(result.totalSavings)}`,
          duration: 4000
        });
      } else {
        // Fallback to general optimization
        handleOptimizeFiles();
      }
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Optimization Failed',
        message: error instanceof Error ? error.message : 'Failed to optimize files',
        duration: 4000
      });
    }
  };

  const formatBytesLocal = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };



  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (statsError) {
    return (
      <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-400">
          <span>⚠️</span>
          <span>Failed to load storage data: {statsError}</span>
        </div>
      </div>
    );
  }

  const storageData = storageStats || {
    totalFiles: 0,
    totalSize: 0,
    storageLimit: 10737418240, // 10GB
    storagePercentage: 0,
    available: 10737418240,
    storageByType: [],
    weeklyGrowthRate: 0,
    timestamp: new Date().toISOString()
  };

  return (
    <div className="space-y-3">
      {/* Compact Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        {/* Storage Usage */}
        <div className="lg:col-span-2 bg-[rgba(20,20,35,0.6)] rounded-lg p-4 border border-gray-800/40">
          <h4 className="text-base font-semibold text-white mb-3">Storage Usage</h4>
          <div className="flex justify-between text-xs mb-2">
            <span className="text-gray-400">Used: {formatBytesLocal(storageData.totalSize)}</span>
            <span className="text-gray-400">Available: {formatBytesLocal(storageData.available)}</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2 mb-2">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${
                storageData.storagePercentage < 50 ? 'bg-gradient-to-r from-green-500 to-blue-500' :
                storageData.storagePercentage < 80 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 
                'bg-gradient-to-r from-red-500 to-pink-500'
              }`} 
              style={{ width: `${Math.min(storageData.storagePercentage, 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500">
            {storageData.storagePercentage.toFixed(1)}% of {formatBytesLocal(storageData.storageLimit)} used
          </p>
          
          {/* Compact Forecast */}
          <div className="mt-3 p-2 bg-[rgba(15,15,25,0.5)] rounded border border-gray-800/30">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-300">📈 Weekly Growth: {(storageData.weeklyGrowthRate || 0).toFixed(1)}%</span>
              <span className="text-blue-400">Trend: {(storageData.weeklyGrowthRate || 0) > 5 ? 'High' : (storageData.weeklyGrowthRate || 0) > 1 ? 'Moderate' : 'Low'}</span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-[rgba(20,20,35,0.6)] rounded-lg p-3 border border-gray-800/40">
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-xl font-bold text-blue-400">
              {optimizationLoading ? '...' : (optimizationData?.totalOptimizableFiles || 0)}
            </div>
            <div className="text-xs text-gray-400">Files to optimize</div>
            <div className="text-xs text-green-400">
              ~{optimizationLoading ? '...' : formatBytesLocal(optimizationData?.totalPotentialSavings || 0)} savings
            </div>
          </div>
        </div>
        
        <div className="bg-[rgba(20,20,35,0.6)] rounded-lg p-3 border border-gray-800/40">
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-xl font-bold text-white">{storageData.totalFiles.toLocaleString()}</div>
            <div className="text-xs text-gray-400">Total Files</div>
            <div className="text-xs text-purple-400">
              {storageData.totalFiles > 0 ? formatBytesLocal(storageData.totalSize / storageData.totalFiles) : '0 B'} avg
            </div>
          </div>
        </div>
      </div>

      {/* Storage Breakdown Chart - Compact */}
      <div className="bg-[rgba(20,20,35,0.6)] rounded-lg p-4 border border-gray-800/40">
        <h4 className="text-base font-semibold text-white mb-3">Storage Breakdown by Category</h4>
        <div className="bg-[rgba(15,15,25,0.5)] rounded-lg p-4 border border-gray-800/30">
          {storageData.storageByType.length > 0 ? (
            <div className="h-80">
              <StorageChart data={transformedData} formatFileSize={formatBytesLocal} />
            </div>
           ) : (
            <div className="h-48 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-2">📁</div>
                <p className="text-gray-400 text-sm">No files uploaded yet</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compact Management Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Storage Optimization */}
        <div className="bg-[rgba(20,20,35,0.6)] rounded-lg p-4 border border-gray-800/40">
          <h4 className="text-base font-semibold text-white mb-3">Optimization</h4>
          <div className="space-y-2">
            <button 
              onClick={handleOptimizeStorageFiles}
              disabled={optimizationInProgress || optimizationLoading || optimizeMutation.isPending || !optimizationData || optimizationData.totalOptimizableFiles === 0}
              className="w-full p-2 bg-blue-500/20 text-blue-400 rounded border border-blue-500/30 hover:bg-blue-500/30 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              <span>{optimizationInProgress || optimizeMutation.isPending ? '🔄' : '⚡'}</span>
              <span>
                {optimizationInProgress || optimizeMutation.isPending ? 'Optimizing...' : 
                 `Optimize (${optimizationData?.totalOptimizableFiles || 0})`}
              </span>
            </button>
            <button 
              onClick={() => showNotification({
                type: 'info',
                title: 'Coming Soon',
                message: 'Optimization history feature coming soon!'
              })}
              className="w-full p-2 bg-green-500/20 text-green-400 rounded border border-green-500/30 hover:bg-green-500/30 transition-colors text-sm"
            >
              📊 History
            </button>
          </div>
        </div>

        {/* Quota Management */}
        <div className="bg-[rgba(20,20,35,0.6)] rounded-lg p-4 border border-gray-800/40">
          <h4 className="text-base font-semibold text-white mb-3">Quota Settings</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-[rgba(15,15,25,0.5)] rounded border border-gray-800/30">
              <span className="text-white text-xs">Warnings</span>
              <button
                onClick={() => handleQuotaSettingChange('warningsEnabled', !quotaSettings.warningsEnabled)}
                className={`w-6 h-3 rounded-full p-0.5 cursor-pointer transition-colors ${
                  quotaSettings.warningsEnabled ? 'bg-blue-500' : 'bg-gray-600'
                }`}
              >
                <div className={`w-2 h-2 bg-white rounded-full transition-transform ${
                  quotaSettings.warningsEnabled ? 'ml-auto' : 'ml-0'
                }`}></div>
              </button>
            </div>
            <div className="flex items-center justify-between p-2 bg-[rgba(15,15,25,0.5)] rounded border border-gray-800/30">
              <span className="text-white text-xs">Auto-cleanup</span>
              <button
                onClick={() => handleQuotaSettingChange('autoCleanupEnabled', !quotaSettings.autoCleanupEnabled)}
                className={`w-6 h-3 rounded-full p-0.5 cursor-pointer transition-colors ${
                  quotaSettings.autoCleanupEnabled ? 'bg-blue-500' : 'bg-gray-600'
                }`}
              >
                <div className={`w-2 h-2 bg-white rounded-full transition-transform ${
                  quotaSettings.autoCleanupEnabled ? 'ml-auto' : 'ml-0'
                }`}></div>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-[rgba(20,20,35,0.6)] rounded-lg p-4 border border-gray-800/40">
          <h4 className="text-base font-semibold text-white mb-3">Actions</h4>
          <div className="space-y-2">
            <button 
              onClick={handleGenerateReport}
              disabled={reportGenerating}
              className="w-full p-2 bg-blue-500/20 text-blue-400 rounded border border-blue-500/30 hover:bg-blue-500/30 transition-colors text-xs disabled:opacity-50 flex items-center justify-center gap-1"
            >
              <span>{reportGenerating ? '🔄' : '📊'}</span>
              <span>{reportGenerating ? 'Generating...' : 'Generate Report'}</span>
            </button>
            <button 
              onClick={handleRefreshCache}
              className="w-full p-2 bg-purple-500/20 text-purple-400 rounded border border-purple-500/30 hover:bg-purple-500/30 transition-colors text-xs disabled:opacity-50 flex items-center justify-center gap-1"
            >
              <span>🔄</span>
              <span>Refresh Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* Compact Cleanup Recommendations */}
      <div className="bg-[rgba(20,20,35,0.6)] rounded-lg p-4 border border-gray-800/40">
        <h4 className="text-base font-semibold text-white mb-3">🧹 Cleanup Recommendations</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {optimizationLoading ? (
            <div className="col-span-3 text-center text-gray-400 py-4">
              <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p>Loading recommendations...</p>
            </div>
          ) : optimizationError ? (
            <div className="col-span-3 text-center text-red-400 py-4">
              <p>Failed to load recommendations</p>
            </div>
          ) : optimizationData && optimizationData.totalOptimizableFiles > 0 ? (
            <>
              {optimizationData.largeFiles.count > 0 && (
                <div className="bg-[rgba(15,15,25,0.5)] rounded border border-gray-800/30 p-3">
                  <div className="text-orange-400 text-sm font-medium mb-1">📦 Large Files</div>
                  <div className="text-white text-xs">{optimizationData.largeFiles.count} files</div>
                  <div className="text-green-400 text-xs">~{formatBytesLocal(optimizationData.largeFiles.potentialSavings)} savings</div>
                </div>
              )}
              {optimizationData.duplicates.count > 0 && (
                <div className="bg-[rgba(15,15,25,0.5)] rounded border border-gray-800/30 p-3">
                  <div className="text-yellow-400 text-sm font-medium mb-1">🔄 Duplicates</div>
                  <div className="text-white text-xs">{optimizationData.duplicates.count} groups</div>
                  <div className="text-green-400 text-xs">~{formatBytesLocal(optimizationData.duplicates.potentialSavings)} savings</div>
                </div>
              )}
              {optimizationData.oldFiles.count > 0 && (
                <div className="bg-[rgba(15,15,25,0.5)] rounded border border-gray-800/30 p-3">
                  <div className="text-blue-400 text-sm font-medium mb-1">🗂️ Old Files</div>
                  <div className="text-white text-xs">{optimizationData.oldFiles.count} files</div>
                  <div className="text-green-400 text-xs">~{formatBytesLocal(optimizationData.oldFiles.potentialSavings)} savings</div>
                </div>
              )}
            </>
          ) : (
            <div className="col-span-3 text-center text-gray-400 py-4">
              <p>No optimization recommendations available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};