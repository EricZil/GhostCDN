const express = require('express');
const prisma = require('../lib/prisma');
const bcrypt = require('bcrypt');
const { validateApiKey, requireAdmin } = require('../middleware/apiKey.middleware');
const cleanupService = require('../services/cleanup.service');
const { cache } = require('../lib/cache-manager');
const { checkAllBans } = require('../middleware/ban.middleware');
const { validateNextAuthJWT } = require('../middleware/jwt.middleware');

const router = express.Router();

// Apply middleware to all admin routes
router.use(validateApiKey);
router.use(requireAdmin);
router.use(checkAllBans);

// Cache Statistics (for monitoring)
router.get('/cache/stats', async (req, res) => {
  try {
    const stats = await cache.getStats();
    const ping = await cache.ping();
    
    res.json({
      success: true,
      cache: {
        ...stats,
        ping: ping,
        redisHealthy: ping
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cache stats error:', error);
    res.status(500).json({ error: 'Failed to fetch cache statistics' });
  }
});

// Cache Key Information (Redis-specific)
router.get('/cache/keys', async (req, res) => {
  try {
    const { pattern = '*' } = req.query;
    const keys = await cache.listKeys(pattern);
    
    res.json({
      success: true,
      keys,
      count: keys.length,
      pattern
    });
  } catch (error) {
    console.error('Cache keys error:', error);
    res.status(500).json({ error: 'Failed to fetch cache keys' });
  }
});

// Cache Key Details (Redis-specific)
router.get('/cache/keys/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const keyInfo = await cache.getKeyInfo(key);
    
    res.json({
      success: true,
      key,
      info: keyInfo
    });
  } catch (error) {
    console.error('Cache key info error:', error);
    res.status(500).json({ error: 'Failed to fetch key information' });
  }
});

// Clear cache (for debugging)
router.delete('/cache', async (req, res) => {
  try {
    const { key } = req.query;
    
    if (key) {
      // Clear specific cache key
      const deleted = await cache.delete(key);
      res.json({ 
        success: true, 
        message: deleted ? `Cache key '${key}' cleared` : `Cache key '${key}' not found`,
        deleted
      });
    } else {
      // Clear all cache
      await cache.clear();
      res.json({ 
        success: true, 
        message: 'All cache cleared'
      });
    }

    // Log admin activity
    await prisma.activity.create({
      data: {
        userId: req.user.id,
        type: 'SETTINGS_CHANGED',
        message: key ? `Admin cleared cache key: ${key}` : 'Admin cleared all cache',
        metadata: JSON.stringify({ cacheKey: key || 'all' }),
        isAdminActivity: true
      }
    });
  } catch (error) {
    console.error('Cache clear error:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

// System Overview Stats
router.get('/overview', async (req, res) => {
  try {
    const [
      totalUsers,
      totalFiles,
      totalStorage,
      totalBandwidth,
      usersToday,
      filesThisWeek,
      systemHealth
    ] = await Promise.all([
      // Total users
      prisma.user.count(),
      
      // Total files
      prisma.image.count(),
      
      // Total storage used
      prisma.image.aggregate({
        _sum: { fileSize: true }
      }),
      
      // Total bandwidth (from analytics views)
      prisma.analytics.count({
        where: { event: 'VIEW' }
      }),
      
      // New users today
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      
      // Files uploaded this week
      prisma.image.count({
        where: {
          uploadedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // System health from database
      prisma.systemHealth.findMany({
        orderBy: { lastCheck: 'desc' }
      })
    ]);

    // Recent admin activity - only admin-specific actions
    const recentActivity = await prisma.activity.findMany({
      where: {
        isAdminActivity: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: {
          select: { name: true, email: true, role: true }
        }
      }
    });

    // Transform system health data to match frontend expectations
    const transformedSystemHealth = {
      apiServer: { status: 'healthy', uptime: '99.9% uptime' },
      database: { status: 'healthy', uptime: '99.9% uptime' },
      fileStorage: { status: 'healthy', uptime: '99.9% uptime' },
      cdnNetwork: { status: 'healthy', uptime: '98.2% uptime' }
    };

    // Update with actual health data
    systemHealth.forEach(health => {
      const uptimeString = `${health.uptime}% uptime`;
      
      switch (health.service) {
        case 'api':
          transformedSystemHealth.apiServer = { 
            status: health.status, 
            uptime: uptimeString 
          };
          break;
        case 'database':
          transformedSystemHealth.database = { 
            status: health.status, 
            uptime: uptimeString 
          };
          break;
        case 'storage':
          transformedSystemHealth.fileStorage = { 
            status: health.status, 
            uptime: uptimeString 
          };
          break;
        case 'cdn':
          transformedSystemHealth.cdnNetwork = { 
            status: health.status, 
            uptime: uptimeString 
          };
          break;
      }
    });

    const stats = {
      totalUsers,
      totalFiles,
      totalStorage: totalStorage._sum.fileSize || 0,
      totalBandwidth: totalBandwidth * 1024 * 1024, // Estimate bandwidth
      usersToday,
      filesThisWeek,
      systemHealth: transformedSystemHealth,
      recentActivity: recentActivity.map(activity => ({
        action: activity.message,
        details: activity.type,
        time: activity.createdAt,
        severity: activity.type === 'DELETE' ? 'high' : 'medium',
        user: activity.user?.name || 'System'
      }))
    };

    res.json(stats);
  } catch (error) {
    console.error('Admin overview error:', error);
    res.status(500).json({ error: 'Failed to fetch admin overview' });
  }
});

// User Management
router.get('/users', async (req, res) => {
  try {
    const { search, role, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } }
      ];
    }
    if (role && role !== 'all') {
      where.role = role.toUpperCase();
    }

    const [users, totalUsers] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          lastLogin: true,
          _count: {
            select: {
              images: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.user.count({ where })
    ]);

    // Get storage usage and ban status for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const [storageUsed, activeBans] = await Promise.all([
          prisma.image.aggregate({
            where: { userId: user.id },
            _sum: { fileSize: true }
          }),
          prisma.userBan.findMany({
            where: {
              AND: [
                {
                  OR: [
                    { userId: user.id },
                    { email: user.email }
                  ]
                },
                { isActive: true },
                {
                  OR: [
                    { expiresAt: null }, // Permanent bans
                    { expiresAt: { gt: new Date() } } // Non-expired temporary bans
                  ]
                }
              ]
            }
          })
        ]);

        // Determine user status based on bans and activity
        let status = 'active';
        if (activeBans.length > 0) {
          status = 'banned';
        } else if (!user.lastLogin || (Date.now() - new Date(user.lastLogin).getTime()) >= 30 * 24 * 60 * 60 * 1000) {
          status = 'inactive';
        }

        return {
          ...user,
          uploads: user._count.images,
          storageUsed: storageUsed._sum.fileSize || 0,
          status,
          banInfo: activeBans.length > 0 ? {
            banType: activeBans[0].banType,
            reason: activeBans[0].reason,
            bannedAt: activeBans[0].bannedAt
          } : null
        };
      })
    );

    res.json({
      users: usersWithStats,
      totalUsers,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalUsers / limit)
    });
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user (role, status)
router.put('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, action } = req.body;

    if (action === 'suspend') {
      // For now, we'll just update lastLogin to mark as inactive
      await prisma.user.update({
        where: { id: userId },
        data: { lastLogin: new Date('1970-01-01') }
      });
    } else if (action === 'activate') {
      await prisma.user.update({
        where: { id: userId },
        data: { lastLogin: new Date() }
      });
    } else if (role) {
      await prisma.user.update({
        where: { id: userId },
        data: { role: role.toUpperCase() }
      });
    }

    // Log admin activity with better formatting
    let activityMessage;
    if (action === 'suspend') {
      activityMessage = `Admin suspended user account`;
    } else if (action === 'activate') {
      activityMessage = `Admin activated user account`;
    } else if (role) {
      activityMessage = `Admin changed user role to ${role}`;
    } else {
      activityMessage = `Admin updated user settings`;
    }
    
    await prisma.activity.create({
      data: {
        userId: req.user.id,
        type: 'SETTINGS_CHANGED',
        message: activityMessage,
        metadata: JSON.stringify({ action, role, targetUserId: userId }),
        isAdminActivity: true
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Admin user update error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Get detailed user profile
router.get('/users/:userId/profile', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        images: {
          select: {
            id: true,
            fileName: true,
            fileKey: true,
            fileSize: true,
            fileType: true,
            uploadedAt: true,
            _count: {
              select: {
                analytics: {
                  where: { event: 'VIEW' }
                }
              }
            }
          },
          orderBy: { uploadedAt: 'desc' },
          take: 20
        },
        activities: {
          select: {
            id: true,
            type: true,
            message: true,
            createdAt: true,
            ipAddress: true
          },
          orderBy: { createdAt: 'desc' },
          take: 50
        },
        accounts: {
          select: {
            provider: true,
            type: true
          }
        },
        _count: {
          select: {
            images: true,
            activities: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get storage usage and ban status
    const [storageUsed, recentAnalytics, activeBans] = await Promise.all([
      prisma.image.aggregate({
        where: { userId },
        _sum: { fileSize: true }
      }),
      prisma.analytics.findMany({
        where: { userId },
        include: {
          image: {
            select: {
              fileName: true,
              fileKey: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      }),
      prisma.userBan.findMany({
        where: {
          AND: [
            {
              OR: [
                { userId },
                { email: user.email }
              ]
            },
            { isActive: true },
            {
              OR: [
                { expiresAt: null }, // Permanent bans
                { expiresAt: { gt: new Date() } } // Non-expired temporary bans
              ]
            }
          ]
        },
        include: {
          bannedByUser: {
            select: { name: true, email: true }
          }
        }
      })
    ]);

    // Transform uploads data
    const uploads = user.images.map(image => ({
      ...image,
      viewCount: image._count.analytics
    }));

    // Determine user status based on bans and activity
    let status = 'active';
    if (activeBans.length > 0) {
      status = 'banned';
    } else if (!user.lastLogin || (Date.now() - new Date(user.lastLogin).getTime()) >= 30 * 24 * 60 * 60 * 1000) {
      status = 'inactive';
    }

    const profile = {
      ...user,
      uploads,
      totalUploads: user._count.images,
      totalActivities: user._count.activities,
      storageUsed: storageUsed._sum.fileSize || 0,
      recentAnalytics,
      status,
      banInfo: activeBans.length > 0 ? {
        banType: activeBans[0].banType,
        reason: activeBans[0].reason,
        bannedAt: activeBans[0].bannedAt,
        bannedBy: activeBans[0].bannedByUser
      } : null
    };

    res.json(profile);
  } catch (error) {
    console.error('Admin user profile error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Send password reset email
router.post('/users/:userId/reset-password', async (req, res) => {
  try {
    const { userId } = req.params;
    const emailService = require('../services/email.service');

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate reset token
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with reset token
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires
      }
    });

    // Send reset email
    await emailService.sendPasswordResetEmail(user.email, user.name, resetToken);

    // Log admin activity
    await prisma.activity.create({
      data: {
        userId: req.user.id,
        type: 'SETTINGS_CHANGED',
        message: `Admin sent password reset to user`,
        metadata: JSON.stringify({ 
          targetUserId: userId, 
          targetEmail: user.email,
          action: 'password_reset_sent' 
        }),
        isAdminActivity: true
      }
    });

    res.json({ 
      success: true, 
      message: 'Password reset email sent successfully' 
    });
  } catch (error) {
    console.error('Admin password reset error:', error);
    res.status(500).json({ error: 'Failed to send password reset email' });
  }
});

// Ban user
router.post('/users/:userId/ban', async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason, banType = 'ACCOUNT' } = req.body; // ACCOUNT, EMAIL, IP, FULL

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        activities: {
          select: { ipAddress: true },
          where: { ipAddress: { not: null } },
          distinct: ['ipAddress'],
          take: 20
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Collect IP addresses for IP-based bans
    const ipAddresses = user.activities.map(a => a.ipAddress).filter(Boolean);

    // Create ban record in dedicated table
    const ban = await prisma.userBan.create({
      data: {
        userId,
        email: user.email,
        ipAddresses: ipAddresses.length > 0 ? JSON.stringify(ipAddresses) : null,
        banType: banType.toUpperCase(),
        reason: reason || 'Banned by administrator',
        bannedBy: req.user.id,
        isActive: true,
        metadata: JSON.stringify({
          originalIpCount: ipAddresses.length,
          bannedFromAdmin: true
        })
      }
    });

    // Deactivate user account for account-based bans
    if (banType === 'ACCOUNT' || banType === 'FULL') {
      await prisma.user.update({
        where: { id: userId },
        data: { 
          lastLogin: new Date('1970-01-01'), // Mark as inactive
          emailVerified: null // Invalidate email verification
        }
      });

      // Delete user sessions
      await prisma.session.deleteMany({
        where: { userId }
      });
    }

    // Log admin activity
    await prisma.activity.create({
      data: {
        userId: req.user.id,
        type: 'SETTINGS_CHANGED',
        message: `Admin banned user account (${banType} ban)`,
        metadata: JSON.stringify({ 
          targetUserId: userId, 
          targetEmail: user.email,
          banType,
          reason,
          banId: ban.id,
          ipCount: ipAddresses.length,
          action: 'user_banned' 
        }),
        isAdminActivity: true
      }
    });

    res.json({ 
      success: true, 
      message: `User banned successfully (${banType} ban)`,
      banId: ban.id,
      ipAddressesTracked: ipAddresses.length
    });
  } catch (error) {
    console.error('Admin ban user error:', error);
    res.status(500).json({ error: 'Failed to ban user' });
  }
});

// Unban user
router.post('/users/:userId/unban', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find and deactivate active ban records
    const activeBans = await prisma.userBan.findMany({
      where: {
        AND: [
          {
            OR: [
              { userId },
              { email: user.email }
            ]
          },
          { isActive: true },
          {
            OR: [
              { expiresAt: null }, // Permanent bans
              { expiresAt: { gt: new Date() } } // Non-expired temporary bans
            ]
          }
        ]
      }
    });

    const unbannedBans = [];
    for (const ban of activeBans) {
      const unbannedBan = await prisma.userBan.update({
        where: { id: ban.id },
        data: {
          isActive: false,
          unbannedAt: new Date(),
          unbannedBy: req.user.id
        }
      });
      unbannedBans.push(unbannedBan);
    }

    // Reactivate user account
    await prisma.user.update({
      where: { id: userId },
      data: { 
        lastLogin: new Date(), // Mark as active
        emailVerified: new Date() // Re-verify email
      }
    });

    // Log admin activity
    await prisma.activity.create({
      data: {
        userId: req.user.id,
        type: 'SETTINGS_CHANGED',
        message: `Admin unbanned user account`,
        metadata: JSON.stringify({ 
          targetUserId: userId, 
          targetEmail: user.email,
          unbannedBanIds: unbannedBans.map(b => b.id),
          bansRemoved: unbannedBans.length,
          action: 'user_unbanned' 
        }),
        isAdminActivity: true
      }
    });

    res.json({ 
      success: true, 
      message: 'User unbanned successfully',
      bansRemoved: unbannedBans.length
    });
  } catch (error) {
    console.error('Admin unban user error:', error);
    res.status(500).json({ error: 'Failed to unban user' });
  }
});

// Delete user
router.delete('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete user's files first
    await prisma.image.deleteMany({
      where: { userId }
    });

    // Delete related records
    await prisma.analytics.deleteMany({
      where: { userId }
    });

    await prisma.activity.deleteMany({
      where: { userId }
    });

    await prisma.account.deleteMany({
      where: { userId }
    });

    await prisma.session.deleteMany({
      where: { userId }
    });

    // Delete user
    await prisma.user.delete({
      where: { id: userId }
    });

    // Log admin activity
    await prisma.activity.create({
      data: {
        userId: req.user.id,
        type: 'SETTINGS_CHANGED',
        message: `Admin deleted user account: ${user.email}`,
        metadata: JSON.stringify({ 
          targetUserId: userId, 
          targetEmail: user.email,
          targetName: user.name,
          action: 'delete_user' 
        }),
        isAdminActivity: true
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Admin user delete error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Global File Management
router.get('/files', async (req, res) => {
  try {
    const { search, type, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (search) {
      where.fileName = { contains: search };
    }
    if (type && type !== 'all') {
      where.fileType = { contains: type };
    }

    const [files, totalFiles, fileStats] = await Promise.all([
      prisma.image.findMany({
        where,
        include: {
          user: {
            select: { name: true, email: true }
          },
          _count: {
            select: {
              analytics: {
                where: { event: 'VIEW' }
              }
            }
          }
        },
        orderBy: { uploadedAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.image.count({ where }),
      
      // File statistics
      Promise.all([
        prisma.image.count(),
        prisma.image.count({
          where: { fileSize: { gt: 100 * 1024 * 1024 } } // >100MB
        }),
        // Flagged content: files with suspicious names or excessive views
        prisma.image.count({
          where: {
            OR: [
              { fileName: { contains: 'spam' } },
              { fileName: { contains: 'test' } },
              { fileName: { contains: 'abuse' } }
            ]
          }
        }),
        // Orphaned files: files with no recent analytics (not viewed in 90 days)
        prisma.image.count({
          where: {
            analytics: {
              none: {
                createdAt: {
                  gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
                }
              }
            }
          }
        })
      ])
    ]);

    const [totalCount, largeFiles, flaggedFiles, orphanedFiles] = fileStats;

    res.json({
      files: files.map(file => ({
        ...file,
        viewCount: file._count.analytics,
        owner: file.user
      })),
      totalFiles,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalFiles / limit),
      stats: {
        totalFiles: totalCount,
        largeFiles,
        flaggedFiles,
        orphanedFiles
      }
    });
  } catch (error) {
    console.error('Admin files error:', error);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// Global Analytics
router.get('/analytics', async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    let startDate;
    switch (period) {
      case '24h':
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      default: // 7d
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }

    const [
      totalViews,
      totalUploads,
      topFiles,
      userGrowth,
      storageGrowth
    ] = await Promise.all([
      // Total views in period
      prisma.analytics.count({
        where: {
          event: 'VIEW',
          createdAt: { gte: startDate }
        }
      }),
      
      // Total uploads in period
      prisma.image.count({
        where: {
          uploadedAt: { gte: startDate }
        }
      }),
      
      // Top performing files
      prisma.image.findMany({
        include: {
          _count: {
            select: {
              analytics: {
                where: { 
                  event: 'VIEW',
                  createdAt: { gte: startDate }
                }
              }
            }
          }
        },
        orderBy: {
          analytics: {
            _count: 'desc'
          }
        },
        take: 10
      }),
      
      // User growth over time
      prisma.user.groupBy({
        by: ['createdAt'],
        where: {
          createdAt: { gte: startDate }
        },
        _count: true
      }),
      
      // Storage growth
      prisma.image.aggregate({
        where: {
          uploadedAt: { gte: startDate }
        },
        _sum: { fileSize: true }
      })
    ]);

    res.json({
      totalViews,
      totalUploads,
      topFiles: topFiles.map(file => ({
        fileName: file.fileName,
        views: file._count.analytics,
        fileSize: file.fileSize
      })),
      userGrowth: userGrowth.length,
      storageGrowth: storageGrowth._sum.fileSize || 0,
      period
    });
  } catch (error) {
    console.error('Admin analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// System Settings
router.get('/settings', async (req, res) => {
  try {
    // Get all settings from database
    const settingsData = await prisma.systemSettings.findMany();
    
    // Convert to object format
    const settings = {};
    settingsData.forEach(setting => {
      // Parse boolean and number values
      let value = setting.value;
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      else if (!isNaN(value) && !isNaN(parseFloat(value))) value = parseFloat(value);
      
      settings[setting.key] = value;
    });

    // Set defaults if settings don't exist
    const defaultSettings = {
      userRegistration: true,
      maintenanceMode: false,
      guestUploadLimit: 10, // MB
      userStorageLimit: 10, // GB
      maxFileSize: 100 // MB
    };

    // Merge defaults with existing settings
    const finalSettings = { ...defaultSettings, ...settings };

    res.json(finalSettings);
  } catch (error) {
    console.error('Admin settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update System Settings
router.put('/settings', async (req, res) => {
  try {
    const settings = req.body;
    
    // Update each setting in the database
    for (const [key, value] of Object.entries(settings)) {
      await prisma.systemSettings.upsert({
        where: { key },
        update: { 
          value: String(value),
          updatedBy: req.user.id
        },
        create: { 
          key,
          value: String(value),
          updatedBy: req.user.id
        }
      });
    }
    
    // Log admin activity with better formatting
    const changedSettings = Object.keys(settings);
    let activityMessage = 'Admin updated system settings';
    
    // Create more descriptive messages based on what was changed
    if (changedSettings.includes('maintenanceMode')) {
      const status = settings.maintenanceMode ? 'enabled' : 'disabled';
      activityMessage = `Admin ${status} maintenance mode`;
    } else if (changedSettings.includes('userRegistration')) {
      const status = settings.userRegistration ? 'enabled' : 'disabled';
      activityMessage = `Admin ${status} user registration`;
    } else if (changedSettings.length === 1) {
      activityMessage = `Admin updated ${changedSettings[0]}`;
    }
    
    // Invalidate public system settings cache
    await cache.delete('public-system-settings');
    console.log('[Cache] Invalidated public system settings cache after update');

    await prisma.activity.create({
      data: {
        userId: req.user.id,
        type: 'SETTINGS_CHANGED',
        message: activityMessage,
        metadata: JSON.stringify(settings),
        isAdminActivity: true
      }
    });

    res.json({ success: true, settings });
  } catch (error) {
    console.error('Admin settings update error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// System Logs
router.get('/logs', async (req, res) => {
  try {
    const { level, source, page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (level && level !== 'all') {
      where.level = level.toUpperCase();
    }
    if (source && source !== 'all') {
      where.source = source;
    }

    // Get actual system logs from database
    const [systemLogs, totalCount] = await Promise.all([
      prisma.systemLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit),
        include: {
          user: {
            select: { name: true, email: true }
          }
        }
      }),
      prisma.systemLog.count({ where })
    ]);

    const logs = systemLogs.map(log => ({
      id: log.id,
      time: log.createdAt.toISOString(),
      level: log.level,
      message: log.message,
      source: log.source,
      user: log.user ? log.user.name : 'System',
      userEmail: log.user ? log.user.email : null,
      ipAddress: log.ipAddress,
      metadata: log.metadata ? JSON.parse(log.metadata) : null
    }));

    res.json({
      logs,
      totalLogs: totalCount,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalCount / limit),
      sources: ['all', 'api', 'security', 'database', 'storage', 'cdn'],
      levels: ['all', 'INFO', 'WARN', 'ERROR', 'DEBUG']
    });
  } catch (error) {
    console.error('Admin logs error:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Clean up old logs
router.delete('/logs', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const cutoffDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

    const deletedCount = await prisma.systemLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate }
      }
    });

    // Log admin activity
    await prisma.activity.create({
      data: {
        userId: req.user.id,
        type: 'SETTINGS_CHANGED',
        message: `Admin cleaned up system logs older than ${days} days`,
        metadata: JSON.stringify({ deletedCount: deletedCount.count, days: parseInt(days) }),
        isAdminActivity: true
      }
    });

    res.json({ 
      success: true, 
      deletedCount: deletedCount.count,
      message: `Deleted ${deletedCount.count} log entries older than ${days} days`
    });
  } catch (error) {
    console.error('Admin log cleanup error:', error);
    res.status(500).json({ error: 'Failed to clean up logs' });
  }
});

// System Health Overview
router.get('/health', async (req, res) => {
  try {
    const healthData = await prisma.systemHealth.findMany({
      orderBy: { lastCheck: 'desc' }
    });
    
    const systemOverview = {
      overall: 'healthy',
      services: {},
      lastUpdated: new Date().toISOString(),
      stats: {
        totalServices: 0,
        healthyServices: 0,
        degradedServices: 0,
        downServices: 0
      }
    };
    
    // Process health data
    healthData.forEach(service => {
      systemOverview.services[service.service] = {
        status: service.status,
        uptime: service.uptime,
        responseTime: service.responseTime,
        lastCheck: service.lastCheck,
        metadata: service.metadata ? JSON.parse(service.metadata) : null
      };
      
      // Update stats
      systemOverview.stats.totalServices++;
      if (service.status === 'healthy') {
        systemOverview.stats.healthyServices++;
      } else if (service.status === 'degraded') {
        systemOverview.stats.degradedServices++;
      } else if (service.status === 'down') {
        systemOverview.stats.downServices++;
      }
      
      // Determine overall status
      if (service.status === 'down') {
        systemOverview.overall = 'down';
      } else if (service.status === 'degraded' && systemOverview.overall !== 'down') {
        systemOverview.overall = 'degraded';
      }
    });
    
    res.json(systemOverview);
  } catch (error) {
    console.error('Admin health overview error:', error);
    res.status(500).json({ error: 'Failed to fetch system health' });
  }
});

// System Health History
router.get('/health/history', async (req, res) => {
  try {
    const { service, hours = 24 } = req.query;
    const startTime = new Date(Date.now() - parseInt(hours) * 60 * 60 * 1000);
    
    const where = {
      lastCheck: { gte: startTime }
    };
    
    if (service && service !== 'all') {
      where.service = service;
    }
    
    // Since we're upserting, we won't have historical data
    // But we can provide current status and simulate some history
    const currentHealth = await prisma.systemHealth.findMany({
      where: service && service !== 'all' ? { service } : {},
      orderBy: { lastCheck: 'desc' }
    });
    
    // Create a simple history response
    const history = currentHealth.map(health => ({
      service: health.service,
      status: health.status,
      uptime: health.uptime,
      responseTime: health.responseTime,
      timestamp: health.lastCheck,
      metadata: health.metadata ? JSON.parse(health.metadata) : null
    }));
    
    res.json({
      history,
      period: `${hours} hours`,
      services: currentHealth.map(h => h.service),
      totalDataPoints: history.length
    });
  } catch (error) {
    console.error('Admin health history error:', error);
    res.status(500).json({ error: 'Failed to fetch health history' });
  }
});

// Trigger Health Check
router.post('/health/check', async (req, res) => {
  try {
    // Trigger a health check by calling our health endpoint
    const response = await fetch(`${req.protocol}://${req.get('host')}/health/detailed`);
    const healthData = await response.json();
    
    // Log admin activity
    await prisma.activity.create({
      data: {
        userId: req.user.id,
        type: 'SETTINGS_CHANGED',
        message: 'Admin triggered manual health check',
        metadata: JSON.stringify({ status: healthData.status }),
        isAdminActivity: true
      }
    });
    
    res.json({
      success: true,
      message: 'Health check triggered successfully',
      status: healthData.status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Admin health check trigger error:', error);
    res.status(500).json({ error: 'Failed to trigger health check' });
  }
});

// System Messages Management
router.get('/messages', async (req, res) => {
  try {
    const messages = await prisma.systemMessage.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { name: true, email: true }
        }
      }
    });

    res.json({ messages });
  } catch (error) {
    console.error('Admin messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

router.post('/messages', async (req, res) => {
  try {
    const { title, content, type } = req.body;

    if (!title || !content || !type) {
      return res.status(400).json({ error: 'Title, content, and type are required' });
    }

    if (!['CRITICAL', 'WARNING', 'INFO'].includes(type)) {
      return res.status(400).json({ error: 'Invalid message type' });
    }

    const message = await prisma.systemMessage.create({
      data: {
        title,
        content,
        type,
        createdBy: req.user.id
      },
      include: {
        user: {
          select: { name: true, email: true }
        }
      }
    });

    // Invalidate public system messages cache
    await cache.delete('public-system-messages');
    console.log('[Cache] Invalidated public system messages cache after creation');

    // Log admin activity
    await prisma.activity.create({
      data: {
        userId: req.user.id,
        type: 'SETTINGS_CHANGED',
        message: `Admin created system message: ${title}`,
        metadata: JSON.stringify({ messageId: message.id, type, title }),
        isAdminActivity: true
      }
    });

    res.json({ success: true, message });
  } catch (error) {
    console.error('Admin create message error:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
});

router.put('/messages/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { title, content, type, isActive } = req.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (type !== undefined) updateData.type = type;
    if (isActive !== undefined) updateData.isActive = isActive;

    const message = await prisma.systemMessage.update({
      where: { id: messageId },
      data: updateData,
      include: {
        user: {
          select: { name: true, email: true }
        }
      }
    });

    // Invalidate public system messages cache
    await cache.delete('public-system-messages');
    console.log('[Cache] Invalidated public system messages cache after update');

    // Log admin activity
    const action = isActive !== undefined ? 
      (isActive ? 'activated' : 'deactivated') : 'updated';
    
    await prisma.activity.create({
      data: {
        userId: req.user.id,
        type: 'SETTINGS_CHANGED',
        message: `Admin ${action} system message: ${message.title}`,
        metadata: JSON.stringify({ messageId, action, updates: updateData }),
        isAdminActivity: true
      }
    });

    res.json({ success: true, message });
  } catch (error) {
    console.error('Admin update message error:', error);
    res.status(500).json({ error: 'Failed to update message' });
  }
});

router.delete('/messages/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await prisma.systemMessage.findUnique({
      where: { id: messageId }
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    await prisma.systemMessage.delete({
      where: { id: messageId }
    });

    // Invalidate public system messages cache
    await cache.delete('public-system-messages');
    console.log('[Cache] Invalidated public system messages cache after deletion');

    // Log admin activity
    await prisma.activity.create({
      data: {
        userId: req.user.id,
        type: 'SETTINGS_CHANGED',
        message: `Admin deleted system message: ${message.title}`,
        metadata: JSON.stringify({ messageId, title: message.title }),
        isAdminActivity: true
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Admin delete message error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// Create new user (admin function)
router.post('/users', async (req, res) => {
  try {
    const { name, email, password, role = 'USER' } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role.toUpperCase(),
        r2FolderName: `user_${Date.now()}_${Math.random().toString(36).substring(7)}`
      }
    });

    // Log admin activity
    await prisma.activity.create({
      data: {
        userId: req.user.id,
        type: 'SETTINGS_CHANGED',
        message: `Admin created new user account`,
        metadata: JSON.stringify({ newUserId: user.id, role, email, action: 'create_user' }),
        isAdminActivity: true
      }
    });

    res.json({ 
      success: true, 
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Admin create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Guest Upload Cleanup Management
router.get('/cleanup/stats', async (req, res) => {
  try {
    const stats = await cleanupService.getCleanupStats();
    res.json(stats);
  } catch (error) {
    console.error('Admin cleanup stats error:', error);
    res.status(500).json({ error: 'Failed to fetch cleanup statistics' });
  }
});

router.post('/cleanup/run', async (req, res) => {
  try {
    const result = await cleanupService.manualCleanup();
    
    // Log admin activity
    await prisma.activity.create({
      data: {
        userId: req.user.id,
        type: 'SETTINGS_CHANGED',
        message: `Admin triggered manual guest upload cleanup`,
        metadata: JSON.stringify({ 
          deletedCount: result.deletedCount,
          errorCount: result.errorCount,
          totalExpired: result.totalExpired
        }),
        isAdminActivity: true
      }
    });
    
    res.json({ 
      success: true, 
      message: `Cleanup completed: ${result.deletedCount} files deleted, ${result.errorCount} errors`,
      result 
    });
  } catch (error) {
    console.error('Admin manual cleanup error:', error);
    res.status(500).json({ error: 'Failed to run cleanup' });
  }
});

// Guest uploads listing for admin
router.get('/guest-uploads', async (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    const now = new Date();

    let where = {};
    if (status === 'active') {
      where = { isDeleted: false, expiresAt: { gt: now } };
    } else if (status === 'expired') {
      where = { isDeleted: false, expiresAt: { lt: now } };
    } else if (status === 'deleted') {
      where = { isDeleted: true };
    }

    const [uploads, totalCount] = await Promise.all([
      prisma.guestUpload.findMany({
        where,
        orderBy: { uploadedAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.guestUpload.count({ where })
    ]);

    const uploadsWithStatus = uploads.map(upload => ({
      ...upload,
      status: upload.isDeleted ? 'deleted' : 
              (upload.expiresAt < now ? 'expired' : 'active'),
      daysUntilExpiry: upload.isDeleted ? null : 
                      Math.ceil((upload.expiresAt - now) / (1000 * 60 * 60 * 24))
    }));

    res.json({
      uploads: uploadsWithStatus,
      totalCount,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalCount / limit)
    });
  } catch (error) {
    console.error('Admin guest uploads error:', error);
    res.status(500).json({ error: 'Failed to fetch guest uploads' });
  }
});

module.exports = router; 




