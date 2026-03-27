import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "LINEAR_API_KEY not set" }, { status: 500 });

  // TODO: implement full Linear data fetch (port from scripts/fetch-linear.js)
  return NextResponse.json({ status: "ok", message: "Linear API route ready" });
}
