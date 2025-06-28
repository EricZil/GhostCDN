/**
 * Client-side image optimization utility
 * Pre-processes images before upload to reduce server load and improve performance
 */

export interface OptimizationOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  format?: 'jpeg' | 'webp' | 'png' | 'original';
  progressive?: boolean;
}

export interface OptimizationResult {
  blob: Blob;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  format: string;
}

export class ClientImageOptimizer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  constructor() {
    // Don't initialize canvas during SSR
    if (typeof window !== 'undefined') {
      this.initializeCanvas();
    }
  }

  private initializeCanvas() {
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d')!;
    }
  }

  private ensureCanvas() {
    if (typeof window === 'undefined') {
      throw new Error('Image optimization is only available in the browser');
    }
    if (!this.canvas) {
      this.initializeCanvas();
    }
  }

  /**
   * Optimize an image file on the client side
   */
  async optimizeImage(file: File, options: OptimizationOptions = {}): Promise<OptimizationResult> {
    this.ensureCanvas();
    
    const {
      quality = 0.85,
      maxWidth = 2048,
      maxHeight = 2048,
      format = 'original'
    } = options;

    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        try {
          // Calculate new dimensions
          const { width, height } = this.calculateDimensions(
            img.width, 
            img.height, 
            maxWidth, 
            maxHeight
          );

          // Set canvas size
          this.canvas!.width = width;
          this.canvas!.height = height;

          // Draw and resize image
          this.ctx!.drawImage(img, 0, 0, width, height);

          // Determine output format
          let outputFormat = file.type;
          let outputQuality = quality;

          if (format !== 'original') {
            outputFormat = `image/${format}`;
          }

          // Optimize quality based on format
          if (outputFormat === 'image/jpeg') {
            outputQuality = Math.min(quality, 0.9); // Cap JPEG quality
          } else if (outputFormat === 'image/webp') {
            outputQuality = Math.min(quality, 0.85); // WebP can be more aggressive
          }

          // Convert to blob
          this.canvas!.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to optimize image'));
                return;
              }

              const compressionRatio = blob.size / file.size;
              
              resolve({
                blob,
                originalSize: file.size,
                optimizedSize: blob.size,
                compressionRatio,
                format: outputFormat
              });
            },
            outputFormat,
            outputQuality
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Calculate optimal dimensions while maintaining aspect ratio
   */
  private calculateDimensions(
    originalWidth: number, 
    originalHeight: number, 
    maxWidth: number, 
    maxHeight: number
  ): { width: number; height: number } {
    const aspectRatio = originalWidth / originalHeight;

    let width = originalWidth;
    let height = originalHeight;

    // Only resize if image is larger than max dimensions
    if (width > maxWidth || height > maxHeight) {
      if (width / maxWidth > height / maxHeight) {
        width = maxWidth;
        height = width / aspectRatio;
      } else {
        height = maxHeight;
        width = height * aspectRatio;
      }
    }

    return {
      width: Math.round(width),
      height: Math.round(height)
    };
  }

  /**
   * Check if client-side optimization would be beneficial
   */
  shouldOptimize(file: File, options: OptimizationOptions = {}): boolean {
    const { maxWidth = 2048, maxHeight = 2048 } = options;
    
    // Don't optimize if file is already small
    if (file.size < 500 * 1024) return false; // Less than 500KB
    
    // Don't optimize GIFs (they lose animation)
    if (file.type === 'image/gif') return false;
    
    // Check if we can determine if image is likely oversized
    // This is a heuristic - actual dimensions would require loading the image
    const estimatedPixels = file.size / 3; // Rough estimate for uncompressed RGB
    const maxPixels = maxWidth * maxHeight;
    
    return estimatedPixels > maxPixels || file.size > 2 * 1024 * 1024; // 2MB+
  }

  /**
   * Get optimal settings for different file types
   */
  getOptimalSettings(file: File): OptimizationOptions {
    const fileSize = file.size;
    const fileType = file.type;

    // Base settings
    const settings: OptimizationOptions = {
      quality: 0.85,
      maxWidth: 2048,
      maxHeight: 2048,
      progressive: true
    };

    // Adjust based on file size
    if (fileSize > 10 * 1024 * 1024) { // 10MB+
      settings.maxWidth = 1920;
      settings.maxHeight = 1920;
      settings.quality = 0.8;
    } else if (fileSize > 5 * 1024 * 1024) { // 5MB+
      settings.quality = 0.82;
    }

    // Format-specific optimizations
    switch (fileType) {
      case 'image/png':
        // PNG with transparency - keep as PNG but reduce dimensions more aggressively
        settings.maxWidth = Math.min(settings.maxWidth || 2048, 1600);
        settings.maxHeight = Math.min(settings.maxHeight || 2048, 1600);
        break;
      
      case 'image/jpeg':
        // JPEG can be more aggressive with quality
        settings.quality = Math.min(settings.quality || 0.85, 0.88);
        break;
      
      case 'image/webp':
        // WebP is already efficient
        settings.quality = 0.9;
        break;
    }

    return settings;
  }
}

// Lazy-loaded singleton instance
let imageOptimizerInstance: ClientImageOptimizer | null = null;

function getImageOptimizer(): ClientImageOptimizer {
  if (!imageOptimizerInstance) {
    imageOptimizerInstance = new ClientImageOptimizer();
  }
  return imageOptimizerInstance;
}

/**
 * Utility function for easy optimization
 */
export async function optimizeImageFile(
  file: File, 
  options?: OptimizationOptions
): Promise<{ optimizedFile: File; stats: OptimizationResult } | null> {
  
  // Check if we're in the browser
  if (typeof window === 'undefined') {
    return null; // Skip optimization during SSR
  }

  const imageOptimizer = getImageOptimizer();
  
  if (!imageOptimizer.shouldOptimize(file, options)) {
    return null; // No optimization needed
  }

  try {
    const optimalSettings = {
      ...imageOptimizer.getOptimalSettings(file),
      ...options
    };

    const result = await imageOptimizer.optimizeImage(file, optimalSettings);
    
    // Create new File object from optimized blob
    const optimizedFile = new File(
      [result.blob], 
      file.name, 
      { 
        type: result.format,
        lastModified: file.lastModified 
      }
    );

    return {
      optimizedFile,
      stats: result
    };
  } catch (error) {
    console.warn('Client-side optimization failed:', error);
    return null; // Fallback to original file
  }
} 