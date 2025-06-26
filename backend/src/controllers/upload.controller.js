const storageService = require('../services/storage.service');

class UploadController {
  /**
   * Handle file upload for guests
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async uploadGuestFile(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: 'No file uploaded' 
        });
      }

      // Extract upload settings from the request body
      const uploadOptions = {
        optimize: req.body.optimize !== 'false', // Default to true if not specified
        preserveExif: req.body.preserveExif === 'true', // Default to false if not specified
        generateThumbnails: req.body.generateThumbnails === 'true', // Default to false if not specified
      };

      const result = await storageService.uploadFile(req.file, false, uploadOptions);
      
      return res.status(201).json({
        success: true,
        message: 'File uploaded successfully',
        data: result
      });
    } catch (error) {
      console.error('Guest upload error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error uploading file'
      });
    }
  }

  /**
   * Handle file upload for registered users
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async uploadUserFile(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: 'No file uploaded' 
        });
      }

      // Extract upload settings from the request body
      const uploadOptions = {
        optimize: req.body.optimize !== 'false', // Default to true if not specified
        preserveExif: req.body.preserveExif === 'true', // Default to false if not specified
        generateThumbnails: req.body.generateThumbnails === 'true', // Default to false if not specified
      };

      // Here we would verify the user is authenticated
      // For now, we'll assume the user is authenticated if they hit this endpoint
      const result = await storageService.uploadFile(req.file, true, uploadOptions);
      
      return res.status(201).json({
        success: true,
        message: 'File uploaded successfully',
        data: result
      });
    } catch (error) {
      console.error('User upload error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error uploading file'
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
      const { isRegisteredUser, token } = req.body;
      
      if (!fileKey) {
        return res.status(400).json({
          success: false,
          message: 'File key is required'
        });
      }

      // If token is provided, add it to the authorization header
      if (token) {
        req.headers.authorization = `Bearer ${token}`;
      }

      const result = await storageService.deleteFile(fileKey, isRegisteredUser);
      
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