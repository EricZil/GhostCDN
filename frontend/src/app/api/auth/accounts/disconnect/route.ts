import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { provider } = await req.json();

    if (!provider) {
      return NextResponse.json({ error: "Provider is required" }, { status: 400 });
    }

    // Call backend API to disconnect account
    const response = await fetch(`${process.env.API_URL}/auth/accounts/${session.user.id}/disconnect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': process.env.API_KEY || '',
      },
      body: JSON.stringify({ provider })
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ 
        error: data.error || "Failed to disconnect account" 
      }, { status: response.status });
    }
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to disconnect account' },
      { status: 500 }
    );
  }
} 