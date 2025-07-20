const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { checkAllBans } = require('../middleware/ban.middleware');
const storageService = require('../services/storage.service');

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
    
    // Transform uploads to include view count and thumbnail URLs
    const uploadsWithViews = uploads.map(upload => {
      // Generate thumbnail URLs based on file structure
      let thumbnails = null;
      const baseUrl = process.env.DO_SPACES_PUBLIC_URL || 'https://cdn.gcdn.space';
      
      let thumbnailBasePath;
      if (upload.fileKey.startsWith('Guests/')) {
        thumbnailBasePath = 'Guests/Thumbnails/';
      } else if (upload.fileKey.startsWith('Registered/')) {
        const pathParts = upload.fileKey.split('/');
        const userFolder = pathParts[1];
        thumbnailBasePath = `Registered/${userFolder}/Thumbnails/`;
      }
      
      if (thumbnailBasePath) {
        const originalFileName = upload.fileKey.split('/').pop();
        if (originalFileName) {
          const baseName = originalFileName.substring(0, originalFileName.lastIndexOf('.'));
          thumbnails = {
            small: `${baseUrl}/${thumbnailBasePath}${baseName}_small.webp`,
            medium: `${baseUrl}/${thumbnailBasePath}${baseName}_medium.webp`,
            large: `${baseUrl}/${thumbnailBasePath}${baseName}_large.webp`
          };
        }
      }
      
      return {
        ...upload,
        viewCount: upload._count.analytics,
        thumbnails
      };
    });
    
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
    const rawStorageByType = await prisma.image.groupBy({
      by: ['fileType'],
      where: { userId },
      _sum: { fileSize: true },
      _count: true
    });
    
    // Storage limits (can be made configurable per user)
    const storageLimit = 10 * 1024 * 1024 * 1024; // 10GB
    const storageUsed = storageStats._sum.fileSize || 0;
    const storagePercentage = (storageUsed / storageLimit) * 100;
    
    // Function to map MIME types to user-friendly categories
    const getCategoryFromMimeType = (mimeType) => {
      if (!mimeType) return 'Other';
      
      const type = mimeType.toLowerCase();
      
      if (type.startsWith('image/')) {
        return 'Photos';
      } else if (type.startsWith('video/')) {
        return 'Videos';
      } else if (type.startsWith('audio/')) {
        return 'Audio';
      } else if (type.includes('pdf') || type.includes('document') || type.includes('text') || 
                 type.includes('word') || type.includes('excel') || type.includes('powerpoint') ||
                 type.includes('spreadsheet') || type.includes('presentation')) {
        return 'Documents';
      } else if (type.includes('zip') || type.includes('rar') || type.includes('tar') || 
                 type.includes('gzip') || type.includes('7z')) {
        return 'Archives';
      } else {
        return 'Other';
      }
    };
    
    // Group by category instead of MIME type
    const categoryMap = new Map();
    
    rawStorageByType.forEach(item => {
      const category = getCategoryFromMimeType(item.fileType);
      const size = item._sum.fileSize || 0;
      const count = item._count || 0;
      
      if (categoryMap.has(category)) {
        const existing = categoryMap.get(category);
        categoryMap.set(category, {
          type: category,
          size: existing.size + size,
          count: existing.count + count
        });
      } else {
        categoryMap.set(category, {
          type: category,
          size,
          count
        });
      }
    });
    
    // Transform the data to match frontend expectations with percentages
    const storageByType = Array.from(categoryMap.values()).map(item => ({
      type: item.type,
      size: item.size,
      count: item.count,
      percentage: storageUsed > 0 ? (item.size / storageUsed * 100).toFixed(1) : '0'
    }));
    
    // Sort by size descending
    storageByType.sort((a, b) => b.size - a.size);
    
    // Storage data transformed successfully
    
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
    
    try {
      // Delete file from DigitalOcean Spaces storage first
      await storageService.deleteFile(file.fileKey);
      
      // Delete associated thumbnails if they exist
      await storageService.deleteThumbnailsFromStorage(file.fileKey);
      
      console.log(`Successfully deleted file from storage: ${file.fileKey}`);
    } catch (storageError) {
      console.error(`Error deleting file from storage: ${file.fileKey}`, storageError);
      // Continue with database deletion even if storage deletion fails
      // This prevents orphaned database records
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
        metadata: JSON.stringify({
          fileName: file.fileName,
          fileKey: file.fileKey,
          fileSize: file.fileSize
        })
      }
    });
    
    res.json({
      success: true,
      message: 'File deleted successfully from database and storage'
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
    
    // Delete files from DigitalOcean Spaces storage first
    const storageErrors = [];
    for (const file of files) {
      try {
        // Delete file from storage
        await storageService.deleteFile(file.fileKey);
        
        // Delete associated thumbnails
        await storageService.deleteThumbnailsFromStorage(file.fileKey);
        
      } catch (storageError) {
        console.error(`Error deleting file from storage: ${file.fileKey}`, storageError);
        storageErrors.push({ fileKey: file.fileKey, error: storageError.message });
        // Continue with other files even if one fails
      }
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
        metadata: JSON.stringify({
          deletedFiles: files.map(f => ({ fileName: f.fileName, fileKey: f.fileKey })),
          count: files.length,
          storageErrors: storageErrors.length > 0 ? storageErrors : null
        })
      }
    });
    
    res.json({
      success: true,
      message: `Successfully deleted ${files.length} files from database and storage`,
      deletedCount: files.length,
      storageErrors: storageErrors.length > 0 ? storageErrors.length : 0
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

// Bulk download files
router.post('/files/bulk-download', async (req, res) => {
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
    
    // Verify all files belong to user and get file details
    const files = await prisma.image.findMany({
      where: { 
        id: { in: fileIds },
        userId 
      },
      select: {
        id: true,
        fileName: true,
        fileKey: true,
        fileSize: true,
        fileType: true
      }
    });
    
    if (files.length !== fileIds.length) {
      return res.status(404).json({
        success: false,
        message: 'Some files not found or access denied'
      });
    }
    
    const baseUrl = process.env.DO_SPACES_PUBLIC_URL || 'https://cdn.gcdn.space';
    
    // For single file, return direct download URL with proper headers
    if (files.length === 1) {
      const file = files[0];
      const downloadUrl = `${baseUrl}/${file.fileKey}`;
      
      // Log single file download activity
      await prisma.activity.create({
        data: {
          userId,
          type: 'DOWNLOAD',
          message: `Downloaded file: ${file.fileName}`,
          metadata: JSON.stringify({
            fileName: file.fileName,
            fileKey: file.fileKey,
            fileSize: file.fileSize
          })
        }
      });
      
      return res.json({
        success: true,
        type: 'single',
        file: {
          id: file.id,
          fileName: file.fileName,
          fileSize: file.fileSize,
          fileType: file.fileType,
          downloadUrl
        }
      });
    }
    
    // For multiple files, create a zip archive
    const archiver = require('archiver');
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });
    
    // Set response headers for zip download
    const zipFileName = `files_${Date.now()}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);
    
    // Pipe archive to response
    archive.pipe(res);
    
    // Handle archive errors
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Failed to create zip archive',
          error: err.message
        });
      }
    });
    
    // Add files to archive
    for (const file of files) {
      try {
        // Get file stream from storage
        const fileStream = await storageService.getFileStream(file.fileKey);
        archive.append(fileStream, { name: file.fileName });
      } catch (error) {
        console.error(`Error adding file to archive: ${file.fileName}`, error);
        // Continue with other files even if one fails
      }
    }
    
    // Finalize the archive
    await archive.finalize();
    
    // Log bulk download activity
    await prisma.activity.create({
      data: {
        userId,
        type: 'DOWNLOAD',
        message: `Bulk downloaded ${files.length} files as zip`,
        metadata: JSON.stringify({
          downloadedFiles: files.map(f => ({ fileName: f.fileName, fileKey: f.fileKey })),
          count: files.length,
          zipFileName
        })
      }
    });
    
  } catch (error) {
    console.error('Error generating bulk download:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to generate bulk download',
        error: error.message
      });
    }
  }
});

// Detect duplicate files
router.get('/duplicates/:userEmail', async (req, res) => {
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
    
    // Find duplicates by file size and name
    const duplicatesBySize = await prisma.image.groupBy({
      by: ['fileSize', 'fileName'],
      where: { userId },
      _count: {
        id: true
      },
      having: {
        id: {
          _count: {
            gt: 1
          }
        }
      }
    });
    
    // Get detailed information for duplicate files
    const duplicateGroups = await Promise.all(
      duplicatesBySize.map(async (group) => {
        const files = await prisma.image.findMany({
          where: {
            userId,
            fileSize: group.fileSize,
            fileName: group.fileName
          },
          orderBy: { uploadedAt: 'asc' },
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
        
        // Add thumbnail URLs and view counts
        const filesWithDetails = files.map(file => {
          const baseUrl = process.env.DO_SPACES_PUBLIC_URL || 'https://cdn.gcdn.space';
          let thumbnails = null;
          
          let thumbnailBasePath;
          if (file.fileKey.startsWith('Guests/')) {
            thumbnailBasePath = 'Guests/Thumbnails/';
          } else if (file.fileKey.startsWith('Registered/')) {
            const pathParts = file.fileKey.split('/');
            const userFolder = pathParts[1];
            thumbnailBasePath = `Registered/${userFolder}/Thumbnails/`;
          }
          
          if (thumbnailBasePath) {
            const originalFileName = file.fileKey.split('/').pop();
            if (originalFileName) {
              const baseName = originalFileName.substring(0, originalFileName.lastIndexOf('.'));
              thumbnails = {
                small: `${baseUrl}/${thumbnailBasePath}${baseName}_small.webp`,
                medium: `${baseUrl}/${thumbnailBasePath}${baseName}_medium.webp`,
                large: `${baseUrl}/${thumbnailBasePath}${baseName}_large.webp`
              };
            }
          }
          
          return {
            ...file,
            viewCount: file._count.analytics,
            thumbnails
          };
        });
        
        return {
          fileName: group.fileName,
          fileSize: group.fileSize,
          count: group._count.id,
          files: filesWithDetails,
          potentialSavings: group.fileSize * (group._count.id - 1) // Size that could be saved by keeping only one
        };
      })
    );
    
    // Calculate total potential savings
    const totalPotentialSavings = duplicateGroups.reduce(
      (sum, group) => sum + group.potentialSavings, 
      0
    );
    
    res.json({
      success: true,
      data: {
        duplicateGroups,
        totalGroups: duplicateGroups.length,
        totalDuplicateFiles: duplicateGroups.reduce((sum, group) => sum + group.count, 0),
        totalPotentialSavings
      }
    });
  } catch (error) {
    console.error('Error detecting duplicates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to detect duplicates',
      error: error.message
    });
  }
});

module.exports = router;