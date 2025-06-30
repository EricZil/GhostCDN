"use client";

import { formatFileSize } from "@/lib/utils";

interface SettingsPanelProps {
  fileName: string;
  setFileName: (name: string) => void;
  file: File | null;
  imageDimensions: { width: number; height: number };
  preserveFilename: boolean;
  setPreserveFilename: (value: boolean) => void;
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
  preserveFilename,
  setPreserveFilename,
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
  // Extract base name and extension from fileName
  const getFileNameParts = (fullName: string) => {
    const lastDotIndex = fullName.lastIndexOf('.');
    if (lastDotIndex === -1) {
      return { baseName: fullName, extension: '' };
    }
    return {
      baseName: fullName.substring(0, lastDotIndex),
      extension: fullName.substring(lastDotIndex)
    };
  };

  const { baseName, extension } = getFileNameParts(fileName);

  const handleBaseNameChange = (newBaseName: string) => {
    // Reconstruct the full filename with the new base name
    setFileName(newBaseName + extension);
  };
  return (
    <div className="w-[400px] h-full flex flex-col bg-gradient-to-b from-purple-500/5 via-purple-500/3 to-pink-500/5 backdrop-blur-xl rounded-2xl border border-purple-500/30 shadow-[0_16px_32px_rgba(0,0,0,0.4),0_0_30px_rgba(124,58,237,0.1)] p-6 ml-8">
      {/* File Details Section */}
      <div className="mb-4">
        <div className="flex items-center mb-4">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center mr-4 shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">File Details</h3>
        </div>
        
        <div className="space-y-3">
          {/* Filename */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5 ml-0.5">Filename</label>
            <div className="relative flex items-center">
              <input 
                type="text" 
                value={baseName} 
                onChange={(e) => handleBaseNameChange(e.target.value)}
                className="flex-1 px-4 py-3 bg-black/50 border border-gray-800 rounded-l-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 text-base text-white transition-all duration-200"
                placeholder="Enter filename"
              />
              <div className="px-4 py-3 bg-black/70 border border-l-0 border-gray-800 rounded-r-xl text-base text-purple-300 font-mono font-medium">
                {extension}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {/* File size */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Size</label>
              <div className="px-4 py-3 bg-black/50 border border-gray-800 rounded-xl text-base text-white">
                {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : ''}
              </div>
            </div>
          </div>
          
          {/* Dimensions */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Dimensions</label>
            <div className="px-4 py-3 bg-black/50 border border-gray-800 rounded-xl text-base text-white">
              {imageDimensions.width > 0 ? `${imageDimensions.width} × ${imageDimensions.height} px` : ''}
            </div>
          </div>
        </div>
      </div>
      
      {/* Upload Settings */}
      <div className="mt-3 mb-4 flex-1 overflow-y-auto">
        <div className="flex items-center mb-4">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center mr-4 shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">Upload Settings</h3>
        </div>

        {/* Preserve Filename toggle */}
        <div className="flex items-center justify-between mb-3 p-3 bg-black/30 rounded-xl border border-gray-800/50 hover:border-purple-500/30 transition-all duration-200">
          <div>
            <div className="text-white font-medium text-base">Keep Filename</div>
            <div className="text-gray-400 text-sm">Preserve original name</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={preserveFilename}
              onChange={() => setPreserveFilename(!preserveFilename)}
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:to-pink-600"></div>
          </label>
        </div>

        {/* Optimize toggle */}
        <div className="flex items-center justify-between mb-3 p-3 bg-black/30 rounded-xl border border-gray-800/50 hover:border-purple-500/30 transition-all duration-200">
          <div>
            <div className="text-white font-medium text-base">Optimize</div>
            <div className="text-gray-400 text-sm">Smart client + server compression</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={optimizeImage}
              onChange={() => setOptimizeImage(!optimizeImage)}
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:to-pink-600"></div>
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
        <div className="flex items-center justify-between mb-3 p-3 bg-black/30 rounded-xl border border-gray-800/50 hover:border-purple-500/30 transition-all duration-200">
          <div>
            <div className="text-white font-medium text-base">Keep EXIF</div>
            <div className="text-gray-400 text-sm">Preserve metadata</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={preserveExif}
              onChange={() => setPreserveExif(!preserveExif)}
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:to-pink-600"></div>
          </label>
        </div>
        
        {/* Generate Thumbnails toggle */}
        <div className="flex items-center justify-between p-3 bg-black/30 rounded-xl border border-gray-800/50 hover:border-purple-500/30 transition-all duration-200">
          <div>
            <div className="text-white font-medium text-base">Thumbnails</div>
            <div className="text-gray-400 text-sm">Create smaller versions</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={generateThumbnails}
              onChange={() => setGenerateThumbnails(!generateThumbnails)}
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:to-pink-600"></div>
          </label>
        </div>
      </div>
      
      {/* Action buttons - at the bottom of the panel */}
      <div className="flex-shrink-0 pt-4 border-t border-purple-500/20 flex flex-col gap-3">
        <button 
          onClick={handleUpload}
          disabled={isUploading}
          className={`w-full px-5 py-3 text-base font-medium text-white rounded-xl flex items-center justify-center transition-all duration-200 ${
            isUploading 
              ? "bg-gray-600 cursor-not-allowed" 
              : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-[0_8px_20px_rgba(124,58,237,0.3)] hover:shadow-[0_12px_30px_rgba(124,58,237,0.4)] hover:scale-[1.02]"
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" />
          </svg>
          {isUploading ? `Uploading... ${progress.toFixed(1)}%` : "Upload File"}
        </button>
        
        <button 
          onClick={resetAll}
          className="w-full px-5 py-3 text-base font-medium text-gray-300 border border-gray-800 bg-black/30 rounded-xl hover:bg-purple-500/10 hover:border-purple-500/30 hover:text-white transition-all duration-200 flex items-center justify-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Cancel
        </button>
      </div>
    </div>
  );
} 