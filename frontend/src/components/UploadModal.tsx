"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useUploadAnimation } from "@/hooks/upload/useUploadAnimation";
import { useClipboard } from "@/hooks/upload/useClipboard";
import { useSettings } from "@/contexts/SettingsContext";
import UploadForm from "@/components/upload/UploadForm";
import SuccessView from "@/components/upload/SuccessView";
import UploadNotification from "@/components/upload/UploadNotification";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFile?: File | null;
  onOpenAuth?: () => void;
}

export default function UploadModal({ isOpen, onClose, initialFile = null, onOpenAuth }: UploadModalProps) {
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
  const [isClosing, setIsClosing] = useState(false);
  const [notification, setNotification] = useState<{
    isVisible: boolean;
    type: 'error' | 'success' | 'info';
    title: string;
    message: string;
  }>({
    isVisible: false,
    type: 'error',
    title: '',
    message: ''
  });
  
  const { copied, copyToClipboard } = useClipboard();
  const animationState = useUploadAnimation(isOpen);
  const { settings } = useSettings();
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
  
  // Keep track of whether we've shown the success view
  const hasShownSuccessView = useRef(false);
  
  // Update the ref when result.success changes
  useEffect(() => {
    if (result.success) {
      hasShownSuccessView.current = true;
    }
  }, [result.success]);
  
  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Only reset if we're closing the modal
      setTimeout(() => {
        if (!isOpen) {
          setFile(null);
          setPreview(null);
          setOptimizationPreview(null);
          setFileName('');
          hasShownSuccessView.current = false;
          setIsClosing(false);
          reset();
        }
      }, 300); // Delay to allow animation to complete
    }
  }, [isOpen, reset]);

  const handleFile = useCallback((newFile: File) => {
    // Don't process a new file if we've already completed an upload successfully
    if (hasShownSuccessView.current) {
      return;
    }
    
    if (!newFile.type.startsWith('image/')) {
      setNotification({
        isVisible: true,
        type: 'error',
        title: 'Invalid File Type',
        message: 'Please upload an image file (JPEG, PNG, WebP, GIF)'
      });
      return;
    }
    
    const guestLimit = (settings?.guestUploadLimit || 10) * 1024 * 1024;
    const userLimit = (settings?.maxFileSize || 100) * 1024 * 1024;
    const maxSize = isAuthenticated ? userLimit : guestLimit;
    
    if (newFile.size > maxSize) {
      const fileSizeMB = (newFile.size / (1024 * 1024)).toFixed(1);
      const maxSizeMB = isAuthenticated ? `${settings?.maxFileSize || 100}MB` : `${settings?.guestUploadLimit || 10}MB`;
      
      if (!isAuthenticated) {
        setNotification({
          isVisible: true,
          type: 'error',
          title: 'File Too Large',
          message: `Your file (${fileSizeMB}MB) exceeds the ${maxSizeMB} limit for guests. Register for unlimited upload sizes!`
        });
      } else {
        setNotification({
          isVisible: true,
          type: 'error',
          title: 'File Too Large',
          message: `Your file (${fileSizeMB}MB) exceeds the ${maxSizeMB} limit.`
        });
      }
      return;
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
        } catch {
          // Handle estimation error silently
        }
      }
    };
    reader.readAsDataURL(newFile);
  }, [isAuthenticated, optimizeImage, estimateOptimization, settings?.guestUploadLimit, settings?.maxFileSize]);

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

  function handleClose() {
    // If we're showing the success view, add a confirmation step
    if (result.success && !isClosing) {
      setIsClosing(true);
      // Add a delay to prevent accidental closing
      setTimeout(() => {
        onClose();
      }, 300);
      return;
    }
    
    onClose();
  }

  function handleOptimizeChange(value: boolean) {
    setOptimizeImage(value);
    
    if (value && file) {
      try {
        const estimate = estimateOptimization(file);
        setOptimizationPreview(estimate);
      } catch {
        // Handle estimation error silently
      }
    } else {
      setOptimizationPreview(null);
    }
  }

  function closeNotification() {
    setNotification(prev => ({ ...prev, isVisible: false }));
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className={`absolute inset-0 bg-black/80 backdrop-blur-md modal-overlay ${animationState.overlay ? 'modal-overlay-enter' : ''}`}
        onClick={result.success ? undefined : handleClose}
      ></div>
      
      <div className={`modal-container relative z-10 w-full h-full ${animationState.container ? 'modal-container-enter' : ''}`}>
        <div className="modal-content bg-[rgba(15,15,25,0.98)] backdrop-blur-xl border border-[rgba(124,58,237,0.3)] rounded-none shadow-[0_0_50px_rgba(0,0,0,0.3),0_0_15px_rgba(124,58,237,0.2)] w-full h-full">
            <button 
              onClick={handleClose}
              className="fixed top-4 right-4 z-50 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors outline-none focus:outline-none focus:ring-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          
          {!result.success ? (
            <div className="h-full w-full p-6">
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
                resetAll={reset}
                isUploading={isUploading}
                progress={progress}
                error={error}
                isDragging={isDragging}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                isAuthenticated={isAuthenticated}
              />
            </div>
          ) : (
            <div className="h-full w-full overflow-auto">
              <SuccessView 
                result={result}
                copied={copied}
                copyToClipboard={copyToClipboard}
              />
            </div>
          )}
        </div>
        
        {/* Upload Notification */}
        <UploadNotification
          isVisible={notification.isVisible}
          type={notification.type}
          title={notification.title}
          message={notification.message}
          onClose={closeNotification}
          onOpenAuth={onOpenAuth}
          duration={8000}
        />
      </div>
    </div>
  );
} 