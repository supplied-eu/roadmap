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
    // Step 1: Fetch initiatives + projects (lightweight, no issues)
    const [iniResult, projResult] = await Promise.all([
      linearQuery(apiKey, `{
        initiatives(first: 30) {
          nodes { id name color status targetDate }
        }
      }`),
      linearQuery(apiKey, `{
        projects(first: 30, orderBy: updatedAt) {
          nodes {
            id name color url startDate targetDate
            status { id name }
            initiatives { nodes { id } }
          }
        }
      }`),
    ]);

    const projects = projResult.data?.projects?.nodes || [];

    // Step 2: Fetch issues for each project in batches to stay under complexity limits
    // Build a single query that fetches issues by project using aliases
    const BATCH_SIZE = 5;
    const allProjectIssues = new Map<string, any[]>();

    for (let i = 0; i < projects.length; i += BATCH_SIZE) {
      const batch = projects.slice(i, i + BATCH_SIZE);
      const fragments = batch.map((p: any, idx: number) => `
        p${idx}: project(id: "${p.id}") {
          issues(first: 50, orderBy: updatedAt) {
            nodes {
              id identifier title priority
              state { name type color }
              assignee { name }
              dueDate startedAt url
              parent { id }
            }
          }
        }
      `).join("\n");

      const issueResult = await linearQuery(apiKey, `{ ${fragments} }`);

      batch.forEach((p: any, idx: number) => {
        const issues = issueResult.data?.[`p${idx}`]?.issues?.nodes || [];
        allProjectIssues.set(p.id, issues);
      });
    }

    const formatIssue = (i: any) => ({
      id: i.id,
      identifier: i.identifier,
      title: i.title,
      priority: i.priority,
      status: i.state?.name || "Unknown",
      statusType: i.state?.type || "",
      statusColor: i.state?.color || "#94a3b8",
      assignee: i.assignee?.name || null,
      start: i.startedAt || null,
      end: i.dueDate || null,
      url: i.url,
      parentId: i.parent?.id || null,
      labels: [],
    });

    const formatProject = (p: any) => ({
      id: p.id,
      name: p.name,
      status: p.status?.name || "Unknown",
      statusColor: p.color || "#94a3b8",
      startDate: p.startDate || null,
      targetDate: p.targetDate || null,
      url: p.url,
      issues: (allProjectIssues.get(p.id) || []).map(formatIssue),
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
    const initiativeMap = new Map<string, any>();
    const orphanProjects: any[] = [];

    for (const p of projects) {
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
