"use client";

import { useRef, useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import AnimatedGradientBorder from "@/components/ui/AnimatedGradientBorder";
import dynamic from 'next/dynamic';

// Import DocumentViewer with dynamic import to avoid SSR issues
const DocumentViewer = dynamic(() => import('@/components/ui/DocumentViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full p-6">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
    </div>
  )
});

interface FilePreviewProps {
  preview: string | null;
  file?: File | null;
}

// Simple custom video player component for the preview
const SimpleVideoPlayer = ({ src, type }: { src: string, type?: string, fileName?: string }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState(false);
  const [supported, setSupported] = useState(true);
  
  // List of commonly supported video formats in modern browsers
  const commonlySupportedFormats = useMemo(() => [
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime', // .mov (Safari)
    'audio/mp4',
    'application/mp4',
    'video/x-m4v'
  ], []);
  
  // Check if format might be supported
  useEffect(() => {
    if (!type) return;
    
    // Set initial support prediction based on MIME type
    setSupported(commonlySupportedFormats.includes(type));
  }, [type, commonlySupportedFormats]);
  
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    
    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(err => {
        console.error('Error playing video:', err);
        setError(true);
        setSupported(false);
      });
    }
  };
  
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onError = () => {
      console.error('Video error occurred');
      setError(true);
      setSupported(false);
    };
    
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('error', onError);
    
    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('error', onError);
    };
  }, []);
  
  // If format is not supported, show fallback UI
  if (!supported || error) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full p-6 text-center">
        <div className="bg-purple-600/20 p-6 rounded-full mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-xl font-medium text-white mb-2">Format Preview Not Supported</h3>
        <p className="text-gray-400 mb-4">
          This video format ({type?.replace('video/', '') || 'unknown'}) can&apos;t be previewed in the browser.
        </p>
        <p className="text-purple-400 text-sm">
          The file will still upload successfully and can be downloaded by users.
        </p>
      </div>
    );
  }
  
  return (
    <div className="relative w-full h-full max-h-[60vh] group">
      <video 
        ref={videoRef}
        className="rounded-lg max-h-[60vh] max-w-full w-full h-full object-contain"
        onClick={togglePlay}
        preload="metadata"
      >
        <source src={src} type={type || 'video/mp4'} />
        Your browser does not support the video tag.
      </video>
      
      {/* Play/Pause overlay button */}
      {!isPlaying && (
        <div 
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={togglePlay}
        >
          <div className="p-5 bg-black/40 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}
      
      {/* Custom minimal controls */}
      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-3 transition-opacity duration-300 ${
        !isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      }`}>
        <button onClick={togglePlay} className="text-white focus:outline-none">
          {isPlaying ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};

export default function FilePreview({ preview, file }: FilePreviewProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [fileType, setFileType] = useState<string>('image');
  const [isDocumentPreviewable, setIsDocumentPreviewable] = useState(false);

  useEffect(() => {
    if (!preview) return;

    // Determine file type
    if (file) {
      if (file.type.startsWith('image/')) {
        setFileType('image');
      } else if (file.type.startsWith('video/')) {
        setFileType('video');
      } else if (file.type.startsWith('audio/')) {
        setFileType('audio');
      } else if (file.type === 'application/pdf') {
        setFileType('pdf');
        setIsDocumentPreviewable(true);
      } else if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        setFileType('csv');
        setIsDocumentPreviewable(true);
      } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        setFileType('text');
        setIsDocumentPreviewable(true);
      } else if (file.type.includes('spreadsheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setFileType('spreadsheet');
        setIsDocumentPreviewable(false);
      } else if (file.type.includes('document') || file.name.endsWith('.docx') || file.name.endsWith('.doc') || file.name.endsWith('.odt')) {
        setFileType('document');
        setIsDocumentPreviewable(false);
      } else if (file.type.includes('presentation') || file.name.endsWith('.pptx') || file.name.endsWith('.ppt')) {
        setFileType('presentation');
        setIsDocumentPreviewable(false);
      } else {
        setFileType('file');
        setIsDocumentPreviewable(false);
      }
    }

    if (fileType === 'image') {
      // Create a new image to get the natural dimensions
      const img = new window.Image();
      img.onload = () => {
        setDimensions({
          width: img.naturalWidth,
          height: img.naturalHeight
        });
      };
      img.src = preview;
    }

    // Add resize listener to adjust container size
    const handleResize = () => {
      if (containerRef.current) {
        // Update container size based on available space
        const parentWidth = containerRef.current.parentElement?.clientWidth || 0;
        const parentHeight = containerRef.current.parentElement?.clientHeight || 0;
        
        setContainerSize({
          width: parentWidth,
          height: parentHeight
        });
      }
    };

    window.addEventListener('resize', handleResize);
    // Initial sizing
    setTimeout(handleResize, 0);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [preview, file, fileType]);

  if (!preview) return null;

  // Calculate aspect ratio for optimal display
  const isLandscape = dimensions.width > dimensions.height;
  const aspectRatio = dimensions.width / dimensions.height;
  
  // Determine optimal display size based on aspect ratio
  let displayClass = '';
  if (isLandscape && aspectRatio > 1.5) {
    displayClass = 'w-full'; // Wide landscape
  } else if (!isLandscape && aspectRatio < 0.67) {
    displayClass = 'h-full'; // Tall portrait
  } else {
    displayClass = 'w-full h-full'; // Balanced aspect ratio
  }

  // File type icon mapping
  const renderFilePreview = () => {
    switch (fileType) {
      case 'image':
        return (
          <Image 
            ref={imageRef}
            src={preview} 
            alt="Image Preview" 
            className={`object-contain ${displayClass}`}
            style={{
              maxHeight: 'calc(100vh - 80px)',
              maxWidth: containerSize.width ? `${containerSize.width - 40}px` : 'calc(100vw - 40px)',
            }}
            width={dimensions.width || 1200}
            height={dimensions.height || 800}
            priority
            quality={100}
            unoptimized // Using unoptimized because we're displaying a data URL
          />
        );
      case 'video':
        return (
          <div className="flex flex-col items-center justify-center w-full h-full">
            {preview && (
              <SimpleVideoPlayer src={preview} type={file?.type} />
            )}
          </div>
        );
      case 'audio':
        return (
          <div className="flex flex-col items-center justify-center p-8">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-accent mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18V5l12-2v13"></path>
              <circle cx="6" cy="18" r="3"></circle>
              <circle cx="18" cy="16" r="3"></circle>
            </svg>
            <p className="text-white text-xl mb-2">Audio File</p>
            {preview && (
              <audio
                className="mt-4 w-full max-w-md"
                controls
                preload="metadata"
              >
                <source src={preview} type={file?.type || 'audio/mpeg'} />
                Your browser does not support the audio tag.
              </audio>
            )}
            <p className="text-gray-400 mt-4">{file?.name}</p>
          </div>
        );
      case 'pdf':
      case 'text':
      case 'csv':
        // For PDF, text and CSV files that can be previewed
        if (isDocumentPreviewable && typeof window !== 'undefined') {
          return (
            <div className="flex flex-col items-center justify-center w-full h-full">
              {preview && (
                <DocumentViewer 
                  src={preview} 
                  type={file?.type} 
                  fileName={file?.name}
                  simplifiedView={true}
                />
              )}
            </div>
          );
        }
        // Fallback to "Preview Not Available" message
        return (
          <div className="flex flex-col items-center justify-center p-8">
            <div className="bg-purple-600/20 p-6 rounded-full mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-white text-xl mb-2">Preview Not Available</h3>
            <p className="text-gray-400 mb-4">{file?.name}</p>
            <p className="text-purple-400 text-sm">
              The file will still upload successfully.
            </p>
          </div>
        );
      case 'document':
      case 'spreadsheet':
      case 'presentation':
        // Show "Preview Not Available" message for document types
        return (
          <div className="flex flex-col items-center justify-center p-8">
            <div className="bg-purple-600/20 p-6 rounded-full mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-white text-xl mb-2">Preview Not Available</h3>
            <p className="text-gray-400 mb-4">{file?.name}</p>
            <p className="text-purple-400 text-sm">
              The file will still upload successfully.
            </p>
          </div>
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center p-8">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-accent mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
              <polyline points="13 2 13 9 20 9"></polyline>
            </svg>
            <p className="text-white text-xl mb-2">File</p>
            <p className="text-gray-400">{file?.name}</p>
          </div>
        );
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center h-full p-3" ref={containerRef}>
      <AnimatedGradientBorder className="bg-gray-900/80 backdrop-blur-sm focus:outline-none focus:ring-0 rounded-xl overflow-hidden flex items-center justify-center">
        <div className="flex items-center justify-center w-full h-full">
          {renderFilePreview()}
        </div>
      </AnimatedGradientBorder>
    </div>
  );
} 