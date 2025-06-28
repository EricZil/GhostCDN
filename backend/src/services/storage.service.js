const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { PutObjectCommand, HeadObjectCommand, PutObjectAclCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
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
      const uniqueFileName = `${uuidv4()}${fileExtension}`;
      
      let fileKey;
      if (isRegisteredUser && userFolderName) {
        // Registered users: Registered/{userUUID}/{filename}
        fileKey = `Registered/${userFolderName}/${uniqueFileName}`;
      } else {
        // Guests: Guests/{filename}
        fileKey = `Guests/${uniqueFileName}`;
      }
      
      // Store upload options as metadata
      const metadata = {
        'original-filename': filename,
        'optimize': options.optimize !== false ? 'true' : 'false',
        'preserve-exif': options.preserveExif === true ? 'true' : 'false',
        'generate-thumbnails': options.generateThumbnails === true ? 'true' : 'false',
        'user-type': isRegisteredUser ? 'registered' : 'guest',
      };
      
      if (userFolderName) {
        metadata['user-folder'] = userFolderName;
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
              quality: 80,
              mozjpeg: true
            };
            break;
          case '.png':
            outputOptions = { 
              quality: 75,
              compressionLevel: 9,
              palette: true
            };
            break;
          case '.webp':
            outputOptions = { 
              quality: 80,
              effort: 6
            };
            break;
          case '.gif':
            // GIF optimization is limited in sharp
            break;
          default:
            // Use default settings for other formats
            outputOptions = { quality: 80 };
        }
        
        // If preserveExif is false, strip metadata
        if (!options.preserveExif) {
          image = image.withMetadata(false);
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
      
      // Generate thumbnails for each size
      for (const [size, dimensions] of Object.entries(THUMBNAIL_SIZES)) {
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
              withoutEnlargement: true
            })
            .webp({ quality: 80 })
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
          thumbnailUrls[size] = `${process.env.DO_SPACES_PUBLIC_URL}/${encodedThumbnailKey}`;
          
          console.log(`Generated ${size} thumbnail for ${fileKey}`);
        } catch (err) {
          console.error(`Error generating ${size} thumbnail:`, err);
        }
      }
      
      return Object.keys(thumbnailUrls).length > 0 ? thumbnailUrls : null;
    } catch (error) {
      console.error('Error generating thumbnails:', error);
      return null;
    }
  }
  
  /**
   * Complete a direct upload - perform any post-processing needed and save to database
   * @param {string} fileKey - The key of the uploaded file
   * @param {Object} options - Post-processing options
   * @returns {Promise<Object>} - Result with file URLs
   */
  async completeDirectUpload(fileKey, options = {}) {
    try {
      const bucketName = process.env.DO_SPACES_BUCKET_NAME;
      
      // Check if the file exists and get its metadata
      const headCommand = new HeadObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
      });
      
      let fileMetadata;
      try {
        fileMetadata = await doSpacesClient.send(headCommand);
      } catch (error) {
        throw new Error(`File not found: ${fileKey}`);
      }
      
      // Ensure the file is publicly accessible
      await this.setObjectPublic(fileKey);
      
      // Get processing options from metadata or use provided options
      const metadata = fileMetadata.Metadata || {};
      const processingOptions = {
        optimize: metadata['optimize'] === 'true' || options.optimize === true,
        preserveExif: metadata['preserve-exif'] === 'true' || options.preserveExif === true,
        generateThumbnails: metadata['generate-thumbnails'] === 'true' || options.generateThumbnails === true,
      };
      
      // Check if this is an image that needs processing
      const fileExtension = path.extname(fileKey).toLowerCase();
      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileExtension);
      
      // Download the file for processing (needed for both optimization and thumbnails)
      let imageBuffer = null;
      if (isImage && (processingOptions.optimize || processingOptions.generateThumbnails)) {
        const getCommand = new GetObjectCommand({
          Bucket: bucketName,
          Key: fileKey,
        });
        
        const response = await doSpacesClient.send(getCommand);
        imageBuffer = await streamToBuffer(response.Body);
      }
      
      let processedFileKey = fileKey;
      let thumbnails = null;
      
      // Process image if optimization is enabled
      if (isImage && imageBuffer && processingOptions.optimize) {
        try {
          const processedBuffer = await this.processImage(imageBuffer, fileKey, processingOptions);
          
          // Re-upload the processed image
          const putCommand = new PutObjectCommand({
            Bucket: bucketName,
            Key: fileKey,
            Body: processedBuffer,
            ContentType: fileMetadata.ContentType,
            ACL: 'public-read',
            Metadata: metadata,
          });
          
          await doSpacesClient.send(putCommand);
          console.log(`Optimized image: ${fileKey}`);
        } catch (error) {
          console.error('Error optimizing image:', error);
          // Continue without optimization
        }
      }
      
      // Generate thumbnails if requested
      if (isImage && imageBuffer && processingOptions.generateThumbnails) {
        thumbnails = await this.generateThumbnails(imageBuffer, fileKey);
      }
      
      // Generate final URLs
      const encodedFileKey = encodeURIComponent(processedFileKey);
      const cdnUrl = `${process.env.DO_SPACES_PUBLIC_URL}/${encodedFileKey}`;
      
      // Save to database - handle both registered users and guests
      let dbRecord = null;
      try {
        // Get image dimensions if it's an image
        let width = null;
        let height = null;
        if (isImage && imageBuffer) {
          try {
            const imageMetadata = await sharp(imageBuffer).metadata();
            width = imageMetadata.width || null;
            height = imageMetadata.height || null;
          } catch (err) {
            console.warn('Could not get image dimensions:', err.message);
          }
        }
        
        if (metadata['user-type'] === 'registered' && metadata['user-folder']) {
          // Handle registered user uploads
          const userFolderName = metadata['user-folder'];
          const user = await prisma.user.findFirst({
            where: { r2FolderName: userFolderName }
          });
          
          if (user) {
            // Save the upload to the database
            dbRecord = await prisma.image.create({
              data: {
                userId: user.id,
                fileName: metadata['original-filename'] || path.basename(fileKey),
                fileKey: processedFileKey,
                fileSize: fileMetadata.ContentLength || 0,
                fileType: fileExtension.replace('.', '').toUpperCase(),
                mimeType: fileMetadata.ContentType,
                width,
                height,
                uploadedAt: new Date(),
              }
            });
            
            // Log the upload activity
            await prisma.activity.create({
              data: {
                userId: user.id,
                type: 'UPLOAD',
                message: `Uploaded file: ${metadata['original-filename'] || path.basename(fileKey)}`,
                metadata: {
                  fileKey: processedFileKey,
                  fileSize: fileMetadata.ContentLength || 0,
                  fileType: fileExtension.replace('.', '').toUpperCase(),
                  processed: isImage && processingOptions.optimize,
                  thumbnails: thumbnails ? Object.keys(thumbnails) : null
                }
              }
            });
            
            console.log(`Saved upload record to database for user ${user.email}: ${processedFileKey}`);
          } else {
            console.warn(`User not found for folder: ${userFolderName}`);
          }
        } else if (metadata['user-type'] === 'guest') {
          // Handle guest uploads - track for automatic cleanup
          const now = new Date();
          const expiresAt = new Date(now.getTime() + (14 * 24 * 60 * 60 * 1000)); // 14 days from now
          
          dbRecord = await prisma.guestUpload.create({
            data: {
              fileKey: processedFileKey,
              fileName: metadata['original-filename'] || path.basename(fileKey),
              fileSize: fileMetadata.ContentLength || 0,
              fileType: fileExtension.replace('.', '').toUpperCase(),
              mimeType: fileMetadata.ContentType,
              width,
              height,
              uploadedAt: now,
              expiresAt: expiresAt,
              // IP address and user agent tracking can be added when needed
            }
          });
          
          console.log(`Saved guest upload record to database: ${processedFileKey} (expires: ${expiresAt.toISOString()})`);
        }
      } catch (dbError) {
        console.error('Error saving to database:', dbError);
        // Don't throw error - file upload was successful even if DB save failed
      }
      
      return {
        success: true,
        url: cdnUrl,
        key: processedFileKey,
        provider: 'digitalocean-spaces',
        thumbnails,
        processed: isImage && processingOptions.optimize,
        optimized: isImage && processingOptions.optimize,
        dbRecord: dbRecord ? { id: dbRecord.id, fileName: dbRecord.fileName } : null,
      };
    } catch (error) {
      console.error('Error completing upload:', error);
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
      console.error(`Error deleting file ${fileKey}:`, error);
      throw error;
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