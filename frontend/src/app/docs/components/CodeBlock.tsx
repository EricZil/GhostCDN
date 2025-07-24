'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface CodeBlockProps {
  code: string;
  language: string;
  title?: string;
  showLineNumbers?: boolean;
  maxHeight?: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ 
  code, 
  language, 
  title, 
  showLineNumbers = true, 
  maxHeight = '400px' 
}) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const getLanguageIcon = (lang: string) => {
    const icons: Record<string, string> = {
      javascript: '🟨',
      typescript: '🔷',
      python: '🐍',
      bash: '💻',
      curl: '🌐',
      json: '📄',
      html: '🌍',
      css: '🎨',
      go: '🔵',
      java: '☕',
      php: '🐘',
      csharp: '🔷',
      rust: '🦀',
      cpp: '⚙️',
      c: '⚙️'
    };
    return icons[lang.toLowerCase()] || '📝';
  };

  const formatLanguageName = (lang: string) => {
    const names: Record<string, string> = {
      javascript: 'JavaScript',
      typescript: 'TypeScript',
      python: 'Python',
      bash: 'Bash',
      curl: 'cURL',
      json: 'JSON',
      html: 'HTML',
      css: 'CSS',
      go: 'Go',
      java: 'Java',
      php: 'PHP',
      csharp: 'C#',
      rust: 'Rust',
      cpp: 'C++',
      c: 'C'
    };
    return names[lang.toLowerCase()] || lang.toUpperCase();
  };

  const lines = code.split('\n');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-sm rounded-2xl border border-gray-700/50 overflow-hidden shadow-2xl hover:shadow-cyan-500/10 transition-all duration-300"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-gray-800/80 to-gray-700/80 border-b border-gray-600/30">
        <div className="flex items-center gap-3">
          {/* Traffic Light Buttons */}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full opacity-60 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full opacity-60 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full opacity-60 group-hover:opacity-100 transition-opacity duration-300"></div>
          </div>
          
          {/* Language Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-lg border border-cyan-500/30">
            <span className="text-lg">{getLanguageIcon(language)}</span>
            <span className="text-sm font-medium text-cyan-300">{formatLanguageName(language)}</span>
          </div>
          
          {/* Title */}
          {title && (
            <span className="text-sm font-medium text-gray-300 ml-2">{title}</span>
          )}
        </div>
        
        {/* Copy Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={copyToClipboard}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-700/50 to-gray-600/50 hover:from-cyan-600/50 hover:to-blue-600/50 text-gray-300 hover:text-white rounded-lg border border-gray-600/50 hover:border-cyan-500/50 transition-all duration-300 text-sm font-medium"
        >
          {copied ? (
            <>
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-green-400">Copied!</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Copy</span>
            </>
          )}
        </motion.button>
      </div>
      
      {/* Code Content */}
      <div 
        className="relative overflow-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
        style={{ maxHeight }}
      >
        <div className="flex">
          {/* Line Numbers */}
          {showLineNumbers && (
            <div className="flex-shrink-0 px-4 py-4 bg-gray-800/30 border-r border-gray-700/30 select-none">
              {lines.map((_, index) => (
                <div 
                  key={index} 
                  className="text-xs text-gray-500 font-mono leading-6 text-right min-w-[2rem]"
                >
                  {index + 1}
                </div>
              ))}
            </div>
          )}
          
          {/* Code */}
          <div className="flex-1 px-6 py-4">
            <pre className="text-sm font-mono text-gray-300 leading-6 whitespace-pre-wrap break-words">
              <code className="language-{language}">{code}</code>
            </pre>
          </div>
        </div>
      </div>
      
      {/* Gradient Overlay for Long Code */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-900/90 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
    </motion.div>
  );
};

export default CodeBlock;