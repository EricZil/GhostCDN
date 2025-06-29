"use client";

import { createContext, useContext, ReactNode, useState } from 'react';
import { useSession, signIn, signOut, SessionProvider } from 'next-auth/react';
import { Role, User } from '../types/auth';
import BanNotificationModal from '@/components/auth/BanNotificationModal';

interface BanInfo {
  banType: string;
  reason: string;
  bannedAt: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
  checkBanStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AuthProviderContent>{children}</AuthProviderContent>
    </SessionProvider>
  );
}

function AuthProviderContent({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const isLoading = status === 'loading';
  const [error, setError] = useState<string | null>(null);
  const [showBanModal, setShowBanModal] = useState(false);
  const [banInfo, setBanInfo] = useState<BanInfo | null>(null);
  
  // Extract user from session
  const user = session?.user ? {
    id: session.user.id,
    email: session.user.email as string,
    name: session.user.name as string,
    role: session.user.role as Role,
    image: session.user.image,
    r2FolderName: session.user.r2FolderName,
    lastLogin: session.user.lastLogin,
  } : null;

  // Check ban status for authenticated users (only when called manually)
  const checkBanStatus = async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/auth/check-ban', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          email: user.email
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.banned) {
          setBanInfo(data.banInfo);
          setShowBanModal(true);
        }
      }
    } catch {
      // Continue on error to avoid breaking the app
    }
  };

  // Login function using NextAuth
  const login = async (email: string, password: string) => {
    try {
      setError(null);
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        // Handle ban-specific errors
        if (result.error.includes('Account Banned')) {
          setError('Your account has been suspended. Please contact support for assistance.');
        } else {
          setError(result.error);
        }
        throw new Error(result.error);
      }
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unknown error occurred during login');
      }
      throw error;
    }
  };

  // Register function
  const register = async (name: string, email: string, password: string) => {
    try {
      setError(null);
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Registration failed');
        throw new Error(data.error || 'Registration failed');
      }

      // User needs to verify email before signing in
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unknown error occurred during registration');
      }
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    setError(null);
    setShowBanModal(false);
    setBanInfo(null);
    await signOut({ redirect: false });
  };

  const handleCloseBanModal = () => {
    setShowBanModal(false);
    setBanInfo(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        error,
        checkBanStatus,
      }}
    >
      {children}
      
      {/* Ban Notification Modal */}
      {banInfo && (
        <BanNotificationModal
          isOpen={showBanModal}
          banInfo={banInfo}
          onClose={handleCloseBanModal}
        />
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 