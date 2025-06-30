"use client";

import { createContext, useContext, ReactNode, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  duration?: number;
}

interface NotificationContextType {
  showNotification: (notification: Omit<Notification, 'id'>) => void;
  hideNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const hideNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const showNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotification = { ...notification, id };
    
    setNotifications(prev => [...prev, newNotification]);
    
    // Auto-hide after duration (default 5 seconds)
    setTimeout(() => {
      hideNotification(id);
    }, notification.duration || 5000);
  }, [hideNotification]);

  return (
    <NotificationContext.Provider value={{ showNotification, hideNotification }}>
      {children}
      
      {/* Notification Container */}
      <div className="fixed top-4 left-4 right-4 sm:left-auto sm:top-4 sm:right-4 z-[9999] space-y-3 pointer-events-none sm:max-w-sm md:max-w-md lg:max-w-lg xl:top-6 xl:right-6 flex flex-col items-end">
        <AnimatePresence>
          {notifications.map((notification) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: 400, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 400, scale: 0.8 }}
              transition={{ type: "spring", damping: 25, stiffness: 400 }}
              className={`w-full sm:w-auto min-w-[280px] max-w-[380px] sm:min-w-[320px] sm:max-w-[420px] lg:max-w-[460px] rounded-xl shadow-2xl overflow-hidden border backdrop-blur-xl pointer-events-auto ${
                notification.type === 'success' 
                  ? 'bg-gradient-to-r from-green-900/95 to-emerald-900/95 border-green-500/40' 
                  : notification.type === 'error'
                  ? 'bg-gradient-to-r from-red-900/95 to-red-800/95 border-red-500/40'
                  : 'bg-gradient-to-r from-blue-900/95 to-indigo-900/95 border-blue-500/40'
              }`}
            >
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    {notification.type === 'success' && (
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    {notification.type === 'error' && (
                      <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                    )}
                    {notification.type === 'info' && (
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-sm font-semibold text-white leading-5 mb-1">
                      {notification.title}
                    </p>
                    <p className="text-sm text-gray-300 leading-5 break-words">
                      {notification.message}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <button
                      onClick={() => hideNotification(notification.id)}
                      className="inline-flex text-gray-400 hover:text-white transition-colors pointer-events-auto p-1 rounded-lg hover:bg-white/10"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
} 