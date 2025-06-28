class SimpleCache {
  constructor() {
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0
    };
    
    this.cleanupInterval = setInterval(() => this.cleanup(), 300000);
  }
  
  /**
   * Store data in cache with TTL
   * @param {string} key - Cache key
   * @param {any} value - Data to cache
   * @param {number} ttl - Time to live in milliseconds (default: 10 minutes)
   */
  set(key, value, ttl = 600000) {
    this.cache.set(key, {
      data: value,
      expires: Date.now() + ttl,
      createdAt: Date.now()
    });
    this.stats.sets++;
  }
  
  /**
   * Retrieve data from cache
   * @param {string} key - Cache key
   * @returns {any|null} - Cached data or null if not found/expired
   */
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }
    
    this.stats.hits++;
    return item.data;
  }
  
  /**
   * Delete specific cache entry
   * @param {string} key - Cache key to delete
   */
  delete(key) {
    return this.cache.delete(key);
  }
  
  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, sets: 0 };
  }
  
  /**
   * Get cache statistics
   * @returns {object} - Cache statistics
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? ((this.stats.hits / total) * 100).toFixed(2) + '%' : '0%',
      size: this.cache.size
    };
  }
  
  /**
   * Clean up expired cache entries
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`[Cache] Cleaned up ${cleaned} expired entries`);
    }
  }
  
  /**
   * Destroy cache and cleanup interval
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

const cache = new SimpleCache();
process.on('SIGTERM', () => {
  console.log('[Cache] Shutting down cache...');
  cache.destroy();
});

process.on('SIGINT', () => {
  console.log('[Cache] Shutting down cache...');
  cache.destroy();
});

module.exports = { cache }; 