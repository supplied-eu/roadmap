'use client';

import { useEffect, useState, useCallback } from 'react';
import { Clock, ChevronDown, ChevronUp, ExternalLink, Save, Plus, Minus } from 'lucide-react';

type WbsoIssue = {
  id: string; title: string; status: string;
  estimatedHours: number; weeklyHours: Record<string, number>;
};
type WbsoBlock = {
  id: number; name: string; keywords: string[];
  allocatedHours: number; estimatedTotalHours: number;
  issues: WbsoIssue[];
};
type WbsoData = {
  application: string; company: string;
  period: { start: string; end: string };
  totalHours: number; blocks: WbsoBlock[];
};

function getCurrentWeek(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000) + 1;
  const weekNum = Math.ceil(dayOfYear / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function getRecentWeeks(count: number): string[] {
  const weeks: string[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    const start = new Date(d.getFullYear(), 0, 1);
    const dayOfYear = Math.floor((d.getTime() - start.getTime()) / 86400000) + 1;
    const weekNum = Math.ceil(dayOfYear / 7);
    const key = `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
    if (!weeks.includes(key)) weeks.push(key);
  }
  return weeks;
}

const HOURS_KEY = 'supplied_wbso_hours';
function loadLocalHours(): Record<string, Record<string, number>> {
  try { return JSON.parse(localStorage.getItem(HOURS_KEY) || '{}'); } catch { return {}; }
}
function saveLocalHours(hours: Record<string, Record<string, number>>) {
  localStorage.setItem(HOURS_KEY, JSON.stringify(hours));
}

export default function WbsoTracker() {
  const [data, setData] = useState<WbsoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedBlock, setExpandedBlock] = useState<number | null>(null);
  const [localHours, setLocalHours] = useState<Record<string, Record<string, number>>>({});
  const currentWeek = getCurrentWeek();
  const recentWeeks = getRecentWeeks(4);

  useEffect(() => {
    fetch('/api/wbso')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
    setLocalHours(loadLocalHours());
  }, []);

  const updateHours = useCallback((issueId: string, week: string, delta: number) => {
    setLocalHours(prev => {
      const issueHours = prev[issueId] ? { ...prev[issueId] } : {};
      const current = issueHours[week] || 0;
      const newVal = Math.max(0, current + delta);
      if (newVal === 0) delete issueHours[week];
      else issueHours[week] = newVal;
      const next = { ...prev, [issueId]: issueHours };
      saveLocalHours(next);
      return next;
    });
  }, []);

  const getHours = (issueId: string, week: string, wbsoHours: Record<string, number>): number => {
    return localHours[issueId]?.[week] ?? wbsoHours[week] ?? 0;
  };

  const getTotalLoggedHours = (block: WbsoBlock): number => {
    let total = 0;
    for (const issue of block.issues) {
      // Sum all weekly hours (from wbso-data + local overrides)
      const allWeeks = new Set([...Object.keys(issue.weeklyHours), ...Object.keys(localHours[issue.id] || {})]);
      for (const week of allWeeks) {
        total += getHours(issue.id, week, issue.weeklyHours);
      }
    }
    return total;
  };

  const getThisWeekTotal = (): number => {
    if (!data) return 0;
    let total = 0;
    for (const block of data.blocks) {
      for (const issue of block.issues) {
        total += getHours(issue.id, currentWeek, issue.weeklyHours);
      }
    }
    return total;
  };

  if (loading) {
    return (
      <div className="rounded-lg p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Clock size={16} style={{ color: '#f59e0b' }} />
          <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>WBSO Time Tracker</h3>
        </div>
        <div className="animate-pulse space-y-2">
          {[1, 2].map(i => <div key={i} className="rounded-md" style={{ background: 'var(--bg)', height: '40px' }} />)}
        </div>
      </div>
    );
  }

  if (!data || !data.blocks?.length) {
    return (
      <div className="rounded-lg p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <Clock size={16} style={{ color: '#f59e0b' }} />
          <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>WBSO Time Tracker</h3>
        </div>
        <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>No WBSO data available.</p>
      </div>
    );
  }

  const thisWeekTotal = getThisWeekTotal();
  const grandTotal = data.blocks.reduce((sum, b) => sum + getTotalLoggedHours(b), 0);

  return (
    <div className="rounded-lg overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <Clock size={16} style={{ color: '#f59e0b' }} />
        <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>WBSO Time Tracker</h3>
        <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg)', color: 'var(--text-muted)' }}>
          {data.application}
        </span>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="text-center">
          <div className="text-lg font-bold" style={{ color: '#f59e0b' }}>{thisWeekTotal}h</div>
          <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>This Week</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold" style={{ color: 'var(--text)' }}>{grandTotal}h</div>
          <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>Total Logged</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold" style={{ color: grandTotal >= data.totalHours ? '#ef4444' : '#22c55e' }}>
            {data.totalHours - grandTotal}h
          </div>
          <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>Remaining</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{Math.round((grandTotal / data.totalHours) * 100)}% of {data.totalHours}h</span>
        </div>
        <div className="h-1.5 rounded-full" style={{ background: 'var(--bg)' }}>
          <div className="h-1.5 rounded-full transition-all" style={{
            width: `${Math.min((grandTotal / data.totalHours) * 100, 100)}%`,
            background: '#f59e0b',
          }} />
        </div>
      </div>

      {/* Blocks */}
      <div className="max-h-[400px] overflow-auto">
        {data.blocks.map(block => {
          const isExpanded = expandedBlock === block.id;
          const logged = getTotalLoggedHours(block);
          const pct = block.allocatedHours > 0 ? Math.round((logged / block.allocatedHours) * 100) : 0;
          const activeIssues = block.issues.filter(i => i.status !== 'Canceled' && i.status !== 'Done' || Object.keys(i.weeklyHours).length > 0);

          return (
            <div key={block.id} style={{ borderBottom: '1px solid var(--border)' }}>
              <button onClick={() => setExpandedBlock(isExpanded ? null : block.id)}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:opacity-90 transition-colors">
                {isExpanded ? <ChevronUp size={12} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={12} style={{ color: 'var(--text-muted)' }} />}
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium block truncate" style={{ color: 'var(--text)' }}>
                    Block {block.id}: {block.name}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex-1 h-1 rounded-full max-w-[100px]" style={{ background: 'var(--bg)' }}>
                      <div className="h-1 rounded-full" style={{
                        width: `${Math.min(pct, 100)}%`,
                        background: pct > 100 ? '#ef4444' : pct > 80 ? '#f59e0b' : '#22c55e',
                      }} />
                    </div>
                    <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                      {logged}h / {block.allocatedHours}h ({pct}%)
                    </span>
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-3">
                  {/* Week columns header */}
                  <div className="flex items-center gap-1 mb-1.5 pl-[140px]">
                    {recentWeeks.map(w => (
                      <span key={w} className="text-[8px] w-12 text-center font-medium"
                        style={{ color: w === currentWeek ? '#f59e0b' : 'var(--text-muted)' }}>
                        {w.split('-')[1]}
                      </span>
                    ))}
                  </div>

                  {activeIssues.map(issue => (
                    <div key={issue.id} className="flex items-center gap-1 py-1 group"
                      style={{ borderTop: '1px solid var(--border)' }}>
                      <div className="w-[140px] shrink-0 min-w-0">
                        <span className="text-[9px] font-mono block" style={{ color: 'var(--text-muted)' }}>{issue.id}</span>
                        <span className="text-[10px] block truncate" style={{ color: 'var(--text)' }}>{issue.title}</span>
                      </div>
                      {recentWeeks.map(w => {
                        const hrs = getHours(issue.id, w, issue.weeklyHours);
                        return (
                          <div key={w} className="w-12 flex items-center justify-center gap-0.5">
                            <button onClick={() => updateHours(issue.id, w, -1)}
                              className="opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity p-0.5">
                              <Minus size={8} style={{ color: 'var(--text-muted)' }} />
                            </button>
                            <span className="text-[10px] font-medium w-5 text-center"
                              style={{ color: hrs > 0 ? '#f59e0b' : 'var(--text-muted)' }}>
                              {hrs || '·'}
                            </span>
                            <button onClick={() => updateHours(issue.id, w, 1)}
                              className="opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity p-0.5">
                              <Plus size={8} style={{ color: 'var(--text-muted)' }} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
