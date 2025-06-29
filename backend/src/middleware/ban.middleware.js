const prisma = require('../lib/prisma');

// Middleware to check IP bans
const checkIpBan = async (req, res, next) => {
  try {
    const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0]?.trim();
    
    if (clientIp) {
      const ipBans = await prisma.userBan.findMany({
        where: {
          AND: [
            { isActive: true },
            { banType: { in: ['IP', 'FULL'] } },
            {
              OR: [
                { expiresAt: null }, // Permanent bans
                { expiresAt: { gt: new Date() } } // Non-expired temporary bans
              ]
            }
          ]
        }
      });

      for (const ban of ipBans) {
        if (ban.ipAddresses) {
          try {
            const bannedIps = JSON.parse(ban.ipAddresses);
            if (bannedIps.includes(clientIp)) {
              return res.status(403).json({
                error: 'Access denied',
                message: 'Your IP address has been banned.',
                code: 'IP_BANNED'
              });
            }
          } catch (e) {
            // Ignore invalid IP data
          }
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('IP ban check error:', error);
    next(); // Continue on error to avoid breaking the app
  }
};

// Middleware to check if user is banned (for authenticated routes)
const checkUserBan = async (req, res, next) => {
  try {
    const userEmail = req.headers['user-email'];
    const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0]?.trim();
    
    if (userEmail) {
      // Check for active bans on this user
      const userBans = await prisma.userBan.findMany({
        where: {
          AND: [
            {
              OR: [
                { email: userEmail },
                { userId: req.user?.id }
              ]
            },
            { isActive: true },
            { banType: { in: ['ACCOUNT', 'FULL'] } },
            {
              OR: [
                { expiresAt: null }, // Permanent bans
                { expiresAt: { gt: new Date() } } // Non-expired temporary bans
              ]
            }
          ]
        }
      });

      if (userBans.length > 0) {
        const ban = userBans[0];
        return res.status(403).json({
          error: 'Account banned',
          message: 'Your account has been banned. Please contact support.',
          reason: ban.reason,
          banType: ban.banType,
          code: 'ACCOUNT_BANNED'
        });
      }
    }
    
    next();
  } catch (error) {
    console.error('User ban check error:', error);
    next(); // Continue on error to avoid breaking the app
  }
};

// Middleware to check email bans (for registration)
const checkEmailBan = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    if (email) {
      const emailBans = await prisma.userBan.findMany({
        where: {
          AND: [
            { email },
            { isActive: true },
            { banType: { in: ['EMAIL', 'FULL'] } },
            {
              OR: [
                { expiresAt: null }, // Permanent bans
                { expiresAt: { gt: new Date() } } // Non-expired temporary bans
              ]
            }
          ]
        }
      });

      if (emailBans.length > 0) {
        return res.status(403).json({ 
          success: false, 
          error: 'Registration not allowed',
          message: 'This email address is not permitted to register.',
          code: 'EMAIL_BANNED'
        });
      }
    }
    
    next();
  } catch (error) {
    console.error('Email ban check error:', error);
    next(); // Continue on error to avoid breaking the app
  }
};

// Combined middleware for comprehensive ban checking
const checkAllBans = async (req, res, next) => {
  try {
    const userEmail = req.headers['user-email'];
    const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0]?.trim();
    
    // Check IP bans first
    if (clientIp) {
      const ipBans = await prisma.userBan.findMany({
        where: {
          AND: [
            { isActive: true },
            { banType: { in: ['IP', 'FULL'] } },
            {
              OR: [
                { expiresAt: null }, // Permanent bans
                { expiresAt: { gt: new Date() } } // Non-expired temporary bans
              ]
            }
          ]
        }
      });

      for (const ban of ipBans) {
        if (ban.ipAddresses) {
          try {
            const bannedIps = JSON.parse(ban.ipAddresses);
            if (bannedIps.includes(clientIp)) {
              return res.status(403).json({
                error: 'Access denied',
                message: 'Your IP address has been banned.',
                code: 'IP_BANNED'
              });
            }
          } catch (e) {
            // Ignore invalid IP data
          }
        }
      }
    }
    
    // Check user account bans
    if (userEmail) {
      const userBans = await prisma.userBan.findMany({
        where: {
          AND: [
            {
              OR: [
                { email: userEmail },
                { userId: req.user?.id }
              ]
            },
            { isActive: true },
            { banType: { in: ['ACCOUNT', 'FULL'] } },
            {
              OR: [
                { expiresAt: null }, // Permanent bans
                { expiresAt: { gt: new Date() } } // Non-expired temporary bans
              ]
            }
          ]
        }
      });

      if (userBans.length > 0) {
        const ban = userBans[0];
        return res.status(403).json({
          error: 'Account banned',
          message: 'Your account has been banned. Please contact support.',
          reason: ban.reason,
          banType: ban.banType,
          code: 'ACCOUNT_BANNED'
        });
      }
    }
    
    next();
  } catch (error) {
    console.error('Ban check error:', error);
    next(); // Continue on error to avoid breaking the app
  }
};

module.exports = {
  checkIpBan,
  checkUserBan,
  checkEmailBan,
  checkAllBans
}; 