const express = require('express');
const router = express.Router();
const storageService = require('../services/storage.service');
const { optionalNextAuthJWT, validateNextAuthJWT } = require('../middleware/jwt.middleware');

// Simple test endpoint to verify routing works
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Storage routes are working!',
    timestamp: new Date().toISOString(),
    provider: 'digitalocean-spaces'
  });
});

// This file is for future storage management endpoints
// For example:
// - Listing files
// - Getting file metadata
// - Moving files between providers
// - Managing file permissions

// For now, we'll just have a placeholder route
router.get('/status', async (req, res) => {
  try {
    // Simple status check - could be enhanced to actually ping the storage service
    return res.status(200).json({
      success: true,
      message: 'Storage service is operational',
      providers: {
        'digitalocean-spaces': 'operational'
      }
    });
  } catch (error) {
    console.error('Error checking storage status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check storage status',
      error: error.message
    });
  }
});

// Get presigned URL for guest upload
router.post('/guest/presigned-url', async (req, res) => {
  try {
    const { filename, contentType, fileSize, preserveFilename, ...options } = req.body;
    
    // Add preserveFilename to options if provided
    if (preserveFilename !== undefined) {
      options.preserveFilename = preserveFilename;
    }
    
    if (!filename || !contentType || !fileSize) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: filename, contentType, fileSize'
      });
    }
    
    const result = await storageService.getPresignedUrl(
      { filename, contentType, fileSize },
      false, // isRegisteredUser = false
      null,  // userFolderName = null for guests
      options
    );
    
    return res.status(200).json({
      success: true,
      message: 'Presigned URL generated successfully',
      data: result
    });
  } catch (error) {
    console.error('Error generating guest presigned URL:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate presigned URL',
      error: error.message
    });
  }
});

// Get presigned URL for registered user upload
router.post('/user/presigned-url', validateNextAuthJWT, async (req, res) => {
  try {
    const { filename, contentType, fileSize, token, userFolderName, preserveFilename, ...options } = req.body;
    
    // Add preserveFilename to options if provided
    if (preserveFilename !== undefined) {
      options.preserveFilename = preserveFilename;
    }
    
    if (!filename || !contentType || !fileSize || !userFolderName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: filename, contentType, fileSize, userFolderName'
      });
    }
    
    // User is already validated by the JWT middleware
    
    const result = await storageService.getPresignedUrl(
      { filename, contentType, fileSize },
      true, // isRegisteredUser = true
      userFolderName,
      options
    );
    
    return res.status(200).json({
      success: true,
      message: 'Presigned URL generated successfully',
      data: result
    });
  } catch (error) {
    console.error('Error generating user presigned URL:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate presigned URL',
      error: error.message
    });
  }
});

// Complete guest upload
router.post('/guest/complete', async (req, res) => {
  try {
    const { fileKey, ...options } = req.body;
    
    if (!fileKey) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameter: fileKey'
      });
    }
    
    const result = await storageService.completeDirectUpload(fileKey, options);
    
    return res.status(200).json({
      success: true,
      message: 'Upload completed successfully',
      data: result
    });
  } catch (error) {
    console.error('Error completing guest upload:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to complete upload',
      error: error.message
    });
  }
});

// Complete registered user upload
router.post('/user/complete', validateNextAuthJWT, async (req, res) => {
  try {
    const { fileKey, token, ...options } = req.body;
    
    if (!fileKey) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameter: fileKey'
      });
    }
    
    // User is already validated by the JWT middleware
    
    const result = await storageService.completeDirectUpload(fileKey, options);
    
    return res.status(200).json({
      success: true,
      message: 'Upload completed successfully',
      data: result
    });
  } catch (error) {
    console.error('Error completing user upload:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to complete upload',
      error: error.message
    });
  }
});

// Create a user folder in DigitalOcean Spaces
router.post('/create-user-folder', async (req, res) => {
  try {
    const { userId, folderName } = req.body;
    
    if (!userId || !folderName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: userId and folderName'
      });
    }
    
    // Create the user folder in DigitalOcean Spaces
    await storageService.createUserFolder(folderName);
    
    return res.status(200).json({
      success: true,
      message: 'User folder created successfully',
      folderName
    });
  } catch (error) {
    console.error('Error creating user folder:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create user folder',
      error: error.message
    });
  }
});

// Initialize basic folder structure (can be called during setup)
router.post('/initialize', async (req, res) => {
  try {
    await storageService.initializeFolderStructure();
    
    return res.status(200).json({
      success: true,
      message: 'Folder structure initialized successfully'
    });
  } catch (error) {
    console.error('Error initializing folder structure:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to initialize folder structure',
      error: error.message
    });
  }
});

module.exports = router; 