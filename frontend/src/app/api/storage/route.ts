import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const BACKEND_URL = process.env.API_URL || 'http://localhost:3001';
const API_KEY = process.env.API_KEY;

// Remove trailing /api if it exists to avoid double /api in URLs
const cleanBackendUrl = BACKEND_URL.replace(/\/api$/, '');

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');

    if (!endpoint) {
      return NextResponse.json(
        { success: false, message: 'Missing endpoint parameter' },
        { status: 400 }
      );
    }

    if (!BACKEND_URL) {
      return NextResponse.json(
        { success: false, message: 'Backend URL not configured' },
        { status: 500 }
      );
    }

    // Build backend URL
    let backendUrl = `${cleanBackendUrl}/api/storage/${endpoint}`;
    
    // Add query parameters if any (excluding the endpoint parameter)
    const queryString = searchParams.toString().replace(`endpoint=${endpoint}&`, '').replace(`endpoint=${endpoint}`, '');
    if (queryString) {
      backendUrl += `?${queryString}`;
    }

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY || '',
        'user-email': session.user.email,
      },
    });

    // Check if response is JSON before parsing
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      await response.text();
      return NextResponse.json(
        { success: false, message: `Backend returned non-JSON response: ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');

    if (!endpoint) {
      return NextResponse.json(
        { success: false, message: 'Missing endpoint parameter' },
        { status: 400 }
      );
    }

    if (!BACKEND_URL) {
      return NextResponse.json(
        { success: false, message: 'Backend URL not configured' },
        { status: 500 }
      );
    }

    // Get request body
    let body;
    try {
      body = await request.json();
    } catch {
      body = null;
    }

    // Build backend URL
    const backendUrl = `${cleanBackendUrl}/api/storage/${endpoint}`;

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY || '',
        'user-email': session.user.email,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    // Check if response is JSON before parsing
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      await response.text();
      return NextResponse.json(
        { success: false, message: `Backend returned non-JSON response: ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}