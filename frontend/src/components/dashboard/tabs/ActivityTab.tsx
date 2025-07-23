import React from 'react';
import { DashboardStats } from '../../../hooks/useDashboard';

interface Activity {
  type: string;
  message: string;
  createdAt: string;
}

interface ActivityTabProps {
  activities: Activity[];
  dashboardStats: DashboardStats | null;
  formatTimeAgo: (date: string) => string;
  formatFileSize: (bytes: number) => string;
}

export const ActivityTab: React.FC<ActivityTabProps> = ({
  activities,
  dashboardStats,
  formatTimeAgo,
  formatFileSize
}) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'UPLOAD': return '📤';
      case 'DELETE': return '🗑️';
      case 'DOWNLOAD': return '⬇️';
      case 'SHARE': return '🔗';
      case 'MILESTONE_REACHED': return '🏆';
      case 'SETTINGS_CHANGED': return '⚙️';
      case 'STORAGE_OPTIMIZED': return '⚡';
      default: return '📋';
    }
  };

  return (
    <div className="space-y-6">
      {/* Activity Feed */}
      <div className="bg-[rgba(20,20,35,0.8)] rounded-2xl p-6 border border-gray-700/50 shadow-xl backdrop-blur-sm">
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-xl font-bold text-white">Recent Activity</h4>
          <button className="text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium">
            View All Activity
          </button>
        </div>
        <div className="space-y-4">
          {(activities.length > 0 ? activities : [
            { type: 'UPLOAD', message: 'No recent activity', createdAt: new Date().toISOString() }
          ]).map((activity, index) => {
            return (
              <div key={index} className="flex items-center gap-4 p-4 rounded-xl bg-[rgba(15,15,25,0.7)] border border-gray-700/40 hover:bg-[rgba(25,25,35,0.7)] transition-all duration-200">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm">{getActivityIcon(activity.type)}</span>
                </div>
                <div className="flex-1">
                  <p className="text-base text-white">{activity.message}</p>
                  <p className="text-sm text-gray-400 mt-1">{formatTimeAgo(activity.createdAt)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Activity Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[rgba(20,20,35,0.8)] rounded-2xl p-6 border border-gray-700/50 shadow-xl backdrop-blur-sm">
          <h4 className="text-lg font-bold text-white mb-4">This Week</h4>
          <div className="space-y-3">
            {(dashboardStats ? [
              { label: 'Uploads', value: dashboardStats.uploadsThisMonth.toString(), color: 'text-green-400' },
              { label: 'Storage Used', value: formatFileSize(dashboardStats.storageUsed), color: 'text-purple-400' },
            ] : [
              { label: 'Uploads', value: '...', color: 'text-green-400' },
              { label: 'Storage Used', value: '...', color: 'text-purple-400' },
            ]).map((stat, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-gray-300">{stat.label}</span>
                <span className={`font-bold text-lg ${stat.color}`}>{stat.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[rgba(20,20,35,0.8)] rounded-2xl p-6 border border-gray-700/50 shadow-xl backdrop-blur-sm">
          <h4 className="text-lg font-bold text-white mb-4">All Time</h4>
          <div className="space-y-3">
            {(dashboardStats ? [
              { label: 'Total Uploads', value: dashboardStats.totalUploads.toString(), color: 'text-green-400' },
              { label: 'Storage Used', value: formatFileSize(dashboardStats.storageUsed), color: 'text-purple-400' },
            ] : [
              { label: 'Total Uploads', value: '...', color: 'text-green-400' },
              { label: 'Storage Used', value: '...', color: 'text-purple-400' },
            ]).map((stat, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-gray-300">{stat.label}</span>
                <span className={`font-bold text-lg ${stat.color}`}>{stat.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};