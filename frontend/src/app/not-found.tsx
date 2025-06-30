"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { PointerHighlight } from '@/components/PointerHighlight';

export default function NotFound() {
  return (
    <div className="min-h-screen text-white relative select-none">
      {/* Main page background - same as homepage */}
      <div className="fixed inset-0 z-0">
        {/* Grid background */}
        <div className="grid-background"></div>
        
        {/* Darker gradient overlay */}
        <div className="dark-gradient-bg"></div>
        
        {/* Main content - centered logo (same as main page) */}
        <div className="container mx-auto px-4 flex flex-col items-center justify-center min-h-screen py-16 relative z-10">
          <h1 className="text-center transition-all duration-700 opacity-100 translate-y-0 mb-8 flex items-center justify-center">
            <span className="text-7xl md:text-8xl lg:text-9xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-500 to-blue-600 tracking-tight font-geist-mono whitespace-nowrap">
              GHOST&nbsp;
            </span>
            <PointerHighlight 
              rectangleClassName="border-blue-500/50 dark:border-blue-500/50"
              pointerClassName="text-blue-500"
              containerClassName="inline-block"
            >
              <span className="text-7xl md:text-8xl lg:text-9xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-500 to-blue-600 tracking-tight font-geist-mono whitespace-nowrap">
                CDN
              </span>
            </PointerHighlight>
          </h1>
          
          <div className="transition-all duration-700 delay-300 opacity-100 translate-y-0">
            <p className="ghost-tagline text-center max-w-3xl text-2xl md:text-3xl lg:text-4xl font-medium text-white/90 mb-8 font-geist-mono">
              One upload. Global delivery.
            </p>
          </div>
        </div>
      </div>
      
      {/* Subtle blur overlay for modal effect */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.5, type: "spring", stiffness: 300, damping: 30 }}
          className="bg-gray-900/90 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-8 shadow-2xl max-w-md w-full text-center relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with improved styling */}
          <div className="mb-8">
            <div className="flex items-center justify-center mb-3">
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mr-3">
                <span className="text-2xl">👻</span>
              </div>
              <h1 className="text-2xl font-bold text-white">GhostCDN</h1>
            </div>
            <h2 className="text-lg font-medium text-gray-300">Page Not Found</h2>
          </div>
          
          {/* 404 Icon */}
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/30"
          >
            <span className="text-3xl font-bold text-red-400">404</span>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <p className="text-lg mb-4 text-red-400">
              This page could not be found.
            </p>
            
            <motion.p 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-sm text-gray-400"
            >
              The page you&apos;re looking for doesn&apos;t exist or has been moved.
            </motion.p>
          </motion.div>
          
          <div className="space-y-3">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Link
                href="/"
                className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-all duration-200 flex items-center justify-center group"
              >
                <svg className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Return to Homepage
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 