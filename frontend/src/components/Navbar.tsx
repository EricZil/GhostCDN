"use client";

import { useCallback, useState, useEffect } from "react";
import Link from "next/link";
import SettingsModal from "./auth/SettingsModal";
import DashboardModal from "./DashboardModal";
import { useAuth } from "@/contexts/AuthContext";
import { getGravatarUrl } from "@/utils/gravatar";
import Image from "next/image";

interface NavbarProps {
  onUploadClick?: () => void;
  onOpenAuth?: () => void;
  onHomeClick?: () => void;
}

export default function Navbar({ onUploadClick, onOpenAuth, onHomeClick }: NavbarProps) {
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isDashboardModalOpen, setIsDashboardModalOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      if (user.image) {
        setAvatarUrl(user.image);
      } else if (user.email) {
        setAvatarUrl(getGravatarUrl(user.email, 64));
      }
    }
  }, [user]);

  // Prevent unnecessary re-renders with useCallback
  const handleUploadClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (onUploadClick) {
      onUploadClick();
    }
  }, [onUploadClick]);

  const handleAccountClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (isAuthenticated) {
      // Open settings modal if logged in
      setIsSettingsModalOpen(true);
    } else {
      // Open auth modal if not logged in
      onOpenAuth?.();
    }
  }, [isAuthenticated, onOpenAuth]);

  const handleDashboardClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (isAuthenticated) {
      setIsDashboardModalOpen(true);
    } else {
      // Redirect to auth modal if not logged in
      onOpenAuth?.();
    }
  }, [isAuthenticated, onOpenAuth]);

  const handleHomeClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    // Close any open modals
    setIsSettingsModalOpen(false);
    setIsDashboardModalOpen(false);
    // Call parent function to close other modals
    onHomeClick?.();
  }, [onHomeClick]);

  return (
    <>
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
        <nav className="flex items-center glass-nav rounded-full px-6 py-3 border border-[rgba(124,58,237,0.15)]">
          <div className="nav-item group relative mx-1">
            <span className="nav-label">Home</span>
            <button 
              onClick={handleHomeClick}
              className="flex items-center justify-center w-12 h-12 rounded-full glass-highlight"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="sr-only">Home</span>
            </button>
          </div>
          
          <div className="nav-item group relative mx-1">
            <span className="nav-label">Explore</span>
            <Link href="/explore" className="flex items-center justify-center w-12 h-12 rounded-full glass-highlight">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
              </svg>
              <span className="sr-only">Explore</span>
            </Link>
          </div>
          
          <div className="nav-item group relative mx-3">
            <span className="nav-label upload-label">Upload</span>
            <button 
              className="upload-button flex items-center justify-center w-16 h-16 rounded-full -mt-6 shadow-[0_0_15px_rgba(124,58,237,0.5)]"
              onClick={handleUploadClick}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span className="sr-only">Upload</span>
            </button>
          </div>
          
          {/* Dashboard - Only show for authenticated users */}
          {isAuthenticated && (
            <div className="nav-item group relative mx-1">
              <span className="nav-label">Dashboard</span>
              <button 
                onClick={handleDashboardClick}
                className="flex items-center justify-center w-12 h-12 rounded-full glass-highlight"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                <span className="sr-only">Dashboard</span>
              </button>
            </div>
          )}
          
          <div className="nav-item group relative mx-1">
            <span className="nav-label">Account</span>
            <button 
              onClick={handleAccountClick}
              className="flex items-center justify-center w-12 h-12 rounded-full glass-highlight"
            >
              {isAuthenticated && user ? (
                <div className="relative">
                  {/* User avatar when logged in */}
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-purple-600">
                    {avatarUrl ? (
                      <Image
                        src={avatarUrl}
                        alt={user.name || 'User'}
                        width={32}
                        height={32}
                        className="w-full h-full object-cover"
                        onError={() => {
                          // Fallback to initials if image fails
                          setAvatarUrl(null);
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white font-medium">
                        {user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-black rounded-full"></span>
                </div>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
              <span className="sr-only">Account</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Modals */}
      <SettingsModal 
        isOpen={isSettingsModalOpen} 
        onClose={() => setIsSettingsModalOpen(false)} 
      />
      <DashboardModal 
        isOpen={isDashboardModalOpen} 
        onClose={() => setIsDashboardModalOpen(false)} 
      />
    </>
  );
} 