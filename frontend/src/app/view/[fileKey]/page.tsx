"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PointerHighlight } from "@/components/PointerHighlight";
import AnimatedGradientBorder from "@/components/ui/AnimatedGradientBorder";

export default function ImageViewer() {
  const params = useParams();
  const fileKey = decodeURIComponent(params.fileKey as string);
  
  const [copied, setCopied] = useState<string | false>(false);
  const [imageInfo, setImageInfo] = useState<{
    url: string;
    size?: number;
    width?: number;
    height?: number;
    type?: string;
    thumbnails?: {
      small: string;
      medium: string;
      large: string;
    }
  } | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    // Fetch image metadata or construct URL from fileKey
    async function fetchImageData() {
      try {
        setLoading(true);
        
        // For now, we'll just construct the URL from the fileKey
        // In the future, you might want to fetch metadata from the server
        const baseUrl = process.env.NEXT_PUBLIC_CDN_URL || 'https://cdn.gcdn.space';
        

        
        // The fileKey is already decoded, so we need to encode it properly for the URL
        const encodedFileKey = fileKey.split('/').map(part => encodeURIComponent(part)).join('/');
        const directUrl = `${baseUrl}/${encodedFileKey}`;
        

        
        // Load the image to get its dimensions
        const img = new window.Image();
        img.onload = () => {
          setImageInfo({
            url: directUrl,
            width: img.width,
            height: img.height,
            type: getFileTypeFromKey(fileKey),
          });
          setLoading(false);
        };
        
        img.onerror = () => {
          // Handle image loading error silently
          setImageError(true);
          setLoading(false);
        };
        
        img.src = directUrl;
      } catch {
        // Handle error silently
        setImageError(true);
        setLoading(false);
      }
    }
    
    fetchImageData();
  }, [fileKey]);
  
  // Helper function to get file type from key
  const getFileTypeFromKey = (key: string) => {
    const extension = key.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'JPEG';
      case 'png':
        return 'PNG';
      case 'gif':
        return 'GIF';
      case 'webp':
        return 'WebP';
      default:
        return extension?.toUpperCase() || 'Unknown';
    }
  };
  
  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(false), 2000);
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f19] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }
  
  if (imageError || !imageInfo) {
    return (
      <div className="min-h-screen bg-[#0f0f19] flex items-center justify-center">
        <div className="max-w-md p-8 bg-[rgba(20,20,35,0.95)] rounded-xl border border-gray-800/60 shadow-lg">
          <h1 className="text-2xl font-bold text-white mb-4">Image not found</h1>
          <p className="text-gray-300 mb-6">{errorMessage || "The requested image could not be found."}</p>
          <Link href="/" className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[#0f0f19] py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header with logo */}
        <div className="flex justify-between items-center mb-8">
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
        </div>
        
        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Image preview */}
          <div className="lg:col-span-2">
            <div className="aspect-video relative">
              <AnimatedGradientBorder containerClassName="absolute inset-0">
                <div className="bg-[#0f0f19] w-full h-full flex items-center justify-center">
                  <div className="relative max-w-full max-h-full flex items-center justify-center" style={{ height: '100%', width: '100%' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={imageInfo.url} 
                      alt={fileKey} 
                      className="max-w-full max-h-full object-contain"
                      style={{ maxHeight: '100%', maxWidth: '100%' }}
                      onLoad={() => {}}
                      onError={() => {
                        setErrorMessage('Failed to load image');
                      }}
                    />
                  </div>
                </div>
              </AnimatedGradientBorder>
            </div>
          </div>
          
          {/* Image info and links */}
          <div className="space-y-6">
            {/* File details */}
            <div className="bg-[rgba(20,20,35,0.5)] rounded-xl p-6 border border-gray-800/40 shadow-lg">
              <h2 className="text-xl font-bold text-white mb-4">File Details</h2>
              
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">Filename</h3>
                  <p className="text-white font-medium truncate">{fileKey}</p>
                </div>
                
                {imageInfo.type && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-1">Type</h3>
                    <p className="text-white font-medium">{imageInfo.type}</p>
                  </div>
                )}
                
                {imageInfo.width && imageInfo.height && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-1">Dimensions</h3>
                    <p className="text-white font-medium">{imageInfo.width} × {imageInfo.height} px</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Links section */}
            <div className="bg-[rgba(20,20,35,0.5)] rounded-xl p-6 border border-gray-800/40 shadow-lg">
              <h2 className="text-xl font-bold text-white mb-4">Links</h2>
              
              <div className="space-y-4">
                {/* Direct link */}
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">Direct Link</h3>
                  <div className="relative flex items-center rounded-lg bg-[rgba(15,15,25,0.8)] border border-gray-800/60 px-3 py-2">
                    <input 
                      type="text" 
                      value={imageInfo.url} 
                      readOnly 
                      className="flex-1 text-xs font-mono text-gray-100 truncate bg-transparent border-0 focus:outline-none focus:ring-0 select-all"
                    />
                    <button 
                      onClick={() => copyToClipboard(imageInfo.url, 'direct')}
                      className="ml-2 p-1.5 rounded-md bg-gray-700/50 hover:bg-gray-700 transition-colors"
                    >
                      {copied === 'direct' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-2M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                
                {/* Markdown */}
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">Markdown</h3>
                  <div className="relative flex items-center rounded-lg bg-[rgba(15,15,25,0.8)] border border-gray-800/60 px-3 py-2">
                    <input 
                      type="text" 
                      value={`![Image](${imageInfo.url})`} 
                      readOnly 
                      className="flex-1 text-xs font-mono text-gray-100 truncate bg-transparent border-0 focus:outline-none focus:ring-0 select-all"
                    />
                    <button 
                      onClick={() => copyToClipboard(`![Image](${imageInfo.url})`, 'markdown')}
                      className="ml-2 p-1.5 rounded-md bg-gray-700/50 hover:bg-gray-700 transition-colors"
                    >
                      {copied === 'markdown' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-2M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                
                {/* HTML */}
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">HTML</h3>
                  <div className="relative flex items-center rounded-lg bg-[rgba(15,15,25,0.8)] border border-gray-800/60 px-3 py-2">
                    <input 
                      type="text" 
                      value={`<img src="${imageInfo.url}" alt="Image" />`} 
                      readOnly 
                      className="flex-1 text-xs font-mono text-gray-100 truncate bg-transparent border-0 focus:outline-none focus:ring-0 select-all"
                    />
                    <button 
                      onClick={() => copyToClipboard(`<img src="${imageInfo.url}" alt="Image" />`, 'html')}
                      className="ml-2 p-1.5 rounded-md bg-gray-700/50 hover:bg-gray-700 transition-colors"
                    >
                      {copied === 'html' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-2M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Download button */}
            <a 
              href={imageInfo.url} 
              download={fileKey}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg text-center transition-all"
            >
              Download Image
            </a>
          </div>
        </div>
        
        {/* Footer */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} GhostCDN - Fast, simple image hosting</p>
        </div>
      </div>
    </div>
  );
} 