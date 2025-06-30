/**
 * Rate limiting middleware
 * Implements different rate limits for different types of endpoints
 * 
 * Note: trustProxy is set to false to use the Express app's trust proxy configuration
 * This prevents the ERR_ERL_PERMISSIVE_TRUST_PROXY error while maintaining security
 */

const rateLimit = require('express-rate-limit');

// General API rate limit - higher for authenticated users
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req) => {
    // Higher limits for authenticated users (dashboard needs many API calls)
    const userEmail = req.headers['user-email'];
    const hasApiKey = req.headers['x-api-key'];
    
    if (userEmail && hasApiKey) {
      return 500; // 500 requests per 15 minutes for authenticated dashboard users
    }
    return 100; // 100 requests per 15 minutes for others
  },
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: false,
  skip: (req) => {
    return process.env.NODE_ENV === 'development';
  }
});

// Strict rate limit for upload endpoints
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 uploads per windowMs
  message: {
    error: 'Too many upload requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: false,
  skip: (req) => {
    return process.env.NODE_ENV === 'development';
  }
});

// Admin rate limit - reasonable for admin dashboard usage
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 admin requests per 15 minutes (admin dashboards need many calls)
  message: {
    error: 'Too many admin requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: false,
  skip: (req) => {
    return process.env.NODE_ENV === 'development';
  }
});

// Lenient rate limit for public endpoints
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 public requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: false,
  skip: (req) => {
    return process.env.NODE_ENV === 'development';
  }
});

module.exports = {
  generalLimiter,
  uploadLimiter,
  adminLimiter,
  publicLimiter
}; 