import { NextRequest, NextResponse } from 'next/server';

/**
 * Secure proxy for file uploads to the backend API
 * This keeps the API key on the server side and never exposes it to the client
 */
export const config = {
  api: {
    bodyParser: false,
    responseLimit: '20mb',
  },
};

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
    
    // Get the form data from the request
    const formData = await request.formData();
    
    // Get the upload type from the URL parameters
    const { searchParams } = new URL(request.url);
    const uploadType = searchParams.get('type') || 'guest';
    
    if (!['guest', 'user'].includes(uploadType)) {
      return NextResponse.json(
        { success: false, message: 'Invalid upload type' },
        { status: 400 }
      );
    }
    
    // Forward the request to the backend with the API key
    const response = await fetch(`${API_URL}/upload/${uploadType}`, {
      method: 'POST',
      headers: {
        'X-API-KEY': API_KEY || '',
        // Don't set Content-Type here, it will be set automatically with the boundary
      },
      body: formData
    });
    
    // Get the response from the backend
    const data = await response.json();
    
    // Return the response to the client
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Upload proxy error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
} 