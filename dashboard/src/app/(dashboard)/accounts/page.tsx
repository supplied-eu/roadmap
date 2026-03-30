'use client';

import { useEffect, useState, useCallback } from 'react';
import { Circle, ChevronDown, ChevronUp, Search, DollarSign, Users, Activity, Plus, X, Check, ExternalLink } from 'lucide-react';

type Company = {
  id: string; name: string; domain: string | null; industry: string | null;
  lifecycle: string | null; leadStatus: string | null;
  revenue: number | null; employees: number | null; lastActivity: string | null;
};
type Deal = {
  id: string; name: string; stage: string; amount: number | null; closeDate: string | null;
};
type Health = 'green' | 'amber' | 'red';
type AcctTab = 'plan' | 'tasks' | 'timeline';

type AcctTask = { id: string; text: string; done: boolean };
type AcctPlans = Record<string, { plan: string; tasks: AcctTask[] }>;

function computeHealth(company: Company): { health: Health; score: number; daysSince: number } {
  if (!company.lastActivity) return { health: 'red', score: 10, daysSince: 999 };
  const daysSince = Math.floor((Date.now() - new Date(company.lastActivity).getTime()) / 86400000);
  let score = 100;
  if (daysSince > 90) score -= 50;
  else if (daysSince > 30) score -= 25;
  else if (daysSince > 14) score -= 10;
  if (score >= 70) return { health: 'green', score, daysSince };
  if (score >= 40) return { health: 'amber', score, daysSince };
  return { health: 'red', score, daysSince };
}

const healthColors: Record<Health, string> = { green: '#22c55e', amber: '#f59e0b', red: '#ef4444' };
const healthLabels: Record<Health, string> = { green: 'Healthy', amber: 'At Risk', red: 'Needs Attention' };

function getNextSteps(health: Health, daysSince: number, openDeals: number): string {
  if (health === 'red') {
    if (daysSince > 90) return `No contact in ${daysSince} days — schedule a check-in call.`;
    return 'Review account health and confirm go-live status.';
  }
  if (health === 'amber') {
    if (openDeals > 0) return `${openDeals} open deal${openDeals > 1 ? 's' : ''}. Confirm next steps and timeline.`;
    return 'Send proactive update email and identify expansion opportunities.';
  }
  return 'Explore upsell opportunities. Consider requesting referral or case study.';
}

function formatCurrency(amount: number | null) {
  if (!amount) return '—';
  return new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
}

const PLANS_KEY = 'supplied_acct_plans';
function loadPlans(): AcctPlans {
  try { return JSON.parse(localStorage.getItem(PLANS_KEY) || '{}'); } catch { return {}; }
}
function savePlans(plans: AcctPlans) { localStorage.setItem(PLANS_KEY, JSON.stringify(plans)); }

export default function AccountsPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Health | 'all'>('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AcctTab>('plan');
  const [plans, setPlans] = useState<AcctPlans>({});
  const [newTaskText, setNewTaskText] = useState('');

  useEffect(() => {
    fetch('/api/hubspot/companies')
      .then(r => r.json())
      .then(data => {
        setCompanies(data.companies || []);
        setDeals(data.deals || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    setPlans(loadPlans());
  }, []);

  const updatePlan = useCallback((companyId: string, field: 'plan', value: string) => {
    setPlans(prev => {
      const next = { ...prev, [companyId]: { ...prev[companyId], plan: value, tasks: prev[companyId]?.tasks || [] } };
      savePlans(next);
      return next;
    });
  }, []);

  const addTask = useCallback((companyId: string, text: string) => {
    if (!text.trim()) return;
    setPlans(prev => {
      const existing = prev[companyId] || { plan: '', tasks: [] };
      const next = { ...prev, [companyId]: { ...existing, tasks: [...existing.tasks, { id: Date.now().toString(), text, done: false }] } };
      savePlans(next);
      return next;
    });
    setNewTaskText('');
  }, []);

  const toggleTask = useCallback((companyId: string, taskId: string) => {
    setPlans(prev => {
      const existing = prev[companyId] || { plan: '', tasks: [] };
      const next = { ...prev, [companyId]: { ...existing, tasks: existing.tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t) } };
      savePlans(next);
      return next;
    });
  }, []);

  const removeTask = useCallback((companyId: string, taskId: string) => {
    setPlans(prev => {
      const existing = prev[companyId] || { plan: '', tasks: [] };
      const next = { ...prev, [companyId]: { ...existing, tasks: existing.tasks.filter(t => t.id !== taskId) } };
      savePlans(next);
      return next;
    });
  }, []);

  const companiesWithHealth = companies.map(c => {
    const { health, score, daysSince } = computeHealth(c);
    return { ...c, health, score, daysSince };
  });

  const filtered = companiesWithHealth
    .filter(c => filter === 'all' || c.health === filter)
    .filter(c => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (c.name?.toLowerCase().includes(q)) || (c.domain?.toLowerCase().includes(q));
    });

  const counts = { green: 0, amber: 0, red: 0 };
  companiesWithHealth.forEach(c => counts[c.health]++);

  const totalRevenue = companiesWithHealth.reduce((sum, c) => sum + (c.revenue || 0), 0);
  const totalOpenPipeline = deals.reduce((sum, d) => sum + (d.amount || 0), 0);

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-lg font-bold mb-2" style={{ color: 'var(--text)' }}>Accounts</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KpiCard label="Total Customers" value={companies.length.toString()} icon={<Users size={14} />} color="var(--accent)" />
        <KpiCard label="Health Breakdown"
          value={<span className="flex items-center gap-2 text-base">
            <span style={{ color: healthColors.green }}>{counts.green}</span>
            <span style={{ color: 'var(--text-muted)' }}>/</span>
            <span style={{ color: healthColors.amber }}>{counts.amber}</span>
            <span style={{ color: 'var(--text-muted)' }}>/</span>
            <span style={{ color: healthColors.red }}>{counts.red}</span>
          </span>}
          icon={<Activity size={14} />} color="var(--text-muted)" />
        <KpiCard label="Total Revenue" value={formatCurrency(totalRevenue)} icon={<DollarSign size={14} />} color="#22c55e" />
        <KpiCard label="Open Pipeline" value={formatCurrency(totalOpenPipeline)} icon={<DollarSign size={14} />} color="#818cf8" />
      </div>

      {/* Toolbar: search + health filter */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md flex-1 max-w-xs"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search company or domain..."
            className="text-sm bg-transparent outline-none flex-1"
            style={{ color: 'var(--text)' }}
          />
          {search && <button onClick={() => setSearch('')}><X size={12} style={{ color: 'var(--text-muted)' }} /></button>}
        </div>
        <button onClick={() => setFilter('all')}
          className="text-xs px-3 py-1.5 rounded transition-colors"
          style={{ background: filter === 'all' ? 'var(--accent)' : 'var(--surface)', color: filter === 'all' ? '#fff' : 'var(--text-muted)', border: '1px solid var(--border)' }}>
          All ({companies.length})
        </button>
        {(['green', 'amber', 'red'] as Health[]).map(h => (
          <button key={h} onClick={() => setFilter(filter === h ? 'all' : h)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded transition-colors"
            style={{ background: filter === h ? healthColors[h] + '22' : 'var(--surface)', color: filter === h ? healthColors[h] : 'var(--text-muted)', border: `1px solid ${filter === h ? healthColors[h] : 'var(--border)'}` }}>
            <Circle size={8} fill={healthColors[h]} stroke={healthColors[h]} />
            {healthLabels[h]} ({counts[h]})
          </button>
        ))}
      </div>

      {/* Account cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '14px' }}>
        {filtered.length === 0 ? (
          <p className="text-sm py-8 col-span-full text-center" style={{ color: 'var(--text-muted)' }}>No companies match this filter.</p>
        ) : filtered.map(company => {
          const isExpanded = expandedId === company.id;
          const health = company.health;
          const companyDeals = deals.filter(d =>
            d.name?.toLowerCase().includes(company.name?.toLowerCase()?.split(' ')[0] || '___')
          );
          const openDeals = companyDeals.length;
          const acctPlan = plans[company.id] || { plan: '', tasks: [] };
          const nextStep = getNextSteps(health, company.daysSince, openDeals);

          return (
            <div key={company.id} className="rounded-lg overflow-hidden flex flex-col"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              {/* Card header */}
              <button
                onClick={() => { setExpandedId(isExpanded ? null : company.id); setActiveTab('plan'); }}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:opacity-90"
              >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 text-xs font-bold"
                  style={{ background: healthColors[health] + '22', color: healthColors[health] }}>
                  {company.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{company.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded shrink-0"
                      style={{ background: healthColors[health] + '22', color: healthColors[health] }}>
                      {healthLabels[health]}
                    </span>
                  </div>
                  {company.domain && <span className="text-[10px] block truncate" style={{ color: 'var(--text-muted)' }}>{company.domain}</span>}
                </div>
                {isExpanded ? <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />}
              </button>

              {/* Deal rows */}
              {companyDeals.length > 0 && !isExpanded && (
                <div className="px-4 pb-2">
                  {companyDeals.slice(0, 2).map(d => (
                    <div key={d.id} className="flex items-center gap-2 py-1 text-[10px]" style={{ borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                      <span className="flex-1 truncate" style={{ color: 'var(--text)' }}>{d.name}</span>
                      <span className="shrink-0 font-medium" style={{ color: '#22c55e' }}>{formatCurrency(d.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Meta chips */}
              {!isExpanded && (
                <div className="flex items-center gap-2 px-4 pb-3">
                  {openDeals > 0 && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg)', color: 'var(--text-muted)' }}>
                      {openDeals} deal{openDeals > 1 ? 's' : ''}
                    </span>
                  )}
                  <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg)', color: 'var(--text-muted)' }}>
                    {company.daysSince < 999 ? `${company.daysSince}d since contact` : 'No activity'}
                  </span>
                  {company.revenue && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg)', color: 'var(--text-muted)' }}>
                      {formatCurrency(company.revenue)} ARR
                    </span>
                  )}
                </div>
              )}

              {/* Next steps */}
              {!isExpanded && (
                <div className="px-4 pb-3">
                  <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: healthColors[health] }}>Next Steps</span>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{nextStep}</p>
                </div>
              )}

              {/* Expanded detail panel */}
              {isExpanded && (
                <div className="border-t" style={{ borderColor: 'var(--border)' }}>
                  {/* Tabs */}
                  <div className="flex" style={{ borderBottom: '1px solid var(--border)' }}>
                    {(['plan', 'tasks', 'timeline'] as AcctTab[]).map(tab => (
                      <button key={tab} onClick={() => setActiveTab(tab)}
                        className="flex-1 py-2 text-[10px] font-semibold uppercase tracking-wider transition-colors"
                        style={{
                          color: activeTab === tab ? 'var(--accent)' : 'var(--text-muted)',
                          borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
                        }}>
                        {tab}
                      </button>
                    ))}
                  </div>

                  <div className="p-4">
                    {activeTab === 'plan' && (
                      <div>
                        <textarea
                          value={acctPlan.plan}
                          onChange={e => updatePlan(company.id, 'plan', e.target.value)}
                          placeholder="Write account strategy notes here..."
                          className="w-full text-xs bg-transparent outline-none resize-none rounded-md p-2.5 min-h-[80px]"
                          style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }}
                        />
                        {/* Deal details */}
                        {companyDeals.length > 0 && (
                          <div className="mt-3">
                            <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Deals</span>
                            {companyDeals.map(d => (
                              <div key={d.id} className="flex items-center gap-2 py-1.5 text-[10px]" style={{ borderBottom: '1px solid var(--border)' }}>
                                <span className="flex-1 truncate" style={{ color: 'var(--text)' }}>{d.name}</span>
                                <span className="shrink-0 font-medium" style={{ color: '#22c55e' }}>{formatCurrency(d.amount)}</span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg)', color: 'var(--text-muted)' }}>{d.stage}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Account info */}
                        <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
                          <div><span style={{ color: 'var(--text-muted)' }}>Lifecycle:</span> <span style={{ color: 'var(--text)' }}>{company.lifecycle || '—'}</span></div>
                          <div><span style={{ color: 'var(--text-muted)' }}>Employees:</span> <span style={{ color: 'var(--text)' }}>{company.employees || '—'}</span></div>
                          <div><span style={{ color: 'var(--text-muted)' }}>Industry:</span> <span style={{ color: 'var(--text)' }}>{company.industry || '—'}</span></div>
                          <div><span style={{ color: 'var(--text-muted)' }}>Last Activity:</span> <span style={{ color: 'var(--text)' }}>{company.lastActivity ? new Date(company.lastActivity).toLocaleDateString('en-GB') : '—'}</span></div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'tasks' && (
                      <div>
                        {/* Add task input */}
                        <div className="flex items-center gap-2 mb-3">
                          <input
                            value={newTaskText}
                            onChange={e => setNewTaskText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') addTask(company.id, newTaskText); }}
                            placeholder="Add a task..."
                            className="flex-1 text-xs bg-transparent outline-none px-2.5 py-1.5 rounded-md"
                            style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }}
                          />
                          <button onClick={() => addTask(company.id, newTaskText)}
                            className="p-1.5 rounded-md" style={{ background: 'var(--accent)', color: '#fff' }}>
                            <Plus size={12} />
                          </button>
                        </div>
                        {/* Task list */}
                        {acctPlan.tasks.length === 0 ? (
                          <p className="text-xs py-3 text-center" style={{ color: 'var(--text-muted)' }}>No tasks yet.</p>
                        ) : (
                          <div className="space-y-1">
                            {acctPlan.tasks.map(task => (
                              <div key={task.id} className="flex items-center gap-2 py-1.5 px-2 rounded-md group"
                                style={{ background: 'var(--bg)', opacity: task.done ? 0.5 : 1 }}>
                                <button onClick={() => toggleTask(company.id, task.id)}>
                                  {task.done
                                    ? <Check size={12} style={{ color: '#22c55e' }} />
                                    : <Circle size={12} style={{ color: 'var(--text-muted)' }} />
                                  }
                                </button>
                                <span className="text-xs flex-1" style={{ color: 'var(--text)', textDecoration: task.done ? 'line-through' : 'none' }}>
                                  {task.text}
                                </span>
                                <button onClick={() => removeTask(company.id, task.id)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity">
                                  <X size={10} style={{ color: 'var(--text-muted)' }} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'timeline' && (
                      <div className="space-y-2">
                        {company.lastActivity && (
                          <TimelineItem date={company.lastActivity} label="Last activity recorded" color={healthColors[health]} />
                        )}
                        {companyDeals.map(d => d.closeDate && (
                          <TimelineItem key={d.id} date={d.closeDate} label={`Deal: ${d.name} — ${formatCurrency(d.amount)}`} color="#818cf8" />
                        ))}
                        {!company.lastActivity && companyDeals.length === 0 && (
                          <p className="text-xs py-3 text-center" style={{ color: 'var(--text-muted)' }}>No timeline data.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon, color }: { label: string; value: string | React.ReactNode; icon: React.ReactNode; color: string }) {
  return (
    <div className="rounded-lg p-3.5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 mb-1.5">
        <span style={{ color }}>{icon}</span>
        <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-muted)' }}>{label}</span>
      </div>
      {typeof value === 'string'
        ? <div className="text-xl font-bold" style={{ color }}>{value}</div>
        : value
      }
    </div>
  );
}

function TimelineItem({ date, label, color }: { date: string; label: string; color: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <div className="w-2.5 h-2.5 rounded-full mt-0.5" style={{ background: color }} />
        <div className="w-px flex-1 mt-1" style={{ background: 'var(--border)' }} />
      </div>
      <div className="pb-3">
        <span className="text-[10px] block" style={{ color: 'var(--text-muted)' }}>
          {new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
        <span className="text-xs" style={{ color: 'var(--text)' }}>{label}</span>
      </div>
    </div>
  );
}
