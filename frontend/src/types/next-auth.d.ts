import "next-auth";
import { Role } from "./auth";

declare module "next-auth" {
  interface User {
    id: string;
    role: Role;
    r2FolderName?: string;
  }

  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      image?: string;
      role: Role;
      r2FolderName?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    r2FolderName?: string;
  }
} 