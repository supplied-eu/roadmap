import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET() {
  try {
    // Try to read the meeting summaries JSON from the repo root
    const filePath = join(process.cwd(), "..", "meeting-summaries.json");
    const raw = await readFile(filePath, "utf-8");
    const data = JSON.parse(raw);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
    });
  } catch {
    // Fallback: return empty
    return NextResponse.json({ meetings: [], available: false });
  }
}
