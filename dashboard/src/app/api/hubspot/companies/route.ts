import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

const HS_API = "https://api.hubapi.com";

export async function GET() {
  const apiKey = process.env.HUBSPOT_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "HUBSPOT_API_KEY not set" }, { status: 500 });

  const headers: Record<string, string> = { Authorization: `Bearer ${apiKey}` };

  try {
    // Fetch owners and deals (these scopes work)
    const [ownersRes, dealsRes] = await Promise.all([
      fetch(`${HS_API}/crm/v3/owners?limit=100`, { headers }),
      fetch(`${HS_API}/crm/v3/objects/deals?limit=100&properties=dealname,dealstage,amount,closedate,hubspot_owner_id,pipeline`, { headers }),
    ]);

    const ownersData = ownersRes.ok ? await ownersRes.json() : { results: [] };
    const ownerMap = new Map<string, string>();
    for (const o of ownersData.results || []) {
      ownerMap.set(o.id, `${o.firstName || ""} ${o.lastName || ""}`.trim() || o.email);
    }

    const dealsData = dealsRes.ok ? await dealsRes.json() : { results: [] };
    const deals = (dealsData.results || []).map((d: any) => ({
      id: d.id,
      name: d.properties?.dealname,
      stage: d.properties?.dealstage,
      amount: d.properties?.amount ? Number(d.properties.amount) : null,
      closeDate: d.properties?.closedate,
      ownerName: ownerMap.get(d.properties?.hubspot_owner_id) || null,
      ownerId: d.properties?.hubspot_owner_id || null,
    }));

    // Try to get companies from the pre-fetched hubspot-data.json first
    // (the GitHub Actions workflow has the right scopes)
    let companies: any[] = [];
    try {
      const hsPath = join(process.cwd(), "..", "hubspot-data.json");
      const hsData = JSON.parse(readFileSync(hsPath, "utf-8"));
      if (hsData.companies && hsData.companies.length > 0) {
        companies = hsData.companies.map((c: any) => ({
          id: c.id,
          name: c.name,
          domain: c.domain || null,
          industry: null,
          lifecycle: "customer",
          leadStatus: c.leadStatus || null,
          revenue: c.recentDealAmount || null,
          employees: null,
          lastActivity: c.lastContacted || c.lastModified || null,
          ownerName: c.ownerName || null,
          ownerId: c.ownerId || null,
          openDeals: c.openDeals || 0,
          daysSinceContact: c.daysSinceContact || null,
          deals: [],
        }));
      }
    } catch {}

    // If no companies from pre-fetched data, try the live API (may fail with 403)
    if (companies.length === 0) {
      try {
        const compRes = await fetch(
          `${HS_API}/crm/v3/objects/companies?limit=100&properties=name,domain,industry,lifecyclestage,hs_lead_status,annualrevenue,numberofemployees,notes_last_updated,hs_lastmodifieddate,hubspot_owner_id`,
          { headers }
        );
        if (compRes.ok) {
          const compData = await compRes.json();
          const allCompanies = compData.results || [];
          companies = allCompanies
            .filter((c: any) => (c.properties?.lifecyclestage || "").toLowerCase() === "customer")
            .map((c: any) => {
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
                openDeals: 0,
                deals: [],
              };
            });
        }
      } catch {}
    }

    // If still no companies, derive accounts from Closed Won deals
    if (companies.length === 0) {
      const wonDeals = deals.filter((d: any) =>
        d.stage === 'closedwon' || d.stage?.toLowerCase?.()?.includes?.('closed won')
      );
      // Group by deal name prefix (company name)
      const companyMap = new Map<string, any>();
      for (const d of wonDeals) {
        // Use deal name as company name, stripping common suffixes
        let compName = d.name?.split(' - ')[0]?.split(' – ')[0]?.trim() || d.name;
        if (!companyMap.has(compName)) {
          companyMap.set(compName, {
            id: `deal_${d.id}`,
            name: compName,
            domain: null,
            industry: null,
            lifecycle: 'customer',
            leadStatus: null,
            revenue: d.amount,
            employees: null,
            lastActivity: d.closeDate,
            ownerName: d.ownerName,
            ownerId: d.ownerId,
            openDeals: 0,
            deals: [],
          });
        }
        companyMap.get(compName)!.deals.push(d);
        const existing = companyMap.get(compName)!;
        existing.revenue = (existing.revenue || 0) + (d.amount || 0);
      }
      companies = Array.from(companyMap.values());
    }

    // Associate deals with companies by matching names
    for (const comp of companies) {
      if (comp.deals && comp.deals.length > 0) continue;
      const compNameLower = comp.name?.toLowerCase() || '';
      comp.deals = deals.filter((d: any) => {
        const dealNameLower = (d.name || '').toLowerCase();
        return dealNameLower.includes(compNameLower.split(' ')[0]) ||
          compNameLower.includes(dealNameLower.split(' - ')[0]?.trim());
      });
    }

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
