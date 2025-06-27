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
        optimize: req.body.optimize !== 'false' && req.body.optimize !== false, // Default to true if not specified
        preserveExif: req.body.preserveExif === 'true' || req.body.preserveExif === true, // Default to false if not specified
        generateThumbnails: req.body.generateThumbnails === 'true' || req.body.generateThumbnails === true, // Default to false if not specified
      };
      
      const fileInfo = { filename, contentType, fileSize };
      const result = await storageService.getPresignedUrl(fileInfo, false, uploadOptions);
      
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
      
      // Validate file size for registered users (100MB limit)
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (fileSize > maxSize) {
        return res.status(400).json({
          success: false,
          message: `File size exceeds the limit of ${maxSize / (1024 * 1024)}MB for user uploads`
        });
      }
      
      // Extract upload settings from the request body
      const uploadOptions = {
        optimize: req.body.optimize !== 'false' && req.body.optimize !== false, // Default to true if not specified
        preserveExif: req.body.preserveExif === 'true' || req.body.preserveExif === true, // Default to false if not specified
        generateThumbnails: req.body.generateThumbnails === 'true' || req.body.generateThumbnails === true, // Default to false if not specified
      };
      
      // Here we would verify the user is authenticated
      // For now, we'll assume the user is authenticated if they hit this endpoint
      const fileInfo = { filename, contentType, fileSize };
      const result = await storageService.getPresignedUrl(fileInfo, true, uploadOptions);
      
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
      const { fileKey } = req.params;
      
      if (!fileKey) {
        return res.status(400).json({
          success: false,
          message: 'Missing file key'
        });
      }
      
      // Extract post-processing options from the request body
      const options = {
        generateThumbnails: req.body.generateThumbnails === 'true' || req.body.generateThumbnails === true, // Handle both string and boolean
      };
      
      console.log('Complete guest upload options:', options);
      
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
      const { fileKey } = req.params;
      
      if (!fileKey) {
        return res.status(400).json({
          success: false,
          message: 'Missing file key'
        });
      }
      
      // Extract post-processing options from the request body
      const options = {
        generateThumbnails: req.body.generateThumbnails === 'true' || req.body.generateThumbnails === true, // Handle both string and boolean
      };
      
      console.log('Complete user upload options:', options);
      
      // Here we would verify the user is authenticated
      // For now, we'll assume the user is authenticated if they hit this endpoint
      const result = await storageService.completeDirectUpload(fileKey, true, options);
      
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
      const { fileKey } = req.params;
      
      if (!fileKey) {
        return res.status(400).json({
          success: false,
          message: 'Missing file key'
        });
      }
      
      // Determine if the user is registered based on the request
      // For now, we'll assume all delete requests are from registered users
      const isRegisteredUser = true;
      
      await storageService.deleteFile(fileKey, isRegisteredUser);
      
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