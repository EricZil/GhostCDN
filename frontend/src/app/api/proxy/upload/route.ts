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
    
    // Get the upload type from the URL parameters
    const { searchParams } = new URL(request.url);
    const uploadType = searchParams.get('type') || 'guest';
    const action = searchParams.get('action') || 'presigned'; // 'presigned' or 'complete'
    
    if (!['guest', 'user'].includes(uploadType)) {
      return NextResponse.json(
        { success: false, message: 'Invalid upload type' },
        { status: 400 }
      );
    }
    
    if (!['presigned', 'complete'].includes(action)) {
      return NextResponse.json(
        { success: false, message: 'Invalid action' },
        { status: 400 }
      );
    }
    
    let endpoint = '';
    let body;
    const headers: HeadersInit = {
      'X-API-KEY': API_KEY || '',
      'Content-Type': 'application/json'
    };
    
    if (action === 'presigned') {
      // For presigned URL requests, we need to parse the JSON body
      const jsonBody = await request.json();
      body = JSON.stringify(jsonBody);
      endpoint = `${API_URL}/upload/presigned/${uploadType}`;
    } else if (action === 'complete') {
      // For completion requests, we need the fileKey from the JSON body
      const jsonBody = await request.json();
      const { fileKey, ...options } = jsonBody;
      
      // Convert boolean values to strings for the backend
      const processedOptions = Object.entries(options).reduce((acc, [key, value]) => {
        acc[key] = typeof value === 'boolean' ? value.toString() : String(value);
        return acc;
      }, {} as Record<string, string>);
      
      body = JSON.stringify(processedOptions);
      endpoint = `${API_URL}/upload/complete/${uploadType}/${encodeURIComponent(fileKey)}`;
      
  
    }
    
    // Forward the request to the backend with the API key
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body
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