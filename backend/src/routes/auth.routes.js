const express = require('express');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../lib/prisma');
const emailService = require('../services/email.service');
const { checkEmailBan } = require('../middleware/ban.middleware');

const router = express.Router();

// Login endpoint for credentials authentication
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email and password are required' 
      });
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user || !user.password) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      });
    }

    // Check if user is banned
    const activeBans = await prisma.userBan.findMany({
      where: {
        AND: [
          {
            OR: [
              { userId: user.id },
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
      const ban = activeBans[0]; // Use the first active ban
      return res.status(403).json({ 
        success: false,
        error: 'Account banned',
        message: 'Your account has been banned. Please contact support.',
        reason: ban.reason,
        banType: ban.banType,
        code: 'ACCOUNT_BANNED'
      });
    }

    // Check if email is verified (only for password-based accounts)
    if (user.password && !user.emailVerified) {
      return res.status(403).json({ 
        success: false, 
        error: 'Please verify your email before signing in. Check your inbox for a verification link.',
        code: 'EMAIL_NOT_VERIFIED'
      });
    }

    // Update last login time
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // Return user data (excluding password)
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Registration endpoint
router.post('/register', checkEmailBan, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        error: 'Email already in use' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate unique folder name for DigitalOcean Spaces
    const folderName = uuidv4();
    
    // Generate email verification token
    const verificationToken = emailService.generateSecureToken();

    // Create user (not verified initially)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        r2FolderName: folderName,
        role: 'USER',
        emailVerificationToken: verificationToken,
        emailVerified: null, // Not verified yet
        createdAt: new Date(),
      }
    });

    // Create DigitalOcean Spaces folder for user
    try {
      const storageService = require('../services/storage.service');
      await storageService.createUserFolder(user.id, folderName);
    } catch (error) {
      console.error("Error creating user folder:", error);
      // Don't fail registration if folder creation fails
    }

    // Send verification email
    try {
      await emailService.sendVerificationEmail(email, name, verificationToken);
    } catch (error) {
      console.error("Error sending verification email:", error);
      // Don't fail registration if email fails
    }

    res.status(201).json({ 
      success: true, 
      userId: user.id,
      message: 'Registration successful! Please check your email to verify your account.'
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Registration failed' 
    });
  }
});

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

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email }
    });

    // Check for bans before allowing social login
    const activeBans = await prisma.userBan.findMany({
      where: {
        AND: [
          {
            OR: [
              { userId: user?.id },
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
      return res.status(403).json({ 
        success: false,
        error: 'Account banned',
        message: 'Your account has been banned. Please contact support.',
        reason: ban.reason,
        banType: ban.banType,
        code: 'ACCOUNT_BANNED'
      });
    }

    if (!user) {
      // Create new user for social login
      const folderName = uuidv4();
      
      user = await prisma.user.create({
        data: {
          name,
          email,
          image,
          r2FolderName: folderName,
          role: 'USER',
          emailVerified: new Date(), // Social logins are considered verified
          createdAt: new Date(),
          lastLogin: new Date()
        }
      });

      // Create DigitalOcean Spaces folder for user
      try {
        const storageService = require('../services/storage.service');
        await storageService.createUserFolder(user.id, folderName);
      } catch (error) {
        console.error("Error creating user folder for social login:", error);
      }
    } else {
      // Update existing user
      user = await prisma.user.update({
        where: { id: user.id },
        data: { 
          lastLogin: new Date(),
          ...(image && { image }), // Update image if provided
          // Ensure r2FolderName exists for existing users
          ...((!user.r2FolderName) && { r2FolderName: uuidv4() })
        }
      });

      // Create folder if it doesn't exist
      if (!user.r2FolderName) {
        try {
          const storageService = require('../services/storage.service');
          await storageService.createUserFolder(user.id, user.r2FolderName);
        } catch (error) {
          console.error("Error creating missing user folder:", error);
        }
      }
    }

    // Handle the account relationship (similar to Prisma adapter)
    try {
      await prisma.account.upsert({
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

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image,
        r2FolderName: user.r2FolderName,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Social login error:', error);
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

// Email verification endpoint
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ 
        success: false, 
        error: 'Verification token is required' 
      });
    }

    // Find user with this verification token
    const user = await prisma.user.findUnique({
      where: { emailVerificationToken: token }
    });

    if (!user) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid or expired verification token' 
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email is already verified' 
      });
    }

    // Verify the email
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        emailVerificationToken: null // Clear the token
      }
    });

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(user.email, user.name);
    } catch (error) {
      console.error("Error sending welcome email:", error);
      // Don't fail verification if welcome email fails
    }

    res.json({
      success: true,
      message: 'Email verified successfully! Welcome to GhostCDN.'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Email verification failed' 
    });
  }
});

// Resend verification email endpoint
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email is required' 
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email is already verified' 
      });
    }

    // Rate limiting: Check if user has requested verification email recently (last 60 seconds)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    if (user.updatedAt && user.updatedAt > oneMinuteAgo) {
      return res.status(429).json({ 
        success: false, 
        error: 'Please wait a minute before requesting another verification email.' 
      });
    }

    // Generate new verification token
    const verificationToken = emailService.generateSecureToken();

    // Update user with new token
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerificationToken: verificationToken }
    });

    // Send verification email
    await emailService.sendVerificationEmail(user.email, user.name, verificationToken);

    res.json({
      success: true,
      message: 'Verification email sent! Please check your inbox.'
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to resend verification email' 
    });
  }
});

// Request password reset endpoint
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email is required' 
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // Don't reveal if user exists for security
      return res.json({
        success: true,
        message: 'If an account with that email exists, we sent a password reset link.'
      });
    }

    // Don't allow password reset for social-only accounts
    if (!user.password) {
      return res.status(400).json({ 
        success: false, 
        error: 'This account uses social login. Please sign in with your social provider.' 
      });
    }

    // Generate reset token (expires in 1 hour)
    const resetToken = emailService.generateSecureToken();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Update user with reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires
      }
    });

    // Send password reset email
    await emailService.sendPasswordResetEmail(user.email, user.name, resetToken);

    res.json({
      success: true,
      message: 'If an account with that email exists, we sent a password reset link.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process password reset request' 
    });
  }
});

// Reset password endpoint
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        error: 'Reset token and new password are required' 
      });
    }

    // Validate password strength
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        error: 'Password must be at least 6 characters long' 
      });
    }

    // Find user with valid reset token
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          gt: new Date() // Token not expired
        }
      }
    });

    if (!user) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid or expired reset token' 
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null
      }
    });

    res.json({
      success: true,
      message: 'Password reset successfully! You can now sign in with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Password reset failed' 
    });
  }
});

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