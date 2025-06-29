'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

interface BanInfo {
  banType: string;
  reason: string;
  bannedAt: string;
}

interface BanNotificationModalProps {
  isOpen: boolean;
  banInfo: BanInfo;
  onClose: () => void;
}

export default function BanNotificationModal({ isOpen, banInfo, onClose }: BanNotificationModalProps) {
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      onClose();
    } catch {
      // Logout error handled silently
      // Force logout even if there's an error
      window.location.reload();
    }
  };

  const formatBanType = (banType: string) => {
    switch (banType) {
      case 'ACCOUNT': return 'Account Ban';
      case 'EMAIL': return 'Email Ban';
      case 'IP': return 'IP Address Ban';
      case 'FULL': return 'Complete Ban';
      default: return 'Account Ban';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-gradient-to-br from-gray-900/95 via-red-900/30 to-gray-900/95 backdrop-blur-xl rounded-2xl border border-red-500/30 shadow-2xl max-w-md w-full overflow-hidden"
          >
            {/* Header */}
            <div className="bg-red-500/10 border-b border-red-500/20 p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Account Suspended</h3>
                  <p className="text-red-400 text-sm">{formatBanType(banInfo.banType)}</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
                <h4 className="text-red-400 font-semibold mb-2">Your account has been suspended</h4>
                <p className="text-gray-300 text-sm leading-relaxed">
                  You can no longer access this service. If you believe this is a mistake, please contact our support team.
                </p>
              </div>

              {banInfo.reason && (
                <div className="space-y-2">
                  <h5 className="text-gray-400 font-medium">Reason:</h5>
                  <p className="text-white bg-black/30 rounded-lg p-3 border border-gray-700/50">
                    {banInfo.reason}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <h5 className="text-gray-400 font-medium">Suspended on:</h5>
                <p className="text-gray-300">{formatDate(banInfo.bannedAt)}</p>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-yellow-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-yellow-400 font-medium text-sm">Need Help?</p>
                    <p className="text-gray-300 text-sm">
                      Contact our support team if you have questions about this suspension.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-900/50 border-t border-gray-700/50 p-6">
              <button
                onClick={handleLogout}
                className="w-full px-4 py-3 bg-red-500/80 hover:bg-red-500 text-white rounded-lg border border-red-500/50 transition-all duration-200 font-medium shadow-lg hover:shadow-red-500/25"
              >
                Sign Out
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 