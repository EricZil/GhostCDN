const express = require('express');
const path = require('path');
const uploadController = require('../controllers/upload.controller');
const { checkAllBans } = require('../middleware/ban.middleware');

const router = express.Router();

// Apply ban checking to all upload routes
router.use(checkAllBans);

// Extract token from form data middleware
const extractToken = (req, res, next) => {
  // If token is in form data, add it to the headers
  if (req.body && req.body.token) {
    req.headers.authorization = `Bearer ${req.body.token}`;
  }
  next();
};

// ===== PRESIGNED URL ROUTES =====

// Get presigned URL for guest uploads
router.post('/presigned/guest', uploadController.getGuestPresignedUrl);

// Get presigned URL for registered user uploads
router.post('/presigned/user', extractToken, uploadController.getUserPresignedUrl);

// Complete upload after direct upload is finished
router.post('/complete/guest/:fileKey', uploadController.completeGuestUpload);
router.post('/complete/user/:fileKey', extractToken, uploadController.completeUserUpload);

// Delete file route
router.delete('/:fileKey', uploadController.deleteFile);

module.exports = router; 