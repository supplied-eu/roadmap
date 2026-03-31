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
  const data = await res.json();
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  return data.access_token;
}

// Fetch recent Drive activity — files with comments, suggestions, or shares
async function fetchDriveActivity(accessToken: string) {
  const items: any[] = [];

  try {
    // Get recently modified files shared with me or that I own
    const oneWeekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const filesUrl = `https://www.googleapis.com/drive/v3/files?q=modifiedTime > '${oneWeekAgo}' and (mimeType='application/vnd.google-apps.document' or mimeType='application/vnd.google-apps.spreadsheet' or mimeType='application/vnd.google-apps.presentation')&orderBy=modifiedTime desc&pageSize=20&fields=files(id,name,modifiedTime,lastModifyingUser,webViewLink,owners,shared)`;
    const filesRes = await fetch(filesUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!filesRes.ok) {
      const err = await filesRes.text().catch(() => "");
      return { available: false, error: `Drive API: ${filesRes.status}`, items: [] };
    }

    const filesData = await filesRes.json();
    const files = filesData.files || [];

    // For each recent file, check for comments
    const commentPromises = files.slice(0, 10).map(async (file: any) => {
      try {
        const commentsUrl = `https://www.googleapis.com/drive/v3/files/${file.id}/comments?pageSize=5&fields=comments(id,content,author,createdTime,resolved,replies)`;
        const commentsRes = await fetch(commentsUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!commentsRes.ok) return null;
        const commentsData = await commentsRes.json();
        const recentComments = (commentsData.comments || [])
          .filter((c: any) => !c.resolved)
          .filter((c: any) => {
            const age = Date.now() - new Date(c.createdTime).getTime();
            return age < 7 * 86400000; // within last week
          });
        return { file, comments: recentComments };
      } catch {
        return null;
      }
    });

    const results = (await Promise.all(commentPromises)).filter(Boolean);

    for (const result of results) {
      if (!result) continue;
      const { file, comments } = result;
      for (const comment of comments) {
        items.push({
          id: `drive_${file.id}_${comment.id}`,
          type: "comment",
          title: comment.content?.slice(0, 120) || "New comment",
          docName: file.name,
          author: comment.author?.displayName || comment.author?.emailAddress || "Unknown",
          authorPhoto: comment.author?.photoLink || null,
          createdAt: comment.createdTime,
          url: file.webViewLink,
          hasReplies: (comment.replies || []).length > 0,
          replyCount: (comment.replies || []).length,
        });
      }

      // If file was modified by someone else recently and has no comments, still show it
      if (comments.length === 0 && file.lastModifyingUser && file.shared) {
        const modAge = Date.now() - new Date(file.modifiedTime).getTime();
        if (modAge < 2 * 86400000) { // within 2 days
          items.push({
            id: `drive_mod_${file.id}`,
            type: "edit",
            title: `${file.lastModifyingUser.displayName || "Someone"} edited this doc`,
            docName: file.name,
            author: file.lastModifyingUser.displayName || file.lastModifyingUser.emailAddress || "Unknown",
            authorPhoto: file.lastModifyingUser.photoLink || null,
            createdAt: file.modifiedTime,
            url: file.webViewLink,
            hasReplies: false,
            replyCount: 0,
          });
        }
      }
    }
  } catch (err: any) {
    return { available: false, error: err.message, items: [] };
  }

  // Sort by recency
  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return { available: true, items: items.slice(0, 15) };
}

// Fetch Google Chat messages — spaces and recent mentions
async function fetchChatMentions(accessToken: string) {
  const items: any[] = [];

  try {
    // List spaces the user is in
    const spacesRes = await fetch(
      "https://chat.googleapis.com/v1/spaces?pageSize=20&filter=spaceType%20%3D%20%22SPACE%22%20OR%20spaceType%20%3D%20%22GROUP_CHAT%22",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!spacesRes.ok) {
      // Try without filter (older API)
      const spacesRes2 = await fetch(
        "https://chat.googleapis.com/v1/spaces?pageSize=20",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!spacesRes2.ok) {
        const err = await spacesRes2.text().catch(() => "");
        return { available: false, error: `Chat API: ${spacesRes2.status}`, items: [] };
      }
      const spacesData = await spacesRes2.json();
      return await processChatSpaces(accessToken, spacesData.spaces || []);
    }

    const spacesData = await spacesRes.json();
    return await processChatSpaces(accessToken, spacesData.spaces || []);
  } catch (err: any) {
    return { available: false, error: err.message, items: [] };
  }
}

async function processChatSpaces(accessToken: string, spaces: any[]) {
  const items: any[] = [];
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Fetch recent messages from each space
  for (const space of spaces.slice(0, 10)) {
    try {
      const msgsUrl = `https://chat.googleapis.com/v1/${space.name}/messages?pageSize=10&orderBy=createTime desc`;
      const msgsRes = await fetch(msgsUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!msgsRes.ok) continue;
      const msgsData = await msgsRes.json();

      for (const msg of msgsData.messages || []) {
        if (!msg.createTime || new Date(msg.createTime) < new Date(oneDayAgo)) continue;
        // Check if the message mentions the user or is a direct message
        const text = msg.text || msg.formattedText || "";
        const sender = msg.sender?.displayName || "Unknown";
        const spaceName = space.displayName || space.name;

        items.push({
          id: `chat_${msg.name}`,
          type: space.type === "DM" ? "dm" : "mention",
          title: text.slice(0, 150),
          spaceName,
          author: sender,
          createdAt: msg.createTime,
          spaceUrl: `https://chat.google.com/room/${space.name?.replace("spaces/", "")}`,
        });
      }
    } catch {
      continue;
    }
  }

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return { available: true, items: items.slice(0, 15) };
}

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json({
      drive: { available: false, error: "Google OAuth not configured", items: [] },
      chat: { available: false, error: "Google OAuth not configured", items: [] },
    });
  }

  const user = req.nextUrl.searchParams.get("user")?.toLowerCase() || "johann";
  const tokenKey = user === "johann" ? "GOOGLE_REFRESH_TOKEN" : `GOOGLE_REFRESH_TOKEN_${user.toUpperCase()}`;
  const refreshToken = process.env[tokenKey];

  if (!refreshToken) {
    return NextResponse.json({
      drive: { available: false, error: `No token for ${user}`, items: [] },
      chat: { available: false, error: `No token for ${user}`, items: [] },
    });
  }

  try {
    const accessToken = await getAccessToken(refreshToken);
    const [drive, chat] = await Promise.all([
      fetchDriveActivity(accessToken),
      fetchChatMentions(accessToken),
    ]);

    return NextResponse.json({ drive, chat }, {
      headers: { "Cache-Control": "s-maxage=120, stale-while-revalidate=300" },
    });
  } catch (err: any) {
    return NextResponse.json({
      drive: { available: false, error: err.message, items: [] },
      chat: { available: false, error: err.message, items: [] },
    }, { status: 200 }); // always 200 so dashboard doesn't break
  }
}
