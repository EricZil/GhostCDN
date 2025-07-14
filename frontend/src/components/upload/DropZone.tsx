"use client";

import { useRef } from 'react';

interface DropZoneProps {
  isDragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  handleFile: (file: File) => void;
  isAuthenticated: boolean;
}

export default function DropZone({
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  handleFile,
  isAuthenticated
}: DropZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div 
      className={`relative border-2 border-dashed rounded-xl p-4 transition-all flex-grow flex flex-col outline-none focus:outline-none focus:ring-0 h-full ${
        isDragging 
          ? "border-accent bg-accent/5" 
          : "border-gray-300/30 dark:border-gray-700/30 hover:border-accent"
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      tabIndex={0} // Make div focusable
      onFocus={() => {}}
      onBlur={() => {}}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => e.target.files && e.target.files[0] && handleFile(e.target.files[0])}
        className="hidden"
        accept="*/*"
      />
      
      <div className="flex flex-col items-center justify-center py-8 flex-grow">
        <div className="mb-6 relative">
          <div className="absolute inset-0 bg-accent/20 rounded-full blur-md"></div>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-32 w-32 text-white relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-3xl font-medium text-white mb-4">
          Drop your file here
        </h2>
        <p className="mb-4 text-xl text-gray-400">
          or <button 
            onClick={() => fileInputRef.current?.click()} 
            className="text-accent hover:text-accent-light underline"
          >
            browse files
          </button>
        </p>
        <div className="flex items-center justify-center mb-8 px-4 py-2 bg-gray-800/50 rounded-lg">
          <kbd className="px-2 py-1 text-xs font-semibold text-gray-300 bg-gray-700 border border-gray-600 rounded-md mr-2">Ctrl</kbd>
          <span className="text-gray-300 mx-1">+</span>
          <kbd className="px-2 py-1 text-xs font-semibold text-gray-300 bg-gray-700 border border-gray-600 rounded-md">V</kbd>
          <span className="text-gray-400 ml-3">to paste from clipboard</span>
        </div>
        <p className="text-base text-gray-500">
          {isAuthenticated 
            ? 'Files up to 100MB for registered users' 
            : 'Files up to 10MB for guests • No time limit with an account'}
        </p>
      </div>
    </div>
  );
} 