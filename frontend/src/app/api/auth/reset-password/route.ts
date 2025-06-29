import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { token, newPassword } = await req.json();

    if (!token || !newPassword) {
      return NextResponse.json({ error: "Reset token and new password are required" }, { status: 400 });
    }

    // Call backend API to reset password
    const response = await fetch(`${process.env.API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': process.env.API_KEY || '',
      },
      body: JSON.stringify({ token, newPassword })
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      return NextResponse.json({ 
        success: true, 
        message: data.message 
      }, { status: 200 });
    } else {
      return NextResponse.json({ 
        error: data.error || "Password reset failed" 
      }, { status: response.status });
    }
  } catch {
    return NextResponse.json({ 
      success: false, 
      error: 'Password reset failed' 
    }, { status: 500 });
  }
} 