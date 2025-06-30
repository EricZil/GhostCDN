"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFileUpload } from "@/hooks/useFileUpload";
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
  const [preserveFilename, setPreserveFilename] = useState<boolean>(true);
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
  
  const { copied, copyToClipboard } = useClipboard();  const { settings } = useSettings();
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
      preserveFilename: preserveFilename,
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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with blur - matching SettingsModal style */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={result.success ? undefined : handleClose}
          />

          {/* Modal Container - matching SettingsModal style */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-8"
          >
            <div className="bg-gradient-to-br from-gray-900/95 via-black/95 to-purple-900/95 backdrop-blur-2xl rounded-3xl shadow-[0_32px_64px_rgba(0,0,0,0.4),0_0_50px_rgba(124,58,237,0.15)] w-full max-w-[95vw] h-[90vh] overflow-hidden border border-purple-500/30">
              
              {/* Header - matching SettingsModal style */}
              <div className="relative px-10 py-8">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 via-pink-600/5 to-purple-600/5"></div>
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
                        {result.success ? 'Upload Complete' : 'Upload File'}
                      </h2>
                      <p className="text-gray-400 text-sm mt-1">
                        {result.success 
                          ? 'Your file has been successfully uploaded' 
                          : 'Drag & drop or browse to upload your image'
                        }
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleClose}
                    className="text-gray-400 hover:text-white transition-all duration-200 p-3 hover:bg-white/10 rounded-xl group"
                  >
                    <svg
                      className="w-6 h-6 group-hover:rotate-90 transition-transform duration-200"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Content Area */}
              <div className="h-[calc(90vh-140px)] overflow-hidden">
                <AnimatePresence mode="wait">
                  {!result.success ? (
                    <motion.div
                      key="upload"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2 }}
                      className="h-full w-full px-10 pb-8"
                    >
                      <UploadForm
                        file={file}
                        preview={preview}
                        fileName={fileName}
                        setFileName={setFileName}
                        imageDimensions={imageDimensions}
                        preserveFilename={preserveFilename}
                        setPreserveFilename={setPreserveFilename}
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
                    </motion.div>
                  ) : (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2 }}
                      className="h-full w-full overflow-auto px-10 pb-8"
                    >
                      <SuccessView 
                        result={result}
                        copied={copied}
                        copyToClipboard={copyToClipboard}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
          
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
        </>
      )}
    </AnimatePresence>
  );
} 