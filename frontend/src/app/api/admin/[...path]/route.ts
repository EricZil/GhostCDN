import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
    responseLimit: '20mb',
  },
};

/**
 * Admin proxy route - handles all admin API calls with authentication
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleAdminRequest(request, 'GET', resolvedParams.path);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleAdminRequest(request, 'POST', resolvedParams.path);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleAdminRequest(request, 'PUT', resolvedParams.path);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleAdminRequest(request, 'DELETE', resolvedParams.path);
}

async function handleAdminRequest(request: NextRequest, method: string, path: string[]) {
  try {
    const API_URL = process.env.API_URL;
    const API_KEY = process.env.API_KEY;
    
    if (!API_URL || !API_KEY) {
      return NextResponse.json(
        { error: 'API configuration missing' },
        { status: 500 }
      );
    }

    // Get the session to check authentication and role
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

    // Build the endpoint path
    const endpoint = path.join('/');
    const url = new URL(request.url);
    const searchParams = url.searchParams.toString();
    const fullEndpoint = `admin/${endpoint}${searchParams ? `?${searchParams}` : ''}`;

  

    // Get request body for POST/PUT requests
    let body;
    if (method === 'POST' || method === 'PUT') {
      try {
        body = await request.json();
      } catch {
        // No body or invalid JSON
        body = null;
      }
    }

    // Forward the request to the backend
    const response = await fetch(`${API_URL}/${fullEndpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': API_KEY,
        'user-email': session.user.email as string,
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { 
          success: false, 
          message: `Backend error: ${response.status}`,
          details: errorText 
        },
        { status: response.status }
      );
    }

    // Get the response from the backend
    const data = await response.json();

    // Return the response to the client
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
} 