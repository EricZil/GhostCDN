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

// Storage provider configurations
const r2Config = {
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  endpoint: process.env.R2_ENDPOINT,
  region: 'auto',
  forcePathStyle: true, // Required for Cloudflare R2
};

// For DigitalOcean Spaces with custom CDN endpoint
// We need to use the actual API endpoint for operations, not the CDN endpoint
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

// Client instances
const r2Client = new S3Client(r2Config);
const doSpacesClient = new S3Client(doSpacesConfig);

// Thumbnail size definitions
const THUMBNAIL_SIZES = {
  small: { width: 150, height: 150 },
  medium: { width: 400, height: 400 },
  large: { width: 800, height: 800 }
};

class StorageService {
  /**
   * Generate a presigned URL for direct upload to storage
   * @param {Object} fileInfo - Information about the file to upload
   * @param {string} fileInfo.filename - Original filename
   * @param {string} fileInfo.contentType - File MIME type
   * @param {number} fileInfo.fileSize - File size in bytes
   * @param {boolean} isRegisteredUser - Whether the user is registered
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} - Presigned URL and file details
   */
  async getPresignedUrl(fileInfo, isRegisteredUser = false, options = {}) {
    try {
      const { filename, contentType, fileSize } = fileInfo;

      // Choose provider based on user status
      const client = isRegisteredUser ? r2Client : doSpacesClient;
      const bucketName = isRegisteredUser 
        ? process.env.R2_BUCKET_NAME 
        : process.env.DO_SPACES_BUCKET_NAME;
      
      // Generate a unique file key
      const fileExtension = path.extname(filename).toLowerCase();
      const fileKey = `${uuidv4()}${fileExtension}`;
      
      // Store upload options as metadata
      const metadata = {
        'original-filename': filename,
        'optimize': options.optimize !== false ? 'true' : 'false',
        'preserve-exif': options.preserveExif === true ? 'true' : 'false',
        'generate-thumbnails': options.generateThumbnails === true ? 'true' : 'false',
      };
      
      // Create the command for putting an object
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
        ContentType: contentType,
        ACL: 'public-read',
        Metadata: metadata,
      });
      
      // Generate the presigned URL with a 15-minute expiration
      const presignedUrl = await getSignedUrl(client, command, { expiresIn: 900 });
      
      // URL encode the filename for use in URLs
      const encodedFileKey = encodeURIComponent(fileKey);
      
      // Generate public URL for after the upload is complete
      const cdnUrl = isRegisteredUser
        ? `${process.env.R2_PUBLIC_URL}/${encodedFileKey}`
        : `${process.env.DO_SPACES_PUBLIC_URL}/${encodedFileKey}`;
      
      return {
        presignedUrl,
        fileKey,
        cdnUrl,
        provider: isRegisteredUser ? 'cloudflare-r2' : 'digitalocean-spaces',
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
   * @param {boolean} isRegisteredUser - Whether the user is registered
   * @returns {Promise<void>}
   */
  async setObjectPublic(fileKey, isRegisteredUser = false) {
    try {
      const client = isRegisteredUser ? r2Client : doSpacesClient;
      const bucketName = isRegisteredUser 
        ? process.env.R2_BUCKET_NAME 
        : process.env.DO_SPACES_BUCKET_NAME;
      
      const command = new PutObjectAclCommand({
        Bucket: bucketName,
        Key: fileKey,
        ACL: 'public-read'
      });
      
      await client.send(command);
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
   * @param {string} fileKey - The key of the file
   * @param {boolean} isRegisteredUser - Whether the user is registered
   * @returns {Promise<Object>} - Thumbnail URLs
   */
  async generateThumbnails(imageBuffer, fileKey, isRegisteredUser = false) {
    try {
      const client = isRegisteredUser ? r2Client : doSpacesClient;
      const bucketName = isRegisteredUser 
        ? process.env.R2_BUCKET_NAME 
        : process.env.DO_SPACES_BUCKET_NAME;
      
      const baseKey = fileKey.substring(0, fileKey.lastIndexOf('.'));
      const fileExtension = path.extname(fileKey).toLowerCase();
      
      // For better compatibility and smaller size, convert all thumbnails to WebP
      const thumbnailExtension = '.webp';
      const thumbnailContentType = 'image/webp';
      
      const thumbnailUrls = {};
      const image = sharp(imageBuffer);
      const metadata = await image.metadata();
      
      // Generate thumbnails for each size
      for (const [size, dimensions] of Object.entries(THUMBNAIL_SIZES)) {
        try {
          // Create thumbnail key
          const thumbnailKey = `${baseKey}_${size}${thumbnailExtension}`;
          
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
          
          await client.send(putCommand);
          
          // URL encode the thumbnail key for use in URLs
          const encodedThumbnailKey = encodeURIComponent(thumbnailKey);
          
          // Generate public URL for the thumbnail
          thumbnailUrls[size] = isRegisteredUser
            ? `${process.env.R2_PUBLIC_URL}/${encodedThumbnailKey}`
            : `${process.env.DO_SPACES_PUBLIC_URL}/${encodedThumbnailKey}`;
          
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
   * Complete a direct upload - perform any post-processing needed
   * @param {string} fileKey - The key of the uploaded file
   * @param {boolean} isRegisteredUser - Whether the user is registered
   * @param {Object} options - Post-processing options
   * @returns {Promise<Object>} - Result with file URLs
   */
  async completeDirectUpload(fileKey, isRegisteredUser = false, options = {}) {
    try {
      // Choose provider based on user status
      const client = isRegisteredUser ? r2Client : doSpacesClient;
      const bucketName = isRegisteredUser 
        ? process.env.R2_BUCKET_NAME 
        : process.env.DO_SPACES_BUCKET_NAME;
      
      // Check if the file exists and get its metadata
      const headCommand = new HeadObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
      });
      
      let fileMetadata;
      try {
        fileMetadata = await client.send(headCommand);
      } catch (error) {
        throw new Error(`File not found: ${fileKey}`);
      }
      
      // Ensure the file is publicly accessible
      await this.setObjectPublic(fileKey, isRegisteredUser);
      
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
        
        const { Body } = await client.send(getCommand);
        imageBuffer = await streamToBuffer(Body);
      }
      
      // Process the image if optimization is enabled
      if (isImage && processingOptions.optimize && imageBuffer) {
        // Process the image
        const processedBuffer = await this.processImage(imageBuffer, fileKey, processingOptions);
        
        // Upload the processed image back
        const putCommand = new PutObjectCommand({
          Bucket: bucketName,
          Key: fileKey,
          Body: processedBuffer,
          ContentType: fileMetadata.ContentType,
          ACL: 'public-read',
          Metadata: metadata,
        });
        
        await client.send(putCommand);
        console.log(`Successfully processed and re-uploaded ${fileKey}`);
        
        // Update the buffer for thumbnail generation
        imageBuffer = processedBuffer;
      }
      
      // URL encode the filename for use in URLs
      const encodedFileKey = encodeURIComponent(fileKey);
      
      // Generate public URL for the uploaded file
      const cdnUrl = isRegisteredUser
        ? `${process.env.R2_PUBLIC_URL}/${encodedFileKey}`
        : `${process.env.DO_SPACES_PUBLIC_URL}/${encodedFileKey}`;
      
      // Generate thumbnails if requested and if it's an image
      let thumbnails = null;
      
      if (isImage && processingOptions.generateThumbnails && imageBuffer) {
        thumbnails = await this.generateThumbnails(imageBuffer, fileKey, isRegisteredUser);
      }
      
      return {
        success: true,
        url: cdnUrl,
        key: fileKey,
        provider: isRegisteredUser ? 'cloudflare-r2' : 'digitalocean-spaces',
        thumbnails,
      };
    } catch (error) {
      console.error('Error completing direct upload:', error);
      throw error;
    }
  }

  /**
   * Delete a file from storage
   * @param {string} fileKey - The key of the file to delete
   * @param {boolean} isRegisteredUser - Whether the user is registered
   * @returns {Promise<Object>} - Delete result
   */
  async deleteFile(fileKey, isRegisteredUser = false) {
    try {
      const client = isRegisteredUser ? r2Client : doSpacesClient;
      const bucketName = isRegisteredUser 
        ? process.env.R2_BUCKET_NAME 
        : process.env.DO_SPACES_BUCKET_NAME;
      
      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
      });
      
      await client.send(command);
      
      // Also delete thumbnails if they exist
      const baseKey = fileKey.substring(0, fileKey.lastIndexOf('.'));
      const thumbnailExtension = '.webp';
      
      for (const size of Object.keys(THUMBNAIL_SIZES)) {
        try {
          const thumbnailKey = `${baseKey}_${size}${thumbnailExtension}`;
          const deleteThumbnailCommand = new DeleteObjectCommand({
            Bucket: bucketName,
            Key: thumbnailKey,
          });
          
          await client.send(deleteThumbnailCommand);
          console.log(`Deleted thumbnail: ${thumbnailKey}`);
        } catch (err) {
          // Ignore errors if thumbnails don't exist
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }
}

// Helper function to convert a stream to a buffer
async function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

module.exports = new StorageService(); 