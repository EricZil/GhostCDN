import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, email } = body;

    const response = await fetch(`${process.env.API_URL}/auth/check-ban`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, email }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Ban check proxy error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check ban status' },
      { status: 500 }
    );
  }
}

// Test ban endpoint for debugging
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');

    if (!userId && !email) {
      return NextResponse.json(
        { success: false, error: 'User ID or email is required' },
        { status: 400 }
      );
    }

    const response = await fetch(`${process.env.API_URL}/auth/test-ban`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, email }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Ban test proxy error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to test ban status' },
      { status: 500 }
    );
  }
} 