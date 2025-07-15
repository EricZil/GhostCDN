"use client";

import { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import UploadModal from "@/components/UploadModal";
import AuthModal from "@/components/auth/AuthModal";
import MaintenanceMode from "@/components/MaintenanceMode";
import { PointerHighlight } from "@/components/PointerHighlight";
import { useSettings } from "@/contexts/SettingsContext";
import { useSystemMessages } from "@/hooks/useSystemMessages";

interface SystemMessage {
  id: string;
  title: string;
  content: string;
  type: 'CRITICAL' | 'WARNING' | 'INFO';
  createdAt: string;
}

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [initialFile, setInitialFile] = useState<File | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { settings } = useSettings();
  
  // Use cached system messages
  const { data: systemMessages = [] } = useSystemMessages();

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => {
    setIsModalOpen(false);
    setInitialFile(null); // Reset the initial file when modal closes
  };

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  // Function to close all modals when home icon is clicked
  const closeAllModals = () => {
    setIsModalOpen(false);
    setIsAuthModalOpen(false);
    setInitialFile(null);
  };

  // System messages are now loaded via React Query hook above

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
    // Only add event listeners on client side
    if (typeof window === 'undefined') return;
    
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
    // System messages are now loaded automatically via React Query
  }, []);

  const getMessageTypeStyles = (type: SystemMessage['type']) => {
    switch (type) {
      case 'CRITICAL':
        return 'bg-red-500/20 border-red-400/40 text-red-300 shadow-red-500/20';
      case 'WARNING':
        return 'bg-amber-500/20 border-amber-400/40 text-amber-300 shadow-amber-500/20';
      case 'INFO':
        return 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300 shadow-cyan-500/20';
      default:
        return 'bg-gray-500/20 border-gray-400/40 text-gray-300 shadow-gray-500/20';
    }
  };

  const getMessageIcon = (type: SystemMessage['type']) => {
    switch (type) {
      case 'CRITICAL':
        return '🔴';
      case 'WARNING':
        return '🟡';
      case 'INFO':
        return '🔵';
      default:
        return 'ℹ️';
    }
  };

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
      
      {/* System Messages - Repositioned */}
      {systemMessages.length > 0 && (
        <div className="fixed top-6 right-6 z-30 w-full max-w-sm">
          <div className="space-y-2">
            {systemMessages.map((message) => (
              <div
                key={message.id}
                className={`p-3 rounded-xl border backdrop-blur-md ${getMessageTypeStyles(message.type)} transition-all duration-500 hover:scale-105 shadow-lg`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-sm flex-shrink-0 mt-0.5">
                    {getMessageIcon(message.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-xs mb-1 tracking-wide">
                      {message.title}
                    </h3>
                    <p className="text-xs opacity-90 leading-relaxed">
                      {message.content}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Main content - centered logo */}
      <div className="container mx-auto px-4 flex flex-col items-center justify-center min-h-screen py-16 relative z-10">
        {/* Enterprise Header */}
        <div className={`text-center transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'} mb-12`}>
          {/* Trust Indicators */}
          <div className="flex items-center justify-center gap-6 mb-6 text-sm text-blue-300/70 font-medium tracking-wider">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>99.9% UPTIME</span>
            </div>
            <div className="w-px h-4 bg-blue-500/30"></div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span>&lt;50MS LATENCY</span>
            </div>
            <div className="w-px h-4 bg-blue-500/30"></div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              <span>150+ EDGE LOCATIONS</span>
            </div>
          </div>
          
          {/* Main Logo */}
          <h1 className="flex items-center justify-center mb-4">
            <span className="text-7xl md:text-8xl lg:text-9xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 tracking-tight font-geist-mono whitespace-nowrap hover:scale-105 transition-transform duration-500">
              GHOST&nbsp;
            </span>
            <PointerHighlight 
              rectangleClassName="border-cyan-400/60 dark:border-cyan-400/60"
              pointerClassName="text-cyan-400"
              containerClassName="inline-block"
            >
              <span className="text-7xl md:text-8xl lg:text-9xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 tracking-tight font-geist-mono whitespace-nowrap">
                CDN
              </span>
            </PointerHighlight>
          </h1>
          
          {/* Enterprise Subtitle */}
          <div className="text-lg md:text-xl text-cyan-300/80 font-medium tracking-[0.2em] mb-6 font-geist-mono">
            ENTERPRISE CONTENT DELIVERY NETWORK
          </div>
        </div>
        
        {/* Enhanced Tagline */}
        <div className={`transition-all duration-1000 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} mb-16`}>
          <p className="ghost-tagline text-center max-w-4xl text-3xl md:text-4xl lg:text-5xl font-medium text-white/95 font-geist-mono leading-relaxed">
            One upload. <span className="text-cyan-400">Global delivery.</span>
          </p>
        </div>
      </div>
      
      {/* Upload Modal */}
      <UploadModal isOpen={isModalOpen} onClose={closeModal} initialFile={initialFile} onOpenAuth={openAuthModal} />
      
      {/* Auth Modal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />
      
      {/* Navbar */}
      <Navbar onUploadClick={openModal} onOpenAuth={openAuthModal} onHomeClick={closeAllModals} />
      
      {/* Maintenance Mode Overlay */}
      <MaintenanceMode isActive={settings?.maintenanceMode || false} />
    </div>
  );
}
