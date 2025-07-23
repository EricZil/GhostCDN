require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');

// Import custom middleware
const corsMiddleware = require('./middleware/cors.middleware');
const { securityHeaders, additionalSecurity, fileUploadSecurity } = require('./middleware/security.middleware');
const { generalLimiter, uploadLimiter, adminLimiter, publicLimiter } = require('./middleware/rateLimiter.middleware');
const { requestLogger, errorLogger, securityLogger, apiRequestLogger, databaseErrorLogger, seedTestLogs } = require('./middleware/logger.middleware');

const uploadRoutes = require('./routes/upload.routes');
const storageRoutes = require('./routes/storage.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const adminRoutes = require('./routes/admin.routes');
const publicRoutes = require('./routes/public.routes');
const authRoutes = require('./routes/auth.routes');
const apiKeysRoutes = require('./routes/apiKeys');
const apiRoutes = require('./routes/api.routes');
const { router: healthRoutes, performBackgroundHealthCheck } = require('./routes/health.routes');
const { validateApiKey } = require('./middleware/apiKey.middleware');
const prisma = require('./lib/prisma');
const { cache } = require('./lib/cache-manager');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy headers when deployed on Vercel or other reverse proxies
// This is required for express-rate-limit to work correctly with X-Forwarded-For headers
// Using specific proxy configuration instead of 'true' for better security
if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
  // Trust Vercel's proxy infrastructure and common cloud provider IPs
  // This is more secure than 'true' while still working with Vercel
  app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);
} else {
  // In development, only trust localhost proxies
  app.set('trust proxy', 'loopback');
}

// Security middleware (order matters!)
app.use(securityHeaders);
app.use(additionalSecurity);
app.use(corsMiddleware);

// Request logging
app.use(requestLogger);
app.use(securityLogger);
app.use(apiRequestLogger);

// Rate limiting
app.use(generalLimiter);

// Body parsing with size limits
app.use(bodyParser.json({ limit: '20mb' }));
app.use(bodyParser.urlencoded({ limit: '20mb', extended: true }));
app.use(express.json({ limit: '20mb' }));

// File upload security
app.use(fileUploadSecurity);

// Health check routes (no API key required)
app.use('/health', healthRoutes);

// Test endpoint to check API key middleware
app.get('/api/test', validateApiKey, (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'API key middleware is working',
    timestamp: new Date().toISOString()
  });
});

// API routes with appropriate rate limiting and validation
app.use('/api/upload', uploadLimiter, validateApiKey, uploadRoutes);
app.use('/api/storage', uploadLimiter, validateApiKey, storageRoutes);
app.use('/api/dashboard', validateApiKey, dashboardRoutes);
app.use('/api/admin', adminLimiter, adminRoutes);

// API Keys management routes (requires JWT authentication, not API key)
app.use('/api/keys', apiKeysRoutes);

// Public API routes for external users (requires Bearer token authentication)
app.use('/api/v1', apiRoutes);

// Auth routes (no API key required for frontend, but rate limited)
app.use('/api/auth', publicLimiter, authRoutes);

// Public routes (no API key required, but rate limited)
app.use('/api/public', publicLimiter, publicRoutes);

// Error logging middleware
app.use(errorLogger);
app.use(databaseErrorLogger);

// Error handling middleware
app.use((err, req, res, next) => {
  // Don't expose error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    error: true,
    message: isDevelopment ? err.message : 'Internal Server Error',
    ...(isDevelopment && { stack: err.stack })
  });
});

// Cache warming function - preloads critical data into cache on server start
async function warmupCache() {
  try {
    console.log('[Cache Warmup] Starting cache warmup process...');
    
    // 1. Cache system settings
    const systemSettings = await prisma.systemSettings.findFirst();
    if (systemSettings) {
      await cache.set('system-settings', systemSettings, 30 * 60 * 1000, cache.namespaces.SYSTEM);
      console.log('[Cache Warmup] System settings cached');
    }
    
    // 2. Cache public system messages (announcements, etc.)
    const activeMessages = await prisma.systemMessage.findMany({
      where: { isActive: true }
    });
    if (activeMessages.length > 0) {
      await cache.set('active-messages', activeMessages, 15 * 60 * 1000, cache.namespaces.SYSTEM);
      console.log(`[Cache Warmup] ${activeMessages.length} system messages cached`);
    }
    
    // 3. Cache frequently accessed file types for faster lookup
    const fileTypes = await prisma.$queryRaw`
      SELECT fileType, COUNT(*) as count 
      FROM Image 
      GROUP BY fileType 
      ORDER BY count DESC 
      LIMIT 10
    `;
    if (fileTypes.length > 0) {
      await cache.set('common-file-types', fileTypes, 60 * 60 * 1000, cache.namespaces.SYSTEM);
      console.log('[Cache Warmup] Common file types cached');
    }
    
    // 4. Cache total stats
    const totalStats = await prisma.image.aggregate({
      _count: { id: true },
      _sum: { fileSize: true }
    });
    if (totalStats) {
      await cache.set('total-stats', {
        totalFiles: totalStats._count.id || 0,
        totalSize: totalStats._sum.fileSize || 0,
        timestamp: new Date().toISOString()
      }, 30 * 60 * 1000, cache.namespaces.SYSTEM);
      console.log('[Cache Warmup] Total stats cached');
    }
    
    console.log('[Cache Warmup] Cache warmup completed successfully');
  } catch (error) {
    console.error('[Cache Warmup] Error warming up cache:', error);
  }
}

// Execute cache warmup when app starts
if (process.env.NODE_ENV === 'production') {
  // In production, warm up the cache immediately
  warmupCache();
  
  // Then refresh it periodically (every hour)
  setInterval(warmupCache, 60 * 60 * 1000);
} else {
  // In development, delay warmup to avoid slowing startup
  setTimeout(warmupCache, 5000);
}

module.exports = app;