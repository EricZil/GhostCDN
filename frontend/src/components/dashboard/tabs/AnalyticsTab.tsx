import React from 'react';

interface AnalyticsData {
  averageViewsPerFile?: number;
  peakTrafficHour?: string | null;
  mostPopularFormat?: string | null;
  totalEvents?: number;
}

interface AnalyticsTabProps {
  analytics: AnalyticsData | null;
  analyticsPeriod: string;
  handleAnalyticsPeriodChange: (period: string) => void;
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({
  analytics,
  analyticsPeriod,
  handleAnalyticsPeriodChange
}) => {
  return (
    <div className="relative">
      {/* Analytics Content (blurred) */}
      <div className="space-y-6 blur-sm pointer-events-none">
        {/* Analytics Header with Period Selector */}
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-semibold text-white">Analytics Dashboard</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Time Period:</span>
            <select
              value={analyticsPeriod}
              onChange={(e) => handleAnalyticsPeriodChange(e.target.value)}
              className="px-3 py-2 bg-black/50 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>
        </div>

        {/* Analytics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[rgba(20,20,35,0.6)] rounded-xl p-6 border border-gray-800/40">
            <h4 className="text-lg font-semibold text-white mb-4">Views Over Time</h4>
            <div className="h-80 flex items-center justify-center">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-gray-400">Chart component not implemented</p>
              </div>
            </div>
          </div>

          <div className="bg-[rgba(20,20,35,0.6)] rounded-xl p-6 border border-gray-800/40">
            <h4 className="text-lg font-semibold text-white mb-4">Top Performing Files</h4>
            <div className="h-80 flex items-center justify-center">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-gray-400">Chart component not implemented</p>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="bg-[rgba(20,20,35,0.6)] rounded-xl p-6 border border-gray-800/40">
          <h4 className="text-lg font-semibold text-white mb-4">Detailed Analytics</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {analytics ? [
              {
                label: 'Avg. Views per File',
                value: analytics.averageViewsPerFile ? analytics.averageViewsPerFile.toFixed(1) : '0',
                trend: (analytics.averageViewsPerFile ?? 0) > 0 ? 'up' : 'neutral'
              },
              { 
                label: 'Peak Traffic Hour', 
                value: analytics.peakTrafficHour || 'N/A', 
                trend: 'neutral' 
              },
              { 
                label: 'Most Popular Format', 
                value: analytics.mostPopularFormat || 'N/A', 
                trend: analytics.mostPopularFormat ? 'up' : 'neutral' 
              },
              {
                label: 'Total Events',
                value: analytics.totalEvents ? analytics.totalEvents.toLocaleString() : '0',
                trend: (analytics.totalEvents ?? 0) > 0 ? 'up' : 'neutral'
              },
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
                <p className="text-sm text-gray-400 mb-2">{stat.label}</p>
                <div className={`inline-flex items-center text-xs px-2 py-1 rounded-full ${
                  stat.trend === 'up' ? 'bg-green-500/20 text-green-400' :
                  stat.trend === 'down' ? 'bg-red-500/20 text-red-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {stat.trend === 'up' ? '↗' : stat.trend === 'down' ? '↘' : '→'}
                </div>
              </div>
            )) : [
              { label: 'Avg. Views per File', value: '...', trend: 'neutral' },
              { label: 'Peak Traffic Hour', value: '...', trend: 'neutral' },
              { label: 'Most Popular Format', value: '...', trend: 'neutral' },
              { label: 'Total Events', value: '...', trend: 'neutral' },
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
                <p className="text-sm text-gray-400 mb-2">{stat.label}</p>
                <div className="inline-flex items-center text-xs px-2 py-1 rounded-full bg-gray-500/20 text-gray-400">
                  →
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Full Tab Overlay for Planned Feature */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-10">
        <div className="text-center space-y-6 p-8">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border border-orange-400/30 flex items-center justify-center">
            <svg className="w-10 h-10 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-3xl font-bold text-white mb-3">Analytics</h3>
            <p className="text-xl text-gray-300 mb-2">Possible Feature Update</p>
            <p className="text-base text-gray-400 max-w-lg mx-auto leading-relaxed">
              Analytics tracking is being developed. View tracking will be implemented in a future update to provide detailed insights about your uploaded files.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 text-orange-400">
            <div className="w-3 h-3 bg-orange-400 rounded-full animate-pulse"></div>
            <span className="text-base font-medium">Coming Soon</span>
            <div className="w-3 h-3 bg-orange-400 rounded-full animate-pulse animation-delay-300"></div>
          </div>
        </div>
      </div>
    </div>
  );
};