"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const { isAuthenticated } = useAuth();
  const { settings } = useSettings();

  // Close modal when user becomes authenticated
  useEffect(() => {
    if (isAuthenticated && isOpen) {
      // Small delay to show success animation
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  }, [isAuthenticated, isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div 
              className="bg-black/90 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-purple-500/20"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="border-b border-purple-500/20 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">
                    {activeTab === 'login' ? 'Welcome Back' : 'Create Account'}
                  </h2>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Tab Switcher */}
                <div className="flex space-x-1 mb-6 bg-purple-500/10 backdrop-blur-sm rounded-lg p-1 border border-purple-500/20">
                  <button
                    className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-all ${
                      activeTab === 'login'
                        ? 'bg-purple-500/30 text-white shadow-[0_0_10px_rgba(168,85,247,0.3)] border border-purple-400/30'
                        : 'text-gray-300 hover:text-white hover:bg-purple-500/10'
                    }`}
                    onClick={() => setActiveTab('login')}
                  >
                    Sign In
                  </button>
                  <button
                    className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-all relative ${
                      activeTab === 'register'
                        ? 'bg-purple-500/30 text-white shadow-[0_0_10px_rgba(168,85,247,0.3)] border border-purple-400/30'
                        : settings?.userRegistration === false
                        ? 'text-gray-500 cursor-not-allowed bg-gray-500/10'
                        : 'text-gray-300 hover:text-white hover:bg-purple-500/10'
                    }`}
                    onClick={() => settings?.userRegistration !== false && setActiveTab('register')}
                    disabled={settings?.userRegistration === false}
                  >
                    {settings?.userRegistration === false ? (
                      <div className="flex items-center justify-center gap-2">
                        <span>Sign Up</span>
                        <div className="w-4 h-4 bg-red-500/20 rounded-full flex items-center justify-center">
                          <span className="text-red-400 text-xs">✕</span>
                        </div>
                      </div>
                    ) : (
                      'Sign Up'
                    )}
                  </button>
                </div>

                {/* Form Content */}
                <AnimatePresence mode="wait">
                  {activeTab === 'login' ? (
                    <motion.div
                      key="login"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2 }}
                    >
                      <LoginForm />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="register"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="relative"
                    >
                      {settings?.userRegistration === false ? (
                        <div className="text-center py-8 px-4">
                          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                            <span className="text-red-400 text-2xl">🚫</span>
                          </div>
                          <h3 className="text-lg font-semibold text-white mb-2">Registration Disabled</h3>
                          <p className="text-gray-400 text-sm">
                            New user registration has been disabled by the administrator.
                          </p>
                        </div>
                      ) : (
                        <RegisterForm />
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Footer */}
                <div className="mt-6 text-center text-sm text-gray-400">
                  {activeTab === 'login' ? (
                    <>
                      Don&apos;t have an account?{' '}
                      <button
                        onClick={() => setActiveTab('register')}
                        className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
                      >
                        Sign up
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{' '}
                      <button
                        onClick={() => setActiveTab('login')}
                        className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
                      >
                        Sign in
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
} 