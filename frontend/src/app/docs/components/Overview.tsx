'use client';

import { motion } from 'framer-motion';

interface OverviewProps {
  setActiveSection: (section: string) => void;
}

export default function Overview({ setActiveSection }: OverviewProps) {
  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="text-center py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent mb-6 font-geist-mono">
            GhostCDN API
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Modern file hosting and content delivery platform with comprehensive API, 
            analytics tracking, and automated file management. Built for developers and content creators.
          </p>
        </motion.div>

        {/* Platform Indicators */}
        <div className="flex items-center justify-center gap-8 mb-12 text-sm text-blue-300/70 font-medium tracking-wider">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>PRODUCTION READY</span>
          </div>
          <div className="w-px h-4 bg-blue-500/30"></div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            <span>FULL API ACCESS</span>
          </div>
          <div className="w-px h-4 bg-blue-500/30"></div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
            <span>REAL-TIME ANALYTICS</span>
          </div>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[
          {
            icon: '🔐',
            title: 'API Authentication',
            description: 'API key-based authentication with usage tracking and basic access control.'
          },
          {
            icon: '📊',
            title: 'Usage Analytics',
            description: 'Track API usage, response times, and basic performance metrics.'
          },
          {
            icon: '🎯',
            title: 'Image Optimization',
            description: 'Basic image optimization and thumbnail generation for common formats.'
          },
          {
            icon: '🔗',
            title: 'Multiple Interfaces',
            description: 'Web interface, REST API, and command-line tools for file management.'
          },
          {
            icon: '💾',
            title: 'File Storage',
            description: 'Support for guest uploads (10MB), registered users (100MB), and API access.'
          },
          {
            icon: '⚡',
            title: 'Fast Delivery',
            description: 'Quick file uploads and downloads with optimized content delivery.'
          }
        ].map((feature, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:border-cyan-500/30 transition-all duration-300 group"
          >
            <div className="text-3xl mb-4 group-hover:scale-110 transition-transform duration-300">
              {feature.icon}
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
            <p className="text-gray-300 leading-relaxed">{feature.description}</p>
          </motion.div>
        ))}
      </div>

      {/* Quick Start CTA */}
      <div className="bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 rounded-2xl p-8 border border-cyan-500/20 text-center">
        <h3 className="text-2xl font-semibold text-white mb-4">Ready to get started?</h3>
        <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
          Choose your integration path and start building with GhostCDN in minutes.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <button
            onClick={() => setActiveSection('quick-start')}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-cyan-500/25"
          >
            Quick Start Guide
          </button>
          <button
            onClick={() => setActiveSection('api-reference')}
            className="px-6 py-3 bg-gray-800/50 text-white font-medium rounded-lg border border-gray-600 hover:bg-gray-700/50 transition-all duration-200"
          >
            API Reference
          </button>
        </div>
      </div>
    </div>
  );
}