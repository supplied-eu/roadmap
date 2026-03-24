#!/usr/bin/env node
/**
 * build-html.js
 * Builds the self-contained index.html for the Supplied Product & Operations Dashboard.
 * Tab 1: Customer & Product Roadmap (Linear)
 * Tab 2: Sales & Operations (HubSpot)
 */

const fs   = require("fs");
const path = require("path");

const ganttDataPath  = path.join(__dirname, "..", "gantt-data.json");
const hubspotPath    = path.join(__dirname, "..", "hubspot-data.json");
const outPath        = path.join(__dirname, "..", "index.html");

if (!fs.existsSync(ganttDataPath)) {
  console.error("gantt-data.json not found. Run fetch-linear.js first.");
  process.exit(1);
}
try { JSON.parse(fs.readFileSync(ganttDataPath, "utf8")); }
catch(e) { console.error("gantt-data.json is invalid JSON:", e.message); process.exit(1); }

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Supplied · Product & Operations Dashboard</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&display=swap" rel="stylesheet">
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MCA0MCI+PGNpcmNsZSBjeD0iMTAiIGN5PSIxMSIgcj0iNiIgZmlsbD0iIzZjNjNmNyIvPjxjaXJjbGUgY3g9IjI1IiBjeT0iOSIgcj0iOCIgZmlsbD0iIzZjNjNmNyIvPjxjaXJjbGUgY3g9IjE0IiBjeT0iMjciIHI9IjgiIGZpbGw9IiM2YzYzZjciLz48Y2lyY2xlIGN4PSIyOSIgY3k9IjI5IiByPSI1IiBmaWxsPSIjNmM2M2Y3Ii8+PC9zdmc+"/>
<style>
:root {
  --bg: #f8fafc;
  --surface: #ffffff;
  --surface2: #f1f5f9;
  --border: #e2e8f0;
  --border2: #cbd5e1;
  --text: #0f172a;
  --text-muted: #64748b;
  --text-dim: #94a3b8;
  --accent: #3b82f6;
  --lw: 400px;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; }
body {
  font-family: 'DM Mono', monospace;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  overflow-x: hidden;
}
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }

/* ── HEADER ─────────────────────────────────────────────────────────────── */
.header {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  padding: 0 20px;
  display: flex;
  align-items: stretch;
  gap: 0;
  position: sticky; top: 0; z-index: 50;
  min-height: 48px;
}
.header-logo {
  font-family: 'Syne', sans-serif;
  font-size: 16px; font-weight: 800;
  color: var(--text);
  letter-spacing: -0.5px;
  display: flex; align-items: center; gap: 7px;
  padding: 0 20px 0 0;
  border-right: 1px solid var(--border);
  flex-shrink: 0;
}
.header-tabs {
  display: flex; align-items: stretch; gap: 0;
  flex: 1;
}
.tab-btn {
  font-family: 'DM Mono', monospace;
  font-size: 10px; letter-spacing: 0.5px;
  color: var(--text-muted);
  background: none; border: none;
  border-bottom: 2px solid transparent;
  padding: 0 18px;
  cursor: pointer; white-space: nowrap;
  display: flex; align-items: center; gap: 6px;
  transition: color 0.15s, border-color 0.15s;
  margin-bottom: -1px;
}
.tab-btn:hover { color: var(--text); }
.tab-btn.active { color: var(--accent); border-bottom-color: var(--accent); }
.tab-btn .tab-icon { font-size: 12px; }
.header-right {
  margin-left: auto; display: flex; align-items: center; gap: 10px;
  flex-shrink: 0; padding-left: 16px;
}
.refresh-badge {
  font-size: 9px; color: var(--text-muted);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 3px 8px;
  letter-spacing: 0.5px;
}
.refresh-badge .dot {
  display: inline-block; width: 5px; height: 5px;
  border-radius: 50%; background: #10b981;
  margin-right: 5px; vertical-align: middle;
  animation: pulse 2s infinite;
}
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
.refresh-btn {
  font-size: 9px; color: var(--text-muted);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 3px 10px;
  letter-spacing: 0.5px;
  cursor: pointer;
  font-family: 'DM Mono', monospace;
  display: flex; align-items: center; gap: 5px;
  transition: border-color 0.15s, color 0.15s;
}
.refresh-btn:hover { border-color: var(--accent); color: var(--accent); }
.refresh-btn .spin { display: inline-block; }
.refresh-btn.loading .spin { animation: spin 0.7s linear infinite; }
.refresh-btn.running { border-color: #f59e0b; color: #f59e0b; }
.refresh-btn.done    { border-color: #10b981; color: #10b981; }
@keyframes spin { to { transform: rotate(360deg); } }
.pat-overlay {
  display: none; position: fixed; inset: 0; background: rgba(0,0,0,.6);
  z-index: 9999; align-items: center; justify-content: center;
}
.pat-overlay.open { display: flex; }
.pat-modal {
  background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
  padding: 24px; width: 420px; max-width: 90vw;
}
.pat-modal-title { font-size: 11px; font-weight: 700; letter-spacing: .8px; color: var(--text); margin-bottom: 8px; }
.pat-modal-desc  { font-size: 10px; color: var(--text-dim); margin-bottom: 14px; line-height: 1.6; }
.pat-modal-desc a { color: var(--accent); text-decoration: none; }
.pat-modal-desc code { background: var(--bg); border: 1px solid var(--border); border-radius: 3px; padding: 0 4px; font-size: 9px; }
.pat-modal input {
  width: 100%; box-sizing: border-box;
  background: var(--bg); border: 1px solid var(--border); border-radius: 4px;
  color: var(--text); font-family: 'DM Mono', monospace; font-size: 10px;
  padding: 7px 10px; margin-bottom: 10px; outline: none;
}
.pat-modal input:focus { border-color: var(--accent); }
.pat-modal-actions { display: flex; gap: 8px; justify-content: flex-end; align-items: center; }
.pat-btn {
  font-size: 9px; letter-spacing: .5px; padding: 5px 14px; border-radius: 4px;
  cursor: pointer; font-family: 'DM Mono', monospace; border: 1px solid var(--border);
  background: var(--bg); color: var(--text-dim);
}
.pat-btn.primary { background: var(--accent); color: #fff; border-color: var(--accent); }
.pat-status { font-size: 9px; color: var(--text-dim); min-height: 13px; flex: 1; }

/* ── ALERT BAR (shared) ─────────────────────────────────────────────────── */
.alert-bar {
  background: var(--surface);
  border-bottom: 2px solid var(--border);
  padding: 8px 20px;
  display: flex; gap: 6px; align-items: center;
  overflow-x: auto;
}
.alert-section-label {
  font-size: 8px; color: var(--text-dim);
  letter-spacing: 1.2px; white-space: nowrap;
  margin-right: 4px; flex-shrink: 0;
}
.alert-badge {
  display: flex; align-items: center; gap: 8px;
  padding: 5px 12px; border-radius: 5px;
  font-size: 9px; cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s; white-space: nowrap;
  font-family: 'DM Mono', monospace;
  letter-spacing: 0.3px;
  user-select: none; flex-shrink: 0;
  background: inherit;
}
.alert-badge:hover { opacity: 0.85; transform: translateY(-1px); }
.alert-badge.active { border-color: currentColor !important; }
.badge-urgent  { color: #ef4444; background: rgba(239,68,68,0.08); }
.badge-urgent.active  { background: rgba(239,68,68,0.15); }
.badge-high    { color: #f97316; background: rgba(249,115,22,0.08); }
.badge-high.active    { background: rgba(249,115,22,0.15); }
.badge-overdue { color: #f59e0b; background: rgba(245,158,11,0.08); }
.badge-overdue.active { background: rgba(245,158,11,0.15); }
.badge-today   { color: #3b82f6; background: rgba(59,130,246,0.08); }
.badge-today.active   { background: rgba(59,130,246,0.15); }
.badge-week    { color: #8b5cf6; background: rgba(139,92,246,0.08); }
.badge-week.active    { background: rgba(139,92,246,0.15); }
.badge-clear   { color: var(--text-muted); background: var(--bg); border: 1px solid var(--border) !important; font-size: 8px; }
.alert-num     { font-size: 16px; font-weight: 700; line-height: 1; }
.alert-lbl     { font-size: 8px; letter-spacing: 0.8px; }
.alert-divider { width: 1px; height: 22px; background: var(--border); flex-shrink: 0; margin: 0 2px; }
.alert-all-clear { font-size: 10px; color: #10b981; display: flex; align-items: center; gap: 6px; }
.filter-notice { font-size: 8px; color: var(--text-muted); margin-left: auto; white-space: nowrap; flex-shrink: 0; letter-spacing: 0.5px; }

/* ── PRIORITY / OVERDUE TAGS (shared) ───────────────────────────────────── */
.pri-tag {
  font-size: 7px; border-radius: 2px;
  padding: 1px 4px; flex-shrink: 0;
  white-space: nowrap; letter-spacing: 0.5px;
  font-weight: 600; line-height: 1.5;
}
.pri-urgent { color: #ef4444; background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.3); }
.pri-high   { color: #f97316; background: rgba(249,115,22,0.12); border: 1px solid rgba(249,115,22,0.3); }
.overdue-tag {
  font-size: 7px; border-radius: 2px; padding: 1px 4px; flex-shrink: 0;
  white-space: nowrap; letter-spacing: 0.5px; font-weight: 600; line-height: 1.5;
  color: #f59e0b; background: rgba(245,158,11,0.12); border: 1px solid rgba(245,158,11,0.3);
  animation: overdueFlash 2.5s ease-in-out infinite;
}
.today-tag {
  font-size: 7px; border-radius: 2px; padding: 1px 4px; flex-shrink: 0;
  white-space: nowrap; letter-spacing: 0.5px; font-weight: 600; line-height: 1.5;
  color: #3b82f6; background: rgba(59,130,246,0.12); border: 1px solid rgba(59,130,246,0.3);
}
@keyframes overdueFlash { 0%,100%{opacity:1} 50%{opacity:0.5} }

/* ── ROW PRIORITY HIGHLIGHTS ─────────────────────────────────────────────── */
@keyframes urgentPulse {
  0%,100% { box-shadow: inset 3px 0 0 rgba(239,68,68,0.5); }
  50%     { box-shadow: inset 3px 0 0 rgba(239,68,68,1); background: rgba(239,68,68,0.04); }
}
.row.row-urgent { animation: urgentPulse 1.6s ease-in-out infinite; }
.row.row-urgent:hover { background: rgba(239,68,68,0.08) !important; }
.row.row-high   { box-shadow: inset 3px 0 0 rgba(249,115,22,0.5); }
.row.row-high:hover   { background: rgba(249,115,22,0.05) !important; }
.row.row-overdue { box-shadow: inset 3px 0 0 rgba(245,158,11,0.5); }
.bar-overdue::after {
  content: ''; position: absolute; inset: 0;
  background: repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(255,255,255,0.2) 4px, rgba(255,255,255,0.2) 6px);
  border-radius: 3px; pointer-events: none;
}

/* ── TAB PANELS ─────────────────────────────────────────────────────────── */
.tab-panel { display: none; }
.tab-panel.active { display: block; }
#panel-roadmap.active { display: flex; flex-direction: column; }

/* ── LEGEND ─────────────────────────────────────────────────────────────── */
.legend {
  background: var(--surface2);
  border-bottom: 1px solid var(--border);
  padding: 6px 20px;
  display: flex; gap: 14px; flex-wrap: wrap; align-items: center;
}
.legend-item { display: flex; align-items: center; gap: 4px; font-size: 9px; color: var(--text-muted); }
.legend-swatch { width: 10px; height: 10px; border-radius: 2px; flex-shrink: 0; }
.legend-today  { display: flex; align-items: center; gap: 4px; font-size: 9px; color: #ef4444; }
.legend-today-line { width: 2px; height: 10px; background: #ef4444; }
.legend-hint { margin-left: auto; font-size: 9px; color: var(--text-dim); }

/* ── GANTT LAYOUT ───────────────────────────────────────────────────────── */
.gantt-outer {
  display: flex; height: calc(100vh - 160px); overflow: hidden;
}
.gantt-wrapper { overflow: auto; flex: 1; height: 100%; }
.gantt-insights-panel {
  width: 300px; min-width: 300px; border-left: 1px solid var(--border);
  overflow-y: auto; background: var(--surface); height: 100%;
  display: flex; flex-direction: column;
}
.gantt-insights-hdr {
  font-size: 8px; letter-spacing: 1.5px; color: var(--text-dim);
  padding: 10px 14px 8px; border-bottom: 1px solid var(--border);
  background: var(--surface2); position: sticky; top: 0; z-index: 5;
  flex-shrink: 0;
}
.gi-section { padding: 12px 14px 6px; border-bottom: 1px solid var(--border); }
.gi-section:last-child { border-bottom: none; }
.gi-section-title {
  font-size: 8px; letter-spacing: 1px; margin-bottom: 8px;
  display: flex; align-items: center; gap: 5px;
}
.gi-item {
  padding: 7px 9px; border-radius: 5px; margin-bottom: 5px;
  background: var(--bg); border: 1px solid var(--border);
  cursor: pointer; transition: border-color 0.12s;
}
.gi-item:hover { border-color: var(--border2); }
.gi-item-id { font-size: 8px; color: var(--text-dim); margin-bottom: 2px; }
.gi-item-name { font-size: 10px; color: var(--text); line-height: 1.4; word-break: break-word; }
.gi-item-hint {
  margin-top: 5px; font-size: 9px; color: var(--text-dim); line-height: 1.4;
  padding: 4px 7px; background: rgba(59,130,246,0.06);
  border-left: 2px solid rgba(59,130,246,0.3); border-radius: 2px;
}
.gi-empty { font-size: 10px; color: var(--text-dim); text-align: center; padding: 28px 14px; opacity: .6; }
.gi-badge {
  font-size: 7px; padding: 1px 5px; border-radius: 3px; flex-shrink: 0; letter-spacing: .3px;
}
.gantt-thead {
  display: flex; position: sticky; top: 0; z-index: 20;
  background: var(--surface2); border-bottom: 1px solid var(--border);
}
.gantt-thead-label {
  width: var(--lw); min-width: var(--lw); border-right: 1px solid var(--border);
  padding: 4px 12px; font-size: 8px; color: var(--text-dim);
  font-weight: 500; letter-spacing: 1.5px; display: flex; align-items: center;
}
.gantt-thead-ticks { flex: 1; position: relative; height: 26px; }
.tick {
  position: absolute; top: 0; height: 100%;
  border-left: 1px solid var(--border); padding-left: 4px; display: flex; align-items: center;
}
.tick span { font-size: 10px; color: var(--text-dim); white-space: nowrap; }
.tick.major span { color: var(--text-muted); }

/* ── GANTT ROWS ─────────────────────────────────────────────────────────── */
.row {
  display: flex; min-height: 56px; height: auto; border-bottom: 1px solid var(--bg);
  cursor: default; transition: background 0.1s;
}
.row:hover { background: var(--surface2); }
.row.clickable { cursor: pointer; }
.row-label {
  width: var(--lw); min-width: var(--lw); display: flex; align-items: flex-start; padding-top: 10px; padding-bottom: 10px;
  padding-right: 8px; gap: 5px; border-right: 1px solid var(--border); overflow: hidden;
}
.row-arrow {
  font-size: 8px; color: var(--text-dim); transition: transform 0.15s;
  flex-shrink: 0; user-select: none; line-height: 1; padding-left: 2px;
}
.row-arrow.open { transform: rotate(90deg); }
.row-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.row-name {
  font-size: 12px; color: #94a3b8;
  overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  white-space: normal; flex: 1; line-height: 1.4;
}
.row.initiative .row-name { color: var(--text); font-weight: 500; }
.row-badge {
  font-size: 7px; border-radius: 3px; padding: 1px 5px; flex-shrink: 0;
  white-space: nowrap; letter-spacing: 0.3px;
}
.row-bars { flex: 1; position: relative; overflow: hidden; }
.today-line {
  position: absolute; top: 0; bottom: 0;
  width: 1px; background: #ef4444; opacity: 0.5; pointer-events: none; z-index: 5;
}
.bar {
  position: absolute; top: 50%; transform: translateY(-50%);
  height: 24px; border-radius: 4px; display: flex; align-items: center;
  overflow: hidden; padding-left: 5px; min-width: 3px; opacity: 0.85;
  transition: opacity 0.15s; cursor: default;
}
.bar.clickable-bar { cursor: pointer; }
.bar:hover { opacity: 1; }
.bar-label {
  font-size: 10px; color: #fff; white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; font-weight: 500; pointer-events: none;
}
.bar.initiative-bar { height: 28px; }
.no-dates {
  position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
  font-size: 9px; color: var(--text-dim); font-style: italic;
}
.row-assignee {
  font-size: 7px; color: var(--text-muted); background: var(--surface);
  border: 1px solid var(--border); border-radius: 3px; padding: 1px 5px;
  flex-shrink: 0; white-space: nowrap; max-width: 72px;
  overflow: hidden; text-overflow: ellipsis;
}
.section-gap { height: 6px; background: var(--bg); border-bottom: 1px solid var(--border); }

/* ── TOOLTIP ────────────────────────────────────────────────────────────── */
.tooltip {
  position: fixed; background: #ffffff; border: 1px solid var(--border2);
  border-radius: 6px; padding: 10px 14px; font-size: 11px; pointer-events: none;
  z-index: 9999; max-width: 260px; box-shadow: 0 8px 32px rgba(0,0,0,0.12);
  line-height: 1.7; font-family: 'DM Mono', monospace;
}
.tooltip-title    { font-weight: 500; color: var(--text); margin-bottom: 2px; font-size: 11px; }
.tooltip-status   { font-size: 10px; }
.tooltip-dates    { font-size: 9px; color: var(--text-muted); }
.tooltip-assignee { font-size: 9px; color: var(--text-muted); }
.tooltip-link     { font-size: 9px; color: var(--accent); margin-top: 3px; }
.tooltip-priority { font-size: 9px; font-weight: 600; }
.tooltip-overdue  { font-size: 9px; color: #f59e0b; font-weight: 600; }

/* ── CLAUDE BRIEF PANEL ─────────────────────────────────────────────────── */
.claude-panel{background:var(--surface);border:1px solid var(--border);border-radius:10px;margin-bottom:14px;overflow:hidden;}
.claude-panel-hdr{display:flex;align-items:center;gap:8px;padding:9px 14px;border-bottom:1px solid var(--border);background:linear-gradient(135deg,rgba(99,102,241,.07) 0%,transparent 60%);font-size:10px;font-weight:700;letter-spacing:1px;color:var(--text-muted);}
.cpanel-key-btn{margin-left:auto;background:none;border:1px solid var(--border);border-radius:4px;color:var(--text-dim);font-size:9px;padding:2px 7px;cursor:pointer;letter-spacing:.5px;}.cpanel-key-btn:hover{border-color:var(--accent);color:var(--accent);}
.claude-msgs{padding:12px 16px;min-height:56px;max-height:260px;overflow-y:auto;display:flex;flex-direction:column;gap:10px;}
.claude-msg-text{font-size:12.5px;line-height:1.65;color:var(--text);white-space:pre-wrap;word-break:break-word;}
.claude-msg-user{align-self:flex-end;}.claude-msg-user .claude-msg-text{background:rgba(99,102,241,.1);border-radius:8px;padding:7px 11px;font-size:12px;color:var(--text-muted);display:inline-block;}
.claude-msg-thinking{color:var(--text-dim);font-size:11px;font-style:italic;}
.claude-input-row{display:flex;gap:7px;padding:8px 12px;border-top:1px solid var(--border);}
.claude-input-row input{flex:1;background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:6px 11px;font-size:11.5px;color:var(--text);outline:none;font-family:inherit;}
.claude-input-row input:focus{border-color:var(--accent);}.claude-input-row input::placeholder{color:var(--text-dim);}
.claude-send-btn{background:var(--accent);border:none;border-radius:6px;color:#fff;font-size:10px;font-weight:700;letter-spacing:.8px;padding:6px 14px;cursor:pointer;}.claude-send-btn:disabled{opacity:.4;cursor:not-allowed;}
/* ── SIMPLE CHECKLIST ────────────────────────────────────────────────────── */
.checklist-wrap{background:var(--surface);border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:14px;}
.checklist-hdr{display:flex;align-items:center;gap:8px;padding:9px 14px;border-bottom:1px solid var(--border);font-size:10px;font-weight:700;letter-spacing:1px;color:var(--text-muted);}
.cl-item{display:flex;align-items:flex-start;gap:10px;padding:9px 14px;border-bottom:1px solid var(--border);transition:background .12s;user-select:none;position:relative;}
.cl-item:last-child{border-bottom:none;}.cl-item:hover{background:var(--surface2);}
.cl-item.cl-done{opacity:.32;}.cl-item.cl-done .cl-title{text-decoration:line-through;}
.cl-cb{flex-shrink:0;width:15px;height:15px;margin-top:2px;border:1.5px solid var(--border);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:9px;transition:all .15s;cursor:pointer;}
.cl-item.cl-done .cl-cb{background:#22c55e;border-color:#22c55e;color:#fff;}
.cl-action-btn{flex-shrink:0;font-size:9px;font-weight:700;padding:2px 7px;border-radius:4px;border:1.5px solid var(--accent);color:var(--accent);background:transparent;cursor:pointer;letter-spacing:.5px;margin-top:1px;}
.cl-action-btn:hover{background:var(--accent);color:#fff;}
.cl-snooze-btn{flex-shrink:0;font-size:11px;padding:1px 5px;border-radius:4px;border:1px solid var(--border);color:var(--text-muted);background:transparent;cursor:pointer;margin-top:1px;}
.cl-snooze-btn:hover{border-color:var(--text-muted);color:var(--text);}
.cl-del-btn{flex-shrink:0;font-size:11px;padding:1px 5px;border-radius:4px;border:1px solid transparent;color:var(--text-dim);background:transparent;cursor:pointer;margin-top:1px;opacity:.5;}
.cl-del-btn:hover{border-color:#ef4444;color:#ef4444;opacity:1;}
.src-custom{background:#7c3aed22;color:#a78bfa;border:1px solid #7c3aed44;}
.cl-add-row{display:flex;gap:6px;padding:8px 12px 6px;border-bottom:1px solid var(--border);}
.cl-add-inp{flex:1;background:var(--surface2);border:1px solid var(--border);border-radius:5px;padding:5px 9px;font-size:11px;color:var(--text);outline:none;}
.cl-add-inp:focus{border-color:var(--accent);}
.cl-add-inp::placeholder{color:var(--text-dim);}
.cl-add-btn{flex-shrink:0;font-size:11px;font-weight:700;padding:4px 10px;border-radius:5px;border:1.5px solid var(--accent);color:var(--accent);background:transparent;cursor:pointer;letter-spacing:.4px;}
.cl-add-btn:hover{background:var(--accent);color:#fff;}
.cl-snooze-menu{position:absolute;right:14px;top:100%;background:var(--surface2);border:1px solid var(--border);border-radius:6px;box-shadow:0 4px 16px rgba(0,0,0,.35);z-index:200;min-width:140px;overflow:hidden;}
.cl-snooze-opt{display:block;width:100%;padding:8px 12px;font-size:11px;cursor:pointer;color:var(--text);background:transparent;border:none;text-align:left;letter-spacing:.3px;}
.cl-snooze-opt:hover{background:var(--accent);color:#fff;}
.cl-undo-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px 16px;display:flex;align-items:center;gap:12px;font-size:12px;color:var(--text);box-shadow:0 4px 20px rgba(0,0,0,.4);z-index:9999;animation:toast-in .2s ease;}
.cl-undo-btn{font-size:11px;font-weight:700;color:var(--accent);background:transparent;border:none;cursor:pointer;padding:0;letter-spacing:.5px;}
.cl-undo-btn:hover{text-decoration:underline;}
@keyframes toast-in{from{opacity:0;transform:translateX(-50%) translateY(8px);}to{opacity:1;transform:translateX(-50%) translateY(0);}}
.roadmap-sec-hdr{display:flex;align-items:center;gap:8px;padding:10px 16px;background:var(--surface);border-bottom:1px solid var(--border);border-top:2px solid var(--border);position:sticky;top:0;z-index:3;}
.roadmap-sec-hdr:first-child{border-top:none;}
.rsh-title{font-size:10px;font-weight:700;letter-spacing:1px;color:var(--text);}
.rsh-sub{font-size:9px;color:var(--text-muted);margin-left:6px;}
.swim-lane{border-bottom:1px solid var(--border);}
.swim-hdr{display:flex;align-items:center;gap:8px;padding:9px 14px;cursor:pointer;user-select:none;}
.swim-hdr:hover{background:rgba(255,255,255,.03);}
.swim-arr{font-size:8px;color:var(--text-muted);width:10px;flex-shrink:0;}
.swim-prio-lbl{font-size:10px;font-weight:700;letter-spacing:0.8px;}
.swim-count{font-size:9px;color:var(--text-muted);background:rgba(255,255,255,.06);padding:1px 7px;border-radius:10px;margin-left:2px;}
.swim-urgent .swim-prio-lbl{color:#ef4444;}.swim-high .swim-prio-lbl{color:#f97316;}
.swim-medium .swim-prio-lbl{color:#eab308;}.swim-low .swim-prio-lbl{color:var(--text-muted);}
.swim-none .swim-prio-lbl{color:var(--text-muted);}
.swim-body{border-top:1px solid var(--border);}
.swim-grp-lbl{font-size:9px;font-weight:600;letter-spacing:0.7px;color:var(--text-muted);padding:7px 14px 3px 32px;text-transform:uppercase;}
.swim-issue{display:flex;align-items:center;gap:8px;padding:6px 14px 6px 32px;border-bottom:1px solid rgba(255,255,255,.03);cursor:pointer;}
.swim-issue:hover{background:rgba(255,255,255,.04);}
.swim-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;}
.swim-id{font-size:10px;font-weight:600;color:var(--text-muted);flex-shrink:0;min-width:66px;}
.swim-title{font-size:11px;color:var(--text);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.swim-assignee{font-size:9px;color:var(--text-muted);flex-shrink:0;padding:0 4px;}
.swim-badge{font-size:8px;font-weight:600;padding:1px 5px;border-radius:3px;flex-shrink:0;letter-spacing:.4px;text-transform:uppercase;}
/* ── Initiative Tree ──────────────────────────────────────────────────── */
.ini-row{border-bottom:1px solid var(--border);transition:opacity .15s;}
.ini-row.dragging{opacity:.35;}
.ini-row.drag-over{box-shadow:inset 0 2px 0 var(--accent);}
.ini-hdr{display:flex;align-items:center;gap:8px;padding:9px 14px;cursor:pointer;background:var(--surface);user-select:none;}
.ini-hdr:hover{background:var(--surface2);}
.ini-drag{flex-shrink:0;cursor:grab;color:var(--text-dim);font-size:13px;padding:0 2px;line-height:1;opacity:.5;}
.ini-drag:hover{opacity:1;}
.ini-arr{flex-shrink:0;font-size:9px;color:var(--text-muted);width:12px;}
.ini-name{flex:1;font-size:11px;font-weight:700;letter-spacing:.5px;color:var(--text);text-transform:uppercase;}
.ini-hdr-badge{font-size:9px;padding:1px 7px;border-radius:3px;font-weight:600;}
.ini-hdr-count{flex-shrink:0;font-size:10px;color:var(--text-muted);}
.ini-proj{border-top:1px solid var(--border);}
.ini-proj-hdr{display:flex;align-items:center;gap:8px;padding:7px 14px 7px 36px;cursor:pointer;background:var(--surface2);}
.ini-proj-hdr:hover{filter:brightness(.97);}
.ini-proj-arr{flex-shrink:0;font-size:9px;color:var(--text-muted);width:10px;}
.ini-proj-name{flex:1;font-size:11px;color:var(--text);font-weight:600;}
.ini-proj-badge{font-size:9px;padding:1px 6px;border-radius:3px;font-weight:600;}
.ini-proj-count{font-size:10px;color:var(--text-muted);}
.ini-prio-grp{display:flex;align-items:center;gap:6px;padding:3px 14px 3px 52px;background:var(--surface2);border-top:1px solid var(--border);}
.ini-prio-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;}
.ini-prio-lbl{font-size:9px;font-weight:700;letter-spacing:.5px;}
.ini-prio-ct{font-size:9px;color:var(--text-muted);}
.ini-issue{display:flex;align-items:center;gap:8px;padding:5px 14px 5px 52px;border-top:1px solid var(--border);cursor:pointer;transition:background .1s;}
.ini-issue:hover{background:var(--surface2);}
.ini-iss-dot{flex-shrink:0;width:7px;height:7px;border-radius:50%;}
.ini-iss-id{flex-shrink:0;font-size:9px;font-weight:700;color:var(--text-muted);min-width:64px;}
.ini-iss-title{flex:1;font-size:11px;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.ini-iss-status{flex-shrink:0;font-size:9px;padding:1px 6px;border-radius:3px;font-weight:600;}
.ini-iss-owner{flex-shrink:0;font-size:10px;color:var(--text-muted);min-width:50px;text-align:right;}
.ini-iss-size{flex-shrink:0;font-size:10px;color:var(--text-dim);width:20px;text-align:right;font-weight:600;}
.cl-src{flex-shrink:0;font-size:8px;font-weight:700;letter-spacing:.5px;padding:2px 5px;border-radius:3px;margin-top:2px;white-space:nowrap;}
.cl-title{flex:1;font-size:12px;color:var(--text);line-height:1.45;}
.cl-meta{flex-shrink:0;font-size:10px;color:var(--text-muted);margin-top:2px;white-space:nowrap;}
.cl-more-btn{width:100%;background:none;border:none;border-top:1px solid var(--border);padding:9px;font-size:10px;color:var(--text-dim);cursor:pointer;letter-spacing:.5px;}.cl-more-btn:hover{color:var(--accent);}
/* ── MY DAY TAB ─────────────────────────────────────────────────────────── */
.myday-layout {
  height: calc(100vh - 120px);
  overflow-y: auto;
  display: grid;
  grid-template-columns: 3fr 2fr;
  gap: 0;
}
.myday-main { padding: 0 0 60px 0; border-right: 1px solid var(--border); overflow-y: auto; height: 100%; }
.myday-sidebar { overflow-y: auto; height: 100%; background: var(--surface); }
.myday-greeting {
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--border);
  display: flex; align-items: baseline; gap: 12px;
}
.myday-greeting-title { font-size: 15px; font-weight: 700; color: var(--text); letter-spacing: -0.3px; }
.myday-greeting-date { font-size: 10px; color: var(--text-dim); letter-spacing: 0.5px; }
.myday-section { border-bottom: 1px solid var(--border); }
.myday-section-hdr {
  padding: 6px 24px;
  font-size: 8px; letter-spacing: 1.2px; font-weight: 600;
  display: flex; align-items: center; gap: 6px;
  background: var(--surface2);
  border-bottom: 1px solid var(--border);
  position: sticky; top: 0; z-index: 5;
}
.myday-section-count {
  opacity: .5; font-weight: 400;
}
.myday-section-empty {
  padding: 12px 24px; font-size: 10px; color: var(--text-dim);
}
.myday-item {
  display: flex; align-items: center; gap: 8px;
  padding: 9px 24px;
  border-bottom: 1px solid var(--border);
  cursor: pointer; transition: background .12s;
  font-size: 11px;
}
.myday-item:hover { background: var(--surface2); }
.myday-item:last-child { border-bottom: none; }
.myday-source {
  font-size: 7.5px; letter-spacing: .8px; font-weight: 600;
  padding: 2px 5px; border-radius: 3px; flex-shrink: 0;
  border: 1px solid currentColor; opacity: .7;
}
.src-linear  { color: #6366f1; }
.src-hubspot { color: #f97316; }
.src-gcal    { color: #3b82f6; }
.src-gmail   { color: #ef4444; }
.src-drive   { color: #10b981; }
.myday-item-title { flex: 1; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.myday-item-owner { font-size: 9px; color: var(--text-dim); flex-shrink: 0; }
.myday-item-date  { font-size: 9px; flex-shrink: 0; color: var(--text-dim); }
.myday-item-date.overdue { color: #f59e0b; font-weight: 600; }
.myday-item-date.today   { color: #3b82f6; font-weight: 600; }
.myday-item-status { font-size: 8px; color: var(--text-dim); flex-shrink: 0; }
.myday-expand-chevron {
  flex-shrink: 0; font-size: 9px; color: var(--text-dim); opacity:.4;
  cursor: pointer; padding: 0 2px 0 4px; transition: transform 0.15s; line-height:1;
  user-select: none;
}
.myday-expand-chevron.open { transform: rotate(90deg); opacity:.7; }
.myday-expand-panel {
  display: none; padding: 8px 14px 10px 44px;
  background: rgba(0,0,0,0.012);
  border-top: 1px solid var(--border);
  font-size: 10.5px; color: var(--text); line-height: 1.55;
  flex-direction: column; gap: 6px;
}
.myday-expand-panel.open { display: flex; }
.myday-expand-reason { color: var(--text); font-size: 10.5px; line-height: 1.55; }
.myday-expand-suggestion {
  display: flex; gap: 6px; padding: 5px 8px; border-radius: 4px;
  background: rgba(59,130,246,0.06); border-left: 2px solid rgba(59,130,246,0.35);
  font-size: 10px; color: var(--text-dim); line-height: 1.45;
}
.myday-expand-link {
  display: inline-flex; align-items: center; gap: 3px;
  padding: 3px 9px; background: var(--surface2); border: 1px solid var(--border);
  border-radius: 4px; font-size: 9px; color: var(--text-dim);
  text-decoration: none; cursor: pointer; align-self: flex-start;
}
.myday-expand-link:hover { background: var(--border); }
.myday-coming-card {
  margin: 16px 16px 0;
  border: 1px dashed var(--border);
  border-radius: 6px; padding: 12px 14px;
  display: flex; align-items: center; gap: 10px;
}
.myday-coming-icon { font-size: 16px; flex-shrink: 0; opacity: .4; }
.myday-coming-text { font-size: 10px; }
.myday-coming-title { color: var(--text-dim); font-weight: 600; font-size: 9px; letter-spacing: .5px; margin-bottom: 2px; }
.myday-coming-desc  { color: var(--text-dim); opacity: .6; font-size: 9px; }
.myday-sidebar-hdr {
  padding: 6px 16px;
  font-size: 8px; letter-spacing: 1.2px; font-weight: 600;
  background: var(--surface2);
  border-bottom: 1px solid var(--border);
  display: flex; align-items: center; gap: 6px;
  position: sticky; top: 0; z-index: 5;
}
.myday-deal-row {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 16px;
  border-bottom: 1px solid var(--border);
  cursor: pointer; font-size: 10px; transition: background .12s;
}
.myday-deal-row:hover { background: var(--surface2); }
.myday-deal-name { flex: 1; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.myday-deal-amt  { font-size: 9px; color: #10b981; font-weight: 600; flex-shrink: 0; }
.myday-deal-date { font-size: 9px; color: var(--text-dim); flex-shrink: 0; }
.myday-deal-date.overdue { color: #ef4444; }
.myday-deal-date.soon    { color: #f59e0b; }
.myday-person-bar {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  padding: 8px 20px;
  display: flex; gap: 6px; align-items: center;
  overflow-x: auto; position: sticky; top: 0; z-index: 10;
}
.myday-section-bar {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  padding: 6px 20px;
  display: flex; gap: 4px; align-items: center;
  overflow-x: auto; position: sticky; top: 41px; z-index: 9;
}
.section-pill {
  padding: 3px 10px; border-radius: 999px;
  border: 1px solid var(--border); background: transparent;
  font-size: 9px; font-weight: 700; letter-spacing: 0.5px;
  color: var(--text-dim); cursor: pointer; white-space: nowrap;
  transition: all 0.15s;
}
.section-pill:hover { border-color: var(--accent); color: var(--accent); }
.section-pill.active { background: var(--accent); color: #fff; border-color: var(--accent); }
.myday-stats-bar {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  padding: 7px 24px;
  display: flex; gap: 16px; align-items: center; font-size: 9px;
}
.myday-stat { display: flex; gap: 5px; align-items: center; color: var(--text-dim); }
.myday-stat-num { font-weight: 700; color: var(--text); font-size: 11px; }
.myday-stat-num.red { color: #ef4444; }
.myday-stat-num.amber { color: #f59e0b; }
.myday-stat-num.blue { color: #3b82f6; }

/* ── SALES & OPS TAB ────────────────────────────────────────────────────── */
.ops-layout {
  display: grid;
  grid-template-columns: 1fr 420px;
  height: calc(100vh - 120px);
  overflow: hidden;
}
.ops-col {
  overflow-y: auto;
  height: 100%;
}
.ops-col-tasks {
  border-right: 1px solid var(--border);
}
.ops-col-pipeline {
  background: var(--surface);
}

/* Owner filter strip */
.owner-strip {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  padding: 8px 20px;
  display: flex; gap: 6px; align-items: center;
  overflow-x: auto; position: sticky; top: 0; z-index: 10;
}
.owner-strip-label { font-size: 8px; color: var(--text-dim); letter-spacing: 1px; margin-right: 4px; flex-shrink: 0; }
.owner-pill {
  font-size: 9px; border-radius: 20px; padding: 3px 12px;
  border: 1px solid var(--border); cursor: pointer;
  font-family: 'DM Mono', monospace; letter-spacing: 0.3px;
  background: var(--bg); color: var(--text-muted);
  transition: all 0.15s; white-space: nowrap; flex-shrink: 0;
}
.owner-pill:hover { border-color: var(--accent); color: var(--accent); }
.owner-pill.active { background: var(--accent); color: #fff; border-color: var(--accent); }

/* Section headers */
.ops-section {
  margin: 0;
}
.ops-section-header {
  padding: 10px 20px 6px;
  font-size: 8px; color: var(--text-dim);
  letter-spacing: 1.5px; font-weight: 500;
  border-bottom: 1px solid var(--border);
  background: var(--surface2);
  display: flex; align-items: center; gap: 8px;
  position: sticky; top: 41px; z-index: 9;
}
.ops-section-count {
  background: var(--border); color: var(--text-muted);
  border-radius: 10px; padding: 1px 7px; font-size: 8px;
}

/* Task rows */
.task-row {
  display: flex; align-items: center; gap: 10px;
  padding: 0 20px; height: 44px;
  border-bottom: 1px solid var(--bg);
  cursor: pointer; transition: background 0.1s;
}
.task-row:hover { background: var(--surface2); }
.task-type-icon {
  font-size: 13px; flex-shrink: 0; width: 20px; text-align: center;
}
.task-name {
  font-size: 11px; color: var(--text);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  flex: 1; min-width: 0;
}
.task-company {
  font-size: 9px; color: var(--text-muted);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  max-width: 160px; flex-shrink: 0;
}
.task-due {
  font-size: 9px; color: var(--text-muted);
  white-space: nowrap; flex-shrink: 0; min-width: 64px; text-align: right;
}
.task-due.overdue { color: #f59e0b; font-weight: 600; }
.task-due.today   { color: #3b82f6; font-weight: 600; }
.task-owner-pill {
  font-size: 8px; padding: 2px 8px; border-radius: 3px;
  background: var(--surface2); border: 1px solid var(--border);
  color: var(--text-muted); white-space: nowrap; flex-shrink: 0;
}
@keyframes taskUrgentPulse {
  0%,100% { box-shadow: inset 3px 0 0 rgba(239,68,68,0.5); }
  50%     { box-shadow: inset 3px 0 0 rgba(239,68,68,1); background: rgba(239,68,68,0.03); }
}
.task-row.row-urgent { animation: taskUrgentPulse 1.6s ease-in-out infinite; }
.task-row.row-overdue { box-shadow: inset 3px 0 0 rgba(245,158,11,0.5); }

/* Pipeline table */
.pipeline-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.pipeline-table th {
  font-size: 8px; color: var(--text-dim); letter-spacing: 1.2px;
  padding: 8px 12px; text-align: left;
  background: var(--surface2); border-bottom: 1px solid var(--border);
  font-weight: 500;
}
.pipeline-table td {
  padding: 10px 12px; border-bottom: 1px solid var(--bg);
  color: var(--text); vertical-align: middle;
}
.pipeline-table tr:hover td { background: var(--surface2); }
.pipeline-table tr { cursor: pointer; }
.deal-name { font-weight: 500; }
.deal-stage-badge {
  font-size: 8px; border-radius: 3px; padding: 2px 7px;
  white-space: nowrap;
}
.deal-amount { font-weight: 500; color: #10b981; font-family: 'DM Mono', monospace; }
.deal-close-date { font-size: 10px; color: var(--text-muted); }
.deal-close-date.urgent { color: #ef4444; font-weight: 600; }
.deal-close-date.soon   { color: #f59e0b; font-weight: 600; }
.deal-owner-pill {
  font-size: 8px; padding: 2px 8px; border-radius: 3px;
  background: var(--surface2); border: 1px solid var(--border);
  color: var(--text-muted);
}
.pipeline-total-row td {
  font-size: 9px; color: var(--text-muted);
  background: var(--surface2); font-weight: 500;
  border-top: 2px solid var(--border);
}

/* ── Sales Funnels ─────────────────────────────────────────────────────────── */
.sales-funnels {
  display: grid; grid-template-columns: 1fr 1fr; gap: 0;
  border-bottom: 2px solid var(--border);
}
.funnel-panel {
  padding: 16px 20px 20px; border-right: 1px solid var(--border);
}
.funnel-panel:last-child { border-right: none; }
.funnel-title {
  font-size: 8px; letter-spacing: 1.4px; color: var(--text-dim);
  font-weight: 500; margin-bottom: 14px; display: flex; align-items: center; gap: 8px;
}
.funnel-title-kpi {
  margin-left: auto; font-size: 10px; color: var(--text); letter-spacing: 0; font-weight: 600;
}
.funnel-row {
  display: flex; align-items: center; gap: 8px; margin-bottom: 7px;
}
.funnel-label {
  font-size: 10px; color: var(--text-muted); width: 110px; flex-shrink: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.funnel-bar-wrap {
  flex: 1; height: 18px; background: var(--surface2); border-radius: 3px; overflow: hidden; position: relative;
}
.funnel-bar {
  height: 100%; border-radius: 3px; transition: width .4s ease; min-width: 2px;
  display: flex; align-items: center; padding-left: 6px;
}
.funnel-bar-label {
  font-size: 9px; font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden;
}
.funnel-meta {
  font-size: 9px; color: var(--text-dim); width: 70px; text-align: right; flex-shrink: 0; white-space: nowrap;
}
.funnel-won-row {
  display: flex; gap: 12px; margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--border);
}
.funnel-won-kpi {
  flex: 1; background: var(--surface2); border-radius: 5px; padding: 8px 10px;
}
.funnel-won-kpi-label { font-size: 8px; letter-spacing: 1px; color: var(--text-dim); margin-bottom: 3px; }
.funnel-won-kpi-val { font-size: 13px; font-weight: 600; color: var(--text); }
.funnel-won-kpi-val.green { color: #10b981; }
.funnel-won-kpi-val.red { color: #ef4444; }

/* ── Account Management ────────────────────────────────────────────────────── */
#accounts-main { padding: 20px 24px; overflow-y: auto; height: calc(100vh - 56px); }
.acct-toolbar { display:flex; align-items:center; gap:10px; margin-bottom:18px; }
.acct-toolbar-title { font-size:11px; font-weight:600; color:var(--text); letter-spacing:.5px; }
.acct-search { flex:1; max-width:280px; background:var(--surface2); border:1px solid var(--border); border-radius:5px; padding:5px 10px; font-size:11px; color:var(--text); outline:none; }
.acct-search:focus { border-color:var(--accent); }
.acct-search::placeholder { color:var(--text-dim); }
.acct-filter-btn { font-size:10px; padding:4px 10px; border-radius:4px; border:1px solid var(--border); background:transparent; color:var(--text-muted); cursor:pointer; letter-spacing:.3px; }
.acct-filter-btn.active { border-color:var(--accent); color:var(--accent); background:var(--accent)11; }
.acct-grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(340px,1fr)); gap:14px; }
.acct-card { background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:16px; cursor:pointer; transition:border-color .15s; position:relative; }
.acct-card:hover { border-color:var(--accent); }
.acct-card-top { display:flex; align-items:flex-start; gap:10px; margin-bottom:10px; }
.acct-avatar { width:34px; height:34px; border-radius:6px; background:var(--accent)22; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; color:var(--accent); flex-shrink:0; }
.acct-name { font-size:12px; font-weight:600; color:var(--text); line-height:1.3; }
.acct-domain { font-size:10px; color:var(--text-dim); margin-top:1px; }
.acct-health { margin-left:auto; flex-shrink:0; }
.health-badge { font-size:9px; font-weight:700; padding:3px 8px; border-radius:10px; letter-spacing:.5px; }
.health-green  { background:#10b98122; color:#10b981; border:1px solid #10b98144; }
.health-amber  { background:#f9731622; color:#f97316; border:1px solid #f9731644; }
.health-red    { background:#ef444422; color:#ef4444; border:1px solid #ef444444; }
.health-grey   { background:var(--surface2); color:var(--text-dim); border:1px solid var(--border); }
.acct-meta-row { display:flex; gap:10px; margin-bottom:10px; flex-wrap:wrap; }
.acct-meta-chip { font-size:9px; color:var(--text-muted); background:var(--surface2); border-radius:4px; padding:2px 7px; display:flex; align-items:center; gap:3px; }
.acct-meta-chip.warn { color:#f97316; background:#f9731611; }
.acct-meta-chip.ok   { color:#10b981; background:#10b98111; }
.acct-section-label { font-size:8px; letter-spacing:1.2px; color:var(--text-dim); font-weight:500; margin-bottom:5px; }
.acct-note { font-size:10px; color:var(--text-muted); line-height:1.5; padding:6px 8px; background:var(--surface2); border-radius:4px; margin-bottom:5px; border-left:2px solid var(--border); }
.acct-note:last-child { margin-bottom:0; }
.acct-note-date { font-size:8px; color:var(--text-dim); margin-bottom:2px; }
.acct-next-steps { margin-top:10px; padding-top:10px; border-top:1px solid var(--border); }
.acct-next-label { font-size:8px; letter-spacing:1.1px; color:var(--accent); font-weight:600; margin-bottom:4px; }
.acct-next-text { font-size:10px; color:var(--text-muted); line-height:1.5; }
.acct-owner-pill { font-size:8px; color:var(--text-dim); background:var(--surface2); border-radius:3px; padding:1px 5px; position:absolute; top:12px; right:12px; }
.acct-expand-btn { font-size:9px; color:var(--accent); background:transparent; border:none; cursor:pointer; padding:2px 0; margin-top:4px; }

/* Empty/connect state */
.ops-empty {
  padding: 60px 20px; text-align: center;
}
.ops-empty-icon { font-size: 40px; margin-bottom: 16px; }
.ops-empty-title { font-size: 14px; color: var(--text); font-weight: 500; margin-bottom: 8px; }
.ops-empty-sub { font-size: 11px; color: var(--text-muted); line-height: 1.7; max-width: 400px; margin: 0 auto; }
.ops-empty-cmd {
  margin-top: 20px; display: inline-block;
  font-size: 10px; background: var(--surface2); border: 1px solid var(--border);
  border-radius: 4px; padding: 8px 16px; color: var(--text); letter-spacing: 0.3px;
}
</style>
</head>
<body>

<div class="header">
  <div class="header-logo"><svg width="22" height="22" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0"><circle cx="10" cy="11" r="6" fill="#6c63f7"/><circle cx="25" cy="9" r="8" fill="#6c63f7"/><circle cx="14" cy="27" r="8" fill="#6c63f7"/><circle cx="29" cy="29" r="5" fill="#6c63f7"/></svg> Supplied</div>

  <div class="header-tabs">
    <button class="tab-btn active" id="tab-myday-btn" onclick="switchTab('myday')">
      <span class="tab-icon">✅</span> TO DOs
    </button>
    <button class="tab-btn" id="tab-roadmap-btn" onclick="switchTab('roadmap')">
      <span class="tab-icon">🗺</span> CUSTOMER &amp; PRODUCT ROADMAP
    </button>
    <button class="tab-btn" id="tab-sales-btn" onclick="switchTab('sales')">
      <span class="tab-icon">📊</span> SALES &amp; OPERATIONS
    </button>
    <button class="tab-btn" id="tab-accounts-btn" onclick="switchTab('accounts')">
      <span class="tab-icon">🏢</span> ACCOUNTS
    </button>
  </div>

  <div class="header-right">
    <button class="refresh-btn" id="refresh-btn" onclick="doRefresh()">
      <span class="spin">↻</span> REFRESH
    </button>
    <button class="refresh-btn" title="Update GitHub token" onclick="openPatModal()" style="padding:3px 7px;">⚙</button>
    <div class="refresh-badge">
      <span class="dot"></span>
      <span id="refresh-time">LOADING…</span>
    </div>
  </div>
</div>

<!-- ══ MY DAY TAB ══════════════════════════════════════════════════════════ -->
<div id="panel-myday" class="tab-panel active">
  <div class="myday-person-bar" id="myday-person-bar">
    <span class="owner-strip-label">SHOWING FOR</span>
  </div>
  <div class="myday-section-bar" id="myday-section-bar"></div>
  <div class="myday-stats-bar" id="myday-stats-bar"></div>
  <div class="myday-layout">
    <div class="myday-main" id="myday-main"></div>
    <div class="myday-sidebar" id="myday-sidebar"></div>
  </div>
</div>

<!-- ══ ROADMAP TAB ══════════════════════════════════════════════════════════ -->
<div id="panel-roadmap" class="tab-panel">
  <div class="alert-bar" id="alert-bar-roadmap">
    <span class="alert-section-label">NEEDS ATTENTION</span>
  </div>

  <div class="legend">
    ${[["Todo","#6366f1"],["In Progress","#f59e0b"],["In Review","#fb923c"],["In Test","#a78bfa"],["Blocked","#ef4444"],["Planned","#8b5cf6"],["Backlog","#334155"]].map(([s,c])=>`
    <div class="legend-item"><span class="legend-swatch" style="background:${c}"></span>${s}</div>`).join("")}
    <div class="legend-today"><span class="legend-today-line"></span>Today</div>
    <div class="legend-hint">Click issue bar → open in Linear · Click row → expand</div>
  </div>

  <div class="gantt-outer">
    <div class="gantt-wrapper" id="gantt">
      <div class="gantt-thead" id="thead">
        <div class="gantt-thead-label">NAME</div>
        <div class="gantt-thead-ticks" id="ticks"></div>
      </div>
      <div id="gantt-body"></div>
    </div>
    <div class="gantt-insights-panel" id="gantt-insights">
      <div class="gantt-insights-hdr">INSIGHTS &amp; RECOMMENDATIONS</div>
      <div id="gantt-insights-body"><div class="gi-empty">Loading…</div></div>
    </div>
  </div>
</div>

<!-- ══ SALES & OPS TAB ══════════════════════════════════════════════════════ -->
<div id="panel-sales" class="tab-panel">
  <div class="alert-bar" id="alert-bar-sales">
    <span class="alert-section-label">NEEDS ATTENTION</span>
  </div>

  <div class="owner-strip" id="owner-strip">
    <span class="owner-strip-label">OWNER</span>
  </div>

  <div class="sales-funnels" id="sales-funnels-row"></div>

  <div class="ops-layout" id="ops-layout">
    <div class="ops-col ops-col-tasks" id="ops-tasks-col"></div>
    <div class="ops-col ops-col-pipeline" id="ops-pipeline-col"></div>
  </div>
</div>

<!-- ══ ACCOUNTS TAB ═════════════════════════════════════════════════════════ -->
<div id="panel-accounts" class="tab-panel">
  <div id="accounts-main"></div>
</div>

<!-- Anthropic API key modal -->
<div class="pat-overlay" id="claude-key-overlay">
  <div class="pat-modal">
    <div class="pat-modal-title">&#x1F916; CONNECT CLAUDE AI</div>
    <div class="pat-modal-desc">
      Enter your Anthropic API key to enable the AI daily brief.<br>
      Stored only in your browser. Get a free key at
      <a href="https://console.anthropic.com" target="_blank" style="color:var(--accent)">console.anthropic.com</a>
    </div>
    <input type="password" id="claude-key-input" class="pat-input" placeholder="sk-ant-..." />
    <div id="claude-key-status" class="pat-status"></div>
    <div style="display:flex;gap:8px;margin-top:12px;">
      <button class="pat-save-btn" onclick="saveClaudeKey()">Connect</button>
      <button class="pat-save-btn" style="background:var(--surface2);color:var(--text-muted);" onclick="closeClaudeKeyModal()">Cancel</button>
    </div>
  </div>
</div>

<!-- PAT modal for on-demand refresh -->
<div class="pat-overlay" id="pat-overlay">
  <div class="pat-modal">
    <div class="pat-modal-title">🔑 CONNECT GITHUB FOR ON-DEMAND REFRESH</div>
    <div class="pat-modal-desc">
      A GitHub Personal Access Token lets the Refresh button trigger a live data pull
      without waiting for the scheduled workflow.<br><br>
      Create one at <a href="https://github.com/settings/tokens/new" target="_blank">github.com/settings/tokens</a>
      — scope needed: <code>repo</code> (or <code>workflow</code> for fine-grained tokens).<br><br>
      Your token is stored only in this browser. It never leaves your device.
    </div>
    <input type="password" id="pat-input" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" autocomplete="off" />
    <div class="pat-modal-actions">
      <span class="pat-status" id="pat-status"></span>
      <button class="pat-btn" onclick="closePatModal()">Cancel</button>
      <button class="pat-btn primary" onclick="savePat()">Save &amp; Refresh</button>
    </div>
  </div>
</div>

<div class="tooltip" id="tooltip" style="display:none"></div>

<script>
// ═══════════════════════════════════════════════════════════════════════════
// SHARED HELPERS
// ═══════════════════════════════════════════════════════════════════════════
const SC = {
  "Todo":"#6366f1","In Progress":"#f59e0b","In Review":"#fb923c",
  "In Test":"#a78bfa","Blocked":"#ef4444","Backlog":"#334155",
  "Done":"#10b981","Completed":"#10b981","Active":"#3b82f6",
  "Planned":"#8b5cf6","Paused":"#f97316","Cancelled":"#475569",
};
const sc = s => SC[s]||"#475569";
const TODAY_STR  = new Date().toISOString().split("T")[0];
const DONE_STATES = new Set(["Done","Completed","Cancelled","Canceled","Duplicate","Won","Closed","Closed Won","Closed Lost","closedwon","closedlost"]);
function isActive(status){ return !DONE_STATES.has(status); }
function isDoneStage(s){ const v=(s||"").toLowerCase(); return DONE_STATES.has(s)||v.includes("closed")||v.includes("won")||v.includes("lost"); }
function priorityLevel(p){ const u=(p||"").toUpperCase(); if(u==="URGENT"||u==="1") return "urgent"; if(u==="HIGH"||u==="2") return "high"; return null; }
function isOverdue(end, status){ return !!end && isActive(status||"") && end < TODAY_STR; }
function daysDiff(dateStr){ return Math.ceil((new Date(dateStr)-new Date(TODAY_STR))/(1000*86400)); }
function fmtDate(d){ if(!d) return ""; const [y,m,day]=d.split("-"); return \`\${day} \${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+m-1]} \${y.slice(2)}\`; }

// ═══════════════════════════════════════════════════════════════════════════
// TAB SWITCHING
// ═══════════════════════════════════════════════════════════════════════════
let currentTab = "myday";
function switchTab(tab){
  currentTab = tab;
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
  document.getElementById("tab-"+tab+"-btn").classList.add("active");
  document.getElementById("panel-"+tab).classList.add("active");
  if(tab==="roadmap"||tab==="sales"){
    const cont=document.getElementById("panel-"+tab);
    if(cont) renderClaudeBrief(cont, CLAUDE_VIEW_NAME||"Johann", tab);
  }
  if(tab==="accounts") renderAccountManagement();
}

// ═══════════════════════════════════════════════════════════════════════════
// TOOLTIP
// ═══════════════════════════════════════════════════════════════════════════
const tip = document.getElementById("tooltip");
let tipVisible = false;
function showTip(e,d){
  const priLevel = priorityLevel(d.priority);
  const od = d.end && isActive(d.status||"") && d.end < TODAY_STR;
  const priColor = priLevel==="urgent"?"#ef4444":priLevel==="high"?"#f97316":null;
  tip.innerHTML=\`
    <div class="tooltip-title">\${d.label}</div>
    \${d.status?\`<div class="tooltip-status" style="color:\${sc(d.status)}">\${d.status}</div>\`:""}
    \${priColor?\`<div class="tooltip-priority" style="color:\${priColor}">⚡ \${d.priority}</div>\`:""}
    \${od?\`<div class="tooltip-overdue">⚠️ OVERDUE — due \${d.end}</div>\`:""}
    \${d.start?\`<div class="tooltip-dates">\${d.start} → \${d.end||"ongoing"}</div>\`:""}
    \${d.assignee?\`<div class="tooltip-assignee">👤 \${d.assignee}</div>\`:""}
    \${d.clickable&&d.url?\`<div class="tooltip-link">↗ Open in Linear</div>\`:""}
  \`;
  tip.style.display="block"; moveTip(e); tipVisible=true;
}
function moveTip(e){ tip.style.left=(e.clientX+14)+"px"; tip.style.top=(e.clientY-8)+"px"; }
function hideTip(){ tip.style.display="none"; tipVisible=false; }
document.addEventListener("mousemove", e=>{ if(tipVisible) moveTip(e); });

// ═══════════════════════════════════════════════════════════════════════════
// ROADMAP (LINEAR GANTT)
// ═══════════════════════════════════════════════════════════════════════════
const RANGE_START = (()=>{ const d=new Date(); d.setMonth(d.getMonth()-3,1); return d.toISOString().split("T")[0]; })();
const RANGE_END   = (()=>{ const d=new Date(); d.setFullYear(d.getFullYear()+1); d.setMonth(d.getMonth()+2,28); return d.toISOString().split("T")[0]; })();
const TOTAL_MS    = new Date(RANGE_END)-new Date(RANGE_START);
const dPct = s => { if(!s) return null; return Math.max(0,Math.min(100,(new Date(s)-new Date(RANGE_START))/TOTAL_MS*100)); };
const TODAY_PCT = dPct(TODAY_STR);

// Ticks
const ticksEl = document.getElementById("ticks");
const curT = new Date(RANGE_START); curT.setDate(1);
const endD = new Date(RANGE_END);
while(curT <= endD){
  const pct = dPct(curT.toISOString().split("T")[0]);
  const t = document.createElement("div");
  t.className = "tick"+(curT.getDate()===1&&curT.getMonth()%3===0?" major":"");
  t.style.left=pct+"%";
  const s = document.createElement("span");
  s.textContent = curT.toLocaleString("default",{month:"short",year:"2-digit"});
  t.appendChild(s); ticksEl.appendChild(t);
  curT.setMonth(curT.getMonth()+1);
}

const expanded = {};
let GANTT_DATA  = null;
let GANTT_FILTER = null;

function ganttComputeStats(data){
  let urgent=0,high=0,overdue=0,total=0;
  for(const ini of data.initiatives){
    if(DONE_STATES.has(ini.status||"")) continue;
    for(const proj of ini.projects){
      if(DONE_STATES.has(proj.status||"")) continue;
      for(const iss of (proj.issues||[])){
        if(!isActive(iss.status)) continue; total++;
        const p=priorityLevel(iss.priority);
        if(p==="urgent") urgent++; else if(p==="high") high++;
        if(isOverdue(iss.end,iss.status)) overdue++;
      }
    }
  }
  return {urgent,high,overdue,total};
}

function ganttIssueMatchesFilter(iss){
  if(!GANTT_FILTER) return true;
  if(!isActive(iss.status)) return false;
  if(GANTT_FILTER==="urgent")  return priorityLevel(iss.priority)==="urgent";
  if(GANTT_FILTER==="high")    return priorityLevel(iss.priority)==="high";
  if(GANTT_FILTER==="overdue") return isOverdue(iss.end,iss.status);
  return true;
}

function populateGanttAlertBar(stats){
  const bar = document.getElementById("alert-bar-roadmap"); bar.innerHTML="";
  const lbl=document.createElement("span"); lbl.className="alert-section-label"; lbl.textContent="NEEDS ATTENTION"; bar.appendChild(lbl);
  if(stats.urgent===0&&stats.high===0&&stats.overdue===0){
    const a=document.createElement("div"); a.className="alert-all-clear"; a.innerHTML=\`✓ <span>All \${stats.total} active issues on track</span>\`; bar.appendChild(a); return;
  }
  const badges=[{key:"urgent",num:stats.urgent,lbl:"URGENT",cls:"badge-urgent"},{key:"high",num:stats.high,lbl:"HIGH",cls:"badge-high"},{key:"overdue",num:stats.overdue,lbl:"OVERDUE",cls:"badge-overdue"}];
  let first=true;
  for(const b of badges){
    if(b.num===0) continue;
    if(!first){ const d=document.createElement("div"); d.className="alert-divider"; bar.appendChild(d); }
    first=false;
    const btn=document.createElement("button");
    btn.className=\`alert-badge \${b.cls}\${GANTT_FILTER===b.key?" active":""}\`;
    btn.dataset.filter=b.key;
    btn.innerHTML=\`<span class="alert-num">\${b.num}</span><span class="alert-lbl">\${b.lbl}</span>\`;
    btn.addEventListener("click",()=>{ GANTT_FILTER=(GANTT_FILTER===b.key)?null:b.key; renderGantt(); populateGanttAlertBar(stats); });
    bar.appendChild(btn);
  }
  const d=document.createElement("div"); d.className="alert-divider"; bar.appendChild(d);
  const clr=document.createElement("button"); clr.className="alert-badge badge-clear"; clr.innerHTML="✕ CLEAR FILTER";
  clr.addEventListener("click",()=>{ GANTT_FILTER=null; renderGantt(); populateGanttAlertBar(stats); }); bar.appendChild(clr);
  const sum=document.createElement("span"); sum.style.cssText="margin-left:auto;font-size:9px;color:var(--text-dim);white-space:nowrap;flex-shrink:0"; sum.textContent=\`\${stats.total} active issues total\`; bar.appendChild(sum);
}

function makeBar(start,end,color,label,url,isIni,isClickable,overdueFlag){
  if(!start) return null;
  const effEnd=end||TODAY_STR; const l=dPct(start),r=dPct(effEnd); if(l===null) return null;
  const w=Math.max((r||l)-l,0.4);
  const bar=document.createElement("div");
  bar.className="bar"+(isIni?" initiative-bar":"")+(isClickable?" clickable-bar":"")+(overdueFlag?" bar-overdue":"");
  bar.style.left=l+"%"; bar.style.width=w+"%"; bar.style.background=color;
  if(w>4){ const lbl=document.createElement("span"); lbl.className="bar-label"; lbl.textContent=label; bar.appendChild(lbl); }
  if(url&&isClickable) bar.addEventListener("click",e=>{ e.stopPropagation(); window.open(url,"_blank"); });
  return bar;
}

function makeGanttRow({indent,label,status,color,start,end,url,hasChildren,isExpanded,isIni,onClick,barData,barClickable,assignee,priority,overdueFlag}){
  const priLevel=priority?priorityLevel(priority):null;
  const row=document.createElement("div");
  let rc="row"+(isIni?" initiative":"")+(hasChildren||onClick?" clickable":"");
  if(!isIni&&priLevel==="urgent") rc+=" row-urgent";
  else if(!isIni&&priLevel==="high") rc+=" row-high";
  else if(!isIni&&overdueFlag) rc+=" row-overdue";
  row.className=rc;
  if(onClick) row.addEventListener("click",onClick);
  const lc=document.createElement("div"); lc.className="row-label"; lc.style.paddingLeft=(10+indent*14)+"px";
  if(hasChildren){ const arr=document.createElement("span"); arr.className="row-arrow"+(isExpanded?" open":""); arr.textContent="▶"; lc.appendChild(arr); }
  const dot=document.createElement("span"); dot.className="row-dot"; dot.style.background=color||sc(status); lc.appendChild(dot);
  const nm=document.createElement("span"); nm.className="row-name"; nm.textContent=label; nm.title=label; lc.appendChild(nm);
  if(!isIni&&priLevel==="urgent"){ const pt=document.createElement("span"); pt.className="pri-tag pri-urgent"; pt.textContent="URGENT"; lc.appendChild(pt); }
  else if(!isIni&&priLevel==="high"){ const pt=document.createElement("span"); pt.className="pri-tag pri-high"; pt.textContent="HIGH"; lc.appendChild(pt); }
  if(!isIni&&overdueFlag){ const ot=document.createElement("span"); ot.className="overdue-tag"; ot.textContent="OVERDUE"; lc.appendChild(ot); }
  if(status){ const badge=document.createElement("span"); badge.className="row-badge"; badge.style.background=sc(status)+"22"; badge.style.color=sc(status); badge.textContent=status; lc.appendChild(badge); }
  if(assignee){ const asn=document.createElement("span"); asn.className="row-assignee"; asn.textContent=assignee.split(" ")[0]; asn.title=assignee; lc.appendChild(asn); }
  row.appendChild(lc);
  const bc=document.createElement("div"); bc.className="row-bars";
  const tl=document.createElement("div"); tl.className="today-line"; tl.style.left=TODAY_PCT+"%"; bc.appendChild(tl);
  if(start){
    const bar=makeBar(start,end,color||sc(status),label,url,isIni,barClickable,overdueFlag&&!isIni);
    if(bar){ const bd=barData||{label,status,start,end,url,clickable:barClickable}; bar.addEventListener("mouseenter",e=>showTip(e,bd)); bar.addEventListener("mouseleave",hideTip); bc.appendChild(bar); }
  } else { const nd=document.createElement("span"); nd.className="no-dates"; nd.textContent="no dates"; bc.appendChild(nd); }
  row.appendChild(bc);
  return row;
}

const ganttBody = document.getElementById("gantt-body");
function renderGantt(){
  if(!GANTT_DATA){ ganttBody.innerHTML='<div style="padding:40px;text-align:center;color:var(--text-muted);font-size:11px;letter-spacing:0.5px">LOADING\u2026</div>'; return; }
  ganttBody.innerHTML="";
  const isCustomerIni=ini=>(ini.name.indexOf("Customer")!==-1||ini.name.indexOf("Go Live")!==-1);
  const PRIO_ORDER=["Urgent","High","Medium","Low","No priority"];
  const PRIO_RANK={Urgent:0,High:1,Medium:2,Low:3,"No priority":4};
  const STATUS_RANK={Blocked:0,"In Test":1,"In Review":2,"In Progress":3,Todo:4,Backlog:5};
  const SWIM_CFG={Urgent:{cls:"swim-urgent"},High:{cls:"swim-high"},Medium:{cls:"swim-medium"},Low:{cls:"swim-low"},"No priority":{cls:"swim-none"}};

  function makeSectionHdr(title,sub){
    const h=document.createElement("div"); h.className="roadmap-sec-hdr";
    const t=document.createElement("span"); t.className="rsh-title"; t.textContent=title; h.appendChild(t);
    if(sub){ const s=document.createElement("span"); s.className="rsh-sub"; s.textContent=sub; h.appendChild(s); }
    return h;
  }

  // ── SECTION 1: Customer Commitments (drag-to-reorder projects) ───────────
  ganttBody.appendChild(makeSectionHdr("🤝  CUSTOMER COMMITMENTS","contract dates \u00b7 drag \u283f to reorder \u00b7 click project to expand issues"));
  renderCustomerCommitments(ganttBody);
  renderDealCloseDates(ganttBody);
  const custGap=document.createElement("div"); custGap.className="section-gap"; ganttBody.appendChild(custGap);

  // ── SECTION 2: Initiative Tree (all product initiatives, drag-to-reorder) ──
  ganttBody.appendChild(makeSectionHdr("⚡  PRODUCT PRIORITIES","all initiatives \u00b7 drag \u283f to reorder \u00b7 click project to expand issues"));
  renderInitiativeTree(ganttBody);

  populateGanttInsights();
}

// ── Deal Close Dates (HubSpot) — proper Gantt bars aligned with timeline ──────
function renderDealCloseDates(container){
  if(!HS_DATA||!HS_DATA.deals||!HS_DATA.deals.length) return;
  const DONE=new Set(["closedwon","closedlost","closed won","closed lost"]);
  const active=HS_DATA.deals
    .filter(d=>d.closeDate&&!DONE.has((d.stageLabel||d.stage||"").toLowerCase()))
    .sort((a,b)=>new Date(a.closeDate)-new Date(b.closeDate));
  if(!active.length) return;

  // Sub-header row styled the same as section headers but smaller
  const subHdr=document.createElement("div");
  subHdr.style.cssText="padding:6px 12px 2px;font-size:9px;color:var(--text-muted);letter-spacing:.8px;font-weight:700;text-transform:uppercase;margin-top:4px;display:flex;gap:8px;";
  subHdr.textContent="\uD83D\uDCBC  HubSpot pipeline close dates";
  container.appendChild(subHdr);

  const amt=(d)=>d.amount?(HS_DATA.currency||"\u20AC")+Number(d.amount).toLocaleString("en"):"";
  for(const d of active.slice(0,15)){
    const dd=daysDiff(d.closeDate);
    const isPast=dd<0;
    const isSoon=!isPast&&dd<=14;
    // Color: red = overdue, orange = ≤14d, blue = future
    const color=isPast?"#ef4444":isSoon?"#f97316":"#3b82f6";
    // Bar spans from createDate (or 30 days before close) → closeDate
    const barStart=d.createDate||new Date(new Date(d.closeDate)-30*864e5).toISOString().split("T")[0];
    const stageStr=d.stageLabel||d.stage||"";
    const amtStr=amt(d);
    const label=d.name+(amtStr?" · "+amtStr:"")+(stageStr?" ["+stageStr+"]":"");
    const hubUrl=HS_DATA.portalId?\`https://app.hubspot.com/contacts/\${HS_DATA.portalId}/deal/\${d.id}\`:null;
    const row=makeGanttRow({
      indent:0,
      label:d.name+(amtStr?" · "+amtStr:""),
      status:stageStr,
      color,
      start:barStart,
      end:d.closeDate,
      url:hubUrl,
      hasChildren:false,
      isExpanded:false,
      isIni:false,
      barClickable:!!hubUrl,
      overdueFlag:isPast,
      barData:{label,status:stageStr,start:barStart,end:d.closeDate,url:hubUrl,clickable:!!hubUrl},
    });
    container.appendChild(row);
  }
}

// ── Customer Commitments (drag-to-reorder projects) ───────────────────────────
const CUST_ORDER_KEY="supplied_cust_order";
function getCustOrder(projs){
  const saved=JSON.parse(localStorage.getItem(CUST_ORDER_KEY)||"[]");
  const byId=Object.fromEntries(projs.map(p=>[p.id,p]));
  const ordered=saved.filter(id=>byId[id]).map(id=>byId[id]);
  const seenIds=new Set(saved);
  for(const p of projs) if(!seenIds.has(p.id)) ordered.push(p);
  return ordered;
}
function saveCustOrder(projs){ localStorage.setItem(CUST_ORDER_KEY,JSON.stringify(projs.map(p=>p.id))); }
function renderCustomerCommitments(container){
  if(!GANTT_DATA) return;
  const custIni=GANTT_DATA.initiatives.find(ini=>ini.name.indexOf("Customer")!==-1||ini.name.indexOf("Go Live")!==-1);
  if(!custIni||DONE_STATES.has(custIni.status||"")) return;
  const activeProjs=(custIni.projects||[]).filter(p=>!DONE_STATES.has(p.status||""));
  if(!activeProjs.length) return;
  const PRIO_RANK={Urgent:0,High:1,Medium:2,Low:3,"No priority":4};
  const STATUS_RANK={Blocked:0,"In Test":1,"In Review":2,"In Progress":3,Todo:4,Backlog:5};
  let orderedProjs=getCustOrder(activeProjs);

  // Wrapper preserves position in container during rebuilds
  const wrapper=document.createElement("div"); wrapper.dataset.custWrapper="1";
  container.appendChild(wrapper);

  function rebuildCust(){
    wrapper.innerHTML="";
    for(const proj of orderedProjs){
      const projKey="cust_"+proj.id;
      const projExp=expanded[projKey]!==undefined?expanded[projKey]:true; // expanded by default
      const activeIss=(proj.issues||[]).filter(i=>!DONE_STATES.has(i.status||""))
        .sort((a,b)=>{ const pa=PRIO_RANK[a.priority]??99,pb=PRIO_RANK[b.priority]??99; return pa!==pb?pa-pb:(STATUS_RANK[a.status]??99)-(STATUS_RANK[b.status]??99); });
      const od=proj.targetDate&&proj.targetDate<TODAY_STR;
      const projColor=od?"#ef4444":sc(proj.status||"In Progress");

      // ── Project row as Gantt bar: today → targetDate ──────────────────────
      const projRow=makeGanttRow({
        indent:0,
        label:proj.name,
        status:proj.status||"In Progress",
        color:projColor,
        start:TODAY_STR,           // bar starts at today
        end:proj.targetDate||null, // bar ends at contract date
        url:proj.url,
        hasChildren:activeIss.length>0,
        isExpanded:projExp,
        isIni:true,
        barClickable:false,        // click label to expand/collapse
        overdueFlag:od,
        barData:{label:proj.name,status:proj.status||"",start:TODAY_STR,end:proj.targetDate,url:proj.url,clickable:false},
        onClick:()=>{ expanded[projKey]=!projExp; rebuildCust(); },
      });
      wrapper.appendChild(projRow);

      // ── Issues as indented Gantt bars ─────────────────────────────────────
      if(projExp && activeIss.length){
        for(const iss of activeIss){
          const issOd=isOverdue(iss.end,iss.status);
          // Use issue start→end if available, fall back to project targetDate as end
          const issStart=iss.start||iss.end||proj.targetDate||null;
          const issEnd=iss.end||proj.targetDate||null;
          const issLabel=(iss.identifier?iss.identifier+" ":"")+iss.title;
          const issRow=makeGanttRow({
            indent:1,
            label:issLabel,
            status:iss.status,
            color:sc(iss.status),
            start:issStart,
            end:issEnd,
            url:iss.url,
            hasChildren:false,
            isIni:false,
            barClickable:!!iss.url,
            overdueFlag:issOd,
            assignee:iss.assignee,
            priority:iss.priority,
            barData:{label:issLabel,status:iss.status,start:issStart,end:issEnd,url:iss.url,clickable:!!iss.url,assignee:iss.assignee,priority:iss.priority},
          });
          wrapper.appendChild(issRow);
        }
      }
    }
  }
  rebuildCust();
}

// ── Initiative Tree ───────────────────────────────────────────────────────────
const INI_ORDER_KEY="supplied_ini_order";
function getIniOrder(inis){
  const saved=JSON.parse(localStorage.getItem(INI_ORDER_KEY)||"[]");
  const byId=Object.fromEntries(inis.map(i=>[i.id,i]));
  const ordered=saved.filter(id=>byId[id]).map(id=>byId[id]);
  const seenIds=new Set(saved);
  for(const ini of inis) if(!seenIds.has(ini.id)) ordered.push(ini);
  return ordered;
}
function saveIniOrder(inis){ localStorage.setItem(INI_ORDER_KEY,JSON.stringify(inis.map(i=>i.id))); }
function renderInitiativeTree(container){
  if(!GANTT_DATA) return;
  const isCustomerIni=ini=>(ini.name.indexOf("Customer")!==-1||ini.name.indexOf("Go Live")!==-1);
  const PRIO_ORDER=["Urgent","High","Medium","Low","No priority"];
  const PRIO_COLORS={Urgent:"#ef4444",High:"#f97316",Medium:"#eab308",Low:"#3b82f6","No priority":"#94a3b8"};
  const STATUS_RANK={Blocked:0,"In Test":1,"In Review":2,"In Progress":3,Todo:4,Backlog:5};
  const activeInis=GANTT_DATA.initiatives.filter(i=>!isCustomerIni(i)&&!DONE_STATES.has(i.status||""));
  const orderedInis=getIniOrder(activeInis);
  let dragSrcIdx=null;
  const tree=document.createElement("div"); tree.className="ini-tree";
  function rebuildTree(){
    tree.innerHTML="";
    for(let idx=0;idx<orderedInis.length;idx++){
      const ini=orderedInis[idx];
      const iniKey="ini_"+ini.id;
      const iniExp=expanded[iniKey]!==undefined?expanded[iniKey]:true;
      let totalIssues=0;
      for(const proj of (ini.projects||[])){ if(!DONE_STATES.has(proj.status||"")) for(const iss of (proj.issues||[])){ if(isActive(iss.status)) totalIssues++; } }
      const row=document.createElement("div"); row.className="ini-row"; row.draggable=true;
      // ── Drag & drop ──────────────────────────────────────────────────────
      row.addEventListener("dragstart",function(e){ dragSrcIdx=idx; row.classList.add("dragging"); e.dataTransfer.effectAllowed="move"; });
      row.addEventListener("dragend",function(){ row.classList.remove("dragging"); tree.querySelectorAll(".drag-over").forEach(el=>el.classList.remove("drag-over")); });
      row.addEventListener("dragover",function(e){ e.preventDefault(); e.dataTransfer.dropEffect="move"; if(dragSrcIdx!==idx) row.classList.add("drag-over"); });
      row.addEventListener("dragleave",function(){ row.classList.remove("drag-over"); });
      row.addEventListener("drop",function(e){ e.preventDefault(); row.classList.remove("drag-over"); if(dragSrcIdx===null||dragSrcIdx===idx) return; const moved=orderedInis.splice(dragSrcIdx,1)[0]; orderedInis.splice(idx,0,moved); dragSrcIdx=null; saveIniOrder(orderedInis); rebuildTree(); });
      // ── Initiative header ─────────────────────────────────────────────────
      const hdr=document.createElement("div"); hdr.className="ini-hdr";
      const drag=document.createElement("span"); drag.className="ini-drag"; drag.textContent="\u283f"; drag.title="Drag to reorder";
      const arr=document.createElement("span"); arr.className="ini-arr"; arr.textContent=iniExp?"\u25BC":"\u25B6";
      const name=document.createElement("span"); name.className="ini-name"; name.textContent=ini.name;
      const badge=document.createElement("span"); badge.className="ini-hdr-badge"; badge.style.background=sc(ini.status||"Active")+"22"; badge.style.color=sc(ini.status||"Active"); badge.textContent=ini.status||"Active";
      const count=document.createElement("span"); count.className="ini-hdr-count"; count.textContent=totalIssues+" issues";
      hdr.appendChild(drag); hdr.appendChild(arr); hdr.appendChild(name); hdr.appendChild(badge); hdr.appendChild(count);
      hdr.addEventListener("click",function(e){ if(e.target===drag) return; expanded[iniKey]=!iniExp; rebuildTree(); });
      row.appendChild(hdr);
      // ── Projects ──────────────────────────────────────────────────────────
      if(iniExp){
        for(const proj of (ini.projects||[])){
          if(DONE_STATES.has(proj.status||"")) continue;
          const activeIssues=(proj.issues||[]).filter(i=>isActive(i.status));
          if(!activeIssues.length) continue;
          const projKey="inip_"+ini.id+"_"+proj.id;
          const projExp=expanded[projKey]!==undefined?expanded[projKey]:false;
          const projEl=document.createElement("div"); projEl.className="ini-proj";
          const projHdr=document.createElement("div"); projHdr.className="ini-proj-hdr";
          const pArr=document.createElement("span"); pArr.className="ini-proj-arr"; pArr.textContent=projExp?"\u25BC":"\u25B6";
          const pName=document.createElement("span"); pName.className="ini-proj-name"; pName.textContent=proj.name;
          const pBadge=document.createElement("span"); pBadge.className="ini-proj-badge"; pBadge.style.background=sc(proj.status||"Active")+"22"; pBadge.style.color=sc(proj.status||"Active"); pBadge.textContent=proj.status||"Active";
          const pCount=document.createElement("span"); pCount.className="ini-proj-count"; pCount.textContent=activeIssues.length+" issues";
          projHdr.appendChild(pArr); projHdr.appendChild(pName); projHdr.appendChild(pBadge); projHdr.appendChild(pCount);
          projHdr.addEventListener("click",function(e){ e.stopPropagation(); expanded[projKey]=!projExp; rebuildTree(); });
          projEl.appendChild(projHdr);
          // ── Issues grouped by priority ──────────────────────────────────
          if(projExp){
            const byPrio={};
            for(const p of PRIO_ORDER) byPrio[p]=[];
            for(const iss of activeIssues){ const p=(iss.priority&&byPrio[iss.priority]!==undefined)?iss.priority:"No priority"; byPrio[p].push(iss); }
            for(const p of PRIO_ORDER){
              const grpIss=byPrio[p]; if(!grpIss.length) continue;
              grpIss.sort((a,b)=>(STATUS_RANK[a.status]??99)-(STATUS_RANK[b.status]??99));
              const pGrp=document.createElement("div"); pGrp.className="ini-prio-grp";
              const pDot=document.createElement("span"); pDot.className="ini-prio-dot"; pDot.style.background=PRIO_COLORS[p];
              const pLbl=document.createElement("span"); pLbl.className="ini-prio-lbl"; pLbl.style.color=PRIO_COLORS[p]; pLbl.textContent=p.toUpperCase();
              const pCt=document.createElement("span"); pCt.className="ini-prio-ct"; pCt.textContent="("+grpIss.length+")";
              pGrp.appendChild(pDot); pGrp.appendChild(pLbl); pGrp.appendChild(pCt); projEl.appendChild(pGrp);
              for(const iss of grpIss){
                const issRow=document.createElement("div"); issRow.className="ini-issue";
                if(iss.url) issRow.addEventListener("click",function(e){ e.stopPropagation(); window.open(iss.url,"_blank"); });
                const dot=document.createElement("span"); dot.className="ini-iss-dot"; dot.style.background=sc(iss.status);
                const idEl=document.createElement("span"); idEl.className="ini-iss-id"; idEl.textContent=iss.identifier||"";
                const ttl=document.createElement("span"); ttl.className="ini-iss-title"; ttl.textContent=iss.title; ttl.title=iss.title;
                const stEl=document.createElement("span"); stEl.className="ini-iss-status"; stEl.style.background=sc(iss.status)+"22"; stEl.style.color=sc(iss.status); stEl.textContent=iss.status||"";
                const own=document.createElement("span"); own.className="ini-iss-owner"; own.textContent=(iss.assignee||"").split(" ")[0];
                issRow.appendChild(dot); issRow.appendChild(idEl); issRow.appendChild(ttl); issRow.appendChild(stEl); issRow.appendChild(own);
                if(iss.estimate!=null){ const sz=document.createElement("span"); sz.className="ini-iss-size"; sz.textContent=iss.estimate; sz.title="Estimate: "+iss.estimate+" pts"; issRow.appendChild(sz); }
                projEl.appendChild(issRow);
              }
            }
          }
          row.appendChild(projEl);
        }
      }
      tree.appendChild(row);
    }
  }
  rebuildTree();
  container.appendChild(tree);
}

// ── Gantt Insights Panel ─────────────────────────────────────────────────────
function populateGanttInsights(){
  const body = document.getElementById("gantt-insights-body");
  if(!body || !GANTT_DATA) return;
  body.innerHTML = "";

  const STATUS_RANK={Blocked:0,'In Test':1,'In Review':2,'In Progress':3,'Todo':4,'Backlog':5};
  const blocked=[], inReview=[], noDates=[], nextUp=[];

  for(const ini of GANTT_DATA.initiatives){
    for(const proj of ini.projects){
      for(const iss of (proj.issues||[])){
        if(DONE_STATES.has(iss.status||'')) continue;
        const item={id:iss.identifier,name:iss.title,url:iss.url,proj:proj.name,status:iss.status};
        if(iss.status==='Blocked')                         blocked.push(item);
        else if(iss.status==='In Review'||iss.status==='In Test') inReview.push(item);
        else if(iss.status==='In Progress'&&!iss.start&&!iss.end)  noDates.push(item);
        else if(iss.status==='Backlog'&&(iss.priority==='Urgent'||iss.priority==='High')) nextUp.push(item);
      }
    }
  }

  function makeSection(icon, color, title, items, hint){
    if(items.length===0) return;
    const sec=document.createElement("div"); sec.className="gi-section";
    const hdr=document.createElement("div"); hdr.className="gi-section-title";
    hdr.style.color=color;
    const badge=document.createElement("span"); badge.className="gi-badge";
    badge.style.cssText="background:"+color+"22;color:"+color;
    badge.textContent=items.length;
    hdr.textContent=icon+" "+title+" "; hdr.appendChild(badge);
    sec.appendChild(hdr);
    items.slice(0,8).forEach(it=>{
      const card=document.createElement("div"); card.className="gi-item";
      if(it.url) card.addEventListener("click",()=>window.open(it.url,"_blank"));
      const idEl=document.createElement("div"); idEl.className="gi-item-id"; idEl.textContent=it.proj+(it.id?" · "+it.id:""); card.appendChild(idEl);
      const nmEl=document.createElement("div"); nmEl.className="gi-item-name"; nmEl.textContent=it.name; card.appendChild(nmEl);
      const hintEl=document.createElement("div"); hintEl.className="gi-item-hint"; hintEl.textContent=hint; card.appendChild(hintEl);
      sec.appendChild(card);
    });
    if(items.length>8){ const m=document.createElement("div"); m.style.cssText="font-size:9px;color:var(--text-dim);padding:4px 2px;"; m.textContent="+"+(items.length-8)+" more"; sec.appendChild(m); }
    body.appendChild(sec);
  }

  makeSection("🔴","#ef4444","BLOCKED",blocked,"Unblock this to keep momentum — identify the dependency and loop in the right person.");
  makeSection("👁","#fb923c","NEEDS REVIEW",inReview,"These are waiting on a decision or feedback from you. A quick comment keeps things moving.");
  makeSection("📅","#f59e0b","IN PROGRESS · NO DATES",noDates,"Add start/end dates so the team knows when to expect delivery.");
  makeSection("⚡","#8b5cf6","HIGH PRIORITY BACKLOG",nextUp,"Consider pulling these into the current sprint — they're high priority but not yet scheduled.");

  if(body.children.length===0){
    body.innerHTML='<div class="gi-empty">✓ No blockers or items needing immediate attention</div>';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SALES & OPS (HUBSPOT)
// ═══════════════════════════════════════════════════════════════════════════
let HS_DATA       = null;
let GOOGLE_DATA   = null;
let LF_DATA       = null; // Leadfeeder website visitor data
let OPS_OWNER     = "all"; // "all" or ownerId string

function opsComputeStats(data){
  const tasks = data.tasks||[];
  const deals = data.deals||[];
  let overdue=0, today=0, closingWeek=0;
  for(const t of tasks){
    if(t.status==="COMPLETED") continue;
    if(isOverdue(t.dueDate,t.status||"OPEN")) overdue++;
    else if(t.dueDate===TODAY_STR) today++;
  }
  for(const d of deals){
    if(!isActive(d.stageType||"open")) continue;
    if(d.closeDate){ const dd=daysDiff(d.closeDate); if(dd>=0&&dd<=7) closingWeek++; }
  }
  return {overdue,today,closingWeek};
}

let OPS_FILTER = null;
function populateSalesAlertBar(stats){
  const bar=document.getElementById("alert-bar-sales"); bar.innerHTML="";
  const lbl=document.createElement("span"); lbl.className="alert-section-label"; lbl.textContent="NEEDS ATTENTION"; bar.appendChild(lbl);
  if(stats.overdue===0&&stats.today===0&&stats.closingWeek===0){
    const a=document.createElement("div"); a.className="alert-all-clear"; a.innerHTML="✓ <span>All tasks on track — no overdue items</span>"; bar.appendChild(a); return;
  }
  const badges=[{key:"overdue",num:stats.overdue,lbl:"OVERDUE TASKS",cls:"badge-overdue"},{key:"today",num:stats.today,lbl:"DUE TODAY",cls:"badge-today"},{key:"week",num:stats.closingWeek,lbl:"DEALS CLOSING THIS WEEK",cls:"badge-week"}];
  let first=true;
  for(const b of badges){
    if(b.num===0) continue;
    if(!first){ const d=document.createElement("div"); d.className="alert-divider"; bar.appendChild(d); }
    first=false;
    const btn=document.createElement("button");
    btn.className=\`alert-badge \${b.cls}\${OPS_FILTER===b.key?" active":""}\`;
    btn.dataset.filter=b.key;
    btn.innerHTML=\`<span class="alert-num">\${b.num}</span><span class="alert-lbl">\${b.lbl}</span>\`;
    btn.addEventListener("click",()=>{ OPS_FILTER=(OPS_FILTER===b.key)?null:b.key; renderOps(); populateSalesAlertBar(stats); });
    bar.appendChild(btn);
  }
  const d=document.createElement("div"); d.className="alert-divider"; bar.appendChild(d);
  const clr=document.createElement("button"); clr.className="alert-badge badge-clear"; clr.innerHTML="✕ CLEAR";
  clr.addEventListener("click",()=>{ OPS_FILTER=null; renderOps(); populateSalesAlertBar(stats); }); bar.appendChild(clr);
}

function populateOwnerStrip(data){
  const strip=document.getElementById("owner-strip"); strip.innerHTML="";
  const lbl=document.createElement("span"); lbl.className="owner-strip-label"; lbl.textContent="FILTER BY OWNER"; strip.appendChild(lbl);
  const all=document.createElement("button"); all.className="owner-pill"+(OPS_OWNER==="all"?" active":""); all.textContent="All"; all.addEventListener("click",()=>{ OPS_OWNER="all"; renderOps(); updateOwnerPills(); }); strip.appendChild(all);
  for(const o of (data.owners||[])){
    const pill=document.createElement("button");
    pill.className="owner-pill"+(OPS_OWNER===o.id?" active":"");
    pill.textContent=o.name.split(" ")[0]+(o.name.split(" ")[1]?" "+o.name.split(" ")[1][0]+".":"");
    pill.title=o.name;
    pill.addEventListener("click",()=>{ OPS_OWNER=o.id; renderOps(); updateOwnerPills(); });
    strip.appendChild(pill);
  }
}

function updateOwnerPills(){
  document.querySelectorAll(".owner-pill").forEach((p,i)=>{
    const id = i===0 ? "all" : (HS_DATA.owners||[])[i-1]?.id;
    p.classList.toggle("active", id===OPS_OWNER);
  });
}

const TASK_ICONS = { "CALL":"📞", "EMAIL":"✉️", "TODO":"☑️" };

function taskMatchesFilters(task){
  if(task.status==="COMPLETED") return false;
  if(OPS_OWNER!=="all" && task.ownerId!==OPS_OWNER) return false;
  if(OPS_FILTER==="overdue") return isOverdue(task.dueDate,"OPEN");
  if(OPS_FILTER==="today")   return task.dueDate===TODAY_STR;
  return true;
}

function dealMatchesFilters(deal){
  if(!isActive(deal.stageType||"open")) return false;
  if(OPS_OWNER!=="all" && deal.ownerId!==OPS_OWNER) return false;
  if(OPS_FILTER==="week") return deal.closeDate && daysDiff(deal.closeDate)>=0 && daysDiff(deal.closeDate)<=7;
  if(OPS_FILTER==="overdue"||OPS_FILTER==="today") return false; // tasks only
  return true;
}

// Stage color palette — cycles through these for pipeline stages
const STAGE_COLORS=["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#14b8a6","#f97316","#a855f7"];
const _stageColorMap={};
function stageColor(label){
  if(!_stageColorMap[label]){
    const keys=Object.keys(_stageColorMap);
    _stageColorMap[label]=STAGE_COLORS[keys.length % STAGE_COLORS.length];
  }
  return _stageColorMap[label];
}

function computeHealthScore(company){
  // Health = composite of recency of contact, open deals, and activity
  // Returns {score: 0-100, label: 'Healthy'|'At Risk'|'Needs Attention'|'Unknown', cls: 'green'|'amber'|'red'|'grey'}
  if(company.daysSinceContact===null && !company.openDeals) return {score:null,label:"Unknown",cls:"grey"};
  let score=100;
  const days=company.daysSinceContact;
  if(days===null){ score-=40; }
  else if(days>90){ score-=50; }
  else if(days>30){ score-=25; }
  else if(days>14){ score-=10; }
  if(company.openDeals>0) score+=10;
  if(company.recentDealAmount>0) score=Math.min(score+5,100);
  if(company.notes&&company.notes.length) score=Math.min(score+5,100);
  score=Math.max(0,Math.min(100,score));
  if(score>=70) return {score,label:"Healthy",cls:"green"};
  if(score>=40) return {score,label:"At Risk",cls:"amber"};
  return {score,label:"Needs Attention",cls:"red"};
}

function getNextSteps(company, health){
  if(health.cls==="red"){
    const d=company.daysSinceContact;
    if(d>90) return "No contact in "+d+" days — schedule a check-in call.";
    if(d>30) return "Last contacted "+d+" days ago — follow up to stay top of mind.";
    return "Review account health and confirm go-live status.";
  }
  if(health.cls==="amber"){
    if(company.openDeals>0) return company.openDeals+" open deal"+(company.openDeals>1?"s":"")+". Confirm next steps and close date.";
    return "No open deals — explore expansion or renewal opportunities.";
  }
  if(company.openDeals>0) return "Active deal in progress — keep momentum going.";
  return "Account is active. Consider a QBR or upsell conversation.";
}

function renderAccountManagement(){
  const container=document.getElementById("accounts-main");
  if(!container) return;
  container.innerHTML="";
  const companies=(HS_DATA&&HS_DATA.companies)||[];
  if(!companies.length){
    container.innerHTML=\`<div style="padding:60px;text-align:center;color:var(--text-dim);font-size:12px;">No customer companies found in HubSpot.<br><br>Make sure companies are marked with lifecycle stage <strong>Customer</strong>.</div>\`;
    return;
  }
  // Toolbar
  const toolbar=document.createElement("div"); toolbar.className="acct-toolbar";
  const title=document.createElement("span"); title.className="acct-toolbar-title"; title.textContent="\uD83C\uDFE2  ACCOUNT MANAGEMENT  \u2014  "+companies.length+" customers";
  const search=document.createElement("input"); search.type="text"; search.className="acct-search"; search.placeholder="Search accounts\u2026";
  const filters=[{key:"all",label:"All"},{key:"red",label:"\uD83D\uDD34 Needs Attention"},{key:"amber",label:"\uD83D\uDFE0 At Risk"},{key:"green",label:"\uD83D\uDFE2 Healthy"}];
  let activeFilter="all";
  const filterBtns=[];
  filters.forEach(f=>{
    const btn=document.createElement("button"); btn.className="acct-filter-btn"+(f.key==="all"?" active":""); btn.textContent=f.label;
    btn.addEventListener("click",()=>{ activeFilter=f.key; filterBtns.forEach(b=>b.classList.remove("active")); btn.classList.add("active"); renderCards(); });
    filterBtns.push(btn); toolbar.appendChild(btn);
  });
  toolbar.appendChild(title); toolbar.appendChild(search); container.appendChild(toolbar);
  const grid=document.createElement("div"); grid.className="acct-grid"; container.appendChild(grid);
  const enriched=companies.map(c=>({...c,health:computeHealthScore(c),nextSteps:getNextSteps(c,computeHealthScore(c))}));
  function renderCards(){
    const q=(search.value||"").toLowerCase();
    grid.innerHTML="";
    const visible=enriched.filter(c=>{
      if(q&&!c.name.toLowerCase().includes(q)&&!(c.domain||"").includes(q)) return false;
      if(activeFilter!=="all"&&c.health.cls!==activeFilter) return false;
      return true;
    }).sort((a,b)=>{
      const rank={red:0,amber:1,grey:2,green:3};
      return (rank[a.health.cls]??9)-(rank[b.health.cls]??9);
    });
    for(const c of visible){
      const card=document.createElement("div"); card.className="acct-card";
      const hsUrl=HS_DATA&&HS_DATA.portalId?\`https://app.hubspot.com/contacts/\${HS_DATA.portalId}/company/\${c.id}\`:null;
      if(hsUrl) card.addEventListener("click",()=>window.open(hsUrl,"_blank"));
      // Owner pill
      if(c.ownerName){
        const op=document.createElement("span"); op.className="acct-owner-pill"; op.textContent=c.ownerName.split(" ")[0]; card.appendChild(op);
      }
      // Top row: avatar + name + health
      const top=document.createElement("div"); top.className="acct-card-top";
      const av=document.createElement("div"); av.className="acct-avatar"; av.textContent=(c.name||"?")[0].toUpperCase();
      const nameWrap=document.createElement("div");
      const nm=document.createElement("div"); nm.className="acct-name"; nm.textContent=c.name;
      const dm=document.createElement("div"); dm.className="acct-domain"; dm.textContent=c.domain||"";
      nameWrap.appendChild(nm); nameWrap.appendChild(dm);
      const hbadge=document.createElement("div"); hbadge.className="acct-health";
      const hb=document.createElement("span"); hb.className=\`health-badge health-\${c.health.cls}\`; hb.textContent=c.health.label;
      hbadge.appendChild(hb);
      top.appendChild(av); top.appendChild(nameWrap); top.appendChild(hbadge);
      card.appendChild(top);
      // Meta chips
      const metaRow=document.createElement("div"); metaRow.className="acct-meta-row";
      const dsc=c.daysSinceContact;
      const contactCls=dsc===null?"":dsc>30?"warn":"ok";
      const contactTxt=dsc===null?"Never contacted":dsc===0?"Contacted today":dsc===1?"Contacted yesterday":""+dsc+"d since contact";
      [{txt:contactTxt,cls:contactCls},{txt:c.contacts+" contact"+(c.contacts!==1?"s":""),cls:""},{txt:c.openDeals+" open deal"+(c.openDeals!==1?"s":""),cls:c.openDeals>0?"ok":""}].forEach(m=>{
        const ch=document.createElement("span"); ch.className="acct-meta-chip"+(m.cls?" "+m.cls:""); ch.textContent=m.txt; metaRow.appendChild(ch);
      });
      card.appendChild(metaRow);
      // Recent notes
      if(c.notes&&c.notes.length){
        const nl=document.createElement("div"); nl.className="acct-section-label"; nl.textContent="RECENT NOTES"; card.appendChild(nl);
        c.notes.slice(0,2).forEach(n=>{
          const nd=document.createElement("div"); nd.className="acct-note";
          if(n.date){ const dl=document.createElement("div"); dl.className="acct-note-date"; dl.textContent=fmtDate(n.date); nd.appendChild(dl); }
          const nb=document.createElement("div"); nb.textContent=(n.body||"").slice(0,120)+(n.body&&n.body.length>120?"\u2026":""); nd.appendChild(nb);
          nl.parentNode&&nl.parentNode.appendChild(nd); card.appendChild(nd);
        });
      }
      // Next steps
      const ns=document.createElement("div"); ns.className="acct-next-steps";
      const nsl=document.createElement("div"); nsl.className="acct-next-label"; nsl.textContent="\u2192 SUGGESTED NEXT STEP";
      const nst=document.createElement("div"); nst.className="acct-next-text"; nst.textContent=c.nextSteps;
      ns.appendChild(nsl); ns.appendChild(nst); card.appendChild(ns);
      grid.appendChild(card);
    }
    if(!visible.length){
      const em=document.createElement("div"); em.style.cssText="grid-column:1/-1;padding:40px;text-align:center;color:var(--text-dim);font-size:11px;";
      em.textContent="No accounts match your search or filter."; grid.appendChild(em);
    }
  }
  search.addEventListener("input",renderCards);
  renderCards();
}

function renderSalesFunnels(){
  const wrap=document.getElementById("sales-funnels-row");
  if(!wrap||!HS_DATA) return;
  wrap.innerHTML="";
  const cur=HS_DATA.currency||"\u20AC";

  // ── DEAL FUNNEL ───────────────────────────────────────────────────────────
  const dealPanel=document.createElement("div"); dealPanel.className="funnel-panel";
  const dealTitle=document.createElement("div"); dealTitle.className="funnel-title";
  const openDeals=(HS_DATA.deals||[]).filter(d=>!isDoneStage(d.stageLabel));
  const totalPipeVal=openDeals.reduce((s,d)=>s+(d.amount||0),0);
  dealTitle.innerHTML=\`<span>\uD83D\uDCC8  DEAL PIPELINE</span><span class="funnel-title-kpi">\${cur}\${totalPipeVal.toLocaleString()}</span>\`;
  dealPanel.appendChild(dealTitle);

  // Build ordered stages from pipeline data, fall back to deal stage labels
  const pipelines=HS_DATA.pipelines||[];
  let orderedStages=[];
  if(pipelines.length){
    // Use first pipeline's stage order (or merge all)
    const seen=new Set();
    for(const pipe of pipelines){
      for(const s of (pipe.stages||[])){
        if(!seen.has(s.label)){ seen.add(s.label); orderedStages.push(s); }
      }
    }
  }
  // Count deals per stage, keep deal list + weekly activity for expand
  const weekAgo=new Date(Date.now()-7*864e5).toISOString().slice(0,10);
  const stageDeals={};
  for(const d of openDeals){
    const sl=d.stageLabel||d.stage||"Unknown";
    if(!stageDeals[sl]) stageDeals[sl]={count:0,value:0,prob:d.probability,deals:[],newThisWeek:0,movedThisWeek:0};
    stageDeals[sl].count++;
    stageDeals[sl].value+=(d.amount||0);
    stageDeals[sl].deals.push(d);
    if(d.createDate&&d.createDate>=weekAgo) stageDeals[sl].newThisWeek++;
    else if(d.modifiedDate&&d.modifiedDate>=weekAgo) stageDeals[sl].movedThisWeek++;
  }
  // Build rows: use orderedStages if available, else derive from deals
  const funnelStages=orderedStages.length
    ? orderedStages.filter(s=>stageDeals[s.label]).map(s=>({label:s.label,prob:s.probability,...stageDeals[s.label]}))
    : Object.entries(stageDeals).map(([label,v])=>({label,...v}));
  const maxCount=Math.max(1,...funnelStages.map(s=>s.count));
  const COLORS=["#6366f1","#8b5cf6","#a78bfa","#7c3aed","#4f46e5","#3b82f6","#0ea5e9"];
  const portalIdDeals=HS_DATA.portalId||"";
  funnelStages.forEach((s,i)=>{
    const block=document.createElement("div"); block.style.cssText="margin-bottom:2px;";
    const row=document.createElement("div"); row.className="funnel-row";
    row.style.cssText="cursor:pointer;user-select:none;";
    const lbl=document.createElement("div"); lbl.className="funnel-label"; lbl.textContent=s.label; lbl.title=s.label;
    const barWrap=document.createElement("div"); barWrap.className="funnel-bar-wrap";
    const bar=document.createElement("div"); bar.className="funnel-bar";
    const pct=Math.round((s.count/maxCount)*100);
    bar.style.cssText=\`width:\${pct}%;background:\${COLORS[i%COLORS.length]}\`;
    const barLbl=document.createElement("span"); barLbl.className="funnel-bar-label"; barLbl.textContent=s.count+" deal"+(s.count!==1?"s":"");
    bar.appendChild(barLbl); barWrap.appendChild(bar);
    const meta=document.createElement("div"); meta.className="funnel-meta";
    meta.textContent=s.value>0?cur+Math.round(s.value/1000)+"k":"—";
    // Weekly activity badge
    const weekBadge=document.createElement("span");
    weekBadge.style.cssText="font-size:9px;flex-shrink:0;margin-left:4px;";
    if(s.newThisWeek>0){
      weekBadge.style.color="#10b981"; weekBadge.title="New this week";
      weekBadge.textContent="+"+s.newThisWeek+" new";
    } else if(s.movedThisWeek>0){
      weekBadge.style.color="#f59e0b"; weekBadge.title="Updated this week";
      weekBadge.textContent="~"+s.movedThisWeek+" updated";
    }
    const chevron=document.createElement("span");
    chevron.textContent="▸";
    chevron.style.cssText="font-size:9px;color:var(--text-muted);margin-left:4px;flex-shrink:0;transition:transform .2s;";
    row.appendChild(lbl); row.appendChild(barWrap); row.appendChild(meta);
    if(s.newThisWeek||s.movedThisWeek) row.appendChild(weekBadge);
    row.appendChild(chevron);

    // Expandable deals list
    const dealsList=document.createElement("div");
    dealsList.style.cssText="display:none;padding:5px 0 5px 16px;border-left:2px solid var(--border);margin-left:4px;margin-bottom:4px;";
    (s.deals||[]).sort((a,b)=>(b.amount||0)-(a.amount||0)).forEach(d=>{
      const dr=document.createElement("div");
      dr.style.cssText="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:11px;border-bottom:1px solid var(--border);";
      const dealUrl=portalIdDeals?\`https://app.hubspot.com/contacts/\${portalIdDeals}/deal/\${d.id}\`:\`#\`;
      const link=document.createElement("a");
      link.href=dealUrl; link.target="_blank"; link.rel="noopener";
      link.style.cssText="color:var(--accent);text-decoration:none;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500;";
      link.textContent=d.name||"(unnamed deal)";
      link.addEventListener("mouseover",()=>link.style.textDecoration="underline");
      link.addEventListener("mouseout",()=>link.style.textDecoration="none");
      const amt=document.createElement("span");
      amt.style.cssText="color:#10b981;font-weight:600;font-size:10px;flex-shrink:0;";
      amt.textContent=d.amount?cur+d.amount.toLocaleString():"—";
      const owner=document.createElement("span");
      owner.style.cssText="color:var(--text-muted);font-size:10px;flex-shrink:0;";
      owner.textContent=d.ownerName?(d.ownerName.split(" ")[0]):"";
      const closeDate=document.createElement("span");
      closeDate.style.cssText="color:var(--text-dim);font-size:10px;flex-shrink:0;";
      if(d.closeDate){
        const cd=new Date(d.closeDate);
        const isPast=cd<new Date();
        closeDate.style.color=isPast?"#ef4444":"var(--text-dim)";
        closeDate.textContent=cd.toLocaleDateString("en-GB",{day:"2-digit",month:"short"});
      }
      dr.appendChild(link); dr.appendChild(amt); dr.appendChild(owner); dr.appendChild(closeDate);
      dealsList.appendChild(dr);
    });

    let expanded=false;
    row.addEventListener("click",()=>{
      expanded=!expanded;
      dealsList.style.display=expanded?"block":"none";
      chevron.style.transform=expanded?"rotate(90deg)":"";
      row.style.background=expanded?"rgba(255,255,255,.04)":"";
      row.style.borderRadius=expanded?"4px":"";
    });
    block.appendChild(row); block.appendChild(dealsList);
    dealPanel.appendChild(block);
  });
  // Won/lost footer + weekly pipeline activity
  const cls=HS_DATA.closedDealStats||{wonCount:0,wonValue:0,lostCount:0,lostValue:0};
  const total90=cls.wonCount+cls.lostCount;
  const winRate=total90>0?Math.round((cls.wonCount/total90)*100):null;
  // Weekly pipeline stats from open deals
  const newDealsWeek=openDeals.filter(d=>d.createDate&&d.createDate>=weekAgo).length;
  const updatedDealsWeek=openDeals.filter(d=>d.modifiedDate&&d.modifiedDate>=weekAgo&&!(d.createDate&&d.createDate>=weekAgo)).length;
  const wonRow=document.createElement("div"); wonRow.className="funnel-won-row";
  [
    {label:"WON (90d)",   val:cls.wonCount?cur+Math.round(cls.wonValue/1000)+"k ("+cls.wonCount+")":"—", cls_:cls.wonCount?"green":""},
    {label:"LOST (90d)",  val:cls.lostCount?cls.lostCount+" deals":"—",                                  cls_:cls.lostCount?"red":""},
    {label:"WIN RATE",    val:winRate!=null?winRate+"%":"—",                                              cls_:winRate!=null&&winRate>=50?"green":winRate!=null?"red":""},
    {label:"NEW THIS WK", val:newDealsWeek>0?"+"+newDealsWeek+" deals":"—",                               cls_:newDealsWeek?"green":""},
    {label:"MOVED THIS WK",val:updatedDealsWeek>0?updatedDealsWeek+" deals":"—",                          cls_:updatedDealsWeek?"":""},
  ].forEach(k=>{
    const kpi=document.createElement("div"); kpi.className="funnel-won-kpi";
    const kl=document.createElement("div"); kl.className="funnel-won-kpi-label"; kl.textContent=k.label;
    const kv=document.createElement("div"); kv.className="funnel-won-kpi-val "+(k.cls_||""); kv.textContent=k.val;
    kpi.appendChild(kl); kpi.appendChild(kv); wonRow.appendChild(kpi);
  });
  dealPanel.appendChild(wonRow);
  wrap.appendChild(dealPanel);

  // ── WEBSITE TRAFFIC (Leadfeeder) — replaces Marketing Funnel ─────────────
  const srcPanel=document.createElement("div"); srcPanel.className="funnel-panel";
  srcPanel.style.cssText="min-width:340px;flex:1.4;";
  const srcTitle=document.createElement("div"); srcTitle.className="funnel-title";
  const lfAvail=LF_DATA&&LF_DATA.available;
  const trafficSources=lfAvail?(LF_DATA.trafficSources||[]):[];
  const totalThisWeek=lfAvail?(LF_DATA.thisWeekTotal||0):0;
  const totalLastWeek=lfAvail?(LF_DATA.lastWeekTotal||0):0;
  const weekTrend=totalLastWeek>0?Math.round(((totalThisWeek-totalLastWeek)/totalLastWeek)*100):null;
  const weekTrendHtml=weekTrend!=null
    ?\`<span style="font-size:10px;color:\${weekTrend>=0?"#10b981":"#ef4444"};margin-left:8px;">\${weekTrend>=0?"↑":"↓"}\${Math.abs(weekTrend)}% w/w</span>\`:"";
  srcTitle.innerHTML=\`<span>🌐  WEBSITE TRAFFIC</span><span class="funnel-title-kpi">\${lfAvail?totalThisWeek+" companies this week":"via Leadfeeder"}\${weekTrendHtml}</span>\`;
  srcPanel.appendChild(srcTitle);

  if(!lfAvail){
    // Leadfeeder not connected — show setup card
    const setup=document.createElement("div");
    setup.style.cssText="padding:12px 0;font-size:11px;line-height:1.7;";
    setup.innerHTML=\`
      <div style="font-size:12px;color:var(--text);margin-bottom:8px;font-weight:600;">Connect Leadfeeder to see live website visitor data</div>
      <div style="color:var(--text-muted);margin-bottom:10px;">This panel will show which companies are visiting your website, broken down by traffic source, with week-on-week trends.</div>
      <div style="background:rgba(255,255,255,.06);border-radius:6px;padding:10px 12px;font-size:10px;line-height:2;">
        <div style="color:var(--text);font-weight:600;margin-bottom:2px;">To activate:</div>
        <div>1. Go to Leadfeeder → Settings → <b>API tokens</b> → create a token</div>
        <div>2. Add it as <code style="background:rgba(255,255,255,.12);padding:1px 5px;border-radius:3px;">LEADFEEDER_API_KEY</code> in your GitHub repo secrets</div>
        <div>3. Run the <b>Refresh Gantt Dashboard</b> workflow</div>
      </div>\`;
    srcPanel.appendChild(setup);
  } else if(!trafficSources.length){
    const em=document.createElement("div"); em.style.cssText="font-size:11px;color:var(--text-dim);padding:20px 0";
    em.textContent="No traffic data yet — run data refresh to populate."; srcPanel.appendChild(em);
  } else {
    const maxSrcWeek=Math.max(1,...trafficSources.map(t=>t.thisWeek));

    trafficSources.forEach((src)=>{
      if(!src.thisWeek&&!src.lastWeek) return;
      const wowPct=src.lastWeek>0?Math.round(((src.thisWeek-src.lastWeek)/src.lastWeek)*100):null;
      const wowColor=wowPct==null?"#6b7280":wowPct>=0?"#10b981":"#ef4444";
      const wowText=wowPct==null?(src.thisWeek>0?"new":"—"):(wowPct>=0?"↑"+Math.abs(wowPct)+"%":"↓"+Math.abs(wowPct)+"%");

      const srcBlock=document.createElement("div"); srcBlock.style.cssText="margin-bottom:6px;";
      const srcRow=document.createElement("div"); srcRow.className="funnel-row";
      srcRow.style.cssText="cursor:pointer;user-select:none;";
      const srcLbl=document.createElement("div"); srcLbl.className="funnel-label";
      srcLbl.style.cssText="display:flex;align-items:center;gap:6px;min-width:140px;";
      srcLbl.innerHTML=\`<span style="font-size:13px">\${src.icon||"📊"}</span><span>\${src.label}</span>\`;

      const barWrap=document.createElement("div"); barWrap.className="funnel-bar-wrap";
      const bar=document.createElement("div"); bar.className="funnel-bar";
      bar.style.cssText=\`width:\${Math.round((src.thisWeek/maxSrcWeek)*100)||2}%;background:#3b82f6;min-width:4px\`;
      const barLbl=document.createElement("span"); barLbl.className="funnel-bar-label";
      barLbl.textContent=src.thisWeek+" co.";
      bar.appendChild(barLbl); barWrap.appendChild(bar);

      const wowBadge=document.createElement("div"); wowBadge.className="funnel-meta";
      wowBadge.innerHTML=\`<span style="color:\${wowColor};font-weight:600;font-size:10px;">\${wowText}</span>\`;
      const chevron=document.createElement("span");
      chevron.textContent="▸";
      chevron.style.cssText="font-size:9px;color:var(--text-muted);margin-left:4px;transition:transform .2s;flex-shrink:0;";
      srcRow.appendChild(srcLbl); srcRow.appendChild(barWrap); srcRow.appendChild(wowBadge); srcRow.appendChild(chevron);

      // Expandable company list
      const coList=document.createElement("div");
      coList.style.cssText="display:none;padding:6px 0 6px 16px;border-left:2px solid var(--border);margin-left:6px;margin-top:3px;";
      const companies=src.companies||[];
      if(companies.length){
        const listHdr=document.createElement("div");
        listHdr.style.cssText="font-size:9px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;";
        listHdr.textContent="Companies visiting this week";
        coList.appendChild(listHdr);
        for(const co of companies){
          const coRow=document.createElement("div");
          coRow.style.cssText="display:flex;align-items:center;gap:8px;padding:3px 0;font-size:11px;border-bottom:1px solid var(--border);";
          const coName=document.createElement(co.website?"a":"span");
          if(co.website){ coName.href=co.website.startsWith("http")?co.website:"https://"+co.website; coName.target="_blank"; coName.rel="noopener"; }
          coName.style.cssText="color:var(--accent);text-decoration:none;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
          coName.textContent=co.name;
          if(co.website){
            coName.addEventListener("mouseover",()=>coName.style.textDecoration="underline");
            coName.addEventListener("mouseout",()=>coName.style.textDecoration="none");
          }
          const visits=document.createElement("span");
          visits.style.cssText="color:var(--text-muted);font-size:10px;flex-shrink:0;";
          visits.textContent=(co.visits||1)+" visit"+(co.visits!==1?"s":"");
          const lastSeen=document.createElement("span");
          lastSeen.style.cssText="color:var(--text-dim);font-size:9px;flex-shrink:0;";
          lastSeen.textContent=co.lastVisit||"";
          coRow.appendChild(coName); coRow.appendChild(visits); coRow.appendChild(lastSeen);
          coList.appendChild(coRow);
        }
      } else {
        const em=document.createElement("div"); em.style.cssText="font-size:11px;color:var(--text-dim);padding:4px 0;";
        em.textContent="No company data for this source."; coList.appendChild(em);
      }

      let expanded=false;
      srcRow.addEventListener("click",()=>{
        expanded=!expanded;
        coList.style.display=expanded?"block":"none";
        chevron.style.transform=expanded?"rotate(90deg)":"";
      });
      srcBlock.appendChild(srcRow); srcBlock.appendChild(coList);
      srcPanel.appendChild(srcBlock);
    });

    // Top companies this week
    const topCos=LF_DATA.topCompanies||[];
    if(topCos.length){
      const divider=document.createElement("div");
      divider.style.cssText="border-top:1px solid var(--border);margin:12px 0 8px;";
      srcPanel.appendChild(divider);
      const topHdr=document.createElement("div");
      topHdr.style.cssText="font-size:9px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;font-weight:600;";
      topHdr.textContent="\uD83C\uDFE2 Top Visiting Companies This Week";
      srcPanel.appendChild(topHdr);
      for(const co of topCos.slice(0,8)){
        const coRow=document.createElement("div");
        coRow.style.cssText="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:11px;border-bottom:1px solid var(--border);";
        const coName=document.createElement(co.website?"a":"span");
        if(co.website){ coName.href=co.website.startsWith("http")?co.website:"https://"+co.website; coName.target="_blank"; coName.rel="noopener"; }
        coName.style.cssText="color:var(--text);text-decoration:none;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500;";
        coName.textContent=co.name;
        const coSrc=document.createElement("span");
        coSrc.style.cssText="color:var(--text-dim);font-size:9px;flex-shrink:0;";
        coSrc.textContent=co.source||"";
        const pv=document.createElement("span");
        pv.style.cssText="color:#3b82f6;font-size:10px;font-weight:600;flex-shrink:0;";
        pv.textContent=(co.pageViews||co.visits||1)+" pv";
        coRow.appendChild(coName); coRow.appendChild(coSrc); coRow.appendChild(pv);
        srcPanel.appendChild(coRow);
      }
    }
  }
  wrap.appendChild(srcPanel);
}

function renderOps(){
  const tasksCol=document.getElementById("ops-tasks-col");
  const pipeCol=document.getElementById("ops-pipeline-col");
  if(!tasksCol||!pipeCol) return;
  tasksCol.innerHTML=""; pipeCol.innerHTML="";

  if(!HS_DATA||(!HS_DATA.tasks?.length&&!HS_DATA.deals?.length)){ renderOpsEmpty(); return; }

  const tasks=(HS_DATA.tasks||[]).filter(taskMatchesFilters);
  const deals=(HS_DATA.deals||[]).filter(dealMatchesFilters);

  // ── LEFT: TASKS COLUMN ────────────────────────────────────────────────
  const taskHeader=document.createElement("div"); taskHeader.className="ops-section-header";
  taskHeader.style.top="0";
  taskHeader.innerHTML=\`<span>☑ TASKS</span> <span class="ops-section-count">\${tasks.length}</span>\`;
  tasksCol.appendChild(taskHeader);

  if(tasks.length===0){
    const em=document.createElement("div"); em.style.cssText="padding:32px 20px;font-size:11px;color:var(--text-dim);text-align:center";
    em.textContent=OPS_OWNER!=="all"?"No tasks assigned to this person.":"All tasks complete — nothing outstanding!";
    tasksCol.appendChild(em);
  } else {
    const groups = [
      { key:"overdue", label:"OVERDUE",    color:"#f59e0b", items:[] },
      { key:"today",   label:"DUE TODAY",  color:"#3b82f6", items:[] },
      { key:"week",    label:"THIS WEEK",  color:"#8b5cf6", items:[] },
      { key:"later",   label:"UPCOMING",   color:"#64748b", items:[] },
    ];
    for(const t of tasks){
      if(isOverdue(t.dueDate,"OPEN"))               groups[0].items.push(t);
      else if(t.dueDate===TODAY_STR)                groups[1].items.push(t);
      else if(t.dueDate && daysDiff(t.dueDate)<=7)  groups[2].items.push(t);
      else                                           groups[3].items.push(t);
    }

    for(const g of groups){
      if(g.items.length===0) continue;
      const grpH=document.createElement("div");
      grpH.style.cssText=\`padding:5px 16px;font-size:8px;color:\${g.color};letter-spacing:1.2px;border-bottom:1px solid var(--border);border-top:1px solid var(--border);background:var(--surface2);display:flex;align-items:center;gap:6px\`;
      grpH.innerHTML=\`<span style="width:5px;height:5px;border-radius:50%;background:\${g.color};flex-shrink:0;display:inline-block"></span>\${g.label} <span style="opacity:.5">(\${g.items.length})</span>\`;
      tasksCol.appendChild(grpH);

      for(const t of g.items){
        const od=isOverdue(t.dueDate,"OPEN"); const td=t.dueDate===TODAY_STR;
        const pri=priorityLevel(t.priority);
        const row=document.createElement("div");
        row.className="task-row"+(od?" row-overdue":"")+(pri==="urgent"?" row-urgent":"");
        row.title=t.subject||(t.body?"Has notes":"");
        const taskUrl=HS_DATA.portalId?\`https://app.hubspot.com/tasks/\${HS_DATA.portalId}?taskId=\${t.id}\`:null;
        if(taskUrl){ row.style.cursor="pointer"; row.addEventListener("click",()=>window.open(taskUrl,"_blank")); }

        // Type icon
        const icon=document.createElement("span"); icon.className="task-type-icon"; icon.textContent=TASK_ICONS[t.type]||"☑"; row.appendChild(icon);

        // Name — main content
        const nm=document.createElement("span"); nm.className="task-name"; nm.textContent=t.subject||"(no subject)"; row.appendChild(nm);

        // Priority badge
        if(pri==="urgent"){ const pt=document.createElement("span"); pt.className="pri-tag pri-urgent"; pt.textContent="URGENT"; row.appendChild(pt); }
        else if(pri==="high"){ const pt=document.createElement("span"); pt.className="pri-tag pri-high"; pt.textContent="HIGH"; row.appendChild(pt); }

        // Owner pill — always shown
        if(t.ownerName){
          const op=document.createElement("span"); op.className="task-owner-pill"; op.textContent=t.ownerName.split(" ")[0]; row.appendChild(op);
        }

        // Due date
        const du=document.createElement("span"); du.className="task-due"+(od?" overdue":td?" today":""); du.textContent=t.dueDate?fmtDate(t.dueDate):"No date"; row.appendChild(du);

        tasksCol.appendChild(row);
      }
    }
  }

  // ── RIGHT: PIPELINE COLUMN ─────────────────────────────────────────────
  const allDeals=(HS_DATA.deals||[]).filter(dealMatchesFilters);
  const pipeHeader=document.createElement("div"); pipeHeader.className="ops-section-header";
  pipeHeader.style.top="0";
  const totalVal=allDeals.reduce((s,d)=>s+(d.amount||0),0);
  const wgtVal=allDeals.reduce((s,d)=>s+(d.amount||0)*(d.probability||0),0);
  pipeHeader.innerHTML=\`<span>💼 PIPELINE</span> <span class="ops-section-count">\${allDeals.length}</span>
    \${totalVal>0?\`<span style="margin-left:auto;font-size:9px;color:#10b981;font-weight:600">\${(HS_DATA.currency||"€")}\${totalVal.toLocaleString()}</span>\`:""}
  \`;
  pipeCol.appendChild(pipeHeader);

  if(allDeals.length===0){
    const em=document.createElement("div"); em.style.cssText="padding:32px 16px;font-size:11px;color:var(--text-dim);text-align:center";
    em.textContent="No open deals match current filters.";
    pipeCol.appendChild(em);
  } else {
    // Group deals by stage
    const byStage={};
    const sorted=[...allDeals].sort((a,b)=>(a.closeDate||"9999")>(b.closeDate||"9999")?1:-1);
    for(const d of sorted){
      const sl=d.stageLabel||d.stage||"Unknown";
      if(!byStage[sl]) byStage[sl]=[];
      byStage[sl].push(d);
    }

    for(const [stageName, stagDeals] of Object.entries(byStage)){
      const sc=stageColor(stageName);
      const stageVal=stagDeals.reduce((s,d)=>s+(d.amount||0),0);

      // Stage group header
      const sh=document.createElement("div");
      sh.style.cssText=\`padding:5px 16px;font-size:8px;letter-spacing:1px;border-bottom:1px solid var(--border);border-top:1px solid var(--border);background:var(--surface2);display:flex;align-items:center;gap:6px;color:\${sc}\`;
      sh.innerHTML=\`<span style="width:5px;height:5px;border-radius:50%;background:\${sc};flex-shrink:0;display:inline-block"></span>
        \${stageName.toUpperCase()} <span style="opacity:.5">(\${stagDeals.length})</span>
        <span style="margin-left:auto;font-size:9px;font-weight:600;color:#10b981">\${(HS_DATA.currency||"€")}\${stageVal.toLocaleString()}</span>\`;
      pipeCol.appendChild(sh);

      for(const d of stagDeals){
        const dd=d.closeDate?daysDiff(d.closeDate):null;
        const isUrgent=dd!==null&&dd<0;
        const isSoon=dd!==null&&dd>=0&&dd<=7;
        const row=document.createElement("div");
        row.className="task-row"+(isUrgent?" row-overdue":"");
        row.title="Click to open in HubSpot";
        const dealUrl=HS_DATA.portalId?\`https://app.hubspot.com/contacts/\${HS_DATA.portalId}/deal/\${d.id}\`:null;
        if(dealUrl){ row.style.cursor="pointer"; row.addEventListener("click",()=>window.open(dealUrl,"_blank")); }

        // Color dot for stage
        const dot=document.createElement("span");
        dot.style.cssText=\`width:7px;height:7px;border-radius:50%;background:\${sc};flex-shrink:0;display:inline-block\`;
        row.appendChild(dot);

        // Deal name
        const nm=document.createElement("span"); nm.className="task-name"; nm.textContent=d.name; row.appendChild(nm);

        // Amount
        if(d.amount){
          const am=document.createElement("span"); am.className="deal-amount"; am.textContent=(HS_DATA.currency||"€")+d.amount.toLocaleString(); row.appendChild(am);
        }

        // Owner — always shown
        if(d.ownerName){
          const op=document.createElement("span"); op.className="task-owner-pill"; op.textContent=d.ownerName.split(" ")[0]; row.appendChild(op);
        }

        // Close date
        const du=document.createElement("span");
        du.className="task-due"+(isUrgent?" overdue":isSoon?" today":"");
        du.textContent=d.closeDate?fmtDate(d.closeDate):"—";
        row.appendChild(du);

        pipeCol.appendChild(row);
      }
    }

    // Weighted total footer
    if(wgtVal>0){
      const footer=document.createElement("div");
      footer.style.cssText="padding:10px 16px;border-top:2px solid var(--border);display:flex;justify-content:space-between;align-items:center;font-size:9px;color:var(--text-muted)";
      footer.innerHTML=\`<span>WEIGHTED PIPELINE (prob.)</span><span style="color:#10b981;font-weight:700;font-size:11px">\${(HS_DATA.currency||"€")}\${Math.round(wgtVal).toLocaleString()}</span>\`;
      pipeCol.appendChild(footer);
    }
  }

  if(!tasks.length&&!deals.length&&!OPS_FILTER&&OPS_OWNER==="all") renderOpsEmpty();
}

function renderOpsEmpty(){
  const body=document.getElementById("ops-body");
  body.innerHTML=\`<div class="ops-empty">
    <div class="ops-empty-icon">📊</div>
    <div class="ops-empty-title">Connect HubSpot to see Sales &amp; Operations data</div>
    <div class="ops-empty-sub">
      Add your HubSpot API key as a repository secret, then run the workflow to pull tasks, deals, and pipeline data.
    </div>
    <div class="ops-empty-cmd">HUBSPOT_API_KEY → repo Settings → Secrets &amp; variables → Actions</div>
  </div>\`;
}

// ═══════════════════════════════════════════════════════════════════════════
// MY DAY TAB
// ═══════════════════════════════════════════════════════════════════════════
let MYDAY_PERSON  = localStorage.getItem("myday_person")  || "me";
let MYDAY_SECTION = localStorage.getItem("myday_section") || "all";
let MYDAY_URGENCY = localStorage.getItem("myday_urgency") || "";

// Flatten nested initiatives→projects→issues into a single array
function getLinearIssues(){
  if(!GANTT_DATA||!GANTT_DATA.initiatives) return [];
  const out=[];
  for(const ini of GANTT_DATA.initiatives)
    for(const proj of (ini.projects||[]))
      for(const iss of (proj.issues||[]))
        out.push({...iss, _project:proj.name, _initiative:ini.name});
  return out;
}

// Detect the "current user" first name from loaded data (heuristic: email contains first name)
function detectMyName(){
  if(HS_DATA&&HS_DATA.owners){
    const me = HS_DATA.owners.find(o=>o.email&&o.email.toLowerCase().includes("johann"));
    if(me) return me.name.split(" ")[0];
  }
  const all = getLinearIssues().filter(i=>i.assignee).map(i=>i.assignee.split(" ")[0]);
  if(all.includes("Johann")) return "Johann";
  return null;
}

// Load google-data-{name}.json if it exists, otherwise fall back to google-data.json
async function loadGoogleDataFor(personName){
  if(personName){
    try{
      const r=await fetch(\`./google-data-\${personName.toLowerCase()}.json?t=\${Date.now()}\`);
      if(r.ok){ GOOGLE_DATA=await r.json(); return; }
    }catch(e){}
  }
  try{
    const r=await fetch('./google-data.json?t='+Date.now());
    if(r.ok){ GOOGLE_DATA=await r.json(); }
  }catch(e){}
}

// Switch person filter, reload their Google data, and re-render
async function switchToPersonAndRender(personKey){
  MYDAY_PERSON=personKey;
  localStorage.setItem("myday_person",personKey);
  const name = personKey==="all" ? null : personKey==="me" ? detectMyName() : personKey;
  await loadGoogleDataFor(name);
  renderMyDay();
}

// Switch section filter and re-render
function switchSection(key){
  MYDAY_SECTION=key;
  localStorage.setItem("myday_section",key);
  MYDAY_URGENCY=""; localStorage.removeItem("myday_urgency");
  renderMyDay();
}

function renderMyDay(){
  const main    = document.getElementById("myday-main");
  const sidebar = document.getElementById("myday-sidebar");
  const pbar    = document.getElementById("myday-person-bar");
  const secbar  = document.getElementById("myday-section-bar");
  const sbar    = document.getElementById("myday-stats-bar");
  if(!main||!sidebar||!pbar||!sbar) return;

  // ── Build combined item list ─────────────────────────────────────────────
  const items = [];
  const today = TODAY_STR;

  // Linear issues (flatten from initiatives→projects→issues)
  for(const iss of getLinearIssues()){
    if(DONE_STATES.has(iss.status||"")) continue;
    items.push({
      source:"linear", id:iss.identifier||iss.id, title:iss.title,
      owner:iss.assignee||null, end:iss.end||null, status:iss.status||"",
      priority:iss.priority||"", url:iss.url||null,
      project:iss._project||null,
    });
  }

  // HubSpot tasks
  if(HS_DATA && HS_DATA.tasks){
    for(const t of HS_DATA.tasks){
      if(t.status==="COMPLETED") continue;
      const dueStr = t.dueDate ? t.dueDate.split("T")[0] : null;
      items.push({
        source:"hubspot", id:t.id, title:t.subject||t.title||"(untitled)",
        owner:t.ownerName||null, end:dueStr, status:t.status||"",
        priority:"", url: HS_DATA.portalId
          ? \`https://app.hubspot.com/tasks/\${HS_DATA.portalId}?taskId=\${t.id}\`
          : null,
        body: t.body||null,
      });
    }
  }

  // ── Determine person list for filter bar ──────────────────────────────────
  const people = new Set();
  people.add("me");
  for(const it of items) if(it.owner) people.add(it.owner.split(" ")[0]);
  // Detect current user via shared helper
  const myName = detectMyName();

  // ── Person filter pill bar ──────────────────────────────────────────────
  pbar.innerHTML = '<span class="owner-strip-label">SHOWING FOR</span>';
  const allPill = document.createElement("button");
  allPill.className = "owner-pill"+(MYDAY_PERSON==="all"?" active":"");
  allPill.textContent = "All";
  allPill.addEventListener("click",()=>switchToPersonAndRender("all"));
  pbar.appendChild(allPill);
  for(const p of Array.from(people).filter(x=>x!=="me")){
    const pill = document.createElement("button");
    pill.className = "owner-pill"+(MYDAY_PERSON===p?" active":"");
    pill.textContent = p==="me"? (myName||"Me") : p;
    pill.addEventListener("click",()=>switchToPersonAndRender(p));
    pbar.appendChild(pill);
  }

  // ── Section filter pills ─────────────────────────────────────────────────
  if(secbar){
    secbar.innerHTML = "";
    const secDefs=[
      {key:"all",   label:"ALL"},
      {key:"tasks", label:"📋 TASKS"},
      {key:"inbox", label:"📧 INBOX"},
      {key:"cal",   label:"📅 CALENDAR"},
      {key:"drive", label:"🗂 DRIVE"},
    ];
    for(const sd of secDefs){
      const sp = document.createElement("button");
      sp.className = "section-pill"+(MYDAY_SECTION===sd.key?" active":"");
      sp.textContent = sd.label;
      sp.addEventListener("click",()=>switchSection(sd.key));
      secbar.appendChild(sp);
    }
  }

  // ── Filter items by person ────────────────────────────────────────────────
  function ownerFirst(name){ return (name||"").split(" ")[0]; }
  const filtered = MYDAY_PERSON==="all" ? items
    : MYDAY_PERSON==="me" && myName ? items.filter(it=>ownerFirst(it.owner)===myName)
    : items.filter(it=>ownerFirst(it.owner)===MYDAY_PERSON);

  // Determine display name for greeting
  const viewName = MYDAY_PERSON==="all" ? null
    : MYDAY_PERSON==="me" ? myName
    : MYDAY_PERSON;

  // ── Group by urgency ──────────────────────────────────────────────────────
  const buckets = { overdue:[], today:[], week:[], later:[] };
  for(const it of filtered){
    const dd = it.end ? daysDiff(it.end) : null;
    const od = it.end && isActive(it.status) && it.end < today;
    if(od)                          buckets.overdue.push(it);
    else if(dd===0)                 buckets.today.push(it);
    else if(dd!==null && dd<=7)     buckets.week.push(it);
    else                            buckets.later.push(it);
  }

  // ── Stats bar ─────────────────────────────────────────────────────────────
  const totalOpen = filtered.length;
  const odCount   = buckets.overdue.length;
  const todayCount= buckets.today.length;
  const weekCount = buckets.week.length;
  const linearCount = filtered.filter(i=>i.source==="linear").length;
  const hubspotCount= filtered.filter(i=>i.source==="hubspot").length;
  // ── Checklist / snooze / custom task storage (renderMyDay scope) ────────────
  const AUTO_DONE_KEY = "supplied_auto_done_" + TODAY_STR;
  const AUTO_DONE = new Set(JSON.parse(localStorage.getItem(AUTO_DONE_KEY)||"[]"));
  function saveAutoDone(){ localStorage.setItem(AUTO_DONE_KEY, JSON.stringify([...AUTO_DONE])); }
  const SNOOZE_KEY = "supplied_snooze";
  const SNOOZED = JSON.parse(localStorage.getItem(SNOOZE_KEY)||"{}");
  function saveSnooze(){ localStorage.setItem(SNOOZE_KEY, JSON.stringify(SNOOZED)); }
  const CUSTOM_TASKS_KEY = "supplied_custom_tasks";
  let CUSTOM_TASKS = JSON.parse(localStorage.getItem(CUSTOM_TASKS_KEY)||"[]");
  function saveCustomTasks(){ localStorage.setItem(CUSTOM_TASKS_KEY, JSON.stringify(CUSTOM_TASKS)); }

  // ── Stats bar: section-aware + clickable chips ────────────────────────────
  sbar.innerHTML = "";
  (function buildStatsBar(){
    function mkChip(num, label, numCls, opts){
      const el = document.createElement("div");
      el.className = "myday-stat";
      if(opts&&opts.ml)  el.style.marginLeft = "auto";
      if(opts&&opts.dim) el.style.opacity = ".7";
      const sp = document.createElement("span");
      sp.className = "myday-stat-num"+(numCls?" "+numCls:"");
      sp.textContent = num;
      el.appendChild(sp);
      el.appendChild(document.createTextNode(" "+label));
      if(opts&&opts.active){
        el.style.background="rgba(255,255,255,.14)";
        el.style.borderRadius="4px";
        el.style.padding="0 4px";
      }
      if(opts&&opts.onClick){
        el.style.cursor="pointer";
        el.style.borderRadius="4px";
        el.style.transition="background .15s";
        el.style.padding="0 4px";
        if(opts.title) el.title=opts.title;
        el.addEventListener("click", opts.onClick);
        if(!(opts&&opts.active)){
          el.addEventListener("mouseenter",()=>el.style.background="rgba(255,255,255,.07)");
          el.addEventListener("mouseleave",()=>el.style.background="");
        }
      }
      return el;
    }
    function scrollTo(id){ const e=document.getElementById(id); if(e) e.scrollIntoView({behavior:"smooth",block:"start"}); }
    const DP = new Set(JSON.parse(localStorage.getItem("supplied_done_priorities")||"[]"));

    if(MYDAY_SECTION==="all"||MYDAY_SECTION==="tasks"){
      // "X tasks" chip — click clears urgency filter if active
      sbar.appendChild(mkChip(totalOpen,"tasks","",
        MYDAY_URGENCY ? {onClick:()=>{MYDAY_URGENCY="";localStorage.removeItem("myday_urgency");renderMyDay();},title:"Clear filter — show all"} : null));
      // Urgency filter chips
      const uchips=[
        {key:"overdue", label:"overdue",   cls:odCount>0?"red":"",   num:odCount},
        {key:"today",   label:"due today", cls:todayCount>0?"blue":"",num:todayCount},
        {key:"week",    label:"this week", cls:weekCount>0?"amber":"",num:weekCount},
        {key:"later",   label:"later",     cls:"",                    num:buckets.later.length},
      ];
      for(const c of uchips){
        if(!c.num) continue;
        const isAct = MYDAY_URGENCY===c.key;
        sbar.appendChild(mkChip(c.num, c.label, c.cls, {
          active: isAct,
          onClick:()=>{MYDAY_URGENCY=isAct?"":c.key; localStorage.setItem("myday_urgency",MYDAY_URGENCY); renderMyDay();},
          title: isAct ? "Click to show all" : "Filter to "+c.label,
        }));
      }
      if(linearCount)  sbar.appendChild(mkChip(linearCount,  "linear",  "src-linear",  {ml:true,dim:true, onClick:()=>scrollTo("section-linear"),  title:"Jump to Linear issues"}));
      if(hubspotCount) sbar.appendChild(mkChip(hubspotCount, "hubspot", "src-hubspot", {       dim:true, onClick:()=>scrollTo("section-hubspot"), title:"Jump to HubSpot tasks"}));

    } else if(MYDAY_SECTION==="inbox"){
      const epN = (GOOGLE_DATA&&GOOGLE_DATA.email_priorities||[]).filter(p=>{ const cl="ep-"+p.id; return !DP.has(p.id)&&!AUTO_DONE.has(cl)&&!(SNOOZED[cl]&&SNOOZED[cl]>TODAY_STR); }).length;
      const unrN = (GOOGLE_DATA&&GOOGLE_DATA.gmail&&GOOGLE_DATA.gmail.unreadCount)||0;
      sbar.appendChild(mkChip(epN, "priorities", epN>0?"red":"",
        epN>0 ? {onClick:()=>scrollTo("section-email-prios"), title:"Jump to email priorities"} : null));
      sbar.appendChild(mkChip(unrN, "unread", unrN>0?"blue":"",
        {onClick:()=>scrollTo("myday-inbox-section"), title:"Jump to inbox"}));

    } else if(MYDAY_SECTION==="drive"){
      const dpN = (GOOGLE_DATA&&GOOGLE_DATA.drive_priorities||[]).filter(p=>!DP.has(p.id)).length;
      const recN = (GOOGLE_DATA&&GOOGLE_DATA.drive&&GOOGLE_DATA.drive.recent||[]).slice(0,6).length;
      sbar.appendChild(mkChip(dpN, "priorities", dpN>0?"blue":"",
        dpN>0 ? {onClick:()=>scrollTo("section-drive-prios"), title:"Jump to drive priorities"} : null));
      sbar.appendChild(mkChip(recN, "recent files", "",
        {onClick:()=>scrollTo("section-drive-files"), title:"Jump to recent files"}));

    } else {
      sbar.appendChild(mkChip(totalOpen,"tasks","",null));
    }
  })();

  // ── Render main column ────────────────────────────────────────────────────
  main.innerHTML = "";

  // ── Shared priority helpers ───────────────────────────────────────────────
  const PRIORITY_ACTION_META = {
    reply:    { label:"REPLY",     color:"#ef4444", icon:"\u21A9" },
    followup: { label:"FOLLOW UP", color:"#f59e0b", icon:"\u23F0" },
    alert:    { label:"ALERT",     color:"#8b5cf6", icon:"\u26A0" },
    review:   { label:"REVIEW",    color:"#3b82f6", icon:"\uD83D\uDC41" },
    read:     { label:"READ",      color:"#10b981", icon:"\uD83D\uDCCC" },
    task:     { label:"TASK",      color:"#6366f1", icon:"\u2713" },
  };
  const DONE_PRIO_KEY = "supplied_done_priorities";
  const DONE_PRIOS = new Set(JSON.parse(localStorage.getItem(DONE_PRIO_KEY)||"[]"));
  function saveDonePrios(){ localStorage.setItem(DONE_PRIO_KEY, JSON.stringify([...DONE_PRIOS])); }
  function getSuggestedAction(action){
    const m = {
      reply:    { icon:"\uD83D\uDCAC", hint:"Draft a direct response addressing the point raised" },
      followup: { icon:"\u23F0",    hint:"Send a short, friendly nudge to keep this moving" },
      alert:    { icon:"\u26A0\uFE0F", hint:"Investigate and resolve \u2014 loop in the right person if needed" },
      review:   { icon:"\uD83D\uDC41", hint:"Open, read, and add your comment or decision" },
      read:     { icon:"\uD83D\uDCDA", hint:"Set aside 5 min to scan the key points" },
      task:     { icon:"\u2705",    hint:"Complete the task as described" },
    };
    return m[action] || { icon:"\u2705", hint:"Complete the required action" };
  }
  function makeExpandPanel(reason, action, url){
    const panel = document.createElement("div");
    panel.className = "myday-expand-panel";
    if(reason){
      const rEl = document.createElement("div");
      rEl.className = "myday-expand-reason";
      rEl.textContent = reason;
      panel.appendChild(rEl);
    }
    if(action){
      const sa = getSuggestedAction(action);
      const sEl = document.createElement("div");
      sEl.className = "myday-expand-suggestion";
      sEl.textContent = sa.icon + "  " + sa.hint;
      panel.appendChild(sEl);
    }
    if(url){
      const lEl = document.createElement("a");
      lEl.className = "myday-expand-link";
      lEl.href = "#";
      lEl.textContent = "Open →";
      lEl.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); window.open(url,"_blank"); });
      panel.appendChild(lEl);
    }
    return panel;
  }
  function addChevron(row, panel){
    const chev = document.createElement("span");
    chev.className = "myday-expand-chevron";
    chev.textContent = "▶";
    chev.addEventListener("click", e => {
      e.stopPropagation();
      const open = panel.classList.toggle("open");
      chev.classList.toggle("open", open);
    });
    row.appendChild(chev);
  }

  function renderPrioritySection(title, items){
    if(!items || !items.length) return null;
    // Filter by inbox done-state AND checklist done/snooze state (id with "ep-" prefix)
    const active = items.filter(p => {
      if(DONE_PRIOS.has(p.id)) return false;
      const clId="ep-"+p.id;
      if(AUTO_DONE.has(clId)) return false;
      if(SNOOZED[clId]&&SNOOZED[clId]>TODAY_STR) return false;
      return true;
    });
    if(!active.length) return null;
    const sec = document.createElement("div");
    sec.className = "myday-section";
    const hdr = document.createElement("div");
    hdr.className = "myday-section-hdr";
    const countSpan = document.createElement("span");
    countSpan.className = "myday-section-count";
    countSpan.textContent = active.length;
    hdr.innerHTML = \`<span>\${title}</span>\`;
    hdr.appendChild(countSpan);
    sec.appendChild(hdr);
    for(const p of active){
      const m = PRIORITY_ACTION_META[p.action] || PRIORITY_ACTION_META.task;
      const row = document.createElement("div");
      row.className = "myday-item";
      row.style.cssText = "gap:6px;";
      if(p.url){ row.style.cursor="pointer"; row.addEventListener("click",()=>window.open(p.url,"_blank")); }
      const badge = document.createElement("span");
      badge.className = "myday-source";
      badge.style.cssText = \`background:\${m.color};color:#fff;min-width:56px;text-align:center;font-size:9px;flex-shrink:0;\`;
      badge.textContent = m.icon+" "+m.label;
      const title_ = document.createElement("span");
      title_.className = "myday-item-title";
      title_.textContent = p.subject;
      const reason = document.createElement("span");
      reason.className = "myday-item-status";
      reason.style.cssText = "font-style:italic;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:240px;";
      reason.textContent = p.reason;
      const doneBtn = document.createElement("button");
      doneBtn.title = "Mark done";
      doneBtn.style.cssText = "flex-shrink:0;width:20px;height:20px;border-radius:50%;border:1.5px solid #22c55e;background:transparent;color:#22c55e;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;line-height:1;";
      doneBtn.textContent = "\u2713";
      doneBtn.addEventListener("click", e => {
        e.stopPropagation();
        DONE_PRIOS.add(p.id);
        saveDonePrios();
        row.style.transition = "opacity 0.25s";
        row.style.opacity = "0";
        setTimeout(() => {
          row.remove();
          const remaining = sec.querySelectorAll(".myday-item").length;
          countSpan.textContent = remaining;
          if(!remaining) sec.remove();
        }, 260);
      });
      row.appendChild(badge);
      row.appendChild(title_);
      row.appendChild(reason);
      row.appendChild(doneBtn);
      // Expand panel
      const expPanel = makeExpandPanel(p.reason, p.action, p.url);
      addChevron(row, expPanel);
      sec.appendChild(row);
      sec.appendChild(expPanel);
      // When marked done, also remove panel
      const origDoneClick = doneBtn.onclick;
      doneBtn.addEventListener("click", () => {
        setTimeout(() => { expPanel.remove(); }, 270);
      });
    }
    return sec;
  }

  function srcLabel(s){
    if(s==="linear")  return {cls:"src-linear",  txt:"LIN"};
    if(s==="hubspot") return {cls:"src-hubspot",  txt:"HS"};
    if(s==="gcal")    return {cls:"src-gcal",     txt:"CAL"};
    if(s==="gmail")   return {cls:"src-gmail",    txt:"ML"};
    return {cls:"",txt:s};
  }

  function makeItemRow(it){
    const row = document.createElement("div");
    row.className = "myday-item";
    if(it.url){ row.style.cursor="pointer"; row.addEventListener("click",()=>window.open(it.url,"_blank")); }
    const {cls,txt} = srcLabel(it.source);
    const dd = it.end ? daysDiff(it.end) : null;
    const dateLabel = it.end ? (dd===0?"Today":dd<0?Math.abs(dd)+"d ago":fmtDate(it.end)) : "";
    const dateCls   = dd!==null && dd<0 ? "overdue" : dd===0 ? "today" : "";
    row.innerHTML = \`
      <span class="myday-source \${cls}">\${txt}</span>
      <span class="myday-item-title">\${it.title}</span>
      \${it.owner&&MYDAY_PERSON==="all"?'<span class="myday-item-owner">'+ownerFirst(it.owner)+'</span>':""}
      \${it.status?'<span class="myday-item-status">'+it.status.toUpperCase()+'</span>':""}
      \${dateLabel?'<span class="myday-item-date '+dateCls+'">'+dateLabel+'</span>':""}
    \`;
    if(it.body){
      const expPanel = makeExpandPanel(it.body, null, it.url);
      addChevron(row, expPanel);
      const frag = document.createDocumentFragment();
      frag.appendChild(row);
      frag.appendChild(expPanel);
      return frag;
    }
    return row;
  }

  // ── Checklist builder (inner fn — accesses AUTO_DONE, viewName) ────────────
  function buildChecklistItems(){
    const todayStr=TODAY_STR;
    const todayMs=new Date().setHours(0,0,0,0);
    const items=[];
    // 1. Email replies first
    if(GOOGLE_DATA){
      for(const e of (GOOGLE_DATA.email_priorities||[])){
        if(DONE_PRIOS.has(e.id)) continue;
        items.push({id:"ep-"+e.id,title:e.subject,source:"gmail",src:"ML",srcCls:"src-gmail",meta:e.action.toUpperCase(),url:e.url,prio:e.action==="reply"?1:e.action==="followup"?4:5});
      }
    }
    // 2. Linear issues (blocked → overdue → due today → this week → high/urgent)
    if(GANTT_DATA){
      const myKey=(MYDAY_PERSON==="me"?(viewName||""):MYDAY_PERSON||"").toLowerCase();
      for(const ini of (GANTT_DATA.initiatives||[])){
        if(DONE_STATES.has(ini.status||"")) continue;
        for(const proj of (ini.projects||[])){
          if(DONE_STATES.has(proj.status||"")) continue;
          for(const iss of (proj.issues||[])){
            if(!isActive(iss.status)) continue;
            const mine=!myKey||MYDAY_PERSON==="all"||(iss.assignee||"").toLowerCase().includes(myKey);
            let prio=99;
            if(iss.status==="Blocked") prio=2;
            else if(iss.end&&iss.end<todayStr) prio=mine?3:6;
            else if(iss.end===todayStr) prio=mine?4:7;
            else if(iss.end&&iss.end<=new Date(Date.now()+7*864e5).toISOString().slice(0,10)) prio=mine?8:14;
            else if(mine&&iss.priority==="urgent") prio=9;
            else if(mine&&iss.priority==="high") prio=10;
            else continue;
            const meta=iss.end?(iss.end<todayStr?Math.ceil((new Date(todayStr)-new Date(iss.end))/864e5)+"d ago":iss.end===todayStr?"Today":fmtDate(iss.end)):(iss.status||"");
            items.push({id:"lin-"+iss.id,title:(iss.identifier?iss.identifier+" ":"")+iss.title,source:"linear",src:"LIN",srcCls:"src-linear",meta,url:iss.url,prio});
          }
        }
      }
    }
    // 3. Deals closing soon
    if(HS_DATA){
      for(const d of (HS_DATA.deals||[])){
        if(!d.closeDate||isDoneStage(d.stageLabel)) continue;
        const diff=Math.ceil((new Date(d.closeDate)-todayMs)/864e5);
        if(diff>14) continue;
        const prio=diff<=0?2:diff<=3?5:11;
        const meta=diff<0?Math.abs(diff)+"d ago":diff===0?"Today":"in "+diff+"d";
        const url=HS_DATA.portalId?"https://app.hubspot.com/contacts/"+HS_DATA.portalId+"/deal/"+d.id:null;
        items.push({id:"deal-"+d.id,title:d.name+(d.amount?" \u2014 \u20AC"+Number(d.amount).toLocaleString():""),source:"hubspot",src:"HS",srcCls:"src-hubspot",meta,url,prio});
      }
      for(const t of (HS_DATA.tasks||[])){
        if(!isActive(t.status)) continue;
        const prio=t.dueDate&&t.dueDate<todayStr?6:t.dueDate===todayStr?7:99;
        if(prio===99) continue;
        items.push({id:"hs-"+t.id,title:t.title,source:"hubspot",src:"HS",srcCls:"src-hubspot",meta:t.dueDate<todayStr?"Overdue":"Today",url:t.url,prio});
      }
    }
    // 4. Drive + task priorities
    if(GOOGLE_DATA){
      for(const d of (GOOGLE_DATA.drive_priorities||[])){
        if(DONE_PRIOS.has(d.id)) continue;
        items.push({id:"dp-"+d.id,title:d.subject,source:"drive",src:"DR",srcCls:"src-drive",meta:d.action.toUpperCase(),url:d.url,prio:8});
      }
      for(const t of (GOOGLE_DATA.task_priorities||[])){
        if(DONE_PRIOS.has(t.id)) continue;
        items.push({id:"tp-"+t.id,title:t.subject,source:"task",src:"TASK",srcCls:"src-linear",meta:t.action.toUpperCase(),url:t.url,prio:9});
      }
    }
    // 5. Custom manually-added tasks (always at top)
    for(const t of CUSTOM_TASKS){
      if(AUTO_DONE.has(t.id)) continue;
      if(SNOOZED[t.id]&&SNOOZED[t.id]>TODAY_STR) continue;
      items.push({id:t.id,title:t.title,source:"custom",src:"TASK",srcCls:"src-custom",meta:"",url:t.url||null,prio:0,custom:true});
    }
    items.sort((a,b)=>a.prio-b.prio);
    const seen=new Set();
    return items.filter(i=>{
      if(seen.has(i.id)) return false; seen.add(i.id);
      if(SNOOZED[i.id]&&SNOOZED[i.id]>TODAY_STR) return false;
      return true;
    });
  }

  function renderSimpleChecklist(container){
    const SHOW_INIT=12;
    let items=buildChecklistItems();
    const wrap=document.createElement("div"); wrap.className="checklist-wrap";
    const hdr=document.createElement("div"); hdr.className="checklist-hdr";
    const lbl=document.createElement("span"); lbl.textContent="\u2611\uFE0F  TODAY\u2019S ACTIONS";
    const cnt=document.createElement("span"); cnt.style.cssText="margin-left:auto;background:var(--accent);color:#fff;border-radius:10px;padding:1px 7px;font-size:9px;";
    function refreshCount(){ cnt.textContent=items.filter(i=>!AUTO_DONE.has(i.id)).length; }
    refreshCount();
    hdr.appendChild(lbl); hdr.appendChild(cnt); wrap.appendChild(hdr);
    // ── Add-task input bar ───────────────────────────────────────────────────
    const addRow=document.createElement("div"); addRow.className="cl-add-row";
    const addInp=document.createElement("input"); addInp.type="text"; addInp.className="cl-add-inp"; addInp.placeholder="Add a task\u2026";
    const addBtn=document.createElement("button"); addBtn.className="cl-add-btn"; addBtn.textContent="+ Add";
    function addTask(){
      const title=(addInp.value||"").trim(); if(!title) return;
      const newTask={id:"custom-"+Date.now(),title:title,url:null};
      CUSTOM_TASKS.unshift(newTask); saveCustomTasks();
      items=buildChecklistItems(); refreshCount();
      draw(listEl.dataset.showAll==="1");
      addInp.value="";
    }
    addBtn.addEventListener("click",addTask);
    addInp.addEventListener("keydown",function(e){ if(e.key==="Enter"){ e.preventDefault(); addTask(); }});
    addRow.appendChild(addInp); addRow.appendChild(addBtn); wrap.appendChild(addRow);
    const listEl=document.createElement("div"); listEl.id="cl-list"; wrap.appendChild(listEl);
    const ACTION_LABEL={gmail:"REPLY",linear:"OPEN",hubspot:"OPEN",drive:"OPEN",task:"OPEN",custom:"OPEN"};
    let undoTimer=null;
    function showUndoToast(msg, undoFn){
      document.querySelectorAll(".cl-undo-toast").forEach(t=>t.remove());
      if(undoTimer) clearTimeout(undoTimer);
      const toast=document.createElement("div"); toast.className="cl-undo-toast";
      const txt=document.createElement("span"); txt.textContent=msg;
      const btn=document.createElement("button"); btn.className="cl-undo-btn"; btn.textContent="UNDO";
      btn.addEventListener("click",function(){ clearTimeout(undoTimer); toast.remove(); undoFn(); draw(listEl.dataset.showAll==="1"); refreshCount(); });
      toast.appendChild(txt); toast.appendChild(btn); document.body.appendChild(toast);
      undoTimer=setTimeout(()=>toast.remove(), 5000);
    }
    function draw(showAll){
      document.querySelectorAll(".cl-snooze-menu").forEach(m=>m.remove());
      listEl.innerHTML="";
      const visible=(showAll?items:items.slice(0,SHOW_INIT)).filter(i=>!AUTO_DONE.has(i.id));
      if(!visible.length){
        const emp=document.createElement("div"); emp.style.cssText="padding:16px 12px;text-align:center;color:var(--text-dim);font-size:11px;";
        emp.textContent="All clear \u2014 nothing urgent right now."; listEl.appendChild(emp);
      }
      for(const item of visible){
        const row=document.createElement("div"); row.className="cl-item";
        // ── Checkbox: click only toggles done ──────────────────────────────
        const cb=document.createElement("div"); cb.className="cl-cb";
        cb.addEventListener("click",function(e){
          e.stopPropagation();
          AUTO_DONE.add(item.id); saveAutoDone();
          draw(listEl.dataset.showAll==="1"); refreshCount();
          showUndoToast("Marked done", function(){ AUTO_DONE.delete(item.id); saveAutoDone(); });
        });
        // ── Source badge + title + meta ─────────────────────────────────────
        const srcEl=document.createElement("span"); srcEl.className="cl-src "+item.srcCls; srcEl.textContent=item.src;
        const titleEl=document.createElement("span"); titleEl.className="cl-title"; titleEl.textContent=item.title;
        const metaEl=document.createElement("span"); metaEl.className="cl-meta"; metaEl.textContent=item.meta||"";
        // ── Action button: only this opens the URL ──────────────────────────
        const actionBtn=document.createElement("button"); actionBtn.className="cl-action-btn";
        actionBtn.textContent=ACTION_LABEL[item.source]||"OPEN";
        actionBtn.addEventListener("click",function(e){ e.stopPropagation(); if(item.url) window.open(item.url,"_blank"); });
        // ── Snooze button ───────────────────────────────────────────────────
        const snoozeBtn=document.createElement("button"); snoozeBtn.className="cl-snooze-btn";
        snoozeBtn.textContent="\u23F0"; snoozeBtn.title="Snooze";
        snoozeBtn.addEventListener("click",function(e){
          e.stopPropagation();
          document.querySelectorAll(".cl-snooze-menu").forEach(m=>m.remove());
          const menu=document.createElement("div"); menu.className="cl-snooze-menu";
          [["Tomorrow",1],["Next week",7],["Next month",30]].forEach(function([label,days]){
            const opt=document.createElement("button"); opt.className="cl-snooze-opt"; opt.textContent=label;
            opt.addEventListener("click",function(e2){
              e2.stopPropagation();
              const d=new Date(); d.setDate(d.getDate()+days);
              const snoozeDate=d.toISOString().slice(0,10);
              SNOOZED[item.id]=snoozeDate; saveSnooze();
              draw(listEl.dataset.showAll==="1"); refreshCount(); menu.remove();
              showUndoToast("Snoozed until "+snoozeDate, function(){ delete SNOOZED[item.id]; saveSnooze(); });
            });
            menu.appendChild(opt);
          });
          const divider=document.createElement("div"); divider.style.cssText="height:1px;background:var(--border);margin:2px 0;";
          menu.appendChild(divider);
          const dismissOpt=document.createElement("button"); dismissOpt.className="cl-snooze-opt"; dismissOpt.textContent="\u2715  Dismiss forever";
          dismissOpt.style.cssText="color:#ef4444;";
          dismissOpt.addEventListener("click",function(e2){
            e2.stopPropagation();
            SNOOZED[item.id]="9999-12-31"; saveSnooze();
            draw(listEl.dataset.showAll==="1"); refreshCount(); menu.remove();
            showUndoToast("Dismissed", function(){ delete SNOOZED[item.id]; saveSnooze(); });
          });
          menu.appendChild(dismissOpt);
          row.appendChild(menu);
          setTimeout(function(){ document.addEventListener("click",function h(){ menu.remove(); document.removeEventListener("click",h); }); },10);
        });
        row.appendChild(cb); row.appendChild(srcEl); row.appendChild(titleEl); row.appendChild(metaEl);
        if(item.url) row.appendChild(actionBtn);
        row.appendChild(snoozeBtn);
        // ── Delete button (custom tasks only) ──────────────────────────────
        if(item.custom){
          const delBtn=document.createElement("button"); delBtn.className="cl-del-btn"; delBtn.textContent="\u2715"; delBtn.title="Delete task";
          delBtn.addEventListener("click",function(e){
            e.stopPropagation();
            const removed=CUSTOM_TASKS.find(t=>t.id===item.id);
            CUSTOM_TASKS=CUSTOM_TASKS.filter(t=>t.id!==item.id); saveCustomTasks();
            items=buildChecklistItems(); refreshCount();
            draw(listEl.dataset.showAll==="1");
            if(removed) showUndoToast("Task deleted", function(){ CUSTOM_TASKS.unshift(removed); saveCustomTasks(); items=buildChecklistItems(); refreshCount(); draw(listEl.dataset.showAll==="1"); });
          });
          row.appendChild(delBtn);
        }
        listEl.appendChild(row);
      }
      if(items.length>SHOW_INIT){
        const btn=document.createElement("button"); btn.className="cl-more-btn";
        if(!showAll){ btn.textContent="Show "+(items.length-SHOW_INIT)+" more \u25BE"; btn.onclick=function(){ listEl.dataset.showAll="1"; draw(true); }; }
        else { btn.textContent="Show less \u25B4"; btn.onclick=function(){ listEl.dataset.showAll="0"; draw(false); }; }
        listEl.appendChild(btn);
      }
    }
    draw(false);
    container.appendChild(wrap);
  }

  // ── Main content ─────────────────────────────────────────────────────────────
  const showAll   = MYDAY_SECTION==="all"||MYDAY_SECTION==="tasks";
  const showInbox = MYDAY_SECTION==="inbox";
  const showDrive = MYDAY_SECTION==="drive";

  if(MYDAY_SECTION==="all"){
    renderClaudeBrief(main, viewName, "myday");
  }
  if(showAll){
    renderSimpleChecklist(main);
  }

  // ── INBOX tab ───────────────────────────────────────────────────────
  if(showInbox){
  // ── Email priorities section ──────────────────────────────────────────────
  { const s = renderPrioritySection("\uD83D\uDEA8 EMAIL PRIORITIES", GOOGLE_DATA&&GOOGLE_DATA.email_priorities);
    if(s){
      s.id="section-email-prios";
      // Summary line inside section, right below header
      if(GOOGLE_DATA&&GOOGLE_DATA.email_priorities){
        const eps = GOOGLE_DATA.email_priorities.filter(p=>{ const cl="ep-"+p.id; return !DONE_PRIOS.has(p.id)&&!AUTO_DONE.has(cl)&&!(SNOOZED[cl]&&SNOOZED[cl]>TODAY_STR); });
        if(eps.length){
          const counts = {};
          for(const p of eps) counts[p.action]=(counts[p.action]||0)+1;
          const parts=[];
          if(counts.reply)    parts.push(counts.reply+" repl"+(counts.reply>1?"ies":"y"));
          if(counts.followup) parts.push(counts.followup+" follow-up"+(counts.followup>1?"s":""));
          if(counts.alert)    parts.push(counts.alert+" alert"+(counts.alert>1?"s":""));
          if(counts.review)   parts.push(counts.review+" review"+(counts.review>1?"s":""));
          const brief = document.createElement("div");
          brief.style.cssText = "padding:4px 12px 2px;font-size:10px;color:var(--text-muted);font-style:italic;letter-spacing:.3px;";
          brief.textContent = "\uD83D\uDCEC Inbox: "+parts.join(" \xB7")+" \u2014 needs attention";
          s.insertBefore(brief, s.children[1]);
        }
      }
      main.appendChild(s);
    } }

  // ── Gmail inbox section ───────────────────────────────────────────────────
  const gmailSec = document.createElement("div");
  gmailSec.className = "myday-section";
  gmailSec.id = "myday-inbox-section";
  if(GOOGLE_DATA && GOOGLE_DATA.gmail && GOOGLE_DATA.gmail.threads && GOOGLE_DATA.gmail.threads.length){
    const threads = GOOGLE_DATA.gmail.threads.slice(0,8);
    gmailSec.innerHTML = \`<div class="myday-section-hdr"><span>📧 INBOX</span><span class="myday-section-count">\${GOOGLE_DATA.gmail.unreadCount||threads.length} unread</span></div>\`;
    for(const t of threads){
      const row = document.createElement("div");
      row.className = "myday-item";
      const gmailUrl = t.url || (t.id?\`https://mail.google.com/mail/u/0/#inbox/\${t.id}\`:null);
      if(gmailUrl){ row.style.cursor="pointer"; row.addEventListener("click",()=>window.open(gmailUrl,"_blank")); }
      const d = t.date ? new Date(t.date) : null;
      const dateStr = d ? d.toLocaleDateString("en-GB",{day:"2-digit",month:"short"}) : "";
      const senderName = (t.from||"").replace(/<.*>/,"").trim().split(" ")[0];
      row.innerHTML = \`
        <span class="myday-source src-gmail">ML</span>
        <span class="myday-item-title">\${t.subject||"(no subject)"}</span>
        <span class="myday-item-owner">\${senderName}</span>
        \${t.snippet?'<span class="myday-item-status" style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-style:italic;opacity:.7">'+t.snippet.slice(0,50)+'</span>':""}
        \${dateStr?'<span class="myday-item-date">'+dateStr+'</span>':""}
      \`;
      // Expand panel with full snippet + from
      if(t.snippet||t.from){
        const gmailExpPanel = makeExpandPanel(
          (t.from ? t.from+" | " : "") + (t.snippet||""),
          null,
          gmailUrl
        );
        addChevron(row, gmailExpPanel);
        gmailSec.appendChild(row);
        gmailSec.appendChild(gmailExpPanel);
      } else {
        gmailSec.appendChild(row);
      }
    }
  } else {
    gmailSec.innerHTML = \`
      <div class="myday-section-hdr"><span>📧 INBOX</span></div>
      <div class="myday-coming-card">
        <span class="myday-coming-icon">📧</span>
        <div class="myday-coming-text">
          <div class="myday-coming-title">GMAIL</div>
          <div class="myday-coming-desc">Connect Google account &amp; run workflow to populate</div>
        </div>
      </div>\`;
  }
  main.appendChild(gmailSec);

  } // end showInbox

  // ── DRIVE tab ───────────────────────────────────────────────────────
  if(showDrive){


  // ── Drive priorities section ──────────────────────────────────────────────
  { const s = renderPrioritySection("\uD83D\uDEA8 DRIVE PRIORITIES", GOOGLE_DATA&&GOOGLE_DATA.drive_priorities);
    if(s){
      s.id="section-drive-prios";
      // Summary line inside section, right below header
      if(GOOGLE_DATA&&GOOGLE_DATA.drive_priorities){
        const dps = GOOGLE_DATA.drive_priorities.filter(p=>!DONE_PRIOS.has(p.id));
        if(dps.length){
          const dcounts = {};
          for(const p of dps) dcounts[p.action]=(dcounts[p.action]||0)+1;
          const dparts=[];
          if(dcounts.review) dparts.push(dcounts.review+" doc"+(dcounts.review>1?"s":"")+" to review");
          if(dcounts.read)   dparts.push(dcounts.read+" doc"+(dcounts.read>1?"s":"")+" to read");
          if(dcounts.task)   dparts.push(dcounts.task+" task"+(dcounts.task>1?"s":""));
          const dbrief = document.createElement("div");
          dbrief.style.cssText = "padding:4px 12px 2px;font-size:10px;color:var(--text-muted);font-style:italic;letter-spacing:.3px;";
          dbrief.textContent = "\uD83D\uDCC2 Drive: "+dparts.join(" \xB7");
          s.insertBefore(dbrief, s.children[1]);
        }
      }
      main.appendChild(s);
    } }

  // ── Google Drive section ──────────────────────────────────────────────────
  const driveSec = document.createElement("div");
  driveSec.className = "myday-section";
  driveSec.id = "section-drive-files";
  if(GOOGLE_DATA && GOOGLE_DATA.drive && GOOGLE_DATA.drive.recent && GOOGLE_DATA.drive.recent.length){
    const files = GOOGLE_DATA.drive.recent.slice(0,6);
    driveSec.innerHTML = \`<div class="myday-section-hdr"><span>📄 DRIVE — RECENT</span><span class="myday-section-count">\${files.length}</span></div>\`;
    for(const f of files){
      const row = document.createElement("div");
      row.className = "myday-item";
      if(f.url){ row.style.cursor="pointer"; row.addEventListener("click",()=>window.open(f.url,"_blank")); }
      const icon = f.mimeType&&f.mimeType.includes("spreadsheet")?"📊":f.mimeType&&f.mimeType.includes("presentation")?"📑":"📄";
      const d = f.modifiedAt ? new Date(f.modifiedAt) : null;
      const dateStr = d ? d.toLocaleDateString("en-GB",{day:"2-digit",month:"short"}) : "";
      row.innerHTML = \`
        <span class="myday-source src-drive">DR</span>
        <span class="myday-item-title">\${icon} \${f.name||"(untitled)"}</span>
        \${dateStr?'<span class="myday-item-date">'+dateStr+'</span>':""}
      \`;
      driveSec.appendChild(row);
    }
  } else {
    driveSec.innerHTML = \`
      <div class="myday-section-hdr"><span>📄 DRIVE — RECENT</span></div>
      <div class="myday-coming-card">
        <span class="myday-coming-icon">📄</span>
        <div class="myday-coming-text">
          <div class="myday-coming-title">GOOGLE DRIVE</div>
          <div class="myday-coming-desc">Connect Google account &amp; run workflow to populate</div>
        </div>
      </div>\`;
  }
  main.appendChild(driveSec);


  } // end showDrive

    // ── Sidebar ───────────────────────────────────────────────────────────────
  sidebar.innerHTML = "";
  const showPipeline = MYDAY_SECTION==="all"||MYDAY_SECTION==="tasks"; // removed inbox — keep inbox sidebar as calendar only
  const showCal      = MYDAY_SECTION==="all"||MYDAY_SECTION==="cal"||MYDAY_SECTION==="tasks"||MYDAY_SECTION==="inbox";

  if(showPipeline && HS_DATA && HS_DATA.deals && HS_DATA.deals.length){
    const soonDeals = HS_DATA.deals
      .filter(d=>!DONE_STATES.has(d.stage||"") && d.closeDate)
      .sort((a,b)=>new Date(a.closeDate)-new Date(b.closeDate))
      .slice(0,10);
    if(soonDeals.length){
      const sideHdr = document.createElement("div");
      sideHdr.className = "myday-sidebar-hdr";
      sideHdr.textContent = "🏆 PIPELINE CLOSING SOON";
      sidebar.appendChild(sideHdr);
      for(const d of soonDeals){
        const dr = document.createElement("div");
        dr.className = "myday-deal-row";
        const dd2 = daysDiff(d.closeDate);
        const dCls = dd2<0?"overdue":dd2<=14?"soon":"";
        const amt = d.amount ? (HS_DATA.currency||"€")+Number(d.amount).toLocaleString("en") : "";
        if(HS_DATA.portalId){ dr.style.cursor="pointer"; dr.addEventListener("click",()=>window.open(\`https://app.hubspot.com/contacts/\${HS_DATA.portalId}/deal/\${d.id}\`,"_blank")); }
        dr.innerHTML = \`
          <span class="myday-deal-name">\${d.name||"(untitled)"}</span>
          \${amt?'<span class="myday-deal-amt">'+amt+'</span>':""}
          <span class="myday-deal-date \${dCls}">\${dd2===0?"Today":dd2<0?Math.abs(dd2)+"d ago":fmtDate(d.closeDate)}</span>
        \`;
        sidebar.appendChild(dr);
      }
    }
  }

  // ── Calendar sidebar ──────────────────────────────────────────────────────
  if(showCal){
    const calHdr = document.createElement("div");
    calHdr.className = "myday-sidebar-hdr";
    calHdr.style.marginTop = showPipeline?"12px":"0";
    calHdr.textContent = "📅 TODAY'S SCHEDULE";
    sidebar.appendChild(calHdr);

    if(GOOGLE_DATA && GOOGLE_DATA.calendar && GOOGLE_DATA.calendar.today && GOOGLE_DATA.calendar.today.length){
      for(const ev of GOOGLE_DATA.calendar.today){
        const er = document.createElement("div");
        er.className = "myday-deal-row";
        if(er.style) er.style.cursor="default";
        const st = ev.start ? new Date("1970-01-01T"+(ev.start.includes("T")?ev.start.split("T")[1]:ev.start)).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}) : ev.start||"";
        const en = ev.end   ? new Date("1970-01-01T"+(ev.end.includes("T")?ev.end.split("T")[1]:ev.end)).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}) : ev.end||"";
        const ppl = ev.numAttendees>1 ? \`\${ev.numAttendees} people\` : "";
        const loc = ev.location ? \`<span class="myday-deal-date" style="color:var(--text-dim);font-style:italic">\${ev.location.slice(0,30)}</span>\`:"";
        er.innerHTML = \`
          <span class="myday-deal-name">\${ev.title||"(untitled)"}</span>
          \${ppl?'<span class="myday-deal-date">'+ppl+'</span>':""}
          \${loc}
          <span class="myday-deal-date">\${st}\${en&&en!==st?" – "+en:""}</span>
        \`;
        sidebar.appendChild(er);
      }
    } else {
      const noCal = document.createElement("div");
      noCal.className = "myday-coming-card";
      noCal.innerHTML = \`<span class="myday-coming-icon">📅</span><div class="myday-coming-text"><div class="myday-coming-title">GOOGLE CALENDAR</div><div class="myday-coming-desc">Connect Google account &amp; run workflow to populate</div></div>\`;
      sidebar.appendChild(noCal);
    }

    // ── Upcoming events ─────────────────────────────────────────────────────
    if(GOOGLE_DATA && GOOGLE_DATA.calendar && GOOGLE_DATA.calendar.upcoming && GOOGLE_DATA.calendar.upcoming.length){
      const upHdr = document.createElement("div");
      upHdr.className = "myday-sidebar-hdr";
      upHdr.style.marginTop = "12px";
      upHdr.textContent = "📆 COMING UP";
      sidebar.appendChild(upHdr);
      for(const ev of GOOGLE_DATA.calendar.upcoming.slice(0,5)){
        const er = document.createElement("div");
        er.className = "myday-deal-row";
        const d = ev.date ? new Date(ev.date) : (ev.start ? new Date(ev.start) : null);
        const dateStr = d ? d.toLocaleDateString("en-GB",{weekday:"short",day:"2-digit",month:"short"}) : "";
        const st = ev.start||"";
        er.innerHTML = \`
          <span class="myday-deal-name">\${ev.title||"(untitled)"}</span>
          <span class="myday-deal-date">\${dateStr}\${st?" · "+st:""}</span>
        \`;
        sidebar.appendChild(er);
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════
// CLAUDE AI DAILY BRIEF
// ═══════════════════════════════════════════════════════════════════════════
const CLAUDE_KEY_STORAGE = "anthropic_api_key_supplied";
const CLAUDE_HISTORIES = {myday:[], roadmap:[], sales:[]};
let CLAUDE_VIEW_NAME = null;

function getClaudeKey(){ return localStorage.getItem(CLAUDE_KEY_STORAGE)||""; }
function setClaudeKey(k){ if(k) localStorage.setItem(CLAUDE_KEY_STORAGE,k); else localStorage.removeItem(CLAUDE_KEY_STORAGE); }
function openClaudeKeyModal(){
  const ov=document.getElementById("claude-key-overlay");
  const inp=document.getElementById("claude-key-input");
  if(ov) ov.classList.add("open"); if(inp){ inp.value=getClaudeKey(); inp.focus(); }
}
function closeClaudeKeyModal(){ const ov=document.getElementById("claude-key-overlay"); if(ov) ov.classList.remove("open"); }
function saveClaudeKey(){
  const inp=document.getElementById("claude-key-input");
  const st=document.getElementById("claude-key-status");
  const k=(inp&&inp.value||"").trim();
  if(!k){ if(st) st.textContent="Please enter a key."; return; }
  setClaudeKey(k); closeClaudeKeyModal();
  Object.keys(CLAUDE_HISTORIES).forEach(t=>{ CLAUDE_HISTORIES[t]=[]; });
  if(currentTab==="myday"){ renderMyDay(); }
  else {
    const old=document.getElementById("claude-panel-"+currentTab);
    if(old) old.remove();
    const cont=document.getElementById("panel-"+currentTab);
    if(cont) renderClaudeBrief(cont, CLAUDE_VIEW_NAME||"Johann", currentTab);
  }
}
function buildDataContext(tabKey){
  const tk=tabKey||"myday";
  const inclHubspot=(tk==="myday"||tk==="sales");
  const inclGoogle=(tk==="myday");
  // Read what the user has already ticked off today
  const donedToday=new Set(JSON.parse(localStorage.getItem("supplied_auto_done_"+TODAY_STR)||"[]"));
  const snoozed=JSON.parse(localStorage.getItem("supplied_snooze")||"{}");
  function isDismissed(id){ return donedToday.has(id)||(snoozed[id]&&snoozed[id]>TODAY_STR); }
  const lines=[];
  lines.push("TODAY: "+new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"}));
  if(donedToday.size) lines.push("ALREADY DONE TODAY (user ticked off): "+donedToday.size+" items \u2014 do not suggest these again.");
  if(GANTT_DATA){
    const allIss=[];
    for(const ini of (GANTT_DATA.initiatives||[])){
      if(DONE_STATES.has(ini.status||"")) continue;
      for(const proj of (ini.projects||[])){
        if(DONE_STATES.has(proj.status||"")) continue;
        for(const iss of (proj.issues||[])){
          if(isActive(iss.status)&&!isDismissed("lin-"+iss.id)) allIss.push({...iss, _ini:ini.name, _proj:proj.name});
        }
      }
    }
    const PRIO_RANK={Urgent:0,High:1,Medium:2,Low:3,"No priority":4};
    const blocked=allIss.filter(i=>i.status==="Blocked");
    const inProgress=allIss.filter(i=>i.status==="In Progress"||i.status==="In Review"||i.status==="In Test");
    const todoIss=allIss.filter(i=>i.status==="Todo").sort((a,b)=>(PRIO_RANK[a.priority]??4)-(PRIO_RANK[b.priority]??4));
    const backlogUrgHigh=allIss.filter(i=>i.status==="Backlog"&&(i.priority==="Urgent"||i.priority==="High")).sort((a,b)=>(PRIO_RANK[a.priority]??4)-(PRIO_RANK[b.priority]??4));
    const overdue=allIss.filter(i=>i.end&&i.end<TODAY_STR);
    lines.push("\\nLINEAR SUMMARY: "+allIss.length+" active | "+blocked.length+" blocked | "+overdue.length+" overdue | "+inProgress.length+" in progress | "+todoIss.length+" todo | "+backlogUrgHigh.length+" backlog urgent/high");
    function fmtIss(i){ return "  ["+i.identifier+"] "+i.title+" | "+i.status+" | "+(i.priority||"No priority")+" | assignee:"+(i.assignee||"unassigned")+" | proj:"+i._proj+" | ini:"+i._ini+(i.end?" | due:"+i.end:""); }
    if(blocked.length){ lines.push("\\nBLOCKED:"); blocked.forEach(i=>lines.push(fmtIss(i))); }
    if(inProgress.length){ lines.push("\\nIN PROGRESS:"); inProgress.forEach(i=>lines.push(fmtIss(i))); }
    if(todoIss.length){ lines.push("\\nTODO (ready to pick up):"); todoIss.forEach(i=>lines.push(fmtIss(i))); }
    if(backlogUrgHigh.length){ lines.push("\\nBACKLOG - URGENT/HIGH (should these be Todo?):"); backlogUrgHigh.forEach(i=>lines.push(fmtIss(i))); }
    if(overdue.length){ lines.push("\\nOVERDUE:"); overdue.slice(0,10).forEach(i=>lines.push(fmtIss(i))); }
  }
  if(inclHubspot&&HS_DATA){
    const todayMs=new Date().setHours(0,0,0,0);
    const closing=(HS_DATA.deals||[]).filter(d=>d.closeDate&&!isDoneStage(d.stageLabel)&&!isDismissed("deal-"+d.id)).map(d=>({...d,diff:Math.ceil((new Date(d.closeDate)-todayMs)/864e5)})).filter(d=>d.diff<=14).sort((a,b)=>a.diff-b.diff).slice(0,5);
    if(closing.length){
      lines.push("\\nDEALS CLOSING SOON:");
      for(const d of closing) lines.push("  "+d.name+(d.amount?" (\u20AC"+Number(d.amount).toLocaleString()+")":"")+" - "+(d.diff<0?Math.abs(d.diff)+"d overdue":d.diff===0?"TODAY":"in "+d.diff+"d")+" ["+d.stageLabel+"]");
    }
  }
  if(inclGoogle&&GOOGLE_DATA){
    const ep=(GOOGLE_DATA.email_priorities||[]).filter(e=>!isDismissed("ep-"+e.id)).slice(0,5);
    if(ep.length){ lines.push("\\nEMAILS TO ACTION:"); for(const e of ep) lines.push("  ["+e.action.toUpperCase()+"] "+e.subject+" - "+e.reason); }
    else lines.push("\\nEMAILS: All actioned.");
    const cal=GOOGLE_DATA.calendar;
    if(cal&&(cal.today||[]).length){ lines.push("\\nMEETINGS TODAY:"); for(const ev of cal.today) lines.push("  "+ev.title+(ev.start?" @ "+ev.start:"")); }
    else lines.push("\\nMEETINGS: None today");
    const dp=(GOOGLE_DATA.drive_priorities||[]).filter(d=>!isDismissed("dp-"+d.id)).slice(0,3);
    if(dp.length){ lines.push("\\nDRIVE PRIORITIES:"); for(const d of dp) lines.push("  ["+d.action.toUpperCase()+"] "+d.subject); }
  }
  return lines.join("\\n");
}
function buildSystemPrompt(tabKey){
  const tk=tabKey||"myday";
  const name=CLAUDE_VIEW_NAME||"the user";
  const scope={
    myday:"Linear issues, HubSpot deals, calendar, and emails",
    roadmap:"Linear issues only (tickets, projects, initiatives). You have NO HubSpot or email data — do not invent or reference deals.",
    sales:"HubSpot deals and tasks. You also have Linear issue data for cross-referencing delivery dependencies."
  };
  return "You are a direct, sharp personal productivity assistant for "+name+" at Supplied.eu (B2B SaaS company).\\n\\nData scope for this view: "+(scope[tk]||scope.myday)+"\\n\\nYou have full visibility of their Linear issues (id, title, status, priority, assignee, project, initiative, due date). Use this data to answer specific questions accurately.\\n\\nCurrent work data:\\n"+buildDataContext(tk)+"\\n\\nStyle rules: be concise but complete when asked specific questions. No flattery. Plain text only. When asked about specific issues, list them with their identifier and key attributes. Never say you lack visibility into individual issues — you have the full list above.";
}
async function callClaudeStream(messages,onChunk,onDone,onError,tabKey){
  const key=getClaudeKey();
  if(!key){ openClaudeKeyModal(); return; }
  try{
    const res=await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",
      headers:{"x-api-key":key,"anthropic-version":"2023-06-01","content-type":"application/json","anthropic-dangerous-direct-browser-access":"true"},
      body:JSON.stringify({model:"claude-opus-4-5-20251101",max_tokens:600,system:buildSystemPrompt(tabKey),messages,stream:true}),
    });
    if(res.status===401){ setClaudeKey(""); openClaudeKeyModal(); onError("Invalid API key \u2014 please re-enter."); return; }
    if(!res.ok){ onError("API error "+res.status); return; }
    const reader=res.body.getReader(); const dec=new TextDecoder(); let buf="";
    while(true){
      const {done,value}=await reader.read(); if(done) break;
      buf+=dec.decode(value,{stream:true});
      const lines=buf.split("\\n"); buf=lines.pop();
      for(const line of lines){
        if(!line.startsWith("data: ")) continue;
        const data=line.slice(6).trim(); if(data==="[DONE]") continue;
        try{ const ev=JSON.parse(data); if(ev.type==="content_block_delta"&&ev.delta&&ev.delta.text) onChunk(ev.delta.text); }catch(_){}
      }
    }
    onDone();
  }catch(e){ onError("Connection error: "+e.message); }
}
function appendClaudeMsg(role,text,tabKey){
  const tk=tabKey||currentTab;
  const el=document.getElementById("claude-msgs-"+tk); if(!el) return;
  const wrap=document.createElement("div"); if(role==="user") wrap.className="claude-msg-user";
  const txt=document.createElement("div"); txt.className="claude-msg-text"; txt.textContent=text;
  wrap.appendChild(txt); el.appendChild(wrap); el.scrollTop=el.scrollHeight;
}
function streamClaudeReply(userMsg,silent,tabKey){
  const tk=tabKey||currentTab;
  const msgsEl=document.getElementById("claude-msgs-"+tk);
  const sendBtn=document.getElementById("claude-send-btn-"+tk);
  if(sendBtn) sendBtn.disabled=true;
  CLAUDE_HISTORIES[tk].push({role:"user",content:userMsg});
  if(!silent) appendClaudeMsg("user",userMsg,tk);
  const think=document.createElement("div"); think.className="claude-msg-thinking"; think.textContent="Thinking\u2026";
  if(msgsEl){ msgsEl.appendChild(think); msgsEl.scrollTop=msgsEl.scrollHeight; }
  let full=""; let textEl=null;
  callClaudeStream(CLAUDE_HISTORIES[tk],
    (chunk)=>{
      if(!textEl){
        if(think.parentNode) think.remove();
        const wrap=document.createElement("div");
        textEl=document.createElement("div"); textEl.className="claude-msg-text";
        wrap.appendChild(textEl); if(msgsEl) msgsEl.appendChild(wrap);
      }
      full+=chunk; textEl.textContent=full; if(msgsEl) msgsEl.scrollTop=msgsEl.scrollHeight;
    },
    ()=>{ CLAUDE_HISTORIES[tk].push({role:"assistant",content:full}); if(sendBtn) sendBtn.disabled=false; },
    (err)=>{ if(think.parentNode) think.remove(); appendClaudeMsg("assistant","\u26A0\uFE0F "+err,tk); if(sendBtn) sendBtn.disabled=false; },
    tk
  );
}
function sendClaudeMsg(tabKey){
  const tk=tabKey||currentTab;
  const inp=document.getElementById("claude-inp-"+tk);
  const msg=(inp&&inp.value||"").trim(); if(!msg) return;
  if(inp) inp.value="";
  if(!getClaudeKey()){ openClaudeKeyModal(); return; }
  streamClaudeReply(msg,false,tk);
}
function renderClaudeBrief(container,personName,tabKey){
  const tk=tabKey||"myday";
  if(personName) CLAUDE_VIEW_NAME=personName;
  // Don\u2019t re-render if panel already exists for this tab
  if(document.getElementById("claude-panel-"+tk)) return;
  const BRIEF_LABELS={myday:"DAILY BRIEF",roadmap:"ROADMAP BRIEF",sales:"SALES BRIEF"};
  const DEFAULT_PROMPTS={
    myday:"Give me a sharp daily brief \u2014 what are my top 3-4 most important actions right now? Be direct and specific.",
    roadmap:"Give me a sharp roadmap brief focused purely on delivery. Look at Linear tickets only \u2014 which ones linked to customer initiatives are overdue or blocked, and could any of them delay a customer go-live? Then list the top product priority items the team should pick up this sprint. Do not mention HubSpot deals or sales pipeline \u2014 that belongs in Sales & Ops.",
    sales:"Give me a sharp sales brief \u2014 which deals need action this week, what\u2019s at risk of slipping, and what should I prioritise in the pipeline?"
  };
  const autoPrompt=DEFAULT_PROMPTS[tk]||DEFAULT_PROMPTS.myday;
  const placeholders={myday:"Ask me anything about your day\u2026",roadmap:"Ask about roadmap, customer risks, priorities\u2026",sales:"Ask about deals, pipeline, follow-ups\u2026"};
  const panel=document.createElement("div"); panel.className="claude-panel"; panel.id="claude-panel-"+tk;
  const hdr=document.createElement("div"); hdr.className="claude-panel-hdr";
  const lbl=document.createElement("span"); lbl.textContent="\uD83E\uDD16  CLAUDE \u00B7 "+(BRIEF_LABELS[tk]||"BRIEF");
  const keyBtn=document.createElement("button"); keyBtn.className="cpanel-key-btn"; keyBtn.textContent="\u2699 API KEY"; keyBtn.onclick=openClaudeKeyModal;
  hdr.appendChild(lbl); hdr.appendChild(keyBtn); panel.appendChild(hdr);
  const msgs=document.createElement("div"); msgs.className="claude-msgs"; msgs.id="claude-msgs-"+tk; panel.appendChild(msgs);
  const inRow=document.createElement("div"); inRow.className="claude-input-row";
  const inp=document.createElement("input"); inp.type="text"; inp.id="claude-inp-"+tk; inp.placeholder=placeholders[tk]||"Ask me anything\u2026";
  inp.addEventListener("keydown",e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); sendClaudeMsg(tk); } });
  const btn=document.createElement("button"); btn.className="claude-send-btn"; btn.id="claude-send-btn-"+tk; btn.textContent="SEND"; btn.onclick=()=>sendClaudeMsg(tk);
  inRow.appendChild(inp); inRow.appendChild(btn); panel.appendChild(inRow);
  if(tk==="myday"){ container.appendChild(panel); } else { container.insertBefore(panel,container.firstChild); }
  const key=getClaudeKey();
  if(!key){
    const noKey=document.createElement("div"); noKey.className="claude-msg-text"; noKey.style.cssText="color:var(--text-dim);font-size:11.5px;";
    noKey.textContent="Connect your Anthropic API key (\u2699 above) to get a personalised brief and ask follow-up questions.";
    msgs.appendChild(noKey);
  } else if(CLAUDE_HISTORIES[tk].length===0){
    streamClaudeReply(autoPrompt,true,tk);
  } else {
    for(const m of CLAUDE_HISTORIES[tk]){ if(m.role==="assistant") appendClaudeMsg("assistant",m.content,tk); }
  }
}

// INIT / REFRESH
// ═══════════════════════════════════════════════════════════════════════════
async function init(){
  const btn=document.getElementById("refresh-btn");
  if(btn) btn.classList.add("loading");
  renderGantt();
  try {
    // Load Linear gantt data
    const gr=await fetch('./gantt-data.json?t='+Date.now());
    if(!gr.ok) throw new Error('HTTP '+gr.status);
    GANTT_DATA=await gr.json();
    const el=document.getElementById("refresh-time");
    if(el&&GANTT_DATA.refreshedAt) el.textContent="UPDATED "+new Date(GANTT_DATA.refreshedAt).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});
    populateGanttAlertBar(ganttComputeStats(GANTT_DATA));
    renderGantt();
  } catch(err){
    console.error("Failed to load gantt-data.json",err);
    ganttBody.innerHTML='<div style="padding:40px;text-align:center;color:#ef4444;font-size:11px;letter-spacing:0.5px">Failed to load Linear data — check console.</div>';
    const el=document.getElementById("refresh-time"); if(el) el.textContent="ERROR";
  }

  // Load HubSpot data (optional — won't fail the page if missing)
  try {
    const hr=await fetch('./hubspot-data.json?t='+Date.now());
    if(hr.ok){
      HS_DATA=await hr.json();
      if(HS_DATA&&(HS_DATA.tasks||HS_DATA.deals)){
        populateSalesAlertBar(opsComputeStats(HS_DATA));
        populateOwnerStrip(HS_DATA);
        renderSalesFunnels();
        renderOps();
      } else { renderOpsEmpty(); }
    } else { renderOpsEmpty(); }
  } catch(e){ renderOpsEmpty(); }

  // Load Leadfeeder data (optional — traffic sources panel)
  try {
    const lr=await fetch('./leadfeeder-data.json?t='+Date.now());
    if(lr.ok){
      LF_DATA=await lr.json();
      // Re-render funnels panel now that Leadfeeder data is loaded
      if(HS_DATA) renderSalesFunnels();
    }
  } catch(e){ /* Leadfeeder data not available */ }

  // Load Google data for current person (google-data-{name}.json → fallback google-data.json)
  // detectMyName() may return null if data not loaded yet — loadGoogleDataFor handles that
  const myPersonKey = MYDAY_PERSON==="all" ? null
    : MYDAY_PERSON==="me" ? detectMyName()
    : MYDAY_PERSON;
  await loadGoogleDataFor(myPersonKey);

  // Always render My Day (works with whatever data has loaded)
  renderMyDay();

  if(btn) btn.classList.remove("loading");
}

// ═══════════════════════════════════════════════════════════════════════════
// ON-DEMAND REFRESH — triggers GitHub Actions workflow via PAT
// ═══════════════════════════════════════════════════════════════════════════
const GH_OWNER    = "supplied-eu";
const GH_REPO     = "roadmap";
const GH_WORKFLOW = "refresh.yml";
const PAT_KEY     = "gh_pat_supplied_dashboard";

function getStoredPat(){ return localStorage.getItem(PAT_KEY)||""; }
function setStoredPat(t){ if(t) localStorage.setItem(PAT_KEY,t); else localStorage.removeItem(PAT_KEY); }

function openPatModal(){
  const ov=document.getElementById("pat-overlay");
  const inp=document.getElementById("pat-input");
  if(ov) ov.classList.add("open");
  if(inp){ inp.value=getStoredPat(); inp.focus(); }
}
function closePatModal(){
  const ov=document.getElementById("pat-overlay");
  if(ov) ov.classList.remove("open");
}
function savePat(){
  const inp=document.getElementById("pat-input");
  const st=document.getElementById("pat-status");
  const token=(inp&&inp.value||"").trim();
  if(!token){ if(st) st.textContent="Please enter a token."; return; }
  setStoredPat(token);
  closePatModal();
  doRefresh();
}

async function triggerWorkflow(token){
  const url=\`https://api.github.com/repos/\${GH_OWNER}/\${GH_REPO}/actions/workflows/\${GH_WORKFLOW}/dispatches\`;
  const res=await fetch(url,{
    method:"POST",
    headers:{"Authorization":"token "+token,"Accept":"application/vnd.github+json","Content-Type":"application/json"},
    body:JSON.stringify({ref:"main",inputs:{reason:"Dashboard on-demand refresh"}}),
  });
  return res.status===204; // 204 = accepted
}

async function pollWorkflowDone(token, maxWaitMs=120000){
  const url=\`https://api.github.com/repos/\${GH_OWNER}/\${GH_REPO}/actions/workflows/\${GH_WORKFLOW}/runs?per_page=1&branch=main\`;
  const deadline=Date.now()+maxWaitMs;
  await new Promise(r=>setTimeout(r,5000)); // give GitHub 5s to register the run
  while(Date.now()<deadline){
    try{
      const res=await fetch(url,{headers:{"Authorization":"token "+token,"Accept":"application/vnd.github+json"}});
      if(res.ok){
        const data=await res.json();
        const run=data.workflow_runs&&data.workflow_runs[0];
        if(run&&(run.status==="completed"||run.conclusion==="success")) return true;
        if(run&&run.conclusion==="failure") return false;
      }
    }catch(e){ /* keep polling */ }
    await new Promise(r=>setTimeout(r,5000));
  }
  return false; // timed out — reload anyway
}

function setRefreshLabel(text, cls){
  const btn=document.getElementById("refresh-btn");
  if(!btn) return;
  btn.classList.remove("loading","running","done");
  if(cls) btn.classList.add(cls);
  btn.innerHTML=\`<span class="spin">↻</span> \${text}\`;
}

async function doRefresh(){
  const token=getStoredPat();
  if(!token){ openPatModal(); return; }

  setRefreshLabel("TRIGGERING…","loading");
  let triggered=false;
  try{ triggered=await triggerWorkflow(token); } catch(e){}

  if(!triggered){
    // Token might be invalid/expired — clear it and ask again
    setStoredPat("");
    setRefreshLabel("REFRESH","");
    openPatModal();
    return;
  }

  setRefreshLabel("RUNNING…","running");
  const done=await pollWorkflowDone(token);
  setRefreshLabel(done?"DONE — RELOADING…":"RELOADING…","done");
  await new Promise(r=>setTimeout(r,1000));
  // Re-fetch all data and re-render (no full page reload needed)
  GANTT_DATA=null; HS_DATA=null; GOOGLE_DATA=null;
  setRefreshLabel("REFRESH","");
  init();
}
init();
</script>
</body>
</html>`;

fs.writeFileSync(outPath, html);
console.log(`✅ Built index.html (${Math.round(html.length/1024)}KB)`);
