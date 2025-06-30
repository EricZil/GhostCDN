"use client";

import { useEffect, useState } from 'react';
import ThumbnailLinks from './ThumbnailLinks';

interface SuccessViewProps {
  result: {
    success: boolean;
    url: string | null;
    key: string | null;
    provider?: string | null;
    thumbnails?: {
      small: string;
      medium: string;
      large: string;
    } | null;
  };
  copied: string | false;
  copyToClipboard: (text: string, type: string) => void;
}

export default function SuccessView({ result, copied, copyToClipboard }: SuccessViewProps) {
  const [origin, setOrigin] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    // Set mounted state and origin on client side to avoid hydration mismatch
    setIsMounted(true);
    setOrigin(window.location.origin);
    
    // Hide scrollbars completely using multiple approaches
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.scrollbarWidth = 'none'; // Firefox
    (document.documentElement.style as unknown as Record<string, string>).msOverflowStyle = 'none'; // IE/Edge
    document.body.style.overflow = 'hidden';
    
    // Add CSS to hide webkit scrollbars everywhere
    const style = document.createElement('style');
    style.textContent = `
      html::-webkit-scrollbar,
      body::-webkit-scrollbar,
      *::-webkit-scrollbar {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
      }
      html, body, * {
        scrollbar-width: none !important;
        -ms-overflow-style: none !important;
      }
      html, body {
        overflow: hidden !important;
      }
    `;
    document.head.appendChild(style);
    
    // Cleanup on unmount
    return () => {
      document.documentElement.style.overflow = 'unset';
      document.documentElement.style.scrollbarWidth = 'auto';
      (document.documentElement.style as unknown as Record<string, string>).msOverflowStyle = 'auto';
      document.body.style.overflow = 'unset';
      if (document.head.contains(style)) {
      document.head.removeChild(style);
      }
    };
  }, []);

  if (!result.success) return null;

  // Don't render until mounted to prevent hydration mismatch
  if (!isMounted) return null;

  return (
    <div className="h-full flex items-center justify-center p-6 overflow-hidden">
      <div className="w-full max-w-5xl bg-gradient-to-br from-purple-500/5 via-purple-500/3 to-pink-500/5 backdrop-blur-xl rounded-2xl border border-purple-500/30 shadow-[0_16px_32px_rgba(0,0,0,0.4),0_0_30px_rgba(124,58,237,0.1)] p-8 overflow-hidden">
        <div className="flex flex-col items-center h-full justify-center">
          <div className="mb-8 relative">
            <div className="absolute inset-0 rounded-full blur-xl bg-gradient-to-r from-green-500/30 via-green-400/30 to-emerald-500/30 animate-pulse"></div>
            <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-green-500 to-emerald-400 flex items-center justify-center relative z-10 shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          
          <h3 className="text-4xl font-bold bg-gradient-to-r from-white via-green-200 to-emerald-200 bg-clip-text text-transparent mb-3">Upload Complete!</h3>
          <p className="text-lg text-gray-300 mb-8">Your image is now available at the link below</p>
          
          <div className="w-full relative mb-8 flex flex-col gap-2">
            <span className="text-sm font-medium text-gray-300 mb-2">Main Link</span>
            <div className="relative flex items-center rounded-xl bg-black/50 border border-gray-800 px-4 py-4">
              <input 
                type="text" 
                value={origin ? `${origin}/view/${encodeURIComponent(result.key || '')}` : ''} 
                readOnly 
                className="flex-1 text-base font-mono text-white truncate bg-transparent pr-3 border-0 focus:outline-none focus:ring-0 select-all"
              />
              <button 
                onClick={() => {
                  const viewerUrl = `${origin}/view/${encodeURIComponent(result.key || '')}`;
                  copyToClipboard(viewerUrl, 'main');
                }}
                className={`ml-3 w-10 h-10 flex items-center justify-center rounded-xl border-0 shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${
                  copied === 'main'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' 
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
                }`}
                title="Copy main link"
              >
                {copied === 'main' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
              {copied === 'main' && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center justify-center z-20">
                  <div className="bg-gradient-to-r from-green-600/90 to-emerald-600/90 backdrop-blur-md px-3 py-1.5 rounded shadow-lg text-white text-xs flex items-center space-x-2 animate-fade-in-down">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Copied!</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {result.url && (
            <div className="w-full">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    label: 'Direct Link',
                    value: result.url,
                    format: 'direct',
                  },
                  {
                    label: 'Markdown',
                    value: `![image](${result.url})`,
                    format: 'markdown',
                  },
                  {
                    label: 'HTML',
                    value: `<img src=\"${result.url}\" alt=\"image\" />`,
                    format: 'html',
                  },
                ].map(({ label, value, format }) => (
                  <div key={format} className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-gray-300 mb-2">{label}</span>
                    <div className="relative flex items-center rounded-xl bg-black/50 border border-gray-800 px-4 py-4 h-full">
                      <code className="flex-1 text-sm font-mono text-white truncate bg-transparent pr-3 select-all">
                        {format === 'html' ? `<img src="${result.url}" alt="image" />` : value}
                      </code>
                      <button
                        onClick={() => {
                          copyToClipboard(format === 'html' ? `<img src="${result.url}" alt="image" />` : value, format);
                        }}
                        className={`ml-3 w-10 h-10 flex items-center justify-center rounded-xl border-0 shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${
                          copied === format
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' 
                            : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
                        }`}
                        title={`Copy ${label}`}
                      >
                        {copied === format ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>
                      {copied === format && (
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center justify-center z-20">
                          <div className="bg-gradient-to-r from-green-600/90 to-emerald-600/90 backdrop-blur-md px-3 py-1.5 rounded shadow-lg text-white text-xs flex items-center space-x-2 animate-fade-in-down">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Copied!</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {result.thumbnails && (
                <ThumbnailLinks 
                  thumbnails={result.thumbnails}
                  copied={copied}
                  copyToClipboard={copyToClipboard}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 