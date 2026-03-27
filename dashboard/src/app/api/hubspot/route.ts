import { NextResponse } from "next/server";

const HS_API = "https://api.hubapi.com";

export async function GET() {
  const apiKey = process.env.HUBSPOT_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "HUBSPOT_API_KEY not set" }, { status: 500 });

  try {
    const dealsRes = await fetch(`${HS_API}/crm/v3/objects/deals?limit=50&properties=dealname,dealstage,amount,closedate,hubspot_owner_id,pipeline`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!dealsRes.ok) throw new Error(`HubSpot deals error: ${dealsRes.status}`);
    const dealsData = await dealsRes.json();

    const ownersRes = await fetch(`${HS_API}/crm/v3/owners?limit=100`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const ownersData = ownersRes.ok ? await ownersRes.json() : { results: [] };
    const ownerMap: Record<string, string> = {};
    for (const o of ownersData.results || []) {
      ownerMap[o.id] = `${o.firstName || ""} ${o.lastName || ""}`.trim();
    }

    const deals = (dealsData.results || []).map((d: any) => ({
      id: d.id,
      name: d.properties?.dealname,
      stage: d.properties?.dealstage,
      amount: d.properties?.amount ? Number(d.properties.amount) : null,
      closeDate: d.properties?.closedate,
      ownerName: ownerMap[d.properties?.hubspot_owner_id] || null,
      pipeline: d.properties?.pipeline,
    }));

    return NextResponse.json({ deals }, {
      headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (err: any) {
    console.error("HubSpot API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
