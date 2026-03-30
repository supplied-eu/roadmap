import { NextResponse } from "next/server";

const HS_API = "https://api.hubapi.com";

export async function GET() {
  const apiKey = process.env.HUBSPOT_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "HUBSPOT_API_KEY not set" }, { status: 500 });

  const headers = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };

  try {
    // Use search API to find companies with lifecyclestage = "customer"
    const searchBody = {
      filterGroups: [
        {
          filters: [
            { propertyName: "lifecyclestage", operator: "EQ", value: "customer" },
          ],
        },
      ],
      properties: [
        "name", "domain", "industry", "lifecyclestage", "hs_lead_status",
        "annualrevenue", "numberofemployees", "notes_last_updated",
        "hs_lastmodifieddate", "hubspot_owner_id", "hs_num_open_deals",
        "recent_deal_amount",
      ],
      limit: 100,
      sorts: [{ propertyName: "hs_lastmodifieddate", direction: "DESCENDING" }],
    };

    const compRes = await fetch(`${HS_API}/crm/v3/objects/companies/search`, {
      method: "POST",
      headers,
      body: JSON.stringify(searchBody),
    });

    if (!compRes.ok) {
      const errBody = await compRes.text().catch(() => "");
      throw new Error(`HubSpot companies search error: ${compRes.status} — ${errBody}`);
    }
    const compData = await compRes.json();

    // Fetch owners for name resolution
    const ownersRes = await fetch(`${HS_API}/crm/v3/owners?limit=100`, { headers });
    const ownersData = ownersRes.ok ? await ownersRes.json() : { results: [] };
    const ownerMap = new Map<string, string>();
    for (const o of ownersData.results || []) {
      ownerMap.set(o.id, `${o.firstName || ""} ${o.lastName || ""}`.trim() || o.email);
    }

    // Fetch all open deals
    const dealsRes = await fetch(`${HS_API}/crm/v3/objects/deals?limit=100&properties=dealname,dealstage,amount,closedate,hubspot_owner_id,pipeline&associations=companies`, {
      headers,
    });
    const dealsData = dealsRes.ok ? await dealsRes.json() : { results: [] };

    // Build company → deals map via associations
    const companyDealsMap = new Map<string, any[]>();
    for (const d of dealsData.results || []) {
      const assocCompanies = d.associations?.companies?.results || [];
      for (const assoc of assocCompanies) {
        const compId = assoc.id;
        if (!companyDealsMap.has(compId)) companyDealsMap.set(compId, []);
        companyDealsMap.get(compId)!.push({
          id: d.id,
          name: d.properties?.dealname,
          stage: d.properties?.dealstage,
          amount: d.properties?.amount ? Number(d.properties.amount) : null,
          closeDate: d.properties?.closedate,
          ownerName: ownerMap.get(d.properties?.hubspot_owner_id) || null,
        });
      }
    }

    const companies = (compData.results || []).map((c: any) => {
      const ownerId = c.properties?.hubspot_owner_id;
      return {
        id: c.id,
        name: c.properties?.name || "Unknown",
        domain: c.properties?.domain || null,
        industry: c.properties?.industry || null,
        lifecycle: c.properties?.lifecyclestage || null,
        leadStatus: c.properties?.hs_lead_status || null,
        revenue: c.properties?.annualrevenue ? Number(c.properties.annualrevenue) : null,
        employees: c.properties?.numberofemployees ? Number(c.properties.numberofemployees) : null,
        lastActivity: c.properties?.notes_last_updated || c.properties?.hs_lastmodifieddate || null,
        ownerName: ownerId ? ownerMap.get(ownerId) || null : null,
        ownerId: ownerId || null,
        openDeals: c.properties?.hs_num_open_deals ? Number(c.properties.hs_num_open_deals) : 0,
        deals: companyDealsMap.get(c.id) || [],
      };
    });

    // Also return owners list for assignee dropdowns
    const owners = (ownersData.results || []).map((o: any) => ({
      id: o.id,
      name: `${o.firstName || ""} ${o.lastName || ""}`.trim() || o.email,
    }));

    return NextResponse.json({ companies, owners }, {
      headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (err: any) {
    console.error("HubSpot companies API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
