"use client";

import { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import UploadModal from "@/components/UploadModal";
import AuthModal from "@/components/auth/AuthModal";
import MaintenanceMode from "@/components/MaintenanceMode";
import { PointerHighlight } from "@/components/PointerHighlight";
import { useSettings } from "@/contexts/SettingsContext";

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
  const [systemMessages, setSystemMessages] = useState<SystemMessage[]>([]);
  const { settings } = useSettings();

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => {
    setIsModalOpen(false);
    setInitialFile(null); // Reset the initial file when modal closes
  };

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  // Fetch system messages
  const fetchSystemMessages = useCallback(async () => {
    try {
      const response = await fetch('/api/proxy?endpoint=public/messages');
      if (response.ok) {
        const data = await response.json();
        setSystemMessages(data.messages || []);
      }
    } catch {
    }
  }, []);

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
    fetchSystemMessages();
  }, [fetchSystemMessages]);

  const getMessageTypeStyles = (type: SystemMessage['type']) => {
    switch (type) {
      case 'CRITICAL':
        return 'bg-red-500/10 border-red-500/30 text-red-400';
      case 'WARNING':
        return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400';
      case 'INFO':
        return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
      default:
        return 'bg-gray-500/10 border-gray-500/30 text-gray-400';
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
      
      {/* System Messages */}
      {systemMessages.length > 0 && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-30 w-full max-w-4xl px-4">
          <div className="space-y-3">
            {systemMessages.map((message) => (
              <div
                key={message.id}
                className={`p-4 rounded-lg border backdrop-blur-sm ${getMessageTypeStyles(message.type)} transition-all duration-300`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg flex-shrink-0 mt-0.5">
                    {getMessageIcon(message.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm mb-1">
                      {message.title}
                    </h3>
                    <p className="text-sm opacity-90 leading-relaxed">
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
      <UploadModal isOpen={isModalOpen} onClose={closeModal} initialFile={initialFile} onOpenAuth={openAuthModal} />
      
      {/* Auth Modal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />
      
      {/* Navbar */}
      <Navbar onUploadClick={openModal} onOpenAuth={openAuthModal} />
      
      {/* Maintenance Mode Overlay */}
      <MaintenanceMode isActive={settings?.maintenanceMode || false} />
    </div>
  );
}
