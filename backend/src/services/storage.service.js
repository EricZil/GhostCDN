const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { PutObjectCommand, HeadObjectCommand, PutObjectAclCommand, GetObjectCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand, ListPartsCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const sharp = require('sharp');
const path = require('path');
const { Readable } = require('stream');
const os = require('os');
const prisma = require('../lib/prisma');



// DigitalOcean Spaces configuration
const doSpacesConfig = {
  credentials: {
    accessKeyId: process.env.DO_SPACES_ACCESS_KEY_ID,
    secretAccessKey: process.env.DO_SPACES_SECRET_ACCESS_KEY,
  },
  // Use the standard DigitalOcean API endpoint format, not the CDN endpoint
  endpoint: `https://${process.env.DO_SPACES_REGION}.digitaloceanspaces.com`,
  region: process.env.DO_SPACES_REGION || 'fra1',
  forcePathStyle: false,
};

// Client instance - only DigitalOcean Spaces
const doSpacesClient = new S3Client(doSpacesConfig);

// Thumbnail size definitions
const THUMBNAIL_SIZES = {
  small: { width: 150, height: 150 },
  medium: { width: 400, height: 400 },
  large: { width: 800, height: 800 }
};

class StorageService {
  /**
   * Generate a presigned URL for direct upload to DigitalOcean Spaces
   * @param {Object} fileInfo - Information about the file to upload
   * @param {string} fileInfo.filename - Original filename
   * @param {string} fileInfo.contentType - File MIME type
   * @param {number} fileInfo.fileSize - File size in bytes
   * @param {boolean} isRegisteredUser - Whether the user is registered
   * @param {string} userFolderName - User's folder name (for registered users)
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} - Presigned URL and file details
   */
  async getPresignedUrl(fileInfo, isRegisteredUser = false, userFolderName = null, options = {}) {
    try {
      const { filename, contentType, fileSize } = fileInfo;
      const bucketName = process.env.DO_SPACES_BUCKET_NAME;
      
      // Generate a unique file key with proper folder structure
      const fileExtension = path.extname(filename).toLowerCase();
      const baseName = path.basename(filename, fileExtension);
      
      // Option to preserve original filename while ensuring uniqueness
      let finalFileName;
      if (options.preserveFilename === true) {
        // Preserve original filename with UUID prefix to ensure uniqueness
        const shortUuid = uuidv4().split('-')[0]; // Use first part of UUID for shorter names
        finalFileName = `${shortUuid}_${baseName}${fileExtension}`;
      } else {
        // Default behavior: UUID filename for maximum uniqueness
        finalFileName = `${uuidv4()}${fileExtension}`;
      }
      
      let fileKey;
      if (isRegisteredUser && userFolderName) {
        // Registered users: Registered/{userUUID}/{filename}
        fileKey = `Registered/${userFolderName}/${finalFileName}`;
      } else {
        // Guests: Guests/{filename}
        fileKey = `Guests/${finalFileName}`;
      }
      
      // Store upload options as metadata
      const metadata = {
        'original-filename': filename,
        'preserve-filename': options.preserveFilename === true ? 'true' : 'false',
        'optimize': options.optimize !== false ? 'true' : 'false',
        'preserve-exif': options.preserveExif === true ? 'true' : 'false',
        'generate-thumbnails': options.generateThumbnails === true ? 'true' : 'false',
        'user-type': isRegisteredUser ? 'registered' : 'guest',
      };
      
      if (userFolderName) {
        metadata['user-folder'] = userFolderName;
      }
      
      // Add Discord-friendly OpenGraph metadata for images and videos
      const isImage = contentType.startsWith('image/');
      const isVideo = contentType.startsWith('video/');
      
      if (isImage) {
        metadata['og:type'] = 'website';
        metadata['og:image'] = `${process.env.DO_SPACES_PUBLIC_URL}/${encodeURIComponent(fileKey)}`;
      } else if (isVideo) {
        metadata['og:type'] = 'video.other';
        metadata['og:video:url'] = `${process.env.DO_SPACES_PUBLIC_URL}/${encodeURIComponent(fileKey)}`;
        metadata['og:video:type'] = contentType;
      }
      
      // Create the command for putting an object
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
        ContentType: contentType,
        ACL: 'public-read',
        Metadata: metadata,
      });
      
      // Generate the presigned URL with a 15-minute expiration
      const presignedUrl = await getSignedUrl(doSpacesClient, command, { expiresIn: 900 });
      
      // URL encode the filename for use in URLs
      const encodedFileKey = encodeURIComponent(fileKey);
      
      // Generate public URL for after the upload is complete
      const cdnUrl = `${process.env.DO_SPACES_PUBLIC_URL}/${encodedFileKey}`;
      
      return {
        presignedUrl,
        fileKey,
        cdnUrl,
        provider: 'digitalocean-spaces',
        contentType,
        uploadMethod: 'presigned',
      };
    } catch (error) {
      console.error('Error generating presigned URL:', error);
      throw error;
    }
  }
  
  /**
   * Set an object's ACL to public-read
   * @param {string} fileKey - The key of the file
   * @returns {Promise<void>}
   */
  async setObjectPublic(fileKey) {
    try {
      const bucketName = process.env.DO_SPACES_BUCKET_NAME;
      
      const command = new PutObjectAclCommand({
        Bucket: bucketName,
        Key: fileKey,
        ACL: 'public-read'
      });
      
      await doSpacesClient.send(command);
      console.log(`Successfully set ${fileKey} to public-read`);
    } catch (error) {
      console.error(`Error setting ACL for ${fileKey}:`, error);
      throw error;
    }
  }
  
  /**
   * Process an image based on upload options
   * @param {Buffer} imageBuffer - The image data
   * @param {string} fileKey - The key of the file
   * @param {Object} options - Processing options
   * @returns {Promise<Buffer>} - Processed image buffer
   */
  async processImage(imageBuffer, fileKey, options = {}) {
    try {
      const fileExtension = path.extname(fileKey).toLowerCase();
      let image = sharp(imageBuffer);
      
      // Get image metadata
      const metadata = await image.metadata();
      
      // Only process if optimize is enabled
      if (options.optimize) {
        // Determine output format based on input
        let outputOptions = {};
        
        switch (fileExtension) {
          case '.jpg':
          case '.jpeg':
            outputOptions = { 
              quality: 82,
              progressive: true,
              mozjpeg: true,
              optimiseScans: true
            };
            break;
          case '.png':
            outputOptions = { 
              quality: 80,
              compressionLevel: 6, // Balanced speed vs compression (was 9)
              palette: false, // Faster than palette optimization
              effort: 7 // Balanced effort level
            };
            break;
          case '.webp':
            outputOptions = { 
              quality: 82,
              effort: 4, // Faster than 6, still good quality
              lossless: false
            };
            break;
          case '.gif':
            // GIF optimization is limited in sharp
            break;
          default:
            // Use default settings for other formats
            outputOptions = { quality: 82 };
        }
        
        // If preserveExif is false, strip metadata
        if (!options.preserveExif) {
          // Pass empty object instead of false
          image = image.withMetadata({});
        } else {
          // Keep original metadata
          image = image.withMetadata();
        }
        
        // Apply format-specific optimizations
        if (fileExtension === '.jpg' || fileExtension === '.jpeg') {
          image = image.jpeg(outputOptions);
        } else if (fileExtension === '.png') {
          image = image.png(outputOptions);
        } else if (fileExtension === '.webp') {
          image = image.webp(outputOptions);
        }
      }
      
      // Return the processed buffer
      return await image.toBuffer();
    } catch (error) {
      console.error('Error processing image:', error);
      // Return original buffer if processing fails
      return imageBuffer;
    }
  }
  
  /**
   * Generate thumbnails for an image
   * @param {Buffer} imageBuffer - The image data
   * @param {string} fileKey - The key of the original file
   * @returns {Promise<Object>} - Thumbnail URLs
   */
  async generateThumbnails(imageBuffer, fileKey) {
    try {
      const bucketName = process.env.DO_SPACES_BUCKET_NAME;
      
      // Determine thumbnail folder based on file location
      let thumbnailBasePath;
      if (fileKey.startsWith('Guests/')) {
        // For guests: Guests/Thumbnails/{filename}
        thumbnailBasePath = 'Guests/Thumbnails/';
      } else if (fileKey.startsWith('Registered/')) {
        // For registered users: Registered/{userUUID}/Thumbnails/{filename}
        const pathParts = fileKey.split('/');
        const userFolder = pathParts[1]; // Get the user UUID
        thumbnailBasePath = `Registered/${userFolder}/Thumbnails/`;
      } else {
        throw new Error('Invalid file path structure');
      }
      
      // Get the base filename without path and extension
      const originalFileName = path.basename(fileKey);
      const baseName = originalFileName.substring(0, originalFileName.lastIndexOf('.'));
      
      // For better compatibility and smaller size, convert all thumbnails to WebP
      const thumbnailExtension = '.webp';
      const thumbnailContentType = 'image/webp';
      
      const thumbnailUrls = {};
      const image = sharp(imageBuffer);
      
      // Generate thumbnails for each size in parallel
      const thumbnailPromises = Object.entries(THUMBNAIL_SIZES).map(async ([size, dimensions]) => {
        try {
          // Create thumbnail key
          const thumbnailKey = `${thumbnailBasePath}${baseName}_${size}${thumbnailExtension}`;
          
          // Resize image while maintaining aspect ratio and not enlarging
          const thumbnailBuffer = await image
            .clone()
            .resize({
              width: dimensions.width,
              height: dimensions.height,
              fit: 'inside',
              withoutEnlargement: true,
              kernel: 'lanczos3' // Better quality for thumbnails
            })
            .webp({ 
              quality: 85, // Slightly higher quality for thumbnails
              effort: 3,   // Faster processing
              smartSubsample: true
            })
            .toBuffer();
                
          // Upload thumbnail
          const putCommand = new PutObjectCommand({
            Bucket: bucketName,
            Key: thumbnailKey,
            Body: thumbnailBuffer,
            ContentType: thumbnailContentType,
            ACL: 'public-read',
          });
          
          await doSpacesClient.send(putCommand);
          
          // URL encode the thumbnail key for use in URLs
          const encodedThumbnailKey = encodeURIComponent(thumbnailKey);
          
          // Generate public URL for the thumbnail
          const thumbnailUrl = `${process.env.DO_SPACES_PUBLIC_URL}/${encodedThumbnailKey}`;
          
          console.log(`Generated ${size} thumbnail for ${fileKey}`);
          return { size, url: thumbnailUrl };
        } catch (err) {
          console.error(`Error generating ${size} thumbnail:`, err);
          return null;
        }
      });

      // Wait for all thumbnails to complete
      const thumbnailResults = await Promise.all(thumbnailPromises);
      
      // Build thumbnailUrls object from successful results
      for (const result of thumbnailResults) {
        if (result) {
          thumbnailUrls[result.size] = result.url;
        }
      }
      
      return Object.keys(thumbnailUrls).length > 0 ? thumbnailUrls : null;
    } catch (error) {
      console.error('Error generating thumbnails:', error);
      return null;
    }
  }
  
  /**
   * Complete a direct upload after file has been uploaded to DigitalOcean Spaces
   * @param {string} fileKey - The key of the uploaded file
   * @param {boolean} isRegisteredUser - Whether the user is registered
   * @param {Object} options - Processing options
   * @param {Object} user - User object (optional)
   * @param {boolean} isCliUpload - Whether this is a CLI upload
   * @returns {Promise<Object>} - File details
   */
  async completeDirectUpload(fileKey, isRegisteredUser = false, options = {}, user = null, isCliUpload = false) {
    try {
      const bucketName = process.env.DO_SPACES_BUCKET_NAME;
      
      // Get object details to verify upload
      const headCommand = new HeadObjectCommand({
        Bucket: bucketName,
        Key: fileKey
      });
      
      let objectDetails;
      try {
        objectDetails = await doSpacesClient.send(headCommand);
      } catch (error) {
        console.error('File not found in storage:', error);
        throw new Error('File not found in storage. Upload may have failed.');
      }
      
      // Extract metadata from the object
      const metadata = objectDetails.Metadata || {};
      const contentType = objectDetails.ContentType;
      const originalFilename = metadata['original-filename'] || path.basename(fileKey);
      const fileSize = objectDetails.ContentLength || 0;
      
      // Base public URL
      const fileUrl = `${process.env.DO_SPACES_PUBLIC_URL}/${encodeURIComponent(fileKey)}`;
      
      // Process thumbnails if enabled
      let thumbnailsObj = {};
      let width = null;
      let height = null;
      
      // Check if this is an image that can be processed
      const isImage = contentType && contentType.startsWith('image/') && 
        !contentType.includes('svg') && !contentType.includes('gif');
      
      // Generate thumbnails if requested and possible
      if (options.generateThumbnails && isImage) {
        try {
          // Download the image for thumbnail generation
          const getCommand = new GetObjectCommand({
            Bucket: bucketName,
            Key: fileKey
          });
          
          const response = await doSpacesClient.send(getCommand);
          const imageBuffer = await streamToBuffer(response.Body);
          
          // Get image dimensions
          const imageInfo = await sharp(imageBuffer).metadata();
          width = imageInfo.width;
          height = imageInfo.height;
          
          // Generate the thumbnails
          thumbnailsObj = await this.generateThumbnails(imageBuffer, fileKey) || {};
        } catch (thumbnailError) {
          console.error('Error generating thumbnails:', thumbnailError);
          // Continue even if thumbnail generation fails
        }
      }

      // This ACL type is explicitly typed, specify the exact string literal from AWS SDK
      const uploadParams = {
        Bucket: bucketName,
        Key: fileKey,
        Body: "placeholder", // Not used for this operation
        ContentType: contentType,
        // ACL removed as it's causing type errors with PutObjectCommandInput
        Metadata: {
          'cache-control': 'public, max-age=31536000',
          'original-filename': originalFilename
        }
      };

      // Set the object to public-read after upload completion
      try {
        await this.setObjectPublic(fileKey);
        console.log(`Successfully set ${fileKey} to public-read`);
      } catch (error) {
        console.error('Error setting object to public-read:', error);
        // Continue even if ACL update fails
      }
      
      // Record the file upload in database if possible
      try {
        if (isRegisteredUser) {
          // For registered users, use the Image table
          let userId = null;
          if (user && user.id) {
            userId = user.id;
          } else {
            // Extract user folder from path: Registered/{userFolder}/filename
            const pathParts = fileKey.split('/');
            if (pathParts.length >= 3 && pathParts[0] === 'Registered') {
              // Try to find user by folder name
              const userFolder = pathParts[1];
              const foundUser = await prisma.user.findFirst({
                where: { r2FolderName: userFolder }
              });
              userId = foundUser?.id || null;
            }
          }
          
          if (userId) {
            const fileRecord = await prisma.image.create({
              data: {
                fileName: originalFilename,
                fileKey: fileKey,
                fileSize: fileSize,
                fileType: contentType,
                uploadedAt: new Date(),
                width: width || null,
                height: height || null,
                uploadSource: isCliUpload ? 'cli' : 'web',
                hasThumbnails: Object.keys(thumbnailsObj).length > 0,
                user: {
                  connect: { id: userId }
                }
              },
            });
            console.log(`Registered user file recorded in database: ${fileRecord.id}`);
          } else {
            console.warn('Could not find user for registered upload, skipping database record');
          }
        } else {
          // For guest uploads, use the GuestUpload table
          const guestRecord = await prisma.guestUpload.create({
            data: {
              fileName: originalFilename,
              fileKey: fileKey,
              fileSize: fileSize,
              fileType: contentType,
              mimeType: contentType,
              width: width || null,
              height: height || null,
              uploadedAt: new Date(),
              expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
              isDeleted: false,
              uploadSource: isCliUpload ? 'cli' : 'web',
              hasThumbnails: Object.keys(thumbnailsObj).length > 0
            },
          });
          console.log(`Guest file recorded in database: ${guestRecord.id}`);
        }
      } catch (dbError) {
        console.error('Error recording file in database:', dbError);
        // Continue even if database recording fails
      }
      
      // Return the file details
      return {
        key: fileKey,
        url: fileUrl,
        contentType: contentType,
        originalFilename: originalFilename,
        thumbnails: Object.keys(thumbnailsObj).length > 0 ? thumbnailsObj : null,
        provider: 'digitalocean-spaces',
        width,
        height,
      };
    } catch (error) {
      console.error('Error completing direct upload:', error);
      throw error;
    }
  }
  
  /**
   * Get a file stream from storage
   * @param {string} fileKey - The key of the file to stream
   * @returns {Promise<any>} - File stream
   */
  async getFileStream(fileKey) {
    try {
      const bucketName = process.env.DO_SPACES_BUCKET_NAME;
      
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
      });
      
      const response = await doSpacesClient.send(command);
      return response.Body;
    } catch (error) {
      console.error(`Error getting file stream for ${fileKey}:`, error);
      throw error;
    }
  }

  /**
   * Delete a file from storage
   * @param {string} fileKey - The key of the file to delete
   * @returns {Promise<void>}
   */
  async deleteFile(fileKey) {
    try {
      const bucketName = process.env.DO_SPACES_BUCKET_NAME;
      
      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
      });
      
      await doSpacesClient.send(command);
      console.log(`Successfully deleted file: ${fileKey}`);
    } catch (error) {
      // If file doesn't exist, that's okay - it might have been manually deleted
      if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
        console.log(`File not found in storage (already deleted?): ${fileKey}`);
        return;
      }
      console.error(`Error deleting file ${fileKey}:`, error);
      throw error;
    }
  }

  /**
   * Delete thumbnails associated with a file
   * @param {string} fileKey - The key of the original file
   * @returns {Promise<void>}
   */
  async deleteThumbnailsFromStorage(fileKey) {
    try {
      // Determine thumbnail folder based on file location
      let thumbnailBasePath;
      if (fileKey.startsWith('Guests/')) {
        thumbnailBasePath = 'Guests/Thumbnails/';
      } else if (fileKey.startsWith('Registered/')) {
        const pathParts = fileKey.split('/');
        const userFolder = pathParts[1];
        thumbnailBasePath = `Registered/${userFolder}/Thumbnails/`;
      } else {
        return; // Unknown path structure
      }
      
      // Get the base filename without path and extension
      const originalFileName = path.basename(fileKey);
      const baseName = originalFileName.substring(0, originalFileName.lastIndexOf('.'));
      
      // Delete thumbnails for each size
      const thumbnailSizes = ['small', 'medium', 'large'];
      const thumbnailExtension = '.webp';
      
      for (const size of thumbnailSizes) {
        try {
          const currentThumbnailKey = `${thumbnailBasePath}${baseName}_${size}${thumbnailExtension}`;
          await this.deleteFile(currentThumbnailKey);
        } catch (error) {
          // Continue if thumbnail doesn't exist
          console.log(`Thumbnail not found or already deleted: ${thumbnailBasePath}${baseName}_${size}${thumbnailExtension}`);
        }
      }
    } catch (error) {
      console.error(`Error deleting thumbnails for ${fileKey}:`, error);
      // Don't throw - main file deletion is more important
    }
  }
  
  /**
   * Create a user folder in DigitalOcean Spaces
   * @param {string} folderName - The name of the folder to create (user UUID)
   * @returns {Promise<boolean>} - Success status
   */
  async createUserFolder(folderName) {
    try {
      const bucketName = process.env.DO_SPACES_BUCKET_NAME;
      
      // Create the main user folder: Registered/{userUUID}/
      const userFolderCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: `Registered/${folderName}/.folder`,
        Body: '',
        ContentType: 'application/x-directory',
      });
      
      await doSpacesClient.send(userFolderCommand);
      
      // Create the thumbnails subfolder: Registered/{userUUID}/Thumbnails/
      const thumbnailFolderCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: `Registered/${folderName}/Thumbnails/.folder`,
        Body: '',
        ContentType: 'application/x-directory',
      });
      
      await doSpacesClient.send(thumbnailFolderCommand);
      
      console.log(`Created user folder structure for: ${folderName}`);
      return true;
    } catch (error) {
      console.error(`Error creating user folder for ${folderName}:`, error);
      throw error;
    }
  }
  
  /**
   * Initialize the basic folder structure if it doesn't exist
   * @returns {Promise<void>}
   */
  async initializeFolderStructure() {
    try {
      const bucketName = process.env.DO_SPACES_BUCKET_NAME;
      
      // Create Guests folder
      const guestsFolderCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: 'Guests/.folder',
        Body: '',
        ContentType: 'application/x-directory',
      });
      
      await doSpacesClient.send(guestsFolderCommand);
      
      // Create Guests/Thumbnails folder
      const guestsThumbnailsCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: 'Guests/Thumbnails/.folder',
        Body: '',
        ContentType: 'application/x-directory',
      });
      
      await doSpacesClient.send(guestsThumbnailsCommand);
      
      // Create Registered folder
      const registeredFolderCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: 'Registered/.folder',
        Body: '',
        ContentType: 'application/x-directory',
      });
      
      await doSpacesClient.send(registeredFolderCommand);
      
      console.log('Initialized basic folder structure');
    } catch (error) {
      console.error('Error initializing folder structure:', error);
      // Don't throw error as folders might already exist
    }
  }

  /**
   * Initiate multipart upload
   * @param {string} fileName - Original file name
   * @param {string} contentType - File content type
   * @param {object} metadata - Additional metadata
   * @returns {Promise<object>} Upload details
   */
  async initiateMultipartUpload(fileName, contentType, metadata = {}) {
    try {
      const bucketName = process.env.DO_SPACES_BUCKET_NAME;
      const key = this.generateFileKey(fileName);
      
      const command = new CreateMultipartUploadCommand({
        Bucket: bucketName,
        Key: key,
        ContentType: contentType,
        ACL: 'public-read',
        Metadata: {
          'original-name': fileName,
          'upload-timestamp': new Date().toISOString(),
          ...metadata
        }
      });

      const response = await doSpacesClient.send(command);
      
      return {
        uploadId: response.UploadId,
        key: key,
        bucket: bucketName
      };
    } catch (error) {
      console.error('Error initiating multipart upload:', error);
      throw new Error('Failed to initiate multipart upload');
    }
  }

  /**
   * Get presigned URL for uploading a part
   * @param {string} key - File key
   * @param {string} uploadId - Upload ID
   * @param {number} partNumber - Part number
   * @returns {Promise<string>} Presigned URL
   */
  async getUploadPartUrl(key, uploadId, partNumber) {
    try {
      const bucketName = process.env.DO_SPACES_BUCKET_NAME;
      
      const command = new UploadPartCommand({
        Bucket: bucketName,
        Key: key,
        UploadId: uploadId,
        PartNumber: partNumber
      });

      const presignedUrl = await getSignedUrl(doSpacesClient, command, {
        expiresIn: 3600 // 1 hour
      });

      return presignedUrl;
    } catch (error) {
      console.error('Error generating upload part URL:', error);
      throw new Error('Failed to generate upload part URL');
    }
  }

  /**
   * Complete multipart upload
   * @param {string} key - File key
   * @param {string} uploadId - Upload ID
   * @param {Array} parts - Array of uploaded parts
   * @returns {Promise<object>} Upload result
   */
  async completeMultipartUpload(key, uploadId, parts) {
    try {
      const bucketName = process.env.DO_SPACES_BUCKET_NAME;
      
      const command = new CompleteMultipartUploadCommand({
        Bucket: bucketName,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: parts.map(part => ({
            ETag: part.ETag,
            PartNumber: part.PartNumber
          }))
        }
      });

      const response = await doSpacesClient.send(command);
      
      return {
        location: response.Location,
        bucket: response.Bucket,
        key: response.Key,
        etag: response.ETag
      };
    } catch (error) {
      console.error('Error completing multipart upload:', error);
      throw new Error('Failed to complete multipart upload');
    }
  }

  /**
   * Abort multipart upload
   * @param {string} key - File key
   * @param {string} uploadId - Upload ID
   * @returns {Promise<boolean>} Success status
   */
  async abortMultipartUpload(key, uploadId) {
    try {
      const bucketName = process.env.DO_SPACES_BUCKET_NAME;
      
      const command = new AbortMultipartUploadCommand({
        Bucket: bucketName,
        Key: key,
        UploadId: uploadId
      });

      await doSpacesClient.send(command);
      return true;
    } catch (error) {
      console.error('Error aborting multipart upload:', error);
      throw new Error('Failed to abort multipart upload');
    }
  }

  /**
   * List uploaded parts
   * @param {string} key - File key
   * @param {string} uploadId - Upload ID
   * @returns {Promise<Array>} List of parts
   */
  async listUploadParts(key, uploadId) {
    try {
      const bucketName = process.env.DO_SPACES_BUCKET_NAME;
      
      const command = new ListPartsCommand({
        Bucket: bucketName,
        Key: key,
        UploadId: uploadId
      });

      const response = await doSpacesClient.send(command);
      return response.Parts || [];
    } catch (error) {
      console.error('Error listing upload parts:', error);
      throw new Error('Failed to list upload parts');
    }
  }

  /**
   * Generate file key for guest uploads
   * @param {string} fileName - Original file name
   * @returns {string} Generated file key
   */
  generateFileKey(fileName) {
    const fileExtension = path.extname(fileName).toLowerCase();
    const finalFileName = `${uuidv4()}${fileExtension}`;
    return `Guests/${finalFileName}`;
  }
}

// Helper function to convert stream to buffer
async function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

module.exports = new StorageService();