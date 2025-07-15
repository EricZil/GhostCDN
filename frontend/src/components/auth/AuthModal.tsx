"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { PointerHighlight } from '@/components/PointerHighlight';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [isClosing, setIsClosing] = useState(false);
  const { isAuthenticated } = useAuth();
  const { settings } = useSettings();

  // Close modal when user becomes authenticated
  useEffect(() => {
    if (isAuthenticated && isOpen) {
      setIsClosing(true);
      // Small delay to show success animation
      setTimeout(() => {
        onClose();
        setIsClosing(false);
      }, 1500);
    }
  }, [isAuthenticated, isOpen, onClose]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Enhanced Backdrop with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed inset-0 bg-gradient-to-br from-black/80 via-gray-900/70 to-black/80 backdrop-blur-md z-50"
            onClick={handleClose}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ 
              opacity: isClosing ? 0 : 1, 
              scale: isClosing ? 0.95 : 1, 
              y: isClosing ? 10 : 0 
            }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ 
              type: "spring", 
              damping: 25, 
              stiffness: 400,
              duration: isClosing ? 0.2 : 0.4
            }}
            className="fixed inset-0 flex items-center justify-center z-50 p-6"
          >
            <div 
              className="relative bg-gray-900/95 backdrop-blur-2xl rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] w-full max-w-[80vw] h-[80vh] min-h-[750px] overflow-hidden border border-gray-700/50 flex"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Left Panel - Enterprise Branding */}
              <div className="flex-1 bg-gradient-to-br from-gray-900 via-gray-800 to-black p-12 flex flex-col justify-between relative overflow-hidden">
                {/* Enhanced Background Pattern */}
                <div className="absolute inset-0">
                  {/* Grid Pattern */}
                  <div className="absolute inset-0 opacity-20" style={{
                    backgroundImage: `linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)`,
                    backgroundSize: '50px 50px'
                  }} />
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5" />
                </div>
                
                {/* Animated Logo */}
                <div className="relative z-10">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="flex items-center justify-start mb-8"
                  >
                    <span className="text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 tracking-tight font-geist-mono whitespace-nowrap hover:scale-105 transition-transform duration-500">
                      GHOST&nbsp;
                    </span>
                    <PointerHighlight 
                      rectangleClassName="border-cyan-400/60 dark:border-cyan-400/60"
                      pointerClassName="text-cyan-400"
                      containerClassName="inline-block"
                    >
                      <span className="text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 tracking-tight font-geist-mono whitespace-nowrap">
                        CDN
                      </span>
                    </PointerHighlight>
                  </motion.div>
                  
                  {/* Enterprise Subtitle */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className="text-sm md:text-base text-cyan-300/80 font-medium tracking-[0.2em] mb-6 font-geist-mono"
                  >
                    ENTERPRISE CONTENT DELIVERY NETWORK
                  </motion.div>
                </div>

                {/* Enterprise Features */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                  className="relative z-10"
                >
                  <p className="text-gray-300 text-lg mb-8 leading-relaxed">
                    Join the next generation of content delivery with GhostCDN&apos;s enterprise platform. 
                    Experience lightning-fast global distribution, advanced analytics, and enterprise security.
                  </p>
                  
                  {/* Enterprise Stats */}
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700/50 backdrop-blur-sm">
                      <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                      <div>
                        <div className="text-white font-semibold">99.9% Uptime SLA</div>
                        <div className="text-gray-400 text-sm">Enterprise reliability guarantee</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700/50 backdrop-blur-sm">
                      <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                      <div>
                        <div className="text-white font-semibold">&lt;50ms Global Latency</div>
                        <div className="text-gray-400 text-sm">150+ edge locations worldwide</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700/50 backdrop-blur-sm">
                      <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
                      <div>
                        <div className="text-white font-semibold">Enterprise Security</div>
                        <div className="text-gray-400 text-sm">Advanced threat protection & compliance</div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Additional Enterprise Benefits */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.7 }}
                  className="relative z-10 mt-8"
                >
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-4 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-xl border border-cyan-500/20">
                      <div className="text-2xl font-bold text-cyan-400 mb-1">150+</div>
                      <div className="text-xs text-gray-400">Edge Locations</div>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20">
                      <div className="text-2xl font-bold text-purple-400 mb-1">24/7</div>
                      <div className="text-xs text-gray-400">Expert Support</div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Right Panel - Form */}
              <div className="flex-1 bg-gray-900/98 backdrop-blur-xl p-8 flex flex-col relative border-l border-gray-700/50">
                {/* Close Button */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleClose}
                  className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-lg"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.button>

                {/* Header */}
                <div className="mb-8 mt-4">
                  <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="text-3xl font-bold text-white mb-3"
                  >
                    {activeTab === 'login' ? 'Access Your GhostCDN Dashboard' : 'Join the GhostCDN Network'}
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="text-gray-400 text-base"
                  >
                    {activeTab === 'login' ? (
                      <>
                        Don&apos;t have an account? 
                        <button 
                          onClick={() => setActiveTab('register')}
                          className="text-cyan-400 hover:text-cyan-300 ml-1 underline font-medium transition-colors"
                        >
                          Create one now
                        </button>
                      </>
                    ) : (
                      <>
                        Already have an account? 
                        <button 
                          onClick={() => setActiveTab('login')}
                          className="text-cyan-400 hover:text-cyan-300 ml-1 underline font-medium transition-colors"
                        >
                          Sign in here
                        </button>
                      </>
                    )}
                  </motion.p>
                </div>

                {/* Enhanced Tab Switcher */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="flex gap-3 mb-8 p-2 bg-gray-800/50 rounded-xl border border-gray-700/50 backdrop-blur-sm"
                >
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex-1 py-4 px-6 rounded-lg text-base font-medium transition-all duration-300 ${
                      activeTab === 'login'
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                    }`}
                    onClick={() => setActiveTab('login')}
                  >
                    <div className="flex items-center justify-center gap-3">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Sign In
                    </div>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: settings?.userRegistration !== false ? 1.02 : 1 }}
                    whileTap={{ scale: settings?.userRegistration !== false ? 0.98 : 1 }}
                    className={`flex-1 py-4 px-6 rounded-lg text-base font-medium transition-all duration-300 ${
                      activeTab === 'register'
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
                        : settings?.userRegistration === false
                        ? 'text-gray-500 cursor-not-allowed'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                    }`}
                    onClick={() => settings?.userRegistration !== false && setActiveTab('register')}
                    disabled={settings?.userRegistration === false}
                  >
                    <div className="flex items-center justify-center gap-3">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      Sign Up
                    </div>
                  </motion.button>
                </motion.div>

                {/* Form Content */}
                <div className="flex-1 flex flex-col justify-center">
                  <AnimatePresence mode="wait">
                    {activeTab === 'login' ? (
                      <motion.div
                        key="login"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                      >
                        <LoginForm />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="register"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2 }}
                      >
                        {settings?.userRegistration === false ? (
                          <div className="text-center py-8">
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
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}