import React from 'react';

interface SystemLog {
  time: string;
  level: string;
  message: string;
  user: string;
}

interface AdminLogsTabProps {
  systemLogs: SystemLog[];
  adminLoading: boolean;
}

export const AdminLogsTab: React.FC<AdminLogsTabProps> = ({
  systemLogs,
  adminLoading
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-semibold text-white">System Logs</h3>
        <div className="flex gap-2">
          <select className="px-3 py-2 bg-black/50 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
            <option>All Levels</option>
            <option>Error</option>
            <option>Warning</option>
            <option>Info</option>
          </select>
          <button className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30 hover:bg-blue-500/30 transition-colors">
            Export Logs
          </button>
        </div>
      </div>
      
      <div className="bg-[rgba(20,20,35,0.6)] rounded-xl border border-gray-800/40 overflow-hidden">
        <div className="p-4 border-b border-gray-800/40">
          <h4 className="text-lg font-semibold text-white">Recent System Events</h4>
        </div>
        <div className="max-h-96 overflow-y-auto font-mono text-sm">
          {systemLogs.length > 0 ? systemLogs.map((log, index) => (
            <div key={index} className="p-3 border-b border-gray-800/20 hover:bg-[rgba(30,30,45,0.3)] transition-colors">
              <div className="flex items-center gap-4">
                <span className="text-gray-500 text-xs">{log.time}</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  log.level === 'ERROR' ? 'bg-red-500/20 text-red-400' :
                  log.level === 'WARN' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-green-500/20 text-green-400'
                }`}>
                  {log.level}
                </span>
                <span className="text-white flex-1">{log.message}</span>
                <span className="text-gray-400 text-xs">{log.user}</span>
              </div>
            </div>
          )) : (
            <div className="p-8 text-center text-gray-400">
              {adminLoading ? 'Loading system logs...' : 'No system logs available.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};