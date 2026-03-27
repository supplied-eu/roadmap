import { NextRequest, NextResponse } from "next/server";

async function getAccessToken(refreshToken: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh failed: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

async function fetchCalendar(accessToken: string) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2).toISOString();

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${startOfDay}&timeMax=${endOfDay}&singleEvents=true&orderBy=startTime&maxResults=20`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return [];
  const data = await res.json();

  const today = now.toISOString().split("T")[0];
  return (data.items || []).map((ev: any) => {
    const start = ev.start?.dateTime || ev.start?.date || "";
    const end = ev.end?.dateTime || ev.end?.date || "";
    const evDate = start.includes("T") ? start.split("T")[0] : start.slice(0, 10);
    return {
      id: ev.id,
      title: ev.summary || "(No title)",
      start,
      end,
      date: evDate,
      isToday: evDate === today,
      location: ev.location,
      meetLink: ev.hangoutLink,
      allDay: !ev.start?.dateTime,
    };
  });
}

async function fetchEmails(accessToken: string) {
  // Fetch recent emails from inbox
  const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10&labelIds=INBOX`;
  const listRes = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!listRes.ok) return [];
  const listData = await listRes.json();
  const messageIds = (listData.messages || []).map((m: any) => m.id);

  // Fetch each message's metadata
  const emails = await Promise.all(
    messageIds.slice(0, 8).map(async (id: string) => {
      const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return null;
      const msg = await res.json();
      const headers = msg.payload?.headers || [];
      const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || "";
      return {
        id: msg.id,
        threadId: msg.threadId,
        from: getHeader("From"),
        subject: getHeader("Subject"),
        date: getHeader("Date"),
        snippet: msg.snippet,
        unread: (msg.labelIds || []).includes("UNREAD"),
      };
    })
  );

  return emails.filter(Boolean);
}

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "Google OAuth not configured" }, { status: 500 });
  }

  // Determine which user's refresh token to use
  const user = req.nextUrl.searchParams.get("user")?.toLowerCase() || "johann";
  const tokenKey = user === "johann"
    ? "GOOGLE_REFRESH_TOKEN"
    : `GOOGLE_REFRESH_TOKEN_${user.toUpperCase()}`;
  const refreshToken = process.env[tokenKey];

  if (!refreshToken) {
    return NextResponse.json({
      calendar: [],
      emails: [],
      error: `No Google refresh token for user: ${user}`,
    });
  }

  try {
    const accessToken = await getAccessToken(refreshToken);
    const [calendar, emails] = await Promise.all([
      fetchCalendar(accessToken),
      fetchEmails(accessToken),
    ]);

    return NextResponse.json({ calendar, emails }, {
      headers: { "Cache-Control": "s-maxage=120, stale-while-revalidate=300" },
    });
  } catch (err: any) {
    console.error("Google API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
