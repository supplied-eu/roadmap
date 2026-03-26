#!/usr/bin/env node
/**
 * fetch-leadfeeder.js
 * Pulls website visitor / traffic data from Leadfeeder (Dealfront) API
 * and writes leadfeeder-data.json
 *
 * Requires: LEADFEEDER_API_KEY environment variable
 *
 * API docs: https://docs.leadfeeder.com/api/
 * Auth: Token token=YOUR_KEY header
 * Base: https://api.leadfeeder.com
 */

const https = require("https");
const fs    = require("fs");
const path  = require("path");

const API_KEY = process.env.LEADFEEDER_API_KEY;
const OUT_PATH = path.join(__dirname, "../leadfeeder-data.json");

if (!API_KEY) {
  console.warn("⚠️  LEADFEEDER_API_KEY not set — writing empty leadfeeder-data.json");
  fs.writeFileSync(OUT_PATH, JSON.stringify({ refreshedAt: new Date().toISOString(), available: false }, null, 2));
  process.exit(0);
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function lfGet(urlPath, params = {}, authHeader = null) {
  const qs = new URLSearchParams(params).toString();
  const url = `https://api.leadfeeder.com${urlPath}${qs ? "?" + qs : ""}`;
  const auth = authHeader || `Token token=${API_KEY}`;
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: "GET",
      headers: {
        "Authorization": auth,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
    }, (res) => {
      let body = "";
      res.on("data", d => body += d);
      res.on("end", () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body), raw: body }); }
        catch (e) { resolve({ status: res.statusCode, data: {}, raw: body }); }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

// ISO date string helpers
function toISO(d) { return d.toISOString().split("T")[0]; }
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d; }

// ─── fetch account ID ─────────────────────────────────────────────────────────
// Leadfeeder API uses JSON:API format: { data: [{ id, type, attributes:{} }] }

async function fetchAccountId() {
  console.log("→ Fetching Leadfeeder accounts...");

  // Try both auth styles — old API uses "Token token=X", new may use "Bearer X"
  const authStyles = [
    `Token token=${API_KEY}`,
    `Bearer ${API_KEY}`,
  ];

  let lastStatus, lastRaw;
  for (const auth of authStyles) {
    const { status, data, raw } = await lfGet("/accounts", {}, auth);
    lastStatus = status; lastRaw = raw;
    console.log(`  Auth [${auth.split(" ")[0]}]: HTTP ${status}`);

    if (status !== 200) {
      console.log(`  Response (first 300): ${raw.slice(0, 300)}`);
      continue;
    }

    // Log full response shape for debugging
    console.log(`  Response keys: ${Object.keys(data).join(", ")}`);
    console.log(`  Response (first 500): ${raw.slice(0, 500)}`);

    // Handle multiple response shapes:
    // 1. JSON:API  { data: [{id, attributes:{}}] }
    // 2. Legacy    { accounts: [{identifier, name}] }
    // 3. Single    { id, name } or { identifier, name }
    let accounts = [];
    if (Array.isArray(data.data))     accounts = data.data;
    else if (Array.isArray(data.accounts)) accounts = data.accounts;
    else if (data.id || data.identifier) accounts = [data]; // single account response

    if (!accounts.length) {
      console.log("  No accounts found with this auth style, trying next...");
      continue;
    }

    const acct   = accounts[0];
    const attrs  = acct.attributes || acct;
    // Log ALL attribute keys so we can see every identifier field
    console.log(`  Account fields: ${Object.keys(attrs).join(", ")}`);
    console.log(`  acct.id=${acct.id} | attrs.identifier=${attrs.identifier} | attrs.id=${attrs.id}`);

    // Leadfeeder API: the URL slug (identifier like "supplied-eu") may be needed,
    // not the numeric id. Store both so fetchLeads can try each.
    const numericId  = acct.id || attrs.id || null;
    const slugId     = attrs.identifier || attrs.companyIdentifier || attrs.slug || null;
    const id = numericId || slugId;
    console.log(`  ✓ Account: ${attrs.name || id} (numericId: ${numericId}, slugId: ${slugId})`);
    // Stash auth style + both IDs for subsequent requests
    fetchAccountId._auth      = auth;
    fetchAccountId._numericId = numericId;
    fetchAccountId._slugId    = slugId;
    return id;
  }

  throw new Error(`No Leadfeeder accounts found (HTTP ${lastStatus}). Response: ${lastRaw.slice(0, 200)}`);
}

// ─── fetch leads (company visitors) ──────────────────────────────────────────

async function fetchLeads(accountId, dateFrom, dateTo, page = 1) {
  const auth = fetchAccountId._auth || undefined;

  // Try all combinations of account ID (numeric vs slug) and param styles
  const ids = [accountId];
  if (fetchAccountId._slugId && fetchAccountId._slugId !== accountId) ids.push(fetchAccountId._slugId);
  if (fetchAccountId._numericId && fetchAccountId._numericId !== accountId) ids.push(fetchAccountId._numericId);

  // Discovered from API errors:
  //   "Invalid page format" → needs page[number]/page[size]
  //   "Required parameter 'start_date' is missing" → needs start_date/end_date
  const paramStyles = [
    { start_date: dateFrom, end_date: dateTo, "page[size]": 100, "page[number]": page },
  ];

  for (const tryId of ids) {
  for (let si = 0; si < paramStyles.length; si++) {
    const { status, data, raw } = await lfGet(`/accounts/${tryId}/leads`, paramStyles[si], auth);

    if (status !== 200) {
      console.warn(`  [id:${tryId} style:${si===0?"A":"B"}] HTTP ${status} — ${raw.slice(0,120)}`);
      continue;
    }

    // Log on first page
    if (page === 1) {
      console.log(`  [id:${tryId} style:${si===0?"A":"B"}] keys: ${Object.keys(data).join(", ")}`);
      console.log(`  data.data: ${Array.isArray(data.data)?data.data.length+" items":"not array"} | data.leads: ${Array.isArray(data.leads)?data.leads.length+" items":"not array"}`);
      console.log(`  meta: ${JSON.stringify(data.meta||data.pagination||{})}`);
      if (!data.data && !data.leads) console.log(`  raw (first 500): ${raw.slice(0, 500)}`);
    }

    const rawLeads = data.data || data.leads || [];
    if (rawLeads.length === 0) {
      console.log(`  → 0 leads with id:${tryId} style:${si===0?"A":"B"} — trying next`);
      continue;
    }

    const leads = rawLeads.map(item => {
      if (item.attributes) return { id: item.id, ...item.attributes };
      return item;
    });
    const meta = data.meta || data.pagination || {};
    const totalPages = meta.total_pages || meta.totalPages || meta.last_page || 1;
    console.log(`  ✓ Working combo: id=${tryId} style=${si===0?"A":"B"} — ${rawLeads.length} leads`);
    return { leads, totalPages };
  } // end paramStyles loop
  } // end ids loop

  return { leads: [], totalPages: 0 };
}

async function fetchAllLeads(accountId, dateFrom, dateTo) {
  const all = [];
  const first = await fetchLeads(accountId, dateFrom, dateTo, 1);
  all.push(...first.leads);
  for (let p = 2; p <= Math.min(first.totalPages, 5); p++) {
    const { leads } = await fetchLeads(accountId, dateFrom, dateTo, p);
    all.push(...leads);
  }
  return all;
}

// ─── fetch visits per lead to get traffic source ──────────────────────────────

async function enrichLeadsWithSource(accountId, leads) {
  const auth = fetchAccountId._auth || undefined;
  console.log(`  Enriching ${leads.length} leads with visit/source data...`);
  let enriched = 0;

  // Process in batches of 5 to avoid rate limiting
  for (let i = 0; i < leads.length; i += 5) {
    const batch = leads.slice(i, i + 5);
    await Promise.all(batch.map(async (lead) => {
      if (!lead.id) return;
      try {
        const { status, data } = await lfGet(
          `/accounts/${accountId}/leads/${lead.id}/visits`,
          { "page[size]": 1, "page[number]": 1 },
          auth
        );
        if (status === 200) {
          const visits = data.data || data.visits || [];
          if (visits.length > 0) {
            const visit = visits[0];
            const attrs = visit.attributes || visit;
            lead.source   = attrs.source   || attrs.referring_source || lead.source || null;
            lead.medium   = attrs.medium   || attrs.referring_medium || lead.medium || null;
            lead.referrer = attrs.referrer  || attrs.referring_url   || lead.referrer || null;
            if (lead.source || lead.medium || lead.referrer) enriched++;
          }
        }
      } catch (e) { /* skip — don't block on individual visit errors */ }
    }));
  }
  console.log(`  ✓ Enriched ${enriched}/${leads.length} leads with source data`);
  return leads;
}

// ─── source normaliser ────────────────────────────────────────────────────────

function normaliseSource(lead) {
  // Leadfeeder lead objects often have: source, medium, campaign
  const src    = (lead.source    || "").toLowerCase().trim();
  const medium = (lead.medium    || "").toLowerCase().trim();
  const ref    = (lead.referrer  || "").toLowerCase().trim();

  if (!src && !medium && !ref) return { key: "DIRECT",  label: "Direct",          icon: "🏠" };
  if (src.includes("google") && medium.includes("cpc"))  return { key: "GOOGLE_ADS",    label: "Google Ads",        icon: "💰" };
  if (src.includes("google"))                             return { key: "GOOGLE_ORGANIC", label: "Google Search",    icon: "🔍" };
  if (src.includes("linkedin") || ref.includes("linkedin")) return { key: "LINKEDIN",    label: "LinkedIn",          icon: "💼" };
  if (src.includes("facebook") || ref.includes("facebook")) return { key: "FACEBOOK",   label: "Facebook / Meta",   icon: "📘" };
  if (medium === "email" || src.includes("email"))        return { key: "EMAIL",         label: "Email Marketing",   icon: "📧" };
  if (medium === "social" || src.includes("twitter") || ref.includes("twitter"))
                                                          return { key: "SOCIAL",        label: "Social Media",      icon: "📱" };
  if (medium === "referral" || ref)                       return { key: "REFERRAL",      label: "Referral",          icon: "🔗" };
  if (medium === "organic" || src === "organic")          return { key: "ORGANIC",       label: "Organic Search",    icon: "🔍" };
  return { key: "OTHER", label: "Other", icon: "📊" };
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🔄 Fetching Leadfeeder data...");

  const accountId = await fetchAccountId();

  const today       = new Date();
  const thisWeekEnd   = toISO(today);
  const thisWeekStart = toISO(daysAgo(14));  // 14 days = "this period" (matches Leadfeeder UI default ~30d)
  const lastWeekStart = toISO(daysAgo(28));
  const lastWeekEnd   = toISO(daysAgo(15));

  console.log(`  Date range (this period): ${thisWeekStart} → ${thisWeekEnd}`);
  console.log(`  Date range (last period): ${lastWeekStart} → ${lastWeekEnd}`);

  // Fetch this week and last week in parallel
  const [thisWeekLeads, lastWeekLeads] = await Promise.all([
    fetchAllLeads(accountId, thisWeekStart, thisWeekEnd),
    fetchAllLeads(accountId, lastWeekStart, lastWeekEnd),
  ]);

  console.log(`  This week: ${thisWeekLeads.length} companies | Last week: ${lastWeekLeads.length} companies`);

  // Enrich leads with visit-level source data (source, medium, referrer)
  await enrichLeadsWithSource(accountId, thisWeekLeads);
  await enrichLeadsWithSource(accountId, lastWeekLeads);

  // Daily breakdown (last 14 days)
  const dailyMap = {}; // "YYYY-MM-DD" → visit count
  for (const lead of [...thisWeekLeads, ...lastWeekLeads]) {
    const dates = [lead.first_visit_date, lead.last_visit_date].filter(Boolean);
    for (const d of dates) {
      const day = d.split("T")[0];
      if (!dailyMap[day]) dailyMap[day] = 0;
      dailyMap[day]++;
    }
  }
  const dailyVisits = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, visits]) => ({ date, visits }));

  // Traffic source breakdown
  const srcMapThis = {}, srcMapLast = {};
  const srcContactsThis = {}, srcContactsLast = {};

  for (const lead of thisWeekLeads) {
    const s = normaliseSource(lead);
    srcMapThis[s.key] = (srcMapThis[s.key] || { ...s, count: 0 });
    srcMapThis[s.key].count++;
    if (!srcContactsThis[s.key]) srcContactsThis[s.key] = [];
    if (srcContactsThis[s.key].length < 20) {
      const coName = lead.organization_name || lead.company_name || lead.name || "(unknown company)";
      srcContactsThis[s.key].push({
        name:      coName,
        website:   lead.website || null,
        visits:    lead.visits  || lead.visit_count || 1,
        lastVisit: (lead.last_visit_date || lead.last_visited_at || "").split("T")[0] || null,
        leadId:    lead.id || null,
        source:    s.label,
      });
    }
  }
  for (const lead of lastWeekLeads) {
    const s = normaliseSource(lead);
    srcMapLast[s.key] = (srcMapLast[s.key] || { ...s, count: 0 });
    srcMapLast[s.key].count++;
  }

  // Merge into final traffic sources array
  const allKeys = new Set([...Object.keys(srcMapThis), ...Object.keys(srcMapLast)]);
  const trafficSources = Array.from(allKeys).map(key => {
    const meta = srcMapThis[key] || srcMapLast[key];
    return {
      key,
      label:     meta.label,
      icon:      meta.icon,
      thisWeek:  (srcMapThis[key]?.count || 0),
      lastWeek:  (srcMapLast[key]?.count || 0),
      companies: srcContactsThis[key] || [],
    };
  }).sort((a, b) => b.thisWeek - a.thisWeek);

  // Top visiting companies (this week)
  const topCompanies = [...thisWeekLeads]
    .sort((a, b) => (b.page_views_count || b.page_views || b.visits || b.visit_count || 0)
                  - (a.page_views_count || a.page_views || a.visits || a.visit_count || 0))
    .slice(0, 20)
    .map(lead => ({
      name:       lead.organization_name || lead.company_name || lead.name || "(unknown)",
      website:    lead.website           || null,
      visits:     lead.visits            || lead.visit_count  || 1,
      pageViews:  lead.page_views_count  || lead.page_views   || null,
      firstVisit: (lead.first_visit_date || lead.first_visited_at || "").split("T")[0] || null,
      lastVisit:  (lead.last_visit_date  || lead.last_visited_at  || "").split("T")[0] || null,
      source:     normaliseSource(lead).label,
      leadId:     lead.id || null,
    }));

  const output = {
    refreshedAt:    new Date().toISOString(),
    available:      true,
    accountId,
    thisWeekTotal:  thisWeekLeads.length,
    lastWeekTotal:  lastWeekLeads.length,
    trafficSources,
    topCompanies,
    dailyVisits,
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2));
  console.log(`✅ Done — ${thisWeekLeads.length} leads this week, ${trafficSources.length} sources`);
  console.log(`   Saved to ${OUT_PATH}`);
}

main().catch(err => {
  console.error("❌ fetch-leadfeeder.js failed:", err.message);
  fs.writeFileSync(OUT_PATH, JSON.stringify({
    refreshedAt: new Date().toISOString(),
    available: false,
    error: err.message,
  }, null, 2));
  process.exit(0); // Don't fail the build
});
