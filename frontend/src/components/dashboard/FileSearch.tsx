'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FileSearchProps {
  onSearch: (filters: SearchFilters) => void;
  totalFiles: number;
  isLoading: boolean;
}

export interface SearchFilters {
  query: string;
  fileType: string;
  dateRange: string;
  sizeRange: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  [key: string]: string;
}

export default function FileSearch({ onSearch, totalFiles, isLoading }: FileSearchProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    fileType: 'all',
    dateRange: 'all',
    sizeRange: 'all',
    sortBy: 'uploadedAt',
    sortOrder: 'desc'
  });

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(filters);
    }, 300);

    return () => clearTimeout(timer);
  }, [filters, onSearch]);

  const updateFilter = (key: keyof SearchFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      query: '',
      fileType: 'all',
      dateRange: 'all',
      sizeRange: 'all',
      sortBy: 'uploadedAt',
      sortOrder: 'desc'
    });
  };

  const activeFilterCount = Object.values(filters).filter(value => 
    value !== '' && value !== 'all' && value !== 'uploadedAt' && value !== 'desc'
  ).length;

  return (
    <div className="bg-[rgba(20,20,35,0.6)] rounded-xl border border-gray-800/40 overflow-hidden">
      {/* Search Header */}
      <div className="p-4">
        <div className="flex items-center gap-4">
          {/* Search Input */}
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search files by name..."
              value={filters.query}
              onChange={(e) => updateFilter('query', e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-black/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
            />
            {filters.query && (
              <button
                onClick={() => updateFilter('query', '')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <svg className="h-4 w-4 text-gray-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Quick Sort */}
          <div className="flex items-center gap-2">
            <select
              value={`${filters.sortBy}-${filters.sortOrder}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('-');
                updateFilter('sortBy', sortBy);
                updateFilter('sortOrder', sortOrder as 'asc' | 'desc');
              }}
              className="px-3 py-3 bg-black/50 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="uploadedAt-desc">Newest First</option>
              <option value="uploadedAt-asc">Oldest First</option>
              <option value="fileName-asc">Name A-Z</option>
              <option value="fileName-desc">Name Z-A</option>
              <option value="fileSize-desc">Largest First</option>
              <option value="fileSize-asc">Smallest First</option>
            </select>
          </div>

          {/* Advanced Filters Toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`px-4 py-3 rounded-lg border transition-all duration-200 flex items-center gap-2 ${
              isExpanded || activeFilterCount > 0
                ? 'bg-purple-500/20 border-purple-500/30 text-purple-300'
                : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:bg-gray-700/50'
            }`}
          >
            <svg 
              className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-purple-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Results Summary */}
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-gray-400">
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                Searching...
              </span>
            ) : (
              `${totalFiles} files found`
            )}
          </span>
          
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-gray-800/40"
          >
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* File Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">File Type</label>
                <select
                  value={filters.fileType}
                  onChange={(e) => updateFilter('fileType', e.target.value)}
                  className="w-full px-3 py-2 bg-black/50 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Types</option>
                  <option value="PNG">PNG Images</option>
                  <option value="JPEG">JPEG Images</option>
                  <option value="WebP">WebP Images</option>
                  <option value="GIF">GIF Images</option>
                  <option value="SVG">SVG Images</option>
                </select>
              </div>

              {/* Date Range Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Upload Date</label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => updateFilter('dateRange', e.target.value)}
                  className="w-full px-3 py-2 bg-black/50 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="quarter">Last 3 Months</option>
                  <option value="year">This Year</option>
                </select>
              </div>

              {/* Size Range Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">File Size</label>
                <select
                  value={filters.sizeRange}
                  onChange={(e) => updateFilter('sizeRange', e.target.value)}
                  className="w-full px-3 py-2 bg-black/50 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Sizes</option>
                  <option value="small">Small (&lt; 1MB)</option>
                  <option value="medium">Medium (1-10MB)</option>
                  <option value="large">Large (10-50MB)</option>
                  <option value="xlarge">Extra Large (&gt; 50MB)</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}