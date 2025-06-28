import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Call backend API to register user
    const response = await fetch(`${process.env.API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': process.env.API_KEY || '',
      },
      body: JSON.stringify({ name, email, password })
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      return NextResponse.json({ 
        success: true, 
        userId: data.userId 
      }, { status: 201 });
    } else {
      return NextResponse.json({ 
        error: data.error || "Registration failed" 
      }, { status: response.status });
    }
  } catch {
    return NextResponse.json({ 
      success: false, 
      error: 'Registration failed' 
    }, { status: 500 });
  }
} 