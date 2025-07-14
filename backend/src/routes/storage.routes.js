const express = require('express');
const { cache } = require('../lib/cache-manager');
const prisma = require('../lib/prisma');
const { validateApiKey } = require('../middleware/apiKey.middleware');
const { checkAllBans } = require('../middleware/ban.middleware');

const router = express.Router();

// Apply middleware
router.use(validateApiKey);
router.use(checkAllBans);

// Get storage statistics - with caching
router.get('/stats', async (req, res) => {
  try {
    // Try to get from cache first using proper namespace
    const cacheKey = `storage-stats-${req.user?.id || 'guest'}`;
    const cachedStats = await cache.get(cacheKey, cache.namespaces.STORAGE);
    
    if (cachedStats) {
      console.log('Returning cached storage statistics');
      return res.json({
        success: true,
        data: cachedStats,
        fromCache: true
      });
    }
    
    // Cache miss - fetch from database
    console.log('Fetching storage statistics from database');
    
    const stats = await prisma.image.aggregate({
      where: {
        userId: req.user?.id || null
      },
      _count: {
        id: true
      },
      _sum: {
        fileSize: true
      }
    });
    
    // Calculate storage usage
    const storageStats = {
      totalFiles: stats._count.id || 0,
      totalSize: stats._sum.fileSize || 0,
      timestamp: new Date().toISOString(),
    };
    
    // Cache for 5 minutes (less frequently updated data)
    await cache.set(cacheKey, storageStats, 5 * 60 * 1000, cache.namespaces.STORAGE);
    
    return res.json({
      success: true,
      data: storageStats,
      fromCache: false
    });
  } catch (error) {
    console.error('Error getting storage stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch storage statistics'
    });
  }
});

// Invalidate storage cache when files are modified
router.post('/invalidate-cache', async (req, res) => {
  try {
    // Invalidate the entire storage namespace
    await cache.invalidateNamespace(cache.namespaces.STORAGE);
    
    return res.json({
      success: true,
      message: 'Storage cache invalidated'
    });
  } catch (error) {
    console.error('Error invalidating cache:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to invalidate cache'
    });
  }
});

// Bulk fetch storage items with batch caching
router.get('/items', async (req, res) => {
  try {
    const { ids } = req.query;
    
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({
        success: false,
        error: 'Must provide array of item ids'
      });
    }
    
    // Try to get all items from cache
    const itemPromises = ids.map(id => 
      cache.get(`storage-item-${id}`, cache.namespaces.STORAGE)
    );
    
    const cachedItems = await Promise.all(itemPromises);
    
    // Find which items we need to fetch from the database
    const missingIndexes = cachedItems.map((item, index) => 
      item === null ? index : -1
    ).filter(index => index !== -1);
    
    const missingIds = missingIndexes.map(index => ids[index]);
    
    // If all items were in cache, return them
    if (missingIds.length === 0) {
      return res.json({
        success: true,
        data: cachedItems,
        fromCache: true
      });
    }
    
    // Fetch missing items from database
    const dbItems = await prisma.image.findMany({
      where: {
        id: {
          in: missingIds
        }
      }
    });
    
    // Create mapping from id to item
    const dbItemMap = dbItems.reduce((map, item) => {
      map[item.id] = item;
      return map;
    }, {});
    
    // Cache the newly fetched items (batch operation)
    const cacheItems = dbItems.map(item => ({
      key: `storage-item-${item.id}`,
      value: item,
      ttl: 15 * 60 * 1000, // 15 minutes
      namespace: cache.namespaces.STORAGE
    }));
    
    // Use batch caching for efficiency
    if (cacheItems.length > 0) {
      await cache.mset(cacheItems);
    }
    
    // Merge cached and database results
    const result = ids.map((id, index) => {
      if (cachedItems[index] !== null) {
        return cachedItems[index]; // Use cached item
      }
      return dbItemMap[id] || null; // Use database item or null if not found
    });
    
    return res.json({
      success: true,
      data: result,
      fromCache: false,
      cacheMissCount: missingIds.length,
      totalCount: ids.length
    });
  } catch (error) {
    console.error('Error fetching storage items:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch storage items'
    });
  }
});

module.exports = router; 