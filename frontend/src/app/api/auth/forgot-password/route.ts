import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Call backend API to request password reset
    const response = await fetch(`${process.env.API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': process.env.API_KEY || '',
      },
      body: JSON.stringify({ email })
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      return NextResponse.json({ 
        success: true, 
        message: data.message 
      }, { status: 200 });
    } else {
      return NextResponse.json({ 
        error: data.error || "Password reset request failed" 
      }, { status: response.status });
    }
  } catch {
    return NextResponse.json({ 
      success: false, 
      error: 'Password reset request failed' 
    }, { status: 500 });
  }
} 