import { useQuery, useQueryClient } from '@tanstack/react-query';

// Query keys for consistent caching
export const queryKeys = {
  systemMessages: ['system-messages'] as const,
  systemSettings: ['system-settings'] as const,
} as const;

interface SystemMessage {
  id: string;
  title: string;
  content: string;
  type: 'CRITICAL' | 'WARNING' | 'INFO';
  createdAt: string;
}

interface SystemMessagesResponse {
  messages: SystemMessage[];
}

// Fetch function for system messages
const fetchSystemMessages = async (): Promise<SystemMessage[]> => {
  const response = await fetch('/api/proxy?endpoint=public/messages');
  
  if (!response.ok) {
    throw new Error('Failed to fetch system messages');
  }
  
  const data: SystemMessagesResponse = await response.json();
  return data.messages || [];
};

// Hook for fetching system messages with caching
export const useSystemMessages = () => {
  return useQuery({
    queryKey: queryKeys.systemMessages,
    queryFn: fetchSystemMessages,
    staleTime: 10 * 60 * 1000, // 10 minutes - system messages don't change often
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
    refetchOnWindowFocus: false,
    refetchInterval: 15 * 60 * 1000, // Refetch every 15 minutes in background
  });
};

// Hook for prefetching system messages (useful for preloading)
export const usePrefetchSystemMessages = () => {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.systemMessages,
      queryFn: fetchSystemMessages,
      staleTime: 10 * 60 * 1000,
    });
  };
}; 