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
   * Complete a direct upload to DigitalOcean Spaces
   * @param {string} fileKey - The key of the file
   * @param {boolean} isRegisteredUser - Whether the user is registered
   * @param {Object} options - Post-processing options
   * @returns {Promise<Object>} - File details after completion
   */
  async completeDirectUpload(fileKey, isRegisteredUser = false, options = {}) {
    try {
      const bucketName = process.env.DO_SPACES_BUCKET_NAME;
      
      // Check if the file exists and get metadata
      const headObjectParams = {
        Bucket: bucketName,
        Key: fileKey,
      };
      
      const headObjectCommand = new HeadObjectCommand(headObjectParams);
      const objectMetadata = await doSpacesClient.send(headObjectCommand);
      
      // Extract original options from metadata
      const metadata = objectMetadata.Metadata || {};
      const contentType = objectMetadata.ContentType || 'application/octet-stream';
      const originalFilename = metadata['original-filename'] || fileKey.split('/').pop();
      
      // Default options with fallbacks
      const processingOptions = {
        optimize: metadata.optimize === 'true', 
        preserveExif: metadata['preserve-exif'] === 'true',
        generateThumbnails: metadata['generate-thumbnails'] === 'true' || options.generateThumbnails === true,
      };
      
      console.log(`Completing upload for ${fileKey}, content type: ${contentType}`);
      
      let fileUrl = `${process.env.DO_SPACES_PUBLIC_URL}/${encodeURIComponent(fileKey)}`;
      const thumbnails = {};
      
      // Check if this is an image file that can be processed
      const isImage = contentType.startsWith('image/');
      const isVideo = contentType.startsWith('video/');
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
      const fileExtension = path.extname(fileKey).toLowerCase();
      const canProcessImage = isImage && imageExtensions.includes(fileExtension);
      
      // Enhanced metadata for Discord embedding
      const enhancedMetadata = {...metadata};
      let width, height;
      
      // Only process images, skip for other file types
      if (canProcessImage && (processingOptions.optimize || processingOptions.generateThumbnails)) {
        console.log('Processing image:', fileKey);
        // Get the image file
        const getObjectCommand = new GetObjectCommand({
          Bucket: bucketName,
          Key: fileKey,
        });
        
        const { Body } = await doSpacesClient.send(getObjectCommand);
        const imageBuffer = await streamToBuffer(Body);
        
        // Add OpenGraph metadata for Discord embedding
        if (isImage) {
          console.log('Processing image:', fileKey);
          try {
            // For images, add width and height to metadata for Discord embedding
            const imageInfo = await sharp(imageBuffer).metadata();
            width = imageInfo.width;
            height = imageInfo.height;
            
            // Use proper HTTP header format (hyphens instead of colons)
            enhancedMetadata['og-type'] = 'image';
            enhancedMetadata['og-image'] = fileUrl;
            enhancedMetadata['og-image-width'] = String(width);
            enhancedMetadata['og-image-height'] = String(height);
            
            // Re-upload with enhanced metadata
            const uploadParams = {
              Bucket: bucketName,
              Key: fileKey,
              Body: imageBuffer,
              ContentType: contentType,
              ACL: 'public-read',
              Metadata: enhancedMetadata,
            };
            
            const upload = new Upload({
              client: doSpacesClient,
              params: uploadParams,
            });
            
            await upload.done();
            console.log('Image optimized and re-uploaded with Discord metadata:', fileKey);
          } catch (error) {
            console.error('Error optimizing image:', error);
            // Continue with original image if optimization fails
          }
        } else {
          // If not optimizing, still update metadata for Discord embedding
          try {
            const putObjectCommand = new PutObjectCommand({
              Bucket: bucketName,
              Key: fileKey,
              Body: imageBuffer,
              ContentType: contentType,
              ACL: 'public-read',
              Metadata: enhancedMetadata,
            });
            
            await doSpacesClient.send(putObjectCommand);
            console.log('Updated image metadata for Discord embedding:', fileKey);
          } catch (error) {
            console.error('Error updating image metadata:', error);
          }
        }
        
        // Generate thumbnails if requested
        if (processingOptions.generateThumbnails) {
          try {
            thumbnails = await this.generateThumbnails(imageBuffer, fileKey);
          } catch (error) {
            console.error('Error generating thumbnails:', error);
          }
        }
      } else if (isVideo) {
        // For videos, we can't easily get dimensions, but we can still add OpenGraph metadata
        enhancedMetadata['og-type'] = 'video.other';
        enhancedMetadata['og-video'] = fileUrl;
        enhancedMetadata['og-video-type'] = contentType;
        
        try {
          const getObjectCommand = new GetObjectCommand({
            Bucket: bucketName,
            Key: fileKey,
          });
          
          const { Body } = await doSpacesClient.send(getObjectCommand);
          const videoBuffer = await streamToBuffer(Body);
          
          // Re-upload with enhanced metadata
          const putObjectCommand = new PutObjectCommand({
            Bucket: bucketName,
            Key: fileKey,
            Body: videoBuffer,
            ContentType: contentType,
            ACL: 'public-read',
            Metadata: enhancedMetadata,
          });
          
          await doSpacesClient.send(putObjectCommand);
          console.log('Updated video metadata for Discord embedding:', fileKey);
        } catch (error) {
          console.error('Error updating video metadata:', error);
        }
      } else {
        console.log(`Skipping image processing for non-image file or unsupported format: ${contentType}, ${fileKey}`);
      }
      
      // Ensure the file has public-read permissions, regardless of file type
      try {
        await this.setObjectPublic(fileKey);
        console.log(`Ensured public access for ${fileKey}`);
      } catch (aclError) {
        console.error(`Failed to set public access for ${fileKey}:`, aclError);
        // Continue even if setting ACL fails
      }
      
      // Record the upload in database (if set up)
      try {
        // Extract file size from metadata
        const contentLength = objectMetadata.ContentLength || 0;
        const userType = isRegisteredUser ? 'registered' : 'guest';
        const userId = isRegisteredUser ? metadata['user-id'] : null;
        
        // Record file details in database with proper user connection
        const fileRecord = await prisma.image.create({
          data: {
            fileKey: fileKey,
            fileName: originalFilename,
            fileSize: contentLength,
            fileType: contentType,
            uploadedAt: new Date(),
            width: width || null,
            height: height || null,
            user: {
              // Connect to an existing user if userId is available
              ...(userId ? { connect: { id: userId } } : {
                // For guest uploads, create a system user if needed
                connect: { id: process.env.SYSTEM_USER_ID || "guest_user_id" }
              })
            }
          },
        });
        
        console.log(`File recorded in database: ${fileRecord.id}`);
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
        thumbnails: Object.keys(thumbnails).length > 0 ? thumbnails : null,
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
          const thumbnailKey = `${thumbnailBasePath}${baseName}_${size}${thumbnailExtension}`;
          await this.deleteFile(thumbnailKey);
        } catch (error) {
          // Continue if thumbnail doesn't exist
          console.log(`Thumbnail not found or already deleted: ${thumbnailKey}`);
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