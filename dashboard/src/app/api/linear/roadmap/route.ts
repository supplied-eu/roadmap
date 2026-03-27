import { NextResponse } from "next/server";

const LINEAR_API = "https://api.linear.app/graphql";

async function linearQuery(apiKey: string, query: string) {
  const res = await fetch(LINEAR_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: apiKey },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`Linear API error: ${res.status}`);
  return res.json();
}

export async function GET() {
  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "LINEAR_API_KEY not set" }, { status: 500 });

  try {
    // Fetch initiatives with projects and issues
    const { data: iniData } = await linearQuery(apiKey, `{
      initiatives(first: 50) {
        nodes {
          id name description status { name type color }
          targetDate
          projects(first: 50) {
            nodes {
              id name status { name type color }
              targetDate startDate url
              issues(first: 100, orderBy: updatedAt) {
                nodes {
                  id identifier title priority
                  state { name type color }
                  assignee { name }
                  dueDate startDate
                  url
                  parent { id }
                  labels { nodes { name color } }
                }
              }
            }
          }
        }
      }
    }`);

    // Also fetch projects not under any initiative
    const { data: projData } = await linearQuery(apiKey, `{
      projects(first: 50, orderBy: updatedAt) {
        nodes {
          id name status { name type color }
          targetDate startDate url
          initiatives(first: 1) { nodes { id } }
          issues(first: 100, orderBy: updatedAt) {
            nodes {
              id identifier title priority
              state { name type color }
              assignee { name }
              dueDate startDate
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
      status: i.state?.name,
      statusType: i.state?.type,
      statusColor: i.state?.color,
      assignee: i.assignee?.name || null,
      start: i.startDate || null,
      end: i.dueDate || null,
      url: i.url,
      parentId: i.parent?.id || null,
      labels: i.labels?.nodes?.map((l: any) => ({ name: l.name, color: l.color })) || [],
    });

    const formatProject = (p: any) => ({
      id: p.id,
      name: p.name,
      status: p.status?.name,
      statusColor: p.status?.color,
      startDate: p.startDate || null,
      targetDate: p.targetDate || null,
      url: p.url,
      issues: (p.issues?.nodes || []).map(formatIssue),
    });

    const initiatives = (iniData?.initiatives?.nodes || []).map((ini: any) => ({
      id: ini.id,
      name: ini.name,
      description: ini.description,
      status: ini.status?.name,
      statusColor: ini.status?.color,
      targetDate: ini.targetDate || null,
      projects: (ini.projects?.nodes || []).map(formatProject),
    }));

    // Find orphan projects (not in any initiative)
    const iniProjectIds = new Set<string>();
    for (const ini of initiatives) {
      for (const p of ini.projects) iniProjectIds.add(p.id);
    }
    const orphanProjects = (projData?.projects?.nodes || [])
      .filter((p: any) => !p.initiatives?.nodes?.length && !iniProjectIds.has(p.id))
      .map(formatProject);

    return NextResponse.json({ initiatives, orphanProjects }, {
      headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (err: any) {
    console.error("Linear roadmap API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
