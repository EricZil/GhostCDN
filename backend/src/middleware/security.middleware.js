/**
 * Security middleware
 * Implements CSP headers and other security measures
 */

// Import helmet with destructuring to get the default export
const helmet = require('helmet').default;

// Content Security Policy configuration
const cspConfig = {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      "'unsafe-inline'", // Required for some admin interfaces
      "'unsafe-eval'", // Required for some dynamic content
      "https://cdn.jsdelivr.net",
      "https://unpkg.com"
    ],
    styleSrc: [
      "'self'",
      "'unsafe-inline'", // Required for inline styles
      "https://fonts.googleapis.com",
      "https://cdn.jsdelivr.net"
    ],
    fontSrc: [
      "'self'",
      "https://fonts.gstatic.com",
      "data:"
    ],
    imgSrc: [
      "'self'",
      "data:",
      "blob:",
      "https:",
      process.env.DO_SPACES_PUBLIC_URL || "https://*.digitaloceanspaces.com"
    ],
    mediaSrc: [
      "'self'",
      "data:",
      "blob:",
      "https:",
      process.env.DO_SPACES_PUBLIC_URL || "https://*.digitaloceanspaces.com"
    ],
    connectSrc: [
      "'self'",
      "https://api.github.com", // For OAuth
      "https://api.google.com", // For OAuth
      process.env.DO_SPACES_PUBLIC_URL || "https://*.digitaloceanspaces.com"
    ],
    frameSrc: ["'none'"],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
  },
  reportOnly: process.env.NODE_ENV === 'development' // Only report in development
};

// Security headers configuration - using helmet as a function
const securityHeaders = helmet({
  contentSecurityPolicy: cspConfig,
  crossOriginEmbedderPolicy: false, // Disable for file uploads
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true
});

// Additional security middleware
const additionalSecurity = (req, res, next) => {
  // Add custom security headers
  res.setHeader('X-API-Version', '1.0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Remove sensitive headers
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  
  // Add cache control for sensitive endpoints
  if (req.url.includes('/admin') || req.url.includes('/dashboard')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  next();
};

// File upload security middleware
const fileUploadSecurity = (req, res, next) => {
  // Validate file upload requests
  if (req.method === 'POST' && (req.url.includes('/upload') || req.url.includes('/presigned'))) {
    const contentType = req.get('content-type');
    
    // Ensure proper content type for file uploads
    if (!contentType || (!contentType.includes('application/json') && !contentType.includes('multipart/form-data'))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid content type for file upload'
      });
    }
    
    // Add file-specific security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
  }
  
  next();
};

module.exports = {
  securityHeaders,
  additionalSecurity,
  fileUploadSecurity
}; 