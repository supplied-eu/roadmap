'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, DollarSign, Clock, CheckCircle, AlertCircle, AlertTriangle, ExternalLink, User, Calendar, CheckSquare, Phone, Mail, X } from 'lucide-react';

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

  useEffect(() => {
    fetch('/api/hubspot')
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); }
        else {
          setDeals(data.deals || []);
          setTasks(data.tasks || []);
          setOwners(data.owners || []);
          setPipelines(data.pipelines || []);
          const pipelineCounts: Record<string, number> = {};
          for (const d of data.deals || []) pipelineCounts[d.pipeline] = (pipelineCounts[d.pipeline] || 0) + 1;
          const top = Object.entries(pipelineCounts).sort((a, b) => b[1] - a[1])[0];
          if (top) setSelectedPipeline(top[0]);
        }
        setLoading(false);
      })
      .catch(err => { setError(err.message); setLoading(false); });
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

      {/* Two-column layout */}
      <div className="flex-1 flex overflow-hidden" style={{ display: 'grid', gridTemplateColumns: '1fr 420px' }}>
        {/* Left: Tasks list */}
        <div className="overflow-auto" style={{ borderRight: '1px solid var(--border)' }}>
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

        {/* Right: Pipeline */}
        <div className="overflow-auto flex flex-col">
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
                          target="_blank" rel="noopener" className="hover:underline truncate block max-w-[180px]"
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
