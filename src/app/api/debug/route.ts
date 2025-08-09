import { NextResponse } from "next/server";

export async function GET() {
  // Only allow in development for security
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Debug endpoint disabled in production' }, { status: 403 });
  }

  return NextResponse.json({
    nextauth_url: process.env.NEXTAUTH_URL,
    nextauth_secret: process.env.NEXTAUTH_SECRET ? '***set***' : 'missing',
    google_client_id: process.env.GOOGLE_CLIENT_ID ? `${process.env.GOOGLE_CLIENT_ID.slice(0, 10)}...` : 'missing',
    google_client_secret: process.env.GOOGLE_CLIENT_SECRET ? '***set***' : 'missing',
    node_env: process.env.NODE_ENV,
  });
}