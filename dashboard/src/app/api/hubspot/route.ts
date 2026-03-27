import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.HUBSPOT_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "HUBSPOT_API_KEY not set" }, { status: 500 });

  // TODO: implement HubSpot data fetch
  return NextResponse.json({ status: "ok", message: "HubSpot API route ready" });
}
