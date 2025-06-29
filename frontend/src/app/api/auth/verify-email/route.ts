import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: "Verification token is required" }, { status: 400 });
    }

    // Call backend API to verify email
    const response = await fetch(`${process.env.API_URL}/auth/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': process.env.API_KEY || '',
      },
      body: JSON.stringify({ token })
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      return NextResponse.json({ 
        success: true, 
        message: data.message 
      }, { status: 200 });
    } else {
      return NextResponse.json({ 
        error: data.error || "Email verification failed" 
      }, { status: response.status });
    }
  } catch {
    return NextResponse.json({ 
      success: false, 
      error: 'Email verification failed' 
    }, { status: 500 });
  }
} 