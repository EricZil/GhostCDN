import { NextRequest, NextResponse } from 'next/server';

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
    const { endpoint, method = 'POST', body } = await request.json();
    
    if (!endpoint) {
      return NextResponse.json(
        { success: false, message: 'Endpoint is required' },
        { status: 400 }
      );
    }
    
    // Forward the request to the backend with the API key
    const response = await fetch(`${API_URL}/${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': API_KEY || ''
      },
      body: body ? JSON.stringify(body) : undefined
    });
    
    // Get the response from the backend
    const data = await response.json();
    
    // Return the response to the client
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Proxy error:', error);
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
    
    // Forward the request to the backend with the API key
    const response = await fetch(`${API_URL}/${endpoint}`, {
      method: 'GET',
      headers: {
        'X-API-KEY': API_KEY || ''
      }
    });
    
    // Get the response from the backend
    const data = await response.json();
    
    // Return the response to the client
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
} 