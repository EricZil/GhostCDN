"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { signIn } from 'next-auth/react';
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
                  
                  {/* Subtitle */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className="text-sm md:text-base text-cyan-300/80 font-medium tracking-[0.2em] mb-6 font-geist-mono"
                  >
                    SIMPLE CONTENT DELIVERY NETWORK
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
                    A simple and reliable content delivery network for your files. 
                    Upload, share, and manage your content with ease.
                  </p>
                  
                  {/* Actual Features */}
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700/50 backdrop-blur-sm">
                      <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                      <div>
                        <div className="text-white font-semibold">Social Authentication</div>
                        <div className="text-gray-400 text-sm">Sign in with Google or GitHub</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700/50 backdrop-blur-sm">
                      <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                      <div>
                        <div className="text-white font-semibold">File Management</div>
                        <div className="text-gray-400 text-sm">Upload and organize your content</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700/50 backdrop-blur-sm">
                      <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
                      <div>
                        <div className="text-white font-semibold">Analytics Dashboard</div>
                        <div className="text-gray-400 text-sm">Track your uploads and usage</div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Additional Benefits */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.7 }}
                  className="relative z-10 mt-8"
                >
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-4 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-xl border border-cyan-500/20">
                      <div className="text-2xl font-bold text-cyan-400 mb-1">Free</div>
                      <div className="text-xs text-gray-400">To Use</div>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20">
                      <div className="text-2xl font-bold text-purple-400 mb-1">Open</div>
                      <div className="text-xs text-gray-400">Source</div>
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
                <div className="mb-12 mt-8 text-center">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-2xl flex items-center justify-center border border-cyan-500/30"
                  >
                    <svg className="w-10 h-10 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </motion.div>
                  <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="text-4xl font-bold mb-4 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent"
                  >
                    Welcome to GhostCDN
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="text-gray-400 text-lg leading-relaxed max-w-md mx-auto"
                  >
                    Sign in with your preferred social account to access your dashboard and start managing your content.
                  </motion.p>
                </div>

                {/* Enhanced Social Login */}
                <div className="flex-1 flex flex-col justify-center">
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="space-y-6"
                  >
                    {/* Social Login Buttons */}
                    <div className="space-y-4">
                      <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => signIn('google', { redirect: false })}
                        className="group relative w-full inline-flex justify-center items-center py-5 px-8 border border-gray-600/50 rounded-2xl shadow-lg bg-gradient-to-r from-gray-800/80 to-gray-900/80 text-base font-medium text-gray-300 hover:text-white hover:border-cyan-400/50 transition-all duration-500 backdrop-blur-sm overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        <svg className="w-6 h-6 relative z-10 mr-4" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        <span className="relative z-10 text-lg">Continue with Google</span>
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => signIn('github', { redirect: false })}
                        className="group relative w-full inline-flex justify-center items-center py-5 px-8 border border-gray-600/50 rounded-2xl shadow-lg bg-gradient-to-r from-gray-800/80 to-gray-900/80 text-base font-medium text-gray-300 hover:text-white hover:border-purple-400/50 transition-all duration-500 backdrop-blur-sm overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        <svg className="w-6 h-6 relative z-10 mr-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                        <span className="relative z-10 text-lg">Continue with GitHub</span>
                      </motion.button>
                    </div>

                    {/* Additional Info */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.6, delay: 0.8 }}
                      className="text-center pt-6 border-t border-gray-700/50"
                    >
                      <p className="text-gray-500 text-sm leading-relaxed">
                        By signing in, you agree to our terms of service and privacy policy.
                        <br />
                        Your account will be created automatically if it doesn&apos;t exist.
                      </p>
                    </motion.div>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}