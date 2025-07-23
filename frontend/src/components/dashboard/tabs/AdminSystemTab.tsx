import React from 'react';

interface SystemMessage {
  id: string;
  title: string;
  type: string;
  createdAt: string;
  isActive: boolean;
}

interface AdminSystemTabProps {
  systemSettings: Record<string, unknown> | null;
  systemMessages: unknown[];
  settingsChanged: boolean;
  setSystemSettings: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
  setSettingsChanged: React.Dispatch<React.SetStateAction<boolean>>;
  setShowMessageModal: React.Dispatch<React.SetStateAction<boolean>>;
  updateSystemSettings: (settings: Record<string, unknown>) => Promise<void>;
  refreshSettings: () => Promise<void>;
  showNotification: (notification: { type: string; title: string; message: string; duration?: number }) => void;
  toggleMessageStatus: (id: string, isActive: boolean) => void;
  deleteMessage: (id: string) => void;
  isSystemMessage: (message: unknown) => message is SystemMessage;
  manualCleanup: {
    mutate: () => void;
    isPending: boolean;
  };
}

export const AdminSystemTab: React.FC<AdminSystemTabProps> = ({
  systemSettings,
  systemMessages,
  settingsChanged,
  setSystemSettings,
  setSettingsChanged,
  setShowMessageModal,
  updateSystemSettings,
  refreshSettings,
  showNotification,
  toggleMessageStatus,
  deleteMessage,
  isSystemMessage,
  manualCleanup
}) => {
  const handleSettingToggle = (key: string, value: boolean) => {
    setSystemSettings((prev: Record<string, unknown>) => ({ ...prev, [key]: value }));
    setSettingsChanged(true);
  };

  const handleSettingChange = (key: string, value: string | number) => {
    setSystemSettings((prev: Record<string, unknown>) => ({ ...prev, [key]: value }));
    setSettingsChanged(true);
  };

  const saveSettings = async () => {
    try {
      await updateSystemSettings(systemSettings || {});
      setSettingsChanged(false);
      
      // Refresh public settings context
      await refreshSettings();
      
      showNotification({
        type: 'success',
        title: 'Settings Updated',
        message: 'System settings have been saved successfully',
        duration: 4000
      });
    } catch {
      // Error handling would be done in the parent component
    }
  };

  const handleManualCleanup = () => {
    manualCleanup.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-semibold text-white">System Settings</h3>
        {settingsChanged && (
          <button
            onClick={saveSettings}
            className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg border border-green-500/30 hover:bg-green-500/30 transition-colors"
          >
            Save Changes
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[rgba(20,20,35,0.6)] rounded-xl p-6 border border-gray-800/40">
          <h4 className="text-lg font-semibold text-white mb-4">Platform Configuration</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-[rgba(15,15,25,0.5)] rounded-lg border border-gray-800/30">
              <div>
                <p className="text-white font-medium">User Registration</p>
                <p className="text-sm text-gray-400">Allow new user signups</p>
              </div>
              <button
                onClick={() => handleSettingToggle('userRegistration', !systemSettings?.userRegistration)}
                className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${
                  systemSettings?.userRegistration ? 'bg-blue-500' : 'bg-gray-600'
                }`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                  systemSettings?.userRegistration ? 'ml-auto' : ''
                }`}></div>
              </button>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-[rgba(15,15,25,0.5)] rounded-lg border border-gray-800/30">
              <div>
                <p className="text-white font-medium">Maintenance Mode</p>
                <p className="text-sm text-gray-400">Temporarily disable the platform</p>
              </div>
              <button
                onClick={() => handleSettingToggle('maintenanceMode', !systemSettings?.maintenanceMode)}
                className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${
                  systemSettings?.maintenanceMode ? 'bg-red-500' : 'bg-gray-600'
                }`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                  systemSettings?.maintenanceMode ? 'ml-auto' : ''
                }`}></div>
              </button>
            </div>
          </div>
        </div>
        
        <div className="bg-[rgba(20,20,35,0.6)] rounded-xl p-6 border border-gray-800/40">
          <h4 className="text-lg font-semibold text-white mb-4">Storage Limits</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-2">Guest Upload Limit (MB)</label>
              <input 
                type="number" 
                value={(systemSettings?.guestUploadLimit as number) || 10}
                onChange={(e) => handleSettingChange('guestUploadLimit', parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-black/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" 
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-2">User Storage Limit (GB)</label>
              <input 
                type="number" 
                value={(systemSettings?.userStorageLimit as number) || 10}
                onChange={(e) => handleSettingChange('userStorageLimit', parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-black/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" 
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-2">Max File Size (MB)</label>
              <input 
                type="number" 
                value={(systemSettings?.maxFileSize as number) || 100}
                onChange={(e) => handleSettingChange('maxFileSize', parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-black/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" 
              />
            </div>
          </div>
        </div>
      </div>

      {/* System Maintenance Section */}
      <div className="bg-[rgba(20,20,35,0.6)] rounded-xl p-6 border border-gray-800/40">
        <h4 className="text-lg font-semibold text-white mb-4">System Maintenance</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-[rgba(15,15,25,0.5)] rounded-lg border border-gray-800/30">
            <div>
              <p className="text-white font-medium">Manual Cleanup</p>
              <p className="text-sm text-gray-400">Remove expired guest uploads and free up storage space</p>
            </div>
            <button
              onClick={handleManualCleanup}
              disabled={manualCleanup.isPending}
              className="px-4 py-2 bg-orange-500/20 text-orange-400 rounded-lg border border-orange-500/30 hover:bg-orange-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {manualCleanup.isPending ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Running...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Run Cleanup
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* System Messages Section */}
      <div className="bg-[rgba(20,20,35,0.6)] rounded-xl p-6 border border-gray-800/40">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-lg font-semibold text-white">System Messages</h4>
            <p className="text-sm text-gray-400">Manage announcements displayed on the main page</p>
          </div>
          <button
            onClick={() => setShowMessageModal(true)}
            className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30 hover:bg-blue-500/30 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Message
          </button>
        </div>
        
        <div className="space-y-3 max-h-48 overflow-y-auto">
          {systemMessages.length > 0 ? systemMessages.map((message: unknown) => {
            if (!isSystemMessage(message)) return null;
            return (
            <div key={message.id} className="flex items-center justify-between p-3 bg-[rgba(15,15,25,0.5)] rounded-lg border border-gray-800/30">
              <div className="flex items-center gap-3 flex-1">
                <div className={`w-3 h-3 rounded-full ${
                  message.type === 'CRITICAL' ? 'bg-red-500' :
                  message.type === 'WARNING' ? 'bg-yellow-500' : 'bg-blue-500'
                }`}></div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{message.title}</p>
                  <p className="text-xs text-gray-400">{message.type} • {new Date(message.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleMessageStatus(message.id, !message.isActive)}
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    message.isActive 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-gray-500/20 text-gray-400'
                  }`}
                >
                  {message.isActive ? 'Active' : 'Inactive'}
                </button>
                <button
                  onClick={() => deleteMessage(message.id)}
                  className="p-1 text-red-400 hover:text-red-300 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
            );
          }).filter(Boolean) : (
            <div className="text-center py-8 text-gray-400">
              No system messages created yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};