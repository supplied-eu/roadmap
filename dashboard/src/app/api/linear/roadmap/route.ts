import { NextResponse } from "next/server";

const LINEAR_API = "https://api.linear.app/graphql";

async function linearQuery(apiKey: string, query: string) {
  const res = await fetch(LINEAR_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: apiKey },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`Linear API error: ${res.status}`);
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
    // Step 1: Fetch all projects with their issues (this is the most reliable approach)
    const { data: projData } = await linearQuery(apiKey, `{
      projects(first: 50, orderBy: updatedAt) {
        nodes {
          id
          name
          state
          color
          targetDate
          startDate
          url
          initiatives {
            nodes {
              id
              name
              color
              status
              targetDate
            }
          }
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
    }`);

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
      status: p.state || "planned",
      statusColor: p.color || "#94a3b8",
      startDate: p.startDate || null,
      targetDate: p.targetDate || null,
      url: p.url,
      issues: (p.issues?.nodes || []).map(formatIssue),
    });

    // Group projects by initiative
    const initiativeMap = new Map<string, { id: string; name: string; color: string; status: string; targetDate: string | null; projects: any[] }>();
    const orphanProjects: any[] = [];

    for (const p of (projData?.projects?.nodes || [])) {
      const inis = p.initiatives?.nodes || [];
      const formatted = formatProject(p);

      if (inis.length > 0) {
        for (const ini of inis) {
          if (!initiativeMap.has(ini.id)) {
            initiativeMap.set(ini.id, {
              id: ini.id,
              name: ini.name,
              color: ini.color || "#6366f1",
              status: ini.status || "Active",
              targetDate: ini.targetDate || null,
              projects: [],
            });
          }
          initiativeMap.get(ini.id)!.projects.push(formatted);
        }
      } else {
        orphanProjects.push(formatted);
      }
    }

    // Map project status to display-friendly status
    const statusMap: Record<string, string> = {
      planned: "Planned",
      started: "In Progress",
      paused: "Paused",
      completed: "Completed",
      canceled: "Cancelled",
      backlog: "Backlog",
    };

    const initiatives = [...initiativeMap.values()].map(ini => ({
      ...ini,
      statusColor: ini.color,
      description: "",
      projects: ini.projects.map(p => ({
        ...p,
        status: statusMap[p.status] || p.status,
      })),
    }));

    const formattedOrphans = orphanProjects.map(p => ({
      ...p,
      status: statusMap[p.status] || p.status,
    }));

    return NextResponse.json({ initiatives, orphanProjects: formattedOrphans }, {
      headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (err: any) {
    console.error("Linear roadmap API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
