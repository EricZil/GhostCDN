'use client';

import React, { useState, useEffect } from 'react';
import type { ApiEndpoint } from '../api';

interface ApiNavigationProps {
  endpoints: ApiEndpoint[];
  activeEndpoint?: string;
  onEndpointClick?: (endpointId: string) => void;
}

export default function ApiNavigation({ endpoints, activeEndpoint, onEndpointClick }: ApiNavigationProps) {
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsSticky(scrollTop > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Don't render if there's only one endpoint
  if (endpoints.length <= 1) {
    return null;
  }

  const scrollToEndpoint = (endpointId: string) => {
    const element = document.getElementById(endpointId);
    if (element) {
      const offset = 100; // Account for sticky header
      const elementPosition = element.offsetTop - offset;
      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
      });
    }
    onEndpointClick?.(endpointId);
  };

  const generateEndpointId = (endpoint: ApiEndpoint, index: number) => {
    return `endpoint-${endpoint.method.toLowerCase()}-${endpoint.path.replace(/[^a-zA-Z0-9]/g, '-')}-${index}`;
  };

  return (
    <div className={`transition-all duration-300 ${
      isSticky 
        ? 'fixed top-4 right-4 z-50 w-80' 
        : 'sticky top-4 w-full max-w-sm'
    }`}>
      <div className="bg-gray-800/90 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4 shadow-xl">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-blue-400">🧭</span>
          <h3 className="text-white font-semibold text-sm">API Endpoints</h3>
          <span className="text-xs text-gray-400 bg-gray-700/50 px-2 py-1 rounded">
            {endpoints.length}
          </span>
        </div>
        
        <nav className="space-y-2">
          {endpoints.map((endpoint, index) => {
            const endpointId = generateEndpointId(endpoint, index);
            const isActive = activeEndpoint === endpointId;
            
            return (
              <button
                key={endpointId}
                onClick={() => scrollToEndpoint(endpointId)}
                className={`w-full text-left p-3 rounded-lg transition-all duration-200 group ${
                  isActive 
                    ? 'bg-blue-500/20 border border-blue-500/30 text-blue-300' 
                    : 'hover:bg-gray-700/50 text-gray-300 hover:text-white border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 text-xs font-bold rounded ${
                    endpoint.method === 'GET' ? 'bg-emerald-500/20 text-emerald-400' :
                    endpoint.method === 'POST' ? 'bg-blue-500/20 text-blue-400' :
                    endpoint.method === 'PUT' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {endpoint.method}
                  </span>
                  <div className="flex-1 min-w-0">
                    <code className="text-xs font-mono text-purple-300 block truncate">
                      {endpoint.path}
                    </code>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1 line-clamp-2 group-hover:text-gray-300 transition-colors">
                  {endpoint.description}
                </p>
              </button>
            );
          })}
        </nav>
        
        {/* Collapse button for sticky mode */}
        {isSticky && (
          <button 
            onClick={() => setIsSticky(false)}
            className="mt-3 w-full text-xs text-gray-400 hover:text-white transition-colors flex items-center justify-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Hide Navigation
          </button>
        )}
      </div>
    </div>
  );
}

// Hook to track active endpoint based on scroll position
export function useActiveEndpoint(endpoints: ApiEndpoint[]) {
  const [activeEndpoint, setActiveEndpoint] = useState<string>('');

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 150; // Offset for better UX
      
      for (let i = endpoints.length - 1; i >= 0; i--) {
        const endpointId = `endpoint-${endpoints[i].method.toLowerCase()}-${endpoints[i].path.replace(/[^a-zA-Z0-9]/g, '-')}-${i}`;
        const element = document.getElementById(endpointId);
        
        if (element && element.offsetTop <= scrollPosition) {
          setActiveEndpoint(endpointId);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Set initial active endpoint
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [endpoints]);

  return activeEndpoint;
}