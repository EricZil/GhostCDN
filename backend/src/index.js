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
const { router: healthRoutes, performBackgroundHealthCheck } = require('./routes/health.routes');
const { validateApiKey } = require('./middleware/apiKey.middleware');

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

// Auth routes (no API key required for frontend, but rate limited)
app.use('/api/auth', publicLimiter, validateApiKey, authRoutes);

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

app.listen(PORT, async () => {
  console.log(`🚀 GhostCDN Backend running on port ${PORT}`);
  
  // Give Prisma client a moment to initialize
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Seed test logs on startup (only if none exist)
  await seedTestLogs();
  
  // Perform initial health check
  await performBackgroundHealthCheck();
  
  // Note: Periodic health checks and cleanup are handled via webhooks for Vercel compatibility
  if (process.env.NODE_ENV !== 'production') {
    console.log('🏥 Health monitoring initialized');
    console.log('🕒 Cleanup system ready - use webhook endpoints for automated tasks');
    console.log('📡 Webhook endpoint: POST /api/public/cleanup/webhook');
  }
}); 