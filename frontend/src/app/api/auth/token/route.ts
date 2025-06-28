import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    });
    
    if (!token) {
      return NextResponse.json(
        { error: 'No valid session found' },
        { status: 401 }
      );
    }
    
    // Create a JWT token that the backend can verify
    // Use the same secret and structure that the backend expects
    const jwtToken = jwt.sign(
      {
        id: token.id || token.sub,
        email: token.email,
        name: token.name,
        role: token.role,
        r2FolderName: token.r2FolderName,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour expiry
      },
      process.env.NEXTAUTH_SECRET!
    );
    
    return NextResponse.json({
      token: jwtToken,
      user: {
        id: token.id || token.sub,
        email: token.email,
        name: token.name,
        role: token.role,
        r2FolderName: token.r2FolderName,
      }
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to retrieve token' },
      { status: 500 }
    );
  }
} 