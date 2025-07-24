'use client';

import { motion } from 'framer-motion';

interface QuickStartProps {
  setActiveSection: (section: string) => void;
}

export default function QuickStart({ setActiveSection }: QuickStartProps) {
  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-8"
      >
        <div className="text-6xl mb-6">⚡</div>
        <h2 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent mb-6 font-geist-mono">
          Quick Start Guide
        </h2>
        <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
          Get up and running with GhostCDN in just a few minutes. Choose your preferred method below.
        </p>
      </motion.div>

      {/* Method Cards */}
      <div className="grid md:grid-cols-2 gap-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="group bg-gradient-to-br from-cyan-800/20 to-blue-800/20 backdrop-blur-sm rounded-2xl p-8 border border-cyan-500/30 hover:border-cyan-400/50 transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-500/10 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500"></div>
          <div className="relative">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <span className="text-3xl">🌐</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white group-hover:text-cyan-300 transition-colors duration-300">Web Upload</h3>
                <p className="text-cyan-300/80">Perfect for quick file sharing and testing</p>
              </div>
            </div>
            
            <div className="space-y-4 mb-8">
              {[
                { step: '1', text: 'Visit the homepage', icon: '🏠' },
                { step: '2', text: 'Drag & drop or click to upload', icon: '📤' },
                { step: '3', text: 'Get your CDN link instantly', icon: '🔗' }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className="flex items-center gap-4 p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/10 group-hover:bg-cyan-500/10 transition-all duration-300"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                    {item.step}
                  </div>
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-gray-300 group-hover:text-white transition-colors duration-300">{item.text}</span>
                </motion.div>
              ))}
            </div>

            <button className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-cyan-500/25 group-hover:scale-105">
              Try Web Upload
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="group bg-gradient-to-br from-purple-800/20 to-pink-800/20 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/30 hover:border-purple-400/50 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500"></div>
          <div className="relative">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <span className="text-3xl">🚀</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white group-hover:text-purple-300 transition-colors duration-300">API Integration</h3>
                <p className="text-purple-300/80">For developers building applications</p>
              </div>
            </div>
            
            <div className="space-y-4 mb-8">
              {[
                { step: '1', text: 'Create an account', icon: '👤' },
                { step: '2', text: 'Generate an API key', icon: '🔑' },
                { step: '3', text: 'Start uploading programmatically', icon: '💻' }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="flex items-center gap-4 p-3 rounded-xl bg-purple-500/5 border border-purple-500/10 group-hover:bg-purple-500/10 transition-all duration-300"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                    {item.step}
                  </div>
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-gray-300 group-hover:text-white transition-colors duration-300">{item.text}</span>
                </motion.div>
              ))}
            </div>

            <button 
              onClick={() => setActiveSection('authentication')}
              className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-700 transition-all duration-300 shadow-lg hover:shadow-purple-500/25 group-hover:scale-105"
            >
              Get API Access
            </button>
          </div>
        </motion.div>
      </div>

      {/* Additional Resources */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-gradient-to-r from-gray-800/30 to-gray-700/30 backdrop-blur-sm rounded-2xl p-8 border border-gray-600/30"
      >
        <h3 className="text-2xl font-bold text-white mb-6 text-center">Need More Help?</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <button 
            onClick={() => setActiveSection('upload')}
            className="flex flex-col items-center gap-3 p-6 bg-gray-800/50 rounded-xl border border-gray-700/50 hover:border-blue-500/50 transition-all duration-300 group"
          >
            <span className="text-3xl group-hover:scale-110 transition-transform duration-300">📚</span>
            <span className="text-white font-semibold">API Reference</span>
            <span className="text-gray-400 text-sm text-center">Detailed API documentation</span>
          </button>
          
          <button 
            onClick={() => setActiveSection('optimization')}
            className="flex flex-col items-center gap-3 p-6 bg-gray-800/50 rounded-xl border border-gray-700/50 hover:border-green-500/50 transition-all duration-300 group"
          >
            <span className="text-3xl group-hover:scale-110 transition-transform duration-300">🎯</span>
            <span className="text-white font-semibold">Features</span>
            <span className="text-gray-400 text-sm text-center">Explore advanced features</span>
          </button>
          
          <button 
            onClick={() => setActiveSection('cli')}
            className="flex flex-col items-center gap-3 p-6 bg-gray-800/50 rounded-xl border border-gray-700/50 hover:border-purple-500/50 transition-all duration-300 group"
          >
            <span className="text-3xl group-hover:scale-110 transition-transform duration-300">⚙️</span>
            <span className="text-white font-semibold">CLI Tools</span>
            <span className="text-gray-400 text-sm text-center">Command line interface</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}