const { Redis } = require('@upstash/redis');

class RedisCache {
  constructor() {
    try {
      // Initialize Upstash Redis client
      this.redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      
      // Local stats tracking (since Redis doesn't track these automatically)
      this.stats = {
        hits: 0,
        misses: 0,
        sets: 0,
        errors: 0
      };
      
      // Cache version - increment this to invalidate all cache entries when needed
      this.globalVersion = 'v1';
      
      // Key prefix to namespace all keys for this application
      this.keyPrefix = 'ghostcdn';
      
      console.log('[Redis Cache] Initialized Upstash Redis cache');
    } catch (error) {
      console.error('[Redis Cache] Failed to initialize Upstash Redis:', error.message);
    }
  }
  
  /**
   * Formats cache key using a consistent naming convention
   * @param {string} key - Original cache key
   * @param {string} namespace - Key namespace (e.g., 'user', 'file', 'stats')
   * @param {string} version - Version string (defaults to global version)
   * @returns {string} - Formatted cache key
   */
  formatKey(key, namespace = 'general', version = this.globalVersion) {
    // Clean the key to ensure it doesn't have invalid characters
    const cleanKey = String(key).replace(/:/g, '_');
    return `${this.keyPrefix}:${namespace}:${version}:${cleanKey}`;
  }
  
  /**
   * Store data in Redis cache with TTL
   * @param {string} key - Cache key
   * @param {any} value - Data to cache
   * @param {number} ttl - Time to live in milliseconds (default: 10 minutes)
   * @param {object} options - Additional options
   * @param {string} options.namespace - Key namespace
   * @param {string} options.version - Custom version string
   * @returns {Promise<boolean>} - Success status
   */
  async set(key, value, ttl = 600000, options = { namespace: 'general', version: this.globalVersion }) {
    const { namespace = 'general', version = this.globalVersion } = options;
    const formattedKey = this.formatKey(key, namespace, version);
    
    try {
      // Create cache data structure
      const cacheData = {
        data: value,
        createdAt: Date.now(),
        metadata: {
          originalKey: key,
          namespace,
          version
        }
      };
      
      // Convert TTL from milliseconds to seconds for Redis
      const ttlSeconds = Math.ceil(ttl / 1000);
      
      // With Upstash Redis, we directly store the object (no need for JSON.stringify)
      await this.redis.set(formattedKey, cacheData, { ex: ttlSeconds });
      
      this.stats.sets++;
      console.log(`[Redis Cache] Set key: ${formattedKey} with TTL: ${ttlSeconds}s`);
      return true;
    } catch (error) {
      this.stats.errors++;
      console.error(`[Redis Cache] Error setting cache for key ${formattedKey}:`, error);
      return false;
    }
  }
  
  /**
   * Retrieve data from Redis cache
   * @param {string} key - Cache key
   * @param {object} options - Additional options
   * @param {string} options.namespace - Key namespace
   * @param {string} options.version - Custom version string
   * @returns {Promise<any|null>} - Cached data or null if not found/expired
   */
  async get(key, options = { namespace: 'general', version: this.globalVersion }) {
    const { namespace = 'general', version = this.globalVersion } = options;
    const formattedKey = this.formatKey(key, namespace, version);
    
    try {
      const cached = await this.redis.get(formattedKey);
      
      if (cached === null || cached === undefined) {
        this.stats.misses++;
        console.log(`[Redis Cache] Cache miss for key: ${formattedKey}`);
        return null;
      }
      
      let cacheData;
      
      // Check if cached data is already an object (Upstash Redis might return objects directly)
      if (typeof cached === 'object') {
        cacheData = cached;
      } else {
        // If it's a string, try to parse it
        try {
          cacheData = JSON.parse(cached);
        } catch (parseError) {
          this.stats.errors++;
          console.error(`[Redis Cache] Error parsing cache data for key ${formattedKey}:`, parseError);
          return null;
        }
      }
      
      this.stats.hits++;
      console.log(`[Redis Cache] Cache hit for key: ${formattedKey}`);
      
      // Return the data field if it exists, otherwise return the whole object
      return cacheData.data !== undefined ? cacheData.data : cacheData;
    } catch (error) {
      this.stats.misses++;
      this.stats.errors++;
      console.error(`[Redis Cache] Error getting cache for key ${formattedKey}:`, error);
      return null;
    }
  }
  
  /**
   * Delete specific cache entry from Redis
   * @param {string} key - Cache key
   * @param {object} options - Additional options
   * @param {string} options.namespace - Key namespace
   * @param {string} options.version - Custom version string
   * @returns {Promise<boolean>} - Success status
   */
  async delete(key, options = { namespace: 'general', version: this.globalVersion }) {
    const { namespace = 'general', version = this.globalVersion } = options;
    const formattedKey = this.formatKey(key, namespace, version);
    
    try {
      const result = await this.redis.del(formattedKey);
      
      console.log(`[Redis Cache] Deleted key: ${formattedKey}, result: ${result}`);
      return result > 0;
    } catch (error) {
      this.stats.errors++;
      console.error(`[Redis Cache] Error deleting cache for key ${formattedKey}:`, error);
      return false;
    }
  }
  
  /**
   * Delete all cache entries in a namespace
   * @param {string} namespace - Namespace to clear
   * @returns {Promise<number>} - Number of keys deleted
   */
  async deleteNamespace(namespace) {
    try {
      const pattern = `${this.keyPrefix}:${namespace}:*`;
      const keys = await this.redis.keys(pattern);
      
      if (!keys || keys.length === 0) {
        return 0;
      }
      
      let deleted = 0;
      
      // Delete keys individually (Upstash may not support MDEL)
      for (const key of keys) {
        const result = await this.redis.del(key);
        deleted += result;
      }
      
      console.log(`[Redis Cache] Deleted ${deleted} keys from namespace: ${namespace}`);
      return deleted;
    } catch (error) {
      this.stats.errors++;
      console.error(`[Redis Cache] Error deleting namespace ${namespace}:`, error);
      return 0;
    }
  }
  
  /**
   * Clear all cache entries (use with caution in production)
   * @returns {Promise<boolean>} - Success status
   */
  async clear() {
    try {
      const allKeys = await this.redis.keys(`${this.keyPrefix}:*`);
      
      if (!allKeys || allKeys.length === 0) {
        console.log('[Redis Cache] No keys to clear');
        return true;
      }
      
      let deleted = 0;
      
      // Delete keys individually
      for (const key of allKeys) {
        const result = await this.redis.del(key);
        deleted += result;
      }
      
      this.stats = { hits: 0, misses: 0, sets: 0, errors: 0 };
      console.log(`[Redis Cache] Cleared all cache entries (${deleted} keys)`);
      return true;
    } catch (error) {
      this.stats.errors++;
      console.error('[Redis Cache] Error clearing cache:', error);
      return false;
    }
  }
  
  /**
   * Check if Redis connection is healthy
   * @returns {Promise<boolean>} - Connection status
   */
  async ping() {
    try {
      const result = await this.redis.ping();
      console.log('[Redis Cache] Ping result:', result);
      return result === 'PONG';
    } catch (error) {
      this.stats.errors++;
      console.error('[Redis Cache] Ping failed:', error);
      return false;
    }
  }
  
  /**
   * Get cache statistics
   * @returns {Promise<object>} - Cache statistics
   */
  async getStats() {
    try {
      let size = 0;
      try {
        const keys = await this.redis.keys(`${this.keyPrefix}:*`);
        size = keys ? keys.length : 0;
      } catch (e) {
        console.error('[Redis Cache] Error getting key count:', e);
      }
      
      const total = this.stats.hits + this.stats.misses;
      return {
        ...this.stats,
        hitRate: total > 0 ? ((this.stats.hits / total) * 100).toFixed(2) + '%' : '0%',
        size: size,
        type: 'Redis (Upstash)'
      };
    } catch (error) {
      this.stats.errors++;
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
   * List all cache keys (use with caution in production)
   * @param {string} pattern - Pattern to match keys (e.g., 'ghostcdn:user:*')
   * @returns {Promise<string[]>} - List of matching keys
   */
  async listKeys(pattern = '*') {
    try {
      if (!pattern.includes(':')) {
        // If no namespace provided in pattern, use the app prefix
        pattern = `${this.keyPrefix}:${pattern}`;
      }
      
      const keys = await this.redis.keys(pattern);
      return keys || [];
    } catch (error) {
      this.stats.errors++;
      console.error('[Redis Cache] Error listing keys:', error);
      return [];
    }
  }
  
  /**
   * Get cache key info (useful for debugging)
   * @param {string} key - Cache key
   * @param {object} options - Additional options
   * @param {string} options.namespace - Key namespace
   * @param {string} options.version - Custom version string
   * @returns {Promise<object>} - Key information object
   */
  async getKeyInfo(key, options = { namespace: 'general', version: this.globalVersion }) {
    const { namespace = 'general', version = this.globalVersion } = options;
    const formattedKey = this.formatKey(key, namespace, version);
    
    try {
      // Check if key exists
      const exists = await this.redis.exists(formattedKey);
      
      if (exists === 1) {
        // Get TTL
        const ttl = await this.redis.ttl(formattedKey);
        
        // Get value
        const value = await this.redis.get(formattedKey);
        let parsed;
        
        try {
          parsed = JSON.parse(value);
        } catch (e) {
          return {
            exists: true,
            ttl: ttl,
            ttlHuman: ttl > 0 ? `${ttl}s` : ttl === -1 ? 'no expiry' : 'expired/not exists',
            error: 'Could not parse JSON data'
          };
        }
        
        return {
          exists: true,
          ttl: ttl,
          ttlHuman: ttl > 0 ? `${ttl}s` : ttl === -1 ? 'no expiry' : 'expired/not exists',
          createdAt: parsed.createdAt,
          age: Math.round((Date.now() - parsed.createdAt) / 1000) + 's',
          metadata: parsed.metadata || {}
        };
      }
      
      return {
        exists: false,
        ttl: -2,
        ttlHuman: 'key does not exist'
      };
    } catch (error) {
      this.stats.errors++;
      console.error(`[Redis Cache] Error getting key info for ${formattedKey}:`, error);
      return { error: error.message };
    }
  }
  
  /**
   * Store multiple values in the cache at once
   * @param {Array<{key: string, value: any, ttl?: number, namespace?: string, version?: string}>} items - Items to cache
   * @returns {Promise<boolean>} - Success status
   */
  async mset(items) {
    if (!Array.isArray(items) || items.length === 0) {
      return false;
    }
    
    try {
      // Process items individually since we need to format data
      for (const item of items) {
        const { key, value, ttl = 600000, namespace = 'general', version = this.globalVersion } = item;
        await this.set(key, value, ttl, { namespace, version });
      }
      
      return true;
    } catch (error) {
      this.stats.errors++;
      console.error('[Redis Cache] Error in bulk set operation:', error);
      return false;
    }
  }
  
  /**
   * Increment a cache version for a namespace
   * Used to invalidate all cache entries in a namespace
   * @param {string} namespace - The namespace to update
   * @returns {Promise<string|null>} - New version or null on failure
   */
  async incrementNamespaceVersion(namespace) {
    try {
      const versionKey = `${this.keyPrefix}:versions:${namespace}`;
      const currentVersion = await this.redis.get(versionKey) || '0';
      const newVersion = (parseInt(currentVersion, 10) + 1).toString();
      
      await this.redis.set(versionKey, newVersion);
      console.log(`[Redis Cache] Incremented version for namespace ${namespace} to ${newVersion}`);
      return newVersion;
    } catch (error) {
      this.stats.errors++;
      console.error(`[Redis Cache] Error incrementing namespace version for ${namespace}:`, error);
      return null;
    }
  }
  
  /**
   * Get the current version for a namespace
   * @param {string} namespace - The namespace
   * @returns {Promise<string>} - Current version
   */
  async getNamespaceVersion(namespace) {
    try {
      const versionKey = `${this.keyPrefix}:versions:${namespace}`;
      const version = await this.redis.get(versionKey) || '1';
      return version;
    } catch (error) {
      console.error(`[Redis Cache] Error getting namespace version for ${namespace}:`, error);
      return '1';
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