const express = require('express');
const cleanupService = require('../services/cleanup.service');
const prisma = require('../lib/prisma');
const { cache } = require('../lib/cache');

const router = express.Router();

// Get public system settings (maintenance mode, registration status)
router.get('/settings', async (req, res) => {
  try {
    // Check cache first
    const cacheKey = 'public-system-settings';
    const cachedSettings = cache.get(cacheKey);
    
    if (cachedSettings) {
      console.log('[Cache] Hit for public system settings');
      return res.json(cachedSettings);
    }

    // Fetch from database if not cached
    console.log('[Cache] Miss for public system settings - fetching from DB');
    const publicSettings = await prisma.systemSettings.findMany({
      where: {
        key: {
          in: ['maintenanceMode', 'userRegistration', 'guestUploadLimit', 'maxFileSize']
        }
      }
    });

    // Convert to object format
    const settings = {};
    publicSettings.forEach(setting => {
      let value = setting.value;
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      else if (!isNaN(value) && !isNaN(parseFloat(value))) value = parseFloat(value);
      
      settings[setting.key] = value;
    });

    // Set defaults for missing settings
    const defaults = {
      maintenanceMode: false,
      userRegistration: true,
      guestUploadLimit: 10,
      maxFileSize: 100
    };

    const finalSettings = { ...defaults, ...settings };

    // Cache for 5 minutes (300000ms) - settings change less frequently
    cache.set(cacheKey, finalSettings, 300000);
    console.log('[Cache] Stored public system settings in cache');

    res.json(finalSettings);
  } catch (error) {
    console.error('Public settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Get active system messages for main page
router.get('/messages', async (req, res) => {
  try {
    // Check cache first
    const cacheKey = 'public-system-messages';
    const cachedMessages = cache.get(cacheKey);
    
    if (cachedMessages) {
      console.log('[Cache] Hit for public system messages');
      return res.json({ messages: cachedMessages });
    }

    // Fetch from database if not cached
    console.log('[Cache] Miss for public system messages - fetching from DB');
    const messages = await prisma.systemMessage.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        content: true,
        type: true,
        createdAt: true
      }
    });

    // Cache for 10 minutes (600000ms)
    cache.set(cacheKey, messages, 600000);
    console.log(`[Cache] Stored ${messages.length} system messages in cache`);

    res.json({ messages });
  } catch (error) {
    console.error('Public messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Webhook endpoint for automated cleanup (can be called by external cron services)
router.post('/cleanup/webhook', async (req, res) => {
  try {
    // Verify webhook secret if provided
    const webhookSecret = process.env.CLEANUP_WEBHOOK_SECRET;
    if (webhookSecret) {
      const providedSecret = req.headers['x-webhook-secret'] || req.body.secret;
      if (providedSecret !== webhookSecret) {
        return res.status(401).json({ error: 'Invalid webhook secret' });
      }
    }

    console.log('Cleanup webhook triggered');
    const result = await cleanupService.deleteExpiredGuestUploads();
    
    // Log the webhook cleanup
    await prisma.systemLog.create({
      data: {
        level: 'INFO',
        message: `Webhook cleanup completed: ${result.deletedCount} files deleted, ${result.errorCount} errors`,
        source: 'webhook',
        metadata: {
          ...result,
          triggeredBy: 'webhook',
          userAgent: req.headers['user-agent'],
          ip: req.ip
        }
      }
    });

    res.json({
      success: true,
      message: `Cleanup completed: ${result.deletedCount} files deleted`,
      result
    });
  } catch (error) {
    console.error('Webhook cleanup error:', error);
    
    // Log the error
    await prisma.systemLog.create({
      data: {
        level: 'ERROR',
        message: 'Webhook cleanup failed',
        source: 'webhook',
        metadata: {
          error: error.message,
          userAgent: req.headers['user-agent'],
          ip: req.ip
        }
      }
    });
    
    res.status(500).json({ error: 'Cleanup failed', message: error.message });
  }
});

// Get cleanup statistics (public endpoint for monitoring)
router.get('/cleanup/stats', async (req, res) => {
  try {
    const stats = await cleanupService.getCleanupStats();
    res.json(stats);
  } catch (error) {
    console.error('Public cleanup stats error:', error);
    res.status(500).json({ error: 'Failed to fetch cleanup statistics' });
  }
});

module.exports = router; 