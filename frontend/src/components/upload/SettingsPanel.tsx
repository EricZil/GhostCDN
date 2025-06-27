"use client";

import { formatFileSize } from "@/lib/utils";

interface SettingsPanelProps {
  fileName: string;
  setFileName: (name: string) => void;
  file: File | null;
  imageDimensions: { width: number; height: number };
  optimizeImage: boolean;
  setOptimizeImage: (value: boolean) => void;
  preserveExif: boolean;
  setPreserveExif: (value: boolean) => void;
  generateThumbnails: boolean;
  setGenerateThumbnails: (value: boolean) => void;
  optimizationPreview: {
    originalSize: number;
    estimatedSize: number;
    savingsPercent: number;
    savingsBytes: number;
  } | null;
  handleUpload: () => void;
  resetAll: () => void;
  isUploading: boolean;
  progress: number;
}

export default function SettingsPanel({
  fileName,
  setFileName,
  file,
  imageDimensions,
  optimizeImage,
  setOptimizeImage,
  preserveExif,
  setPreserveExif,
  generateThumbnails,
  setGenerateThumbnails,
  optimizationPreview,
  handleUpload,
  resetAll,
  isUploading,
  progress
}: SettingsPanelProps) {
  return (
    <div className="w-[380px] h-full flex flex-col bg-gradient-to-b from-[rgba(20,20,35,0.95)] to-[rgba(15,15,25,0.98)] backdrop-blur-xl rounded-xl border-0 shadow-[0_8px_16px_rgba(0,0,0,0.3)] p-6 ml-6">
      {/* File Details Section */}
      <div className="mb-6">
        <div className="flex items-center mb-5">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mr-3 shadow-[0_0_8px_rgba(124,58,237,0.5)]">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-base font-medium text-white">File Details</h3>
        </div>
        
        <div className="space-y-4">
          {/* Filename */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5 ml-0.5">Filename</label>
            <div className="relative">
              <input 
                type="text" 
                value={fileName} 
                onChange={(e) => setFileName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[rgba(30,30,45,0.5)] border-0 rounded-lg focus:outline-none focus:ring-1 focus:ring-accent/50 text-sm text-white shadow-inner"
              />
              <div className="absolute inset-0 rounded-lg pointer-events-none" style={{
                background: 'linear-gradient(180deg, rgba(124,58,237,0.05) 0%, rgba(124,58,237,0) 100%)'
              }}></div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {/* File size */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5 ml-0.5">Size</label>
              <div className="relative">
                <div className="text-sm text-white bg-[rgba(30,30,45,0.5)] px-3.5 py-2.5 rounded-lg border-0 shadow-inner">
                  {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : ''}
                </div>
                <div className="absolute inset-0 rounded-lg pointer-events-none" style={{
                  background: 'linear-gradient(180deg, rgba(124,58,237,0.05) 0%, rgba(124,58,237,0) 100%)'
                }}></div>
              </div>
            </div>
            
            {/* File type */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5 ml-0.5">Type</label>
              <div className="relative">
                <div className="text-sm text-white bg-[rgba(30,30,45,0.5)] px-3.5 py-2.5 rounded-lg border-0 shadow-inner">
                  {file ? file.type.split('/')[1].toUpperCase() : ''}
                </div>
                <div className="absolute inset-0 rounded-lg pointer-events-none" style={{
                  background: 'linear-gradient(180deg, rgba(124,58,237,0.05) 0%, rgba(124,58,237,0) 100%)'
                }}></div>
              </div>
            </div>
          </div>
          
          {/* Dimensions */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5 ml-0.5">Dimensions</label>
            <div className="relative">
              <div className="text-sm text-white bg-[rgba(30,30,45,0.5)] px-3.5 py-2.5 rounded-lg border-0 shadow-inner">
                {imageDimensions.width > 0 ? `${imageDimensions.width} × ${imageDimensions.height} px` : ''}
              </div>
              <div className="absolute inset-0 rounded-lg pointer-events-none" style={{
                background: 'linear-gradient(180deg, rgba(124,58,237,0.05) 0%, rgba(124,58,237,0) 100%)'
              }}></div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Upload Settings */}
      <div className="mt-4 mb-6">
        <div className="flex items-center mb-3">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mr-3 shadow-[0_0_8px_rgba(124,58,237,0.5)]">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="text-base font-medium text-white">Upload Settings</h3>
        </div>

        {/* Optimize toggle */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-white font-medium">Optimize</div>
            <div className="text-gray-400 text-xs">High-quality lossless compression</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={optimizeImage}
              onChange={() => setOptimizeImage(!optimizeImage)}
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
          </label>
        </div>
        
        {/* Optimization Preview */}
        {optimizationPreview && file && optimizeImage && (
          <div className="mb-3 p-3 bg-[rgba(20,20,30,0.5)] rounded-lg">
            <h4 className="text-sm font-medium text-white mb-2">Optimization Preview</h4>
            <div className="grid grid-cols-2 gap-1 text-xs mb-2">
              <div className="text-gray-400">Original Size:</div>
              <div className="text-white font-medium text-right">{formatFileSize(optimizationPreview.originalSize)}</div>
              
              <div className="text-gray-400">Estimated Size:</div>
              <div className="text-white font-medium text-right">{formatFileSize(optimizationPreview.estimatedSize)}</div>
              
              <div className="text-gray-400">Space Saved:</div>
              <div className="text-accent font-medium text-right">
                {formatFileSize(optimizationPreview.savingsBytes)} ({optimizationPreview.savingsPercent}%)
              </div>
            </div>
            <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-600"
                style={{ width: `${100 - optimizationPreview.savingsPercent}%` }}
              ></div>
            </div>
          </div>
        )}
        
        {/* Preserve EXIF toggle */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-white font-medium">Keep EXIF</div>
            <div className="text-gray-400 text-xs">Preserve metadata</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={preserveExif}
              onChange={() => setPreserveExif(!preserveExif)}
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
          </label>
        </div>
        
        {/* Generate Thumbnails toggle */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-white font-medium">Thumbnails</div>
            <div className="text-gray-400 text-xs">Create smaller versions</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={generateThumbnails}
              onChange={() => setGenerateThumbnails(!generateThumbnails)}
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
          </label>
        </div>
      </div>
      
      {/* Action buttons - at the bottom of the panel */}
      <div className="mt-auto pt-5 flex flex-col gap-3">
        <button 
          onClick={handleUpload}
          disabled={isUploading}
          className={`w-full px-5 py-3 text-sm text-white rounded-lg flex items-center justify-center transition-all ${
            isUploading 
              ? "bg-gray-600 cursor-not-allowed" 
              : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-[0_4px_10px_rgba(124,58,237,0.3)] hover:shadow-[0_6px_15px_rgba(124,58,237,0.4)]"
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" />
          </svg>
          {isUploading ? `Uploading... ${progress.toFixed(1)}%` : "Upload"}
        </button>
        
        <button 
          onClick={resetAll}
          className="w-full px-5 py-3 text-sm text-gray-300 border-0 bg-[rgba(30,30,45,0.5)] rounded-lg hover:bg-[rgba(124,58,237,0.2)] transition-all flex items-center justify-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Cancel
        </button>
      </div>
    </div>
  );
} 