import { NextResponse } from "next/server";

const HS_API = "https://api.hubapi.com";

export async function GET() {
  const apiKey = process.env.HUBSPOT_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "HUBSPOT_API_KEY not set" }, { status: 500 });

  try {
    // Fetch companies — only request standard properties to avoid 500 on missing custom props
    const compRes = await fetch(`${HS_API}/crm/v3/objects/companies?limit=100&properties=name,domain,industry,lifecyclestage,hs_lead_status,annualrevenue,numberofemployees,notes_last_updated,hs_lastmodifieddate`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!compRes.ok) {
      const errBody = await compRes.text().catch(() => "");
      throw new Error(`HubSpot companies error: ${compRes.status} — ${errBody}`);
    }
    const compData = await compRes.json();

    // Fetch deals to associate with companies
    const dealsRes = await fetch(`${HS_API}/crm/v3/objects/deals?limit=100&properties=dealname,dealstage,amount,closedate,hubspot_owner_id,associations`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const dealsData = dealsRes.ok ? await dealsRes.json() : { results: [] };

    const companies = (compData.results || []).map((c: any) => ({
      id: c.id,
      name: c.properties?.name || 'Unknown',
      domain: c.properties?.domain || null,
      industry: c.properties?.industry || null,
      lifecycle: c.properties?.lifecyclestage || null,
      leadStatus: c.properties?.hs_lead_status || null,
      revenue: c.properties?.annualrevenue ? Number(c.properties.annualrevenue) : null,
      employees: c.properties?.numberofemployees ? Number(c.properties.numberofemployees) : null,
      lastActivity: c.properties?.notes_last_updated || c.properties?.hs_lastmodifieddate || null,
    }));

    const deals = (dealsData.results || []).map((d: any) => ({
      id: d.id,
      name: d.properties?.dealname,
      stage: d.properties?.dealstage,
      amount: d.properties?.amount ? Number(d.properties.amount) : null,
      closeDate: d.properties?.closedate,
    }));

    return NextResponse.json({ companies, deals }, {
      headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (err: any) {
    console.error("HubSpot companies API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
