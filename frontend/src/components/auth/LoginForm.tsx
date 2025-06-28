"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { signIn } from 'next-auth/react';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const { login, isLoading } = useAuth();
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await login(email, password);
      // Success is handled by the AuthContext which updates the session
    } catch {
      setLocalError('Login failed. Please try again.');
    } finally {
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
          Email Address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full px-4 py-3 bg-black/50 border border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-500"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="w-full px-4 py-3 bg-black/50 border border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-500"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {localError && (
        <div className="text-red-500 text-sm py-2 px-3 bg-red-500/10 border border-red-500/20 rounded">
          {localError}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="relative flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="sr-only"
              checked={rememberMe}
              onChange={() => setRememberMe(!rememberMe)}
            />
            <div 
              className={`w-5 h-5 rounded border ${
                rememberMe 
                  ? 'bg-purple-600 border-purple-600' 
                  : 'bg-black/50 border-gray-700'
              } flex items-center justify-center transition-colors duration-200`}
              onClick={() => setRememberMe(!rememberMe)}
            >
              {rememberMe && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-400 cursor-pointer">
              Remember me
            </label>
          </div>
        </div>

        <div className="text-sm">
          <a href="#" className="font-medium text-purple-400 hover:text-purple-300">
            Forgot password?
          </a>
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : "Sign In"}
        </button>
      </div>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-800"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-black text-gray-400">Or continue with</span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div>
            <button
              type="button"
              onClick={() => signIn('google', { callbackUrl: '/' })}
              className="w-full inline-flex justify-center py-2 px-4 border border-gray-800 rounded-lg shadow-sm bg-black/50 text-sm font-medium text-gray-300 hover:bg-gray-900"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.66 15.63 16.88 16.79 15.71 17.57V20.34H19.28C21.36 18.42 22.56 15.6 22.56 12.25Z" fill="#4285F4"/>
                <path d="M12 23C14.97 23 17.46 22 19.28 20.34L15.71 17.57C14.73 18.23 13.48 18.63 12 18.63C9.13 18.63 6.72 16.74 5.82 14.15H2.14V17.01C3.94 20.57 7.65 23 12 23Z" fill="#34A853"/>
                <path d="M5.82 14.15C5.6 13.52 5.48 12.84 5.48 12.15C5.48 11.46 5.6 10.78 5.82 10.15V7.29H2.14C1.41 8.7 1 10.37 1 12.15C1 13.93 1.41 15.6 2.14 17.01L5.82 14.15Z" fill="#FBBC05"/>
                <path d="M12 5.67C13.62 5.67 15.06 6.22 16.19 7.29L19.36 4.12C17.46 2.39 14.97 1.33 12 1.33C7.65 1.33 3.94 3.76 2.14 7.32L5.82 10.18C6.72 7.59 9.13 5.67 12 5.67Z" fill="#EA4335"/>
              </svg>
            </button>
          </div>

          <div>
            <button
              type="button"
              onClick={() => signIn('github', { callbackUrl: '/' })}
              className="w-full inline-flex justify-center py-2 px-4 border border-gray-800 rounded-lg shadow-sm bg-black/50 text-sm font-medium text-gray-300 hover:bg-gray-900"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 0C5.373 0 0 5.373 0 12C0 17.303 3.438 21.8 8.205 23.385C8.805 23.498 9.025 23.127 9.025 22.81C9.025 22.523 9.015 21.768 9.01 20.768C5.672 21.492 4.968 19.158 4.968 19.158C4.422 17.773 3.633 17.403 3.633 17.403C2.546 16.659 3.717 16.675 3.717 16.675C4.922 16.759 5.555 17.912 5.555 17.912C6.625 19.746 8.364 19.216 9.05 18.909C9.158 18.132 9.467 17.603 9.81 17.303C7.145 17 4.343 15.971 4.343 11.374C4.343 10.063 4.812 8.993 5.579 8.153C5.455 7.85 5.044 6.629 5.696 4.977C5.696 4.977 6.704 4.655 8.997 6.207C9.954 5.941 10.98 5.808 12 5.803C13.02 5.808 14.047 5.941 15.006 6.207C17.297 4.655 18.303 4.977 18.303 4.977C18.956 6.63 18.545 7.851 18.421 8.153C19.191 8.993 19.656 10.064 19.656 11.374C19.656 15.983 16.849 16.998 14.177 17.295C14.607 17.667 15 18.397 15 19.517C15 21.12 14.985 22.41 14.985 22.81C14.985 23.129 15.204 23.504 15.815 23.385C20.565 21.797 24 17.3 24 12C24 5.373 18.627 0 12 0Z" fill="currentColor"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </form>
  );
} 