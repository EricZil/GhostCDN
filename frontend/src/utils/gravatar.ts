import md5 from 'crypto-js/md5';

export function getGravatarUrl(email: string, size: number = 200): string {
  // Trim and lowercase the email
  const normalizedEmail = email.trim().toLowerCase();
  
  // Create MD5 hash of the email
  const hash = md5(normalizedEmail).toString();
  
  // Return Gravatar URL with fallback to a default avatar
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=404`;
}

export async function checkGravatarExists(email: string): Promise<boolean> {
  try {
    // Check if Gravatar exists by trying to fetch it
    const url = getGravatarUrl(email);
    const response = await fetch(url);
    
    // Gravatar returns 404 status if no avatar exists
    return response.ok;
  } catch {
    return false;
  }
} 