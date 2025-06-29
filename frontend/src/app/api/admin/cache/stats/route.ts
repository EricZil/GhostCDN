import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const apiUrl = process.env.API_URL;
      if (!apiUrl) {
    // API_URL environment variable is not configured
      return NextResponse.json(
        { error: 'Backend API URL not configured' },
        { status: 500 }
      );
    }

    const userEmail = session.user.email as string;

    const response = await fetch(`${apiUrl}/admin/cache/stats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': process.env.API_KEY || '',
        'user-email': userEmail,
      },
    });

    if (!response.ok) {
          await response.text();
    // Backend cache stats error
      return NextResponse.json(
        { error: 'Failed to fetch cache statistics' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    // Cache stats API error handled
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 