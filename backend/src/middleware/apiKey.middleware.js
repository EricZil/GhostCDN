/**
 * API Key authentication middleware
 * For internal use only - secures communication between frontend and backend
 */

const prisma = require('../lib/prisma');

const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const validApiKey = process.env.API_KEY;
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (!validApiKey) {
    console.warn('API_KEY not set in environment. Skipping API key validation.');
    return next();
  }
  
  if (isDevelopment) {
    if (!apiKey) {
      console.warn('No API key provided in development mode. Allowing request but this would be rejected in production.');
      return next();
    }
    
    if (apiKey !== validApiKey) {
      console.warn('API key mismatch in development mode. Allowing request but this would be rejected in production.');
      return next();
    }
  } else {
    if (!apiKey || apiKey !== validApiKey) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid API key'
      });
    }
  }
  
  next();
};

// Middleware to check if user is admin
const requireAdmin = async (req, res, next) => {
  try {
    const userEmail = req.headers['user-email'];
    if (!userEmail) {
      return res.status(401).json({ error: 'User email required' });
    }

    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    });

    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

module.exports = { validateApiKey, requireAdmin }; 