'use client';

import { motion } from 'framer-motion';
import CodeBlock from './CodeBlock';

export default function Authentication() {

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-8"
      >
        <div className="text-6xl mb-6">🔐</div>
        <h2 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent mb-6 font-geist-mono">
          API Authentication
        </h2>
        <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
          Secure your API requests with authentication keys. Get started with API access in minutes.
        </p>
      </motion.div>

      {/* Authentication Methods */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* API Key Authentication */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-cyan-800/20 to-blue-800/20 backdrop-blur-sm rounded-2xl p-8 border border-cyan-500/30"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-cyan-600/30 rounded-xl flex items-center justify-center">
              <span className="text-2xl">🔑</span>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">API Key Authentication</h3>
              <p className="text-cyan-300">Primary authentication method</p>
            </div>
          </div>
          
          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-gray-300">Simple header-based authentication</span>
            </div>
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-gray-300">Usage tracking and rate limiting</span>
            </div>
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-gray-300">Easy key management</span>
            </div>
          </div>

          <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50">
            <h4 className="text-lg font-semibold text-white mb-3">Get Your API Key</h4>
            <div className="space-y-3">
              <p className="text-gray-300 text-sm mb-4">
                To get your API key, you&apos;ll need to sign up for a GhostCDN account and generate it from your dashboard.
              </p>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-blue-400">ℹ️</span>
                  <span className="text-blue-300 font-medium text-sm">How to get your API key:</span>
                </div>
                <ol className="text-blue-200 text-sm space-y-1 ml-6">
                  <li>1. Sign up for a GhostCDN account</li>
                  <li>2. Go to your dashboard</li>
                  <li>3. Navigate to Account Settings</li>
                  <li>4. Generate a new API key</li>
                </ol>
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Keep your API key secure and never share it publicly.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Usage Examples */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-purple-800/20 to-pink-800/20 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/30"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-purple-600/30 rounded-xl flex items-center justify-center">
              <span className="text-2xl">💻</span>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">Usage Examples</h3>
              <p className="text-purple-300">How to use your API key</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* cURL Example */}
            <div>
              <h4 className="text-lg font-semibold text-white mb-3">cURL</h4>
              <CodeBlock
                language="curl"
                code={`curl -X POST https://api.ghostcdn.xyz/upload \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "file=@image.jpg"`}
              />
            </div>

            {/* JavaScript Example */}
            <div>
              <h4 className="text-lg font-semibold text-white mb-3">JavaScript</h4>
              <CodeBlock
                language="javascript"
                code={`const formData = new FormData();
formData.append('file', file);

fetch('https://api.ghostcdn.xyz/upload', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: formData
});`}
              />
            </div>

            {/* Python Example */}
            <div>
              <h4 className="text-lg font-semibold text-white mb-3">Python</h4>
              <CodeBlock
                language="python"
                code={`import requests

headers = {
    'Authorization': 'Bearer YOUR_API_KEY'
}

files = {'file': open('image.jpg', 'rb')}
response = requests.post(
    'https://api.ghostcdn.xyz/upload',
    headers=headers,
    files=files
)`}
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Security Best Practices */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 rounded-2xl p-8 border border-amber-500/20"
      >
        <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <span className="text-3xl">🛡️</span>
          Security Best Practices
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-amber-500/20 rounded-full flex items-center justify-center mt-0.5">
                <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-1">Store Securely</h4>
                <p className="text-gray-300 text-sm">Never hardcode API keys in your source code. Use environment variables or secure key management systems.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-amber-500/20 rounded-full flex items-center justify-center mt-0.5">
                <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-1">Rotate Regularly</h4>
                <p className="text-gray-300 text-sm">Regenerate your API keys periodically and update your applications accordingly.</p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-amber-500/20 rounded-full flex items-center justify-center mt-0.5">
                <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-1">Monitor Usage</h4>
                <p className="text-gray-300 text-sm">Keep track of your API usage and watch for any unusual activity or unauthorized access.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-amber-500/20 rounded-full flex items-center justify-center mt-0.5">
                <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-1">Use HTTPS</h4>
                <p className="text-gray-300 text-sm">Always use HTTPS when making API requests to ensure your keys are transmitted securely.</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}