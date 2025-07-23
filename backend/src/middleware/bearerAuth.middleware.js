/**
 * Bearer Token Authentication Middleware
 * Handles API key authentication via Bearer tokens
 */

const apiKeyService = require('../services/apiKey.service');
const { cache } = require('../lib/cache-manager');

/**
 * Helper function to determine the action from the request
 * @param {Object} req - Express request object
 * @returns {string} Action type
 */
const getActionFromRequest = (req) => {
  const method = req.method.toLowerCase();
  const path = req.path.toLowerCase();

  // Admin actions
  if (path.includes('/admin') || path.includes('/system')) {
    return 'admin';
  }

  // File operations
  if (path.includes('/files') || path.includes('/upload')) {
    switch (method) {
      case 'post':
      case 'put':
        return 'upload';
      case 'delete':
        return 'delete';
      case 'get':
      default:
        return 'read';
    }
  }

  // Default to read for GET requests, upload for others
  return method === 'get' ? 'read' : 'upload';
};

/**
 * Middleware to authenticate API requests using Bearer tokens
 * Supports both user-generated API keys and internal system keys
 */
const authenticateBearer = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Missing or invalid Authorization header',
        code: 'MISSING_BEARER_TOKEN'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Bearer token is required',
        code: 'EMPTY_BEARER_TOKEN'
      });
    }

    // Get client information for security checks
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const action = getActionFromRequest(req);

    // Use comprehensive security validation
    const apiKeyData = await apiKeyService.validateApiKeyWithSecurity(
      token,
      ipAddress,
      userAgent,
      action
    );
    
    if (!apiKeyData) {
      return res.status(401).json({
        success: false,
        error: 'Invalid, expired, or blocked API key',
        code: 'INVALID_API_KEY'
      });
    }

    // Attach API key data to request
    req.apiKey = apiKeyData;
    req.user = apiKeyData.user;
    req.userId = apiKeyData.userId;

    // Log the API usage (async, don't wait)
    const startTime = Date.now();
    
    // Override res.end to capture response data
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
      const responseTime = Date.now() - startTime;
      
      // Log usage asynchronously
      setImmediate(async () => {
        try {
          await apiKeyService.logUsage(apiKeyData.id, {
            endpoint: req.path,
            method: req.method,
            statusCode: res.statusCode,
            responseTime,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'],
            requestSize: req.headers['content-length'] ? parseInt(req.headers['content-length']) : null,
            responseSize: chunk ? Buffer.byteLength(chunk, encoding) : null
          });
        } catch (error) {
          console.error('[Bearer Auth] Failed to log API usage:', error);
        }
      });

      // Call original end method
      originalEnd.call(this, chunk, encoding);
    };

    next();
  } catch (error) {
    console.error('[Bearer Auth] Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication service error',
      code: 'AUTH_SERVICE_ERROR'
    });
  }
};

/**
 * Middleware to check specific permissions
 * @param {string|Array} requiredPermissions - Required permission(s)
 */
const requirePermissions = (requiredPermissions) => {
  return (req, res, next) => {
    if (!req.apiKey || !req.apiKey.permissions) {
      return res.status(403).json({
        success: false,
        error: 'No API key permissions found',
        code: 'NO_PERMISSIONS'
      });
    }

    const permissions = req.apiKey.permissions;
    const required = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

    // Check if user has all required permissions
    const hasPermissions = required.every(permission => {
      // Handle nested permissions (e.g., 'files.read', 'files.write')
      if (permission.includes('.')) {
        const [category, action] = permission.split('.');
        return permissions[category] && permissions[category][action];
      }
      return permissions[permission] === true;
    });

    if (!hasPermissions) {
      return res.status(403).json({
        success: false,
        error: `Insufficient permissions. Required: ${required.join(', ')}`,
        code: 'INSUFFICIENT_PERMISSIONS',
        required: required,
        current: permissions
      });
    }

    next();
  };
};

/**
 * Middleware to check if user has admin role
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
      code: 'ADMIN_REQUIRED'
    });
  }
  next();
};

/**
 * Combined middleware that supports both internal API keys and Bearer tokens
 * Falls back to internal API key validation if Bearer token is not present
 */
const flexibleAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const internalApiKey = req.headers['x-api-key'];

  // If Bearer token is present, use Bearer authentication
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authenticateBearer(req, res, next);
  }

  // Fall back to internal API key validation
  if (internalApiKey) {
    const { validateApiKey } = require('./apiKey.middleware');
    return validateApiKey(req, res, next);
  }

  // No authentication provided
  return res.status(401).json({
    success: false,
    error: 'Authentication required. Provide either Bearer token or X-API-Key header',
    code: 'NO_AUTHENTICATION'
  });
};

module.exports = {
  authenticateBearer,
  requirePermissions,
  requireAdmin,
  flexibleAuth
};