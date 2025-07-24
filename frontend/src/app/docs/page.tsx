'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PointerHighlight } from '@/components/PointerHighlight';

// Import documentation components
import Overview from './components/Overview';
import Authentication from './components/Authentication';
import QuickStart from './components/QuickStart';
import UserTypes from './components/UserTypes';
import ApiReference from './components/ApiReference';
import SdkDocumentation from './components/SdkDocumentation';
import Webhooks from './components/Webhooks';
import ApiExplorer from './components/ApiExplorer';
import CliDocumentation from './components/CliDocumentation';

// Import API endpoints from modular structure
import { apiEndpoints } from './api';
import type { CodeExample } from './api';

const DocsPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState('overview');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [cliVersion, setCliVersion] = useState<string>('loading...');
  const [cliCommit, setCliCommit] = useState<string>('');

  useEffect(() => {
    setIsLoaded(true);
    fetchCliVersion();
  }, []);

  const currentVersion = '0.1.0';
  const apiVersion = '1';

  const fetchCliVersion = async () => {
    try {
      // Auto-detect repository from environment or use dynamic detection
      const getRepoUrl = () => {
        // Check for environment variable first (set at build time)
        const repoUrl = process.env.NEXT_PUBLIC_GITHUB_REPO;
        if (repoUrl) {
          return `https://api.github.com/repos/${repoUrl}/releases/latest`;
        }
        
        // Fallback: Try to auto-detect from package.json or git remote
        // This would be the current repository where this code is running
        return 'https://api.github.com/repos/EricZil/GhostCDN/releases/latest';
      };
      
      const response = await fetch(getRepoUrl());
      if (response.ok) {
        const release = await response.json();
        const version = release.tag_name.replace('cli-v', '');
        const commit = release.target_commitish?.substring(0, 7) || '';
        setCliVersion(version);
        setCliCommit(commit);
      } else {
        setCliVersion('ERROR');
      }
    } catch (error) {
      console.error('Failed to fetch CLI version:', error);
      setCliVersion('ERROR');
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(id);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };



  const navigation = [
    {
      category: 'Getting Started',
      items: [
        { id: 'overview', label: 'Overview', icon: '🏠', description: 'Introduction to GhostCDN API' },
        { id: 'quick-start', label: 'Quick Start', icon: '⚡', description: 'Get up and running fast' },
        { id: 'authentication', label: 'Authentication', icon: '🔐', description: 'API keys and security' },
      ]
    },
    {
      category: 'API Reference',
      items: [
        { id: 'upload', label: 'Upload Files', icon: '📤', description: 'Upload files via API' },
        { id: 'download', label: 'Download Files', icon: '📥', description: 'Retrieve and access files' },
        { id: 'delete', label: 'Delete Files', icon: '🗑️', description: 'Remove files from storage' },
        { id: 'metadata', label: 'File Metadata', icon: '📋', description: 'Get file information and properties' },
      ]
    },
    {
      category: 'Features',
      items: [
        { id: 'optimization', label: 'Image Processing', icon: '🖼️', description: 'Automatic image optimization and thumbnails' },
        { id: 'presigned', label: 'Presigned URLs', icon: '🔗', description: 'Generate secure upload URLs' },
        { id: 'analytics', label: 'Usage Analytics', icon: '📊', description: 'Track API usage and performance' },
      ]
    },
    {
      category: 'Developer Tools',
      items: [
        { id: 'cli-tools', label: 'CLI Tools', icon: '💻', description: 'Command-line interface' },
        { id: 'sdk', label: 'SDKs & Libraries', icon: '🛠️', description: 'Coming Soon - Official SDKs' },
        { id: 'webhooks', label: 'Webhooks', icon: '🔔', description: 'Coming Soon - Event notifications' },
      ]
    }
  ];

  // Filter navigation based on search
  const filteredNavigation = navigation.map(category => ({
    ...category,
    items: category.items.filter(item => 
      searchQuery === '' || 
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.items.length > 0);

  // API endpoints are now imported from modular structure
  // No need to define them inline anymore

  const renderCodeBlock = (example: CodeExample, id: string) => (
    <div className="relative group">
      <div className="flex items-center justify-between bg-gray-800/80 backdrop-blur-sm px-4 py-3 rounded-t-xl border border-gray-700/50">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-300 capitalize">{example.language}</span>
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-red-400/60"></div>
            <div className="w-2 h-2 rounded-full bg-yellow-400/60"></div>
            <div className="w-2 h-2 rounded-full bg-green-400/60"></div>
          </div>
        </div>
        <button
          onClick={() => copyToClipboard(example.code, id)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 hover:text-white transition-all duration-200 hover:bg-gray-700/50 rounded-lg"
        >
          {copiedCode === id ? (
            <>
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="bg-gray-900/90 backdrop-blur-sm p-6 rounded-b-xl overflow-x-auto border-x border-b border-gray-700/50 text-sm leading-relaxed">
        <code className="text-gray-100 font-mono">{example.code}</code>
      </pre>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return <Overview setActiveSection={setActiveSection} />;
      
      case 'authentication':
        return <Authentication />;
      
      case 'quick-start':
        return <QuickStart setActiveSection={setActiveSection} />;
      
      case 'user-types':
        return <UserTypes />;
      
      case 'api-reference':
        return <ApiReference apiEndpoints={apiEndpoints} renderCodeBlock={renderCodeBlock} />;
      
      case 'upload':
        return <ApiReference apiEndpoints={{ upload: apiEndpoints.upload }} renderCodeBlock={renderCodeBlock} />;
      
      case 'download':
        return <ApiReference apiEndpoints={{ download: apiEndpoints.download }} renderCodeBlock={renderCodeBlock} />;
      
      case 'delete':
        return <ApiReference apiEndpoints={{ delete: apiEndpoints.delete }} renderCodeBlock={renderCodeBlock} />;
      
      case 'metadata':
        return <ApiReference apiEndpoints={{ metadata: apiEndpoints.metadata }} renderCodeBlock={renderCodeBlock} />;
      
      case 'api-explorer':
        return <ApiExplorer endpoint={{
          method: 'GET',
          path: '/files',
          description: 'List all files in your account',
          examples: [],
          response: 'JSON response with file list'
        }} />;
      
      case 'sdk':
        return <SdkDocumentation />;
      
      case 'webhooks':
        return <Webhooks />;
      
      case 'sdks':
        return <SdkDocumentation />;
      
      case 'cli-tools':
        return <CliDocumentation />;
      
      case 'optimization':
      case 'presigned':
      case 'analytics':
        return (
          <div className="text-center py-12">
            <div className="text-6xl mb-6">🚧</div>
            <h2 className="text-3xl font-bold text-white mb-4">Coming Soon</h2>
            <p className="text-xl text-gray-300 mb-8">This section is under development</p>
          </div>
        );

      default:
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-white mb-4">Section Not Found</h2>
            <p className="text-gray-300">The requested documentation section could not be found.</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      {/* Grid background */}
      <div className="grid-background"></div>
      
      {/* Darker gradient overlay */}
      <div className="dark-gradient-bg"></div>

      <div className="relative z-10">
        {/* Enhanced Enterprise Header */}
        <div className="border-b border-gray-800/50 bg-gray-900/80 backdrop-blur-md sticky top-0 z-40">
          <div className="container mx-auto px-4 py-6">
            {/* Trust Indicators */}
            <div className={`flex items-center justify-center gap-4 mb-4 text-xs text-blue-300/70 font-medium tracking-wider transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse"></div>
                <span>API v{apiVersion}-UNSTABLE</span>
              </div>
              <div className="w-px h-3 bg-blue-500/30"></div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                <span>CLI v{cliVersion}{cliCommit && ` (${cliCommit})`}</span>
              </div>
              <div className="w-px h-3 bg-blue-500/30"></div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                <span>Web v{currentVersion}</span>
              </div>
              <div className="w-px h-3 bg-blue-500/30"></div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                <span>PRODUCTION READY</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-6"
              >
                {/* Animated Brand Logo */}
                <div className={`flex items-center transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                  <h1 className="flex items-center">
                    <span className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 tracking-tight font-geist-mono whitespace-nowrap hover:scale-105 transition-transform duration-500">
                      GHOST&nbsp;
                    </span>
                    <PointerHighlight 
                      rectangleClassName="border-cyan-400/60 dark:border-cyan-400/60"
                      pointerClassName="text-cyan-400"
                      containerClassName="inline-block"
                    >
                      <span className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 tracking-tight font-geist-mono whitespace-nowrap">
                        CDN
                      </span>
                    </PointerHighlight>
                  </h1>
                  <div className="ml-4 text-lg text-cyan-300/80 font-medium tracking-[0.15em] font-geist-mono">
                    DOCS
                  </div>
                </div>
              </motion.div>

              <div className="flex items-center gap-4">
                {/* Version Badges */}
                <div className="hidden md:flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-lg border border-cyan-500/30">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-cyan-300">API v{apiVersion}</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg border border-green-500/30">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-sm font-medium text-green-300">CLI v{cliVersion}</span>
                  </div>
                </div>

                {/* Mobile menu button */}
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="md:hidden p-2 rounded-lg bg-gray-800/50 text-gray-300 hover:text-white transition-colors border border-gray-700/50 hover:border-cyan-500/50"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="flex gap-8">
            {/* Sidebar */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`${
                sidebarOpen ? 'block' : 'hidden'
              } md:block w-full md:w-80 flex-shrink-0`}
            >
              <div className="sticky top-32 space-y-6">
                {/* Enhanced Search */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="relative"
                >
                  <input
                    type="text"
                    placeholder="Search documentation..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-3 pl-12 bg-gray-800/60 backdrop-blur-md border border-gray-700/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-300 hover:bg-gray-800/80 focus:bg-gray-800/80"
                  />
                  <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 hover:text-white transition-colors"
                    >
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </motion.div>

                {/* Enhanced Navigation */}
                <nav className="space-y-8">
                  {filteredNavigation.map((category, categoryIndex) => (
                    <motion.div 
                      key={category.category}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + (categoryIndex * 0.1) }}
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-2 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full"></div>
                        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                          {category.category}
                        </h3>
                      </div>
                      <div className="space-y-2">
                        {category.items.map((item, itemIndex) => (
                          <motion.button
                            key={item.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 + (categoryIndex * 0.1) + (itemIndex * 0.05) }}
                            onClick={() => {
                              setActiveSection(item.id);
                              setSidebarOpen(false);
                            }}
                            className={`w-full group flex items-start gap-3 px-4 py-3 rounded-xl text-left transition-all duration-300 ${
                              activeSection === item.id
                                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/10 transform scale-[1.02]'
                                : 'text-gray-300 hover:text-white hover:bg-gray-800/60 border border-transparent hover:border-gray-600/50 hover:transform hover:scale-[1.01]'
                            }`}
                          >
                            <span className="text-lg flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform duration-300">
                              {item.icon}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium mb-1 group-hover:text-cyan-300 transition-colors duration-300">{item.label}</div>
                              <div className="text-xs text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors duration-300">
                                {item.description}
                              </div>
                            </div>
                            {activeSection === item.id && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-2 h-2 bg-cyan-400 rounded-full flex-shrink-0 mt-2"
                              />
                            )}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </nav>
              </div>
            </motion.div>

            {/* Enhanced Main Content */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex-1 min-w-0"
            >
              <div className="bg-gray-800/30 backdrop-blur-md rounded-2xl p-8 border border-gray-700/40 shadow-2xl shadow-black/20 hover:border-gray-600/50 transition-all duration-500">
                <motion.div
                  key={activeSection}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  {renderContent()}
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocsPage;