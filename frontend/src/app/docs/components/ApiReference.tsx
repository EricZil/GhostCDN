'use client';

import React from 'react';
import Navigation, { useActiveEndpoint } from './Navigation';
import type { ApiEndpoint } from '../api';

interface CodeExample {
  language: string;
  code: string;
}

interface ApiReferenceProps {
  apiEndpoints: Record<string, ApiEndpoint[]>;
  renderCodeBlock: (code: CodeExample, id: string) => React.JSX.Element;
}

export default function ApiReference({ apiEndpoints, renderCodeBlock }: ApiReferenceProps) {
  // Extract all endpoints from the apiEndpoints object
  const endpoints: ApiEndpoint[] = Object.values(apiEndpoints).flat();
  const activeEndpoint = useActiveEndpoint(endpoints);

  const generateEndpointId = (endpoint: ApiEndpoint, index: number) => {
    return `endpoint-${endpoint.method.toLowerCase()}-${endpoint.path.replace(/[^a-zA-Z0-9]/g, '-')}-${index}`;
  };

  return (
    <div className="relative">
      {/* Navigation - only shows if there are multiple endpoints */}
      <div className="hidden lg:block absolute -right-4 top-0 w-80">
        <Navigation 
          endpoints={endpoints}
          activeEndpoint={activeEndpoint}
        />
      </div>

      <div className="space-y-8 lg:pr-84">
        <div>
          <h2 className="text-4xl font-bold text-white mb-4">API Reference</h2>
          <p className="text-gray-300 text-lg mb-4 leading-relaxed">
            Complete reference for the GhostCDN REST API. All endpoints require authentication via API key.
          </p>
          
          {/* API Stability Disclaimer */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-8">
            <div className="flex items-start gap-3">
              <span className="text-amber-400 text-xl">⚠️</span>
              <div>
                <h3 className="text-amber-400 font-semibold mb-2">API Stability Notice</h3>
                <p className="text-amber-200 text-sm leading-relaxed">
                  <strong>Current API endpoints are unstable and should be used with caution in production environments.</strong> 
                  These endpoints were not originally planned for external use and may change without notice. 
                  We are actively developing <strong>API v2</strong> which will provide stable, production-ready endpoints with proper versioning and documentation.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {endpoints.map((endpoint: ApiEndpoint, index: number) => {
            const endpointId = generateEndpointId(endpoint, index);
            return (
              <div 
                key={index} 
                id={endpointId}
                className="bg-gray-800/30 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden scroll-mt-24"
              >
            {/* Header */}
            <div className="p-6 border-b border-gray-700/50">
              <div className="flex items-center gap-4 mb-4">
                <span className={`px-3 py-1.5 text-xs font-bold rounded-lg ${
                  endpoint.method === 'GET' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                  endpoint.method === 'POST' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                  endpoint.method === 'PUT' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                  'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {endpoint.method}
                </span>
                <code className="text-purple-400 font-mono text-lg">{endpoint.path}</code>
              </div>
              <p className="text-gray-300 text-base leading-relaxed">{endpoint.description}</p>
            </div>

            {/* Parameters */}
            {endpoint.parameters && endpoint.parameters.length > 0 && (
              <div className="p-6 border-b border-gray-700/50">
                <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <span className="text-blue-400">📋</span>
                  Parameters
                </h4>
                <div className="space-y-3">
                  {endpoint.parameters.map((param, i: number) => (
                    <div key={i} className="bg-gray-900/50 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <code className="text-purple-400 font-mono text-sm">{param.name}</code>
                        <span className={`px-2 py-1 text-xs rounded ${
                          param.required 
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                            : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                        }`}>
                          {param.required ? 'Required' : 'Optional'}
                        </span>
                        <span className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded">
                          {param.type}
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm">{param.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Status Codes */}
            {endpoint.statusCodes && endpoint.statusCodes.length > 0 && (
              <div className="p-6 border-b border-gray-700/50">
                <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <span className="text-green-400">📊</span>
                  Response Codes
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {endpoint.statusCodes.map((status, i: number) => (
                    <div key={i} className="bg-gray-900/50 rounded-lg p-3 flex items-center gap-3">
                      <span className={`px-2 py-1 text-xs font-mono rounded ${
                        status.code >= 200 && status.code < 300 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : status.code >= 400 && status.code < 500
                          ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {status.code}
                      </span>
                      <span className="text-gray-300 text-sm">{status.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Examples */}
            <div className="p-6">
              <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                <span className="text-yellow-400">💻</span>
                Code Examples
              </h4>
              <div className="space-y-4">
                {endpoint.examples.map((example, i: number) => (
                  <div key={i}>
                    {renderCodeBlock(example, `${endpoint.method}-${index}-${i}`)}
                  </div>
                ))}
              </div>
            </div>

            {/* Response Example */}
            {endpoint.response && (
              <div className="p-6 border-t border-gray-700/50">
                <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <span className="text-green-400">📤</span>
                  Response Example
                </h4>
                {renderCodeBlock({ language: 'json', code: endpoint.response }, `${endpoint.method}-${index}-response`)}
              </div>
            )}
          </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}