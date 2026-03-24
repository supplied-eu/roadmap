#!/usr/bin/env node
/**
 * fetch-hubspot.js
 * Pulls tasks and deals from HubSpot and writes hubspot-data.json
 * Requires: HUBSPOT_API_KEY environment variable (private app token)
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const API_KEY = process.env.HUBSPOT_API_KEY;

if (!API_KEY) {
  console.warn("⚠️  HUBSPOT_API_KEY not set — writing empty hubspot-data.json");
  const empty = {
    refreshedAt: new Date().toISOString(),
    currency: "€",
    portalId: null,
    owners: [],
    tasks: [],
    deals: [],
  };
  fs.writeFileSync(
    path.join(__dirname, "../hubspot-data.json"),
    JSON.stringify(empty, null, 2)
  );
  process.exit(0);
}

// ─── helpers ────────────────────────────────────────────────────────────────

function hsGet(path, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = `https://api.hubapi.com${path}${qs ? "?" + qs : ""}`;
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
      },
      (res) => {
        let body = "";
        res.on("data", (d) => (body += d));
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error(`JSON parse error for ${url}: ${e.message}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

function hsPost(path, body) {
  const url = `https://api.hubapi.com${path}`;
  const payload = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (d) => (data += d));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`JSON parse error for POST ${url}: ${e.message}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

// Paginate through all results from a CRM search endpoint
async function searchAll(objectType, requestBody) {
  const results = [];
  let after = undefined;
  do {
    const body = after
      ? { ...requestBody, after }
      : requestBody;
    const res = await hsPost(`/crm/v3/objects/${objectType}/search`, body);
    if (res.results) results.push(...res.results);
    after = res.paging?.next?.after;
  } while (after);
  return results;
}

// ─── portal info ─────────────────────────────────────────────────────────────

async function fetchPortalId() {
  console.log("→ Fetching portal info...");
  try {
    const res = await hsGet("/account-info/v3/details");
    return res.portalId ? String(res.portalId) : null;
  } catch (e) {
    console.warn("  Could not fetch portal ID:", e.message);
    return null;
  }
}

// ─── owners ─────────────────────────────────────────────────────────────────

async function fetchOwners() {
  console.log("→ Fetching owners...");
  const res = await hsGet("/crm/v3/owners", { limit: 100 });
  return (res.results || []).map((o) => ({
    id: String(o.id),
    name: [o.firstName, o.lastName].filter(Boolean).join(" ") || o.email || o.id,
    email: o.email || null,
  }));
}

// ─── tasks ───────────────────────────────────────────────────────────────────

async function fetchTasks() {
  console.log("→ Fetching tasks...");
  const raw = await searchAll("tasks", {
    filterGroups: [
      {
        filters: [
          {
            propertyName: "hs_task_status",
            operator: "NEQ",
            value: "COMPLETED",
          },
        ],
      },
    ],
    properties: [
      "hs_task_subject",
      "hs_task_status",
      "hs_task_type",
      "hs_task_priority",
      "hs_timestamp",
      "hubspot_owner_id",
      "hs_task_body",
    ],
    sorts: [{ propertyName: "hs_timestamp", direction: "ASCENDING" }],
    limit: 100,
  });

  return raw.map((t) => {
    const p = t.properties || {};
    return {
      id: t.id,
      subject: p.hs_task_subject || "(no subject)",
      status: p.hs_task_status || "NOT_STARTED",
      type: p.hs_task_type || "TODO",
      priority: p.hs_task_priority || null,
      dueDate: p.hs_timestamp ? p.hs_timestamp.split("T")[0] : null,
      ownerId: p.hubspot_owner_id ? String(p.hubspot_owner_id) : null,
      body: p.hs_task_body || null,
    };
  });
}

// ─── deals ───────────────────────────────────────────────────────────────────

const CLOSED_STAGES = new Set([
  "closedwon",
  "closedlost",
  "closed won",
  "closed lost",
]);

async function fetchDeals() {
  console.log("→ Fetching deals...");
  const raw = await searchAll("deals", {
    filterGroups: [
      {
        filters: [
          {
            propertyName: "pipeline",
            operator: "HAS_PROPERTY",
          },
        ],
      },
    ],
    properties: [
      "dealname",
      "dealstage",
      "pipeline",
      "amount",
      "closedate",
      "hubspot_owner_id",
      "hs_deal_stage_probability",
      "hs_is_closed",
      "hs_is_closed_won",
      "createdate",
      "hs_lastmodifieddate",
    ],
    sorts: [{ propertyName: "closedate", direction: "ASCENDING" }],
    limit: 200,
  });

  return raw
    .filter((d) => {
      const stage = (d.properties?.dealstage || "").toLowerCase();
      return !CLOSED_STAGES.has(stage);
    })
    .map((d) => {
      const p = d.properties || {};
      const amount = p.amount ? parseFloat(p.amount) : null;
      return {
        id: d.id,
        name: p.dealname || "(unnamed deal)",
        stage: p.dealstage || "unknown",
        pipeline: p.pipeline || null,
        amount: amount,
        closeDate:    p.closedate              ? p.closedate.split("T")[0]              : null,
        createDate:   (p.createdate||p.hs_date_entered_appointmentscheduled||p.hs_createdate)
                        ? (p.createdate||p.hs_date_entered_appointmentscheduled||p.hs_createdate).split("T")[0] : null,
        modifiedDate: p.hs_lastmodifieddate   ? p.hs_lastmodifieddate.split("T")[0]   : null,
        ownerId: p.hubspot_owner_id ? String(p.hubspot_owner_id) : null,
        probability: p.hs_deal_stage_probability
          ? parseFloat(p.hs_deal_stage_probability)
          : null,
      };
    });
}

// ─── pipeline stage labels + ordered structure ───────────────────────────────

async function fetchPipelineStages() {
  console.log("→ Fetching pipeline stages...");
  try {
    const res = await hsGet("/crm/v3/pipelines/deals");
    const stageMap = {};
    const pipelines = [];
    for (const pipeline of res.results || []) {
      const stages = (pipeline.stages || [])
        .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
        .map(s => ({
          id: s.id,
          label: s.label,
          probability: s.metadata?.probability != null ? parseFloat(s.metadata.probability) : null,
          displayOrder: s.displayOrder || 0,
        }));
      for (const s of stages) stageMap[s.id] = s.label;
      pipelines.push({ id: pipeline.id, label: pipeline.label, stages });
    }
    return { stageMap, pipelines };
  } catch (e) {
    console.warn("  Could not fetch pipeline stages:", e.message);
    return { stageMap: {}, pipelines: [] };
  }
}

// ─── contact lifecycle stage counts ─────────────────────────────────────────

async function fetchContactLifecycleCounts() {
  console.log("→ Fetching contact lifecycle stages + traffic sources...");
  const STAGES = [
    { key: "subscriber",             label: "Subscriber" },
    { key: "lead",                   label: "Lead" },
    { key: "marketingqualifiedlead", label: "MQL" },
    { key: "salesqualifiedlead",     label: "SQL" },
    { key: "opportunity",            label: "Opportunity" },
    { key: "customer",               label: "Customer" },
  ];
  // Source key → human label + icon
  const SOURCE_META = {
    ORGANIC_SEARCH:   { label: "Organic Search",  icon: "🔍" },
    PAID_SEARCH:      { label: "Paid Search",      icon: "💰" },
    SOCIAL_MEDIA:     { label: "Social Media",     icon: "📱" },
    PAID_SOCIAL:      { label: "Paid Social",      icon: "📢" },
    REFERRALS:        { label: "Referrals",        icon: "🔗" },
    DIRECT_TRAFFIC:   { label: "Direct",           icon: "🏠" },
    EMAIL_MARKETING:  { label: "Email Marketing",  icon: "📧" },
    OTHER_CAMPAIGNS:  { label: "Campaigns",        icon: "📣" },
    OFFLINE:          { label: "Offline",          icon: "📴" },
  };
  try {
    const now = Date.now();
    const oneWeekMs = 7 * 24 * 3600 * 1000;
    const thisWeekCutoff = now - oneWeekMs;
    const lastWeekCutoff = now - 2 * oneWeekMs;

    const raw = await searchAll("contacts", {
      properties: [
        "lifecyclestage",
        "hs_analytics_source",
        "hs_analytics_source_data_1",
        "hs_analytics_source_data_2",
        "createdate",
        "firstname",
        "lastname",
        "email",
      ],
      sorts: [{ propertyName: "createdate", direction: "DESCENDING" }],
      limit: 100,
    });

    // Lifecycle counts
    const counts = {};
    for (const c of raw) {
      const s = (c.properties?.lifecyclestage || "").toLowerCase();
      if (s) counts[s] = (counts[s] || 0) + 1;
    }

    // Traffic source grouping
    const sourceMap = {}; // source key → { thisWeek, lastWeek, contacts[] }
    for (const c of raw) {
      const p = c.properties || {};
      let srcKey = (p.hs_analytics_source || "").toUpperCase() || "UNKNOWN";
      // For SOCIAL_MEDIA, use data_1 to distinguish platform (LinkedIn, Facebook, etc.)
      if (srcKey === "SOCIAL_MEDIA" && p.hs_analytics_source_data_1) {
        const platform = p.hs_analytics_source_data_1.toLowerCase();
        if (platform.includes("linkedin")) srcKey = "LINKEDIN";
        else if (platform.includes("facebook") || platform.includes("instagram")) srcKey = "FACEBOOK";
        else if (platform.includes("twitter") || platform.includes("x.com")) srcKey = "TWITTER";
        else srcKey = "SOCIAL_MEDIA";
      } else if (srcKey === "ORGANIC_SEARCH" && p.hs_analytics_source_data_1) {
        // data_1 often has the search engine
        const engine = p.hs_analytics_source_data_1.toLowerCase();
        if (engine.includes("google")) srcKey = "GOOGLE_ORGANIC";
        else if (engine.includes("bing")) srcKey = "BING_ORGANIC";
      }
      if (!srcKey || srcKey === "UNKNOWN" || srcKey === "") continue;

      if (!sourceMap[srcKey]) sourceMap[srcKey] = { key: srcKey, thisWeek: 0, lastWeek: 0, contacts: [] };

      const created = p.createdate ? new Date(p.createdate).getTime() : 0;
      if (created >= thisWeekCutoff) sourceMap[srcKey].thisWeek++;
      else if (created >= lastWeekCutoff) sourceMap[srcKey].lastWeek++;

      // Keep most recent 25 contacts per source for the expanded list
      if (sourceMap[srcKey].contacts.length < 25) {
        const firstName = p.firstname || "";
        const lastName  = p.lastname  || "";
        const name = [firstName, lastName].filter(Boolean).join(" ") || p.email || "(unnamed)";
        sourceMap[srcKey].contacts.push({
          id:    c.id,
          name,
          email: p.email || null,
          stage: p.lifecyclestage || null,
          createdAt: p.createdate ? p.createdate.split("T")[0] : null,
        });
      }
    }

    // Augment sourceMap keys with friendly labels
    const SOURCE_EXTRA = {
      GOOGLE_ORGANIC: { label: "Google Search",  icon: "🔍" },
      BING_ORGANIC:   { label: "Bing Search",    icon: "🔍" },
      LINKEDIN:       { label: "LinkedIn",        icon: "💼" },
      FACEBOOK:       { label: "Facebook/Meta",   icon: "📘" },
      TWITTER:        { label: "Twitter / X",     icon: "🐦" },
    };
    const trafficSources = Object.values(sourceMap)
      .map(s => {
        const meta = SOURCE_EXTRA[s.key] || SOURCE_META[s.key] || { label: s.key.replace(/_/g," ").toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()), icon: "📊" };
        return { ...s, label: meta.label, icon: meta.icon };
      })
      .sort((a, b) => (b.thisWeek + b.lastWeek) - (a.thisWeek + a.lastWeek));

    return {
      lifecycle: STAGES.map(s => ({ ...s, count: counts[s.key] || 0 })),
      trafficSources,
    };
  } catch (e) {
    console.warn("  Could not fetch contacts:", e.message);
    return {
      lifecycle: STAGES.map(s => ({ ...s, count: 0 })),
      trafficSources: [],
    };
  }
}

// ─── closed deal stats (for funnel) ─────────────────────────────────────────

async function fetchClosedDealStats() {
  console.log("→ Fetching closed deal stats...");
  try {
    const raw = await searchAll("deals", {
      filterGroups: [{ filters: [{ propertyName: "hs_is_closed", operator: "EQ", value: "true" }] }],
      properties: ["dealstage", "pipeline", "amount", "hs_is_closed_won", "closedate"],
      sorts: [{ propertyName: "closedate", direction: "DESCENDING" }],
      limit: 200,
    });
    let wonCount = 0, wonValue = 0, lostCount = 0, lostValue = 0;
    // Only count deals closed in last 90 days for rate calculation
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 90);
    for (const d of raw) {
      const cd = d.properties?.closedate ? new Date(d.properties.closedate) : null;
      if (!cd || cd < cutoff) continue;
      const amount = d.properties?.amount ? parseFloat(d.properties.amount) : 0;
      if (d.properties?.hs_is_closed_won === "true") { wonCount++; wonValue += amount; }
      else { lostCount++; lostValue += amount; }
    }
    return { wonCount, wonValue, lostCount, lostValue };
  } catch (e) {
    console.warn("  Could not fetch closed deals:", e.message);
    return { wonCount: 0, wonValue: 0, lostCount: 0, lostValue: 0 };
  }
}

// ─── companies (account management) ─────────────────────────────────────────

async function fetchCompanies() {
  console.log("→ Fetching companies...");
  try {
    const raw = await searchAll("companies", {
      filterGroups: [{ filters: [{ propertyName: "lifecyclestage", operator: "EQ", value: "customer" }] }],
      properties: [
        "name", "domain", "lifecyclestage", "hs_lastmodifieddate",
        "notes_last_updated", "notes_last_contacted", "num_associated_contacts",
        "num_associated_deals", "annualrevenue", "hs_lead_status",
        "hubspot_owner_id", "createdate", "hs_num_open_deals",
        "recent_deal_amount", "recent_deal_close_date",
        "hs_analytics_last_visit_timestamp",
      ],
      sorts: [{ propertyName: "notes_last_contacted", direction: "ASCENDING" }],
      limit: 100,
    });
    return raw.map(c => {
      const p = c.properties || {};
      const lastContacted = p.notes_last_contacted ? p.notes_last_contacted.split("T")[0] : null;
      const lastModified  = p.hs_lastmodifieddate  ? p.hs_lastmodifieddate.split("T")[0]  : null;
      const lastVisit     = p.hs_analytics_last_visit_timestamp ? p.hs_analytics_last_visit_timestamp.split("T")[0] : null;
      const daysSinceContact = lastContacted
        ? Math.floor((Date.now() - new Date(lastContacted)) / 86400000) : null;
      return {
        id: c.id,
        name: p.name || "(unnamed)",
        domain: p.domain || null,
        ownerId: p.hubspot_owner_id ? String(p.hubspot_owner_id) : null,
        contacts: p.num_associated_contacts ? parseInt(p.num_associated_contacts) : 0,
        openDeals: p.hs_num_open_deals ? parseInt(p.hs_num_open_deals) : 0,
        recentDealAmount: p.recent_deal_amount ? parseFloat(p.recent_deal_amount) : null,
        recentDealCloseDate: p.recent_deal_close_date ? p.recent_deal_close_date.split("T")[0] : null,
        lastContacted,
        lastModified,
        lastVisit,
        daysSinceContact,
        createdAt: p.createdate ? p.createdate.split("T")[0] : null,
        leadStatus: p.hs_lead_status || null,
      };
    });
  } catch (e) {
    console.warn("  Could not fetch companies:", e.message);
    return [];
  }
}

// ─── notes for a company (last 3) ────────────────────────────────────────────

async function fetchCompanyNotes(companyId) {
  try {
    const res = await hsPost(`/crm/v3/objects/notes/search`, {
      filterGroups: [{
        filters: [{ propertyName: "associations.company", operator: "EQ", value: companyId }],
      }],
      properties: ["hs_note_body", "hs_timestamp", "hubspot_owner_id"],
      sorts: [{ propertyName: "hs_timestamp", direction: "DESCENDING" }],
      limit: 3,
    });
    return (res.results || []).map(n => ({
      body: (n.properties?.hs_note_body || "").slice(0, 200),
      date: n.properties?.hs_timestamp ? n.properties.hs_timestamp.split("T")[0] : null,
    }));
  } catch { return []; }
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🔄 Fetching HubSpot data...");

  const [portalId, owners, tasks, deals, pipelineData, contactLifecycle, closedDealStats, companies] = await Promise.all([
    fetchPortalId(),
    fetchOwners(),
    fetchTasks(),
    fetchDeals(),
    fetchPipelineStages(),
    fetchContactLifecycleCounts(),
    fetchClosedDealStats(),
    fetchCompanies(),
  ]);

  const { stageMap, pipelines } = pipelineData;

  // Build owner lookup map
  const ownerMap = {};
  for (const o of owners) ownerMap[o.id] = o.name;

  // Fetch recent notes for each company (capped at 20 to limit API calls)
  const notesResults = await Promise.all(companies.slice(0, 20).map(c => fetchCompanyNotes(c.id)));
  const enrichedCompanies = companies.map((c, i) => ({
    ...c,
    ownerName: c.ownerId ? (ownerMap[c.ownerId] || null) : null,
    notes: i < 20 ? (notesResults[i] || []) : [],
  }));

  // Enrich tasks with owner names
  const enrichedTasks = tasks.map((t) => ({
    ...t,
    ownerName: t.ownerId ? (ownerMap[t.ownerId] || null) : null,
  }));

  // Enrich deals with human-readable stage names and owner names
  const enrichedDeals = deals.map((d) => ({
    ...d,
    stageLabel: stageMap[d.stage] || d.stage,
    ownerName: d.ownerId ? (ownerMap[d.ownerId] || null) : null,
  }));

  const output = {
    refreshedAt: new Date().toISOString(),
    currency: "€",
    portalId: portalId || null,
    owners,
    tasks: enrichedTasks,
    deals: enrichedDeals,
    pipelines,
    contactLifecycle: contactLifecycle.lifecycle,
    trafficSources: contactLifecycle.trafficSources,
    closedDealStats,
    companies: enrichedCompanies,
  };

  const outPath = path.join(__dirname, "../hubspot-data.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

  console.log(
    `✅ Done — ${owners.length} owners, ${tasks.length} open tasks, ${enrichedDeals.length} open deals`
  );
  console.log(`   Saved to ${outPath}`);
}

main().catch((err) => {
  console.error("❌ fetch-hubspot.js failed:", err.message);
  // Write empty file so the dashboard doesn't 404
  const fallback = {
    refreshedAt: new Date().toISOString(),
    currency: "€",
    owners: [],
    tasks: [],
    deals: [],
    error: err.message,
  };
  fs.writeFileSync(
    path.join(__dirname, "../hubspot-data.json"),
    JSON.stringify(fallback, null, 2)
  );
  process.exit(0); // exit 0 so the workflow keeps running
});
