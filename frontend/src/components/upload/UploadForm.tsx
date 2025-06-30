"use client";

import DropZone from './DropZone';
import FilePreview from './FilePreview';
import SettingsPanel from './SettingsPanel';

interface UploadFormProps {
  file: File | null;
  preview: string | null;
  fileName: string;
  setFileName: (name: string) => void;
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
  handleFile: (file: File) => void;
  handleUpload: () => void;
  resetAll: () => void;
  isUploading: boolean;
  progress: number;
  error: string | null;
  isDragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  isAuthenticated: boolean;
}

export default function UploadForm({
  file,
  preview,
  fileName,
  setFileName,
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
  handleFile,
  handleUpload,
  resetAll,
  isUploading,
  progress,
  error,
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  isAuthenticated
}: UploadFormProps) {
  return (
    <>
      {!preview ? (
        <DropZone
          isDragging={isDragging}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          handleFile={handleFile}
          isAuthenticated={isAuthenticated}
        />
      ) : (
        <div className="flex flex-col h-full">
          <div className="flex flex-row h-full items-stretch">
            <div className="flex-grow">
              <FilePreview preview={preview} />
            </div>
            
            <div className="flex-shrink-0">
              <SettingsPanel
                fileName={fileName}
                setFileName={setFileName}
                file={file}
                imageDimensions={imageDimensions}
                preserveFilename={preserveFilename}
                setPreserveFilename={setPreserveFilename}
                optimizeImage={optimizeImage}
                setOptimizeImage={setOptimizeImage}
                preserveExif={preserveExif}
                setPreserveExif={setPreserveExif}
                generateThumbnails={generateThumbnails}
                setGenerateThumbnails={setGenerateThumbnails}
                optimizationPreview={optimizationPreview}
                handleUpload={handleUpload}
                resetAll={resetAll}
                isUploading={isUploading}
                progress={progress}
              />
            </div>
          </div>
          
          {error && (
            <div className="mt-3 px-4 py-3 bg-red-900/20 border border-red-500/30 rounded-md">
              <p className="text-base text-red-400 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
} 