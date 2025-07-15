"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { signIn } from 'next-auth/react';
import EmailVerificationModal from './EmailVerificationModal';
import ForgotPasswordModal from './ForgotPasswordModal';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const { login, isLoading } = useAuth();
  const [localError, setLocalError] = useState('');
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [isBanned, setIsBanned] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setShowVerificationModal(false);
    setIsBanned(false);
    
    try {
      await login(email, password);
      // Success is handled by the AuthContext which updates the session
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('verify your email')) {
        setShowVerificationModal(true);
      } else if (errorMessage.includes('Account Banned')) {
        setIsBanned(true);
        setLocalError('Your account has been suspended. Please contact support for assistance.');
      } else {
        setLocalError('Login failed. Please check your credentials and try again.');
      }
    }
  };

  const handleGoogleLogin = async () => {
    setLocalError('');
    setIsBanned(false);
    try {
      await signIn('google', { redirect: false });
    } catch {
      setLocalError('Google login failed. Please try again.');
    }
  };

  const handleGitHubLogin = async () => {
    setLocalError('');
    setIsBanned(false);
    try {
      await signIn('github', { redirect: false });
    } catch {
      setLocalError('GitHub login failed. Please try again.');
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-3">
          <label htmlFor="email" className="block text-sm font-semibold text-cyan-300 mb-2">
            Email Address
          </label>
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="relative w-full px-5 py-4 bg-gradient-to-r from-gray-900/90 to-black/90 border border-cyan-500/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all duration-300 backdrop-blur-sm"
              placeholder="Enter your email"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-4">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
              </svg>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <label htmlFor="password" className="block text-sm font-semibold text-cyan-300 mb-2">
            Password
          </label>
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="relative w-full px-5 py-4 bg-gradient-to-r from-gray-900/90 to-black/90 border border-cyan-500/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all duration-300 backdrop-blur-sm"
              placeholder="Enter your secure password"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-4">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between py-4">
          <div className="flex items-center group">
            <div className="relative">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-5 w-5 text-cyan-500 focus:ring-cyan-400/50 border-cyan-500/30 rounded-md bg-gray-900/50 backdrop-blur-sm transition-all duration-200"
              />
              {rememberMe && (
                <div className="absolute inset-0 bg-cyan-400/20 rounded-md animate-pulse" />
              )}
            </div>
            <label htmlFor="remember-me" className="ml-3 block text-sm text-gray-300 group-hover:text-cyan-300 transition-colors cursor-pointer">
              Keep me signed in
            </label>
          </div>

          <div className="text-sm">
            <button 
              type="button"
              onClick={() => setShowForgotPasswordModal(true)}
              className="group relative font-medium text-cyan-400 hover:text-cyan-300 transition-all duration-200 px-2 py-1 rounded-lg hover:bg-cyan-500/10"
            >
              <span className="relative z-10">Forgot password?</span>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </button>
          </div>
        </div>

        {localError && (
          <div className={`p-4 rounded-lg border ${
            isBanned 
              ? 'bg-red-500/10 border-red-500/30 text-red-400' 
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isBanned ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                )}
              </svg>
              <span className="text-sm font-medium">
                {isBanned ? 'Account Suspended' : 'Login Failed'}
              </span>
            </div>
            <p className="text-sm mt-1">{localError}</p>
            {isBanned && (
              <p className="text-xs mt-2 text-gray-400">
                If you believe this is a mistake, please contact our support team.
              </p>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="group relative w-full flex justify-center py-4 px-6 border border-transparent rounded-xl shadow-lg text-base font-semibold text-white bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 hover:from-cyan-400 hover:via-blue-400 hover:to-purple-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-400/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/50 via-blue-600/50 to-purple-600/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          {isLoading ? (
            <div className="flex items-center relative z-10">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
              <span>Signing in...</span>
            </div>
          ) : (
            <div className="flex items-center relative z-10">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Sign In to GhostCDN</span>
            </div>
          )}
        </button>

        <div className="mt-10">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-6 bg-gradient-to-r from-gray-900 via-black to-gray-900 text-gray-400 font-medium">
                Or continue with social login
              </span>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-6">
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="group relative w-full inline-flex justify-center items-center py-4 px-6 border border-cyan-500/30 rounded-xl shadow-sm bg-gradient-to-r from-gray-900/80 to-black/80 text-sm font-medium text-gray-300 hover:text-white hover:border-cyan-400/50 transition-all duration-300 backdrop-blur-sm overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <svg className="w-5 h-5 relative z-10" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="ml-3 relative z-10">Google</span>
            </button>

            <button
              type="button"
              onClick={handleGitHubLogin}
              className="group relative w-full inline-flex justify-center items-center py-4 px-6 border border-cyan-500/30 rounded-xl shadow-sm bg-gradient-to-r from-gray-900/80 to-black/80 text-sm font-medium text-gray-300 hover:text-white hover:border-cyan-400/50 transition-all duration-300 backdrop-blur-sm overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <svg className="w-5 h-5 relative z-10" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              <span className="ml-3 relative z-10">GitHub</span>
            </button>
          </div>
        </div>
      </form>

      {showVerificationModal && (
        <EmailVerificationModal
          isOpen={showVerificationModal}
          onClose={() => setShowVerificationModal(false)}
          email={email}
        />
      )}

      {showForgotPasswordModal && (
        <ForgotPasswordModal
          isOpen={showForgotPasswordModal}
          onClose={() => setShowForgotPasswordModal(false)}
        />
      )}
    </>
  );
}