"use client";

import { useRef, useEffect, useState } from 'react';
import Image from 'next/image';
import AnimatedGradientBorder from "@/components/ui/AnimatedGradientBorder";

interface FilePreviewProps {
  preview: string | null;
}

export default function FilePreview({ preview }: FilePreviewProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!preview) return;

    // Create a new image to get the natural dimensions
    const img = new window.Image();
    img.onload = () => {
      setDimensions({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    };
    img.src = preview;

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
  }, [preview]);

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

  return (
    <div className="flex-grow flex items-center justify-center h-full p-3" ref={containerRef}>
      <AnimatedGradientBorder className="bg-gray-900/80 backdrop-blur-sm focus:outline-none focus:ring-0 rounded-xl overflow-hidden flex items-center justify-center">
        <div className="flex items-center justify-center w-full h-full">
          <Image 
            ref={imageRef}
            src={preview} 
            alt="Preview" 
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
        </div>
      </AnimatedGradientBorder>
    </div>
  );
} 