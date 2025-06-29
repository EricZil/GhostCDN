const { cache: redisCache } = require('./redis-cache');
const { cache: simpleCache } = require('./cache');

class CacheManager {
  constructor() {
    this.redisAvailable = false;
    this.checkRedisConnection();
    
    // Check Redis connection every 30 seconds
    setInterval(() => {
      this.checkRedisConnection();
    }, 30000);
  }
  
  async checkRedisConnection() {
    try {
      const isHealthy = await redisCache.ping();
      if (isHealthy && !this.redisAvailable) {
        console.log('[Cache Manager] Redis connection established');
        this.redisAvailable = true;
      } else if (!isHealthy && this.redisAvailable) {
        console.log('[Cache Manager] Redis connection lost, falling back to simple cache');
        this.redisAvailable = false;
      }
    } catch (error) {
      if (this.redisAvailable) {
        console.log('[Cache Manager] Redis connection failed, falling back to simple cache');
        this.redisAvailable = false;
      }
    }
  }
  
  async set(key, value, ttl = 600000) {
    if (this.redisAvailable) {
      try {
        return await redisCache.set(key, value, ttl);
      } catch (error) {
        console.error('[Cache Manager] Redis set failed, using simple cache:', error);
        this.redisAvailable = false;
        return simpleCache.set(key, value, ttl);
      }
    } else {
      return simpleCache.set(key, value, ttl);
    }
  }
  
  async get(key) {
    if (this.redisAvailable) {
      try {
        return await redisCache.get(key);
      } catch (error) {
        console.error('[Cache Manager] Redis get failed, using simple cache:', error);
        this.redisAvailable = false;
        return simpleCache.get(key);
      }
    } else {
      return simpleCache.get(key);
    }
  }
  
  async delete(key) {
    if (this.redisAvailable) {
      try {
        return await redisCache.delete(key);
      } catch (error) {
        console.error('[Cache Manager] Redis delete failed, using simple cache:', error);
        this.redisAvailable = false;
        return simpleCache.delete(key);
      }
    } else {
      return simpleCache.delete(key);
    }
  }
  
  async clear() {
    if (this.redisAvailable) {
      try {
        return await redisCache.clear();
      } catch (error) {
        console.error('[Cache Manager] Redis clear failed, using simple cache:', error);
        this.redisAvailable = false;
        return simpleCache.clear();
      }
    } else {
      return simpleCache.clear();
    }
  }
  
  async getStats() {
    if (this.redisAvailable) {
      try {
        const stats = await redisCache.getStats();
        return {
          ...stats,
          backend: 'Redis (Upstash)',
          fallbackAvailable: true
        };
      } catch (error) {
        console.error('[Cache Manager] Redis getStats failed, using simple cache:', error);
        this.redisAvailable = false;
        const stats = simpleCache.getStats();
        return {
          ...stats,
          backend: 'Simple (Fallback)',
          redisError: error.message
        };
      }
    } else {
      const stats = simpleCache.getStats();
      return {
        ...stats,
        backend: 'Simple (Fallback)',
        redisAvailable: false
      };
    }
  }
  
  // Additional Redis-specific methods (fallback to no-op for simple cache)
  async ping() {
    if (this.redisAvailable) {
      try {
        return await redisCache.ping();
      } catch (error) {
        this.redisAvailable = false;
        return false;
      }
    }
    return false; // Simple cache doesn't support ping
  }
  
  async getKeyInfo(key) {
    if (this.redisAvailable) {
      try {
        return await redisCache.getKeyInfo(key);
      } catch (error) {
        this.redisAvailable = false;
        return { error: 'Redis not available' };
      }
    }
    return { error: 'Only available with Redis' };
  }
  
  async listKeys(pattern = '*') {
    if (this.redisAvailable) {
      try {
        return await redisCache.listKeys(pattern);
      } catch (error) {
        this.redisAvailable = false;
        return [];
      }
    }
    return []; // Simple cache doesn't support key listing
  }
  
  destroy() {
    if (this.redisAvailable) {
      redisCache.destroy();
    }
    simpleCache.destroy();
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