declare module 'mongoose' {
  // Re-export everything from mongoose
  export * from 'mongoose';

  // Add document methods that TypeScript doesn't recognize
  interface Document {
    isModified(path: string): boolean;
    comparePassword(candidatePassword: string): Promise<boolean>;
    generateAuthToken(): string;
  }
} 