import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
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
      return NextResponse.json(
        { error: 'Backend API URL not configured' },
        { status: 500 }
      );
    }

    const { userId } = await params;
    const userEmail = session.user.email as string;
    const body = await request.json();
    const { action, ...actionData } = body;

    let endpoint = '';
    const method = 'POST';

    switch (action) {
      case 'reset-password':
        endpoint = `/admin/users/${userId}/reset-password`;
        break;
      case 'ban':
        endpoint = `/admin/users/${userId}/ban`;
        break;
      case 'unban':
        endpoint = `/admin/users/${userId}/unban`;
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    const response = await fetch(`${apiUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': process.env.API_KEY || '',
        'user-email': userEmail,
      },
      body: JSON.stringify(actionData),
    });

    if (!response.ok) {
      await response.text();
      return NextResponse.json(
        { error: `Failed to ${action}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    // User action API error handled
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 