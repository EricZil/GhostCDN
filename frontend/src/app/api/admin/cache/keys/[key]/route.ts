import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const userEmail = request.headers.get('user-email');
    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email required' },
        { status: 401 }
      );
    }

    const { key } = await params;
    if (!key) {
      return NextResponse.json(
        { error: 'Cache key required' },
        { status: 400 }
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

    const response = await fetch(`${apiUrl}/admin/cache/keys/${encodeURIComponent(key)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': process.env.API_KEY || '',
        'user-email': userEmail,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Failed to fetch cache key info' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch {
    // Admin cache key info error handled
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 