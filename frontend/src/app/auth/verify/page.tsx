"use client";

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { PointerHighlight } from '@/components/PointerHighlight';

function VerifyEmailContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Invalid verification link. Please check your email for the correct link.');
        return;
      }

      try {
        const response = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setStatus('success');
          setMessage(data.message || 'Email verified successfully!');
          // Redirect to login after 3 seconds
          setTimeout(() => {
            router.push('/?verified=true');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(data.error || 'Email verification failed. Please try again.');
        }
      } catch {
        setStatus('error');
        setMessage('Something went wrong. Please try again later.');
      }
    };

    verifyEmail();
  }, [token, router]);

  const getIcon = () => {
    switch (status) {
      case 'loading':
        return (
          <motion.div 
            className="w-20 h-20 mx-auto mb-6"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <div className="w-full h-full border-4 border-purple-500/30 border-t-purple-500 rounded-full"></div>
          </motion.div>
        );
      case 'success':
        return (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/30"
          >
            <motion.svg 
              className="w-10 h-10 text-green-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <motion.path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M5 13l4 4L19 7" 
              />
            </motion.svg>
          </motion.div>
        );
      case 'error':
        return (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/30"
          >
            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </motion.div>
        );
    }
  };

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
          <h2 className="text-lg font-medium text-gray-300">Email Verification</h2>
        </div>
        
        {getIcon()}
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <p className={`text-lg mb-4 ${
            status === 'success' ? 'text-green-400' : 
            status === 'error' ? 'text-red-400' : 
            'text-gray-300'
          }`}>
            {message || 'Verifying your email address...'}
          </p>
          
          {status === 'success' && (
            <motion.p 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-sm text-gray-400"
            >
              Redirecting you to the homepage in a few seconds...
            </motion.p>
          )}
        </motion.div>
        
        <div className="space-y-3">
          {status === 'error' && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              onClick={() => router.push('/')}
              className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-all duration-200 flex items-center justify-center group"
            >
              <svg className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Return to Homepage
            </motion.button>
          )}
          
          {status === 'success' && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              onClick={() => router.push('/')}
              className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-all duration-200 flex items-center justify-center group"
            >
              Continue to GhostCDN
              <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </motion.button>
          )}
        </div>
        </motion.div>
      </div>
    </div>
  );
}

function LoadingFallback() {
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
            <h2 className="text-lg font-medium text-gray-300">Email Verification</h2>
          </div>
          
          <motion.div 
            className="w-20 h-20 mx-auto mb-6"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <div className="w-full h-full border-4 border-purple-500/30 border-t-purple-500 rounded-full"></div>
          </motion.div>
          
          <div className="mb-6">
            <p className="text-lg mb-4 text-gray-300">
              Loading verification...
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <VerifyEmailContent />
    </Suspense>
  );
} 