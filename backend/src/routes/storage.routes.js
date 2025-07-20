const express = require('express');
const { cache } = require('../lib/cache-manager');
const prisma = require('../lib/prisma');
const { validateApiKey } = require('../middleware/apiKey.middleware');
const { checkAllBans } = require('../middleware/ban.middleware');

const router = express.Router();

// Middleware to extract user from email header
const extractUser = async (req, res, next) => {
  try {
    const userEmail = req.headers['user-email'];
    if (userEmail) {
      const user = await prisma.user.findUnique({
        where: { email: userEmail }
      });
      if (user) {
        req.user = user;
      }
    }
    next();
  } catch (error) {
    console.error('Error extracting user:', error);
    next();
  }
};

// Apply middleware
router.use(validateApiKey);
router.use(extractUser);
router.use(checkAllBans);

// Get enhanced storage statistics - with caching
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
    
    const userId = req.user?.id || null;
    
    // Basic stats
    const stats = await prisma.image.aggregate({
      where: userId ? { userId } : {},
      _count: { id: true },
      _sum: { fileSize: true }
    });
    
    // Storage breakdown by file type
    const fileTypeStats = await prisma.image.groupBy({
      by: ['fileType'],
      where: userId ? { userId } : {},
      _count: { id: true },
      _sum: { fileSize: true }
    });
    
    // Calculate storage by type for chart
    const storageByType = fileTypeStats.map(stat => ({
      type: stat.fileType,
      size: stat._sum.fileSize || 0,
      count: stat._count.id || 0,
      percentage: stats._sum.fileSize ? ((stat._sum.fileSize || 0) / stats._sum.fileSize * 100).toFixed(1) : 0
    }));
    
    // Calculate quota information (default 10GB = 10 * 1024 * 1024 * 1024 bytes)
    const storageLimit = 10 * 1024 * 1024 * 1024; // 10GB in bytes
    const totalSize = stats._sum.fileSize || 0;
    const storagePercentage = (totalSize / storageLimit) * 100;
    const available = storageLimit - totalSize;
    
    // Calculate growth trend (simplified - based on recent uploads)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    
    // Get uploads from last 7 days
    const lastWeekStats = await prisma.image.aggregate({
      where: userId ? {
        userId,
        uploadedAt: { gte: sevenDaysAgo }
      } : {
        uploadedAt: { gte: sevenDaysAgo }
      },
      _sum: { fileSize: true }
    });
    
    // Get uploads from 7-14 days ago
    const previousWeekStats = await prisma.image.aggregate({
      where: userId ? {
        userId,
        uploadedAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo }
      } : {
        uploadedAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo }
      },
      _sum: { fileSize: true }
    });
    
    const lastWeekGrowth = lastWeekStats._sum.fileSize || 0;
    const previousWeekGrowth = previousWeekStats._sum.fileSize || 0;
    
    // Calculate weekly growth rate: ((this week - last week) / last week) * 100
    let weeklyGrowthRate = 0;
    if (previousWeekGrowth > 0) {
      weeklyGrowthRate = ((lastWeekGrowth - previousWeekGrowth) / previousWeekGrowth * 100);
    } else if (lastWeekGrowth > 0) {
      // If no previous week data but current week has uploads, calculate based on total storage
      // Show growth as percentage of current total storage that was added this week
      weeklyGrowthRate = totalSize > 0 ? (lastWeekGrowth / totalSize * 100) : 0;
      // Cap at reasonable maximum
      weeklyGrowthRate = Math.min(weeklyGrowthRate, 25);
    }
    weeklyGrowthRate = Math.round(weeklyGrowthRate * 10) / 10; // Round to 1 decimal place
    
    // Calculate storage usage
    const storageStats = {
      totalFiles: stats._count.id || 0,
      totalSize,
      storageLimit,
      storagePercentage: Math.min(storagePercentage, 100),
      available: Math.max(available, 0),
      storageByType,
      weeklyGrowthRate: weeklyGrowthRate,
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

// Get storage optimization recommendations
router.get('/optimization', async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const cacheKey = `storage-optimization-${userId}`;
    const cachedData = await cache.get(cacheKey, cache.namespaces.STORAGE);
    
    if (cachedData) {
      return res.json({
        success: true,
        data: cachedData,
        fromCache: true
      });
    }
    
    // Find large files that could be optimized (>5MB)
    const largeFiles = userId ? await prisma.image.findMany({
      where: {
        userId,
        fileSize: { gt: 5 * 1024 * 1024 } // >5MB
      },
      select: {
        id: true,
        fileName: true,
        fileSize: true,
        fileType: true,
        uploadedAt: true
      },
      orderBy: { fileSize: 'desc' },
      take: 50
    }) : [];
    
    // Find potential duplicates (same name and size)
    const duplicates = userId ? await prisma.$queryRaw`
      SELECT fileName, fileSize, COUNT(*) as count
      FROM Image 
      WHERE userId = ${userId}
      GROUP BY fileName, fileSize 
      HAVING COUNT(*) > 1
      LIMIT 20
    ` : [];
    
    // Find old files (>6 months, no recent views)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const oldFiles = userId ? await prisma.image.findMany({
      where: {
        userId,
        uploadedAt: { lt: sixMonthsAgo }
      },
      select: {
        id: true,
        fileName: true,
        fileSize: true,
        uploadedAt: true,
        _count: {
          select: {
            analytics: {
              where: {
                event: 'VIEW',
                createdAt: { gte: sixMonthsAgo }
              }
            }
          }
        }
      },
      take: 50
    }) : [];
    
    // Filter old files with no recent views
    const unusedOldFiles = oldFiles.filter(file => file._count.analytics === 0);
    
    // Calculate potential savings
    const largeSavings = largeFiles.reduce((sum, file) => sum + (file.fileSize * 0.3), 0); // Assume 30% compression
    const duplicateSavings = duplicates.reduce((sum, dup) => sum + (dup.fileSize * (dup.count - 1)), 0);
    const oldFilesSavings = unusedOldFiles.reduce((sum, file) => sum + file.fileSize, 0);
    
    const optimizationData = {
      largeFiles: {
        count: largeFiles.length,
        files: largeFiles.slice(0, 10), // Return top 10
        potentialSavings: Math.round(largeSavings)
      },
      duplicates: {
        count: duplicates.length,
        files: duplicates.slice(0, 8),
        potentialSavings: Math.round(duplicateSavings)
      },
      oldFiles: {
        count: unusedOldFiles.length,
        files: unusedOldFiles.slice(0, 10),
        potentialSavings: Math.round(oldFilesSavings)
      },
      totalPotentialSavings: Math.round(largeSavings + duplicateSavings + oldFilesSavings),
      totalOptimizableFiles: largeFiles.length + duplicates.length + unusedOldFiles.length
    };
    
    // Cache for 10 minutes
    await cache.set(cacheKey, optimizationData, 10 * 60 * 1000, cache.namespaces.STORAGE);
    
    return res.json({
      success: true,
      data: optimizationData,
      fromCache: false
    });
  } catch (error) {
    console.error('Error getting optimization recommendations:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch optimization recommendations'
    });
  }
});

// Generate storage report
router.post('/report', async (req, res) => {
  try {
    const userId = req.user?.id || null;
    
    // Get comprehensive storage data
    const [stats, fileTypeStats, recentUploads, topFiles] = await Promise.all([
      // Basic stats
      prisma.image.aggregate({
        where: userId ? { userId } : {},
        _count: { id: true },
        _sum: { fileSize: true },
        _avg: { fileSize: true }
      }),
      
      // File type breakdown
      prisma.image.groupBy({
        by: ['fileType'],
        where: userId ? { userId } : {},
        _count: { id: true },
        _sum: { fileSize: true }
      }),
      
      // Recent uploads (last 30 days)
      prisma.image.findMany({
        where: userId ? {
          userId,
          uploadedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        } : {
          uploadedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        },
        select: {
          uploadedAt: true,
          fileSize: true
        }
      }),
      
      // Top 10 largest files
      prisma.image.findMany({
        where: userId ? { userId } : {},
        select: {
          fileName: true,
          fileSize: true,
          fileType: true,
          uploadedAt: true
        },
        orderBy: { fileSize: 'desc' },
        take: 10
      })
    ]);
    
    // Calculate analytics
    const totalViews = await prisma.analytics.count({
      where: userId ? {
        userId,
        event: 'VIEW'
      } : {
        event: 'VIEW'
      }
    });
    
    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalFiles: stats._count.id || 0,
        totalSize: stats._sum.fileSize || 0,
        averageFileSize: Math.round(stats._avg.fileSize || 0),
        totalViews,
        storageLimit: 10 * 1024 * 1024 * 1024, // 10GB
        usagePercentage: ((stats._sum.fileSize || 0) / (10 * 1024 * 1024 * 1024)) * 100
      },
      fileTypes: fileTypeStats.map(stat => ({
        type: stat.fileType,
        count: stat._count.id,
        size: stat._sum.fileSize || 0,
        percentage: stats._sum.fileSize ? ((stat._sum.fileSize || 0) / stats._sum.fileSize * 100).toFixed(1) : 0
      })),
      recentActivity: {
        uploadsLast30Days: recentUploads.length,
        sizeLast30Days: recentUploads.reduce((sum, upload) => sum + upload.fileSize, 0)
      },
      topFiles,
      recommendations: {
        message: stats._count.id > 100 ? 'Consider optimizing large files to save space' : 'Storage usage looks good'
      }
    };
    
    // Log report generation (only if user is authenticated)
    if (userId) {
      await prisma.activity.create({
        data: {
          userId,
          type: 'STORAGE_OPTIMIZED',
          message: 'Generated storage report',
          metadata: JSON.stringify({ reportSize: JSON.stringify(report).length })
        }
      });
    }
    
    return res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error generating storage report:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate storage report'
    });
  }
});

// Refresh storage statistics (invalidate cache)
router.post('/refresh', async (req, res) => {
  try {
    const userId = req.user?.id || null;
    
    // Invalidate user-specific storage caches
    const cacheKeys = [
      `storage-stats-${userId}`,
      `storage-optimization-${userId}`
    ];
    
    await Promise.all(cacheKeys.map(key => cache.delete(key, cache.namespaces.STORAGE)));
    
    // Log refresh activity (only if user is authenticated)
    if (userId) {
      await prisma.activity.create({
        data: {
          userId,
          type: 'SETTINGS_CHANGED',
          message: 'Refreshed storage statistics'
        }
      });
    }
    
    return res.json({
      success: true,
      message: 'Storage statistics refreshed'
    });
  } catch (error) {
    console.error('Error refreshing storage stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to refresh storage statistics'
    });
  }
});

// Execute storage optimization
router.post('/optimize', async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const { optimizationType, fileIds } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required for optimization'
      });
    }
    
    // Validate optimization type
    const validTypes = ['compress', 'cleanup', 'duplicates'];
    if (!optimizationType || !validTypes.includes(optimizationType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid optimization type. Must be one of: compress, cleanup, duplicates'
      });
    }
    
    let optimizedCount = 0;
    let totalSavings = 0;
    let errors = [];
    
    try {
      switch (optimizationType) {
        case 'compress':
          // Compress large files
          if (fileIds && fileIds.length > 0) {
            const filesToCompress = await prisma.image.findMany({
              where: {
                id: { in: fileIds },
                userId,
                fileSize: { gt: 5 * 1024 * 1024 } // Only files > 5MB
              }
            });
            
            for (const file of filesToCompress) {
              try {
                // Simulate compression (in real implementation, you'd use the storage service)
                const originalSize = file.fileSize;
                const compressedSize = Math.round(originalSize * 0.7); // Assume 30% compression
                const savings = originalSize - compressedSize;
                
                // Update file size in database
                await prisma.image.update({
                  where: { id: file.id },
                  data: { 
                    fileSize: compressedSize
                  }
                });
                
                optimizedCount++;
                totalSavings += savings;
              } catch (error) {
                errors.push(`Failed to compress ${file.fileName}: ${error.message}`);
              }
            }
          }
          break;
          
        case 'cleanup':
          // Remove old unused files
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
          
          const oldFiles = await prisma.image.findMany({
            where: {
              userId,
              uploadedAt: { lt: sixMonthsAgo },
              ...(fileIds && fileIds.length > 0 ? { id: { in: fileIds } } : {})
            },
            include: {
              _count: {
                select: {
                  analytics: {
                    where: {
                      event: 'VIEW',
                      createdAt: { gte: sixMonthsAgo }
                    }
                  }
                }
              }
            }
          });
          
          const unusedFiles = oldFiles.filter(file => file._count.analytics === 0);
          
          for (const file of unusedFiles) {
            try {
              totalSavings += file.fileSize;
              
              // Delete from database
              await prisma.image.delete({
                where: { id: file.id }
              });
              
              // TODO: Delete from storage service
              // await storageService.deleteFile(file.fileKey);
              
              optimizedCount++;
            } catch (error) {
              errors.push(`Failed to delete ${file.fileName}: ${error.message}`);
            }
          }
          break;
          
        case 'duplicates':
          // Remove duplicate files
          const duplicateGroups = await prisma.$queryRaw`
            SELECT fileName, fileSize, GROUP_CONCAT(id) as ids
            FROM Image 
            WHERE userId = ${userId}
            ${fileIds && fileIds.length > 0 ? prisma.Prisma.sql`AND id IN (${prisma.Prisma.join(fileIds)})` : prisma.Prisma.empty}
            GROUP BY fileName, fileSize 
            HAVING COUNT(*) > 1
          `;
          
          for (const group of duplicateGroups) {
            try {
              const ids = group.ids.split(',');
              const filesToKeep = 1;
              const filesToDelete = ids.slice(filesToKeep);
              
              for (const fileId of filesToDelete) {
                const file = await prisma.image.findUnique({ where: { id: fileId } });
                if (file) {
                  totalSavings += file.fileSize;
                  
                  await prisma.image.delete({ where: { id: fileId } });
                  // TODO: Delete from storage service
                  
                  optimizedCount++;
                }
              }
            } catch (error) {
              errors.push(`Failed to remove duplicates for ${group.fileName}: ${error.message}`);
            }
          }
          break;
      }
      
      // Log optimization activity
      await prisma.activity.create({
        data: {
          userId,
          type: 'STORAGE_OPTIMIZED',
          message: `Optimized ${optimizedCount} files using ${optimizationType} method`,
          metadata: JSON.stringify({
            optimizationType,
            filesOptimized: optimizedCount,
            totalSavings,
            errors: errors.length
          })
        }
      });
      
      // Invalidate storage cache - use proper namespace
      await cache.delete(`storage-stats-${userId}`, cache.namespaces.STORAGE);
      await cache.delete(`storage-optimization-${userId}`, cache.namespaces.STORAGE);
      
      // Also invalidate any cached storage items
      console.log('Cache invalidated after optimization');
      
      return res.json({
        success: true,
        data: {
          optimizationType,
          filesOptimized: optimizedCount,
          totalSavings,
          errors: errors.length > 0 ? errors : undefined
        }
      });
      
    } catch (optimizationError) {
      console.error('Optimization execution error:', optimizationError);
      return res.status(500).json({
        success: false,
        error: 'Failed to execute optimization',
        details: optimizationError.message
      });
    }
    
  } catch (error) {
    console.error('Error in optimization endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process optimization request'
    });
  }
});

module.exports = router;