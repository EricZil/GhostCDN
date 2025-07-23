"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { PointerHighlight } from "@/components/PointerHighlight";
import AnimatedGradientBorder from "@/components/ui/AnimatedGradientBorder";
import VideoPlayer from "@/components/ui/VideoPlayer";
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'qrcode';
import ThumbnailLinks from '@/components/upload/ThumbnailLinks';
import dynamic from 'next/dynamic';

const DocumentViewer = dynamic(() => import('@/components/ui/DocumentViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full p-6">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
    </div>
  )
});

interface FileInfo {
  url: string;
  size?: number;
  width?: number;
  height?: number;
  type?: string;
  fileSize?: number;
  dominantColors?: string[];
  thumbnails?: {
    small: string;
    medium: string;
    large: string;
  } | null;
  isImage: boolean;
  isVideo: boolean;
  isAudio: boolean;
  isPdf: boolean;
  isText: boolean;
  isCsv: boolean;
  isDocument: boolean;
  contentType?: string;
}

export default function FileViewer() {
  const params = useParams();
  const fileKey = decodeURIComponent(params.fileKey as string);
  
  const [copied, setCopied] = useState<string | false>(false);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [fileError, setFileError] = useState(false);
  
  // Enhanced features state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showFileInfo, setShowFileInfo] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get file type from file extension
  const getFileTypeFromKey = useCallback((key: string) => {
    const extension = key.split('.').pop()?.toLowerCase() || '';
    const contentType = getContentTypeFromExtension(extension);
    
    // Check file type
    const isImage = contentType.startsWith('image/');
    const isVideo = contentType.startsWith('video/');
    const isAudio = contentType.startsWith('audio/');
    const isPdf = contentType === 'application/pdf';
    const isText = contentType === 'text/plain';
    const isCsv = contentType === 'text/csv';
    const isDocument = contentType.includes('document') || 
                      contentType.includes('spreadsheet') || 
                      contentType.includes('presentation') ||
                      ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp'].includes(extension);
    
    return {
      extension,
      contentType,
      isImage,
      isVideo,
      isAudio,
      isPdf,
      isText,
      isCsv,
      isDocument
    };
  }, []);

  // Map file extension to content type
  const getContentTypeFromExtension = (extension: string): string => {
    const contentTypeMap: {[key: string]: string} = {
      // Images
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'bmp': 'image/bmp',
      // Videos
      'mp4': 'video/mp4',
      'm4v': 'video/mp4',
      'webm': 'video/webm',
      'mov': 'video/quicktime',
      'qt': 'video/quicktime',
      'avi': 'video/x-msvideo',
      'wmv': 'video/x-ms-wmv',
      'flv': 'video/x-flv',
      'mpeg': 'video/mpeg',
      'mpg': 'video/mpeg',
      '3gp': 'video/3gpp',
      'mkv': 'video/x-matroska',
      'hevc': 'video/hevc',
      'h265': 'video/hevc',
      'ts': 'video/mp2t',
      'mts': 'video/mp2t',
      'divx': 'video/x-divx',
      'ogv': 'video/ogg',
      // Audio
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      'flac': 'audio/flac',
      // Documents
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      // Text files
      'txt': 'text/plain',
      'csv': 'text/csv',
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'json': 'application/json',
      'xml': 'application/xml',
      'md': 'text/markdown',
      // Other
      'zip': 'application/zip',
      'rar': 'application/x-rar-compressed'
    };
    
    return contentTypeMap[extension] || 'application/octet-stream';
  };

  // Extract dominant colors from image
  const extractDominantColors = useCallback((img: HTMLImageElement): string[] => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return [];
      
      canvas.width = 50;
      canvas.height = 50;
      ctx.drawImage(img, 0, 0, 50, 50);
      
      // Return default color palette
      return ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];
    } catch {
      return [];
    }
  }, []);

  // Reset zoom and pan
  const resetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Toggle fullscreen mode
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
    resetZoom();
  }, [isFullscreen, resetZoom]);

  // Generate thumbnail URLs based on file structure
  const generateThumbnailUrls = useCallback((originalFileKey: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_CDN_URL || 'https://cdn.gcdn.space';
    
    // Determine thumbnail folder based on file location
    let thumbnailBasePath;
    if (originalFileKey.startsWith('Guests/')) {
      thumbnailBasePath = 'Guests/Thumbnails/';
    } else if (originalFileKey.startsWith('Registered/')) {
      const pathParts = originalFileKey.split('/');
      const userFolder = pathParts[1];
      thumbnailBasePath = `Registered/${userFolder}/Thumbnails/`;
    } else {
      return null; // Invalid structure
    }
    
    // Get the base filename without path and extension
    const originalFileName = originalFileKey.split('/').pop();
    if (!originalFileName) return null;
    
    const baseName = originalFileName.substring(0, originalFileName.lastIndexOf('.'));
    
    return {
      small: `${baseUrl}/${thumbnailBasePath}${baseName}_small.webp`,
      medium: `${baseUrl}/${thumbnailBasePath}${baseName}_medium.webp`,
      large: `${baseUrl}/${thumbnailBasePath}${baseName}_large.webp`
    };
  }, []);

  // Check if thumbnail exists
  const checkThumbnailExists = useCallback(async (url: string): Promise<boolean> => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  // Fetch file data
  useEffect(() => {
    async function fetchFileData() {
      try {
        setLoading(true);
        
        const baseUrl = process.env.NEXT_PUBLIC_CDN_URL || 'https://cdn.gcdn.space';
        const encodedFileKey = fileKey.split('/').map(part => encodeURIComponent(part)).join('/');
        const directUrl = `${baseUrl}/${encodedFileKey}`;
        
        // Fetch file info from headers
        const response = await fetch(directUrl, { method: 'HEAD' });
        const fileSize = response.headers.get('content-length');
        const contentType = response.headers.get('content-type') || undefined;
        
        // Get file type info
        const fileTypeInfo = getFileTypeFromKey(fileKey);
        const isImage = fileTypeInfo.isImage || (contentType?.startsWith('image/') || false);
        
        // Check for thumbnails only if it's an image
        let thumbnails = null;
        if (isImage) {
          const thumbnailUrls = generateThumbnailUrls(fileKey);
          
          if (thumbnailUrls) {
            // Check which thumbnails exist
            const [smallExists, mediumExists, largeExists] = await Promise.all([
              checkThumbnailExists(thumbnailUrls.small),
              checkThumbnailExists(thumbnailUrls.medium),
              checkThumbnailExists(thumbnailUrls.large)
            ]);
            
            if (smallExists || mediumExists || largeExists) {
              thumbnails = {
                small: smallExists ? thumbnailUrls.small : '',
                medium: mediumExists ? thumbnailUrls.medium : '',
                large: largeExists ? thumbnailUrls.large : ''
              };
            }
          }
        }
        
        if (isImage) {
          // For images, load and get dimensions
          const img = new window.Image();
          img.onload = () => {
            setFileInfo({
              url: directUrl,
              width: img.width,
              height: img.height,
              type: fileTypeInfo.contentType,
              fileSize: fileSize ? parseInt(fileSize) : undefined,
              dominantColors: extractDominantColors(img),
              thumbnails,
              isImage: true,
              isVideo: false,
              isAudio: false,
              isPdf: false,
              isText: false,
              isCsv: false,
              isDocument: false,
              contentType: contentType
            });
            setLoading(false);
          };
          
          img.onerror = () => {
            setFileError(true);
            setLoading(false);
          };
          
          img.src = directUrl;
          img.crossOrigin = "anonymous";
        } else {
          // For non-images, just set the file info
          setFileInfo({
            url: directUrl,
            type: fileTypeInfo.contentType,
            fileSize: fileSize ? parseInt(fileSize) : undefined,
            thumbnails: null,
            isImage: fileTypeInfo.isImage,
            isVideo: fileTypeInfo.isVideo,
            isAudio: fileTypeInfo.isAudio,
            isPdf: fileTypeInfo.isPdf,
            isText: fileTypeInfo.isText,
            isCsv: fileTypeInfo.isCsv,
            isDocument: fileTypeInfo.isDocument,
            contentType: contentType
          });
          setLoading(false);
        }
      } catch {
        setFileError(true);
        setLoading(false);
      }
    }
    
    fetchFileData();
  }, [fileKey, generateThumbnailUrls, checkThumbnailExists, extractDominantColors, getFileTypeFromKey]);

  // Keyboard controls - only for images
  useEffect(() => {
    if (!fileInfo?.isImage) return;
    
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'Escape':
          if (isFullscreen) {
            setIsFullscreen(false);
          }
          break;
        case '+':
        case '=':
          e.preventDefault();
          setZoom(prev => Math.min(prev + 0.25, 5));
          break;
        case '-':
          e.preventDefault();
          setZoom(prev => Math.max(prev - 0.25, 0.25));
          break;
        case '0':
          e.preventDefault();
          resetZoom();
          break;
        case 'i':
        case 'I':
          e.preventDefault();
          setShowFileInfo(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isFullscreen, fileInfo, resetZoom, toggleFullscreen]);

  // Mouse controls for zoom and pan - only for images
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!fileInfo?.isImage) return;
    
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.max(0.25, Math.min(5, prev + delta)));
  }, [fileInfo]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!fileInfo?.isImage) return;
    
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [zoom, pan, fileInfo]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!fileInfo?.isImage) return;
    
    if (isDragging && zoom > 1) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  }, [isDragging, dragStart, zoom, fileInfo]);

  const handleMouseUp = useCallback(() => {
    if (!fileInfo?.isImage) return;
    setIsDragging(false);
  }, [fileInfo]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadFile = async () => {
    if (!fileInfo) return;
    
    try {
      const response = await fetch(fileInfo.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileKey.split('/').pop() || 'file';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      // Fallback to opening in new tab if download fails
      window.open(fileInfo.url, '_blank');
    }
  };

  const generateQRCode = useCallback(async (url: string) => {
    try {
      const qrDataURL = await QRCode.toDataURL(url, {
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });
      setQrCodeUrl(qrDataURL);
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      setQrCodeUrl(null);
    }
  }, []);

  // Generate QR code when file info changes and QR is shown
  useEffect(() => {
    if (showQR && fileInfo?.url && !qrCodeUrl) {
      generateQRCode(fileInfo.url);
    }
  }, [showQR, fileInfo?.url, qrCodeUrl, generateQRCode]);

  // Generate share links based on file type
  const getShareLinks = useCallback(() => {
    if (!fileInfo) return [];
    
    const fileName = fileKey.split('/').pop() || 'file';
    
    const commonLinks = [
      { name: 'Direct Link', value: fileInfo.url, icon: '🔗' },
      { name: 'HTML', value: `<a href="${fileInfo.url}" target="_blank">${fileName}</a>`, icon: '🌐' },
      { name: 'BBCode', value: `[url=${fileInfo.url}]${fileName}[/url]`, icon: '💬' },
      { name: 'Discord', value: fileInfo.url, icon: '💬' }
    ];
    
    if (fileInfo.isImage) {
      return [
        ...commonLinks,
        { name: 'Markdown', value: `![${fileName}](${fileInfo.url})`, icon: '📝' },
        { name: 'Reddit', value: `![${fileName}](${fileInfo.url})`, icon: '🔴' }
      ];
    } else {
      return [
        ...commonLinks,
        { name: 'Markdown', value: `[${fileName}](${fileInfo.url})`, icon: '📝' },
        { name: 'Reddit', value: `[${fileName}](${fileInfo.url})`, icon: '🔴' }
      ];
    }
  }, [fileInfo, fileKey]);

  const shareLinks = getShareLinks();

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-[#0f0f19]' : 'bg-gray-50'}`}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"
        />
      </div>
    );
  }

  if (fileError || !fileInfo) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-[#0f0f19]' : 'bg-gray-50'}`}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`max-w-md p-8 rounded-xl border shadow-lg ${
            theme === 'dark' 
              ? 'bg-[rgba(20,20,35,0.95)] border-gray-800/60 text-white' 
              : 'bg-white border-gray-200 text-gray-900'
          }`}
        >
          <h1 className="text-2xl font-bold mb-4">File not found</h1>
          <p className={`mb-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
            The requested file could not be found.
          </p>
          <Link href="/" className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all">
            Return to Home
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${theme === 'dark' ? 'bg-[#0f0f19]' : 'bg-gray-50 light-theme'}`}>
      {/* Fullscreen Modal */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex items-center justify-center"
            onClick={() => setIsFullscreen(false)}
          >
            <div
              ref={containerRef}
              className="relative w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onClick={(e) => e.stopPropagation()}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imageRef}
                src={fileInfo.url}
                alt={fileKey}
                className="max-w-none transition-transform duration-200"
                style={{
                  transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                  cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
                }}
                draggable={false}
              />
              
              {/* Fullscreen Controls */}
              <div className="absolute top-4 right-4 flex gap-2">
                <button
                  onClick={resetZoom}
                  className="p-2 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
                  title="Reset Zoom (0)"
                >
                  🔄
                </button>
                <button
                  onClick={() => setIsFullscreen(false)}
                  className="p-2 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
                  title="Exit Fullscreen (ESC)"
                >
                  ✕
                </button>
              </div>
              
              {/* Zoom Indicator */}
              {zoom !== 1 && (
                <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/50 text-white rounded-lg">
                  {Math.round(zoom * 100)}%
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-between items-center mb-8"
          >
            <Link href="/" className="flex items-center">
              <span className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-500 to-blue-600 tracking-tight font-geist-mono whitespace-nowrap">
                GHOST&nbsp;
              </span>
              <PointerHighlight 
                rectangleClassName="border-blue-500/50 dark:border-blue-500/50"
                pointerClassName="text-blue-500"
                containerClassName="inline-block"
              >
                <span className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-500 to-blue-600 tracking-tight font-geist-mono whitespace-nowrap">
                  CDN
                </span>
              </PointerHighlight>
            </Link>
            
            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark' 
                  ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' 
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
              title="Toggle Theme"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </motion.div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* File Preview */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="lg:col-span-2"
            >
              <div className="relative aspect-video">
                <AnimatedGradientBorder containerClassName="absolute inset-0">
                  <div className={`w-full h-full flex items-center justify-center ${
                    theme === 'dark' ? 'bg-[#0f0f19]' : 'bg-white'
                  }`}>
                    <div
                      className="relative max-w-full max-h-full flex items-center justify-center"
                      style={{ height: '100%', width: '100%' }}
                      title={fileInfo?.isImage ? "Click for fullscreen (F)" : undefined}
                    >
                      {fileInfo?.isImage && (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={fileInfo.url} 
                            alt={fileKey} 
                            className="max-w-full max-h-full object-contain hover:scale-105 transition-transform duration-300 cursor-pointer"
                            style={{ maxHeight: '100%', maxWidth: '100%' }}
                            onClick={toggleFullscreen}
                          />
                          
                          {/* Hover Overlay */}
                          <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors duration-300 flex items-center justify-center cursor-pointer" onClick={toggleFullscreen}>
                            <div className="opacity-0 hover:opacity-100 transition-opacity duration-300 bg-black/50 text-white px-4 py-2 rounded-lg">
                              🔍 Click for fullscreen
                            </div>
                          </div>
                        </>
                      )}

                      {fileInfo?.isVideo && (
                        <VideoPlayer 
                          src={fileInfo.url} 
                          type={fileInfo.contentType}
                        />
                      )}

                      {fileInfo?.isAudio && (
                        <div className="flex flex-col items-center justify-center w-full h-full">
                          <div className="mb-6 p-4 rounded-full bg-gradient-to-r from-purple-500 to-blue-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                            </svg>
                          </div>
                          <audio 
                            controls 
                            className="w-full max-w-md"
                          >
                            <source src={fileInfo.url} type={fileInfo.contentType} />
                            Your browser does not support the audio element.
                          </audio>
                        </div>
                      )}

                      {(fileInfo?.isPdf || fileInfo?.isText || fileInfo?.isCsv) && (
                        <div className="w-full h-full">
                          {typeof window !== 'undefined' && (
                            <div className="w-full h-full max-h-[70vh]">
                              <DocumentViewer
                                src={fileInfo.url}
                                type={fileInfo.contentType}
                                fileName={fileKey.split('/').pop()}
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* For other file types we can't display */}
                      {fileInfo && !fileInfo.isImage && !fileInfo.isVideo && !fileInfo.isAudio && 
                       !fileInfo.isPdf && !fileInfo.isText && !fileInfo.isCsv && (
                        <div className="flex flex-col items-center justify-center w-full h-full">
                          <div className="mb-6 p-6 rounded-full bg-gradient-to-r from-purple-500 to-blue-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <h3 className="text-2xl font-medium mb-2">Preview Not Available</h3>
                          <p className="text-gray-400 mb-6">
                            {fileKey.split('/').pop()} • {formatFileSize(fileInfo.fileSize)}
                          </p>
                          <button 
                            onClick={downloadFile}
                            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all flex items-center"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download File
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </AnimatedGradientBorder>
                
                {/* File Controls */}
                <div className="absolute top-4 right-4 flex gap-2">
                  <button
                    onClick={() => setShowFileInfo(!showFileInfo)}
                    className={`p-2 rounded-lg transition-colors ${
                      theme === 'dark' 
                        ? 'bg-black/50 text-white hover:bg-black/70' 
                        : 'bg-white/90 text-gray-800 hover:bg-white'
                    }`}
                    title="Toggle Info (I)"
                  >
                    ℹ️
                  </button>
                  {fileInfo.isImage && (
                    <button
                      onClick={toggleFullscreen}
                      className={`p-2 rounded-lg transition-colors ${
                        theme === 'dark' 
                          ? 'bg-black/50 text-white hover:bg-black/70' 
                          : 'bg-white/90 text-gray-800 hover:bg-white'
                      }`}
                      title="Fullscreen (F)"
                    >
                      ⛶
                    </button>
                  )}
                </div>
              </div>

              {/* Thumbnails Section - Below Image - Only for images */}
              {fileInfo.thumbnails && fileInfo.isImage && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-8"
                >
                  <AnimatedGradientBorder containerClassName="w-full">
                    <div className={`w-full p-6 ${
                      theme === 'dark' ? 'bg-[#0f0f19]' : 'bg-white'
                    }`}>
                      <ThumbnailLinks 
                        thumbnails={fileInfo.thumbnails}
                        copied={copied}
                        copyToClipboard={copyToClipboard}
                      />
                    </div>
                  </AnimatedGradientBorder>
                </motion.div>
              )}
            </motion.div>

            {/* Enhanced Sidebar */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              {/* File Details */}
              <AnimatePresence>
                {showFileInfo && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`rounded-xl p-6 border shadow-lg ${
                      theme === 'dark' 
                        ? 'bg-[rgba(20,20,35,0.5)] border-gray-800/40' 
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      📊 File Details
                    </h2>
                    
                    <div className="space-y-3">
                      <div>
                        <h3 className={`text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          Filename
                        </h3>
                        <p className={`font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {fileKey.split('/').pop()}
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <h3 className={`text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            Type
                          </h3>
                          <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {fileInfo.type}
                          </p>
                        </div>
                        
                        <div>
                          <h3 className={`text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            Size
                          </h3>
                          <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {formatFileSize(fileInfo.fileSize)}
                          </p>
                        </div>
                      </div>
                      
                                             {fileInfo.width && fileInfo.height && (
                         <div>
                           <h3 className={`text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                             Dimensions
                           </h3>
                           <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                             {fileInfo.width} × {fileInfo.height} px
                           </p>
                         </div>
                       )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Enhanced Sharing */}
              <div className={`rounded-xl p-6 border shadow-lg ${
                theme === 'dark' 
                  ? 'bg-[rgba(20,20,35,0.5)] border-gray-800/40' 
                  : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    🔗 Share & Export
                  </h2>
                  <button
                    onClick={() => {
                      const newShowQR = !showQR;
                      setShowQR(newShowQR);
                      if (newShowQR && fileInfo?.url && !qrCodeUrl) {
                        generateQRCode(fileInfo.url);
                      }
                    }}
                    className={`p-2 rounded-lg transition-colors ${
                      theme === 'dark' 
                        ? 'bg-gray-700 text-white hover:bg-gray-600' 
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                    title="Show QR Code"
                  >
                    📱
                  </button>
                </div>
                
                <div className="space-y-3">
                  {shareLinks.map((link, index) => (
                    <motion.div
                      key={link.name}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <h3 className={`text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {link.icon} {link.name}
                      </h3>
                      <div className={`relative flex items-center rounded-lg border px-3 py-2 ${
                        theme === 'dark' 
                          ? 'bg-[rgba(15,15,25,0.8)] border-gray-800/60' 
                          : 'bg-gray-50 border-gray-200'
                      }`}>
                        <input 
                          type="text" 
                          value={link.value} 
                          readOnly 
                          className={`flex-1 text-xs font-mono truncate bg-transparent border-0 focus:outline-none focus:ring-0 select-all ${
                            theme === 'dark' ? 'text-gray-100' : 'text-gray-800'
                          }`}
                        />
                        <button 
                          onClick={() => copyToClipboard(link.value, link.name.toLowerCase())}
                          className={`ml-2 p-1.5 rounded-md transition-colors ${
                            theme === 'dark' 
                              ? 'bg-gray-700/50 hover:bg-gray-700' 
                              : 'bg-gray-200 hover:bg-gray-300'
                          }`}
                        >
                          {copied === link.name.toLowerCase() ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-2M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>

                                 {/* QR Code */}
                 <AnimatePresence>
                   {showQR && (
                     <motion.div
                       initial={{ opacity: 0, height: 0 }}
                       animate={{ opacity: 1, height: 'auto' }}
                       exit={{ opacity: 0, height: 0 }}
                       className={`mt-4 pt-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}
                     >
                       <div className="text-center">
                         <h3 className={`text-sm font-medium mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                           📱 QR Code for Mobile Sharing
                         </h3>
                         <div className={`inline-block p-4 rounded-xl border-2 ${
                           theme === 'dark' 
                             ? 'bg-white border-purple-500/30 shadow-lg shadow-purple-500/20' 
                             : 'bg-white border-purple-500/50 shadow-lg shadow-purple-500/10'
                         }`}>
                           {qrCodeUrl ? (
                             <Image
                               src={qrCodeUrl}
                               alt="QR Code for image URL"
                               className="rounded-lg"
                               width={140}
                               height={140}
                             />
                           ) : (
                             <div className="w-[140px] h-[140px] flex items-center justify-center bg-gray-100 rounded-lg">
                               <div className="text-center">
                                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
                                 <p className="text-xs text-gray-600">Generating QR...</p>
                               </div>
                             </div>
                           )}
                         </div>
                         <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                           Scan with your phone to open image
                         </p>
                       </div>
                                          </motion.div>
                   )}
                 </AnimatePresence>
              </div>



              {/* Download Options */}
              <div className="space-y-3">
                <button
                  onClick={downloadFile}
                  className="block w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg text-center transition-all transform hover:scale-105"
                >
                  💾 Download Original
                </button>
               
               <button
                 onClick={() => window.open(fileInfo.url, '_blank')}
                 className={`w-full py-3 px-4 font-medium rounded-lg text-center transition-all transform hover:scale-105 ${
                   theme === 'dark' 
                     ? 'bg-gray-700 text-white hover:bg-gray-600' 
                     : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                 }`}
               >
                 🔗 Open in New Tab
               </button>
             </div>
            </motion.div>
          </div>

          {/* Keyboard Shortcuts Help */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className={`mt-8 p-4 rounded-lg border ${
              theme === 'dark' 
                ? 'bg-[rgba(20,20,35,0.3)] border-gray-800/40 text-gray-400' 
                : 'bg-gray-100 border-gray-200 text-gray-600'
            }`}
          >
            <h3 className="font-medium mb-2">⌨️ Keyboard Shortcuts:</h3>
            <div className="text-sm grid grid-cols-2 md:grid-cols-4 gap-2">
              <span><kbd className="px-1 py-0.5 bg-gray-600 text-white rounded text-xs">F</kbd> Fullscreen</span>
              <span><kbd className="px-1 py-0.5 bg-gray-600 text-white rounded text-xs">I</kbd> Toggle Info</span>
              <span><kbd className="px-1 py-0.5 bg-gray-600 text-white rounded text-xs">+/-</kbd> Zoom</span>
              <span><kbd className="px-1 py-0.5 bg-gray-600 text-white rounded text-xs">0</kbd> Reset</span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
} 