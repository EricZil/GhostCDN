"use client";

import { useState, useEffect, useCallback } from "react";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useUploadAnimation } from "@/hooks/upload/useUploadAnimation";
import { useClipboard } from "@/hooks/upload/useClipboard";
import UploadForm from "@/components/upload/UploadForm";
import SuccessView from "@/components/upload/SuccessView";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFile?: File | null;
}

export default function UploadModal({ isOpen, onClose, initialFile = null }: UploadModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [imageDimensions, setImageDimensions] = useState<{width: number, height: number}>({width: 0, height: 0});
  const [optimizeImage, setOptimizeImage] = useState<boolean>(true);
  const [preserveExif, setPreserveExif] = useState<boolean>(false);
  const [generateThumbnails, setGenerateThumbnails] = useState<boolean>(false);
  const [optimizationPreview, setOptimizationPreview] = useState<{
    originalSize: number;
    estimatedSize: number;
    savingsPercent: number;
    savingsBytes: number;
  } | null>(null);
  
  const { copied, copyToClipboard } = useClipboard();
  const animationState = useUploadAnimation(isOpen);
  const { 
    uploadFile, 
    isUploading, 
    progress, 
    error, 
    result, 
    reset, 
    isAuthenticated,
    estimateOptimization 
  } = useFileUpload();

  const handleFile = useCallback((newFile: File) => {
    if (!newFile.type.startsWith('image/')) {
      return;
    }
    
    const maxSize = isAuthenticated ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    if (newFile.size > maxSize) {
      return;
    }
    
    if (result.success) {
      reset();
    }
    
    setFile(newFile);
    setFileName(newFile.name);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setPreview(result);
      
      const img = new Image();
      img.onload = () => {
        setImageDimensions({width: img.width, height: img.height});
      };
      img.src = result;
      
      if (optimizeImage) {
        try {
          const estimate = estimateOptimization(newFile);
          setOptimizationPreview(estimate);
        } catch (err) {
          console.error('Failed to estimate optimization', err);
        }
      }
    };
    reader.readAsDataURL(newFile);
  }, [isAuthenticated, optimizeImage, reset, result.success, estimateOptimization]);

  useEffect(() => {
      if (!isOpen) return;
      
    function handlePaste(e: ClipboardEvent) {
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        const pastedFile = e.clipboardData.files[0];
        if (pastedFile.type.startsWith('image/')) {
          e.preventDefault();
          handleFile(pastedFile);
        }
      }
    }
    
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [isOpen, handleFile]);

  useEffect(() => {
    if (isOpen && initialFile) {
      handleFile(initialFile);
    }
  }, [isOpen, initialFile, handleFile]);

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  }

  async function handleUpload() {
    if (!file) return;
    
    const uploadOptions = {
      filename: fileName,
      optimize: optimizeImage,
      preserveExif: preserveExif,
      generateThumbnails: generateThumbnails
    };
    
    await uploadFile(file, uploadOptions);
  }

  function resetAll() {
    setFile(null);
    setPreview(null);
    setOptimizationPreview(null);
    setFileName('');
    reset();
  }

  function handleClose() {
      resetAll();
      onClose();
  }

  function handleOptimizeChange(value: boolean) {
    setOptimizeImage(value);
    
    if (value && file) {
      try {
        const estimate = estimateOptimization(file);
        setOptimizationPreview(estimate);
      } catch (err) {
        console.error('Failed to estimate optimization', err);
      }
    } else {
      setOptimizationPreview(null);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className={`absolute inset-0 bg-black/80 backdrop-blur-md modal-overlay ${animationState.overlay ? 'modal-overlay-enter' : ''}`}
        onClick={handleClose}
      ></div>
      
      <div className={`modal-container relative z-10 w-full h-full ${animationState.container ? 'modal-container-enter' : ''}`}>
        <div className="modal-content bg-[rgba(15,15,25,0.98)] backdrop-blur-xl border border-[rgba(124,58,237,0.3)] rounded-none shadow-[0_0_50px_rgba(124,58,237,0.4)] overflow-hidden h-screen w-screen">
            <button 
              onClick={handleClose}
            className="absolute top-4 right-4 z-50 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors outline-none focus:outline-none focus:ring-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          
          <div className="p-6 h-screen flex flex-col">
            {!result.success ? (
              <UploadForm
                file={file}
                preview={preview}
                fileName={fileName}
                setFileName={setFileName}
                imageDimensions={imageDimensions}
                optimizeImage={optimizeImage}
                setOptimizeImage={handleOptimizeChange}
                preserveExif={preserveExif}
                setPreserveExif={setPreserveExif}
                generateThumbnails={generateThumbnails}
                setGenerateThumbnails={setGenerateThumbnails}
                optimizationPreview={optimizationPreview}
                handleFile={handleFile}
                handleUpload={handleUpload}
                resetAll={resetAll}
                isUploading={isUploading}
                progress={progress}
                error={error}
                isDragging={isDragging}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                isAuthenticated={isAuthenticated}
              />
            ) : (
              <SuccessView 
                result={result}
                copied={copied}
                copyToClipboard={copyToClipboard}
              />
              )}
          </div>
        </div>
      </div>
    </div>
  );
} 