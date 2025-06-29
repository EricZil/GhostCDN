const nodemailer = require('nodemailer');
const crypto = require('crypto');
const prisma = require('../lib/prisma');

class EmailService {
  constructor() {
    // Create Maileroo transporter
    this.transporter = nodemailer.createTransport({
      host: process.env.MAILEROO_SMTP_HOST || 'smtp.maileroo.com',
      port: process.env.MAILEROO_SMTP_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.MAILEROO_SMTP_USERNAME,
        pass: process.env.MAILEROO_SMTP_PASSWORD,
      },
    });

    // Verify connection on startup
    this.verifyConnection();
  }

  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ Maileroo SMTP connection verified');
    } catch (error) {
      console.error('❌ Maileroo SMTP connection failed:', error.message);
      console.warn('⚠️  Email functionality will be disabled');
    }
  }

  /**
   * Generate a secure token for email verification or password reset
   * @param {number} length - Token length (default: 32)
   * @returns {string} - Generated token
   */
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Send email verification email
   * @param {string} email - User's email address
   * @param {string} name - User's name
   * @param {string} verificationToken - Verification token
   * @returns {Promise<boolean>} - Success status
   */
  async sendVerificationEmail(email, name, verificationToken) {
    try {
      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/verify?token=${verificationToken}`;
      
      const mailOptions = {
        from: {
          name: process.env.FROM_NAME || 'GhostCDN',
          address: process.env.FROM_EMAIL || 'noreply@ghostcdn.xyz'
        },
        to: email,
        subject: 'Verify your GhostCDN account',
        html: this.getVerificationEmailTemplate(name, verificationUrl),
        text: this.getVerificationEmailText(name, verificationUrl)
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Verification email sent:', info.messageId);
      
      // Log email activity
      await this.logEmailActivity('VERIFICATION', email, 'sent', {
        messageId: info.messageId,
        verificationToken
      });
      
      return true;
    } catch (error) {
      console.error('❌ Failed to send verification email:', error);
      
      // Log email failure
      await this.logEmailActivity('VERIFICATION', email, 'failed', {
        error: error.message
      });
      
      return false;
    }
  }

  /**
   * Send password reset email
   * @param {string} email - User's email address
   * @param {string} name - User's name
   * @param {string} resetToken - Password reset token
   * @returns {Promise<boolean>} - Success status
   */
  async sendPasswordResetEmail(email, name, resetToken) {
    try {
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`;
      
      const mailOptions = {
        from: {
          name: process.env.FROM_NAME || 'GhostCDN',
          address: process.env.FROM_EMAIL || 'noreply@ghostcdn.xyz'
        },
        to: email,
        subject: 'Reset your GhostCDN password',
        html: this.getPasswordResetEmailTemplate(name, resetUrl),
        text: this.getPasswordResetEmailText(name, resetUrl)
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Password reset email sent:', info.messageId);
      
      // Log email activity
      await this.logEmailActivity('PASSWORD_RESET', email, 'sent', {
        messageId: info.messageId,
        resetToken
      });
      
      return true;
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error);
      
      // Log email failure
      await this.logEmailActivity('PASSWORD_RESET', email, 'failed', {
        error: error.message
      });
      
      return false;
    }
  }

  /**
   * Send welcome email after successful verification
   * @param {string} email - User's email address
   * @param {string} name - User's name
   * @returns {Promise<boolean>} - Success status
   */
  async sendWelcomeEmail(email, name) {
    try {
      const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}`;
      
      const mailOptions = {
        from: {
          name: process.env.FROM_NAME || 'GhostCDN',
          address: process.env.FROM_EMAIL || 'noreply@ghostcdn.xyz'
        },
        to: email,
        subject: 'Welcome to GhostCDN! 🎉',
        html: this.getWelcomeEmailTemplate(name, dashboardUrl),
        text: this.getWelcomeEmailText(name, dashboardUrl)
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Welcome email sent:', info.messageId);
      
      // Log email activity
      await this.logEmailActivity('WELCOME', email, 'sent', {
        messageId: info.messageId
      });
      
      return true;
    } catch (error) {
      console.error('❌ Failed to send welcome email:', error);
      
      // Log email failure
      await this.logEmailActivity('WELCOME', email, 'failed', {
        error: error.message
      });
      
      return false;
    }
  }

  /**
   * Log email activity to database
   * @param {string} type - Email type
   * @param {string} email - Recipient email
   * @param {string} status - Email status
   * @param {object} metadata - Additional metadata
   */
  async logEmailActivity(type, email, status, metadata = {}) {
    try {
      await prisma.systemLog.create({
        data: {
          level: status === 'sent' ? 'INFO' : 'ERROR',
          message: `Email ${type.toLowerCase()} ${status}: ${email}`,
          source: 'email',
          metadata: JSON.stringify({
            type,
            email,
            status,
            ...metadata,
            timestamp: new Date().toISOString()
          })
        }
      });
    } catch (error) {
      console.error('Failed to log email activity:', error);
    }
  }

  /**
   * HTML template for verification email
   */
  getVerificationEmailTemplate(name, verificationUrl) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify your GhostCDN account</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>👻 GhostCDN</h1>
            <p>Verify your account</p>
        </div>
        <div class="content">
            <h2>Hi ${name}!</h2>
            <p>Thanks for signing up for GhostCDN! To complete your registration, please verify your email address by clicking the button below:</p>
            
            <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #e9ecef; padding: 10px; border-radius: 4px; font-family: monospace;">${verificationUrl}</p>
            
            <p><strong>This link will expire in 24 hours.</strong></p>
            
            <p>If you didn't create an account with GhostCDN, you can safely ignore this email.</p>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} GhostCDN. All rights reserved.</p>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Plain text template for verification email
   */
  getVerificationEmailText(name, verificationUrl) {
    return `
Hi ${name}!

Thanks for signing up for GhostCDN! To complete your registration, please verify your email address by visiting this link:

${verificationUrl}

This link will expire in 24 hours.

If you didn't create an account with GhostCDN, you can safely ignore this email.

© ${new Date().getFullYear()} GhostCDN. All rights reserved.
    `.trim();
  }

  /**
   * HTML template for password reset email
   */
  getPasswordResetEmailTemplate(name, resetUrl) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset your GhostCDN password</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #f5576c; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>👻 GhostCDN</h1>
            <p>Password Reset Request</p>
        </div>
        <div class="content">
            <h2>Hi ${name}!</h2>
            <p>We received a request to reset your GhostCDN account password. Click the button below to create a new password:</p>
            
            <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #e9ecef; padding: 10px; border-radius: 4px; font-family: monospace;">${resetUrl}</p>
            
            <div class="warning">
                <strong>⚠️ Security Notice:</strong> This link will expire in 1 hour for your security. If you didn't request this password reset, please ignore this email or contact support if you have concerns.
            </div>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} GhostCDN. All rights reserved.</p>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Plain text template for password reset email
   */
  getPasswordResetEmailText(name, resetUrl) {
    return `
Hi ${name}!

We received a request to reset your GhostCDN account password. Visit this link to create a new password:

${resetUrl}

This link will expire in 1 hour for your security.

If you didn't request this password reset, please ignore this email or contact support if you have concerns.

© ${new Date().getFullYear()} GhostCDN. All rights reserved.
    `.trim();
  }

  /**
   * HTML template for welcome email
   */
  getWelcomeEmailTemplate(name, dashboardUrl) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to GhostCDN!</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #4facfe; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .feature { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #4facfe; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🎉 Welcome to GhostCDN!</h1>
            <p>Your account is now active</p>
        </div>
        <div class="content">
            <h2>Hi ${name}!</h2>
            <p>Congratulations! Your GhostCDN account has been successfully verified and is now ready to use.</p>
            
            <div style="text-align: center;">
                <a href="${dashboardUrl}" class="button">Go to Dashboard</a>
            </div>
            
            <h3>What you can do now:</h3>
            
            <div class="feature">
                <h4>📤 Upload Images</h4>
                <p>Upload your images and get instant CDN links that work globally.</p>
            </div>
            
            <div class="feature">
                <h4>📊 Track Analytics</h4>
                <p>Monitor your image views, bandwidth usage, and performance metrics.</p>
            </div>
            
            <div class="feature">
                <h4>🎨 Image Optimization</h4>
                <p>Automatically optimize your images for better performance and smaller file sizes.</p>
            </div>
            
            <div class="feature">
                <h4>🖼️ Generate Thumbnails</h4>
                <p>Create multiple thumbnail sizes for responsive design and faster loading.</p>
            </div>
            
            <p>If you have any questions or need help getting started, feel free to reach out to our support team.</p>
            
            <p>Happy uploading! 🚀</p>
            <p>The GhostCDN Team</p>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} GhostCDN. All rights reserved.</p>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Plain text template for welcome email
   */
  getWelcomeEmailText(name, dashboardUrl) {
    return `
Welcome to GhostCDN! 🎉

Hi ${name}!

Congratulations! Your GhostCDN account has been successfully verified and is now ready to use.

Visit your dashboard: ${dashboardUrl}

What you can do now:
• Upload Images - Upload your images and get instant CDN links
• Track Analytics - Monitor views, bandwidth usage, and performance
• Image Optimization - Automatically optimize images for better performance
• Generate Thumbnails - Create multiple thumbnail sizes

If you have any questions or need help getting started, feel free to reach out to our support team.

Happy uploading! 🚀
The GhostCDN Team

© ${new Date().getFullYear()} GhostCDN. All rights reserved.
    `.trim();
  }
}

module.exports = new EmailService();
