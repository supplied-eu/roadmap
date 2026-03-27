'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { BarChart3, TrendingUp, CheckCircle, Clock, Users, Mail, Calendar, Target } from 'lucide-react';

type KPIData = {
  linear: {
    totalOpen: number;
    urgent: number;
    high: number;
    completed7d: number;
    byProject: { name: string; count: number }[];
    byStatus: { name: string; count: number; color: string }[];
  };
  hubspot: {
    totalDeals: number;
    openPipeline: number;
    closedWon: number;
    closedLost: number;
    winRate: number;
  };
  google: {
    eventsToday: number;
    unreadEmails: number;
  };
};

function StatCard({ label, value, icon: Icon, color, subtitle }: {
  label: string; value: string | number; icon: any; color: string; subtitle?: string;
}) {
  return (
    <div className="rounded-lg p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</span>
        <Icon size={14} style={{ color }} />
      </div>
      <div className="text-2xl font-bold" style={{ color }}>{value}</div>
      {subtitle && <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{subtitle}</div>}
    </div>
  );
}

function ProgressBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm w-36 truncate" style={{ color: 'var(--text)' }}>{label}</span>
      <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--bg)' }}>
        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-sm font-medium w-8 text-right" style={{ color: 'var(--text-muted)' }}>{value}</span>
    </div>
  );
}

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
        const [linearRes, hubspotRes, googleRes] = await Promise.all([
          fetch('/api/linear').then(r => r.json()).catch(() => ({ issues: [] })),
          fetch('/api/hubspot').then(r => r.json()).catch(() => ({ deals: [] })),
          fetch(`/api/google?user=${user.name?.split(' ')[0]?.toLowerCase() || 'johann'}`)
            .then(r => r.json()).catch(() => ({ calendar: [], emails: [] })),
        ]);

        // Process Linear data
        const issues = linearRes.issues || [];
        const projectCounts = new Map<string, number>();
        const statusCounts = new Map<string, { count: number; color: string }>();
        for (const issue of issues) {
          const proj = issue.project || 'No Project';
          projectCounts.set(proj, (projectCounts.get(proj) || 0) + 1);
          const status = issue.status || 'Unknown';
          const existing = statusCounts.get(status) || { count: 0, color: issue.statusColor || '#94a3b8' };
          statusCounts.set(status, { count: existing.count + 1, color: existing.color });
        }

        const linear = {
          totalOpen: issues.length,
          urgent: issues.filter((i: any) => i.priority === 1).length,
          high: issues.filter((i: any) => i.priority === 2).length,
          completed7d: 0, // Would need separate query for completed issues
          byProject: [...projectCounts.entries()]
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count),
          byStatus: [...statusCounts.entries()]
            .map(([name, { count, color }]) => ({ name, count, color }))
            .sort((a, b) => b.count - a.count),
        };

        // Process HubSpot data
        const deals = hubspotRes.deals || [];
        const openDeals = deals.filter((d: any) => d.stage !== 'closedwon' && d.stage !== 'closedlost');
        const wonDeals = deals.filter((d: any) => d.stage === 'closedwon');
        const lostDeals = deals.filter((d: any) => d.stage === 'closedlost');
        const hubspot = {
          totalDeals: deals.length,
          openPipeline: openDeals.reduce((sum: number, d: any) => sum + (d.amount || 0), 0),
          closedWon: wonDeals.reduce((sum: number, d: any) => sum + (d.amount || 0), 0),
          closedLost: lostDeals.length,
          winRate: wonDeals.length + lostDeals.length > 0
            ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100)
            : 0,
        };

        // Process Google data
        const todayStr = new Date().toISOString().split('T')[0];
        const todayEvents = (googleRes.calendar || []).filter((e: any) => e.isToday);
        const unread = (googleRes.emails || []).filter((e: any) => e.unread).length;
        const google = {
          eventsToday: todayEvents.length,
          unreadEmails: unread,
        };

        setData({ linear, hubspot, google });
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
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>KPIs</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Loading metrics...</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
        <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--text)' }}>KPIs</h1>
        <p style={{ color: 'var(--text-muted)' }}>Failed to load metrics.</p>
      </div>
    );
  }

  const maxProjectCount = Math.max(...data.linear.byProject.map(p => p.count), 1);
  const maxStatusCount = Math.max(...data.linear.byStatus.map(s => s.count), 1);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>KPIs</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Key performance indicators across all systems
        </p>
      </div>

      {/* Top stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Open Tasks" value={data.linear.totalOpen} icon={Target} color="var(--accent)" subtitle={`${data.linear.urgent} urgent, ${data.linear.high} high`} />
        <StatCard label="Open Pipeline" value={formatCurrency(data.hubspot.openPipeline)} icon={TrendingUp} color="#818cf8" subtitle={`${data.hubspot.totalDeals} total deals`} />
        <StatCard label="Revenue Won" value={formatCurrency(data.hubspot.closedWon)} icon={CheckCircle} color="#22c55e" subtitle={`${data.hubspot.winRate}% win rate`} />
        <StatCard label="Unread Emails" value={data.google.unreadEmails} icon={Mail} color="#f59e0b" subtitle={`${data.google.eventsToday} meetings today`} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Tasks by project */}
        <div className="rounded-lg p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} style={{ color: 'var(--accent)' }} />
            <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Tasks by Project
            </h3>
          </div>
          {data.linear.byProject.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No tasks found.</p>
          ) : (
            <div className="space-y-3">
              {data.linear.byProject.slice(0, 8).map(proj => (
                <ProgressBar
                  key={proj.name}
                  label={proj.name}
                  value={proj.count}
                  max={maxProjectCount}
                  color="var(--accent)"
                />
              ))}
            </div>
          )}
        </div>

        {/* Tasks by status */}
        <div className="rounded-lg p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Clock size={16} style={{ color: 'var(--accent)' }} />
            <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Tasks by Status
            </h3>
          </div>
          {data.linear.byStatus.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No tasks found.</p>
          ) : (
            <div className="space-y-3">
              {data.linear.byStatus.map(status => (
                <ProgressBar
                  key={status.name}
                  label={status.name}
                  value={status.count}
                  max={maxStatusCount}
                  color={status.color}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sales funnel */}
      <div className="rounded-lg p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} style={{ color: '#818cf8' }} />
          <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Sales Summary
          </h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-md p-4 text-center" style={{ background: 'var(--bg)' }}>
            <div className="text-2xl font-bold" style={{ color: '#818cf8' }}>{data.hubspot.totalDeals}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Total Deals</div>
          </div>
          <div className="rounded-md p-4 text-center" style={{ background: 'var(--bg)' }}>
            <div className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>
              {data.hubspot.totalDeals - data.hubspot.closedLost - Math.round(data.hubspot.closedWon > 0 ? 1 : 0)}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Open Deals</div>
          </div>
          <div className="rounded-md p-4 text-center" style={{ background: 'var(--bg)' }}>
            <div className="text-2xl font-bold" style={{ color: '#22c55e' }}>{data.hubspot.winRate}%</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Win Rate</div>
          </div>
          <div className="rounded-md p-4 text-center" style={{ background: 'var(--bg)' }}>
            <div className="text-2xl font-bold" style={{ color: '#ef4444' }}>{data.hubspot.closedLost}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Lost Deals</div>
          </div>
        </div>
      </div>
    </div>
  );
}
