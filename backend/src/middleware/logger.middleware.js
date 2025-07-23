/**
 * Database-backed logging middleware
 * Stores logs in database for admin interface access
 */

const winston = require('winston');
const expressWinston = require('express-winston');
const prisma = require('../lib/prisma');



// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'ghostcdn-api' },
  transports: []
});

// Configure transports based on environment
if (process.env.NODE_ENV === 'production') {
  // In production, log to console (stdout/stderr) for container orchestration
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }));
} else {
  // In development, use colorized console output
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
  
  // Optionally add file logging in development if LOG_TO_FILE is set
  if (process.env.LOG_TO_FILE === 'true') {
    logger.add(new winston.transports.File({ 
      filename: 'error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 2
    }));
    logger.add(new winston.transports.File({ 
      filename: 'combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 2
    }));
  }
}

// Request logging middleware
const requestLogger = expressWinston.logger({
  winstonInstance: logger,
  meta: false, // Disable verbose metadata
  msg: "{{req.method}} {{req.url}} {{res.statusCode}} {{res.responseTime}}ms",
  expressFormat: false,
  colorize: false,
  ignoreRoute: function (req, res) {
    // Don't log health check requests to reduce noise
    return req.url === '/health' || req.url === '/api/health';
  },
  requestWhitelist: [],
  responseWhitelist: [],
  headerBlacklist: [
    'authorization', 'x-api-key', 'cookie'
  ],
  dynamicMeta: (req, res) => {
    // Only include essential info for cleaner logs
    const userEmail = req.params?.userEmail || (req.user ? req.user.email : null);
    return {
      endpoint: req.route ? req.route.path : req.url,
      user: userEmail || 'anonymous'
    };
  }
});

// Error logging middleware
const errorLogger = expressWinston.errorLogger({
  winstonInstance: logger,
  meta: true,
  msg: "HTTP {{req.method}} {{req.url}} - {{err.message}}",
  requestWhitelist: [
    'url', 'headers', 'method', 'httpVersion', 'originalUrl', 'query', 'body'
  ],
  headerBlacklist: [
    'authorization', 'x-api-key', 'cookie'
  ],
  dynamicMeta: (req, res, err) => {
    return {
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      userId: req.user ? req.user.id : null,
      userEmail: req.user ? req.user.email : null,
      errorStack: err.stack,
      timestamp: new Date().toISOString()
    };
  }
});

// Database logger functions
const logToDatabase = async (level, message, source, req = null, metadata = null) => {
  try {
    await prisma.systemLog.create({
      data: {
        level: level.toUpperCase(),
        message,
        source,
        userId: req && req.user ? req.user.id : null,
        ipAddress: req ? (req.ip || req.connection.remoteAddress) : null,
        metadata: metadata ? JSON.stringify(metadata) : null
      }
    });
  } catch (error) {
    // Fallback to console if database logging fails
    console.error('Failed to log to database:', error);
    console.log(`[${level}] ${source}: ${message}`, metadata);
  }
};

// Security event logger - logs to both Winston and Database
const logSecurityEvent = async (eventType, details, req = null) => {
  const logData = {
    eventType,
    details,
    ip: req ? (req.ip || req.connection.remoteAddress) : null,
    userAgent: req ? req.get('user-agent') : null,
    userId: req && req.user ? req.user.id : null,
    timestamp: new Date().toISOString()
  };
  
  // Log to Winston for immediate console output
  logger.warn('Security Event', logData);
  
  // Log to database for admin interface
  await logToDatabase('WARN', `Security Event: ${eventType}`, 'security', req, {
    eventType,
    details,
    userAgent: req ? req.get('user-agent') : null
  });
};

// Custom security logging middleware
const securityLogger = (req, res, next) => {
  // Log suspicious patterns
  const suspiciousPatterns = [
    /\.\./,  // Path traversal
    /<script/i,  // XSS attempts
    /union.*select/i,  // SQL injection attempts
    /exec\(/i,  // Code execution attempts
  ];
  
  const url = req.url.toLowerCase();
  const body = JSON.stringify(req.body || {}).toLowerCase();
  const query = JSON.stringify(req.query || {}).toLowerCase();
  
  suspiciousPatterns.forEach(pattern => {
    if (pattern.test(url) || pattern.test(body) || pattern.test(query)) {
      logSecurityEvent('SUSPICIOUS_REQUEST', {
        pattern: pattern.toString(),
        url: req.url,
        method: req.method,
        body: req.body,
        query: req.query
      }, req);
    }
  });
  
  // Log failed authentication attempts
  res.on('finish', () => {
    if (res.statusCode === 401 || res.statusCode === 403) {
      logSecurityEvent('AUTH_FAILURE', {
        statusCode: res.statusCode,
        url: req.url,
        method: req.method
      }, req).catch(console.error);
    }
  });
  
  next();
};

// API request logger - logs important requests to database
const apiRequestLogger = async (req, res, next) => {
  const start = Date.now();
  
  // Only log important endpoints to avoid spam
  const importantEndpoints = ['/api/admin', '/api/upload', '/api/dashboard'];
  const shouldLog = importantEndpoints.some(endpoint => req.url.startsWith(endpoint));
  
  if (shouldLog) {
    res.on('finish', async () => {
      const duration = Date.now() - start;
      const level = res.statusCode >= 400 ? 'ERROR' : 'INFO';
      
      await logToDatabase(level, 
        `${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`,
        'api',
        req,
        {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration,
          userAgent: req.get('user-agent')
        }
      ).catch(console.error);
    });
  }
  
  next();
};

// Error logger - logs errors to database
const databaseErrorLogger = async (err, req, res, next) => {
  await logToDatabase('ERROR',
    `${err.name}: ${err.message}`,
    'api',
    req,
    {
      name: err.name,
      message: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method
    }
  ).catch(console.error);
  
  next(err);
};

// Function to seed some initial test logs (for demonstration)
const seedTestLogs = async () => {
  try {
    // Check if logs already exist to avoid duplicates
    const existingLogs = await prisma.systemLog.count({
      where: { source: 'api', message: 'System startup completed successfully' }
    });
    
    if (existingLogs > 0) {
      console.log('ℹ️  Test logs already exist, skipping seeding');
      return;
    }

    const testLogs = [
      {
        level: 'INFO',
        message: 'System startup completed successfully',
        source: 'api',
        metadata: JSON.stringify({ startupTime: Date.now() })
      },
      {
        level: 'INFO',
        message: 'Database connection established',
        source: 'database',
        metadata: JSON.stringify({ connectionPool: 'ready' })
      },
      {
        level: 'WARN',
        message: 'High memory usage detected',
        source: 'api',
        metadata: JSON.stringify({ memoryUsage: '85%' })
      }
    ];

    for (const log of testLogs) {
      await prisma.systemLog.create({
        data: log
      });
    }
    
    console.log('✅ Test logs seeded successfully');
  } catch (error) {
    console.log('ℹ️  Test logs seeding failed, will continue without seeding:', error.message);
  }
};

module.exports = {
  logger,
  requestLogger,
  errorLogger,
  securityLogger,
  logSecurityEvent,
  logToDatabase,
  apiRequestLogger,
  databaseErrorLogger,
  seedTestLogs
};