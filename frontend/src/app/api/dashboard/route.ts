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
    const userId = session.user.email;

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
    let backendUrl = `${cleanBackendUrl}/api/dashboard/${endpoint}/${userId}`;
    
    // Add query parameters if any
    const queryString = searchParams.toString().replace(`endpoint=${endpoint}&`, '').replace(`endpoint=${endpoint}`, '');
    if (queryString) {
      backendUrl += `?${queryString}`;
    }

    // Development logging can be enabled when needed
    // console.log('Dashboard API call:', { endpoint, userId, finalUrl: backendUrl });

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY || '',
      },
    });

    // Check if response is JSON before parsing
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      await response.text();
      // Non-JSON response from backend
      return NextResponse.json(
        { success: false, message: `Backend returned non-JSON response: ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    // Dashboard API error handled
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
    const body = await request.json();

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

    // Add userId to body for backend validation
    body.userId = session.user.email;

    const backendUrl = `${cleanBackendUrl}/api/dashboard/${endpoint}`;

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY || '',
      },
      body: JSON.stringify(body),
    });

    // Handle bulk download responses which can be either JSON or binary
    if (endpoint === 'files/bulk-download') {
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/zip')) {
        // Binary ZIP file response - stream it directly
        const arrayBuffer = await response.arrayBuffer();
        
        return new NextResponse(arrayBuffer, {
          status: response.status,
          headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': response.headers.get('content-disposition') || 'attachment; filename="files.zip"',
          },
        });
      } else {
        // JSON response (single file or error)
        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
      }
    }

    // For all other endpoints, parse as JSON
    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    // Dashboard API error handled
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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
    const fileId = searchParams.get('fileId');

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

    let backendUrl: string;
    let body: Record<string, unknown> = { userId: session.user.email };

    if (endpoint === 'file' && fileId) {
      // Single file delete
      backendUrl = `${cleanBackendUrl}/api/dashboard/${endpoint}/${fileId}`;
    } else if (endpoint === 'files/bulk') {
      // Bulk delete
      const requestBody = await request.json();
      backendUrl = `${cleanBackendUrl}/api/dashboard/${endpoint}`;
      body = { ...requestBody, userId: session.user.email };
    } else {
      return NextResponse.json(
        { success: false, message: 'Invalid endpoint or missing parameters' },
        { status: 400 }
      );
    }

    const response = await fetch(backendUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY || '',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}