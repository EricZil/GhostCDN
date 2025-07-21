import { NextRequest, NextResponse } from 'next/server';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
    responseLimit: '20mb',
  },
};

/**
 * Secure proxy to the backend API
 * This keeps the API key on the server side and never exposes it to the client
 */
export async function POST(request: NextRequest) {
  try {
    const API_URL = process.env.API_URL;
    const API_KEY = process.env.API_KEY;
    
    if (!API_URL) {
      return NextResponse.json(
        { success: false, message: 'API URL not configured' },
        { status: 500 }
      );
    }
    
    // Get request body and endpoint from the client
    const { endpoint, method = 'POST', body, headers: additionalHeaders } = await request.json();
    
    if (!endpoint) {
      return NextResponse.json(
        { success: false, message: 'Endpoint is required' },
        { status: 400 }
      );
    }
    
    // Prepare headers for the backend request
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-API-KEY': API_KEY || ''
    };
    
    // Forward Authorization header from the original request
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    
    // Add any additional headers from the request
    if (additionalHeaders) {
      Object.assign(headers, additionalHeaders);
    }
    
    // Forward the request to the backend with the API key
    const response = await fetch(`${API_URL}/${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    
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

/**
 * Handle GET requests through the proxy
 */
export async function GET(request: NextRequest) {
  try {
    const API_URL = process.env.API_URL;
    const API_KEY = process.env.API_KEY;
    
    if (!API_URL) {
      return NextResponse.json(
        { success: false, message: 'API URL not configured' },
        { status: 500 }
      );
    }
    
    // Get the endpoint from the URL
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');
    
    if (!endpoint) {
      return NextResponse.json(
        { success: false, message: 'Endpoint is required' },
        { status: 400 }
      );
    }
    
    // Prepare headers for the backend request
    const headers: Record<string, string> = {
      'X-API-KEY': API_KEY || ''
    };
    
    // Forward Authorization header from the original request
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    
    // Forward the request to the backend with the API key
    const response = await fetch(`${API_URL}/${endpoint}`, {
      method: 'GET',
      headers
    });
    
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

/**
 * Handle DELETE requests through the proxy
 */
export async function DELETE(request: NextRequest) {
  try {
    const API_URL = process.env.API_URL;
    const API_KEY = process.env.API_KEY;
    
    if (!API_URL) {
      return NextResponse.json(
        { success: false, message: 'API URL not configured' },
        { status: 500 }
      );
    }
    
    // Get the endpoint from the URL
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');
    
    if (!endpoint) {
      return NextResponse.json(
        { success: false, message: 'Endpoint is required' },
        { status: 400 }
      );
    }
    
    // Prepare headers for the backend request
    const headers: Record<string, string> = {
      'X-API-KEY': API_KEY || ''
    };
    
    // Forward Authorization header from the original request
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    
    // Forward the request to the backend with the API key
    const response = await fetch(`${API_URL}/${endpoint}`, {
      method: 'DELETE',
      headers
    });
    
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