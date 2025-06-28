import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

const cacheQueryKeys = {
  cacheStats: ['admin', 'cache', 'stats'] as const,
} as const;

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  hitRate: string;
  size: number;
}

interface CacheStatsResponse {
  success: boolean;
  cache: CacheStats;
  timestamp: string;
}

const fetchCacheStats = async (userEmail: string): Promise<CacheStats> => {
  const response = await fetch('/api/admin/cache/stats', {
    headers: {
      'Content-Type': 'application/json',
      'user-email': userEmail,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch cache statistics');
  }
  
  const data: CacheStatsResponse = await response.json();
  return data.cache;
};

const clearCache = async (userEmail: string, key?: string): Promise<void> => {
  const url = key ? `/api/admin/cache?key=${encodeURIComponent(key)}` : '/api/admin/cache';
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'user-email': userEmail,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to clear cache');
  }
};

export const useCacheStats = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: cacheQueryKeys.cacheStats,
    queryFn: () => {
      if (!user || user.role !== 'ADMIN') {
        throw new Error('Admin access required');
      }
      return fetchCacheStats(user.email);
    },
    enabled: !!user && user.role === 'ADMIN',
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const refreshStats = () => {
    queryClient.invalidateQueries({ queryKey: cacheQueryKeys.cacheStats });
  };

  const clearAllCache = async () => {
    if (!user || user.role !== 'ADMIN') {
      throw new Error('Admin access required');
    }
    
    await clearCache(user.email);
    refreshStats();
  };

  const clearSpecificCache = async (key: string) => {
    if (!user || user.role !== 'ADMIN') {
      throw new Error('Admin access required');
    }
    
    await clearCache(user.email, key);
    refreshStats();
  };

  return {
    ...query,
    refreshStats,
    clearAllCache,
    clearSpecificCache,
  };
}; 