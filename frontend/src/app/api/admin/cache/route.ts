import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function DELETE(request: NextRequest) {
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
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    // Build the URL based on whether we're clearing a specific key or all cache
    const endpoint = key 
      ? `admin/cache/clear?key=${encodeURIComponent(key)}`
      : 'admin/cache/clear';

    const response = await fetch(`${apiUrl}/${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': process.env.API_KEY || '',
        'user-email': userEmail,
      },
    });

          if (!response.ok) {
        await response.text();
        // Backend cache clear error
      return NextResponse.json(
        { error: 'Failed to clear cache' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
      } catch {
      // Cache clear API error handled
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 