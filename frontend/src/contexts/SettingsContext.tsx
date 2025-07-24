"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { captureException, addBreadcrumb, trackApiCall } from '@/lib/sentry';

interface SystemSettings {
  maintenanceMode: boolean;
  userRegistration: boolean;
  guestUploadLimit: number;
  maxFileSize: number;
  userStorageLimit?: number;
}

interface SettingsContextType {
  settings: SystemSettings | null;
  loading: boolean;
  error: string | null;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      addBreadcrumb('Fetching system settings', 'api');
      
      const data = await trackApiCall('/api/proxy?endpoint=public/settings', 'GET', async () => {
        const response = await fetch('/api/proxy?endpoint=public/settings');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch settings: ${response.status} ${response.statusText}`);
        }
        
        return await response.json();
      });
      
      setSettings(data);
      addBreadcrumb('System settings loaded successfully', 'api', { settingsCount: Object.keys(data).length });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch settings';
      setError(errorMessage);
      
      captureException(err as Error, {
        component: 'SettingsContext',
        action: 'fetchSettings',
        endpoint: '/api/proxy?endpoint=public/settings'
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshSettings = async () => {
    await fetchSettings();
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, error, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};