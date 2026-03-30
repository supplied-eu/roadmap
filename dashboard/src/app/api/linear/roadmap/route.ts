import { NextResponse } from "next/server";

const LINEAR_API = "https://api.linear.app/graphql";

async function linearQuery(apiKey: string, query: string) {
  const res = await fetch(LINEAR_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: apiKey },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Linear API error: ${res.status} - ${body}`);
  }
  const json = await res.json();
  if (json.errors) {
    throw new Error(`Linear GraphQL error: ${JSON.stringify(json.errors)}`);
  }
  return json;
}

export async function GET() {
  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "LINEAR_API_KEY not set" }, { status: 500 });

  try {
    // Fetch initiatives and projects separately, then join in code
    // This avoids nested connection issues in Linear's GraphQL schema
    const [iniResult, projResult] = await Promise.all([
      linearQuery(apiKey, `{
        initiatives(first: 50) {
          nodes {
            id
            name
            color
            status
            targetDate
          }
        }
      }`),
      linearQuery(apiKey, `{
        projects(first: 50, orderBy: updatedAt) {
          nodes {
            id
            name
            color
            url
            startDate
            targetDate
            status { id name }
            initiatives { nodes { id } }
            issues(first: 100, orderBy: updatedAt) {
              nodes {
                id
                identifier
                title
                priority
                state { name type color }
                assignee { name }
                dueDate
                startDate
                url
                parent { id }
                labels { nodes { name color } }
              }
            }
          }
        }
      }`),
    ]);

    const formatIssue = (i: any) => ({
      id: i.id,
      identifier: i.identifier,
      title: i.title,
      priority: i.priority,
      status: i.state?.name || "Unknown",
      statusType: i.state?.type || "",
      statusColor: i.state?.color || "#94a3b8",
      assignee: i.assignee?.name || null,
      start: i.startDate || null,
      end: i.dueDate || null,
      url: i.url,
      parentId: i.parent?.id || null,
      labels: (i.labels?.nodes || []).map((l: any) => ({ name: l.name, color: l.color })),
    });

    const formatProject = (p: any) => ({
      id: p.id,
      name: p.name,
      status: p.status?.name || "Unknown",
      statusColor: p.color || "#94a3b8",
      startDate: p.startDate || null,
      targetDate: p.targetDate || null,
      url: p.url,
      issues: (p.issues?.nodes || []).map(formatIssue),
    });

    // Build initiative lookup
    const iniLookup = new Map<string, { id: string; name: string; color: string; status: string; targetDate: string | null }>();
    for (const ini of (iniResult.data?.initiatives?.nodes || [])) {
      iniLookup.set(ini.id, {
        id: ini.id,
        name: ini.name,
        color: ini.color || "#6366f1",
        status: ini.status || "Active",
        targetDate: ini.targetDate || null,
      });
    }

    // Group projects by initiative
    const initiativeMap = new Map<string, { id: string; name: string; color: string; status: string; statusColor: string; targetDate: string | null; description: string; projects: any[] }>();
    const orphanProjects: any[] = [];

    for (const p of (projResult.data?.projects?.nodes || [])) {
      const iniIds = (p.initiatives?.nodes || []).map((i: any) => i.id);
      const formatted = formatProject(p);

      if (iniIds.length > 0) {
        for (const iniId of iniIds) {
          const ini = iniLookup.get(iniId);
          if (!ini) continue;
          if (!initiativeMap.has(iniId)) {
            initiativeMap.set(iniId, {
              ...ini,
              statusColor: ini.color,
              description: "",
              projects: [],
            });
          }
          initiativeMap.get(iniId)!.projects.push(formatted);
        }
      } else {
        orphanProjects.push(formatted);
      }
    }

    const initiatives = [...initiativeMap.values()];

    return NextResponse.json({ initiatives, orphanProjects }, {
      headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (err: any) {
    console.error("Linear roadmap API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
