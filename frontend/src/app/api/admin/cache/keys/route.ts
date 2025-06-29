import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const userEmail = request.headers.get('user-email');
    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email required' },
        { status: 401 }
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

    const { searchParams } = new URL(request.url);
    const pattern = searchParams.get('pattern') || '*';

    const response = await fetch(`${apiUrl}/admin/cache/keys?pattern=${encodeURIComponent(pattern)}`, {
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
        { error: data.error || 'Failed to fetch cache keys' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch {
    // Admin cache keys error handled
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 