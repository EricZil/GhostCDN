const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const sharp = require('sharp');
const path = require('path');

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

// Initialize storage providers

// Client instances
const r2Client = new S3Client(r2Config);
const doSpacesClient = new S3Client(doSpacesConfig);

class StorageService {
  /**
   * Upload file to the appropriate storage provider
   * @param {Object} file - File object from multer
   * @param {boolean} isRegisteredUser - Whether the user is registered
   * @param {Object} options - Upload options
   * @param {boolean} options.optimize - Whether to optimize the image
   * @param {boolean} options.preserveExif - Whether to preserve EXIF metadata
   * @param {boolean} options.generateThumbnails - Whether to generate thumbnails
   * @returns {Promise<Object>} - Upload result with URL
   */
  async uploadFile(file, isRegisteredUser = false, options = {}) {
    try {
      // Extract options with defaults
      const { 
        optimize = true, 
        preserveExif = false, 
        generateThumbnails = false 
      } = options;

      // Choose provider based on user status
      const client = isRegisteredUser ? r2Client : doSpacesClient;
      const bucketName = isRegisteredUser 
        ? process.env.R2_BUCKET_NAME 
        : process.env.DO_SPACES_BUCKET_NAME;
      
      // Select the appropriate storage provider based on user status
      
      // Get file information
      const fileExtension = path.extname(file.originalname).toLowerCase();
      const fileName = file.filename || `${uuidv4()}${fileExtension}`;
      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileExtension);
      
      let fileBuffer;
      let contentType = file.mimetype;

      // Check if file exists
      if (!fs.existsSync(file.path)) {
        throw new Error(`File not found at path: ${file.path}`);
      }

      // Process image if needed
      if (isImage && (optimize || !preserveExif || generateThumbnails)) {
        try {
          let sharpInstance = sharp(file.path);
          
          // Configure Sharp based on options
          if (!preserveExif) {
            sharpInstance = sharpInstance.withMetadata({ exif: {} });
          }
          
          if (optimize) {
            // Apply optimization based on image type with high quality/lossless settings
            if (fileExtension === '.jpg' || fileExtension === '.jpeg') {
              // High quality JPEG with minimal compression
              sharpInstance = sharpInstance.jpeg({ 
                quality: 95,       // Higher quality (95 instead of 85)
                mozjpeg: true,     // Still use mozjpeg for better compression
                optimizeCoding: true, // Optimize Huffman coding tables
                trellisQuantisation: false, // Disable trellis quantization to preserve quality
                overshootDeringing: true,   // Reduce ringing artifacts
                optimizeScans: true,        // Progressive rendering optimization
              });
            } else if (fileExtension === '.png') {
              // Lossless PNG compression
              sharpInstance = sharpInstance.png({ 
                compressionLevel: 9,  // Maximum compression
                adaptiveFiltering: true, // Adaptive filtering for better compression
                palette: false,      // Don't use palette to preserve full color information
                quality: 100,        // Maximum quality
                effort: 10,          // Maximum compression effort
                colors: 256,         // Maximum colors for palette mode (if used)
              });
            } else if (fileExtension === '.webp') {
              // Near-lossless WebP
              sharpInstance = sharpInstance.webp({ 
                quality: 95,       // Higher quality (95 instead of 85)
                lossless: true,    // Use lossless compression
                nearLossless: true, // Use near-lossless mode
                smartSubsample: true, // Intelligent chroma subsampling
                effort: 6,         // Higher compression effort
              });
            } else if (fileExtension === '.gif') {
              // Preserve GIF as is, just optimize
              sharpInstance = sharpInstance.gif({
                // GIF options are limited but we can ensure it's optimized
                effort: 10, // Maximum effort for compression
              });
            }
          }
          
          // Get processed buffer
          fileBuffer = await sharpInstance.toBuffer();
          
          // Generate thumbnails if requested
          if (generateThumbnails && isImage) {
            const thumbnailSizes = [200, 400, 800];
            for (const size of thumbnailSizes) {
              const thumbnailBuffer = await sharp(file.path)
                .resize(size, null, { 
                  withoutEnlargement: true,
                  kernel: 'lanczos3', // High-quality downsampling
                  fit: 'inside',
                })
                .toBuffer();
                
              const thumbnailKey = `thumbnails/${size}/${fileName}`;
              
              // Upload thumbnail
              await this.uploadBuffer(
                thumbnailBuffer,
                thumbnailKey,
                contentType,
                client,
                bucketName
              );
            }
          }
        } catch (sharpError) {
          console.error('Image processing error:', sharpError.message);
          // Fall back to raw file if image processing fails
          fileBuffer = fs.readFileSync(file.path);
        }
      } else {
        // For non-images or when no processing is needed, read the file
        fileBuffer = fs.readFileSync(file.path);
      }

      // Upload the main file
      await this.uploadBuffer(
        fileBuffer,
        fileName,
        contentType,
        client,
        bucketName
      );
      
      // Clean up temp file
      try {
        fs.unlinkSync(file.path);
      } catch (unlinkError) {
        console.error('Failed to delete temp file:', unlinkError.message);
        // Continue even if cleanup fails
      }
      
      // URL encode the filename for use in URLs
      const encodedFileName = encodeURIComponent(fileName);
      
      // Generate public URL - use the CDN URL for public access
      const cdnUrl = isRegisteredUser
        ? `${process.env.R2_PUBLIC_URL}/${encodedFileName}`
        : `${process.env.DO_SPACES_PUBLIC_URL}/${encodedFileName}`;
      
      // Return the CDN URL for the uploaded file
      
      // Return result with thumbnail URLs if generated
      const result = {
        success: true,
        url: cdnUrl,
        key: fileName,
        provider: isRegisteredUser ? 'cloudflare-r2' : 'digitalocean-spaces',
      };
      
      // Add thumbnail URLs if they were generated
      if (generateThumbnails && isImage) {
        const thumbnailSizes = [200, 400, 800];
        const thumbnailUrls = {};
        
        thumbnailSizes.forEach(size => {
          const thumbnailKey = `thumbnails/${size}/${fileName}`;
          const encodedThumbnailKey = encodeURIComponent(thumbnailKey);
          const thumbnailUrl = isRegisteredUser
            ? `${process.env.R2_PUBLIC_URL}/${encodedThumbnailKey}`
            : `${process.env.DO_SPACES_PUBLIC_URL}/${encodedThumbnailKey}`;
            
          if (size === 200) thumbnailUrls.small = thumbnailUrl;
          if (size === 400) thumbnailUrls.medium = thumbnailUrl;
          if (size === 800) thumbnailUrls.large = thumbnailUrl;
        });
        
        result.thumbnails = thumbnailUrls;
      }
      
      return result;
    } catch (error) {
      console.error('Storage service upload error:', error);
      throw error;
    }
  }

  /**
   * Helper method to upload a buffer to storage
   * @param {Buffer} buffer - The file buffer to upload
   * @param {string} key - The file key/name
   * @param {string} contentType - The file content type
   * @param {S3Client} client - The S3 client to use
   * @param {string} bucketName - The bucket name
   * @returns {Promise<Object>} - Upload result
   */
  async uploadBuffer(buffer, key, contentType, client, bucketName) {
    const upload = new Upload({
      client,
      params: {
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ACL: 'public-read',
      },
    });

    await upload.done();
    return { key };
  }

  /**
   * Delete file from storage provider
   * @param {string} fileKey - File key/name
   * @param {boolean} isRegisteredUser - Whether the file is in R2 or Spaces
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
      
      // Also try to delete thumbnails if they exist
      try {
        const thumbnailSizes = [200, 400, 800];
        for (const size of thumbnailSizes) {
          const thumbnailKey = `thumbnails/${size}/${fileKey}`;
          const thumbnailDeleteParams = {
            Bucket: bucketName,
            Key: thumbnailKey,
          };
          const thumbnailCommand = new DeleteObjectCommand(thumbnailDeleteParams);
          await client.send(thumbnailCommand);
        }
      } catch (thumbnailError) {
        // Ignore errors when deleting thumbnails
        // Ignore errors when deleting thumbnails
      }
      
      return {
        success: true,
        message: 'File deleted successfully',
      };
    } catch (error) {
      console.error('Storage service delete error:', error);
      throw error;
    }
  }
}

module.exports = new StorageService(); 