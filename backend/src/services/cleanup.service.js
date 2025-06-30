const prisma = require('../lib/prisma');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');



// DigitalOcean Spaces configuration
const doSpacesClient = new S3Client({
  credentials: {
    accessKeyId: process.env.DO_SPACES_ACCESS_KEY_ID,
    secretAccessKey: process.env.DO_SPACES_SECRET_ACCESS_KEY,
  },
  endpoint: `https://${process.env.DO_SPACES_REGION}.digitaloceanspaces.com`,
  region: process.env.DO_SPACES_REGION || 'fra1',
  forcePathStyle: false,
});

class CleanupService {
  /**
   * Delete expired guest uploads
   * @returns {Promise<Object>} - Cleanup results
   */
  async deleteExpiredGuestUploads() {
    try {
      const now = new Date();
      const bucketName = process.env.DO_SPACES_BUCKET_NAME;
      
      console.log(`Starting cleanup of expired guest uploads (${now.toISOString()})`);
      
      // Find all expired guest uploads that haven't been deleted yet
      const expiredUploads = await prisma.guestUpload.findMany({
        where: {
          expiresAt: {
            lt: now
          },
          isDeleted: false
        },
        orderBy: {
          expiresAt: 'asc'
        }
      });
      
      console.log(`Found ${expiredUploads.length} expired guest uploads to delete`);
      
      let deletedCount = 0;
      let errorCount = 0;
      const errors = [];
      
      for (const upload of expiredUploads) {
        try {
          // Delete the main file from storage
          await this.deleteFileFromStorage(upload.fileKey);
          
          // Delete associated thumbnails if they exist
          await this.deleteThumbnailsFromStorage(upload.fileKey);
          
          // Mark as deleted in database
          await prisma.guestUpload.update({
            where: { id: upload.id },
            data: {
              isDeleted: true,
              deletedAt: now
            }
          });
          
          deletedCount++;
          console.log(`Deleted expired guest upload: ${upload.fileKey} (expired: ${upload.expiresAt.toISOString()})`);
          
          // Log the cleanup activity
          await prisma.systemLog.create({
            data: {
              level: 'INFO',
              message: `Deleted expired guest upload: ${upload.fileName}`,
              source: 'cleanup',
              metadata: JSON.stringify({
                fileKey: upload.fileKey,
                fileName: upload.fileName,
                fileSize: upload.fileSize,
                uploadedAt: upload.uploadedAt.toISOString(),
                expiresAt: upload.expiresAt.toISOString(),
                daysExpired: Math.floor((now - upload.expiresAt) / (1000 * 60 * 60 * 24))
              })
            }
          });
          
        } catch (error) {
          errorCount++;
          const errorMsg = `Failed to delete expired guest upload ${upload.fileKey}: ${error.message}`;
          errors.push(errorMsg);
          console.error(errorMsg);
          
          // Log the error
          await prisma.systemLog.create({
            data: {
              level: 'ERROR',
              message: `Failed to delete expired guest upload: ${upload.fileName}`,
              source: 'cleanup',
              metadata: JSON.stringify({
                fileKey: upload.fileKey,
                fileName: upload.fileName,
                error: error.message,
                expiresAt: upload.expiresAt.toISOString()
              })
            }
          });
        }
      }
      
      const result = {
        totalExpired: expiredUploads.length,
        deletedCount,
        errorCount,
        errors: errors.slice(0, 10), // Limit to first 10 errors
        executedAt: now.toISOString()
      };
      
      console.log(`Cleanup completed: ${deletedCount} deleted, ${errorCount} errors`);
      
      // Log the cleanup summary
      await prisma.systemLog.create({
        data: {
          level: errorCount > 0 ? 'WARN' : 'INFO',
          message: `Guest upload cleanup completed: ${deletedCount} deleted, ${errorCount} errors`,
          source: 'cleanup',
          metadata: JSON.stringify(result)
        }
      });
      
      return result;
    } catch (error) {
      console.error('Error during cleanup process:', error);
      
      // Log the cleanup failure
      await prisma.systemLog.create({
        data: {
          level: 'ERROR',
          message: 'Guest upload cleanup failed',
          source: 'cleanup',
          metadata: JSON.stringify({
            error: error.message,
            stack: error.stack
          })
        }
      });
      
      throw error;
    }
  }
  
  /**
   * Delete a file from DigitalOcean Spaces storage
   * @param {string} fileKey - The key of the file to delete
   * @returns {Promise<void>}
   */
  async deleteFileFromStorage(fileKey) {
    try {
      const bucketName = process.env.DO_SPACES_BUCKET_NAME;
      
      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
      });
      
      await doSpacesClient.send(command);
      console.log(`Successfully deleted file from storage: ${fileKey}`);
    } catch (error) {
      // If file doesn't exist, that's okay - it might have been manually deleted
      if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
        console.log(`File not found in storage (already deleted?): ${fileKey}`);
        return;
      }
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
          await this.deleteFileFromStorage(thumbnailKey);
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
   * Get cleanup statistics
   * @returns {Promise<Object>} - Statistics about guest uploads and cleanup
   */
  async getCleanupStats() {
    try {
      const now = new Date();
      
      // Total guest uploads
      const totalUploads = await prisma.guestUpload.count();
      
      // Active uploads (not deleted)
      const activeUploads = await prisma.guestUpload.count({
        where: { isDeleted: false }
      });
      
      // Expired but not yet deleted
      const expiredPending = await prisma.guestUpload.count({
        where: {
          expiresAt: { lt: now },
          isDeleted: false
        }
      });
      
      // Deleted uploads
      const deletedUploads = await prisma.guestUpload.count({
        where: { isDeleted: true }
      });
      
      // Uploads expiring in the next 24 hours
      const expiringSoon = await prisma.guestUpload.count({
        where: {
          expiresAt: {
            gte: now,
            lt: new Date(now.getTime() + (24 * 60 * 60 * 1000))
          },
          isDeleted: false
        }
      });
      
      // Total storage used by active guest uploads
      const storageStats = await prisma.guestUpload.aggregate({
        where: { isDeleted: false },
        _sum: { fileSize: true },
        _avg: { fileSize: true }
      });
      
      return {
        totalUploads,
        activeUploads,
        expiredPending,
        deletedUploads,
        expiringSoon,
        totalStorageBytes: storageStats._sum.fileSize || 0,
        averageFileSizeBytes: Math.round(storageStats._avg.fileSize || 0),
        generatedAt: now.toISOString()
      };
    } catch (error) {
      console.error('Error getting cleanup stats:', error);
      throw error;
    }
  }
  
  /**
   * Manually trigger cleanup (for admin use)
   * @returns {Promise<Object>} - Cleanup results
   */
  async manualCleanup() {
    console.log('Manual cleanup triggered by admin');
    return await this.deleteExpiredGuestUploads();
  }
}

module.exports = new CleanupService(); 