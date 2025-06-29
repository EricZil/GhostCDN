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
    <div className="h-screen flex items-center justify-center px-4 overflow-hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      <div className="w-full max-w-4xl max-h-[90vh] bg-gradient-to-b from-[rgba(20,20,35,0.95)] to-[rgba(15,15,25,0.98)] backdrop-blur-xl rounded-xl border-0 shadow-[0_8px_32px_rgba(0,0,0,0.3),0_0_15px_rgba(124,58,237,0.2)] p-6 md:p-8 transform transition-all duration-500 scale-100 opacity-100 overflow-hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <div className="flex flex-col items-center h-full justify-center">
          <div className="mb-6 md:mb-8 relative">
            <div className="absolute inset-0 rounded-full blur-xl bg-gradient-to-r from-green-500/30 via-green-400/30 to-emerald-500/30 animate-pulse"></div>
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-green-500 to-emerald-400 flex items-center justify-center relative z-10 shadow-[0_0_20px_rgba(16,185,129,0.5)]">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 md:h-12 md:w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          
          <h3 className="text-2xl md:text-3xl font-medium mb-3 text-white">Upload Complete!</h3>
          <p className="text-base md:text-lg text-gray-300 mb-6 md:mb-8">Your image is now available at the link below</p>
          
          <div className="w-full relative mb-6 md:mb-8 flex flex-col gap-1">
            <span className="text-xs font-semibold text-gray-400 mb-1 ml-1 select-none">Main Link</span>
            <div className="relative flex items-center rounded-xl bg-gradient-to-br from-[rgba(30,30,45,0.7)] to-[rgba(20,20,30,0.95)] border border-gray-800/60 shadow-[0_2px_12px_rgba(124,58,237,0.08)] px-4 py-3">
              <input 
                type="text" 
                value={origin ? `${origin}/view/${encodeURIComponent(result.key || '')}` : ''} 
                readOnly 
                className="flex-1 text-xs md:text-sm font-mono text-gray-100 truncate bg-transparent pr-2 border-0 focus:outline-none focus:ring-0 select-all"
              />
              <button 
                onClick={() => {
                  const viewerUrl = `${origin}/view/${encodeURIComponent(result.key || '')}`;
                  copyToClipboard(viewerUrl, 'main');
                }}
                className={`ml-2 w-8 h-8 flex items-center justify-center rounded-full border-0 shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent/40 ${
                  copied === 'main'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' 
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700'
                }`}
                title="Copy main link"
              >
                {copied === 'main' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-4m-4-8v4m0 0l-3-3m3 3l3-3" />
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <div key={format} className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-gray-400 mb-1 ml-1 select-none">{label}</span>
                    <div className="relative flex items-center rounded-xl bg-gradient-to-br from-[rgba(30,30,45,0.7)] to-[rgba(20,20,30,0.95)] border border-gray-800/60 shadow-[0_2px_12px_rgba(124,58,237,0.08)] px-4 py-3 h-full">
                      <code className="flex-1 text-xs md:text-sm font-mono text-gray-100 truncate bg-transparent pr-2 select-all">
                        {format === 'html' ? `<img src="${result.url}" alt="image" />` : value}
                      </code>
                      <button
                        onClick={() => {
                          copyToClipboard(format === 'html' ? `<img src="${result.url}" alt="image" />` : value, format);
                        }}
                        className={`ml-2 w-8 h-8 flex items-center justify-center rounded-full border-0 shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent/40 ${
                          copied === format
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' 
                            : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700'
                        }`}
                        title={`Copy ${label}`}
                      >
                        {copied === format ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-4m-4-8v4m0 0l-3-3m3 3l3-3" />
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