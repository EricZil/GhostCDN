"use client";

import { useRef } from 'react';
import Image from 'next/image';
import AnimatedGradientBorder from "@/components/ui/AnimatedGradientBorder";

interface FilePreviewProps {
  preview: string | null;
}

export default function FilePreview({ preview }: FilePreviewProps) {
  const imageRef = useRef<HTMLImageElement>(null);

  if (!preview) return null;

  return (
    <div className="flex-grow flex items-center justify-center pr-6">
      <AnimatedGradientBorder className="bg-gray-900/80 backdrop-blur-sm focus:outline-none focus:ring-0">
        <Image 
          ref={imageRef}
          src={preview} 
          alt="Preview" 
          className="max-w-full max-h-[calc(100vh-100px)] object-contain focus:outline-none focus:ring-0"
          width={800}
          height={600}
          unoptimized // Using unoptimized because we're displaying a data URL
        />
      </AnimatedGradientBorder>
    </div>
  );
} 