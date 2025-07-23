'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useNotification } from '@/contexts/NotificationContext';

interface ApiKeyStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  topEndpoints: Array<{
    endpoint: string;
    requests: number;
    avgResponseTime: number;
  }>;
  dailyUsage: Array<{
    date: string;
    requests: number;
    avgResponseTime: number;
  }>;
  statusCodes: Array<{
    statusCode: number;
    count: number;
  }>;
  rateLimitHits: number;
  uniqueIPs: number;
}

interface ApiKey {
  id: string;
  name: string;
  usageCount: number;
  lastUsed: string | null;
  isActive: boolean;
}

interface ApiKeyAnalyticsProps {
  period: string;
  onPeriodChange: (period: string) => void;
}

export default function ApiKeyAnalytics({ period, onPeriodChange }: ApiKeyAnalyticsProps) {
  const { data: session } = useSession();
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(true);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<ApiKeyStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Get JWT token from API
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

  const getAuthHeaders = async () => {
    const token = await getJwtToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  // Fetch API keys
  const fetchApiKeys = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          endpoint: 'keys',
          method: 'GET'
        })
      });

      if (response.ok) {
        const data = await response.json();
        const keys = data.data.keys || [];
        setApiKeys(keys);
        
        // Auto-select first key if none selected
        if (keys.length > 0 && !selectedKeyId) {
          setSelectedKeyId(keys[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching API keys:', error);
    }
  }, [selectedKeyId, getAuthHeaders]);

  // Fetch analytics for selected key
  const fetchAnalytics = useCallback(async (keyId: string) => {
    if (!keyId) return;

    try {
      setRefreshing(true);
      const days = period === '24h' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : 90;
      const headers = await getAuthHeaders();
      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          endpoint: `keys/${keyId}/usage?days=${days}`,
          method: 'GET'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.data);
      } else {
        throw new Error('Failed to fetch analytics');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load analytics data',
        duration: 5000
      });
    } finally {
      setRefreshing(false);
    }
  }, [showNotification, period, getAuthHeaders]);

  // Auto-refresh analytics every 30 seconds
  useEffect(() => {
    if (!selectedKeyId) return;

    const interval = setInterval(() => {
      fetchAnalytics(selectedKeyId);
    }, 30000);

    return () => clearInterval(interval);
  }, [selectedKeyId, period, fetchAnalytics]);

  // Initial load
  useEffect(() => {
    if (session) {
      fetchApiKeys().then(() => setLoading(false));
    }
  }, [session, fetchApiKeys]);

  // Fetch analytics when key or period changes
  useEffect(() => {
    if (selectedKeyId) {
      fetchAnalytics(selectedKeyId);
    }
  }, [selectedKeyId, period, fetchAnalytics]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getSuccessRate = (analytics: ApiKeyStats | null) => {
    if (!analytics || !analytics.totalRequests || analytics.totalRequests === 0) {
      return '0.0';
    }
    
    return (((analytics.successfulRequests || 0) / analytics.totalRequests) * 100).toFixed(1);
  };

  if (loading) {
    return (
      <div className="bg-purple-500/5 rounded-xl p-8 border border-purple-500/20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (apiKeys.length === 0) {
    return (
      <div className="bg-gray-500/5 rounded-xl p-12 border border-gray-500/20 text-center">
        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
        <h4 className="text-xl font-medium text-white mb-2">No API Keys</h4>
        <p className="text-gray-400">Create an API key to view usage analytics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-2xl font-semibold text-white">API Analytics</h3>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-400 font-medium">Live Data</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* API Key Selector */}
          <select
            value={selectedKeyId || ''}
            onChange={(e) => setSelectedKeyId(e.target.value)}
            className="px-3 py-2 bg-black/50 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {apiKeys.map((key) => (
              <option key={key.id} value={key.id}>
                {key.name} ({(key.usageCount || 0).toLocaleString()} requests)
              </option>
            ))}
          </select>

          {/* Period Selector */}
          <select
            value={period}
            onChange={(e) => onPeriodChange(e.target.value)}
            className="px-3 py-2 bg-black/50 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={() => selectedKeyId && fetchAnalytics(selectedKeyId)}
            disabled={refreshing}
            className="p-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg border border-purple-500/30 transition-all duration-200 disabled:opacity-50"
          >
            <svg className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {analytics ? (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 rounded-xl p-6 border border-blue-500/30"
            >
              <div className="text-3xl font-bold text-white mb-1">
                {(analytics.totalRequests || 0).toLocaleString()}
              </div>
              <div className="text-sm text-blue-400">Total Requests</div>
              <div className="text-xs text-gray-400 mt-1">
                {analytics.uniqueIPs || 0} unique IPs
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-r from-green-500/10 to-green-600/10 rounded-xl p-6 border border-green-500/30"
            >
              <div className="text-3xl font-bold text-white mb-1">
                {getSuccessRate(analytics)}%
              </div>
              <div className="text-sm text-green-400">Success Rate</div>
              <div className="text-xs text-gray-400 mt-1">
                {(analytics.successfulRequests || 0).toLocaleString()} successful
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-r from-purple-500/10 to-purple-600/10 rounded-xl p-6 border border-purple-500/30"
            >
              <div className="text-3xl font-bold text-white mb-1">
                {Math.round(analytics.averageResponseTime || 0)}ms
              </div>
              <div className="text-sm text-purple-400">Avg Response Time</div>
              <div className="text-xs text-gray-400 mt-1">
                Last {period}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-r from-red-500/10 to-red-600/10 rounded-xl p-6 border border-red-500/30"
            >
              <div className="text-3xl font-bold text-white mb-1">
                {(analytics.rateLimitHits || 0).toLocaleString()}
              </div>
              <div className="text-sm text-red-400">Rate Limit Hits</div>
              <div className="text-xs text-gray-400 mt-1">
                {(analytics.failedRequests || 0).toLocaleString()} failed total
              </div>
            </motion.div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Usage Chart */}
            <div className="bg-black/30 rounded-xl p-6 border border-gray-700/50">
              <h4 className="text-lg font-medium text-white mb-4">Daily Usage Trend</h4>
              <div className="space-y-3">
                {(analytics.dailyUsage || []).slice(-7).map((day) => (
                  <div key={day.date} className="flex items-center justify-between">
                    <span className="text-sm text-gray-400 w-16">
                      {formatDate(day.date)}
                    </span>
                    <div className="flex items-center space-x-3 flex-1 mx-4">
                      <div className="flex-1 bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                          style={{ 
                            width: `${Math.min(100, (day.requests / Math.max(1, ...((analytics.dailyUsage || []).map(d => d.requests || 0)))) * 100)}%` 
                          }}
                        />
                      </div>
                      <span className="text-sm text-white w-12 text-right">
                        {day.requests || 0}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 w-12 text-right">
                      {Math.round(day.avgResponseTime || 0)}ms
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Codes */}
            <div className="bg-black/30 rounded-xl p-6 border border-gray-700/50">
              <h4 className="text-lg font-medium text-white mb-4">Response Status Codes</h4>
              <div className="space-y-3">
                {(analytics.statusCodes || []).map((status) => (
                  <div key={status.statusCode} className="flex items-center justify-between">
                    <span className={`text-sm font-medium w-12 ${
                      status.statusCode >= 200 && status.statusCode < 300 ? 'text-green-400' :
                      status.statusCode >= 400 && status.statusCode < 500 ? 'text-yellow-400' :
                      status.statusCode >= 500 ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      {status.statusCode}
                    </span>
                    <div className="flex items-center space-x-3 flex-1 mx-4">
                      <div className="flex-1 bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 ${
                            status.statusCode >= 200 && status.statusCode < 300 ? 'bg-green-500' :
                            status.statusCode >= 400 && status.statusCode < 500 ? 'bg-yellow-500' :
                            status.statusCode >= 500 ? 'bg-red-500' : 'bg-gray-500'
                          }`}
                          style={{ 
                            width: `${Math.min(100, ((status.count || 0) / (analytics.totalRequests || 1)) * 100)}%` 
                          }}
                        />
                      </div>
                      <span className="text-sm text-white w-16 text-right">
                        {(status.count || 0).toLocaleString()}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 w-12 text-right">
                      {(((status.count || 0) / (analytics.totalRequests || 1)) * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Endpoints */}
          <div className="bg-black/30 rounded-xl p-6 border border-gray-700/50">
            <h4 className="text-lg font-medium text-white mb-4">Top API Endpoints</h4>
            <div className="space-y-3">
              {(analytics.topEndpoints || []).map((endpoint, index) => (
                <div key={endpoint.endpoint} className="flex items-center justify-between p-4 bg-black/20 rounded-lg">
                  <div className="flex items-center space-x-4 flex-1">
                    <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded w-8 text-center">
                      #{index + 1}
                    </span>
                    <code className="text-sm text-white font-mono flex-1">
                      {endpoint.endpoint}
                    </code>
                  </div>
                  <div className="flex items-center space-x-6 text-sm">
                    <div className="text-center">
                      <div className="text-white font-medium">
                        {(endpoint.requests || 0).toLocaleString()}
                      </div>
                      <div className="text-gray-400 text-xs">requests</div>
                    </div>
                    <div className="text-center">
                      <div className="text-white font-medium">
                        {Math.round(endpoint.avgResponseTime || 0)}ms
                      </div>
                      <div className="text-gray-400 text-xs">avg time</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="bg-gray-500/5 rounded-xl p-12 border border-gray-500/20 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h4 className="text-xl font-medium text-white mb-2">No Usage Data</h4>
          <p className="text-gray-400">Start using your API key to see analytics data</p>
        </div>
      )}
    </div>
  );
}