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

function lfGet(urlPath, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = `https://api.leadfeeder.com${urlPath}${qs ? "?" + qs : ""}`;
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: "GET",
      headers: {
        "Authorization": `Token token=${API_KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
    }, (res) => {
      let body = "";
      res.on("data", d => body += d);
      res.on("end", () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch (e) { reject(new Error(`JSON parse error for ${url}: ${e.message}\nBody: ${body.slice(0,200)}`)); }
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
  const { status, data } = await lfGet("/accounts");
  if (status !== 200) throw new Error(`Accounts fetch failed: HTTP ${status}`);
  // JSON:API: data.data is the array; legacy: data.accounts
  const accounts = data.data || data.accounts || [];
  if (!accounts.length) {
    console.log("  Raw response keys:", Object.keys(data).join(", "));
    throw new Error("No Leadfeeder accounts found");
  }
  const acct = accounts[0];
  // JSON:API puts fields in attributes; legacy puts them at top level
  const attrs = acct.attributes || acct;
  const id = acct.id || attrs.identifier;
  console.log(`  Using account: ${attrs.name || id} (id: ${id})`);
  return id;
}

// ─── fetch leads (company visitors) ──────────────────────────────────────────

async function fetchLeads(accountId, dateFrom, dateTo, page = 1) {
  const { status, data } = await lfGet(`/accounts/${accountId}/leads`, {
    date_from: dateFrom,
    date_to:   dateTo,
    sort:      "-last_visit_date",
    per_page:  100,
    page,
  });
  if (status !== 200) {
    console.warn(`  Leads fetch HTTP ${status} — body keys: ${Object.keys(data).join(", ")}`);
    return { leads: [], totalPages: 0 };
  }
  // JSON:API format: results in data.data, each item has .attributes
  const rawLeads = data.data || data.leads || [];
  // Flatten JSON:API items: merge id + attributes into a flat object
  const leads = rawLeads.map(item => {
    if (item.attributes) return { id: item.id, ...item.attributes };
    return item; // already flat (legacy format)
  });
  const meta = data.meta || {};
  const totalPages = meta.total_pages || meta.totalPages || 1;
  return { leads, totalPages };
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
  const thisWeekEnd = toISO(today);
  const thisWeekStart = toISO(daysAgo(7));
  const lastWeekStart = toISO(daysAgo(14));
  const lastWeekEnd   = toISO(daysAgo(8));

  // Fetch this week and last week in parallel
  const [thisWeekLeads, lastWeekLeads] = await Promise.all([
    fetchAllLeads(accountId, thisWeekStart, thisWeekEnd),
    fetchAllLeads(accountId, lastWeekStart, lastWeekEnd),
  ]);

  console.log(`  This week: ${thisWeekLeads.length} companies | Last week: ${lastWeekLeads.length} companies`);

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
