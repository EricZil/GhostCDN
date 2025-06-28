"use client";

import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';

interface MaintenanceModeProps {
  isActive: boolean;
}

export default function MaintenanceMode({ isActive }: MaintenanceModeProps) {
  const { user } = useAuth();
  const { refreshSettings } = useSettings();

  const handleDisableMaintenance = async () => {
    try {
      // Call admin API to disable maintenance mode
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          maintenanceMode: false
        })
      });

      if (response.ok) {
        // Refresh settings to update the UI
        await refreshSettings();
      }
    } catch {
      // Handle error silently
    }
  };

  // Don't show maintenance mode for admin users, but show a banner instead
  if (!isActive) {
    return null;
  }

  // Show admin banner if user is admin
  if (user && user.role === 'ADMIN') {
    return (
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className="fixed top-0 left-0 right-0 z-[9998] bg-gradient-to-r from-orange-600/90 via-red-600/90 to-orange-600/90 backdrop-blur-sm border-b border-orange-500/30"
      >
                 <div className="container mx-auto px-4 py-3">
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-3 text-white">
               <div className="w-5 h-5 rounded-full bg-orange-400 flex items-center justify-center">
                 <span className="text-orange-900 text-xs font-bold">!</span>
               </div>
               <span className="font-medium text-sm">
                 🔧 Maintenance Mode Active - Only admins can access the site
               </span>
               <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
             </div>
             
             <button
               onClick={handleDisableMaintenance}
               className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded-lg border border-white/30 transition-all duration-200 hover:scale-105"
             >
               Turn Off Maintenance
             </button>
           </div>
         </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center"
    >
      <div className="max-w-md mx-4 text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-gray-900/95 via-orange-900/20 to-gray-900/95 backdrop-blur-xl rounded-3xl border border-orange-500/30 shadow-2xl p-8"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-orange-500 via-red-500 to-orange-600 flex items-center justify-center text-3xl shadow-2xl">
            🔧
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-4">
            Maintenance Mode
          </h2>
          
          <p className="text-gray-300 mb-6 leading-relaxed">
            We&apos;re currently performing system maintenance to improve your experience. 
            Please check back in a few minutes.
          </p>
          
          <div className="flex items-center justify-center gap-2 text-orange-400">
            <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">System will be back online soon</span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
} 