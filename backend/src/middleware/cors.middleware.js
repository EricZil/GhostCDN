/**
 * CORS configuration middleware
 * Restricts origins based on environment variables for security
 */

const cors = require('cors');

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      // Production domains
      'https://ghostcdn.xyz',
      'https://api.ghostcdn.xyz',
      'https://q1.api.ghostcdn.xyz',
      // Gravatar for profile images
      'https://www.gravatar.com',
      'https://gravatar.com',
      'https://secure.gravatar.com',
      // Environment-based URLs
      process.env.FRONTEND_URL,
      process.env.PRODUCTION_URL,
      // Development localhost
      'http://localhost:3000',
      'http://localhost:3001',
      'https://localhost:3000',
      'https://localhost:3001'
    ].filter(Boolean);
    
    // In development, be more permissive
    if (process.env.NODE_ENV === 'development') {
      allowedOrigins.push('http://127.0.0.1:3000', 'http://127.0.0.1:3001');
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Key',
    'User-Email',
    'Cache-Control'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400 // 24 hours
};

module.exports = cors(corsOptions); 