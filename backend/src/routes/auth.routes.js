const express = require('express');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../lib/prisma');

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
router.post('/register', async (req, res) => {
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

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        r2FolderName: folderName,
        role: 'USER',
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

    res.status(201).json({ 
      success: true, 
      userId: user.id 
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
        r2FolderName: user.r2FolderName
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

module.exports = router; 