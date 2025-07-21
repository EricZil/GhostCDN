const storageService = require('../services/storage.service');

class UploadController {
  /**
   * Generate a presigned URL for guest uploads
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getGuestPresignedUrl(req, res) {
    try {
      const { filename, contentType, fileSize } = req.body;
      
      if (!filename || !contentType || !fileSize) {
        return res.status(400).json({
          success: false,
          message: 'Missing required file information'
        });
      }
      
      // Validate file size for guest users (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (fileSize > maxSize) {
        return res.status(400).json({
          success: false,
          message: `File size exceeds the limit of ${maxSize / (1024 * 1024)}MB for guest uploads`
        });
      }
      
      // Extract upload settings from the request body
      const uploadOptions = {
        preserveFilename: req.body.preserveFilename === 'true' || req.body.preserveFilename === true, // Default to false if not specified
        optimize: req.body.optimize !== 'false' && req.body.optimize !== false, // Default to true if not specified
        preserveExif: req.body.preserveExif === 'true' || req.body.preserveExif === true, // Default to false if not specified
        generateThumbnails: req.body.generateThumbnails === 'true' || req.body.generateThumbnails === true, // Default to false if not specified
      };
      
      const fileInfo = { filename, contentType, fileSize };
      const result = await storageService.getPresignedUrl(fileInfo, false, null, uploadOptions);
      
      return res.status(200).json({
        success: true,
        message: 'Presigned URL generated successfully',
        data: result
      });
    } catch (error) {
      console.error('Error generating guest presigned URL:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error generating presigned URL'
      });
    }
  }
  
  /**
   * Generate a presigned URL for registered user uploads
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUserPresignedUrl(req, res) {
    try {
      const { filename, contentType, fileSize } = req.body;
      
      if (!filename || !contentType || !fileSize) {
        return res.status(400).json({
          success: false,
          message: 'Missing required file information'
        });
      }
      
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required for user uploads'
        });
      }
      
      // Validate file size for registered users (50GB limit for CLI, 100MB for web)
      // Check if this is a CLI request (has API key authentication)
      const isCliRequest = req.headers.authorization && req.headers.authorization.startsWith('Bearer ') && req.headers.authorization.length > 50;
      const maxSize = isCliRequest ? 50 * 1024 * 1024 * 1024 : 100 * 1024 * 1024; // 50GB for CLI, 100MB for web
      const sizeUnit = isCliRequest ? 'GB' : 'MB';
      const sizeLimit = isCliRequest ? maxSize / (1024 * 1024 * 1024) : maxSize / (1024 * 1024);
      
      // Store CLI detection for later use
      req.isCliUpload = isCliRequest;
      
      if (fileSize > maxSize) {
        return res.status(400).json({
          success: false,
          message: `File size exceeds the limit of ${sizeLimit}${sizeUnit} for ${isCliRequest ? 'CLI' : 'web'} uploads`
        });
      }
      
      // Extract upload settings from the request body
      const uploadOptions = {
        preserveFilename: req.body.preserveFilename === 'true' || req.body.preserveFilename === true, // Default to false if not specified
        optimize: req.body.optimize !== 'false' && req.body.optimize !== false, // Default to true if not specified
        preserveExif: req.body.preserveExif === 'true' || req.body.preserveExif === true, // Default to false if not specified
        generateThumbnails: req.body.generateThumbnails === 'true' || req.body.generateThumbnails === true, // Default to false if not specified
      };
      
      // Use the authenticated user's r2FolderName for the upload path
      const fileInfo = { filename, contentType, fileSize };
      const result = await storageService.getPresignedUrl(fileInfo, true, req.user.r2FolderName, uploadOptions);
      
      return res.status(200).json({
        success: true,
        message: 'Presigned URL generated successfully',
        data: result
      });
    } catch (error) {
      console.error('Error generating user presigned URL:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error generating presigned URL'
      });
    }
  }
  
  /**
   * Complete a guest upload after direct upload is finished
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async completeGuestUpload(req, res) {
    try {
      const { fileKey: encodedFileKey } = req.params;
      
      if (!encodedFileKey) {
        return res.status(400).json({
          success: false,
          message: 'Missing file key'
        });
      }
      
      // Decode the URL-encoded fileKey
      const fileKey = decodeURIComponent(encodedFileKey);
      
      // Extract post-processing options from the request body
      const options = {
        generateThumbnails: req.body.generateThumbnails === 'true' || req.body.generateThumbnails === true, // Handle both string and boolean
      };
      
      // Debug: console.log('Complete guest upload options:', options);
      
      const result = await storageService.completeDirectUpload(fileKey, false, options);
      
      return res.status(200).json({
        success: true,
        message: 'Upload completed successfully',
        data: result
      });
    } catch (error) {
      console.error('Error completing guest upload:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error completing upload'
      });
    }
  }
  
  /**
   * Complete a user upload after direct upload is finished
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async completeUserUpload(req, res) {
    try {
      const { fileKey: encodedFileKey } = req.params;
      
      if (!encodedFileKey) {
        return res.status(400).json({
          success: false,
          message: 'Missing file key'
        });
      }
      
      // Decode the URL-encoded fileKey
      const fileKey = decodeURIComponent(encodedFileKey);
      
      // Extract post-processing options from the request body
      const options = {
        generateThumbnails: req.body.generateThumbnails === 'true' || req.body.generateThumbnails === true, // Handle both string and boolean
      };
      
      // Debug: console.log('Complete user upload options:', options);
      
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required for user uploads'
        });
      }
      
      const result = await storageService.completeDirectUpload(fileKey, true, options, req.user, req.isCliUpload);
      
      return res.status(200).json({
        success: true,
        message: 'Upload completed successfully',
        data: result
      });
    } catch (error) {
      console.error('Error completing user upload:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error completing upload'
      });
    }
  }
  
  /**
   * Delete a file
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteFile(req, res) {
    try {
      const { fileKey: encodedFileKey } = req.params;
      
      if (!encodedFileKey) {
        return res.status(400).json({
          success: false,
          message: 'Missing file key'
        });
      }
      
      // Decode the URL-encoded fileKey
      const fileKey = decodeURIComponent(encodedFileKey);
      
      // Call deleteFile without the second parameter
      await storageService.deleteFile(fileKey);
      
      return res.status(200).json({
        success: true,
        message: 'File deleted successfully'
      });
    } catch (error) {
      console.error('Delete file error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error deleting file'
      });
    }
  }
}

module.exports = new UploadController();