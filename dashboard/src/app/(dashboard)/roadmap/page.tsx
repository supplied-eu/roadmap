'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { ChevronRight, ChevronDown, AlertTriangle, AlertCircle, Zap, ArrowUp, ExternalLink, GripVertical, User } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────
type Issue = {
  id: string; identifier: string; title: string; priority: number;
  status: string; statusType: string; statusColor: string;
  assignee: string | null; start: string | null; end: string | null;
  url: string; parentId: string | null;
  labels: { name: string; color: string }[];
};
type Project = {
  id: string; name: string; status: string; statusColor: string;
  startDate: string | null; targetDate: string | null; url: string;
  issues: Issue[];
};
type Initiative = {
  id: string; name: string; description: string;
  status: string; statusColor: string; targetDate: string | null;
  projects: Project[];
};
type RoadmapData = { initiatives: Initiative[]; orphanProjects: Project[] };

type Zoom = 'week' | 'month' | 'quarter';

// ── Constants ──────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  'Todo': '#6366f1', 'In Progress': '#f59e0b', 'In Review': '#fb923c',
  'In Test': '#a78bfa', 'Blocked': '#ef4444', 'Planned': '#8b5cf6',
  'Backlog': '#334155', 'Done': '#22c55e', 'Cancelled': '#94a3b8',
  'Canceled': '#94a3b8', 'Completed': '#22c55e', 'Started': '#f59e0b',
};
const DONE_STATES = new Set(['Done', 'Cancelled', 'Canceled', 'Completed', 'Duplicate']);
const PRIO_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'URGENT', color: '#ef4444' },
  2: { label: 'HIGH', color: '#f97316' },
};

function sc(status: string) { return STATUS_COLORS[status] || '#94a3b8'; }

const STATUS_ORDER: Record<string, number> = {
  'In Progress': 0, 'Started': 0, 'In Review': 1, 'In Test': 2,
  'Todo': 3, 'Planned': 4, 'Backlog': 5,
  'Blocked': -1,
  'Done': 10, 'Completed': 10, 'Cancelled': 11, 'Canceled': 11,
};
function statusSort(a: string, b: string) {
  return (STATUS_ORDER[a] ?? 6) - (STATUS_ORDER[b] ?? 6);
}

const CUSTOMER_INI_NAME = 'Customer and Partner Go Live';

// ── Zoom ranges ────────────────────────────────────────────────
function getZoomRange(zoom: Zoom) {
  const now = new Date();
  let start: Date, end: Date;
  if (zoom === 'week') {
    start = new Date(now); start.setDate(start.getDate() - 7);
    end = new Date(now); end.setDate(end.getDate() + 21);
  } else if (zoom === 'quarter') {
    start = new Date(now); start.setMonth(start.getMonth() - 6, 1);
    end = new Date(now); end.setFullYear(end.getFullYear() + 1); end.setMonth(end.getMonth() + 6, 28);
  } else {
    start = new Date(now); start.setMonth(start.getMonth() - 3, 1);
    end = new Date(now); end.setFullYear(end.getFullYear() + 1); end.setMonth(end.getMonth() + 2, 28);
  }
  return { start: fmt(start), end: fmt(end) };
}

function fmt(d: Date) { return d.toISOString().split('T')[0]; }
function daysBetween(a: string, b: string) { return (new Date(b).getTime() - new Date(a).getTime()) / 86400000; }

// ── Ticks generator ────────────────────────────────────────────
function generateTicks(zoom: Zoom, rangeStart: string, rangeEnd: string) {
  const ticks: { label: string; pct: number; major: boolean }[] = [];
  const totalMs = new Date(rangeEnd).getTime() - new Date(rangeStart).getTime();
  const pct = (d: string) => Math.max(0, Math.min(100, ((new Date(d).getTime() - new Date(rangeStart).getTime()) / totalMs) * 100));

  if (zoom === 'week') {
    const cur = new Date(rangeStart);
    const end = new Date(rangeEnd);
    while (cur <= end) {
      const iso = fmt(cur);
      ticks.push({
        label: cur.toLocaleDateString('en', { weekday: 'short', day: 'numeric' }),
        pct: pct(iso),
        major: cur.getDay() === 1,
      });
      cur.setDate(cur.getDate() + 1);
    }
  } else if (zoom === 'quarter') {
    const cur = new Date(rangeStart); cur.setDate(1);
    const end = new Date(rangeEnd);
    while (cur <= end) {
      const iso = fmt(cur);
      const isQ = cur.getMonth() % 3 === 0;
      ticks.push({
        label: isQ ? `Q${Math.floor(cur.getMonth() / 3) + 1} ${cur.getFullYear().toString().slice(2)}` : cur.toLocaleDateString('en', { month: 'short' }),
        pct: pct(iso),
        major: isQ,
      });
      cur.setMonth(cur.getMonth() + 1);
    }
  } else {
    const cur = new Date(rangeStart); cur.setDate(1);
    const end = new Date(rangeEnd);
    while (cur <= end) {
      const iso = fmt(cur);
      ticks.push({
        label: cur.toLocaleDateString('en', { month: 'short', year: '2-digit' }),
        pct: pct(iso),
        major: cur.getMonth() % 3 === 0,
      });
      cur.setMonth(cur.getMonth() + 1);
    }
  }
  return ticks;
}

// ── Bar component ──────────────────────────────────────────────
function GanttBar({ start, end, color, rangeStart, rangeEnd, isIni, overdue }: {
  start: string | null; end: string | null; color: string;
  rangeStart: string; rangeEnd: string; isIni?: boolean; overdue?: boolean;
}) {
  if (!start && !end) return <span className="text-xs italic" style={{ color: 'var(--text-dim)' }}>no dates</span>;
  const totalMs = new Date(rangeEnd).getTime() - new Date(rangeStart).getTime();
  const pct = (d: string) => Math.max(0, Math.min(100, ((new Date(d).getTime() - new Date(rangeStart).getTime()) / totalMs) * 100));

  const s = start || end!;
  const e = end || start!;
  const left = pct(s);
  const right = pct(e);
  const width = Math.max(right - left, 0.5);

  return (
    <div
      className="absolute rounded-sm transition-all"
      style={{
        left: `${left}%`,
        width: `${width}%`,
        height: isIni ? '10px' : '7px',
        top: isIni ? '50%' : '50%',
        transform: 'translateY(-50%)',
        background: overdue ? `repeating-linear-gradient(45deg, ${color}, ${color} 3px, ${color}88 3px, ${color}88 6px)` : color,
        opacity: isIni ? 0.9 : 0.8,
        borderRadius: isIni ? '3px' : '2px',
      }}
    />
  );
}

// ── Row component ──────────────────────────────────────────────
function GanttRow({ indent, label, status, color, start, end, url, hasChildren, isExpanded,
  isIni, onClick, assignee, priority, overdue, rangeStart, rangeEnd, todayPct, dragHandle }: {
  indent: number; label: string; status: string; color: string;
  start: string | null; end: string | null; url: string | null;
  hasChildren: boolean; isExpanded: boolean; isIni: boolean;
  onClick?: () => void; assignee: string | null; priority: number;
  overdue: boolean; rangeStart: string; rangeEnd: string; todayPct: number;
  dragHandle?: boolean;
}) {
  const prioMeta = PRIO_LABELS[priority];
  return (
    <div
      className="flex items-stretch transition-colors group"
      style={{
        borderBottom: '1px solid var(--border)',
        background: isIni ? 'var(--surface2, var(--bg))' : 'transparent',
        cursor: hasChildren || onClick ? 'pointer' : 'default',
        minHeight: isIni ? '36px' : '32px',
      }}
      onClick={onClick}
    >
      {/* Left: label area */}
      <div
        className="flex items-center gap-1.5 shrink-0 overflow-hidden"
        style={{ width: '380px', minWidth: '380px', paddingLeft: `${10 + indent * 16}px`, paddingRight: '8px' }}
      >
        {dragHandle && (
          <GripVertical size={12} className="shrink-0 cursor-grab opacity-40 hover:opacity-100" style={{ color: 'var(--text-muted)' }} />
        )}
        {hasChildren && (
          <ChevronRight
            size={12}
            className="shrink-0 transition-transform"
            style={{ color: 'var(--text-muted)', transform: isExpanded ? 'rotate(90deg)' : 'none' }}
          />
        )}
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener"
            className="text-xs truncate hover:underline"
            style={{ color: 'var(--text)', fontWeight: isIni ? 600 : 400 }}
            onClick={e => e.stopPropagation()}
          >
            {label}
          </a>
        ) : (
          <span className="text-xs truncate" style={{ color: 'var(--text)', fontWeight: isIni ? 600 : 400 }}>{label}</span>
        )}
        {prioMeta && !isIni && (
          <span className="text-[9px] px-1 py-0.5 rounded shrink-0 font-bold tracking-wider"
            style={{ background: prioMeta.color + '22', color: prioMeta.color }}>
            {prioMeta.label}
          </span>
        )}
        {overdue && !isIni && (
          <span className="text-[9px] px-1 py-0.5 rounded shrink-0 font-bold tracking-wider"
            style={{ background: '#ef444422', color: '#ef4444' }}>
            OVERDUE
          </span>
        )}
        {status && (
          <span className="text-[9px] px-1.5 py-0.5 rounded shrink-0 ml-auto"
            style={{ background: sc(status) + '22', color: sc(status) }}>
            {status}
          </span>
        )}
        {assignee && (
          <span className="text-[9px] shrink-0 ml-1" style={{ color: 'var(--text-dim)' }}>
            {assignee.split(' ')[0]}
          </span>
        )}
      </div>

      {/* Right: bar area */}
      <div className="flex-1 relative" style={{ borderLeft: '1px solid var(--border)' }}>
        {/* Today line */}
        <div className="absolute top-0 bottom-0 w-px" style={{ left: `${todayPct}%`, background: '#ef4444', zIndex: 2, opacity: 0.6 }} />
        <GanttBar start={start} end={end} color={color} rangeStart={rangeStart} rangeEnd={rangeEnd} isIni={isIni} overdue={overdue} />
      </div>
    </div>
  );
}

// ── Section header ─────────────────────────────────────────────
function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2" style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
      <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text)' }}>{title}</span>
      {subtitle && <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>{subtitle}</span>}
    </div>
  );
}

// ── Alert bar ──────────────────────────────────────────────────
function AlertBar({ data }: { data: RoadmapData }) {
  let urgent = 0, high = 0, overdue = 0, total = 0;
  const today = fmt(new Date());
  for (const ini of data.initiatives) {
    if (DONE_STATES.has(ini.status)) continue;
    for (const proj of ini.projects) {
      if (DONE_STATES.has(proj.status)) continue;
      for (const iss of proj.issues) {
        if (DONE_STATES.has(iss.status)) continue;
        total++;
        if (iss.priority === 1) urgent++;
        else if (iss.priority === 2) high++;
        if (iss.end && iss.end < today && !DONE_STATES.has(iss.status)) overdue++;
      }
    }
  }

  return (
    <div className="flex items-center gap-4 px-4 py-2" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
      {urgent > 0 && (
        <span className="flex items-center gap-1 text-xs font-medium" style={{ color: '#ef4444' }}>
          <Zap size={12} /> {urgent} urgent
        </span>
      )}
      {high > 0 && (
        <span className="flex items-center gap-1 text-xs font-medium" style={{ color: '#f97316' }}>
          <ArrowUp size={12} /> {high} high
        </span>
      )}
      {overdue > 0 && (
        <span className="flex items-center gap-1 text-xs font-medium" style={{ color: '#ef4444' }}>
          <AlertTriangle size={12} /> {overdue} overdue
        </span>
      )}
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{total} active issues</span>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────
export default function RoadmapPage() {
  const [data, setData] = useState<RoadmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState<Zoom>('month');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [projectOrder, setProjectOrder] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{ iniId: string; srcIdx: number } | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/linear/roadmap')
      .then(r => r.json())
      .then(d => {
        if (d.error) {
          setError(d.error);
        } else {
          setData(d);
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to load roadmap');
        setLoading(false);
      });
  }, []);

  const toggleExpand = useCallback((key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const range = useMemo(() => getZoomRange(zoom), [zoom]);
  const ticks = useMemo(() => generateTicks(zoom, range.start, range.end), [zoom, range]);
  const totalMs = new Date(range.end).getTime() - new Date(range.start).getTime();
  const todayPct = Math.max(0, Math.min(100, ((Date.now() - new Date(range.start).getTime()) / totalMs) * 100));
  const today = fmt(new Date());

  const isOverdue = (end: string | null, status: string) => !!end && end < today && !DONE_STATES.has(status);
  const isActive = (status: string) => !DONE_STATES.has(status);

  // Drag-and-drop helpers for project reordering
  const getOrderedProjects = useCallback((iniId: string, projects: Project[]) => {
    const order = projectOrder[iniId];
    if (!order) return projects;
    const byId = new Map(projects.map(p => [p.id, p]));
    const ordered = order.filter(id => byId.has(id)).map(id => byId.get(id)!);
    const seen = new Set(order);
    for (const p of projects) if (!seen.has(p.id)) ordered.push(p);
    return ordered;
  }, [projectOrder]);

  const handleDragStart = useCallback((iniId: string, idx: number) => {
    setDragState({ iniId, srcIdx: idx });
  }, []);

  const handleDrop = useCallback((iniId: string, dropIdx: number) => {
    if (!dragState || dragState.iniId !== iniId || dragState.srcIdx === dropIdx) {
      setDragState(null);
      setDragOverIdx(null);
      return;
    }
    setProjectOrder(prev => {
      const ini = data?.initiatives.find(i => i.id === iniId);
      if (!ini) return prev;
      const activeProjects = ini.projects.filter(p => !DONE_STATES.has(p.status));
      const current = prev[iniId] || activeProjects.map(p => p.id);
      const newOrder = [...current];
      const [moved] = newOrder.splice(dragState.srcIdx, 1);
      newOrder.splice(dropIdx, 0, moved);
      return { ...prev, [iniId]: newOrder };
    });
    setDragState(null);
    setDragOverIdx(null);
  }, [dragState, data]);

  // Render initiative tree rows
  function renderInitiative(ini: Initiative) {
    if (DONE_STATES.has(ini.status)) return null;
    const iniKey = `ini_${ini.id}`;
    const iniExp = expanded[iniKey] !== undefined ? expanded[iniKey] : true;
    const rawActiveProjects = ini.projects.filter(p => !DONE_STATES.has(p.status));
    if (rawActiveProjects.length === 0) return null;
    const activeProjects = getOrderedProjects(ini.id, rawActiveProjects);

    const rows: React.ReactNode[] = [];

    // Initiative row
    rows.push(
      <GanttRow
        key={iniKey}
        indent={0}
        label={ini.name}
        status={ini.status}
        color={ini.statusColor || sc(ini.status)}
        start={today}
        end={ini.targetDate}
        url={null}
        hasChildren={activeProjects.length > 0}
        isExpanded={iniExp}
        isIni={true}
        onClick={() => toggleExpand(iniKey)}
        assignee={null}
        priority={0}
        overdue={false}
        rangeStart={range.start}
        rangeEnd={range.end}
        todayPct={todayPct}
      />
    );

    if (iniExp) {
      for (let projIdx = 0; projIdx < activeProjects.length; projIdx++) {
        const proj = activeProjects[projIdx];
        const projKey = `proj_${proj.id}`;
        const projExp = expanded[projKey] !== undefined ? expanded[projKey] : false;
        const activeIssues = proj.issues.filter(i => isActive(i.status));
        const topIssues = activeIssues.filter(i => !i.parentId);
        const childMap = new Map<string, Issue[]>();
        for (const i of activeIssues) {
          if (i.parentId) {
            if (!childMap.has(i.parentId)) childMap.set(i.parentId, []);
            childMap.get(i.parentId)!.push(i);
          }
        }

        const projOd = isOverdue(proj.targetDate, proj.status);
        const isDragOver = dragState?.iniId === ini.id && dragOverIdx === projIdx;
        rows.push(
          <div
            key={projKey}
            draggable
            onDragStart={() => handleDragStart(ini.id, projIdx)}
            onDragOver={(e) => { e.preventDefault(); setDragOverIdx(projIdx); }}
            onDragLeave={() => setDragOverIdx(null)}
            onDrop={() => handleDrop(ini.id, projIdx)}
            style={{ borderTop: isDragOver ? '2px solid var(--accent)' : 'none' }}
          >
            <GanttRow
              indent={1}
              label={proj.name}
              status={proj.status}
              color={projOd ? '#ef4444' : (proj.statusColor || sc(proj.status))}
              start={proj.startDate || today}
              end={proj.targetDate}
              url={proj.url}
              hasChildren={topIssues.length > 0}
              isExpanded={projExp}
              isIni={true}
              onClick={() => toggleExpand(projKey)}
              assignee={null}
              priority={0}
              overdue={projOd}
              rangeStart={range.start}
              rangeEnd={range.end}
              todayPct={todayPct}
              dragHandle
            />
          </div>
        );

        if (projExp) {
          // Sort by priority then status
          const sorted = [...topIssues].sort((a, b) => {
            if (a.priority !== b.priority) return a.priority - b.priority;
            return 0;
          });

          for (const iss of sorted) {
            const issOd = isOverdue(iss.end, iss.status);
            const children = childMap.get(iss.id) || [];
            const issKey = `iss_${iss.id}`;
            const issExp = expanded[issKey] !== undefined ? expanded[issKey] : false;

            rows.push(
              <GanttRow
                key={issKey}
                indent={2}
                label={`${iss.identifier} ${iss.title}`}
                status={iss.status}
                color={iss.statusColor || sc(iss.status)}
                start={iss.start || iss.end || proj.startDate}
                end={iss.end || proj.targetDate}
                url={iss.url}
                hasChildren={children.length > 0}
                isExpanded={issExp}
                isIni={false}
                onClick={children.length > 0 ? () => toggleExpand(issKey) : undefined}
                assignee={iss.assignee}
                priority={iss.priority}
                overdue={issOd}
                rangeStart={range.start}
                rangeEnd={range.end}
                todayPct={todayPct}
              />
            );

            if (issExp && children.length) {
              for (const sub of children) {
                const subOd = isOverdue(sub.end, sub.status);
                rows.push(
                  <GanttRow
                    key={`sub_${sub.id}`}
                    indent={3}
                    label={`↳ ${sub.identifier} ${sub.title}`}
                    status={sub.status}
                    color={(sub.statusColor || sc(sub.status)) + 'bb'}
                    start={sub.start || sub.end || iss.end}
                    end={sub.end || iss.end}
                    url={sub.url}
                    hasChildren={false}
                    isExpanded={false}
                    isIni={false}
                    assignee={sub.assignee}
                    priority={sub.priority}
                    overdue={subOd}
                    rangeStart={range.start}
                    rangeEnd={range.end}
                    todayPct={todayPct}
                  />
                );
              }
            }
          }
        }
      }
    }
    return rows;
  }

  if (loading) {
    return (
      <div className="p-6 max-w-full">
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text)' }}>Roadmap</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading from Linear...</p>
        <div className="mt-4 space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="rounded h-8 animate-pulse" style={{ background: 'var(--surface)' }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-full">
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text)' }}>Roadmap</h1>
        <div className="rounded-lg p-6 mt-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <AlertCircle size={20} style={{ color: '#ef4444' }} />
            <p style={{ color: 'var(--text-muted)' }}>Failed to load roadmap data: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data || (!data.initiatives.length && !data.orphanProjects.length)) {
    return (
      <div className="p-6 max-w-full">
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text)' }}>Roadmap</h1>
        <p style={{ color: 'var(--text-muted)' }}>No initiatives or projects found in Linear.</p>
      </div>
    );
  }

  // Split: "Customer and Partner Go Live" → Gantt, everything else → Product panel
  const customerIni = data.initiatives.find(i => i.name === CUSTOMER_INI_NAME);
  const productInis = data.initiatives.filter(i => i.name !== CUSTOMER_INI_NAME && !DONE_STATES.has(i.status));

  // Sort product initiatives by urgency (count of high/urgent issues)
  const sortedProductInis = [...productInis].sort((a, b) => {
    const urgency = (ini: Initiative) => {
      let score = 0;
      for (const p of ini.projects) {
        for (const iss of p.issues) {
          if (DONE_STATES.has(iss.status)) continue;
          if (iss.priority === 1) score += 10;
          else if (iss.priority === 2) score += 5;
          else if (iss.status === 'In Progress' || iss.status === 'Started') score += 3;
        }
      }
      return score;
    };
    return urgency(b) - urgency(a);
  });

  // Gantt-only data: just the customer initiative
  const ganttData: RoadmapData = {
    initiatives: customerIni ? [customerIni] : [],
    orphanProjects: data.orphanProjects,
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 shrink-0" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Roadmap</h1>
        </div>
        <div className="flex items-center gap-1">
          {(['week', 'month', 'quarter'] as Zoom[]).map(z => (
            <button
              key={z}
              onClick={() => setZoom(z)}
              className="px-3 py-1 text-xs font-medium rounded transition-colors"
              style={{
                background: zoom === z ? 'var(--accent)' : 'var(--bg)',
                color: zoom === z ? '#fff' : 'var(--text-muted)',
                border: `1px solid ${zoom === z ? 'var(--accent)' : 'var(--border)'}`,
              }}
            >
              {z.charAt(0).toUpperCase() + z.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {/* ═══ GANTT: Customer & Partner Go Live ═══ */}
        {customerIni && (
          <>
            <AlertBar data={ganttData} />

            {/* Timeline header */}
            <div className="flex shrink-0" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
              <div style={{ width: '380px', minWidth: '380px' }} className="px-3 py-1">
                <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>Customer Go-Live</span>
              </div>
              <div className="flex-1 relative" style={{ height: '28px', borderLeft: '1px solid var(--border)' }}>
                {ticks.map((t, i) => (
                  <div key={i} className="absolute top-0 bottom-0" style={{ left: `${t.pct}%`, borderLeft: `1px solid ${t.major ? 'var(--border2, var(--border))' : 'var(--border)'}` }}>
                    <span className="absolute top-1 text-[9px] whitespace-nowrap pl-1" style={{ color: t.major ? 'var(--text-muted)' : 'var(--text-dim, var(--text-muted))', fontWeight: t.major ? 600 : 400 }}>
                      {t.label}
                    </span>
                  </div>
                ))}
                <div className="absolute top-0 bottom-0 w-px" style={{ left: `${todayPct}%`, background: '#ef4444', zIndex: 5 }}>
                  <span className="absolute -top-0 text-[8px] px-1 rounded" style={{ background: '#ef4444', color: '#fff', transform: 'translateX(-50%)' }}>today</span>
                </div>
              </div>
            </div>

            {/* Gantt rows — customer initiative only */}
            <div>
              {renderInitiative(customerIni)}
            </div>

            {/* Orphan projects */}
            {data.orphanProjects.length > 0 && (
              <>
                <SectionHeader title="Other Projects" subtitle="not in any initiative" />
                {data.orphanProjects.filter(p => !DONE_STATES.has(p.status)).map(proj => {
                  const projKey = `oproj_${proj.id}`;
                  const projExp = expanded[projKey] !== undefined ? expanded[projKey] : false;
                  const activeIssues = proj.issues.filter(i => isActive(i.status));
                  const topIssues = activeIssues.filter(i => !i.parentId);
                  const projOd = isOverdue(proj.targetDate, proj.status);
                  return (
                    <div key={proj.id}>
                      <GanttRow indent={0} label={proj.name} status={proj.status}
                        color={projOd ? '#ef4444' : (proj.statusColor || sc(proj.status))}
                        start={proj.startDate || today} end={proj.targetDate} url={proj.url}
                        hasChildren={topIssues.length > 0} isExpanded={projExp} isIni={true}
                        onClick={() => toggleExpand(projKey)} assignee={null} priority={0} overdue={projOd}
                        rangeStart={range.start} rangeEnd={range.end} todayPct={todayPct} />
                      {projExp && topIssues.sort((a, b) => a.priority - b.priority).map(iss => {
                        const issOd = isOverdue(iss.end, iss.status);
                        return (
                          <GanttRow key={iss.id} indent={1} label={`${iss.identifier} ${iss.title}`}
                            status={iss.status} color={iss.statusColor || sc(iss.status)}
                            start={iss.start || iss.end || proj.startDate} end={iss.end || proj.targetDate}
                            url={iss.url} hasChildren={false} isExpanded={false} isIni={false}
                            assignee={iss.assignee} priority={iss.priority} overdue={issOd}
                            rangeStart={range.start} rangeEnd={range.end} todayPct={todayPct} />
                        );
                      })}
                    </div>
                  );
                })}
              </>
            )}

            {/* Legend */}
            <div className="flex items-center gap-4 px-4 py-3" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
              {Object.entries(STATUS_COLORS).filter(([k]) => !['Cancelled', 'Canceled', 'Completed', 'Done', 'Duplicate'].includes(k)).map(([status, color]) => (
                <div key={status} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{status}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ═══ PRODUCT INITIATIVES PANEL ═══ */}
        {sortedProductInis.length > 0 && (
          <div style={{ borderTop: '2px solid var(--border)' }}>
            <div className="px-5 py-3" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
              <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--text)' }}>Product Initiatives</h2>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Sorted by urgency — click to expand projects & issues</p>
            </div>

            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {sortedProductInis.map(ini => {
                const iniKey = `pini_${ini.id}`;
                const iniExp = expanded[iniKey] !== undefined ? expanded[iniKey] : false;
                const activeProjects = ini.projects.filter(p => !DONE_STATES.has(p.status));
                const totalActive = activeProjects.reduce((sum, p) => sum + p.issues.filter(i => !DONE_STATES.has(i.status)).length, 0);
                const urgentCount = activeProjects.reduce((sum, p) => sum + p.issues.filter(i => !DONE_STATES.has(i.status) && i.priority <= 2).length, 0);
                const inProgressCount = activeProjects.reduce((sum, p) => sum + p.issues.filter(i => i.status === 'In Progress' || i.status === 'Started').length, 0);

                return (
                  <div key={ini.id} style={{ borderColor: 'var(--border)' }}>
                    {/* Initiative header */}
                    <div
                      className="flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors hover:brightness-110"
                      style={{ background: iniExp ? 'var(--surface)' : 'var(--bg)' }}
                      onClick={() => toggleExpand(iniKey)}
                    >
                      {iniExp ? <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} /> : <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />}
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ background: ini.statusColor || '#6366f1' }} />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{ini.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {urgentCount > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: '#ef444422', color: '#ef4444' }}>
                            {urgentCount} urgent/high
                          </span>
                        )}
                        {inProgressCount > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: '#f59e0b22', color: '#f59e0b' }}>
                            {inProgressCount} in progress
                          </span>
                        )}
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--surface)', color: 'var(--text-muted)' }}>
                          {activeProjects.length} projects · {totalActive} issues
                        </span>
                      </div>
                    </div>

                    {/* Expanded: projects + issues */}
                    {iniExp && (
                      <div className="pb-2" style={{ background: 'var(--bg)' }}>
                        {activeProjects.map(proj => {
                          const projKey = `ppj_${proj.id}`;
                          const projExp = expanded[projKey] !== undefined ? expanded[projKey] : false;
                          const activeIssues = proj.issues.filter(i => !DONE_STATES.has(i.status));
                          // Sort: In Progress/Started first, then by priority, then by status
                          const sortedIssues = [...activeIssues].sort((a, b) => {
                            const aInProg = (a.status === 'In Progress' || a.status === 'Started') ? 0 : 1;
                            const bInProg = (b.status === 'In Progress' || b.status === 'Started') ? 0 : 1;
                            if (aInProg !== bInProg) return aInProg - bInProg;
                            if (a.priority !== b.priority) return a.priority - b.priority;
                            return statusSort(a.status, b.status);
                          });

                          return (
                            <div key={proj.id} className="mx-4 mt-2 rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                              {/* Project header */}
                              <div
                                className="flex items-center gap-2 px-4 py-2.5 cursor-pointer"
                                style={{ background: 'var(--surface)' }}
                                onClick={() => toggleExpand(projKey)}
                              >
                                {projExp ? <ChevronDown size={12} style={{ color: 'var(--text-muted)' }} /> : <ChevronRight size={12} style={{ color: 'var(--text-muted)' }} />}
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: proj.statusColor || sc(proj.status) }} />
                                <a href={proj.url} target="_blank" rel="noopener" className="text-xs font-medium hover:underline flex-1 truncate"
                                  style={{ color: 'var(--text)' }} onClick={e => e.stopPropagation()}>
                                  {proj.name}
                                </a>
                                <span className="text-[10px] px-1.5 py-0.5 rounded shrink-0" style={{ background: sc(proj.status) + '22', color: sc(proj.status) }}>
                                  {proj.status}
                                </span>
                                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{activeIssues.length} issues</span>
                              </div>

                              {/* Issues list */}
                              {projExp && sortedIssues.length > 0 && (
                                <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                                  {sortedIssues.map(iss => {
                                    const prioMeta = PRIO_LABELS[iss.priority];
                                    const issOd = iss.end && iss.end < today && !DONE_STATES.has(iss.status);
                                    return (
                                      <div key={iss.id} className="flex items-center gap-2 px-4 py-2" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
                                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: iss.statusColor || sc(iss.status) }} />
                                        <a href={iss.url} target="_blank" rel="noopener"
                                          className="text-xs hover:underline flex-1 min-w-0 truncate"
                                          style={{ color: 'var(--text)' }}>
                                          <span style={{ color: 'var(--text-muted)' }}>{iss.identifier}</span> {iss.title}
                                        </a>
                                        {prioMeta && (
                                          <span className="text-[9px] px-1 py-0.5 rounded font-bold shrink-0"
                                            style={{ background: prioMeta.color + '22', color: prioMeta.color }}>
                                            {prioMeta.label}
                                          </span>
                                        )}
                                        {issOd && (
                                          <span className="text-[9px] px-1 py-0.5 rounded font-bold shrink-0"
                                            style={{ background: '#ef444422', color: '#ef4444' }}>OVERDUE</span>
                                        )}
                                        <span className="text-[9px] px-1.5 py-0.5 rounded shrink-0"
                                          style={{ background: sc(iss.status) + '22', color: sc(iss.status) }}>
                                          {iss.status}
                                        </span>
                                        {iss.assignee && (
                                          <span className="text-[10px] shrink-0 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                                            <User size={10} /> {iss.assignee.split(' ')[0]}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
