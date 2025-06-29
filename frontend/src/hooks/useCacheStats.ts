import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

const cacheQueryKeys = {
  cacheStats: ['admin', 'cache', 'stats'] as const,
  cacheKeys: ['admin', 'cache', 'keys'] as const,
  cacheKeyInfo: (key: string) => ['admin', 'cache', 'key', key] as const,
} as const;

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  hitRate: string;
  size: number;
  type?: string;
  backend?: string;
  ping?: boolean;
  redisHealthy?: boolean;
  fallbackAvailable?: boolean;
  redisAvailable?: boolean;
  error?: string;
  redisError?: string;
}

interface CacheKeysResponse {
  success: boolean;
  keys: string[];
  count: number;
  pattern: string;
}

interface CacheKeyInfo {
  exists: boolean;
  ttl: number;
  ttlHuman: string;
  error?: string;
}

interface CacheKeyInfoResponse {
  success: boolean;
  key: string;
  info: CacheKeyInfo;
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

const fetchCacheKeys = async (userEmail: string, pattern: string = '*'): Promise<string[]> => {
  const response = await fetch(`/api/admin/cache/keys?pattern=${encodeURIComponent(pattern)}`, {
    headers: {
      'Content-Type': 'application/json',
      'user-email': userEmail,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch cache keys');
  }
  
  const data: CacheKeysResponse = await response.json();
  return data.keys;
};

const fetchCacheKeyInfo = async (userEmail: string, key: string): Promise<CacheKeyInfo> => {
  const response = await fetch(`/api/admin/cache/keys/${encodeURIComponent(key)}`, {
    headers: {
      'Content-Type': 'application/json',
      'user-email': userEmail,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch cache key info');
  }
  
  const data: CacheKeyInfoResponse = await response.json();
  return data.info;
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

  const useCacheKeys = (pattern: string = '*') => {
    return useQuery({
      queryKey: [...cacheQueryKeys.cacheKeys, pattern],
      queryFn: () => {
        if (!user || user.role !== 'ADMIN') {
          throw new Error('Admin access required');
        }
        return fetchCacheKeys(user.email, pattern);
      },
      enabled: !!user && user.role === 'ADMIN',
      staleTime: 10 * 1000,
      gcTime: 1 * 60 * 1000,
    });
  };

  const useCacheKeyInfo = (key: string) => {
    return useQuery({
      queryKey: cacheQueryKeys.cacheKeyInfo(key),
      queryFn: () => {
        if (!user || user.role !== 'ADMIN') {
          throw new Error('Admin access required');
        }
        return fetchCacheKeyInfo(user.email, key);
      },
      enabled: !!user && user.role === 'ADMIN' && !!key,
      staleTime: 5 * 1000,
      gcTime: 30 * 1000,
    });
  };

  return {
    ...query,
    refreshStats,
    clearAllCache,
    clearSpecificCache,
    useCacheKeys,
    useCacheKeyInfo,
  };
}; 