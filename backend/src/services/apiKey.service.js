const crypto = require('crypto');
const bcrypt = require('bcrypt');
const prisma = require('../lib/prisma');
const { cache } = require('../lib/cache-manager');

/**
 * API Key Management Service
 * Handles generation, validation, and lifecycle management of API keys
 */
class ApiKeyService {
  constructor() {
    this.keyPrefix = 'gcdn_';
    this.keyLength = 32; // 32 bytes = 256 bits
    this.hashRounds = 12;
  }

  /**
   * Generate a cryptographically secure API key
   * @returns {Object} Generated key data
   */
  generateApiKey() {
    // Generate random bytes for the key
    const randomBytes = crypto.randomBytes(this.keyLength);
    const keyId = crypto.randomBytes(4).toString('hex'); // 8 character ID
    
    // Create the full key with prefix
    const fullKey = `${this.keyPrefix}${keyId}_${randomBytes.toString('base64url')}`;
    
    // Create prefix for identification (first 12 characters)
    const keyPrefix = fullKey.substring(0, 12);
    
    return {
      fullKey,
      keyPrefix,
      keyId
    };
  }

  /**
   * Hash an API key for secure storage
   * @param {string} apiKey - The API key to hash
   * @returns {Promise<string>} Hashed key
   */
  async hashApiKey(apiKey) {
    return bcrypt.hash(apiKey, this.hashRounds);
  }

  /**
   * Verify an API key against its hash
   * @param {string} apiKey - The API key to verify
   * @param {string} hash - The stored hash
   * @returns {Promise<boolean>} Verification result
   */
  async verifyApiKey(apiKey, hash) {
    return bcrypt.compare(apiKey, hash);
  }

  /**
   * Create a new API key for a user
   * @param {string} userId - User ID
   * @param {Object} options - Key creation options
   * @returns {Promise<Object>} Created API key data
   */
  async createApiKey(userId, options = {}) {
    const {
      name = 'Default API Key',
      permissions = {
        upload: true,
        read: true,
        delete: false,
        admin: false
      },
      rateLimit = 1000, // requests per hour
      expiresAt = null
    } = options;

    // Check if user already has an API key (limit to 1 for regular users)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { apiKeys: { where: { isActive: true } } }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Enforce single API key limit for regular users
    if (user.role !== 'ADMIN' && user.apiKeys.length >= 1) {
      throw new Error('Regular users are limited to one API key. Upgrade to create more keys.');
    }

    // Admin users can have up to 5 API keys
    if (user.role === 'ADMIN' && user.apiKeys.length >= 5) {
      throw new Error('Maximum number of API keys reached (5)');
    }

    // Generate the API key
    const { fullKey, keyPrefix } = this.generateApiKey();
    const keyHash = await this.hashApiKey(fullKey);

    // Create the API key record
    const apiKey = await prisma.apiKey.create({
      data: {
        name,
        keyHash,
        keyPrefix,
        userId,
        permissions,
        rateLimit,
        expiresAt,
        isActive: true
      }
    });

    // Return the API key data (including the full key only once)
    return {
      id: apiKey.id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      fullKey, // Only returned on creation
      permissions: apiKey.permissions,
      rateLimit: apiKey.rateLimit,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt
    };
  }

  /**
   * Validate an API key and return key data
   * @param {string} apiKey - The API key to validate
   * @returns {Promise<Object|null>} API key data or null if invalid
   */
  async validateApiKey(apiKey) {
    if (!apiKey || !apiKey.startsWith(this.keyPrefix)) {
      return null;
    }

    // Extract prefix for faster lookup
    const keyPrefix = apiKey.substring(0, 12);
    
    // Find potential matching keys
    const apiKeys = await prisma.apiKey.findMany({
      where: {
        keyPrefix,
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            name: true,
            r2FolderName: true
          }
        }
      }
    });

    // Verify the key against each potential match
    for (const key of apiKeys) {
      const isValid = await this.verifyApiKey(apiKey, key.keyHash);
      if (isValid) {
        // Update last used information
        await this.updateLastUsed(key.id);
        
        return {
          id: key.id,
          name: key.name,
          keyPrefix: key.keyPrefix,
          userId: key.userId,
          permissions: key.permissions,
          rateLimit: key.rateLimit,
          user: key.user,
          lastUsedAt: new Date(),
          usageCount: key.usageCount
        };
      }
    }

    return null;
  }

  /**
   * Update last used timestamp and increment usage count
   * @param {string} apiKeyId - API key ID
   * @param {string} ipAddress - Optional IP address
   */
  async updateLastUsed(apiKeyId, ipAddress = null) {
    await prisma.apiKey.update({
      where: { id: apiKeyId },
      data: {
        lastUsedAt: new Date(),
        lastUsedIp: ipAddress,
        usageCount: {
          increment: 1
        }
      }
    });
  }

  /**
   * Log API key usage
   * @param {string} apiKeyId - API key ID
   * @param {Object} usageData - Usage data
   */
  async logUsage(apiKeyId, usageData) {
    const {
      endpoint,
      method,
      statusCode,
      responseTime,
      ipAddress,
      userAgent,
      requestSize,
      responseSize
    } = usageData;

    await prisma.apiKeyUsage.create({
      data: {
        apiKeyId,
        endpoint,
        method,
        statusCode,
        responseTime,
        ipAddress,
        userAgent,
        requestSize,
        responseSize
      }
    });
  }

  /**
   * Get API keys for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} User's API keys
   */
  async getUserApiKeys(userId) {
    return prisma.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permissions: true,
        rateLimit: true,
        lastUsedAt: true,
        usageCount: true,
        isActive: true,
        expiresAt: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Revoke an API key
   * @param {string} apiKeyId - API key ID
   * @param {string} userId - User ID (for authorization)
   */
  async revokeApiKey(apiKeyId, userId) {
    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id: apiKeyId,
        userId
      }
    });

    if (!apiKey) {
      throw new Error('API key not found or unauthorized');
    }

    await prisma.apiKey.update({
      where: { id: apiKeyId },
      data: { isActive: false }
    });
  }

  /**
   * Update API key settings
   * @param {string} apiKeyId - API key ID
   * @param {string} userId - User ID (for authorization)
   * @param {Object} updates - Updates to apply
   */
  async updateApiKey(apiKeyId, userId, updates) {
    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id: apiKeyId,
        userId
      }
    });

    if (!apiKey) {
      throw new Error('API key not found or unauthorized');
    }

    const allowedUpdates = ['name', 'permissions', 'rateLimit'];
    const filteredUpdates = {};
    
    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    }

    return prisma.apiKey.update({
      where: { id: apiKeyId },
      data: filteredUpdates
    });
  }

  /**
   * Rotate an API key (generate new key, keep same settings)
   * @param {string} apiKeyId - API key ID
   * @param {string} userId - User ID (for authorization)
   * @returns {Promise<Object>} New API key data
   */
  async rotateApiKey(apiKeyId, userId) {
    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id: apiKeyId,
        userId
      }
    });

    if (!apiKey) {
      throw new Error('API key not found or unauthorized');
    }

    // Generate new key
    const { fullKey, keyPrefix } = this.generateApiKey();
    const keyHash = await this.hashApiKey(fullKey);

    // Update the existing API key with new credentials
    const updatedKey = await prisma.apiKey.update({
      where: { id: apiKeyId },
      data: {
        keyHash,
        keyPrefix,
        lastUsedAt: null, // Reset usage tracking
        usageCount: 0
      }
    });

    return {
      id: updatedKey.id,
      name: updatedKey.name,
      fullKey, // New key - only returned once
      permissions: updatedKey.permissions,
      rateLimit: updatedKey.rateLimit,
      expiresAt: updatedKey.expiresAt,
      updatedAt: updatedKey.updatedAt
    };
  }

  /**
   * Get API key usage statistics
   * @param {string} apiKeyId - API key ID
   * @param {string} userId - User ID (for authorization)
   * @param {Object} options - Query options
   */
  async getUsageStats(apiKeyId, userId, options = {}) {
    const { days = 7 } = options;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Verify ownership
    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id: apiKeyId,
        userId
      }
    });

    if (!apiKey) {
      throw new Error('API key not found or unauthorized');
    }

    // Get usage statistics
    const [totalRequests, successfulRequests, failedRequests, rateLimitHits, recentUsage, statusCodes, topEndpoints, uniqueIPs, avgResponseTime] = await Promise.all([
      // Total requests
      prisma.apiKeyUsage.count({
        where: {
          apiKeyId,
          timestamp: { gte: startDate }
        }
      }),

      // Successful requests (2xx status codes)
      prisma.apiKeyUsage.count({
        where: {
          apiKeyId,
          timestamp: { gte: startDate },
          statusCode: {
            gte: 200,
            lt: 300
          }
        }
      }),

      // Failed requests (4xx and 5xx status codes)
      prisma.apiKeyUsage.count({
        where: {
          apiKeyId,
          timestamp: { gte: startDate },
          statusCode: {
            gte: 400
          }
        }
      }),

      // Rate limit hits (429 status code)
      prisma.apiKeyUsage.count({
        where: {
          apiKeyId,
          timestamp: { gte: startDate },
          statusCode: 429
        }
      }),

      // Daily usage
      prisma.$queryRaw`
        SELECT 
          DATE(timestamp) as date,
          COUNT(*) as requests,
          AVG(responseTime) as avgResponseTime
        FROM ApiKeyUsage 
        WHERE apiKeyId = ${apiKeyId} 
          AND timestamp >= ${startDate}
        GROUP BY DATE(timestamp)
        ORDER BY date DESC
      `,

      // Status code distribution
      prisma.$queryRaw`
        SELECT 
          statusCode,
          COUNT(*) as count
        FROM ApiKeyUsage 
        WHERE apiKeyId = ${apiKeyId} 
          AND timestamp >= ${startDate}
        GROUP BY statusCode
        ORDER BY count DESC
      `,

      // Top endpoints
      prisma.$queryRaw`
        SELECT 
          endpoint,
          COUNT(*) as requests,
          AVG(responseTime) as avgResponseTime
        FROM ApiKeyUsage 
        WHERE apiKeyId = ${apiKeyId} 
          AND timestamp >= ${startDate}
        GROUP BY endpoint
        ORDER BY requests DESC
        LIMIT 10
      `,

      // Unique IP addresses
      prisma.$queryRaw`
        SELECT COUNT(DISTINCT ipAddress) as count
        FROM ApiKeyUsage 
        WHERE apiKeyId = ${apiKeyId} 
          AND timestamp >= ${startDate}
      `,

      // Average response time
      prisma.$queryRaw`
        SELECT AVG(responseTime) as avgTime
        FROM ApiKeyUsage 
        WHERE apiKeyId = ${apiKeyId} 
          AND timestamp >= ${startDate}
      `
    ]);

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      rateLimitHits,
      uniqueIPs: uniqueIPs[0]?.count || 0,
      averageResponseTime: avgResponseTime[0]?.avgTime || 0,
      dailyUsage: recentUsage,
      statusCodes,
      topEndpoints,
      period: `${days} days`
    };
  }

  /**
   * Detect suspicious activity for an API key
   * @param {string} apiKeyId - API key ID
   * @param {string} ipAddress - IP address making the request
   * @param {string} userAgent - User agent string
   * @returns {Promise<boolean>} True if activity is suspicious
   */
  async detectSuspiciousActivity(apiKeyId, ipAddress, userAgent) {
    const cacheKey = `security:suspicious:${apiKeyId}`;
    const cached = await cache.get(cacheKey);
    
    if (cached) {
      return cached.isSuspicious;
    }

    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    // Get recent usage patterns
    const recentUsage = await prisma.apiKeyUsage.findMany({
      where: {
        apiKeyId,
        timestamp: { gte: oneHourAgo }
      },
      select: {
        ipAddress: true,
        userAgent: true,
        statusCode: true,
        timestamp: true
      },
      orderBy: { timestamp: 'desc' }
    });

    let suspiciousScore = 0;
    const uniqueIPs = new Set();
    const uniqueUserAgents = new Set();
    let errorRate = 0;

    recentUsage.forEach(usage => {
      uniqueIPs.add(usage.ipAddress);
      uniqueUserAgents.add(usage.userAgent);
      if (usage.statusCode >= 400) {
        errorRate++;
      }
    });

    // Scoring criteria
    if (uniqueIPs.size > 10) suspiciousScore += 3; // Too many different IPs
    if (uniqueUserAgents.size > 5) suspiciousScore += 2; // Too many different user agents
    if (recentUsage.length > 500) suspiciousScore += 3; // High request volume
    if (errorRate / recentUsage.length > 0.5) suspiciousScore += 2; // High error rate

    const isSuspicious = suspiciousScore >= 5;

    // Cache result for 5 minutes
    await cache.set(cacheKey, { isSuspicious, score: suspiciousScore }, 300);

    if (isSuspicious) {
      await this.logSecurityEvent(apiKeyId, 'SUSPICIOUS_ACTIVITY', {
        score: suspiciousScore,
        uniqueIPs: uniqueIPs.size,
        uniqueUserAgents: uniqueUserAgents.size,
        requestCount: recentUsage.length,
        errorRate: errorRate / recentUsage.length
      });
    }

    return isSuspicious;
  }

  /**
   * Validate API key permissions for a specific action
   * @param {Object} apiKeyData - API key data from validation
   * @param {string} action - Action to validate (upload, read, delete, admin)
   * @returns {boolean} True if permission is granted
   */
  validateApiKeyPermissions(apiKeyData, action) {
    if (!apiKeyData || !apiKeyData.permissions) {
      return false;
    }

    const permissions = apiKeyData.permissions;
    
    // Handle both flat and nested permission structures
    switch (action) {
      case 'upload':
        // Check nested structure first (files.write), then flat (upload)
        return (permissions.files && permissions.files.write === true) || permissions.upload === true;
      case 'read':
        // Check nested structure first (files.read), then flat (read)
        return (permissions.files && permissions.files.read === true) || permissions.read === true;
      case 'delete':
        // Check nested structure first (files.delete), then flat (delete)
        return (permissions.files && permissions.files.delete === true) || permissions.delete === true;
      case 'admin':
        // Admin permission is typically flat
        return permissions.admin === true;
      default:
        return false;
    }
  }

  /**
   * Validate IP address against whitelist
   * @param {string} apiKeyId - API key ID
   * @param {string} ipAddress - IP address to validate
   * @returns {Promise<boolean>} True if IP is allowed
   */
  async validateIpWhitelist(apiKeyId, ipAddress) {
    const apiKey = await prisma.apiKey.findUnique({
      where: { id: apiKeyId },
      select: { ipWhitelist: true }
    });

    if (!apiKey || !apiKey.ipWhitelist || apiKey.ipWhitelist.length === 0) {
      return true; // No whitelist means all IPs are allowed
    }

    // Check if IP matches any pattern in whitelist
    return apiKey.ipWhitelist.some(pattern => {
      if (pattern.includes('/')) {
        // CIDR notation support (basic implementation)
        const [network, bits] = pattern.split('/');
        // For simplicity, exact match for now
        return ipAddress === network;
      }
      return ipAddress === pattern;
    });
  }

  /**
   * Log security events
   * @param {string} apiKeyId - API key ID
   * @param {string} eventType - Type of security event
   * @param {Object} metadata - Additional event data
   */
  async logSecurityEvent(apiKeyId, eventType, metadata = {}) {
    try {
      await prisma.securityLog.create({
        data: {
          apiKeyId,
          eventType,
          metadata,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('[Security Log] Failed to log event:', error);
    }
  }

  /**
   * Check if API key is temporarily blocked
   * @param {string} apiKeyId - API key ID
   * @returns {Promise<boolean>} True if blocked
   */
  async isApiKeyBlocked(apiKeyId) {
    const cacheKey = `security:blocked:${apiKeyId}`;
    const blocked = await cache.get(cacheKey);
    
    if (blocked) {
      return blocked.isBlocked;
    }

    // Check database for permanent blocks
    const apiKey = await prisma.apiKey.findUnique({
      where: { id: apiKeyId },
      select: { isBlocked: true, blockedUntil: true }
    });

    if (!apiKey) {
      return true; // Non-existent key is considered blocked
    }

    const isBlocked = apiKey.isBlocked || (apiKey.blockedUntil && apiKey.blockedUntil > new Date());
    
    // Cache result for 1 minute
    await cache.set(cacheKey, { isBlocked }, 60);
    
    return isBlocked;
  }

  /**
   * Temporarily block an API key
   * @param {string} apiKeyId - API key ID
   * @param {number} durationMinutes - Block duration in minutes
   * @param {string} reason - Reason for blocking
   */
  async blockApiKey(apiKeyId, durationMinutes = 60, reason = 'Security violation') {
    const blockedUntil = new Date();
    blockedUntil.setMinutes(blockedUntil.getMinutes() + durationMinutes);

    await prisma.apiKey.update({
      where: { id: apiKeyId },
      data: {
        isBlocked: true,
        blockedUntil
      }
    });

    // Clear cache
    const cacheKey = `security:blocked:${apiKeyId}`;
    await cache.del(cacheKey);

    await this.logSecurityEvent(apiKeyId, 'API_KEY_BLOCKED', {
      reason,
      durationMinutes,
      blockedUntil
    });
  }

  /**
   * Comprehensive API key validation with security checks
   * @param {string} apiKey - The API key to validate
   * @param {string} ipAddress - IP address making the request
   * @param {string} userAgent - User agent string
   * @param {string} action - Action being performed
   * @returns {Promise<Object|null>} API key data or null if invalid/blocked
   */
  async validateApiKeyWithSecurity(apiKey, ipAddress, userAgent, action = 'read') {
    // Basic validation first
    const apiKeyData = await this.validateApiKey(apiKey);
    if (!apiKeyData) {
      return null;
    }

    // Check if key is blocked
    const isBlocked = await this.isApiKeyBlocked(apiKeyData.id);
    if (isBlocked) {
      await this.logSecurityEvent(apiKeyData.id, 'BLOCKED_ACCESS_ATTEMPT', {
        ipAddress,
        userAgent,
        action
      });
      return null;
    }

    // Validate IP whitelist
    const ipAllowed = await this.validateIpWhitelist(apiKeyData.id, ipAddress);
    if (!ipAllowed) {
      await this.logSecurityEvent(apiKeyData.id, 'IP_WHITELIST_VIOLATION', {
        ipAddress,
        userAgent,
        action
      });
      return null;
    }

    // Check permissions
    const hasPermission = this.validateApiKeyPermissions(apiKeyData, action);
    if (!hasPermission) {
      await this.logSecurityEvent(apiKeyData.id, 'PERMISSION_DENIED', {
        ipAddress,
        userAgent,
        action,
        permissions: apiKeyData.permissions
      });
      return null;
    }

    // Detect suspicious activity
    const isSuspicious = await this.detectSuspiciousActivity(apiKeyData.id, ipAddress, userAgent);
    if (isSuspicious) {
      // Temporarily block for 30 minutes on suspicious activity
      await this.blockApiKey(apiKeyData.id, 30, 'Suspicious activity detected');
      return null;
    }

    return apiKeyData;
  }

  /**
   * Clean up expired API keys and old usage logs
   */
  async cleanup() {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Deactivate expired keys
    await prisma.apiKey.updateMany({
      where: {
        expiresAt: { lt: now },
        isActive: true
      },
      data: { isActive: false }
    });

    // Delete old usage logs (keep 30 days)
    await prisma.apiKeyUsage.deleteMany({
      where: {
        timestamp: { lt: thirtyDaysAgo }
      }
    });

    console.log('[API Key Cleanup] Expired keys deactivated and old logs cleaned');
  }
}

module.exports = new ApiKeyService();