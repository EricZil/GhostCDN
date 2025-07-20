"use client";

import React from 'react';
import { User } from '@/types/auth';
import { DashboardStats } from '@/hooks/useDashboard';

interface OverviewTabProps {
  user: User | null;
  dashboardStats: DashboardStats | null;
  formatFileSize: (bytes: number) => string;
  formatTimeAgo: (time: string) => string;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ 
  user, 
  dashboardStats, 
  formatFileSize, 
  formatTimeAgo 
}) => {
  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-br from-blue-500/15 via-purple-500/15 to-indigo-500/15 rounded-3xl p-8 border border-blue-500/30 shadow-2xl backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 flex items-center justify-center text-3xl shadow-2xl">
              👋
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">
                Welcome back, {user?.name || 'User'}!
              </h3>
              <p className="text-lg text-gray-300">
                Here&apos;s what&apos;s happening with your uploads
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Last login</p>
            <p className="text-white font-medium">
              {user?.lastLogin ? formatTimeAgo(user.lastLogin) : 'First time'}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {(dashboardStats ? [
          { 
            label: 'Total Uploads', 
            value: dashboardStats.totalUploads.toString(), 
            change: dashboardStats.uploadsGrowth, 
            icon: '📤', 
            color: 'from-green-500 to-emerald-500' 
          },
          { 
            label: 'Storage Used', 
            value: formatFileSize(dashboardStats.storageUsed), 
            change: dashboardStats.storageGrowth, 
            icon: '💾', 
            color: 'from-blue-500 to-cyan-500' 
          },
          { 
            label: 'Total Views', 
            value: dashboardStats.totalViews.toLocaleString(), 
            change: dashboardStats.viewsGrowth, 
            icon: '👁️', 
            color: 'from-purple-500 to-pink-500' 
          },
          { 
            label: 'Bandwidth', 
            value: formatFileSize(dashboardStats.bandwidthUsed), 
            change: dashboardStats.bandwidthGrowth, 
            icon: '🌐', 
            color: 'from-orange-500 to-red-500' 
          },
        ] : [
          { label: 'Total Uploads', value: '...', change: '...', icon: '📤', color: 'from-green-500 to-emerald-500' },
          { label: 'Storage Used', value: '...', change: '...', icon: '💾', color: 'from-blue-500 to-cyan-500' },
          { label: 'Total Views', value: '...', change: '...', icon: '👁️', color: 'from-purple-500 to-pink-500' },
          { label: 'Bandwidth', value: '...', change: '...', icon: '🌐', color: 'from-orange-500 to-red-500' },
        ]).map((stat, index) => (
          <div key={index} className="bg-[rgba(20,20,35,0.8)] rounded-2xl p-6 border border-gray-700/50 shadow-xl backdrop-blur-sm hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${stat.color} flex items-center justify-center text-lg shadow-lg`}>
                {stat.icon}
              </div>
              <span className="text-sm text-green-400 font-semibold bg-green-400/10 px-3 py-1 rounded-full border border-green-400/20">{stat.change}</span>
            </div>
            <p className="text-3xl font-bold text-white mb-2">{stat.value}</p>
            <p className="text-base text-gray-300 font-medium">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-[rgba(20,20,35,0.8)] rounded-2xl p-8 border border-gray-700/50 shadow-xl backdrop-blur-sm">
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-xl font-bold text-white">Recent Activity</h4>
          <button className="text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium">
            View All Activity
          </button>
        </div>
        <div className="space-y-4">
          {(dashboardStats?.recentActivity || []).slice(0, 4).map((activity, index) => (
            <div key={index} className="flex items-center gap-4 p-4 rounded-xl bg-[rgba(15,15,25,0.7)] border border-gray-700/40 hover:bg-[rgba(25,25,35,0.7)] transition-all duration-200">
              <div className={`w-3 h-3 rounded-full shadow-lg ${
                activity.type === 'UPLOAD' ? 'bg-green-500 shadow-green-500/50' : 
                activity.type === 'DELETE' ? 'bg-red-500 shadow-red-500/50' : 'bg-blue-500 shadow-blue-500/50'
              }`}></div>
              <div className="flex-1">
                <p className="text-base text-white">
                  <span className="font-semibold">{activity.message}</span>
                </p>
                <p className="text-sm text-gray-400 mt-1">{formatTimeAgo(activity.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}