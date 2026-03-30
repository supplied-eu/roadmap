import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

export async function GET() {
  try {
    // Load both leadfeeder and hubspot data for a combined traffic view
    const lfPath = join(process.cwd(), "..", "leadfeeder-data.json");
    const hsPath = join(process.cwd(), "..", "hubspot-data.json");

    let lfData: any = { available: false };
    let hsData: any = {};

    try {
      lfData = JSON.parse(readFileSync(lfPath, "utf-8"));
    } catch {}

    try {
      hsData = JSON.parse(readFileSync(hsPath, "utf-8"));
    } catch {}

    return NextResponse.json({
      ...lfData,
      // HubSpot contact funnel & traffic sources
      contactLifecycle: hsData.contactLifecycle || [],
      hsTrafficSources: hsData.trafficSources || [],
    }, {
      headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (err: any) {
    return NextResponse.json(
      { available: false, error: err.message },
      { status: 200 }
    );
  }
}
