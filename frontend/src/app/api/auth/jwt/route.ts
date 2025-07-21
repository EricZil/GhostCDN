import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import jwt from 'jsonwebtoken';

/**
 * Generate a JWT token for authenticated users to use with the backend API
 */
export async function GET() {
  try {
    // Get the session from NextAuth
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Generate a JWT token that matches what the backend expects
    const jwtSecret = process.env.NEXTAUTH_SECRET;
    if (!jwtSecret) {
      return NextResponse.json(
        { success: false, error: 'JWT secret not configured' },
        { status: 500 }
      );
    }

    const payload = {
      id: session.user.id,
      sub: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
      r2FolderName: session.user.r2FolderName,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 24 hours
    };

    const token = jwt.sign(payload, jwtSecret);

    return NextResponse.json({
      success: true,
      token: token
    });
  } catch (error) {
    console.error('JWT generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate JWT token' },
      { status: 500 }
    );
  }
}