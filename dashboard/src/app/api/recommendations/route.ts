import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "CLAUDE_API_KEY not set" }, { status: 500 });
  }

  try {
    const { emails, driveComments, chatMessages } = await req.json();

    // Build a concise summary of items to analyze
    const emailSummary = (emails || []).slice(0, 8).map((e: any, i: number) =>
      `${i + 1}. From: ${e.from} | Subject: ${e.subject} | Snippet: ${e.snippet?.slice(0, 100)}`
    ).join("\n");

    const driveSummary = (driveComments || []).slice(0, 5).map((d: any, i: number) =>
      `${i + 1}. Doc: ${d.docName} | Author: ${d.author} | Comment: ${d.title?.slice(0, 100)}`
    ).join("\n");

    const chatSummary = (chatMessages || []).slice(0, 5).map((c: any, i: number) =>
      `${i + 1}. Space: ${c.spaceName} | Author: ${c.author} | Message: ${c.title?.slice(0, 100)}`
    ).join("\n");

    const prompt = `Analyze these incoming communications and recommend specific actions I should take. For each action, provide a short title (under 60 chars) and the source type.

EMAILS:
${emailSummary || "None"}

GOOGLE DRIVE COMMENTS:
${driveSummary || "None"}

GOOGLE CHAT MESSAGES:
${chatSummary || "None"}

Return a JSON array of recommended actions. Each action should have:
- "title": short actionable task description (e.g. "Reply to Pat about budget proposal", "Review Vladimir's doc comments")
- "source": "gmail" | "drive" | "chat"
- "priority": "high" | "medium" | "low"
- "reason": one-line explanation why this needs attention

Only include items that genuinely need action (replies, reviews, follow-ups). Skip notifications, confirmations, and FYI messages. Max 6 actions.

Return ONLY the JSON array, no markdown fencing.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      return NextResponse.json({ error: `Claude API: ${res.status}`, recommendations: [] }, { status: 200 });
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || "[]";

    // Parse JSON from response
    let recommendations = [];
    try {
      // Handle potential markdown fencing
      const cleaned = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      recommendations = JSON.parse(cleaned);
    } catch {
      recommendations = [];
    }

    return NextResponse.json({ recommendations }, {
      headers: { "Cache-Control": "s-maxage=600, stale-while-revalidate=1200" },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, recommendations: [] }, { status: 200 });
  }
}
