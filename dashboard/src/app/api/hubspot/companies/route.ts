import { NextResponse } from "next/server";

const HS_API = "https://api.hubapi.com";
const PROPS = "name,domain,industry,lifecyclestage,hs_lead_status,annualrevenue,numberofemployees,notes_last_updated,hs_lastmodifieddate,hubspot_owner_id,hs_num_open_deals";

async function fetchAllCompanies(apiKey: string) {
  const all: any[] = [];
  let after: string | null = null;
  const headers = { Authorization: `Bearer ${apiKey}` };

  // Paginate through all companies (100 per page)
  for (let page = 0; page < 10; page++) {
    const url = `${HS_API}/crm/v3/objects/companies?limit=100&properties=${PROPS}${after ? `&after=${after}` : ""}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new Error(`HubSpot companies error: ${res.status} — ${errBody}`);
    }
    const data = await res.json();
    all.push(...(data.results || []));
    after = data.paging?.next?.after || null;
    if (!after) break;
  }
  return all;
}

export async function GET() {
  const apiKey = process.env.HUBSPOT_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "HUBSPOT_API_KEY not set" }, { status: 500 });

  const headers: Record<string, string> = { Authorization: `Bearer ${apiKey}` };

  try {
    // Fetch all companies (paginated) and owners in parallel
    const [allCompanies, ownersRes, dealsRes] = await Promise.all([
      fetchAllCompanies(apiKey),
      fetch(`${HS_API}/crm/v3/owners?limit=100`, { headers }),
      fetch(`${HS_API}/crm/v3/objects/deals?limit=100&properties=dealname,dealstage,amount,closedate,hubspot_owner_id,pipeline&associations=companies`, { headers }),
    ]);

    const ownersData = ownersRes.ok ? await ownersRes.json() : { results: [] };
    const ownerMap = new Map<string, string>();
    for (const o of ownersData.results || []) {
      ownerMap.set(o.id, `${o.firstName || ""} ${o.lastName || ""}`.trim() || o.email);
    }

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

    // Filter for customers only
    const customerCompanies = allCompanies.filter((c: any) => {
      const lifecycle = (c.properties?.lifecyclestage || "").toLowerCase();
      return lifecycle === "customer";
    });

    const companies = customerCompanies.map((c: any) => {
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
