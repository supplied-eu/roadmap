'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { BarChart3, TrendingUp, CheckCircle, Clock, Mail, Target, Users, Activity, DollarSign, Circle } from 'lucide-react';

type KPIData = {
  linear: {
    totalOpen: number; urgent: number; high: number; completed7d: number;
    byProject: { name: string; count: number }[];
    byStatus: { name: string; count: number; color: string }[];
    byAssignee: { name: string; count: number }[];
  };
  hubspot: {
    totalDeals: number; openDeals: number; openPipeline: number;
    closedWon: number; closedWonCount: number; closedLost: number; winRate: number;
    avgDealSize: number;
    byStage: { name: string; count: number; value: number; color: string }[];
  };
  google: { eventsToday: number; unreadEmails: number };
  health: { green: number; amber: number; red: number; total: number };
};

const STAGE_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6', '#818cf8'];
const healthColors = { green: '#22c55e', amber: '#f59e0b', red: '#ef4444' };

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
}

export default function KpisPage() {
  const { user } = useUser();
  const [data, setData] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;

    const fetchAll = async () => {
      try {
        const [linearRes, hubspotRes, googleRes, companiesRes] = await Promise.all([
          fetch('/api/linear').then(r => r.json()).catch(() => ({ issues: [] })),
          fetch('/api/hubspot').then(r => r.json()).catch(() => ({ deals: [], pipelines: [] })),
          fetch(`/api/google?user=${user.name?.split(' ')[0]?.toLowerCase() || 'johann'}`)
            .then(r => r.json()).catch(() => ({ calendar: [], emails: [] })),
          fetch('/api/hubspot/companies').then(r => r.json()).catch(() => ({ companies: [] })),
        ]);

        const issues = linearRes.issues || [];
        const projectCounts = new Map<string, number>();
        const statusCounts = new Map<string, { count: number; color: string }>();
        const assigneeCounts = new Map<string, number>();
        for (const issue of issues) {
          const proj = issue.project || 'No Project';
          projectCounts.set(proj, (projectCounts.get(proj) || 0) + 1);
          const status = issue.status || 'Unknown';
          const existing = statusCounts.get(status) || { count: 0, color: issue.statusColor || '#94a3b8' };
          statusCounts.set(status, { count: existing.count + 1, color: existing.color });
          const assignee = issue.assignee || 'Unassigned';
          assigneeCounts.set(assignee, (assigneeCounts.get(assignee) || 0) + 1);
        }

        const linear = {
          totalOpen: issues.length,
          urgent: issues.filter((i: any) => i.priority === 1).length,
          high: issues.filter((i: any) => i.priority === 2).length,
          completed7d: 0,
          byProject: [...projectCounts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
          byStatus: [...statusCounts.entries()].map(([name, { count, color }]) => ({ name, count, color })).sort((a, b) => b.count - a.count),
          byAssignee: [...assigneeCounts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
        };

        const deals = hubspotRes.deals || [];
        const pipelines = hubspotRes.pipelines || [];
        const openDeals = deals.filter((d: any) => d.stage !== 'closedwon' && d.stage !== 'closedlost' && !d.stageLabel?.toLowerCase().includes('closed'));
        const wonDeals = deals.filter((d: any) => d.stage === 'closedwon' || d.stageLabel?.toLowerCase().includes('closed won'));
        const lostDeals = deals.filter((d: any) => d.stage === 'closedlost' || d.stageLabel?.toLowerCase().includes('closed lost'));
        const totalPipeline = openDeals.reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
        const totalWon = wonDeals.reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
        const wr = wonDeals.length + lostDeals.length > 0
          ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100) : 0;

        // Build stage breakdown
        const stageMap = new Map<string, { count: number; value: number }>();
        const stageLabels: Record<string, string> = {};
        for (const p of pipelines) for (const s of (p as any).stages || []) stageLabels[s.id] = s.label;
        for (const d of openDeals) {
          const key = d.stageLabel || d.stage;
          const ex = stageMap.get(key) || { count: 0, value: 0 };
          stageMap.set(key, { count: ex.count + 1, value: ex.value + (d.amount || 0) });
        }

        const hubspot = {
          totalDeals: deals.length, openDeals: openDeals.length, openPipeline: totalPipeline,
          closedWon: totalWon, closedWonCount: wonDeals.length, closedLost: lostDeals.length, winRate: wr,
          avgDealSize: openDeals.length > 0 ? Math.round(totalPipeline / openDeals.length) : 0,
          byStage: [...stageMap.entries()].map(([name, { count, value }], i) => ({
            name, count, value, color: STAGE_COLORS[i % STAGE_COLORS.length],
          })),
        };

        const todayEvents = (googleRes.calendar || []).filter((e: any) => e.isToday);
        const unread = (googleRes.emails || []).filter((e: any) => e.unread).length;
        const google = { eventsToday: todayEvents.length, unreadEmails: unread };

        // Health distribution
        const companies = companiesRes.companies || [];
        const health = { green: 0, amber: 0, red: 0, total: companies.length };
        for (const c of companies) {
          if (!c.lastActivity) { health.red++; continue; }
          const daysSince = (Date.now() - new Date(c.lastActivity).getTime()) / 86400000;
          if (daysSince > 30) health.red++;
          else if (daysSince > 14) health.amber++;
          else health.green++;
        }

        setData({ linear, hubspot, google, health });
      } catch (err) {
        console.error('KPI fetch error:', err);
      }
      setLoading(false);
    };

    fetchAll();
  }, [user]);

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-lg font-bold" style={{ color: 'var(--text)' }}>KPIs</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Loading metrics...</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="rounded-lg p-5 animate-pulse" style={{ background: 'var(--surface)', height: '100px' }} />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-lg font-bold mb-4" style={{ color: 'var(--text)' }}>KPIs</h1>
        <p style={{ color: 'var(--text-muted)' }}>Failed to load metrics.</p>
      </div>
    );
  }

  const maxProjectCount = Math.max(...data.linear.byProject.map(p => p.count), 1);
  const maxStatusCount = Math.max(...data.linear.byStatus.map(s => s.count), 1);
  const maxAssigneeCount = Math.max(...data.linear.byAssignee.map(a => a.count), 1);
  const maxStageCount = Math.max(...data.hubspot.byStage.map(s => s.count), 1);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-5">
        <h1 className="text-lg font-bold" style={{ color: 'var(--text)' }}>KPIs</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Cross-system performance metrics</p>
      </div>

      {/* Top stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Open Tasks" value={data.linear.totalOpen} icon={Target} color="var(--accent)" subtitle={`${data.linear.urgent} urgent · ${data.linear.high} high`} />
        <StatCard label="Open Pipeline" value={formatCurrency(data.hubspot.openPipeline)} icon={TrendingUp} color="#818cf8" subtitle={`${data.hubspot.openDeals} deals · avg ${formatCurrency(data.hubspot.avgDealSize)}`} />
        <StatCard label="Revenue Won" value={formatCurrency(data.hubspot.closedWon)} icon={CheckCircle} color="#22c55e" subtitle={`${data.hubspot.winRate}% win rate · ${data.hubspot.closedWonCount} deals`} />
        <StatCard label="Unread Emails" value={data.google.unreadEmails} icon={Mail} color="#f59e0b" subtitle={`${data.google.eventsToday} meetings today`} />
      </div>

      {/* Customer Health + Sales Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Customer Health Distribution */}
        <div className="rounded-lg p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} style={{ color: 'var(--accent)' }} />
            <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Customer Health</h3>
          </div>
          <div className="flex items-center gap-6 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{data.health.total}</div>
              <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Total</div>
            </div>
            <div className="flex-1 flex items-center gap-1" style={{ height: '32px' }}>
              {data.health.green > 0 && (
                <div className="rounded-sm h-full transition-all" style={{
                  width: `${(data.health.green / data.health.total) * 100}%`,
                  background: healthColors.green, minWidth: '20px',
                }} />
              )}
              {data.health.amber > 0 && (
                <div className="rounded-sm h-full transition-all" style={{
                  width: `${(data.health.amber / data.health.total) * 100}%`,
                  background: healthColors.amber, minWidth: '20px',
                }} />
              )}
              {data.health.red > 0 && (
                <div className="rounded-sm h-full transition-all" style={{
                  width: `${(data.health.red / data.health.total) * 100}%`,
                  background: healthColors.red, minWidth: '20px',
                }} />
              )}
            </div>
          </div>
          <div className="flex items-center gap-6">
            <HealthStat label="Healthy" count={data.health.green} color={healthColors.green} />
            <HealthStat label="At Risk" count={data.health.amber} color={healthColors.amber} />
            <HealthStat label="Needs Attention" count={data.health.red} color={healthColors.red} />
          </div>
        </div>

        {/* Pipeline by Stage */}
        <div className="rounded-lg p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-4">
            <DollarSign size={16} style={{ color: '#818cf8' }} />
            <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Pipeline by Stage</h3>
          </div>
          {data.hubspot.byStage.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No pipeline data.</p>
          ) : (
            <div className="space-y-2.5">
              {data.hubspot.byStage.map(stage => (
                <div key={stage.name} className="flex items-center gap-3">
                  <span className="text-xs w-28 truncate" style={{ color: 'var(--text)' }}>{stage.name}</span>
                  <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--bg)' }}>
                    <div className="h-2 rounded-full transition-all" style={{
                      width: `${Math.max((stage.count / maxStageCount) * 100, 8)}%`,
                      background: stage.color,
                    }} />
                  </div>
                  <span className="text-xs font-medium w-6 text-right" style={{ color: 'var(--text-muted)' }}>{stage.count}</span>
                  <span className="text-xs w-20 text-right font-medium" style={{ color: stage.color }}>{formatCurrency(stage.value)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-4 mt-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="flex items-center gap-1.5">
              <Circle size={8} fill="#22c55e" stroke="#22c55e" />
              <span className="text-xs" style={{ color: '#22c55e' }}>Won: {data.hubspot.closedWonCount} ({formatCurrency(data.hubspot.closedWon)})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Circle size={8} fill="#ef4444" stroke="#ef4444" />
              <span className="text-xs" style={{ color: '#ef4444' }}>Lost: {data.hubspot.closedLost}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tasks by Project + Tasks by Status + Team Velocity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <div className="rounded-lg p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} style={{ color: 'var(--accent)' }} />
            <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Tasks by Project</h3>
          </div>
          {data.linear.byProject.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No tasks.</p>
          ) : (
            <div className="space-y-2.5">
              {data.linear.byProject.slice(0, 8).map(proj => (
                <ProgressBar key={proj.name} label={proj.name} value={proj.count} max={maxProjectCount} color="var(--accent)" />
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Clock size={16} style={{ color: 'var(--accent)' }} />
            <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Tasks by Status</h3>
          </div>
          {data.linear.byStatus.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No tasks.</p>
          ) : (
            <div className="space-y-2.5">
              {data.linear.byStatus.map(status => (
                <ProgressBar key={status.name} label={status.name} value={status.count} max={maxStatusCount} color={status.color} />
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} style={{ color: '#f59e0b' }} />
            <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Team Workload</h3>
          </div>
          {data.linear.byAssignee.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No data.</p>
          ) : (
            <div className="space-y-2.5">
              {data.linear.byAssignee.slice(0, 8).map((a, i) => (
                <ProgressBar key={a.name} label={a.name} value={a.count} max={maxAssigneeCount}
                  color={STAGE_COLORS[i % STAGE_COLORS.length]} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sales Summary */}
      <div className="rounded-lg p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} style={{ color: '#818cf8' }} />
          <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Sales Summary</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryBox label="Total Deals" value={data.hubspot.totalDeals} color="#818cf8" />
          <SummaryBox label="Open Deals" value={data.hubspot.openDeals} color="var(--accent)" />
          <SummaryBox label="Win Rate" value={`${data.hubspot.winRate}%`} color="#22c55e" />
          <SummaryBox label="Lost Deals" value={data.hubspot.closedLost} color="#ef4444" />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, subtitle }: {
  label: string; value: string | number; icon: any; color: string; subtitle?: string;
}) {
  return (
    <div className="rounded-lg p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</span>
        <Icon size={14} style={{ color }} />
      </div>
      <div className="text-xl font-bold" style={{ color }}>{value}</div>
      {subtitle && <div className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{subtitle}</div>}
    </div>
  );
}

function ProgressBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs w-28 truncate" style={{ color: 'var(--text)' }}>{label}</span>
      <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--bg)' }}>
        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-medium w-6 text-right" style={{ color: 'var(--text-muted)' }}>{value}</span>
    </div>
  );
}

function HealthStat({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Circle size={8} fill={color} stroke={color} />
      <span className="text-xs font-medium" style={{ color }}>{count}</span>
      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{label}</span>
    </div>
  );
}

function SummaryBox({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-md p-3 text-center" style={{ background: 'var(--bg)' }}>
      <div className="text-xl font-bold" style={{ color }}>{value}</div>
      <div className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
    </div>
  );
}
