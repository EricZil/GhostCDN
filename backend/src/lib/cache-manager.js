const { cache: redisCache } = require('./redis-cache');

class CacheManager {
  constructor() {
    this.redisAvailable = false;
    this.checkRedisConnection();
    
    // Check Redis connection every 30 seconds
    setInterval(() => {
      this.checkRedisConnection();
    }, 30000);
    
    // Define standard namespaces
    this.namespaces = {
      USER: 'user',
      FILE: 'file',
      UPLOAD: 'upload',
      STORAGE: 'storage',
      ANALYTICS: 'analytics',
      SYSTEM: 'system',
      SETTINGS: 'settings'
    };
  }
  
  async checkRedisConnection() {
    try {
      const isHealthy = await redisCache.ping();
      if (isHealthy && !this.redisAvailable) {
        console.log('[Cache Manager] Redis connection established');
        this.redisAvailable = true;
      } else if (!isHealthy && this.redisAvailable) {
        console.log('[Cache Manager] Redis connection lost');
        this.redisAvailable = false;
      }
    } catch (error) {
      if (this.redisAvailable) {
        console.log('[Cache Manager] Redis connection failed');
        this.redisAvailable = false;
      }
    }
  }
  
  /**
   * Store data in cache with TTL
   * @param {string} key - Cache key
   * @param {any} value - Data to cache
   * @param {number} ttl - Time to live in milliseconds (default: 10 minutes)
   * @param {string} namespace - Optional namespace for the key
   * @returns {Promise<boolean>} - Success status
   */
  async set(key, value, ttl = 600000, namespace = 'general') {
    if (!this.redisAvailable) {
      console.warn('[Cache Manager] Redis not available, cache operation skipped');
      return false;
    }

    try {
      return await redisCache.set(key, value, ttl, { namespace, version: redisCache.globalVersion });
    } catch (error) {
      console.error('[Cache Manager] Redis set failed:', error);
      return false;
    }
  }
  
  /**
   * Retrieve data from cache
   * @param {string} key - Cache key
   * @param {string} namespace - Optional namespace for the key
   * @returns {Promise<any|null>} - Cached data or null
   */
  async get(key, namespace = 'general') {
    if (!this.redisAvailable) {
      console.warn('[Cache Manager] Redis not available, cache operation skipped');
      return null;
    }

    try {
      return await redisCache.get(key, { namespace, version: redisCache.globalVersion });
    } catch (error) {
      console.error('[Cache Manager] Redis get failed:', error);
      return null;
    }
  }
  
  /**
   * Delete specific cache entry
   * @param {string} key - Cache key
   * @param {string} namespace - Optional namespace for the key
   * @returns {Promise<boolean>} - Success status
   */
  async delete(key, namespace = 'general') {
    if (!this.redisAvailable) {
      console.warn('[Cache Manager] Redis not available, cache operation skipped');
      return false;
    }

    try {
      return await redisCache.delete(key, { namespace, version: redisCache.globalVersion });
    } catch (error) {
      console.error('[Cache Manager] Redis delete failed:', error);
      return false;
    }
  }
  
  /**
   * Clear entire cache or a specific namespace
   * @param {string} [namespace] - Optional namespace to clear, if not provided clears all cache
   * @returns {Promise<boolean>} - Success status
   */
  async clear(namespace) {
    if (!this.redisAvailable) {
      console.warn('[Cache Manager] Redis not available, cache operation skipped');
      return false;
    }

    try {
      if (namespace) {
        // Clear just the specified namespace
        const count = await redisCache.deleteNamespace(namespace);
        return count > 0;
      } else {
        // Clear all cache
        return await redisCache.clear();
      }
    } catch (error) {
      console.error('[Cache Manager] Redis clear failed:', error);
      return false;
    }
  }
  
  /**
   * Invalidate a namespace by incrementing its version
   * @param {string} namespace - Namespace to invalidate
   * @returns {Promise<string|null>} - New version number or null on failure
   */
  async invalidateNamespace(namespace) {
    if (!this.redisAvailable) {
      console.warn('[Cache Manager] Redis not available, cache operation skipped');
      return null;
    }

    try {
      return await redisCache.incrementNamespaceVersion(namespace);
    } catch (error) {
      console.error('[Cache Manager] Failed to invalidate namespace:', error);
      return null;
    }
  }
  
  /**
   * Store multiple items in cache at once
   * @param {Array<{key: string, value: any, ttl?: number, namespace?: string}>} items - Items to cache
   * @returns {Promise<boolean>} - Success status
   */
  async mset(items) {
    if (!this.redisAvailable) {
      console.warn('[Cache Manager] Redis not available, cache operation skipped');
      return false;
    }

    try {
      return await redisCache.mset(items);
    } catch (error) {
      console.error('[Cache Manager] Redis bulk set failed:', error);
      return false;
    }
  }
  
  /**
   * Get cache statistics
   * @returns {Promise<object>} - Cache stats
   */
  async getStats() {
    if (!this.redisAvailable) {
      return {
        hits: 0,
        misses: 0,
        sets: 0,
        errors: 0,
        hitRate: '0%',
        size: 0,
        backend: 'Redis (Upstash)',
        redisAvailable: false,
        fallbackAvailable: false
      };
    }

    try {
      const stats = await redisCache.getStats();
      return {
        ...stats,
        backend: 'Redis (Upstash)',
        redisAvailable: true,
        redisHealthy: true,
        fallbackAvailable: false
      };
    } catch (error) {
      console.error('[Cache Manager] Redis getStats failed:', error);
      return {
        hits: 0,
        misses: 0,
        sets: 0,
        errors: 0,
        hitRate: '0%',
        size: 0,
        backend: 'Redis (Upstash)',
        redisAvailable: false,
        redisHealthy: false,
        fallbackAvailable: false,
        redisError: error.message
      };
    }
  }
  
  /**
   * Check if Redis is responding
   * @returns {Promise<boolean>} - Redis health status
   */
  async ping() {
    try {
      return await redisCache.ping();
    } catch (error) {
      this.redisAvailable = false;
      return false;
    }
  }
  
  /**
   * Get information about a specific cache key
   * @param {string} key - Cache key
   * @param {string} namespace - Optional namespace for the key
   * @returns {Promise<object>} - Key information
   */
  async getKeyInfo(key, namespace = 'general') {
    if (!this.redisAvailable) {
      return { error: 'Redis not available' };
    }

    try {
      return await redisCache.getKeyInfo(key, { namespace, version: redisCache.globalVersion });
    } catch (error) {
      console.error('[Cache Manager] Redis getKeyInfo failed:', error);
      return { error: 'Failed to get key info: ' + error.message };
    }
  }
  
  /**
   * List cache keys matching a pattern
   * @param {string} pattern - Pattern to match
   * @returns {Promise<string[]>} - List of matching keys
   */
  async listKeys(pattern = '*') {
    if (!this.redisAvailable) {
      return [];
    }

    try {
      return await redisCache.listKeys(pattern);
    } catch (error) {
      console.error('[Cache Manager] Redis listKeys failed:', error);
      return [];
    }
  }
  
  /**
   * Destroy cache connections
   */
  destroy() {
    if (this.redisAvailable) {
      redisCache.destroy();
    }
  }
}

// Create singleton instance
const cache = new CacheManager();

// Graceful shutdown handlers
process.on('SIGTERM', () => {
  console.log('[Cache Manager] Shutting down cache manager...');
  cache.destroy();
});

process.on('SIGINT', () => {
  console.log('[Cache Manager] Shutting down cache manager...');
  cache.destroy();
});

module.exports = { cache }; 