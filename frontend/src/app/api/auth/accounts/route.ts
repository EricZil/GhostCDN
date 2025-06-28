import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Call backend API to get connected accounts
    const response = await fetch(`${process.env.API_URL}/auth/accounts/${session.user.id}`, {
      headers: {
        'X-API-KEY': process.env.API_KEY || '',
      }
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 });
    }

    const accountsData = await response.json();
    
    if (accountsData.success) {
      return NextResponse.json(accountsData.accounts);
    } else {
      return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 });
    }
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch connected accounts' },
      { status: 500 }
    );
  }
} 