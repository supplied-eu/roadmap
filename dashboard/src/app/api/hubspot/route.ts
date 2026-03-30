import { NextResponse } from "next/server";

const HS_API = "https://api.hubapi.com";

async function fetchAllTasks(apiKey: string) {
  const all: any[] = [];
  let after: string | null = null;
  const headers = { Authorization: `Bearer ${apiKey}` };

  for (let page = 0; page < 5; page++) {
    const url = `${HS_API}/crm/v3/objects/tasks?limit=100&properties=hs_task_subject,hs_task_status,hs_task_priority,hs_timestamp,hubspot_owner_id,hs_task_type,hs_task_body${after ? `&after=${after}` : ""}`;
    const res = await fetch(url, { headers }).catch(() => null);
    if (!res || !res.ok) break;
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

  try {
    // Fetch deals, owners, pipeline stages in parallel + paginated tasks
    const [dealsRes, ownersRes, pipelinesRes, taskResults] = await Promise.all([
      fetch(`${HS_API}/crm/v3/objects/deals?limit=100&properties=dealname,dealstage,amount,closedate,hubspot_owner_id,pipeline`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      }),
      fetch(`${HS_API}/crm/v3/owners?limit=100`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      }),
      fetch(`${HS_API}/crm/v3/pipelines/deals`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      }),
      fetchAllTasks(apiKey),
    ]);

    if (!dealsRes.ok) {
      const errBody = await dealsRes.text().catch(() => "");
      throw new Error(`HubSpot deals error: ${dealsRes.status} — ${errBody}`);
    }
    const dealsData = await dealsRes.json();

    // Build owner map
    const ownersData = ownersRes.ok ? await ownersRes.json() : { results: [] };
    const ownerMap: Record<string, string> = {};
    const owners: { id: string; name: string }[] = [];
    for (const o of ownersData.results || []) {
      const name = `${o.firstName || ""} ${o.lastName || ""}`.trim();
      ownerMap[o.id] = name;
      if (name) owners.push({ id: o.id, name });
    }

    // Build stage label map + pipeline structure from all pipelines
    const stageMap: Record<string, string> = {};
    const pipelines: { id: string; label: string; stages: { id: string; label: string; displayOrder: number }[] }[] = [];
    if (pipelinesRes.ok) {
      const pipelinesData = await pipelinesRes.json();
      for (const pipeline of pipelinesData.results || []) {
        const stages = (pipeline.stages || [])
          .map((s: any) => ({ id: s.id, label: s.label, displayOrder: s.displayOrder ?? 0 }))
          .sort((a: any, b: any) => a.displayOrder - b.displayOrder);
        pipelines.push({ id: pipeline.id, label: pipeline.label, stages });
        for (const stage of stages) {
          stageMap[stage.id] = stage.label;
        }
      }
    }

    const deals = (dealsData.results || []).map((d: any) => {
      const rawStage = d.properties?.dealstage || "";
      return {
        id: d.id,
        name: d.properties?.dealname,
        stage: rawStage,
        stageLabel: stageMap[rawStage] || rawStage,
        amount: d.properties?.amount ? Number(d.properties.amount) : null,
        closeDate: d.properties?.closedate,
        ownerName: ownerMap[d.properties?.hubspot_owner_id] || null,
        ownerId: d.properties?.hubspot_owner_id || null,
        pipeline: d.properties?.pipeline,
      };
    });

    // Parse paginated tasks
    const tasks = taskResults.map((t: any) => ({
      id: t.id,
      subject: t.properties?.hs_task_subject || "Untitled task",
      status: t.properties?.hs_task_status || "NOT_STARTED",
      priority: t.properties?.hs_task_priority || "NONE",
      dueDate: t.properties?.hs_timestamp || null,
      ownerId: t.properties?.hubspot_owner_id || null,
      ownerName: ownerMap[t.properties?.hubspot_owner_id] || null,
      type: t.properties?.hs_task_type || "TODO",
    }));

    return NextResponse.json({ deals, stageMap, pipelines, tasks, owners }, {
      headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (err: any) {
    console.error("HubSpot API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
