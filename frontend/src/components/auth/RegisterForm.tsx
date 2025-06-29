"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { signIn } from 'next-auth/react';

export default function RegisterForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const { register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      return;
    }

    setIsLoading(true);
    
    try {
      await register(name, email, password);
      setIsSuccess(true);
    } catch {
      setError('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const passwordsMatch = password === confirmPassword || confirmPassword === '';

  const handleResendVerification = async () => {
    setIsResendingVerification(true);
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error('Failed to resend verification email');
      }
    } catch {
      // Error handled silently
    } finally {
      setIsResendingVerification(false);
    }
  };

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {isSuccess ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex flex-col items-center justify-center py-12"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-4"
            >
              <svg
                className="w-10 h-10 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <motion.path
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </motion.div>
            <motion.h3
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-xl font-semibold text-white mb-2"
            >
              Account Created Successfully!
            </motion.h3>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-gray-300 text-center mb-4"
            >
              Please check your email to verify your account before signing in.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4"
            >
              <div className="flex items-center text-blue-400 text-sm">
                <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                                 <span>We&apos;ve sent a verification email to <strong>{email}</strong></span>
               </div>
             </motion.div>
             <motion.div
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.6 }}
               className="flex flex-col gap-3 mt-6"
             >
               <button
                 onClick={handleResendVerification}
                 disabled={isResendingVerification}
                 className="w-full py-2 px-4 border border-gray-600 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
               >
                 {isResendingVerification ? 'Resending...' : 'Resend Verification Email'}
               </button>
               <button
                 onClick={() => setIsSuccess(false)}
                 className="w-full py-2 px-4 text-sm font-medium text-purple-400 hover:text-purple-300 transition-all duration-200"
               >
                 ← Back to Sign In
               </button>
             </motion.div>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-400 text-sm py-2 px-3 bg-red-500/10 border border-red-500/20 rounded-lg"
              >
                {error}
              </motion.div>
            )}
            
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
                Your Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading}
                className="w-full px-4 py-3 bg-black/50 border border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Enter your name"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="w-full px-4 py-3 bg-black/50 border border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="w-full px-4 py-3 bg-black/50 border border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                className={`w-full px-4 py-3 bg-black/50 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent text-white placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                  passwordsMatch
                    ? 'border-gray-800 focus:ring-purple-500'
                    : 'border-red-500/50 focus:ring-red-500'
                }`}
                placeholder="••••••••"
              />
              {!passwordsMatch && confirmPassword && (
                <p className="mt-1 text-sm text-red-400">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !passwordsMatch}
              className="relative w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <AnimatePresence mode="wait">
                {isLoading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center"
                  >
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Creating your account...
                  </motion.div>
                ) : (
                  <motion.span
                    key="text"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    Create Account
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-800" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-black text-gray-400">Or continue with</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => signIn('google', { callbackUrl: '/' })}
                  disabled={isLoading}
                  className="w-full inline-flex justify-center py-2 px-4 border border-gray-800 rounded-lg shadow-sm bg-black/50 text-sm font-medium text-gray-300 hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.66 15.63 16.88 16.79 15.71 17.57V20.34H19.28C21.36 18.42 22.56 15.6 22.56 12.25Z" fill="#4285F4"/>
                    <path d="M12 23C14.97 23 17.46 22 19.28 20.34L15.71 17.57C14.73 18.23 13.48 18.63 12 18.63C9.13 18.63 6.72 16.74 5.82 14.15H2.14V17.01C3.94 20.57 7.65 23 12 23Z" fill="#34A853"/>
                    <path d="M5.82 14.15C5.6 13.52 5.48 12.84 5.48 12.15C5.48 11.46 5.6 10.78 5.82 10.15V7.29H2.14C1.41 8.7 1 10.37 1 12.15C1 13.93 1.41 15.6 2.14 17.01L5.82 14.15Z" fill="#FBBC05"/>
                    <path d="M12 5.67C13.62 5.67 15.06 6.22 16.19 7.29L19.36 4.12C17.46 2.39 14.97 1.33 12 1.33C7.65 1.33 3.94 3.76 2.14 7.32L5.82 10.18C6.72 7.59 9.13 5.67 12 5.67Z" fill="#EA4335"/>
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={() => signIn('github', { callbackUrl: '/' })}
                  disabled={isLoading}
                  className="w-full inline-flex justify-center py-2 px-4 border border-gray-800 rounded-lg shadow-sm bg-black/50 text-sm font-medium text-gray-300 hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 0C5.373 0 0 5.373 0 12C0 17.303 3.438 21.8 8.205 23.385C8.805 23.498 9.025 23.127 9.025 22.81C9.025 22.523 9.015 21.768 9.01 20.768C5.672 21.492 4.968 19.158 4.968 19.158C4.422 17.773 3.633 17.403 3.633 17.403C2.546 16.659 3.717 16.675 3.717 16.675C4.922 16.759 5.555 17.912 5.555 17.912C6.625 19.746 8.364 19.216 9.05 18.909C9.158 18.132 9.467 17.603 9.81 17.303C7.145 17 4.343 15.971 4.343 11.374C4.343 10.063 4.812 8.993 5.579 8.153C5.455 7.85 5.044 6.629 5.696 4.977C5.696 4.977 6.704 4.655 8.997 6.207C9.954 5.941 10.98 5.808 12 5.803C13.02 5.808 14.047 5.941 15.006 6.207C17.297 4.655 18.303 4.977 18.303 4.977C18.956 6.63 18.545 7.851 18.421 8.153C19.191 8.993 19.656 10.064 19.656 11.374C19.656 15.983 16.849 16.998 14.177 17.295C14.607 17.667 15 18.397 15 19.517C15 21.12 14.985 22.41 14.985 22.81C14.985 23.129 15.204 23.504 15.815 23.385C20.565 21.797 24 17.3 24 12C24 5.373 18.627 0 12 0Z" fill="currentColor"/>
                  </svg>
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
} 