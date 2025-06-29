// Shared authentication types
export type Role = 'USER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  image?: string | null;
  r2FolderName?: string;
  lastLogin?: string | null;
} 