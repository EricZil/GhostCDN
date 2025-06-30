/**
 * NextAuth JWT token validation middleware
 * Validates NextAuth JWT tokens for authenticated endpoints
 */

const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');



const validateNextAuthJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = req.body.token || req.query.token || (authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }
    
    // Verify the NextAuth token
    const jwtSecret = process.env.NEXTAUTH_SECRET;
    if (!jwtSecret) {
      console.error('NEXTAUTH_SECRET not configured');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error'
      });
    }
        
    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (jwtError) {
      
      
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token has expired'
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
      } else {
        throw jwtError;
      }
    }
    
    // Get user from database using the token's user ID
    const userId = decoded.id || decoded.sub;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        r2FolderName: true
      }
    });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Add user info to request object
    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    console.error('NextAuth JWT validation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Token validation failed'
    });
  }
};

// Optional NextAuth JWT validation - continues even if token is invalid
const optionalNextAuthJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = req.body.token || req.query.token || (authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null);
    
    if (!token) {
      req.user = null;
      return next();
    }
    
    const jwtSecret = process.env.NEXTAUTH_SECRET;
    if (!jwtSecret) {
      req.user = null;
      return next();
    }
    
    try {
      const decoded = jwt.verify(token, jwtSecret);
      const userId = decoded.id || decoded.sub;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          r2FolderName: true
        }
      });
      
      req.user = user;
      req.token = token;
    } catch (jwtError) {
      req.user = null;
    }
    
    next();
  } catch (error) {
    console.error('Optional NextAuth JWT validation error:', error);
    req.user = null;
    next();
  }
};

module.exports = {
  validateNextAuthJWT,
  optionalNextAuthJWT
}; 