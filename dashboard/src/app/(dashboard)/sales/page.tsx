'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, DollarSign, Clock, CheckCircle, AlertCircle, AlertTriangle, ExternalLink, User, Calendar, CheckSquare, Phone, Mail, X, Globe, ArrowUpRight, ArrowDownRight, Eye } from 'lucide-react';

type Deal = {
  id: string; name: string; stage: string; stageLabel: string;
  amount: number | null; closeDate: string | null; ownerName: string | null;
  ownerId: string | null; pipeline: string;
};
type HsTask = {
  id: string; subject: string; status: string; priority: string;
  dueDate: string | null; ownerId: string | null; ownerName: string | null;
  type: string;
};
type Owner = { id: string; name: string };
type Pipeline = { id: string; label: string; stages: { id: string; label: string; displayOrder: number }[] };

type TrafficSource = {
  key: string; label: string; icon: string;
  thisWeek: number; lastWeek: number;
  companies: { name: string; website: string | null; visits: number; lastVisit: string; leadId: string; source: string }[];
};
type LifecycleStage = { key: string; label: string; count: number };
type HsTrafficSource = { key: string; label: string; icon: string; thisWeek: number; lastWeek: number };
type LeadfeederData = {
  available: boolean; thisWeekTotal: number; lastWeekTotal: number;
  trafficSources: TrafficSource[];
  topCompanies: { name: string; visits: number; pageViews: number; firstVisit: string; lastVisit: string; source: string; leadId: string }[];
  dailyVisits: { date: string; visits: number }[];
  contactLifecycle: LifecycleStage[];
  hsTrafficSources: HsTrafficSource[];
};

const STAGE_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6', '#818cf8', '#f472b6'];
const CLOSED_WON_COLOR = '#22c55e';

function stageColor(label: string, idx: number) {
  if (label.toLowerCase().includes('won')) return CLOSED_WON_COLOR;
  if (label.toLowerCase().includes('lost')) return '#ef4444';
  return STAGE_COLORS[idx % STAGE_COLORS.length];
}

function formatCurrency(amount: number | null) {
  if (!amount) return '—';
  return new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function todayStr() { return new Date().toISOString().split('T')[0]; }

function isOverdue(dueDate: string | null) {
  if (!dueDate) return false;
  return dueDate.split('T')[0] < todayStr();
}

function isDueToday(dueDate: string | null) {
  if (!dueDate) return false;
  return dueDate.split('T')[0] === todayStr();
}

function isClosedStage(stageId: string, label: string) {
  return stageId === 'closedwon' || stageId === 'closedlost' ||
    label.toLowerCase().includes('closed won') || label.toLowerCase().includes('closed lost');
}

function taskIcon(type: string) {
  if (type === 'CALL') return <Phone size={12} />;
  if (type === 'EMAIL') return <Mail size={12} />;
  return <CheckSquare size={12} />;
}

const SOURCE_COLORS: Record<string, string> = {
  DIRECT: '#6366f1', GOOGLE_ADS: '#3b82f6', GOOGLE_ORGANIC: '#22c55e',
  LINKEDIN: '#0077b5', FACEBOOK: '#1877f2', EMAIL: '#ef4444',
  SOCIAL: '#ec4899', REFERRAL: '#f59e0b', ORGANIC: '#10b981', OTHER: '#94a3b8',
};

export default function SalesPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [tasks, setTasks] = useState<HsTask[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPipeline, setSelectedPipeline] = useState<string | null>(null);
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [alertFilter, setAlertFilter] = useState<string | null>(null);
  const [leadfeeder, setLeadfeeder] = useState<LeadfeederData | null>(null);
  const [expandedSource, setExpandedSource] = useState<string | null>(null);

  useEffect(() => {
    // Fetch HubSpot + Leadfeeder in parallel
    Promise.all([
      fetch('/api/hubspot').then(r => r.json()),
      fetch('/api/leadfeeder').then(r => r.json()).catch(() => null),
    ]).then(([hsData, lfData]) => {
      if (hsData.error) { setError(hsData.error); }
      else {
        setDeals(hsData.deals || []);
        setTasks(hsData.tasks || []);
        setOwners(hsData.owners || []);
        setPipelines(hsData.pipelines || []);
        const pipelineCounts: Record<string, number> = {};
        for (const d of hsData.deals || []) pipelineCounts[d.pipeline] = (pipelineCounts[d.pipeline] || 0) + 1;
        const top = Object.entries(pipelineCounts).sort((a, b) => b[1] - a[1])[0];
        if (top) setSelectedPipeline(top[0]);
      }
      if (lfData?.available) setLeadfeeder(lfData);
      setLoading(false);
    }).catch(err => { setError(err.message); setLoading(false); });
  }, []);

  // Filter tasks by owner and exclude completed
  const activeTasks = tasks.filter(t => {
    if (t.status === 'COMPLETED') return false;
    if (ownerFilter !== 'all' && t.ownerId !== ownerFilter) return false;
    return true;
  });

  // Filter deals by owner + pipeline
  const filteredDeals = deals.filter(d => {
    if (selectedPipeline && d.pipeline !== selectedPipeline) return false;
    if (ownerFilter !== 'all' && d.ownerId !== ownerFilter) return false;
    return true;
  });

  // Group tasks by urgency
  const overdueTasks = activeTasks.filter(t => isOverdue(t.dueDate));
  const todayTasks = activeTasks.filter(t => isDueToday(t.dueDate));
  const upcomingTasks = activeTasks.filter(t => !isOverdue(t.dueDate) && !isDueToday(t.dueDate));

  // Apply alert filter
  const getVisibleTasks = () => {
    if (alertFilter === 'overdue') return { overdue: overdueTasks, today: [], upcoming: [] };
    if (alertFilter === 'today') return { overdue: [], today: todayTasks, upcoming: [] };
    return { overdue: overdueTasks, today: todayTasks, upcoming: upcomingTasks };
  };
  const visibleTasks = getVisibleTasks();

  // Deals closing this week
  const now = new Date();
  const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() + 7);
  const closingThisWeek = filteredDeals.filter(d => {
    if (!d.closeDate || isClosedStage(d.stage, d.stageLabel)) return false;
    const cd = new Date(d.closeDate);
    return cd >= now && cd <= weekEnd;
  });

  // Pipeline stats
  const openDeals = filteredDeals.filter(d => !isClosedStage(d.stage, d.stageLabel));
  const wonDeals = filteredDeals.filter(d => d.stage === 'closedwon' || d.stageLabel.toLowerCase().includes('closed won'));
  const lostDeals = filteredDeals.filter(d => d.stage === 'closedlost' || d.stageLabel.toLowerCase().includes('closed lost'));
  const totalPipeline = openDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
  const totalWon = wonDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
  const winRate = wonDeals.length + lostDeals.length > 0
    ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100) : 0;

  // Stage color map
  const currentPipeline = pipelines.find(p => p.id === selectedPipeline);
  const stageColorMap = new Map<string, string>();
  (currentPipeline?.stages || []).forEach((s, i) => stageColorMap.set(s.id, stageColor(s.label, i)));

  if (loading) {
    return (
      <div className="flex h-full">
        <div className="flex-1 p-6">
          <h1 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Sales & Operations</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-lg font-bold mb-4" style={{ color: 'var(--text)' }}>Sales & Operations</h1>
        <div className="rounded-lg p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <AlertCircle size={20} style={{ color: '#ef4444' }} />
            <p style={{ color: 'var(--text-muted)' }}>Failed to load data: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Alert bar */}
      <div className="flex items-center gap-3 px-5 py-2 shrink-0" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        {overdueTasks.length > 0 && (
          <button
            onClick={() => setAlertFilter(alertFilter === 'overdue' ? null : 'overdue')}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded transition-colors"
            style={{
              background: alertFilter === 'overdue' ? '#f59e0b22' : 'transparent',
              color: '#f59e0b',
              border: alertFilter === 'overdue' ? '1px solid #f59e0b44' : '1px solid transparent',
            }}
          >
            <AlertTriangle size={12} /> {overdueTasks.length} OVERDUE TASKS
          </button>
        )}
        {todayTasks.length > 0 && (
          <button
            onClick={() => setAlertFilter(alertFilter === 'today' ? null : 'today')}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded transition-colors"
            style={{
              background: alertFilter === 'today' ? 'var(--accent)22' : 'transparent',
              color: 'var(--accent)',
              border: alertFilter === 'today' ? '1px solid var(--accent)44' : '1px solid transparent',
            }}
          >
            <Clock size={12} /> {todayTasks.length} DUE TODAY
          </button>
        )}
        {closingThisWeek.length > 0 && (
          <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1" style={{ color: '#8b5cf6' }}>
            <DollarSign size={12} /> {closingThisWeek.length} DEALS CLOSING THIS WEEK
          </span>
        )}
        {leadfeeder && (
          <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1" style={{ color: '#10b981' }}>
            <Globe size={12} /> {leadfeeder.thisWeekTotal} WEBSITE VISITORS THIS WEEK
          </span>
        )}
        {alertFilter && (
          <button onClick={() => setAlertFilter(null)} className="flex items-center gap-1 text-[10px] ml-auto"
            style={{ color: 'var(--text-muted)' }}>
            <X size={10} /> CLEAR FILTER
          </button>
        )}
        {overdueTasks.length === 0 && todayTasks.length === 0 && closingThisWeek.length === 0 && (
          <span className="flex items-center gap-1.5 text-xs" style={{ color: '#22c55e' }}>
            <CheckCircle size={12} /> All clear
          </span>
        )}
      </div>

      {/* Three-column layout: Tasks | Pipeline | Leadfeeder */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Tasks list */}
        <div className="flex-1 overflow-auto" style={{ borderRight: '1px solid var(--border)' }}>
          {/* Owner filter strip */}
          <div className="flex items-center gap-1.5 px-5 py-2 overflow-x-auto" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
            <button
              onClick={() => setOwnerFilter('all')}
              className="text-[10px] px-2.5 py-1 rounded shrink-0 font-medium transition-colors"
              style={{
                background: ownerFilter === 'all' ? 'var(--accent)' : 'var(--bg)',
                color: ownerFilter === 'all' ? '#fff' : 'var(--text-muted)',
                border: '1px solid var(--border)',
              }}
            >
              All
            </button>
            {owners.map(o => (
              <button
                key={o.id}
                onClick={() => setOwnerFilter(ownerFilter === o.id ? 'all' : o.id)}
                className="text-[10px] px-2.5 py-1 rounded shrink-0 font-medium transition-colors"
                style={{
                  background: ownerFilter === o.id ? 'var(--accent)' : 'var(--bg)',
                  color: ownerFilter === o.id ? '#fff' : 'var(--text-muted)',
                  border: '1px solid var(--border)',
                }}
              >
                {o.name.split(' ')[0]}
              </button>
            ))}
          </div>

          {/* Task sections */}
          {visibleTasks.overdue.length > 0 && (
            <TaskSection label="OVERDUE" count={visibleTasks.overdue.length} color="#f59e0b" tasks={visibleTasks.overdue} owners={owners} />
          )}
          {visibleTasks.today.length > 0 && (
            <TaskSection label="TODAY" count={visibleTasks.today.length} color="var(--accent)" tasks={visibleTasks.today} owners={owners} />
          )}
          {visibleTasks.upcoming.length > 0 && (
            <TaskSection label="COMING UP" count={visibleTasks.upcoming.length} color="var(--text-muted)" tasks={visibleTasks.upcoming} owners={owners} />
          )}
          {activeTasks.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No tasks found.</p>
            </div>
          )}
        </div>

        {/* Middle: Pipeline */}
        <div className="overflow-auto flex flex-col" style={{ width: '380px', minWidth: '380px', borderRight: '1px solid var(--border)' }}>
          {/* Pipeline header */}
          <div className="flex items-center justify-between px-4 py-2.5 shrink-0" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              PIPELINE
            </span>
            {pipelines.length > 1 && (
              <select
                value={selectedPipeline || ''}
                onChange={e => setSelectedPipeline(e.target.value)}
                className="text-[10px] rounded px-2 py-1"
                style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }}
              >
                {pipelines.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            )}
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-2 gap-2 px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
            <MiniStat label="Open Pipeline" value={formatCurrency(totalPipeline)} sub={`${openDeals.length} deals`} color="var(--accent)" />
            <MiniStat label="Won" value={formatCurrency(totalWon)} sub={`${wonDeals.length} deals`} color={CLOSED_WON_COLOR} />
            <MiniStat label="Win Rate" value={`${winRate}%`} sub={`${wonDeals.length}W / ${lostDeals.length}L`} color="#f59e0b" />
            <MiniStat label="Avg Deal" value={openDeals.length > 0 ? formatCurrency(Math.round(totalPipeline / openDeals.length)) : '—'} sub="open deals" color="#818cf8" />
          </div>

          {/* Deal table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full" style={{ fontSize: '11px' }}>
              <thead>
                <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                  <th className="text-left px-4 py-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Deal</th>
                  <th className="text-left px-2 py-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Stage</th>
                  <th className="text-right px-2 py-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Amount</th>
                  <th className="text-right px-4 py-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Close</th>
                </tr>
              </thead>
              <tbody>
                {openDeals.map((deal, idx) => {
                  const sc = stageColorMap.get(deal.stage) || STAGE_COLORS[idx % STAGE_COLORS.length];
                  return (
                    <tr key={deal.id} className="transition-colors" style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td className="px-4 py-2">
                        <a href={`https://app.hubspot.com/contacts/27215736/record/0-3/${deal.id}`}
                          target="_blank" rel="noopener" className="hover:underline truncate block max-w-[150px]"
                          style={{ color: 'var(--text)' }}>
                          {deal.name}
                        </a>
                        {deal.ownerName && <span className="text-[9px] block" style={{ color: 'var(--text-muted)' }}>{deal.ownerName}</span>}
                      </td>
                      <td className="px-2 py-2">
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-medium" style={{ background: sc + '22', color: sc }}>
                          {deal.stageLabel}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right font-medium" style={{ color: '#22c55e' }}>
                        {formatCurrency(deal.amount)}
                      </td>
                      <td className="px-4 py-2 text-right" style={{ color: 'var(--text-muted)' }}>
                        {formatDate(deal.closeDate)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {openDeals.length > 0 && (
                <tfoot>
                  <tr style={{ background: 'var(--surface)', borderTop: '2px solid var(--border)' }}>
                    <td className="px-4 py-2 font-semibold" style={{ color: 'var(--text)' }} colSpan={2}>Total Pipeline</td>
                    <td className="px-2 py-2 text-right font-bold" style={{ color: '#22c55e' }}>{formatCurrency(totalPipeline)}</td>
                    <td className="px-4 py-2 text-right" style={{ color: 'var(--text-muted)' }}>{openDeals.length} deals</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Right: Traffic & Leads */}
        <div className="overflow-auto flex flex-col" style={{ width: '320px', minWidth: '320px' }}>
          <div className="flex items-center gap-2 px-4 py-2.5 shrink-0" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
            <Globe size={14} style={{ color: '#10b981' }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              TRAFFIC & LEADS
            </span>
          </div>

          {!leadfeeder ? (
            <div className="flex items-center justify-center py-12 px-4">
              <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                Traffic data not available.<br />Run the refresh workflow to fetch data.
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              {/* Leads Funnel (from HubSpot contact lifecycle) */}
              {leadfeeder.contactLifecycle && leadfeeder.contactLifecycle.length > 0 && (
                <>
                  <div className="px-4 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                    <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>LEADS PIPELINE</span>
                  </div>
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                    {(() => {
                      const stages = leadfeeder.contactLifecycle;
                      const maxCount = Math.max(...stages.map(s => s.count), 1);
                      const funnelColors = ['#6366f1', '#8b5cf6', '#a78bfa', '#f59e0b', '#f97316', '#22c55e'];
                      return stages.map((stage, idx) => (
                        <div key={stage.key} className="flex items-center gap-2 mb-1.5">
                          <span className="text-[10px] w-20 text-right shrink-0" style={{ color: 'var(--text-muted)' }}>{stage.label}</span>
                          <div className="flex-1 h-5 rounded-sm overflow-hidden" style={{ background: 'var(--bg)' }}>
                            <div className="h-5 rounded-sm flex items-center px-1.5 transition-all" style={{
                              width: `${Math.max((stage.count / maxCount) * 100, stage.count > 0 ? 8 : 0)}%`,
                              background: funnelColors[idx % funnelColors.length],
                            }}>
                              {stage.count > 0 && (
                                <span className="text-[9px] font-bold text-white">{stage.count}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </>
              )}

              {/* HubSpot Traffic Sources (contact acquisition) */}
              {leadfeeder.hsTrafficSources && leadfeeder.hsTrafficSources.length > 0 && (
                <>
                  <div className="px-4 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                    <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>CONTACT SOURCES</span>
                  </div>
                  <div className="px-4 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                    {leadfeeder.hsTrafficSources
                      .filter(s => s.thisWeek > 0 || s.lastWeek > 0)
                      .map(source => {
                        const srcColor = SOURCE_COLORS[source.key] || '#94a3b8';
                        return (
                          <div key={source.key} className="flex items-center gap-2 py-1.5">
                            <span className="text-sm">{source.icon || '📊'}</span>
                            <span className="text-[11px] flex-1" style={{ color: 'var(--text)' }}>{source.label}</span>
                            <span className="text-[10px] font-bold" style={{ color: srcColor }}>{source.thisWeek}</span>
                            <span className="text-[8px]" style={{
                              color: source.thisWeek >= source.lastWeek ? '#22c55e' : '#ef4444',
                            }}>
                              {source.thisWeek >= source.lastWeek ? '+' : ''}{source.thisWeek - source.lastWeek}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </>
              )}

              {/* Website Visitors (from Leadfeeder) */}
              <div className="px-4 py-2" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>WEBSITE VISITORS</span>
              </div>

              {/* Visitor summary */}
              <div className="grid grid-cols-2 gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="rounded-md p-2" style={{ background: 'var(--bg)' }}>
                  <div className="text-[9px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-muted)' }}>This Week</div>
                  <div className="text-base font-bold" style={{ color: '#10b981' }}>{leadfeeder.thisWeekTotal}</div>
                  <div className="flex items-center gap-1 mt-0.5">
                    {leadfeeder.thisWeekTotal >= leadfeeder.lastWeekTotal
                      ? <ArrowUpRight size={10} style={{ color: '#22c55e' }} />
                      : <ArrowDownRight size={10} style={{ color: '#ef4444' }} />
                    }
                    <span className="text-[9px]" style={{ color: leadfeeder.thisWeekTotal >= leadfeeder.lastWeekTotal ? '#22c55e' : '#ef4444' }}>
                      {leadfeeder.lastWeekTotal > 0 ? Math.round(((leadfeeder.thisWeekTotal - leadfeeder.lastWeekTotal) / leadfeeder.lastWeekTotal) * 100) : 0}%
                    </span>
                  </div>
                </div>
                <div className="rounded-md p-2" style={{ background: 'var(--bg)' }}>
                  <div className="text-[9px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-muted)' }}>Last Week</div>
                  <div className="text-base font-bold" style={{ color: 'var(--text)' }}>{leadfeeder.lastWeekTotal}</div>
                  <div className="text-[9px] mt-0.5" style={{ color: 'var(--text-muted)' }}>companies</div>
                </div>
              </div>

              {/* Traffic source breakdown */}
              {leadfeeder.trafficSources.filter(s => s.thisWeek > 0 || s.lastWeek > 0).length > 0 && (
                <div className="px-4 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                  {leadfeeder.trafficSources
                    .filter(s => s.thisWeek > 0 || s.lastWeek > 0)
                    .sort((a, b) => b.thisWeek - a.thisWeek)
                    .map(source => {
                      const srcColor = SOURCE_COLORS[source.key] || '#94a3b8';
                      return (
                        <button key={source.key}
                          onClick={() => setExpandedSource(expandedSource === source.key ? null : source.key)}
                          className="w-full flex items-center gap-2 py-1.5 text-left hover:opacity-90">
                          <span className="text-sm">{source.icon}</span>
                          <span className="text-[11px] flex-1" style={{ color: 'var(--text)' }}>{source.label}</span>
                          <div className="h-1 w-12 rounded-full" style={{ background: 'var(--border)' }}>
                            <div className="h-1 rounded-full" style={{
                              width: `${leadfeeder.thisWeekTotal > 0 ? Math.min((source.thisWeek / leadfeeder.thisWeekTotal) * 100, 100) : 0}%`,
                              background: srcColor,
                            }} />
                          </div>
                          <span className="text-[10px] font-bold" style={{ color: srcColor }}>{source.thisWeek}</span>
                        </button>
                      );
                    })}
                </div>
              )}

              {/* Top visiting companies */}
              {leadfeeder.topCompanies && leadfeeder.topCompanies.length > 0 && (
                <>
                  <div className="px-4 py-2" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                    <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>TOP VISITING COMPANIES</span>
                  </div>
                  {leadfeeder.topCompanies.slice(0, 10).map((co, idx) => (
                    <div key={idx} className="flex items-center gap-2 px-4 py-2 transition-colors"
                      style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <span className="text-[9px] font-bold w-4 text-center" style={{ color: 'var(--text-muted)' }}>{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-[11px] font-medium block truncate" style={{ color: 'var(--text)' }}>{co.name}</span>
                        <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{co.source}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-bold" style={{ color: '#10b981' }}>{co.visits} visits</span>
                        <span className="text-[9px] block" style={{ color: 'var(--text-muted)' }}>{formatDate(co.lastVisit)}</span>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TaskSection({ label, count, color, tasks, owners }: {
  label: string; count: number; color: string; tasks: HsTask[]; owners: Owner[];
}) {
  return (
    <>
      <div className="px-5 py-1.5 sticky top-0 z-10" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <span className="text-[8px] font-bold uppercase tracking-[1.5px]" style={{ color }}>
          {label} ({count})
        </span>
      </div>
      {tasks.map(task => (
        <div key={task.id}
          className="flex items-center gap-2.5 px-5 py-2.5 transition-colors"
          style={{ borderBottom: '1px solid var(--border)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <span style={{ color: label === 'OVERDUE' ? '#f59e0b' : 'var(--text-muted)' }}>
            {taskIcon(task.type)}
          </span>
          <span className="text-xs flex-1 truncate" style={{ color: 'var(--text)' }}>{task.subject}</span>
          {task.dueDate && (
            <span className="text-[10px] shrink-0" style={{
              color: isOverdue(task.dueDate) ? '#f59e0b' : isDueToday(task.dueDate) ? 'var(--accent)' : 'var(--text-muted)',
            }}>
              {formatDate(task.dueDate)}
            </span>
          )}
          {task.ownerName && (
            <span className="text-[10px] px-1.5 py-0.5 rounded shrink-0" style={{ background: 'var(--bg)', color: 'var(--text-muted)' }}>
              {task.ownerName.split(' ')[0]}
            </span>
          )}
        </div>
      ))}
    </>
  );
}

function MiniStat({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="rounded-md p-2.5" style={{ background: 'var(--bg)' }}>
      <div className="text-[9px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-muted)' }}>{label}</div>
      <div className="text-base font-bold mt-0.5" style={{ color }}>{value}</div>
      <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{sub}</div>
    </div>
  );
}
