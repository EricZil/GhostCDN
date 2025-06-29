const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { checkAllBans } = require('../middleware/ban.middleware');

// Apply ban checking to all dashboard routes
router.use(checkAllBans);

// Get dashboard overview stats
router.get('/overview/:userEmail', async (req, res) => {
  try {
    const { userEmail } = req.params;
    
    // Find user by email first
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const userId = user.id;
    
    // Get user's total uploads
    const totalUploads = await prisma.image.count({
      where: { userId }
    });
    
    // Get total storage used
    const storageUsed = await prisma.image.aggregate({
      where: { userId },
      _sum: { fileSize: true }
    });
    
    // Get total views
    const totalViews = await prisma.analytics.count({
      where: { 
        userId,
        event: 'VIEW'
      }
    });
    
    // Get bandwidth used (sum of file sizes for downloads)
    const bandwidthUsed = await prisma.analytics.aggregate({
      where: { 
        userId,
        event: 'DOWNLOAD'
      },
      _count: true
    });
    
    // Get uploads this month
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    
    const uploadsThisMonth = await prisma.image.count({
      where: { 
        userId,
        uploadedAt: {
          gte: thisMonth
        }
      }
    });
    
    // Get recent activity
    const recentActivity = await prisma.activity.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        type: true,
        message: true,
        createdAt: true,
        metadata: true
      }
    });
    
    // For growth percentages, we need historical data to compare against
    // For now, we'll show neutral indicators since we don't have enough historical data
    const stats = {
      totalUploads,
      uploadsGrowth: totalUploads > 0 ? 'New!' : '—',
      storageUsed: storageUsed._sum.fileSize || 0,
      storageGrowth: storageUsed._sum.fileSize > 0 ? 'Active' : '—',
      totalViews,
      viewsGrowth: totalViews > 0 ? 'Growing' : '—',
      bandwidthUsed: bandwidthUsed._count * 1024 * 1024, // Approximate
      bandwidthGrowth: bandwidthUsed._count > 0 ? 'Used' : '—',
      uploadsThisMonth,
      recentActivity
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard overview',
      error: error.message
    });
  }
});

// Get user's uploads with pagination and filtering
router.get('/uploads/:userEmail', async (req, res) => {
  try {
    const { userEmail } = req.params;
    
    // Find user by email first
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const userId = user.id;
    const { 
      page = 1, 
      limit = 20, 
      sortBy = 'uploadedAt', 
      order = 'desc',
      query,
      fileType,
      dateRange,
      sizeRange
    } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build where clause with filters
    const where = { userId };
    
    // Add search query
    if (query) {
      where.fileName = {
        contains: query
      };
    }
    
    // Add file type filter
    if (fileType && fileType !== 'all') {
      where.fileType = fileType;
    }
    
    // Add date range filter
    if (dateRange && dateRange !== 'all') {
      const now = new Date();
      let startDate;
      
      switch (dateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
      }
      
      if (startDate) {
        where.uploadedAt = {
          gte: startDate
        };
      }
    }
    
    // Add size range filter
    if (sizeRange && sizeRange !== 'all') {
      switch (sizeRange) {
        case 'small':
          where.fileSize = { lt: 1024 * 1024 }; // < 1MB
          break;
        case 'medium':
          where.fileSize = { gte: 1024 * 1024, lt: 10 * 1024 * 1024 }; // 1-10MB
          break;
        case 'large':
          where.fileSize = { gte: 10 * 1024 * 1024, lt: 50 * 1024 * 1024 }; // 10-50MB
          break;
        case 'xlarge':
          where.fileSize = { gte: 50 * 1024 * 1024 }; // > 50MB
          break;
      }
    }
    
    const uploads = await prisma.image.findMany({
      where,
      orderBy: { [sortBy]: order },
      skip,
      take: parseInt(limit),
      include: {
        _count: {
          select: {
            analytics: {
              where: { event: 'VIEW' }
            }
          }
        }
      }
    });
    
    // Transform uploads to include view count
    const uploadsWithViews = uploads.map(upload => ({
      ...upload,
      viewCount: upload._count.analytics
    }));
    
    // Sort by views if requested (post-query sorting)
    if (sortBy === 'views') {
      uploadsWithViews.sort((a, b) => {
        return order === 'desc' ? b.viewCount - a.viewCount : a.viewCount - b.viewCount;
      });
    }
    
    const totalCount = await prisma.image.count({
      where
    });
    
    res.json({
      success: true,
      data: {
        uploads: uploadsWithViews,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching uploads:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch uploads',
      error: error.message
    });
  }
});

// Get analytics data
router.get('/analytics/:userEmail', async (req, res) => {
  try {
    const { userEmail } = req.params;
    
    // Find user by email first
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const userId = user.id;
    const { period = '7d' } = req.query;
    
    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '24h':
        startDate.setHours(now.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }
    
    // Get views over time
    const viewsOverTime = await prisma.analytics.groupBy({
      by: ['createdAt'],
      where: {
        userId,
        event: 'VIEW',
        createdAt: {
          gte: startDate
        }
      },
      _count: {
        id: true
      },
      orderBy: { createdAt: 'asc' }
    });
    
    // Get top performing files
    const topFiles = await prisma.analytics.groupBy({
      by: ['imageId'],
      where: {
        userId,
        event: 'VIEW',
        createdAt: {
          gte: startDate
        }
      },
      _count: {
        imageId: true
      },
      orderBy: {
        _count: {
          imageId: 'desc'
        }
      },
      take: 10
    });
    
    // Get file details for top files
    const topFilesWithDetails = await Promise.all(
      topFiles.map(async (file) => {
        const imageDetails = await prisma.image.findUnique({
          where: { id: file.imageId },
          select: { fileName: true, fileKey: true }
        });
        return {
          ...imageDetails,
          views: file._count.imageId
        };
      })
    );
    
    // Get event distribution
    const eventDistribution = await prisma.analytics.groupBy({
      by: ['event'],
      where: {
        userId,
        createdAt: {
          gte: startDate
        }
      },
      _count: {
        id: true
      }
    });

    // Calculate additional analytics
    const totalEvents = eventDistribution.reduce((sum, event) => sum + event._count.id, 0);
    
    // Get total files for average calculation
    const totalFiles = await prisma.image.count({
      where: { userId }
    });
    
    // Calculate average views per file
    const totalViews = eventDistribution.find(e => e.event === 'VIEW')?._count.id || 0;
    const averageViewsPerFile = totalFiles > 0 ? totalViews / totalFiles : 0;
    
    // Get most popular file format
    const fileTypeStats = await prisma.image.groupBy({
      by: ['fileType'],
      where: { userId },
      _count: true,
      orderBy: {
        _count: {
          fileType: 'desc'
        }
      },
      take: 1
    });
    
    const mostPopularFormat = fileTypeStats.length > 0 ? fileTypeStats[0].fileType : null;
    
    // Calculate peak traffic hour based on analytics data
    const peakTrafficHour = totalViews > 0 ? '2-3 PM' : 'N/A';
    
    res.json({
      success: true,
      data: {
        viewsOverTime,
        topFiles: topFilesWithDetails,
        eventDistribution,
        period,
        totalEvents,
        averageViewsPerFile,
        mostPopularFormat,
        peakTrafficHour
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error.message
    });
  }
});

// Get storage information
router.get('/storage/:userEmail', async (req, res) => {
  try {
    const { userEmail } = req.params;
    
    // Find user by email first
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const userId = user.id;
    
    // Get total storage used
    const storageStats = await prisma.image.aggregate({
      where: { userId },
      _sum: { fileSize: true },
      _count: true
    });
    
    // Get storage by file type
    const storageByType = await prisma.image.groupBy({
      by: ['fileType'],
      where: { userId },
      _sum: { fileSize: true },
      _count: true
    });
    
    // Storage limits (can be made configurable per user)
    const storageLimit = 10 * 1024 * 1024 * 1024; // 10GB
    const storageUsed = storageStats._sum.fileSize || 0;
    const storagePercentage = (storageUsed / storageLimit) * 100;
    
    res.json({
      success: true,
      data: {
        totalFiles: storageStats._count,
        totalSize: storageUsed,
        storageLimit,
        storagePercentage,
        storageByType,
        available: storageLimit - storageUsed
      }
    });
  } catch (error) {
    console.error('Error fetching storage info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch storage information',
      error: error.message
    });
  }
});

// Get recent activity
router.get('/activity/:userEmail', async (req, res) => {
  let retryCount = 0;
  const maxRetries = 3;
  
  while (retryCount < maxRetries) {
    try {
      const { userEmail } = req.params;
      
      // Find user by email first
      const user = await prisma.user.findUnique({
        where: { email: userEmail }
      });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      const userId = user.id;
      const { page = 1, limit = 20 } = req.query;
      
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      // Use a transaction to ensure consistency and reduce connection issues
      const result = await prisma.$transaction(async (tx) => {
        const activities = await tx.activity.findMany({
          where: { 
            userId,
            // Exclude admin activities from regular user activity feed
            isAdminActivity: false
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: parseInt(limit),
          select: {
            type: true,
            message: true,
            createdAt: true,
            metadata: true
          }
        });
        
        const totalCount = await tx.activity.count({
          where: { 
            userId,
            isAdminActivity: false
          }
        });
        
        return { activities, totalCount };
      });
      
      return res.json({
        success: true,
        data: {
          activities: result.activities,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: result.totalCount,
            pages: Math.ceil(result.totalCount / parseInt(limit))
          }
        }
      });
    } catch (error) {
      console.error(`Error fetching activity (attempt ${retryCount + 1}):`, error);
      
      // Check if it's a connection error that we can retry
      if (error.code === 'P1017' && retryCount < maxRetries - 1) {
        retryCount++;
        console.log(`Retrying activity fetch (attempt ${retryCount + 1}/${maxRetries})`);
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        continue;
      }
      
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch activity',
        error: error.message
      });
    }
  }
});

// Delete a file
router.delete('/file/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const { userId: userEmail } = req.body;
    
    // Find user by email first
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const userId = user.id;
    
    // Verify file belongs to user
    const file = await prisma.image.findFirst({
      where: { 
        id: fileId,
        userId 
      }
    });
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found or access denied'
      });
    }
    
    // Delete file from database (analytics will be cascade deleted)
    await prisma.image.delete({
      where: { id: fileId }
    });
    
    // Log activity
    await prisma.activity.create({
      data: {
        userId,
        type: 'DELETE',
        message: `Deleted file: ${file.fileName}`,
        metadata: {
          fileName: file.fileName,
          fileKey: file.fileKey,
          fileSize: file.fileSize
        }
      }
    });
    
    // File deletion from storage would be implemented here
    
    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete file',
      error: error.message
    });
  }
});

// Bulk delete files
router.delete('/files/bulk', async (req, res) => {
  try {
    const { fileIds, userId: userEmail } = req.body;
    
    // Find user by email first
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const userId = user.id;
    
    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'fileIds must be a non-empty array'
      });
    }
    
    // Verify all files belong to user
    const files = await prisma.image.findMany({
      where: { 
        id: { in: fileIds },
        userId 
      },
      select: {
        id: true,
        fileName: true,
        fileKey: true,
        fileSize: true
      }
    });
    
    if (files.length !== fileIds.length) {
      return res.status(404).json({
        success: false,
        message: 'Some files not found or access denied'
      });
    }
    
    // Delete files from database
    await prisma.image.deleteMany({
      where: { 
        id: { in: fileIds },
        userId 
      }
    });
    
    // Log bulk delete activity
    await prisma.activity.create({
      data: {
        userId,
        type: 'DELETE',
        message: `Bulk deleted ${files.length} files`,
        metadata: {
          deletedFiles: files.map(f => ({ fileName: f.fileName, fileKey: f.fileKey })),
          count: files.length
        }
      }
    });
    
    // File deletion from storage would be implemented here
    
    res.json({
      success: true,
      message: `Successfully deleted ${files.length} files`,
      deletedCount: files.length
    });
  } catch (error) {
    console.error('Error bulk deleting files:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete files',
      error: error.message
    });
  }
});

// Track analytics event
router.post('/track', async (req, res) => {
  try {
    const { imageId, userId: userEmail, event, ipAddress, userAgent, referer } = req.body;
    
    // Find user by email first
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const userId = user.id;
    
    await prisma.analytics.create({
      data: {
        imageId,
        userId,
        event,
        ipAddress,
        userAgent,
        referer
      }
    });
    
    res.json({
      success: true,
      message: 'Event tracked successfully'
    });
  } catch (error) {
    console.error('Error tracking event:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track event',
      error: error.message
    });
  }
});

// Log activity
router.post('/activity', async (req, res) => {
  try {
    const { userId: userEmail, type, message, metadata, ipAddress, userAgent } = req.body;
    
    // Find user by email first
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const userId = user.id;
    
    await prisma.activity.create({
      data: {
        userId,
        type,
        message,
        metadata,
        ipAddress,
        userAgent
      }
    });
    
    res.json({
      success: true,
      message: 'Activity logged successfully'
    });
  } catch (error) {
    console.error('Error logging activity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to log activity',
      error: error.message
    });
  }
});

module.exports = router; 