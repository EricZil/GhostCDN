import React from 'react';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  uploads: number;
  storageUsed?: number;
  role: string;
  status: string;
}

interface AdminUsersTabProps {
  adminUsers: unknown[];
  adminLoading: boolean;
  adminFormatFileSize: (bytes: number) => string;
  openUserProfile: (userId: string) => void;
  isAdminUser: (user: unknown) => user is AdminUser;
}

export const AdminUsersTab: React.FC<AdminUsersTabProps> = ({
  adminUsers,
  adminLoading,
  adminFormatFileSize,
  openUserProfile,
  isAdminUser
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-semibold text-white">User Management</h3>
        <button className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30 hover:bg-blue-500/30 transition-colors">
          + Add User
        </button>
      </div>
      
      <div className="bg-[rgba(20,20,35,0.6)] rounded-xl border border-gray-800/40 overflow-hidden">
        <div className="p-4 border-b border-gray-800/40">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold text-white">All Users</h4>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Search users..." 
                className="px-3 py-2 bg-black/50 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <select className="px-3 py-2 bg-black/50 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option>All Roles</option>
                <option>Admin</option>
                <option>User</option>
              </select>
            </div>
          </div>
        </div>
        <div className="divide-y divide-gray-800/40">
          {adminUsers.length > 0 ? adminUsers.map((user: unknown, index: number) => {
            if (!isAdminUser(user)) return null;
            return (
            <div key={index} className="p-4 hover:bg-[rgba(30,30,45,0.3)] transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <span className="text-sm font-bold text-white">{user.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">{user.name}</p>
                    <p className="text-sm text-gray-400">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-sm text-white">{user.uploads}</p>
                    <p className="text-xs text-gray-400">Uploads</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-white">{adminFormatFileSize(user.storageUsed || 0)}</p>
                    <p className="text-xs text-gray-400">Storage</p>
                  </div>
                  <div className="text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.role === 'ADMIN' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {user.role}
                    </span>
                  </div>
                  <div className="text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {user.status}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => openUserProfile(user.id)}
                      className="px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors text-sm font-medium flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Manage
                    </button>
                  </div>
                </div>
              </div>
            </div>
            );
          }).filter(Boolean) : (
            <p className="p-8 text-center text-gray-400">
              {adminLoading ? 'Loading users...' : 'No users found.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};