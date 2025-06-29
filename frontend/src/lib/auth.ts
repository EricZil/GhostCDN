import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Call backend API to authenticate user
          const response = await fetch(`${process.env.API_URL}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-KEY': process.env.API_KEY || '',
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password
            })
          });

          const userData = await response.json();
          
          if (!response.ok) {
            // Handle different types of errors with specific messages
            if (userData.code === 'ACCOUNT_BANNED') {
              throw new Error(`Account Banned: ${userData.message}${userData.reason ? ` Reason: ${userData.reason}` : ''}`);
            } else if (userData.code === 'EMAIL_NOT_VERIFIED') {
              throw new Error(userData.error);
            } else {
              throw new Error(userData.error || 'Authentication failed');
            }
          }

          if (userData.success && userData.user) {
            return {
              id: userData.user.id,
              name: userData.user.name,
              email: userData.user.email,
              role: userData.user.role,
              image: userData.user.image,
              r2FolderName: userData.user.r2FolderName || undefined,
              lastLogin: userData.user.lastLogin,
            };
          }
          
          throw new Error('Authentication failed');
        } catch (error) {
          if (error instanceof Error) {
            throw error;
          }
          return null;
        }
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async signIn({ user, account }) {
      // For social logins, call backend to create/update user
      if (account && (account.provider === 'google' || account.provider === 'github')) {
        try {
          const response = await fetch(`${process.env.API_URL}/auth/social-login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-KEY': process.env.API_KEY || '',
            },
            body: JSON.stringify({
              email: user.email,
              name: user.name,
              image: user.image,
              provider: account.provider,
              providerAccountId: account.providerAccountId
            })
          });

          if (response.ok) {
            const userData = await response.json();
            if (userData.success && userData.user) {
              // Update user object with backend data
              user.id = userData.user.id;
              user.role = userData.user.role;
              user.r2FolderName = userData.user.r2FolderName;
              user.lastLogin = userData.user.lastLogin;
              return true;
            }
          } else {
            const errorData = await response.json();
            if (errorData.code === 'ACCOUNT_BANNED') {
              throw new Error(`Account Banned: ${errorData.message}`);
            }
          }
          
          return false;
        } catch {
          return false;
        }
      }
      
      return true;
    },
    async jwt({ token, user }) {
      // If this is a fresh login (user object is present)
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.r2FolderName = user.r2FolderName;
        token.lastLogin = user.lastLogin;
      } 
      // For existing sessions, only fetch user data if missing critical info
      else if (token.sub && (!token.role || !token.r2FolderName)) {
        try {
          const response = await fetch(`${process.env.API_URL}/auth/user/${token.sub}`, {
            headers: {
              'X-API-KEY': process.env.API_KEY || '',
            }
          });
          
          if (response.ok) {
            const userData = await response.json();
            if (userData.success && userData.user) {
              token.id = userData.user.id;
              token.role = userData.user.role;
              token.r2FolderName = userData.user.r2FolderName || undefined;
              token.lastLogin = userData.user.lastLogin;
            }
          }
        } catch {
          // Silently handle error - user data will be fetched on next request
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.role = token.role;
        session.user.r2FolderName = token.r2FolderName;
        session.user.lastLogin = token.lastLogin;
      }
      return session;
    }
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  secret: process.env.NEXTAUTH_SECRET,
}; 