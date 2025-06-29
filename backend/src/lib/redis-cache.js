const { Redis } = require('@upstash/redis');

class RedisCache {
  constructor() {
    // Initialize Upstash Redis client
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    
    // Local stats tracking (since Redis doesn't track these automatically)
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0
    };
    
    console.log('[Redis Cache] Initialized Upstash Redis cache');
  }
  
  /**
   * Store data in Redis cache with TTL
   * @param {string} key - Cache key
   * @param {any} value - Data to cache
   * @param {number} ttl - Time to live in milliseconds (default: 10 minutes)
   */
  async set(key, value, ttl = 600000) {
    try {
      const cacheData = {
        data: value,
        createdAt: Date.now()
      };
      
      // Convert TTL from milliseconds to seconds for Redis
      const ttlSeconds = Math.ceil(ttl / 1000);
      
      await this.redis.setex(key, ttlSeconds, JSON.stringify(cacheData));
      this.stats.sets++;
      
      console.log(`[Redis Cache] Set key: ${key} with TTL: ${ttlSeconds}s`);
    } catch (error) {
      console.error('[Redis Cache] Error setting cache:', error);
      throw error;
    }
  }
  
  /**
   * Retrieve data from Redis cache
   * @param {string} key - Cache key
   * @returns {any|null} - Cached data or null if not found/expired
   */
  async get(key) {
    try {
      const cached = await this.redis.get(key);
      
      if (!cached) {
        this.stats.misses++;
        console.log(`[Redis Cache] Cache miss for key: ${key}`);
        return null;
      }
      
      const cacheData = JSON.parse(cached);
      this.stats.hits++;
      
      console.log(`[Redis Cache] Cache hit for key: ${key}`);
      return cacheData.data;
    } catch (error) {
      console.error('[Redis Cache] Error getting cache:', error);
      this.stats.misses++;
      return null;
    }
  }
  
  /**
   * Delete specific cache entry from Redis
   * @param {string} key - Cache key to delete
   */
  async delete(key) {
    try {
      const result = await this.redis.del(key);
      console.log(`[Redis Cache] Deleted key: ${key}, result: ${result}`);
      return result > 0;
    } catch (error) {
      console.error('[Redis Cache] Error deleting cache:', error);
      return false;
    }
  }
  
  /**
   * Clear all cache entries (use with caution in production)
   */
  async clear() {
    try {
      await this.redis.flushdb();
      this.stats = { hits: 0, misses: 0, sets: 0 };
      console.log('[Redis Cache] Cleared all cache entries');
    } catch (error) {
      console.error('[Redis Cache] Error clearing cache:', error);
      throw error;
    }
  }
  
  /**
   * Get cache statistics
   * @returns {object} - Cache statistics
   */
  async getStats() {
    try {
      // Get Redis info for additional stats
      const info = await this.redis.dbsize();
      
      const total = this.stats.hits + this.stats.misses;
      return {
        ...this.stats,
        hitRate: total > 0 ? ((this.stats.hits / total) * 100).toFixed(2) + '%' : '0%',
        size: info || 0,
        type: 'Redis (Upstash)'
      };
    } catch (error) {
      console.error('[Redis Cache] Error getting stats:', error);
      const total = this.stats.hits + this.stats.misses;
      return {
        ...this.stats,
        hitRate: total > 0 ? ((this.stats.hits / total) * 100).toFixed(2) + '%' : '0%',
        size: 'unknown',
        type: 'Redis (Upstash)',
        error: 'Could not fetch Redis stats'
      };
    }
  }
  
  /**
   * Check if Redis connection is healthy
   */
  async ping() {
    try {
      const result = await this.redis.ping();
      console.log('[Redis Cache] Ping result:', result);
      return result === 'PONG';
    } catch (error) {
      console.error('[Redis Cache] Ping failed:', error);
      return false;
    }
  }
  
  /**
   * Get cache key info (useful for debugging)
   */
  async getKeyInfo(key) {
    try {
      const ttl = await this.redis.ttl(key);
      const exists = await this.redis.exists(key);
      
      return {
        exists: exists === 1,
        ttl: ttl,
        ttlHuman: ttl > 0 ? `${ttl}s` : ttl === -1 ? 'no expiry' : 'expired/not exists'
      };
    } catch (error) {
      console.error('[Redis Cache] Error getting key info:', error);
      return { error: error.message };
    }
  }
  
  /**
   * List all cache keys (use with caution in production)
   */
  async listKeys(pattern = '*') {
    try {
      const keys = await this.redis.keys(pattern);
      return keys;
    } catch (error) {
      console.error('[Redis Cache] Error listing keys:', error);
      return [];
    }
  }
  
  /**
   * Destroy cache connection (cleanup)
   */
  destroy() {
    console.log('[Redis Cache] Cache connection closed');
    // Upstash Redis doesn't require explicit connection closing
  }
}

// Create singleton instance
const cache = new RedisCache();

// Graceful shutdown handlers
process.on('SIGTERM', () => {
  console.log('[Redis Cache] Shutting down cache...');
  cache.destroy();
});

process.on('SIGINT', () => {
  console.log('[Redis Cache] Shutting down cache...');
  cache.destroy();
});

module.exports = { cache }; 