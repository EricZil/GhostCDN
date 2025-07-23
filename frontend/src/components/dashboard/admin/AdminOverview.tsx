"use client";

interface AdminActivity {
  action: string;
  details: string;
  severity: 'high' | 'medium' | 'low';
  time: string | number;
}

interface SystemHealth {
  status: string;
  uptime: string;
}

interface AdminStats {
  totalUsers: number;
  usersToday: number;
  totalFiles: number;
  filesThisWeek: number;
  totalStorage: number;
  systemHealth?: Record<string, SystemHealth>;
  recentActivity?: AdminActivity[];
}

interface AdminOverviewProps {
  adminStats: AdminStats | null;
  adminLoading: boolean;
  adminFormatFileSize: (bytes: number) => string;
  adminFormatTimeAgo: (time: string) => string;
}

const isAdminActivity = (activity: unknown): activity is AdminActivity => {
  return typeof activity === 'object' && activity !== null && 
    'action' in activity && 'details' in activity;
};

const isSystemHealth = (service: unknown): service is SystemHealth => {
  return typeof service === 'object' && service !== null && 
    'status' in service && 'uptime' in service;
};

export default function AdminOverview({ 
  adminStats, 
  adminLoading, 
  adminFormatFileSize, 
  adminFormatTimeAgo 
}: AdminOverviewProps) {
  return (
    <div className="space-y-8">
      {/* Admin Welcome Section */}
      <div className="bg-gradient-to-br from-red-500/15 via-orange-500/15 to-red-500/15 rounded-3xl p-8 border border-red-500/30 shadow-2xl backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500 via-orange-500 to-red-600 flex items-center justify-center text-3xl shadow-2xl">
              🛡️
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">
                System Administration
              </h3>
              <p className="text-lg text-gray-300">
                Monitor and manage the entire GHOST CDN platform
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">System Status</p>
            <div className="text-green-400 font-medium flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              All Systems Operational
            </div>
          </div>
        </div>
      </div>

      {/* System Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {(adminStats ? [
          { 
            label: 'Total Users', 
            value: adminStats.totalUsers.toLocaleString(), 
            change: `+${adminStats.usersToday} today`, 
            icon: '👥', 
            color: 'from-blue-500 to-cyan-500' 
          },
          { 
            label: 'Total Files', 
            value: adminStats.totalFiles.toLocaleString(), 
            change: `+${adminStats.filesThisWeek} this week`, 
            icon: '📁', 
            color: 'from-green-500 to-emerald-500' 
          },
          { 
            label: 'Storage Used', 
            value: adminFormatFileSize(adminStats.totalStorage), 
            change: 'Active', 
            icon: '💾', 
            color: 'from-purple-500 to-pink-500' 
          },
        ] : [
          { label: 'Total Users', value: '...', change: '...', icon: '👥', color: 'from-blue-500 to-cyan-500' },
          { label: 'Total Files', value: '...', change: '...', icon: '📁', color: 'from-green-500 to-emerald-500' },
          { label: 'Storage Used', value: '...', change: '...', icon: '💾', color: 'from-purple-500 to-pink-500' },
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

      {/* System Health & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Health */}
        <div className="bg-[rgba(20,20,35,0.8)] rounded-2xl p-6 border border-gray-700/50 shadow-xl backdrop-blur-sm">
          <h4 className="text-xl font-bold text-white mb-6">System Health</h4>
          <div className="space-y-4">
            {adminStats?.systemHealth ? Object.entries(adminStats.systemHealth).map(([key, service]) => {
              if (!isSystemHealth(service)) return null;
              const healthData = {
                service: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
                status: service.status,
                uptime: service.uptime,
                color: service.status === 'healthy' ? 'text-green-400' : 'text-yellow-400'
              };
              return healthData;
            }).filter(Boolean).map((service, index) => {
              if (!service) return null;
              return (
              <div key={index} className="flex items-center justify-between p-4 rounded-xl bg-[rgba(15,15,25,0.7)] border border-gray-700/40">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${service.status === 'healthy' ? 'bg-green-500' : 'bg-yellow-500'} shadow-lg`}></div>
                  <span className="text-white font-medium">{service.service}</span>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${service.color}`}>{service.status.toUpperCase()}</p>
                  <p className="text-xs text-gray-400">{service.uptime} uptime</p>
                </div>
              </div>
              );
            }) : (
              <div className="p-8 text-center text-gray-400">
                {adminLoading ? 'Loading system health...' : 'System health data unavailable.'}
              </div>
            )}
          </div>
        </div>

        {/* Recent Admin Activity */}
        <div className="bg-[rgba(20,20,35,0.8)] rounded-2xl p-6 border border-gray-700/50 shadow-xl backdrop-blur-sm">
          <h4 className="text-xl font-bold text-white mb-6">Recent Admin Activity</h4>
          <div className="space-y-4">
            {adminStats?.recentActivity && adminStats.recentActivity.length > 0 ? adminStats.recentActivity.slice(0, 4).map((activity: unknown, index: number) => {
              if (!isAdminActivity(activity)) return null;
              return (
              <div key={index} className="flex items-center gap-4 p-4 rounded-xl bg-[rgba(15,15,25,0.7)] border border-gray-700/40">
                <div className={`w-3 h-3 rounded-full ${
                  activity.severity === 'high' ? 'bg-red-500' : 
                  activity.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                } shadow-lg`}></div>
                <div className="flex-1">
                  <p className="text-white font-medium">{activity.action}</p>
                  <p className="text-sm text-gray-400">{activity.details}</p>
                </div>
                <p className="text-xs text-gray-500">{typeof activity.time === 'string' ? activity.time : adminFormatTimeAgo(activity.time.toString())}</p>
              </div>
              );
            }).filter(Boolean) : (
              <div className="p-8 text-center text-gray-400">
                {adminLoading ? 'Loading activity...' : 'No recent admin activity.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}