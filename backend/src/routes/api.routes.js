/**
 * Public API Routes for External Users
 * These endpoints are accessed using Bearer token authentication with user-generated API keys
 */

const express = require('express');
const router = express.Router();
const { authenticateBearer, requirePermissions } = require('../middleware/bearerAuth.middleware');
const { generalLimiter } = require('../middleware/rateLimiter.middleware');
const prisma = require('../lib/prisma');
const storageService = require('../services/storage.service');

// Apply Bearer authentication and rate limiting to all routes
router.use(authenticateBearer);
router.use(generalLimiter);

/**
 * POST /api/v1/files/presigned-url
 * Get a presigned URL for file upload
 */
router.post('/files/presigned-url', 
  requirePermissions(['files.write']),
  async (req, res) => {
    try {
      const { filename, contentType, fileSize } = req.body;
      
      if (!filename || !contentType || !fileSize) {
        return res.status(400).json({
          success: false,
          error: 'Missing required file information (filename, contentType, fileSize)',
          code: 'MISSING_FILE_INFO'
        });
      }

      // No file size limit for CLI/API users (unlimited uploads)

      // Extract upload settings from the request body
      const uploadOptions = {
        preserveFilename: req.body.preserveFilename === 'true' || req.body.preserveFilename === true,
        optimize: req.body.optimize !== 'false' && req.body.optimize !== false,
        preserveExif: req.body.preserveExif === 'true' || req.body.preserveExif === true,
        generateThumbnails: req.body.generateThumbnails === 'true' || req.body.generateThumbnails === true,
      };

      const fileInfo = { filename, contentType, fileSize };
      const result = await storageService.getPresignedUrl(fileInfo, true, req.user.r2FolderName, uploadOptions);

      res.status(200).json({
        success: true,
        data: result,
        message: 'Presigned URL generated successfully'
      });

    } catch (error) {
      console.error('[API Presigned URL] Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate presigned URL',
        code: 'PRESIGNED_URL_ERROR'
      });
    }
  }
);

/**
 * POST /api/v1/files/complete-upload/:fileKey
 * Complete file upload after direct upload to storage
 */
router.post('/files/complete-upload/:fileKey',
  requirePermissions(['files.write']),
  async (req, res) => {
    try {
      const { fileKey: encodedFileKey } = req.params;
      
      if (!encodedFileKey) {
        return res.status(400).json({
          success: false,
          error: 'Missing file key',
          code: 'MISSING_FILE_KEY'
        });
      }

      const fileKey = decodeURIComponent(encodedFileKey);
      
      // Extract post-processing options
      const options = {
        generateThumbnails: req.body.generateThumbnails === 'true' || req.body.generateThumbnails === true,
        customName: req.body.customName,
        isPublic: req.body.isPublic === 'true' || req.body.isPublic === true,
        tags: req.body.tags ? (Array.isArray(req.body.tags) ? req.body.tags : [req.body.tags]) : []
      };

      const result = await storageService.completeDirectUpload(fileKey, true, options, req.user);

      res.status(201).json({
        success: true,
        data: result,
        message: 'Upload completed successfully'
      });

    } catch (error) {
      console.error('[API Complete Upload] Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to complete upload',
        code: 'COMPLETE_UPLOAD_ERROR'
      });
    }
  }
);

/**
 * GET /api/v1/files
 * List user's files with pagination and filtering
 */
router.get('/files', 
  requirePermissions(['files.read']),
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        fileType,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        isPublic
      } = req.query;

      // Validate pagination
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // Max 100 items per page
      const skip = (pageNum - 1) * limitNum;

      // Build where clause
      const where = {
        userId: req.user.id
      };

      if (search) {
        where.OR = [
          { originalName: { contains: search, mode: 'insensitive' } },
          { customName: { contains: search, mode: 'insensitive' } }
        ];
      }

      if (fileType) {
        where.fileType = fileType;
      }

      if (isPublic !== undefined) {
        where.isPublic = isPublic === 'true';
      }

      // Validate sort options
      const validSortFields = ['createdAt', 'originalName', 'fileSize', 'downloadCount'];
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
      const sortDirection = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';

      // Get files and total count
      const [files, totalCount] = await Promise.all([
        prisma.image.findMany({
          where,
          select: {
            id: true,
            originalName: true,
            customName: true,
            fileSize: true,
            fileType: true,
            isPublic: true,
            downloadCount: true,
            createdAt: true,
            updatedAt: true,
            url: true,
            thumbnailUrl: true,
            tags: true
          },
          orderBy: { [sortField]: sortDirection },
          skip,
          take: limitNum
        }),
        prisma.image.count({ where })
      ]);

      const totalPages = Math.ceil(totalCount / limitNum);

      res.json({
        success: true,
        data: {
          files,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: totalCount,
            totalPages,
            hasNext: pageNum < totalPages,
            hasPrev: pageNum > 1
          }
        }
      });

    } catch (error) {
      console.error('[API Files List] Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch files',
        code: 'FETCH_FILES_ERROR'
      });
    }
  }
);

/**
 * GET /api/v1/files/:fileId
 * Get file metadata
 */
router.get('/files/:fileId',
  requirePermissions(['files.read']),
  async (req, res) => {
    try {
      const { fileId } = req.params;

      const file = await prisma.image.findFirst({
        where: {
          id: fileId,
          userId: req.user.id
        },
        select: {
          id: true,
          originalName: true,
          customName: true,
          fileSize: true,
          fileType: true,
          isPublic: true,
          downloadCount: true,
          createdAt: true,
          updatedAt: true,
          url: true,
          thumbnailUrl: true,
          tags: true,
          metadata: true
        }
      });

      if (!file) {
        return res.status(404).json({
          success: false,
          error: 'File not found',
          code: 'FILE_NOT_FOUND'
        });
      }

      res.json({
        success: true,
        data: file
      });

    } catch (error) {
      console.error('[API File Details] Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch file details',
        code: 'FETCH_FILE_ERROR'
      });
    }
  }
);

/**
 * PUT /api/v1/files/:fileId
 * Update file metadata
 */
router.put('/files/:fileId',
  requirePermissions(['files.write']),
  async (req, res) => {
    try {
      const { fileId } = req.params;
      const { customName, isPublic, tags } = req.body;

      // Validate file ownership
      const existingFile = await prisma.image.findFirst({
        where: {
          id: fileId,
          userId: req.user.id
        }
      });

      if (!existingFile) {
        return res.status(404).json({
          success: false,
          error: 'File not found',
          code: 'FILE_NOT_FOUND'
        });
      }

      // Build update data
      const updateData = {};
      
      if (customName !== undefined) {
        if (typeof customName !== 'string') {
          return res.status(400).json({
            success: false,
            error: 'customName must be a string',
            code: 'INVALID_CUSTOM_NAME'
          });
        }
        updateData.customName = customName.trim() || null;
      }

      if (isPublic !== undefined) {
        if (typeof isPublic !== 'boolean') {
          return res.status(400).json({
            success: false,
            error: 'isPublic must be a boolean',
            code: 'INVALID_PUBLIC_FLAG'
          });
        }
        updateData.isPublic = isPublic;
      }

      if (tags !== undefined) {
        if (!Array.isArray(tags)) {
          return res.status(400).json({
            success: false,
            error: 'tags must be an array',
            code: 'INVALID_TAGS'
          });
        }
        updateData.tags = tags.filter(tag => typeof tag === 'string' && tag.trim().length > 0);
      }

      // Update the file
      const updatedFile = await prisma.image.update({
        where: { id: fileId },
        data: updateData,
        select: {
          id: true,
          originalName: true,
          customName: true,
          fileSize: true,
          fileType: true,
          isPublic: true,
          downloadCount: true,
          createdAt: true,
          updatedAt: true,
          url: true,
          thumbnailUrl: true,
          tags: true
        }
      });

      res.json({
        success: true,
        data: updatedFile,
        message: 'File updated successfully'
      });

    } catch (error) {
      console.error('[API File Update] Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update file',
        code: 'UPDATE_FILE_ERROR'
      });
    }
  }
);

/**
 * DELETE /api/v1/files/:fileId
 * Delete a file
 */
router.delete('/files/:fileId',
  requirePermissions(['files.delete']),
  async (req, res) => {
    try {
      const { fileId } = req.params;

      // Get file details for deletion
      const file = await prisma.image.findFirst({
        where: {
          id: fileId,
          userId: req.user.id
        }
      });

      if (!file) {
        return res.status(404).json({
          success: false,
          error: 'File not found',
          code: 'FILE_NOT_FOUND'
        });
      }

      // Delete from storage and database
      await storageService.deleteFile(file.r2Key);

      res.json({
        success: true,
        message: 'File deleted successfully'
      });

    } catch (error) {
      console.error('[API File Delete] Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete file',
        code: 'DELETE_FILE_ERROR'
      });
    }
  }
);

/**
 * POST /api/v1/files/multipart/initiate
 * Initiate multipart upload for large files
 */
router.post('/files/multipart/initiate',
  requirePermissions(['files.write']),
  async (req, res) => {
    try {
      const { filename, contentType, fileSize } = req.body;
      
      if (!filename || !contentType || !fileSize) {
        return res.status(400).json({
          success: false,
          error: 'Missing required file information (filename, contentType, fileSize)',
          code: 'MISSING_FILE_INFO'
        });
      }

      // Validate file size - 50GB limit for API users
      const maxSize = 50 * 1024 * 1024 * 1024; // 50GB
      if (fileSize > maxSize) {
        return res.status(400).json({
          success: false,
          error: `File size exceeds the limit of ${maxSize / (1024 * 1024 * 1024)}GB`,
          code: 'FILE_TOO_LARGE'
        });
      }

      const metadata = {
        'user-id': req.user.id,
        'file-size': fileSize.toString(),
        'is-api-upload': 'true'
      };

      const result = await storageService.initiateMultipartUpload(filename, contentType, metadata);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Multipart upload initiated successfully'
      });
    } catch (error) {
      console.error('[API Multipart Initiate] Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to initiate multipart upload',
        code: 'MULTIPART_INITIATE_ERROR'
      });
    }
  }
);

/**
 * POST /api/v1/files/multipart/part-url
 * Get presigned URL for uploading a specific part
 */
router.post('/files/multipart/part-url',
  requirePermissions(['files.write']),
  async (req, res) => {
    try {
      const { key, uploadId, partNumber } = req.body;
      
      if (!key || !uploadId || !partNumber) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters: key, uploadId, and partNumber',
          code: 'MISSING_PARAMETERS'
        });
      }

      // Validate part number (1-10000 as per S3 limits)
      if (partNumber < 1 || partNumber > 10000) {
        return res.status(400).json({
          success: false,
          error: 'Part number must be between 1 and 10000',
          code: 'INVALID_PART_NUMBER'
        });
      }

      const presignedUrl = await storageService.getUploadPartUrl(key, uploadId, parseInt(partNumber));
      
      res.status(200).json({
        success: true,
        data: {
          presignedUrl,
          partNumber: parseInt(partNumber)
        },
        message: 'Part upload URL generated successfully'
      });
    } catch (error) {
      console.error('[API Multipart Part URL] Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate part upload URL',
        code: 'PART_URL_ERROR'
      });
    }
  }
);

/**
 * POST /api/v1/files/multipart/complete
 * Complete multipart upload
 */
router.post('/files/multipart/complete',
  requirePermissions(['files.write']),
  async (req, res) => {
    try {
      const { key, uploadId, parts } = req.body;
      
      if (!key || !uploadId || !parts || !Array.isArray(parts)) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters: key, uploadId, and parts array',
          code: 'MISSING_PARAMETERS'
        });
      }

      // Validate parts array
      for (const part of parts) {
        if (!part.ETag || !part.PartNumber) {
          return res.status(400).json({
            success: false,
            error: 'Each part must have ETag and PartNumber',
            code: 'INVALID_PARTS'
          });
        }
      }

      // Sort parts by PartNumber to ensure correct order
      const sortedParts = parts.sort((a, b) => a.PartNumber - b.PartNumber);

      const result = await storageService.completeMultipartUpload(key, uploadId, sortedParts);
      
      // Extract post-processing options from the request body
      const options = {
        generateThumbnails: req.body.generateThumbnails === 'true' || req.body.generateThumbnails === true,
        customName: req.body.customName,
        isPublic: req.body.isPublic === 'true' || req.body.isPublic === true,
        tags: req.body.tags ? (Array.isArray(req.body.tags) ? req.body.tags : [req.body.tags]) : []
      };

      // Complete the upload processing
      const finalResult = await storageService.completeDirectUpload(key, true, options, req.user, true);
      
      res.status(200).json({
        success: true,
        data: finalResult,
        message: 'Multipart upload completed successfully'
      });
    } catch (error) {
      console.error('[API Multipart Complete] Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to complete multipart upload',
        code: 'MULTIPART_COMPLETE_ERROR'
      });
    }
  }
);

/**
 * POST /api/v1/files/multipart/abort
 * Abort multipart upload
 */
router.post('/files/multipart/abort',
  requirePermissions(['files.write']),
  async (req, res) => {
    try {
      const { key, uploadId } = req.body;
      
      if (!key || !uploadId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters: key and uploadId',
          code: 'MISSING_PARAMETERS'
        });
      }

      await storageService.abortMultipartUpload(key, uploadId);
      
      res.status(200).json({
        success: true,
        message: 'Multipart upload aborted successfully'
      });
    } catch (error) {
      console.error('[API Multipart Abort] Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to abort multipart upload',
        code: 'MULTIPART_ABORT_ERROR'
      });
    }
  }
);



/**
 * GET /api/v1/account/info
 * Get account information for the authenticated user
 */
router.get('/account/info',
  async (req, res) => {
    try {
      // Get user info with file statistics
      const [userInfo, fileStats] = await Promise.all([
        prisma.user.findUnique({
          where: { id: req.user.id },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true
          }
        }),
        prisma.image.aggregate({
          where: { userId: req.user.id },
          _count: { id: true },
          _sum: { fileSize: true }
        })
      ]);

      if (!userInfo) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      res.json({
        success: true,
        data: {
          user: userInfo,
          usage: {
            totalFiles: fileStats._count.id || 0,
            totalSize: fileStats._sum.fileSize || 0
          }
        }
      });

    } catch (error) {
      console.error('[API Account Info] Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch account information',
        code: 'ACCOUNT_INFO_ERROR'
      });
    }
  }
);

module.exports = router;