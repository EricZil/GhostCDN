import md5 from 'crypto-js/md5';

// Cache for Gravatar existence checks to avoid repeated API calls
const gravatarCache = new Map<string, { exists: boolean; timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const MAX_CACHE_SIZE = 1000; // Prevent memory bloat

export function getGravatarUrl(email: string, size: number = 200, fallback: string = 'identicon'): string {
  // Trim and lowercase the email
  const normalizedEmail = email.trim().toLowerCase();
  
  // Create MD5 hash of the email
  const hash = md5(normalizedEmail).toString();
  
  // Use 'identicon' as default fallback instead of '404' to avoid failed requests
  // This generates a geometric pattern unique to the email instead of returning 404
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=${fallback}`;
}

// Optimized function that uses cache and avoids unnecessary network requests
export async function checkGravatarExists(email: string): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  const now = Date.now();
  
  // Check cache first
  const cached = gravatarCache.get(normalizedEmail);
  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    return cached.exists;
  }
  
  // Prevent cache from growing too large
  if (gravatarCache.size >= MAX_CACHE_SIZE) {
    // Remove oldest entries (simple cleanup)
    const entries = Array.from(gravatarCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    for (let i = 0; i < Math.floor(MAX_CACHE_SIZE * 0.1); i++) {
      gravatarCache.delete(entries[i][0]);
    }
  }
  
  try {
    // Use a more efficient approach: try to fetch with d=404 to get actual 404 for non-existent avatars
    const hash = md5(normalizedEmail).toString();
    const url = `https://www.gravatar.com/avatar/${hash}?s=1&d=404`; // Use size=1 for minimal data transfer
    
    const response = await fetch(url, {
      method: 'HEAD', // Use HEAD request to avoid downloading the image data
      cache: 'force-cache', // Use browser cache if available
    });
    
    const exists = response.ok;
    
    // Cache the result
    gravatarCache.set(normalizedEmail, { exists, timestamp: now });
    
    return exists;
  } catch {
    // On network error, cache as false and return false
    gravatarCache.set(normalizedEmail, { exists: false, timestamp: now });
    return false;
  }
}

// Helper function to get Gravatar URL with smart fallback
export function getSmartGravatarUrl(email: string, size: number = 200): string {
  // Always use identicon fallback to avoid 404s
  // This ensures we always get an image back, reducing failed requests
  return getGravatarUrl(email, size, 'identicon');
}

// Clear cache function for testing or manual cache invalidation
export function clearGravatarCache(): void {
  gravatarCache.clear();
} 