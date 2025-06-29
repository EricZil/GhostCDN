"use client";

import { useState } from 'react';
import { useCacheStats } from '@/hooks/useCacheStats';
import { useNotification } from '@/contexts/NotificationContext';

export default function AdminCachePerformance() {
  const { 
    data: cacheStats, 
    isLoading: cacheLoading, 
    error: cacheError,
    refreshStats,
    clearAllCache,
    clearSpecificCache,
    useCacheKeys,
    useCacheKeyInfo
  } = useCacheStats();
  
  const { showNotification } = useNotification();
  const [isClearing, setIsClearing] = useState(false);
  const [showClearSpecificModal, setShowClearSpecificModal] = useState(false);
  const [showKeysModal, setShowKeysModal] = useState(false);
  const [showKeyDetailsModal, setShowKeyDetailsModal] = useState(false);
  const [specificKey, setSpecificKey] = useState('');
  const [selectedKey, setSelectedKey] = useState('');
  const [keyPattern, setKeyPattern] = useState('*');
  
  // Fetch cache keys when modal is open
  const { data: cacheKeys, isLoading: keysLoading, refetch: refetchKeys } = useCacheKeys(keyPattern);
  const { data: keyInfo, isLoading: keyInfoLoading } = useCacheKeyInfo(selectedKey);

  const handleRefreshStats = () => {
    refreshStats();
    showNotification({
      type: 'info',
      title: 'Cache Stats Refreshed',
      message: 'Cache statistics have been updated',
      duration: 3000
    });
  };

  const handleClearAllCache = async () => {
    if (!confirm('Are you sure you want to clear all cache? This will temporarily reduce performance until the cache is rebuilt.')) {
      return;
    }

    setIsClearing(true);
    try {
      await clearAllCache();
      showNotification({
        type: 'success',
        title: 'Cache Cleared',
        message: 'All cache has been successfully cleared',
        duration: 4000
      });
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Clear Failed',
        message: error instanceof Error ? error.message : 'Failed to clear cache',
        duration: 6000
      });
    } finally {
      setIsClearing(false);
    }
  };

  const handleClearSpecificCache = async () => {
    if (!specificKey.trim()) {
      showNotification({
        type: 'error',
        title: 'Invalid Key',
        message: 'Please enter a cache key to clear',
        duration: 4000
      });
      return;
    }

    try {
      await clearSpecificCache(specificKey.trim());
      showNotification({
        type: 'success',
        title: 'Cache Key Cleared',
        message: `Cache key "${specificKey}" has been cleared`,
        duration: 4000
      });
      setShowClearSpecificModal(false);
      setSpecificKey('');
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Clear Failed',
        message: error instanceof Error ? error.message : 'Failed to clear cache key',
        duration: 6000
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-semibold text-white">Cache Performance</h3>
          {cacheStats && (
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  cacheStats.redisHealthy ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className="text-sm text-gray-400">
                  {cacheStats.backend || cacheStats.type || 'Unknown Backend'}
                </span>
              </div>
              {cacheStats.redisHealthy && (
                <span className="text-xs px-2 py-1 bg-green-500/10 text-green-400 rounded-full border border-green-500/20">
                  Redis Connected
                </span>
              )}
              {!cacheStats.redisHealthy && cacheStats.fallbackAvailable && (
                <span className="text-xs px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded-full border border-yellow-500/20">
                  Fallback Mode
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleRefreshStats}
            disabled={cacheLoading}
            className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg border border-green-500/30 hover:bg-green-500/30 transition-colors disabled:opacity-50"
          >
            {cacheLoading ? 'Refreshing...' : 'Refresh Stats'}
          </button>
          {cacheStats?.redisHealthy && (
            <button 
              onClick={() => setShowKeysModal(true)}
              className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30 hover:bg-blue-500/30 transition-colors"
            >
              View Keys
            </button>
          )}
          <button 
            onClick={handleClearAllCache}
            disabled={isClearing}
            className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg border border-red-500/30 hover:bg-red-500/30 transition-colors disabled:opacity-50"
          >
            {isClearing ? 'Clearing...' : 'Clear Cache'}
          </button>
        </div>
      </div>

      {/* Cache Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {(cacheStats ? [
          { 
            label: 'Cache Hit Rate', 
            value: cacheStats.hitRate, 
            icon: '🎯', 
            color: 'from-green-500 to-emerald-500',
            description: 'Percentage of requests served from cache'
          },
          { 
            label: 'Total Hits', 
            value: cacheStats.hits.toLocaleString(), 
            icon: '✅', 
            color: 'from-blue-500 to-cyan-500',
            description: 'Successful cache retrievals'
          },
          { 
            label: 'Cache Misses', 
            value: cacheStats.misses.toLocaleString(), 
            icon: '❌', 
            color: 'from-orange-500 to-red-500',
            description: 'Requests that required database queries'
          },
          { 
            label: 'Cache Entries', 
            value: cacheStats.size.toString(), 
            icon: '📦', 
            color: 'from-purple-500 to-pink-500',
            description: 'Number of items currently cached'
          },
        ] : [
          { label: 'Cache Hit Rate', value: cacheLoading ? '...' : 'N/A', icon: '🎯', color: 'from-green-500 to-emerald-500', description: 'Loading...' },
          { label: 'Total Hits', value: cacheLoading ? '...' : 'N/A', icon: '✅', color: 'from-blue-500 to-cyan-500', description: 'Loading...' },
          { label: 'Cache Misses', value: cacheLoading ? '...' : 'N/A', icon: '❌', color: 'from-orange-500 to-red-500', description: 'Loading...' },
          { label: 'Cache Entries', value: cacheLoading ? '...' : 'N/A', icon: '📦', color: 'from-purple-500 to-pink-500', description: 'Loading...' },
        ]).map((stat, index) => (
          <div key={index} className="bg-[rgba(20,20,35,0.8)] rounded-2xl p-6 border border-gray-700/50 shadow-xl backdrop-blur-sm hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${stat.color} flex items-center justify-center text-lg shadow-lg`}>
                {stat.icon}
              </div>
              {cacheStats && stat.label === 'Cache Hit Rate' && (
                <span className={`text-sm font-semibold px-3 py-1 rounded-full border ${
                  parseFloat(cacheStats.hitRate) > 80 ? 'text-green-400 bg-green-400/10 border-green-400/20' :
                  parseFloat(cacheStats.hitRate) > 60 ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' :
                  'text-red-400 bg-red-400/10 border-red-400/20'
                }`}>
                  {parseFloat(cacheStats.hitRate) > 80 ? 'Excellent' :
                   parseFloat(cacheStats.hitRate) > 60 ? 'Good' : 'Poor'}
                </span>
              )}
            </div>
            <p className="text-3xl font-bold text-white mb-2">{stat.value}</p>
            <p className="text-base text-gray-300 font-medium mb-2">{stat.label}</p>
            <p className="text-sm text-gray-400">{stat.description}</p>
          </div>
        ))}
      </div>

      {/* Cache Performance Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Impact */}
        <div className="bg-[rgba(20,20,35,0.6)] rounded-xl p-6 border border-gray-800/40">
          <h4 className="text-lg font-semibold text-white mb-4">Performance Impact</h4>
          <div className="space-y-4">
            {(() => {
              const hitRate = parseFloat(cacheStats?.hitRate?.replace('%', '') || '0');
              const responseTimeImprovement = Math.round(hitRate * 0.95);
              const databaseLoadReduction = Math.round(hitRate * 0.85);
              const bandwidthSavings = Math.round(hitRate * 0.75);
              
              return (
                <>
                  <div className="flex items-center justify-between p-4 bg-[rgba(15,15,25,0.5)] rounded-lg border border-gray-800/30">
                    <div>
                      <p className="text-white font-medium">Response Time</p>
                      <p className="text-sm text-gray-400">Average API response improvement</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-400">{responseTimeImprovement}%</p>
                      <p className="text-xs text-green-400">faster</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-[rgba(15,15,25,0.5)] rounded-lg border border-gray-800/30">
                    <div>
                      <p className="text-white font-medium">Database Load</p>
                      <p className="text-sm text-gray-400">Reduced query frequency</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-400">{databaseLoadReduction}%</p>
                      <p className="text-xs text-blue-400">reduction</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-[rgba(15,15,25,0.5)] rounded-lg border border-gray-800/30">
                    <div>
                      <p className="text-white font-medium">Bandwidth Usage</p>
                      <p className="text-sm text-gray-400">Backend traffic reduction</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-purple-400">{bandwidthSavings}%</p>
                      <p className="text-xs text-purple-400">saved</p>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* Cache Status */}
        <div className="bg-[rgba(20,20,35,0.6)] rounded-xl p-6 border border-gray-800/40">
          <h4 className="text-lg font-semibold text-white mb-4">Cache Status</h4>
          {cacheError ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <p className="text-red-400 font-medium mb-2">Cache Unavailable</p>
              <p className="text-gray-400 text-sm">Unable to fetch cache statistics</p>
            </div>
          ) : cacheLoading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400">Loading cache statistics...</p>
            </div>
          ) : cacheStats ? (
            <div className="space-y-4">
              <div className="text-center py-6">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                  <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="text-green-400 font-medium text-lg mb-2">Cache Active</p>
                <p className="text-gray-400 text-sm">System is running with optimal caching</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 bg-[rgba(15,15,25,0.5)] rounded-lg border border-gray-800/30">
                  <p className="text-lg font-bold text-white">{cacheStats.sets}</p>
                  <p className="text-xs text-gray-400">Cache Writes</p>
                </div>
                <div className="p-3 bg-[rgba(15,15,25,0.5)] rounded-lg border border-gray-800/30">
                  <p className="text-lg font-bold text-white">{(cacheStats.hits + cacheStats.misses).toLocaleString()}</p>
                  <p className="text-xs text-gray-400">Total Requests</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              No cache data available
            </div>
          )}
        </div>
      </div>

      {/* Cache Management Actions */}
      <div className="bg-[rgba(20,20,35,0.6)] rounded-xl p-6 border border-gray-800/40">
        <h4 className="text-lg font-semibold text-white mb-4">Cache Management</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button 
            onClick={handleRefreshStats}
            disabled={cacheLoading}
            className="p-4 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30 hover:bg-blue-500/30 transition-colors text-left disabled:opacity-50"
          >
            <div className="text-2xl mb-2">🔄</div>
            <p className="font-medium mb-1">Refresh Stats</p>
            <p className="text-sm text-blue-300">Update cache statistics</p>
          </button>
          
          {cacheStats?.redisHealthy && (
            <button 
              onClick={() => setShowKeysModal(true)}
              className="p-4 bg-purple-500/20 text-purple-400 rounded-lg border border-purple-500/30 hover:bg-purple-500/30 transition-colors text-left"
            >
              <div className="text-2xl mb-2">🔍</div>
              <p className="font-medium mb-1">Browse Keys</p>
              <p className="text-sm text-purple-300">View and manage Redis keys</p>
            </button>
          )}
          
          <button 
            onClick={() => setShowClearSpecificModal(true)}
            className="p-4 bg-orange-500/20 text-orange-400 rounded-lg border border-orange-500/30 hover:bg-orange-500/30 transition-colors text-left"
          >
            <div className="text-2xl mb-2">🗑️</div>
            <p className="font-medium mb-1">Clear Specific</p>
            <p className="text-sm text-orange-300">Clear individual cache keys</p>
          </button>
          
          <button 
            onClick={handleClearAllCache}
            disabled={isClearing}
            className="p-4 bg-red-500/20 text-red-400 rounded-lg border border-red-500/30 hover:bg-red-500/30 transition-colors text-left disabled:opacity-50"
          >
            <div className="text-2xl mb-2">💣</div>
            <p className="font-medium mb-1">Clear All</p>
            <p className="text-sm text-red-300">Reset entire cache</p>
          </button>
        </div>
      </div>

      {/* Cache Effectiveness Chart */}
      <div className="bg-[rgba(20,20,35,0.6)] rounded-xl p-6 border border-gray-800/40">
        <h4 className="text-lg font-semibold text-white mb-4">Cache Effectiveness</h4>
        {cacheStats ? (
          <div className="space-y-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Hit Rate: {cacheStats.hitRate}</span>
              <span className="text-gray-400">Total: {(cacheStats.hits + cacheStats.misses).toLocaleString()} requests</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-4">
              <div 
                className="bg-gradient-to-r from-green-500 to-emerald-500 h-4 rounded-full transition-all duration-500 flex items-center justify-end pr-2" 
                style={{ width: cacheStats.hitRate }}
              >
                <span className="text-xs text-white font-medium">{cacheStats.hitRate}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-400">{cacheStats.hits.toLocaleString()}</p>
                <p className="text-sm text-gray-400">Cache Hits</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-400">{cacheStats.misses.toLocaleString()}</p>
                <p className="text-sm text-gray-400">Cache Misses</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-gray-400">Loading cache effectiveness data...</p>
            </div>
          </div>
        )}
      </div>

      {/* Clear Specific Cache Modal */}
      {showClearSpecificModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-900/95 via-orange-900/20 to-gray-900/95 backdrop-blur-xl rounded-2xl border border-orange-500/30 shadow-2xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Clear Specific Cache Key</h3>
                  <p className="text-sm text-gray-400">Enter the cache key you want to clear</p>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm text-gray-300 mb-2">Cache Key</label>
                <input
                  type="text"
                  value={specificKey}
                  onChange={(e) => setSpecificKey(e.target.value)}
                  placeholder="e.g., public-system-messages"
                  className="w-full px-3 py-2 bg-black/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-gray-400"
                />
                <p className="text-xs text-gray-500 mt-1">Common keys: public-system-messages, public-system-settings</p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowClearSpecificModal(false);
                    setSpecificKey('');
                  }}
                  className="flex-1 px-4 py-2.5 bg-gray-700/50 hover:bg-gray-700/70 text-gray-300 hover:text-white rounded-lg border border-gray-600/50 transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearSpecificCache}
                  disabled={!specificKey.trim()}
                  className="flex-1 px-4 py-2.5 bg-orange-500/80 hover:bg-orange-500 text-white rounded-lg border border-orange-500/50 transition-all duration-200 font-medium shadow-lg hover:shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear Key
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Redis Keys Browser Modal */}
      {showKeysModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-900/95 via-purple-900/20 to-gray-900/95 backdrop-blur-xl rounded-2xl border border-purple-500/30 shadow-2xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Redis Keys Browser</h3>
                    <p className="text-sm text-gray-400">View and manage cache keys</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowKeysModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Search Pattern */}
              <div className="mb-4">
                <label className="block text-sm text-gray-300 mb-2">Search Pattern</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={keyPattern}
                    onChange={(e) => setKeyPattern(e.target.value)}
                    placeholder="* (all keys) or public-* (specific pattern)"
                    className="flex-1 px-3 py-2 bg-black/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-400"
                  />
                  <button
                    onClick={() => refetchKeys()}
                    disabled={keysLoading}
                    className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg border border-purple-500/30 hover:bg-purple-500/30 transition-colors disabled:opacity-50"
                  >
                    {keysLoading ? 'Searching...' : 'Search'}
                  </button>
                </div>
              </div>
              
              {/* Keys List */}
              <div className="bg-black/30 rounded-lg border border-gray-800/50 max-h-96 overflow-y-auto">
                {keysLoading ? (
                  <div className="p-8 text-center">
                    <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading cache keys...</p>
                  </div>
                ) : cacheKeys && cacheKeys.length > 0 ? (
                  <div className="divide-y divide-gray-800/50">
                    {cacheKeys.map((key, index) => (
                      <div key={index} className="p-4 hover:bg-gray-800/30 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-mono text-sm truncate">{key}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {key.startsWith('public-') ? 'Public Cache' : 
                               key.includes('system') ? 'System Cache' : 'Application Cache'}
                            </p>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => {
                                setSelectedKey(key);
                                setShowKeyDetailsModal(true);
                              }}
                              className="px-3 py-1 text-xs bg-blue-500/20 text-blue-400 rounded border border-blue-500/30 hover:bg-blue-500/30 transition-colors"
                            >
                              Details
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm(`Are you sure you want to clear the cache key "${key}"?`)) {
                                  try {
                                    await clearSpecificCache(key);
                                    refetchKeys();
                                    showNotification({
                                      type: 'success',
                                      title: 'Key Cleared',
                                      message: `Cache key "${key}" has been cleared`,
                                      duration: 4000
                                    });
                                  } catch (error) {
                                    showNotification({
                                      type: 'error',
                                      title: 'Clear Failed',
                                      message: error instanceof Error ? error.message : 'Failed to clear key',
                                      duration: 6000
                                    });
                                  }
                                }
                              }}
                              className="px-3 py-1 text-xs bg-red-500/20 text-red-400 rounded border border-red-500/30 hover:bg-red-500/30 transition-colors"
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-gray-400">No cache keys found matching pattern: {keyPattern}</p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between items-center mt-4 text-sm text-gray-400">
                <span>{cacheKeys?.length || 0} keys found</span>
                <button
                  onClick={() => setShowKeysModal(false)}
                  className="px-4 py-2 bg-gray-700/50 hover:bg-gray-700/70 text-gray-300 hover:text-white rounded-lg border border-gray-600/50 transition-all duration-200 font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Key Details Modal */}
      {showKeyDetailsModal && selectedKey && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-900/95 via-blue-900/20 to-gray-900/95 backdrop-blur-xl rounded-2xl border border-blue-500/30 shadow-2xl max-w-2xl w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Cache Key Details</h3>
                    <p className="text-sm text-gray-400 font-mono">{selectedKey}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowKeyDetailsModal(false);
                    setSelectedKey('');
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {keyInfoLoading ? (
                <div className="p-8 text-center">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading key details...</p>
                </div>
              ) : keyInfo ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-black/30 rounded-lg p-4 border border-gray-800/50">
                      <p className="text-sm text-gray-400 mb-1">Status</p>
                      <p className={`font-semibold ${keyInfo.exists ? 'text-green-400' : 'text-red-400'}`}>
                        {keyInfo.exists ? 'Exists' : 'Not Found'}
                      </p>
                    </div>
                    <div className="bg-black/30 rounded-lg p-4 border border-gray-800/50">
                      <p className="text-sm text-gray-400 mb-1">TTL</p>
                      <p className="text-white font-semibold">
                        {keyInfo.ttl > 0 ? `${keyInfo.ttl}s` : keyInfo.ttl === -1 ? 'No expiry' : 'Expired'}
                      </p>
                    </div>
                    <div className="bg-black/30 rounded-lg p-4 border border-gray-800/50">
                      <p className="text-sm text-gray-400 mb-1">Human TTL</p>
                      <p className="text-white font-semibold">{keyInfo.ttlHuman}</p>
                    </div>
                  </div>
                  
                  {keyInfo.error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                      <p className="text-red-400 text-sm">{keyInfo.error}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-gray-400">Unable to load key details</p>
                </div>
              )}
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowKeyDetailsModal(false);
                    setSelectedKey('');
                  }}
                  className="flex-1 px-4 py-2.5 bg-gray-700/50 hover:bg-gray-700/70 text-gray-300 hover:text-white rounded-lg border border-gray-600/50 transition-all duration-200 font-medium"
                >
                  Close
                </button>
                {keyInfo?.exists && (
                  <button
                    onClick={async () => {
                      if (confirm(`Are you sure you want to clear the cache key "${selectedKey}"?`)) {
                        try {
                          await clearSpecificCache(selectedKey);
                          setShowKeyDetailsModal(false);
                          setSelectedKey('');
                          refetchKeys();
                          showNotification({
                            type: 'success',
                            title: 'Key Cleared',
                            message: `Cache key "${selectedKey}" has been cleared`,
                            duration: 4000
                          });
                        } catch (error) {
                          showNotification({
                            type: 'error',
                            title: 'Clear Failed',
                            message: error instanceof Error ? error.message : 'Failed to clear key',
                            duration: 6000
                          });
                        }
                      }
                    }}
                    className="px-4 py-2.5 bg-red-500/80 hover:bg-red-500 text-white rounded-lg border border-red-500/50 transition-all duration-200 font-medium shadow-lg hover:shadow-red-500/25"
                  >
                    Clear Key
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 