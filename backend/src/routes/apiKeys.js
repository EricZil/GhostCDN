/**
 * API Keys Management Routes
 * Handles CRUD operations for user API keys
 */

const express = require('express');
const router = express.Router();
const apiKeyService = require('../services/apiKey.service');
const { validateNextAuthJWT } = require('../middleware/jwt.middleware');
const { validateApiKey } = require('../middleware/apiKey.middleware');
const { rateLimit } = require('express-rate-limit');

// Rate limiting for API key operations
const apiKeyRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: {
    success: false,
    error: 'Too many API key requests, please try again later',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiting for key generation
const keyGenerationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 key generations per hour
  message: {
    success: false,
    error: 'Too many key generation requests, please try again later',
    code: 'KEY_GENERATION_RATE_LIMIT'
  }
});

/**
 * GET /api/keys
 * Get all API keys for the authenticated user
 */
router.get('/', validateNextAuthJWT, apiKeyRateLimit, async (req, res) => {
  try {
    const userId = req.user.id;
    const keys = await apiKeyService.getUserApiKeys(userId);
    
    res.json({
      success: true,
      data: {
        keys: keys.map(key => ({
          id: key.id,
          name: key.name,
          permissions: key.permissions,
          lastUsed: key.lastUsed,
          usageCount: typeof key.usageCount === 'bigint' ? Number(key.usageCount) : key.usageCount || 0,
          createdAt: key.createdAt,
          expiresAt: key.expiresAt,
          isActive: key.isActive
        })),
        total: keys.length
      }
    });
  } catch (error) {
    console.error('[API Keys] Error fetching user keys:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch API keys',
      code: 'FETCH_KEYS_ERROR'
    });
  }
});

/**
 * POST /api/keys
 * Generate a new API key for the authenticated user
 */
router.post('/', validateNextAuthJWT, keyGenerationRateLimit, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, permissions, expiresIn } = req.body;

    // Validate input
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'API key name is required',
        code: 'INVALID_NAME'
      });
    }

    if (name.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'API key name must be less than 100 characters',
        code: 'NAME_TOO_LONG'
      });
    }

    // Validate permissions if provided
    if (permissions && typeof permissions !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Permissions must be an object',
        code: 'INVALID_PERMISSIONS'
      });
    }

    // Validate expiration if provided
    if (expiresIn && (typeof expiresIn !== 'number' || expiresIn <= 0)) {
      return res.status(400).json({
        success: false,
        error: 'expiresIn must be a positive number (days)',
        code: 'INVALID_EXPIRATION'
      });
    }

    const result = await apiKeyService.createApiKey(userId, {
      name: name.trim(),
      permissions: permissions || {
        files: { read: true, write: true, delete: false },
        analytics: { read: true }
      },
      expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000) : null
    });

    res.status(201).json({
      success: true,
      data: {
        id: result.id,
        name: result.name,
        key: result.fullKey, // Only returned once during creation
        permissions: result.permissions,
        expiresAt: result.expiresAt,
        createdAt: result.createdAt
      },
      message: 'API key generated successfully. Store it securely - it will not be shown again.'
    });
  } catch (error) {
    console.error('[API Keys] Error generating key:', error);
    
    if (error.message.includes('limit')) {
      return res.status(400).json({
        success: false,
        error: error.message,
        code: 'KEY_LIMIT_EXCEEDED'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to generate API key',
      code: 'GENERATION_ERROR'
    });
  }
});

/**
 * PUT /api/keys/:keyId
 * Update an API key (name, permissions, status)
 */
router.put('/:keyId', validateNextAuthJWT, apiKeyRateLimit, async (req, res) => {
  try {
    const userId = req.user.id;
    const keyId = req.params.keyId;
    const { name, permissions, isActive } = req.body;

    // Validate keyId
    if (!keyId || typeof keyId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid key ID',
        code: 'INVALID_KEY_ID'
      });
    }

    const updates = {};
    
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Name must be a non-empty string',
          code: 'INVALID_NAME'
        });
      }
      updates.name = name.trim();
    }

    if (permissions !== undefined) {
      if (typeof permissions !== 'object') {
        return res.status(400).json({
          success: false,
          error: 'Permissions must be an object',
          code: 'INVALID_PERMISSIONS'
        });
      }
      updates.permissions = permissions;
    }

    if (isActive !== undefined) {
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'isActive must be a boolean',
          code: 'INVALID_STATUS'
        });
      }
      updates.isActive = isActive;
    }

    const updatedKey = await apiKeyService.updateApiKey(keyId, userId, updates);

    if (!updatedKey) {
      return res.status(404).json({
        success: false,
        error: 'API key not found or access denied',
        code: 'KEY_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: {
        id: updatedKey.id,
        name: updatedKey.name,
        permissions: updatedKey.permissions,
        isActive: updatedKey.isActive,
        lastUsed: updatedKey.lastUsed,
        usageCount: typeof updatedKey.usageCount === 'bigint' ? Number(updatedKey.usageCount) : updatedKey.usageCount || 0,
        updatedAt: updatedKey.updatedAt
      },
      message: 'API key updated successfully'
    });
  } catch (error) {
    console.error('[API Keys] Error updating key:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update API key',
      code: 'UPDATE_ERROR'
    });
  }
});

/**
 * DELETE /api/keys/:keyId
 * Delete/revoke an API key
 */
router.delete('/:keyId', validateNextAuthJWT, apiKeyRateLimit, async (req, res) => {
  try {
    const userId = req.user.id;
    const keyId = req.params.keyId;

    if (!keyId || typeof keyId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid key ID',
        code: 'INVALID_KEY_ID'
      });
    }

    try {
      await apiKeyService.revokeApiKey(keyId, userId);
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('unauthorized')) {
        return res.status(404).json({
          success: false,
          error: 'API key not found or access denied',
          code: 'KEY_NOT_FOUND'
        });
      }
      throw error;
    }

    res.json({
      success: true,
      message: 'API key revoked successfully'
    });
  } catch (error) {
    console.error('[API Keys] Error revoking key:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke API key',
      code: 'REVOKE_ERROR'
    });
  }
});

/**
 * GET /api/keys/:keyId/usage
 * Get usage statistics for a specific API key
 */
router.get('/:keyId/usage', validateNextAuthJWT, apiKeyRateLimit, async (req, res) => {
  try {
    const userId = req.user.id;
    const keyId = req.params.keyId;
    const { days = 30 } = req.query;

    if (!keyId || typeof keyId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid key ID',
        code: 'INVALID_KEY_ID'
      });
    }

    const daysNum = parseInt(days);
    if (isNaN(daysNum) || daysNum <= 0 || daysNum > 365) {
      return res.status(400).json({
        success: false,
        error: 'Days must be a number between 1 and 365',
        code: 'INVALID_DAYS'
      });
    }

    let usage;
    try {
      usage = await apiKeyService.getUsageStats(keyId, userId, { days: daysNum });
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('unauthorized')) {
        return res.status(404).json({
          success: false,
          error: 'API key not found or access denied',
          code: 'KEY_NOT_FOUND'
        });
      }
      throw error;
    }

    // Convert BigInt values to numbers for JSON serialization
    const serializedUsage = {
      ...usage,
      totalRequests: typeof usage.totalRequests === 'bigint' ? Number(usage.totalRequests) : usage.totalRequests,
      successfulRequests: typeof usage.successfulRequests === 'bigint' ? Number(usage.successfulRequests) : usage.successfulRequests,
      failedRequests: typeof usage.failedRequests === 'bigint' ? Number(usage.failedRequests) : usage.failedRequests,
      rateLimitHits: typeof usage.rateLimitHits === 'bigint' ? Number(usage.rateLimitHits) : usage.rateLimitHits,
      uniqueIPs: typeof usage.uniqueIPs === 'bigint' ? Number(usage.uniqueIPs) : usage.uniqueIPs,
      averageResponseTime: typeof usage.averageResponseTime === 'bigint' ? Number(usage.averageResponseTime) : usage.averageResponseTime,
      dailyUsage: usage.dailyUsage?.map(day => ({
        ...day,
        requests: typeof day.requests === 'bigint' ? Number(day.requests) : day.requests,
        avgResponseTime: typeof day.avgResponseTime === 'bigint' ? Number(day.avgResponseTime) : day.avgResponseTime
      })) || [],
      statusCodes: usage.statusCodes?.map(status => ({
        ...status,
        count: typeof status.count === 'bigint' ? Number(status.count) : status.count
      })) || [],
      topEndpoints: usage.topEndpoints?.map(endpoint => ({
        ...endpoint,
        requests: typeof endpoint.requests === 'bigint' ? Number(endpoint.requests) : endpoint.requests,
        avgResponseTime: typeof endpoint.avgResponseTime === 'bigint' ? Number(endpoint.avgResponseTime) : endpoint.avgResponseTime
      })) || []
    };

    res.json({
      success: true,
      data: serializedUsage
    });
  } catch (error) {
    console.error('[API Keys] Error fetching usage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch usage statistics',
      code: 'USAGE_FETCH_ERROR'
    });
  }
});

/**
 * POST /api/keys/:keyId/rotate
 * Rotate an API key (generate new key, keep same permissions)
 */
router.post('/:keyId/rotate', validateNextAuthJWT, keyGenerationRateLimit, async (req, res) => {
  try {
    const userId = req.user.id;
    const keyId = req.params.keyId;

    if (!keyId || typeof keyId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid key ID',
        code: 'INVALID_KEY_ID'
      });
    }

    let result;
    try {
      result = await apiKeyService.rotateApiKey(keyId, userId);
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('unauthorized')) {
        return res.status(404).json({
          success: false,
          error: 'API key not found or access denied',
          code: 'KEY_NOT_FOUND'
        });
      }
      throw error;
    }

    res.json({
      success: true,
      data: {
        id: result.id,
        name: result.name,
        key: result.fullKey, // New key - only shown once
        permissions: result.permissions,
        expiresAt: result.expiresAt,
        rotatedAt: result.updatedAt
      },
      message: 'API key rotated successfully. Update your applications with the new key.'
    });
  } catch (error) {
    console.error('[API Keys] Error rotating key:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to rotate API key',
      code: 'ROTATION_ERROR'
    });
  }
});

module.exports = router;