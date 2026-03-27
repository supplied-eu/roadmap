import { NextRequest, NextResponse } from "next/server";

const LINEAR_API = "https://api.linear.app/graphql";

async function linearQuery(apiKey: string, query: string, variables?: Record<string, any>) {
  const res = await fetch(LINEAR_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Linear API error: ${res.status}`);
  return res.json();
}

export async function GET(req: NextRequest) {
  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "LINEAR_API_KEY not set" }, { status: 500 });

  const email = req.nextUrl.searchParams.get("email");

  try {
    // Fetch assigned issues for the user (or all if no email)
    const assigneeFilter = email
      ? `filter: { assignee: { email: { eq: "${email}" } }, state: { type: { nin: ["completed", "canceled"] } } }`
      : `filter: { state: { type: { nin: ["completed", "canceled"] } } }`;

    const { data } = await linearQuery(apiKey, `{
      issues(${assigneeFilter}, first: 30, orderBy: updatedAt) {
        nodes {
          id
          identifier
          title
          priority
          state { name type color }
          assignee { name email }
          dueDate
          project { name }
          labels { nodes { name color } }
          updatedAt
          url
        }
      }
    }`);

    const issues = (data?.issues?.nodes || []).map((issue: any) => ({
      id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      priority: issue.priority,
      status: issue.state?.name,
      statusType: issue.state?.type,
      statusColor: issue.state?.color,
      assignee: issue.assignee?.name,
      assigneeEmail: issue.assignee?.email,
      dueDate: issue.dueDate,
      project: issue.project?.name,
      labels: issue.labels?.nodes?.map((l: any) => ({ name: l.name, color: l.color })) || [],
      updatedAt: issue.updatedAt,
      url: issue.url,
    }));

    return NextResponse.json({ issues }, {
      headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (err: any) {
    console.error("Linear API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
