"use client";

import { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import UploadModal from "@/components/UploadModal";
import { PointerHighlight } from "@/components/PointerHighlight";

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [initialFile, setInitialFile] = useState<File | null>(null);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => {
    setIsModalOpen(false);
    setInitialFile(null); // Reset the initial file when modal closes
  };

  // Handle drag events to open upload modal
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        setInitialFile(file);
        openModal();
      }
    }
  }, []);

  // Handle paste events (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        const pastedFile = e.clipboardData.files[0];
        if (pastedFile.type.startsWith('image/')) {
          e.preventDefault();
          setInitialFile(pastedFile);
          openModal();
        }
      }
    };
    
    // Add event listener for paste
    document.addEventListener('paste', handlePaste);
    
    // Clean up
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, []);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div 
      className="min-h-screen text-white relative select-none" 
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Grid background */}
      <div className="grid-background"></div>
      
      {/* Darker gradient overlay */}
      <div className="dark-gradient-bg"></div>
      
      {/* Main content - centered logo */}
      <div className="container mx-auto px-4 flex flex-col items-center justify-center min-h-screen py-16 relative z-10">
        <h1 className={`text-center transition-all duration-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} mb-8 flex items-center justify-center`}>
          <span className="text-7xl md:text-8xl lg:text-9xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-500 to-blue-600 tracking-tight font-geist-mono whitespace-nowrap">
            GHOST&nbsp;
          </span>
          <PointerHighlight 
            rectangleClassName="border-blue-500/50 dark:border-blue-500/50"
            pointerClassName="text-blue-500"
            containerClassName="inline-block"
          >
            <span className="text-7xl md:text-8xl lg:text-9xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-500 to-blue-600 tracking-tight font-geist-mono whitespace-nowrap">
              CDN
            </span>
          </PointerHighlight>
        </h1>
        
        <div className={`transition-all duration-700 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="ghost-tagline text-center max-w-3xl text-2xl md:text-3xl lg:text-4xl font-medium text-white/90 mb-8 font-geist-mono">
            One upload. Global delivery.
          </p>
        </div>
      </div>
      
      {/* Upload Modal */}
      <UploadModal isOpen={isModalOpen} onClose={closeModal} initialFile={initialFile} />
      
      {/* Navbar */}
      <Navbar onUploadClick={openModal} />
    </div>
  );
}
