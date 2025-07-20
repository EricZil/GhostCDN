import React from 'react';

export const AdminAnalyticsTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-semibold text-white">Global Analytics</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[rgba(20,20,35,0.6)] rounded-xl p-6 border border-gray-800/40">
          <h4 className="text-lg font-semibold text-white mb-4">Platform Usage</h4>
          <div className="h-80 flex items-center justify-center">
            <p className="text-gray-400">Global analytics charts would be implemented here</p>
          </div>
        </div>
        <div className="bg-[rgba(20,20,35,0.6)] rounded-xl p-6 border border-gray-800/40">
          <h4 className="text-lg font-semibold text-white mb-4">Geographic Distribution</h4>
          <div className="h-80 flex items-center justify-center">
            <p className="text-gray-400">World map with usage statistics would be here</p>
          </div>
        </div>
      </div>
    </div>
  );
};