#!/usr/bin/env node
/**
 * fetch-google.js
 * Fetches Gmail (recent threads), Google Calendar (today + upcoming),
 * and Google Drive (recently modified files) and writes google-data.json.
 *
 * Requires these GitHub Secrets (set under repo Settings → Secrets → Actions):
 *   GOOGLE_CLIENT_ID      — OAuth2 client ID
 *   GOOGLE_CLIENT_SECRET  — OAuth2 client secret
 *   GOOGLE_REFRESH_TOKEN  — long-lived refresh token for the account
 *
 * How to get credentials:
 *   1. Go to console.cloud.google.com → create a project
 *   2. Enable Gmail API, Calendar API, Drive API
 *   3. Create OAuth2 credentials (Desktop app)
 *   4. Run the one-time auth flow (see README or use OAuth Playground) to get
 *      a refresh token with scopes:
 *        https://www.googleapis.com/auth/gmail.readonly
 *        https://www.googleapis.com/auth/calendar.readonly
 *        https://www.googleapis.com/auth/drive.readonly
 *   5. Add CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN as GitHub Secrets
 *
 * If credentials are missing, writes a minimal stub and exits 0 so the
 * build never fails because of missing Google credentials.
 */

const https = require("https");
const fs    = require("fs");
const path  = require("path");

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

// Support per-user mode: node fetch-google.js --user johann
// Writes google-data-{user}.json instead of google-data.json
const userArg = process.argv.find(a => a.startsWith("--user="));
const USER_NAME = userArg ? userArg.split("=")[1].toLowerCase() : null;
const OUT_FILE = USER_NAME
  ? path.join(__dirname, `../google-data-${USER_NAME}.json`)
  : path.join(__dirname, "../google-data.json");

// ── Graceful no-op if credentials not set ────────────────────────────────────
if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
  console.warn("⚠️  GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN not set");
  console.warn("   Google data (Gmail, Calendar, Drive) will NOT be refreshed.");
  console.warn("   Set these secrets in GitHub → Settings → Secrets & variables → Actions");

  // Preserve existing file if it exists; otherwise write empty stub
  if (!fs.existsSync(OUT_FILE)) {
    fs.writeFileSync(OUT_FILE, JSON.stringify({
      refreshedAt: new Date().toISOString(),
      gmail: { threads: [], unreadCount: 0 },
      calendar: { today: [], upcoming: [] },
      drive: { recent: [] },
      email_priorities: [],
      drive_priorities: [],
      task_priorities: [],
    }, null, 2));
    console.log("  Wrote empty google-data.json stub.");
  } else {
    console.log("  Keeping existing google-data.json untouched.");
  }
  process.exit(0);
}

// ── HTTP helper ───────────────────────────────────────────────────────────────
function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let data = "";
      res.on("data", d => data += d);
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function get(url, token) {
  const u = new URL(url);
  return request({
    hostname: u.hostname,
    path: u.pathname + u.search,
    method: "GET",
    headers: { Authorization: "Bearer " + token, Accept: "application/json" },
  });
}

// ── Step 1: exchange refresh token for access token ──────────────────────────
async function getAccessToken() {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: REFRESH_TOKEN,
    grant_type: "refresh_token",
  }).toString();

  const res = await request({
    hostname: "oauth2.googleapis.com",
    path: "/token",
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": Buffer.byteLength(body),
    },
  }, body);

  if (!res.body.access_token) {
    const err = res.body.error || "unknown";
    const desc = res.body.error_description || "";
    console.error(`❌ Google auth failed (${err}): ${desc}`);
    console.error("   Check GOOGLE_REFRESH_TOKEN secret — it may be expired or invalid.");
    console.error("   Keeping existing google-data.json untouched.");
    process.exit(0); // exit 0 so the workflow doesn't fail
  }
  console.log("✅ Got Google access token");
  return res.body.access_token;
}

// ── Step 2: Fetch Gmail ───────────────────────────────────────────────────────
async function fetchGmail(token) {
  console.log("📧 Fetching Gmail threads…");

  // Get list of recent unread message IDs from inbox
  const listUrl = "https://gmail.googleapis.com/gmail/v1/users/me/messages?" +
    new URLSearchParams({
      labelIds: "INBOX",
      q: "is:unread",
      maxResults: "50",
    });

  const listRes = await get(listUrl, token);
  if (listRes.status !== 200) {
    console.warn("  Gmail list failed:", listRes.status, JSON.stringify(listRes.body).slice(0,200));
    return { threads: [], unreadCount: 0 };
  }

  const messages = listRes.body.messages || [];
  const unreadCount = listRes.body.resultSizeEstimate || messages.length;
  console.log(`  Found ${messages.length} unread messages`);

  // Fetch metadata for each (in parallel, capped at 15)
  const toFetch = messages.slice(0, 15);
  const threads = [];

  await Promise.all(toFetch.map(async msg => {
    // metadataHeaders must be repeated params, NOT comma-joined (Gmail API rejects single value)
    const msgParams = new URLSearchParams({ format: "metadata", fields: "id,threadId,snippet,labelIds,internalDate,payload/headers" });
    ["Subject", "From", "Date"].forEach(h => msgParams.append("metadataHeaders", h));
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?` + msgParams;
    const r = await get(url, token);
    if (r.status !== 200) return;
    const m = r.body;

    const headers = {};
    for (const h of (m.payload?.headers || [])) {
      headers[h.name.toLowerCase()] = h.value;
    }

    threads.push({
      id: m.threadId || m.id,
      subject: headers.subject || "(no subject)",
      from: headers.from || "",
      date: headers.date ? new Date(headers.date).toISOString() : null,
      snippet: m.snippet || "",
      url: `https://mail.google.com/mail/u/0/#inbox/${m.threadId || m.id}`,
      unread: (m.labelIds || []).includes("UNREAD"),
    });
  }));

  // Sort by date desc, dedupe by threadId
  const seen = new Set();
  const deduped = threads
    .filter(t => { if (seen.has(t.id)) return false; seen.add(t.id); return true; })
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, 12);

  console.log(`  ✅ Gmail: ${deduped.length} threads`);
  return { threads: deduped, unreadCount };
}

// ── Step 3: Fetch Calendar ────────────────────────────────────────────────────
async function fetchCalendar(token) {
  console.log("📅 Fetching Calendar…");

  const now   = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999);
  const weekEnd    = new Date(now); weekEnd.setDate(weekEnd.getDate() + 14);

  const params = new URLSearchParams({
    timeMin: todayStart.toISOString(),
    timeMax: weekEnd.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "30",
    fields: "items(id,summary,start,end,location,attendees,htmlLink)",
  });
  const url = "https://www.googleapis.com/calendar/v3/calendars/primary/events?" + params;
  const res = await get(url, token);

  if (res.status !== 200) {
    console.warn("  Calendar fetch failed:", res.status, JSON.stringify(res.body).slice(0,200));
    return { today: [], upcoming: [] };
  }

  const items = res.body.items || [];
  const todayEvents = [];
  const upcomingEvents = [];

  for (const ev of items) {
    const startStr = ev.start?.dateTime || ev.start?.date;
    const endStr   = ev.end?.dateTime   || ev.end?.date;
    const startDate = startStr ? new Date(startStr) : null;
    const isAllDay  = !ev.start?.dateTime;

    const entry = {
      id: ev.id,
      title: ev.summary || "(no title)",
      start: startStr || null,
      end: endStr || null,
      location: ev.location || null,
      numAttendees: (ev.attendees || []).length,
      url: ev.htmlLink || null,
      allDay: isAllDay,
    };

    if (startDate && startDate <= todayEnd) {
      todayEvents.push(entry);
    } else {
      upcomingEvents.push(entry);
    }
  }

  console.log(`  ✅ Calendar: ${todayEvents.length} today, ${upcomingEvents.length} upcoming`);
  return {
    today: todayEvents,
    upcoming: upcomingEvents.slice(0, 10),
  };
}

// ── Step 4: Fetch Drive ───────────────────────────────────────────────────────
async function fetchDrive(token) {
  console.log("📄 Fetching Drive…");

  const params = new URLSearchParams({
    q: "trashed = false",
    orderBy: "viewedByMeTime desc",
    pageSize: "12",
    fields: "files(id,name,mimeType,modifiedTime,viewedByMeTime,webViewLink,lastModifyingUser/displayName)",
  });
  const url = "https://www.googleapis.com/drive/v3/files?" + params;
  const res = await get(url, token);

  if (res.status !== 200) {
    console.warn("  Drive fetch failed:", res.status, JSON.stringify(res.body).slice(0,200));
    return { recent: [] };
  }

  const files = (res.body.files || []).map(f => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    modifiedTime: f.modifiedTime,
    url: f.webViewLink,
    lastModifiedBy: f.lastModifyingUser?.displayName || "",
  }));

  console.log(`  ✅ Drive: ${files.length} recent files`);
  return { recent: files };
}

// ── Step 5: Auto-generate email priorities from fresh Gmail threads ───────────
function deriveEmailPriorities(threads) {
  const REPLY_PATTERNS = [
    /waiting for (your|you)/i, /can you (confirm|review|check|advise|let me know)/i,
    /need your (input|feedback|decision|call|approval)/i, /what do you think/i,
    /when (can|will|are) you/i, /please (respond|reply|confirm|review)/i,
    /\?\s*$/, /your (call|decision|thoughts)/i,
    /tagged you/i, /assigned to you/i, /1000 euro|400.*day|per day|flat rate|pricing/i,
    // Scheduling & meetings
    /schedule (a )?(call|meeting|session|demo|interview)/i,
    /book (a )?(call|meeting|slot|time)/i,
    /earliest convenience/i, /let me know (your|a good) time/i,
    /are you (free|available)/i, /can we (meet|talk|connect|jump on)/i,
    /set up a (call|meeting)/i, /catch up (this|next) week/i,
    // Action requests
    /action required/i, /fill in|fill out/i, /complete (the|your)/i,
    /asap|as soon as possible/i, /by end of (day|week|month)/i,
    /deadline|due (by|date|today|tomorrow)/i,
    /questionnaire|proposal|contract|agreement|sign/i,
    /please (send|share|provide|submit|upload)/i,
    /your (approval|sign-off|signature|response)/i,
    /awaiting your/i, /pending your/i,
    // Partnership / business
    /partnership|collaboration|introduce|introduction/i,
    /candidate|profile|applicant/i,
    /invoice|payment|quote|renewal/i,
  ];
  const ALERT_PATTERNS = [
    /error|fail(ed|ing)|critical|urgent|broken|down|outage|issue/i,
    /warning|alert|attention required/i,
    /out of office (starting|from) (today|tomorrow|this)/i,
    /last chance|final (reminder|notice)/i,
  ];
  const FOLLOWUP_PATTERNS = [
    /cancelled|cancel(l?ed)?/i, /no (reply|response)/i, /following up/i,
    /just checking|any update|circling back|touching base/i,
    /haven.t heard|still waiting/i,
  ];

  // Threads where the latest message signals no action needed
  const RESOLVED_PATTERNS = [
    /marked as resolved/i, /\bresolved\b/i, /\bclosed\b/i,
    /no action (needed|required)/i, /disregard|never ?mind|ignore this/i,
    /thanks,? (that.s|this is) (all|done|sorted|great|perfect)/i,
    /all (done|sorted|good|set)/i, /got it,? thanks/i,
    /will (handle|take care of|sort) (it|this)/i,
    /i.ve (done|handled|sorted|sent|replied|updated|fixed|completed)/i,
    /already (done|sent|replied|handled|sorted|fixed|completed)/i,
    /out of office/i, /on (vacation|holiday|leave)/i,
  ];

  const now = Date.now();
  const priorities = [];

  for (const t of threads) {
    const text = (t.subject + " " + t.snippet).toLowerCase();
    const ageMs = now - new Date(t.date || 0).getTime();
    const ageDays = Math.floor(ageMs / 86400000);

    // Skip very old threads (>30 days)
    if (ageDays > 30) continue;

    // Skip threads where the latest message signals resolution
    if (RESOLVED_PATTERNS.some(p => p.test(text))) continue;

    let action = null;
    let reason = "";

    if (ALERT_PATTERNS.some(p => p.test(text))) {
      action = "alert";
      reason = t.snippet ? t.snippet.slice(0, 120) : "Needs attention";
    } else if (REPLY_PATTERNS.some(p => p.test(text))) {
      action = "reply";
      reason = t.snippet ? t.snippet.slice(0, 120) : "Reply needed";
    } else if (FOLLOWUP_PATTERNS.some(p => p.test(text))) {
      action = "followup";
      reason = t.snippet ? t.snippet.slice(0, 120) : "Follow up needed";
    } else if (t.unread && ageDays <= 7) {
      // Unread within a week gets flagged as reply
      action = "reply";
      reason = t.snippet ? t.snippet.slice(0, 120) : "Unread message";
    }

    if (action) {
      priorities.push({
        action,
        subject: t.subject,
        reason,
        from: t.from || "",
        ageDays,
        threadId: t.id,
        url: t.url,
        id: "email-" + t.id,
      });
    }
  }

  // Sort: alerts first, then replies, then followups; within each by age asc
  const ORDER = { alert: 0, reply: 1, followup: 2 };
  priorities.sort((a, b) => (ORDER[a.action] - ORDER[b.action]) || (a.ageDays - b.ageDays));

  console.log(`  ✅ Derived ${priorities.length} email priorities from ${threads.length} threads`);
  return priorities.slice(0, 12);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const token = await getAccessToken();

  const [gmail, calendar, drive] = await Promise.all([
    fetchGmail(token),
    fetchCalendar(token),
    fetchDrive(token),
  ]);

  // Auto-generate email priorities from fresh threads (always current)
  const email_priorities = deriveEmailPriorities(gmail.threads || []);

  // Preserve drive/task priorities (still need manual curation)
  let drive_priorities = [];
  let task_priorities  = [];
  if (fs.existsSync(OUT_FILE)) {
    try {
      const existing = JSON.parse(fs.readFileSync(OUT_FILE, "utf8"));
      drive_priorities = existing.drive_priorities  || [];
      task_priorities  = existing.task_priorities   || [];
    } catch (_) {}
  }

  const output = {
    refreshedAt: new Date().toISOString(),
    gmail,
    calendar,
    drive,
    email_priorities,
    drive_priorities,
    task_priorities,
  };

  fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2));
  console.log(`\n✅ google-data.json written (${Math.round(fs.statSync(OUT_FILE).size / 1024)}KB)`);
}

main().catch(err => {
  console.error("fetch-google.js failed:", err.message || err);
  console.error("   Keeping existing google-data.json untouched.");
  process.exit(0); // exit 0 so the workflow doesn't fail
});
