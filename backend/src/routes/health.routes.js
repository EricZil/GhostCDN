/**
 * Health check routes
 * Provides system health monitoring endpoints
 */

const express = require('express');
const prisma = require('../lib/prisma');
const { S3Client, HeadBucketCommand } = require('@aws-sdk/client-s3');

const router = express.Router();


// Helper function to update system health in database
const updateSystemHealth = async (service, status, responseTime = null, metadata = null) => {
  try {
    const uptime = status === 'healthy' ? 100 : status === 'degraded' ? 75 : 0;
    
    await prisma.systemHealth.upsert({
      where: { service },
      update: {
        status,
        uptime,
        responseTime,
        lastCheck: new Date(),
        metadata: metadata ? JSON.stringify(metadata) : null
      },
      create: {
        service,
        status,
        uptime,
        responseTime,
        lastCheck: new Date(),
        metadata: metadata ? JSON.stringify(metadata) : null
      }
    });
  } catch (error) {
    console.error(`Failed to update system health for ${service}:`, error);
  }
};

// DigitalOcean Spaces client for health checks
const doSpacesClient = new S3Client({
  credentials: {
    accessKeyId: process.env.DO_SPACES_ACCESS_KEY_ID,
    secretAccessKey: process.env.DO_SPACES_SECRET_ACCESS_KEY,
  },
  endpoint: `https://${process.env.DO_SPACES_REGION}.digitaloceanspaces.com`,
  region: process.env.DO_SPACES_REGION || 'fra1',
  forcePathStyle: false,
});

// Basic health check
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'GhostCDN API is running',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Detailed health check
router.get('/detailed', async (req, res) => {
  const healthChecks = {
    api: { status: 'ok', message: 'API server is running' },
    database: { status: 'unknown', message: 'Checking...' },
    storage: { status: 'unknown', message: 'Checking...' },
    environment: { status: 'unknown', message: 'Checking...' }
  };
  
  let overallStatus = 'ok';
  
  try {
    // Database health check
    try {
      const startTime = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      const userCount = await prisma.user.count();
      const imageCount = await prisma.image.count();
      const responseTime = Date.now() - startTime;
      
      healthChecks.database = {
        status: 'ok',
        message: 'Database connection successful',
        responseTime
      };
      
      // Update database health in SystemHealth table
      await updateSystemHealth('database', 'healthy', responseTime, {
        userCount,
        imageCount,
        connectionPool: 'active'
      });
      
    } catch (dbError) {
      healthChecks.database = {
        status: 'error',
        message: 'Database connection failed',
        error: dbError.message
      };
      overallStatus = 'degraded';
      
      // Update database health in SystemHealth table
      await updateSystemHealth('database', 'down', null, {
        error: dbError.message
      });
    }
    
    // Storage health check
    try {
      const bucketName = process.env.DO_SPACES_BUCKET_NAME;
      if (bucketName) {
        const startTime = Date.now();
        await doSpacesClient.send(new HeadBucketCommand({ Bucket: bucketName }));
        const responseTime = Date.now() - startTime;
        
        healthChecks.storage = {
          status: 'ok',
          message: 'Storage connection successful',
          responseTime,
          provider: 'digitalocean-spaces'
        };
        
        // Update storage health in SystemHealth table
        await updateSystemHealth('storage', 'healthy', responseTime, {
          provider: 'digitalocean-spaces',
          bucket: bucketName,
          region: process.env.DO_SPACES_REGION
        });
        
      } else {
        healthChecks.storage = {
          status: 'warning',
          message: 'Storage not configured'
        };
        
        await updateSystemHealth('storage', 'degraded', null, {
          issue: 'not configured'
        });
      }
    } catch (storageError) {
      healthChecks.storage = {
        status: 'error',
        message: 'Storage connection failed',
        error: storageError.message
      };
      overallStatus = 'degraded';
      
      // Update storage health in SystemHealth table
      await updateSystemHealth('storage', 'down', null, {
        error: storageError.message
      });
    }
    
    // CDN Network check (using DO Spaces as CDN)
    try {
      const publicUrl = process.env.DO_SPACES_PUBLIC_URL;
      if (publicUrl) {
        const startTime = Date.now();
        // Test CDN connectivity by checking if we can reach the public URL
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const testResponse = await fetch(`${publicUrl}/health-check`, { 
          method: 'HEAD',
          signal: controller.signal
        }).catch(() => null);
        
        clearTimeout(timeoutId);
        
        const responseTime = Date.now() - startTime;
        const isHealthy = testResponse && testResponse.ok;
        
        healthChecks.environment = {
          status: isHealthy ? 'ok' : 'degraded',
          message: isHealthy ? 'CDN network accessible' : 'CDN network degraded',
          responseTime
        };
        
        await updateSystemHealth('cdn', isHealthy ? 'healthy' : 'degraded', responseTime, {
          publicUrl,
          accessible: isHealthy,
          checkType: 'manual'
        });
        
        if (!isHealthy && overallStatus === 'ok') overallStatus = 'warning';
      } else {
        healthChecks.environment = {
          status: 'warning',
          message: 'CDN public URL not configured'
        };
        
        await updateSystemHealth('cdn', 'degraded', null, {
          issue: 'not configured',
          checkType: 'manual'
        });
        
        if (overallStatus === 'ok') overallStatus = 'warning';
      }
    } catch (cdnError) {
      healthChecks.environment = {
        status: 'error',
        message: 'CDN network check failed',
        error: cdnError.message
      };
      
      await updateSystemHealth('cdn', 'down', null, {
        error: cdnError.message,
        checkType: 'manual'
      });
      
      overallStatus = 'degraded';
    }
    
    // Update API health
    await updateSystemHealth('api', 'healthy', null, {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0'
    });
    
  } catch (error) {
    overallStatus = 'error';
    await updateSystemHealth('api', 'down', null, {
      error: error.message
    });
  }
  
  res.status(overallStatus === 'ok' ? 200 : overallStatus === 'warning' ? 200 : 503).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks: healthChecks,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Database-specific health check
router.get('/database', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Test basic connectivity
    await prisma.$queryRaw`SELECT 1`;
    
    // Test table access
    const userCount = await prisma.user.count();
    const imageCount = await prisma.image.count();
    
    const responseTime = Date.now() - startTime;
    
    res.status(200).json({
      status: 'ok',
      message: 'Database is healthy',
      responseTime,
      stats: {
        users: userCount,
        images: imageCount
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'Database health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Storage-specific health check
router.get('/storage', async (req, res) => {
  try {
    const bucketName = process.env.DO_SPACES_BUCKET_NAME;
    
    if (!bucketName) {
      return res.status(503).json({
        status: 'error',
        message: 'Storage not configured - missing bucket name',
        timestamp: new Date().toISOString()
      });
    }
    
    const startTime = Date.now();
    await doSpacesClient.send(new HeadBucketCommand({ Bucket: bucketName }));
    const responseTime = Date.now() - startTime;
    
    res.status(200).json({
      status: 'ok',
      message: 'Storage is healthy',
      responseTime,
      provider: 'digitalocean-spaces',
      bucket: bucketName,
      region: process.env.DO_SPACES_REGION,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'Storage health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Readiness probe (for Kubernetes/Docker)
router.get('/ready', async (req, res) => {
  try {
    // Quick database check
    await prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Liveness probe (for Kubernetes/Docker)
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// System health overview (from database)
router.get('/system', async (req, res) => {
  try {
    const healthData = await prisma.systemHealth.findMany({
      orderBy: { lastCheck: 'desc' }
    });
    
    const systemOverview = {
      overall: 'healthy',
      services: {},
      lastUpdated: new Date().toISOString()
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
      
      // Determine overall status
      if (service.status === 'down') {
        systemOverview.overall = 'down';
      } else if (service.status === 'degraded' && systemOverview.overall !== 'down') {
        systemOverview.overall = 'degraded';
      }
    });
    
    res.status(200).json(systemOverview);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch system health',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Background health check function (can be called by cron job or scheduler)
const performBackgroundHealthCheck = async () => {
  try {
    console.log('🔍 Performing background health check...');
    
    // Check database
    try {
      const startTime = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      const userCount = await prisma.user.count();
      const imageCount = await prisma.image.count();
      const responseTime = Date.now() - startTime;
      
      await updateSystemHealth('database', 'healthy', responseTime, {
        userCount,
        imageCount,
        connectionPool: 'active',
        checkType: 'background'
      });
    } catch (error) {
      await updateSystemHealth('database', 'down', null, {
        error: error.message,
        checkType: 'background'
      });
    }
    
    // Check storage
    try {
      const bucketName = process.env.DO_SPACES_BUCKET_NAME;
      if (bucketName) {
        const startTime = Date.now();
        await doSpacesClient.send(new HeadBucketCommand({ Bucket: bucketName }));
        const responseTime = Date.now() - startTime;
        
        await updateSystemHealth('storage', 'healthy', responseTime, {
          provider: 'digitalocean-spaces',
          bucket: bucketName,
          region: process.env.DO_SPACES_REGION,
          checkType: 'background'
        });
      } else {
        await updateSystemHealth('storage', 'degraded', null, {
          issue: 'not configured',
          checkType: 'background'
        });
      }
    } catch (error) {
      await updateSystemHealth('storage', 'down', null, {
        error: error.message,
        checkType: 'background'
      });
    }
    
    // Check CDN network
    try {
      const publicUrl = process.env.DO_SPACES_PUBLIC_URL;
      if (publicUrl) {
        const startTime = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const testResponse = await fetch(`${publicUrl}/health-check`, { 
          method: 'HEAD',
          signal: controller.signal
        }).catch(() => null);
        
        clearTimeout(timeoutId);
        
        const responseTime = Date.now() - startTime;
        const isHealthy = testResponse && testResponse.ok;
        
        await updateSystemHealth('cdn', isHealthy ? 'healthy' : 'degraded', responseTime, {
          publicUrl,
          accessible: isHealthy,
          checkType: 'background'
        });
      } else {
        await updateSystemHealth('cdn', 'degraded', null, {
          issue: 'not configured',
          checkType: 'background'
        });
      }
    } catch (error) {
      await updateSystemHealth('cdn', 'down', null, {
        error: error.message,
        checkType: 'background'
      });
    }
    
    // Update API health
    await updateSystemHealth('api', 'healthy', null, {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0',
      checkType: 'background'
    });
    
    console.log('✅ Background health check completed');
  } catch (error) {
    console.error('❌ Background health check failed:', error);
    await updateSystemHealth('api', 'down', null, {
      error: error.message,
      checkType: 'background'
    });
  }
};

// Export the background health check function as well
module.exports = { 
  router, 
  performBackgroundHealthCheck 
}; 