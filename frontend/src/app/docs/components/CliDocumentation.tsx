'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Release {
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  assets: Array<{
    name: string;
    download_url: string;
    size: number;
  }>;
}

export default function CliDocumentation() {
  const [latestRelease, setLatestRelease] = useState<Release | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLatestRelease();
  }, []);

  const fetchLatestRelease = async () => {
    try {
      const response = await fetch('https://api.github.com/repos/EricZil/GhostCDN/releases/latest');
      if (!response.ok) throw new Error('Failed to fetch release data');
      const release = await response.json();
      setLatestRelease(release);
    } catch (err) {
      setError('Failed to load release information');
      console.error('Error fetching release:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };





  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent mb-6 font-geist-mono">
          CLI Tools
        </h2>
        <p className="text-xl text-gray-300 mb-8 leading-relaxed max-w-3xl mx-auto">
          Command-line interface for GhostCDN. Upload, manage, and optimize your files directly from the terminal.
        </p>
      </motion.div>

      {/* Latest Release Info */}
      {loading ? (
        <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-700 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
          <p className="text-red-400">{error}</p>
        </div>
      ) : latestRelease && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-800/30 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="text-green-400">📦</span>
              Latest Release: {latestRelease.tag_name}
            </h3>
            <span className="text-sm text-gray-400">
              Released {formatDate(latestRelease.published_at)}
            </span>
          </div>
          
          {latestRelease.body && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-white mb-2">Release Notes</h4>
              <div className="text-gray-300 whitespace-pre-line bg-gray-900/50 rounded-lg p-4">
                {latestRelease.body.slice(0, 500)}{latestRelease.body.length > 500 ? '...' : ''}
              </div>
            </div>
          )}

          {latestRelease.assets && latestRelease.assets.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-white mb-3">Downloads</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {latestRelease.assets.map((asset, index) => (
                  <a
                    key={index}
                    href={asset.download_url}
                    className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-700/50 hover:border-cyan-500/50 transition-colors group"
                  >
                    <div>
                      <div className="text-white font-medium group-hover:text-cyan-300 transition-colors">
                        {asset.name}
                      </div>
                      <div className="text-sm text-gray-400">
                        {formatFileSize(asset.size)}
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-cyan-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}





      {/* Features */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gray-800/30 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6"
      >
        <h3 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
          <span className="text-purple-400">✨</span>
          Features
        </h3>
        
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-blue-400">ℹ️</span>
            <h4 className="text-lg font-semibold text-blue-300">Current Status</h4>
          </div>
          <p className="text-blue-200 text-sm">
            Currently, the CLI supports <strong>file uploads only</strong>. For file management, downloads, deletions, and other operations, please use the web dashboard.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: '🚀',
              title: 'Fast Uploads',
              description: 'Optimized for speed with parallel uploads and compression'
            },
            {
              icon: '🔐',
              title: 'Secure',
              description: 'API key authentication with encrypted connections'
            },
            {
              icon: '📊',
              title: 'Progress Tracking',
              description: 'Real-time upload progress and detailed feedback'
            }
          ].map((feature, index) => (
            <div key={index} className="bg-gray-900/50 rounded-lg p-4">
              <div className="text-2xl mb-3">{feature.icon}</div>
              <h4 className="text-lg font-semibold text-white mb-2">{feature.title}</h4>
              <p className="text-gray-300 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Help & Support */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-gray-800/30 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6"
      >
        <h3 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
          <span className="text-cyan-400">❓</span>
          Help & Support
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">Common Commands</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <code className="text-purple-400">ghostcdn --help</code>
                <span className="text-gray-400">Show help</span>
              </div>
              <div className="flex justify-between">
                <code className="text-purple-400">ghostcdn --version</code>
                <span className="text-gray-400">Show version</span>
              </div>
              <div className="flex justify-between">
                <code className="text-purple-400">ghostcdn config</code>
                <span className="text-gray-400">Manage settings</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">Resources</h4>
            <div className="space-y-2">
              <a href="https://github.com/EricZil/GhostCDN" className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                GitHub Repository
              </a>
              <a href="https://github.com/EricZil/GhostCDN/issues" className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.732L13.732 4.268c-.77-1.064-2.694-1.064-3.464 0L3.34 16.268C2.57 17.333 3.532 19 5.072 19z" />
                </svg>
                Report Issues
              </a>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}