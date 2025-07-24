const express = require('express');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../lib/prisma');
const storageService = require('../services/storage.service');

const router = express.Router();

// Password-based login removed - using social authentication only

// Password-based registration removed - using social authentication only

// Social login endpoint
router.post('/social-login', async (req, res) => {
  try {
    const { email, name, image, provider, providerAccountId } = req.body;

    if (!email || !name || !provider || !providerAccountId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields for social login' 
      });
    }

    // Use a transaction to prevent lock contention and ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Check if user already exists
      let user = await tx.user.findUnique({
        where: { email },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          r2FolderName: true,
          lastLogin: true,
          emailVerified: true
        }
      });

      // Check for bans before allowing social login - optimized query
      const currentTime = new Date();
      const activeBans = await tx.userBan.findFirst({
        where: {
          AND: [
            { isActive: true },
            {
              OR: [
                {
                  AND: [
                    { userId: user?.id },
                    { userId: { not: null } }
                  ]
                },
                { email: email }
              ]
            },
            {
              OR: [
                { expiresAt: null }, // Permanent bans
                { expiresAt: { gt: currentTime } } // Non-expired temporary bans
              ]
            }
          ]
        },
        select: {
          reason: true,
          banType: true
        }
      });

      if (activeBans) {
        throw new Error(JSON.stringify({
          status: 403,
          success: false,
          error: 'Account banned',
          message: 'Your account has been banned. Please contact support.',
          reason: activeBans.reason,
          banType: activeBans.banType,
          code: 'ACCOUNT_BANNED'
        }));
      }

      if (!user) {
        // Create new user for social login
        const folderName = uuidv4();
        
        user = await tx.user.create({
          data: {
            name,
            email,
            image,
            r2FolderName: folderName,
            role: 'USER',
            emailVerified: currentTime, // Social logins are considered verified
            lastLogin: currentTime
          },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            r2FolderName: true,
            lastLogin: true
          }
        });

        // Create DigitalOcean Spaces folder for user (outside transaction to avoid blocking)
        setImmediate(async () => {
          try {
            await storageService.createUserFolder(folderName);
          } catch (error) {
            console.error("Error creating user folder for social login:", error);
          }
        });
      } else {
        // Prepare update data
        const updateData = { 
          lastLogin: currentTime
        };
        
        if (image) {
          updateData.image = image;
        }
        
        // Ensure r2FolderName exists for existing users
        if (!user.r2FolderName) {
          updateData.r2FolderName = uuidv4();
        }

        // Update existing user
        user = await tx.user.update({
          where: { id: user.id },
          data: updateData,
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            r2FolderName: true,
            lastLogin: true
          }
        });

        // Create folder if it was just added (outside transaction to avoid blocking)
        if (updateData.r2FolderName) {
          setImmediate(async () => {
            try {
              await storageService.createUserFolder(updateData.r2FolderName);
            } catch (error) {
              console.error("Error creating missing user folder:", error);
            }
          });
        }
      }

      // Handle the account relationship (similar to Prisma adapter)
      try {
        await tx.account.upsert({
          where: {
            provider_providerAccountId: {
              provider,
              providerAccountId
            }
          },
          update: {
            userId: user.id
          },
          create: {
            userId: user.id,
            type: 'oauth',
            provider,
            providerAccountId
          }
        });
      } catch (error) {
        console.error('Error managing account relationship:', error);
        // Don't fail login if account linking fails
      }

      return user;
    }, {
      timeout: 10000, // 10 second timeout
      isolationLevel: 'ReadCommitted' // Use READ COMMITTED to reduce lock contention
    });

    res.json({
      success: true,
      user: result
    });
  } catch (error) {
    console.error('Social login error:', error);
    
    // Handle ban errors specifically
    if (error.message.startsWith('{')) {
      try {
        const banError = JSON.parse(error.message);
        return res.status(banError.status).json(banError);
      } catch {
        // Fall through to generic error
      }
    }
    
    res.status(500).json({ 
      success: false, 
      error: 'Social login failed' 
    });
  }
});

// Get user by ID endpoint
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        r2FolderName: true,
        lastLogin: true
      }
    });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch user' 
    });
  }
});

// Get connected accounts for user
router.get('/accounts/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const accounts = await prisma.account.findMany({
      where: { userId },
      select: {
        id: true,
        provider: true,
        providerAccountId: true,
        type: true,
        access_token: true
      }
    });

    // Fetch additional profile info for each account
    const accountsWithProfile = await Promise.all(
      accounts.map(async (account) => {
        let profileInfo = { username: account.providerAccountId };
        
        try {
          if (account.provider === 'github' && account.access_token) {
            const response = await fetch('https://api.github.com/user', {
              headers: {
                'Authorization': `token ${account.access_token}`,
                'User-Agent': 'GhostCDN-App'
              }
            });
            
            if (response.ok) {
              const githubUser = await response.json();
              profileInfo.username = githubUser.login || account.providerAccountId;
            }
          } else if (account.provider === 'google') {
            // For Google, we can use the email from the user
            const user = await prisma.user.findUnique({
              where: { id: userId },
              select: { email: true }
            });
            profileInfo.username = user?.email?.split('@')[0] || account.providerAccountId;
          }
        } catch (error) {
          console.error(`Error fetching profile for ${account.provider}:`, error);
        }
        
        return {
          ...account,
          username: profileInfo.username
        };
      })
    );

    res.json({
      success: true,
      accounts: accountsWithProfile
    });
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch accounts' 
    });
  }
});

// Diagnostic endpoint to test JWT validation
router.post('/test-jwt', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    if (!token) {
      return res.status(400).json({ 
        success: false, 
        error: 'No token provided',
        debug: {
          authHeader: authHeader ? 'present' : 'missing',
          headers: Object.keys(req.headers)
        }
      });
    }
    
    const jwtSecret = process.env.NEXTAUTH_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ 
        success: false, 
        error: 'NEXTAUTH_SECRET not configured in backend',
        debug: {
          env_vars: Object.keys(process.env).filter(key => key.includes('SECRET') || key.includes('AUTH'))
        }
      });
    }
    
    try {
      const decoded = require('jsonwebtoken').verify(token, jwtSecret);
      return res.json({
        success: true,
        message: 'JWT token is valid',
        decoded: {
          id: decoded.id || decoded.sub,
          email: decoded.email,
          exp: decoded.exp,
          iat: decoded.iat
        }
      });
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid JWT token',
        debug: {
          jwtError: jwtError.message,
          tokenLength: token.length,
          secretLength: jwtSecret.length
        }
      });
    }
  } catch (error) {
    console.error('JWT test error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      debug: error.message
    });
  }
});

// Email verification removed - using social authentication only

// Resend verification removed - using social authentication only

// Password reset removed - using social authentication only

// Password reset removed - using social authentication only

// Disconnect account endpoint
router.post('/accounts/:userId/disconnect', async (req, res) => {
  try {
    const { userId } = req.params;
    const { provider } = req.body;

    if (!provider) {
      return res.status(400).json({ 
        success: false, 
        error: 'Provider is required' 
      });
    }

    // Check if user has other authentication methods
    const userAccounts = await prisma.account.findMany({
      where: { userId }
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true }
    });

    // Prevent disconnecting if it's the only authentication method
    if (userAccounts.length === 1 && !user?.password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot disconnect your only authentication method. Please set a password first.' 
      });
    }

    // Disconnect the account
    await prisma.account.deleteMany({
      where: {
        userId,
        provider
      }
    });

    res.json({
      success: true,
      message: 'Account disconnected successfully'
    });
  } catch (error) {
    console.error('Disconnect account error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to disconnect account' 
    });
  }
});

// Ban check endpoint for session validation
router.post('/check-ban', async (req, res) => {
  try {
    const { userId, email } = req.body;

    if (!userId && !email) {
      return res.status(400).json({ 
        success: false, 
        error: 'User ID or email is required' 
      });
    }

    // Check for active bans
    const activeBans = await prisma.userBan.findMany({
      where: {
        AND: [
          {
            OR: [
              { userId },
              { email }
            ]
          },
          { isActive: true },
          {
            OR: [
              { expiresAt: null }, // Permanent bans
              { expiresAt: { gt: new Date() } } // Non-expired temporary bans
            ]
          }
        ]
      }
    });

    if (activeBans.length > 0) {
      const ban = activeBans[0];
      return res.json({
        success: true,
        banned: true,
        banInfo: {
          banType: ban.banType,
          reason: ban.reason,
          bannedAt: ban.bannedAt
        }
      });
    }

    res.json({
      success: true,
      banned: false
    });
  } catch (error) {
    console.error('Ban check error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Comprehensive ban test endpoint for debugging
router.post('/test-ban', async (req, res) => {
  try {
    const { userId, email } = req.body;

    if (!userId && !email) {
      return res.status(400).json({ 
        success: false, 
        error: 'User ID or email is required' 
      });
    }

    // Get all bans for this user/email (active and inactive)
    const allBans = await prisma.userBan.findMany({
      where: {
        OR: [
          { userId },
          { email }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get active bans only
    const activeBans = await prisma.userBan.findMany({
      where: {
        AND: [
          {
            OR: [
              { userId },
              { email }
            ]
          },
          { isActive: true },
          {
            OR: [
              { expiresAt: null }, // Permanent bans
              { expiresAt: { gt: new Date() } } // Non-expired temporary bans
            ]
          }
        ]
      }
    });

    // Get user info
    const user = userId ? await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        email: true, 
        name: true, 
        lastLogin: true,
        emailVerified: true 
      }
    }) : null;

    res.json({
      success: true,
      debug: {
        userId,
        email,
        user,
        totalBans: allBans.length,
        activeBans: activeBans.length,
        allBans: allBans.map(ban => ({
          id: ban.id,
          banType: ban.banType,
          reason: ban.reason,
          isActive: ban.isActive,
          bannedAt: ban.bannedAt,
          expiresAt: ban.expiresAt,
          isExpired: ban.expiresAt ? ban.expiresAt <= new Date() : false
        })),
        activeBanDetails: activeBans.map(ban => ({
          id: ban.id,
          banType: ban.banType,
          reason: ban.reason,
          bannedAt: ban.bannedAt,
          expiresAt: ban.expiresAt
        })),
        isBanned: activeBans.length > 0,
        currentTime: new Date()
      }
    });
  } catch (error) {
    console.error('Ban test error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      debug: error.message
    });
  }
});

module.exports = router;