'use client';

import { useState } from 'react';

interface CodeExample {
  language: string;
  code: string;
}

interface ApiExplorerProps {
  endpoint: {
    method: string;
    path: string;
    description: string;
    examples: CodeExample[];
    response: string;
  };
}

export default function ApiExplorer({ endpoint }: ApiExplorerProps) {
  const [selectedMethod, setSelectedMethod] = useState(endpoint.method || 'GET');
  const [apiKey, setApiKey] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTestRequest = async () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setResponse(JSON.stringify({
        success: true,
        message: 'This is a demo response',
        data: {
          files: [
            { id: '1', name: 'example.jpg', size: 1024, url: 'https://cdn.ghostcdn.xyz/example.jpg' }
          ]
        }
      }, null, 2));
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-4xl font-bold text-white mb-4">API Explorer</h2>
        <p className="text-gray-300 text-lg mb-6">
          Test API endpoints directly from your browser with live requests and responses.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Request Builder */}
        <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
          <h3 className="text-xl font-bold text-white mb-6">Request Builder</h3>
          
          <div className="space-y-4">
            {/* Method Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">HTTP Method</label>
              <select 
                value={selectedMethod}
                onChange={(e) => setSelectedMethod(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>

            {/* Endpoint URL */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Endpoint</label>
              <div className="flex">
                <span className="inline-flex items-center px-3 py-2 bg-gray-700/50 border border-r-0 border-gray-600 rounded-l-lg text-gray-400 text-sm">
                  https://api.ghostcdn.xyz
                </span>
                <input 
                  type="text"
                  value={endpoint.path || '/files'}
                  readOnly
                  className="flex-1 px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-r-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>
            </div>

            {/* API Key */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">API Key</label>
              <input 
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key"
                className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>

            {/* Headers */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Headers</label>
              <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-600">
                <pre className="text-sm text-gray-300">
                  <code>{`Authorization: Bearer ${apiKey || 'YOUR_API_KEY'}
Content-Type: application/json`}</code>
                </pre>
              </div>
            </div>

            {/* Send Request Button */}
            <button
              onClick={handleTestRequest}
              disabled={loading || !apiKey}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Sending Request...
                </div>
              ) : (
                'Send Request'
              )}
            </button>
          </div>
        </div>

        {/* Response Viewer */}
        <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
          <h3 className="text-xl font-bold text-white mb-6">Response</h3>
          
          {response ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                <span className="text-green-400 font-medium">200 OK</span>
              </div>
              
              <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-600">
                <pre className="text-sm text-gray-300 overflow-x-auto">
                  <code>{response}</code>
                </pre>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📡</div>
              <p className="text-gray-400">Send a request to see the response here</p>
            </div>
          )}
        </div>
      </div>

      {/* Example Requests */}
      <div className="bg-gradient-to-r from-gray-800/30 to-gray-700/30 backdrop-blur-sm rounded-2xl p-8 border border-gray-600/30">
        <h3 className="text-2xl font-bold text-white mb-6">Example Requests</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-lg font-semibold text-cyan-300 mb-3">Upload File</h4>
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-600">
              <pre className="text-sm text-gray-300 overflow-x-auto">
                <code>{`POST /upload
Authorization: Bearer YOUR_API_KEY
Content-Type: multipart/form-data

{
  "file": "[binary data]"
}`}</code>
              </pre>
            </div>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold text-cyan-300 mb-3">List Files</h4>
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-600">
              <pre className="text-sm text-gray-300 overflow-x-auto">
                <code>{`GET /files
Authorization: Bearer YOUR_API_KEY

Response:
{
  "files": [
    {
      "id": "abc123",
      "name": "image.jpg",
      "url": "https://cdn.ghostcdn.xyz/abc123"
    }
  ]
}`}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}