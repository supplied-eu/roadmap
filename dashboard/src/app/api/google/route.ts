import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return NextResponse.json({ error: "GOOGLE_CLIENT_ID not set" }, { status: 500 });

  // TODO: implement Google OAuth and data fetch using per-user tokens from Auth0 user metadata
  return NextResponse.json({ status: "ok", message: "Google API route ready" });
}
