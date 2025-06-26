const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const uploadController = require('../controllers/upload.controller');

const router = express.Router();

// Set upload directory based on environment
const uploadDir = process.env.NODE_ENV === 'production' 
  ? '/tmp' 
  : path.join(__dirname, '../../uploads');

// Ensure upload directory exists with proper permissions
if (!fs.existsSync(uploadDir)) {
  try {
    fs.mkdirSync(uploadDir, { recursive: true, mode: 0o755 });
    console.log(`Created upload directory: ${uploadDir}`);
  } catch (err) {
    console.error(`Failed to create upload directory: ${err.message}`);
  }
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Use a timestamp + original filename to avoid collisions
    // while preserving the original filename
    const timestamp = Date.now();
    const originalName = file.originalname;
    const customFilename = req.body.filename || originalName;
    
    // Replace spaces and special characters with underscores to avoid URL issues
    // This handles characters like #, ?, &, etc. that cause problems in URLs
    const safeFilename = customFilename
      .replace(/[#?&=+%]/g, '-')  // Replace URL-problematic chars with dashes
      .replace(/\s+/g, '_')       // Replace spaces with underscores
      .replace(/[^\w\-_.]/g, ''); // Remove any other non-alphanumeric chars except -_.
    
    cb(null, safeFilename);
  }
});

// File filter to restrict file types
const fileFilter = (req, file, cb) => {
  // Accept images, videos, and documents
  const allowedMimeTypes = [
    // Images
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    // Videos
    'video/mp4', 'video/webm', 'video/quicktime',
    // Documents
    'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'text/csv'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, videos, and common documents are allowed.'), false);
  }
};

// Guest upload configuration - 10MB limit
const guestUpload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// Registered user upload configuration - 100MB limit
const userUpload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  }
});

// Extract token from form data middleware
const extractToken = (req, res, next) => {
  // If token is in form data, add it to the headers
  if (req.body && req.body.token) {
    req.headers.authorization = `Bearer ${req.body.token}`;
  }
  next();
};

// Guest upload route
router.post('/guest', guestUpload.single('file'), uploadController.uploadGuestFile);

// User upload route (will need auth middleware in the future)
router.post('/user', userUpload.single('file'), extractToken, uploadController.uploadUserFile);

// Delete file route
router.delete('/:fileKey', uploadController.deleteFile);

module.exports = router; 