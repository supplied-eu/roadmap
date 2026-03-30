'use client';

import { useEffect, useState, useCallback } from 'react';
import { Circle, ChevronDown, ChevronUp, Search, DollarSign, Users, Activity, Plus, X, Check, ExternalLink, Clock, Bell, User, Calendar, AlertTriangle } from 'lucide-react';

type CompanyDeal = {
  id: string; name: string; stage: string; amount: number | null;
  closeDate: string | null; ownerName: string | null;
};
type Company = {
  id: string; name: string; domain: string | null; industry: string | null;
  lifecycle: string | null; leadStatus: string | null;
  revenue: number | null; employees: number | null; lastActivity: string | null;
  ownerName: string | null; ownerId: string | null;
  openDeals: number; deals: CompanyDeal[];
};
type Owner = { id: string; name: string };
type Health = 'green' | 'amber' | 'red';
type AcctTab = 'plan' | 'tasks' | 'timeline';

type AcctTask = {
  id: string; text: string; done: boolean;
  assignee: string | null; dueDate: string | null;
  priority: 'high' | 'medium' | 'low';
};
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
const priColors: Record<string, string> = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' };

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

function formatDateShort(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

const PLANS_KEY = 'supplied_acct_plans';
function loadPlans(): AcctPlans {
  try { return JSON.parse(localStorage.getItem(PLANS_KEY) || '{}'); } catch { return {}; }
}
function savePlans(plans: AcctPlans) { localStorage.setItem(PLANS_KEY, JSON.stringify(plans)); }

export default function AccountsPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Health | 'all'>('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AcctTab>('plan');
  const [plans, setPlans] = useState<AcctPlans>({});
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState<string>('');
  const [newTaskDue, setNewTaskDue] = useState<string>('');
  const [newTaskPriority, setNewTaskPriority] = useState<'high' | 'medium' | 'low'>('medium');

  useEffect(() => {
    fetch('/api/hubspot/companies')
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error);
        else {
          setCompanies(data.companies || []);
          setOwners(data.owners || []);
        }
        setLoading(false);
      })
      .catch(err => { setError(err.message); setLoading(false); });
    setPlans(loadPlans());
  }, []);

  const updatePlan = useCallback((companyId: string, value: string) => {
    setPlans(prev => {
      const next = { ...prev, [companyId]: { ...prev[companyId], plan: value, tasks: prev[companyId]?.tasks || [] } };
      savePlans(next);
      return next;
    });
  }, []);

  const addTask = useCallback((companyId: string) => {
    if (!newTaskText.trim()) return;
    setPlans(prev => {
      const existing = prev[companyId] || { plan: '', tasks: [] };
      const task: AcctTask = {
        id: Date.now().toString(),
        text: newTaskText.trim(),
        done: false,
        assignee: newTaskAssignee || null,
        dueDate: newTaskDue || null,
        priority: newTaskPriority,
      };
      const next = { ...prev, [companyId]: { ...existing, tasks: [...existing.tasks, task] } };
      savePlans(next);
      return next;
    });
    setNewTaskText('');
    setNewTaskAssignee('');
    setNewTaskDue('');
    setNewTaskPriority('medium');
  }, [newTaskText, newTaskAssignee, newTaskDue, newTaskPriority]);

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
  const totalDealValue = companiesWithHealth.reduce((sum, c) =>
    sum + c.deals.reduce((ds, d) => ds + (d.amount || 0), 0), 0);

  // Count tasks across all accounts that are overdue
  const allOverdueTasks = Object.entries(plans).reduce((count, [, p]) => {
    return count + (p.tasks || []).filter(t => !t.done && t.dueDate && t.dueDate < new Date().toISOString().split('T')[0]).length;
  }, 0);

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-lg font-bold mb-2" style={{ color: 'var(--text)' }}>Accounts</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading active customers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-lg font-bold mb-4" style={{ color: 'var(--text)' }}>Accounts</h1>
        <div className="rounded-lg p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} style={{ color: '#ef4444' }} />
            <p style={{ color: 'var(--text-muted)' }}>Failed to load: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KpiCard label="Active Customers" value={companies.length.toString()} icon={<Users size={14} />} color="var(--accent)" />
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
        <KpiCard label="Total Deal Value" value={formatCurrency(totalDealValue)} icon={<DollarSign size={14} />} color="#818cf8" />
      </div>

      {/* Overdue tasks alert */}
      {allOverdueTasks > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg mb-4" style={{ background: '#f59e0b11', border: '1px solid #f59e0b33' }}>
          <Bell size={14} style={{ color: '#f59e0b' }} />
          <span className="text-xs font-medium" style={{ color: '#f59e0b' }}>
            {allOverdueTasks} overdue account task{allOverdueTasks > 1 ? 's' : ''} across your accounts
          </span>
        </div>
      )}

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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '14px' }}>
        {filtered.length === 0 ? (
          <p className="text-sm py-8 col-span-full text-center" style={{ color: 'var(--text-muted)' }}>No companies match this filter.</p>
        ) : filtered.map(company => {
          const isExpanded = expandedId === company.id;
          const health = company.health;
          const acctPlan = plans[company.id] || { plan: '', tasks: [] };
          const nextStep = getNextSteps(health, company.daysSince, company.deals.length);
          const pendingTasks = (acctPlan.tasks || []).filter(t => !t.done);
          const overduePlanTasks = pendingTasks.filter(t => t.dueDate && t.dueDate < new Date().toISOString().split('T')[0]);

          return (
            <div key={company.id} className="rounded-lg overflow-hidden flex flex-col"
              style={{ background: 'var(--surface)', border: `1px solid ${overduePlanTasks.length > 0 ? '#f59e0b44' : 'var(--border)'}` }}>
              {/* Card header */}
              <button
                onClick={() => { setExpandedId(isExpanded ? null : company.id); setActiveTab('plan'); }}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:opacity-90"
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 text-xs font-bold"
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
                    {overduePlanTasks.length > 0 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded shrink-0 font-bold"
                        style={{ background: '#f59e0b22', color: '#f59e0b' }}>
                        {overduePlanTasks.length} overdue
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {company.domain && (
                      <a href={`https://${company.domain}`} target="_blank" rel="noopener"
                        className="text-[10px] truncate hover:underline"
                        style={{ color: 'var(--accent)' }}
                        onClick={e => e.stopPropagation()}>
                        {company.domain}
                      </a>
                    )}
                    {company.ownerName && (
                      <span className="text-[10px] flex items-center gap-0.5" style={{ color: 'var(--text-muted)' }}>
                        <User size={9} /> {company.ownerName.split(' ')[0]}
                      </span>
                    )}
                    <a href={`https://app.hubspot.com/contacts/27215736/company/${company.id}`}
                      target="_blank" rel="noopener"
                      className="text-[10px] hover:underline flex items-center gap-0.5 ml-auto"
                      style={{ color: 'var(--text-muted)' }}
                      onClick={e => e.stopPropagation()}>
                      <ExternalLink size={9} /> HubSpot
                    </a>
                  </div>
                </div>
                {isExpanded ? <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />}
              </button>

              {/* Collapsed: deal rows + meta */}
              {!isExpanded && (
                <>
                  {company.deals.length > 0 && (
                    <div className="px-4 pb-2">
                      {company.deals.slice(0, 2).map(d => (
                        <div key={d.id} className="flex items-center gap-2 py-1 text-[10px]" style={{ borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                          <span className="flex-1 truncate" style={{ color: 'var(--text)' }}>{d.name}</span>
                          <span className="shrink-0 font-medium" style={{ color: '#22c55e' }}>{formatCurrency(d.amount)}</span>
                          <span className="text-[9px] px-1 rounded shrink-0" style={{ background: 'var(--bg)', color: 'var(--text-muted)' }}>{d.stage}</span>
                        </div>
                      ))}
                      {company.deals.length > 2 && (
                        <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>+{company.deals.length - 2} more deals</span>
                      )}
                    </div>
                  )}

                  {/* Meta chips */}
                  <div className="flex items-center gap-2 px-4 pb-2 flex-wrap">
                    {company.deals.length > 0 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg)', color: 'var(--text-muted)' }}>
                        {company.deals.length} deal{company.deals.length > 1 ? 's' : ''}
                      </span>
                    )}
                    <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg)', color: 'var(--text-muted)' }}>
                      {company.daysSince < 999 ? `${company.daysSince}d since contact` : 'No activity'}
                    </span>
                    {pendingTasks.length > 0 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'var(--accent)22', color: 'var(--accent)' }}>
                        {pendingTasks.length} task{pendingTasks.length > 1 ? 's' : ''}
                      </span>
                    )}
                    {company.revenue && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg)', color: 'var(--text-muted)' }}>
                        {formatCurrency(company.revenue)} ARR
                      </span>
                    )}
                  </div>

                  {/* Next steps */}
                  <div className="px-4 pb-3">
                    <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: healthColors[health] }}>Next Steps</span>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{nextStep}</p>
                  </div>
                </>
              )}

              {/* Expanded detail panel */}
              {isExpanded && (
                <div className="border-t" style={{ borderColor: 'var(--border)' }}>
                  {/* Tabs */}
                  <div className="flex" style={{ borderBottom: '1px solid var(--border)' }}>
                    {(['plan', 'tasks', 'timeline'] as AcctTab[]).map(tab => (
                      <button key={tab} onClick={() => setActiveTab(tab)}
                        className="flex-1 py-2 text-[10px] font-semibold uppercase tracking-wider transition-colors relative"
                        style={{
                          color: activeTab === tab ? 'var(--accent)' : 'var(--text-muted)',
                          borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
                        }}>
                        {tab}
                        {tab === 'tasks' && pendingTasks.length > 0 && (
                          <span className="ml-1 text-[8px] px-1 rounded-full" style={{ background: 'var(--accent)', color: '#fff' }}>
                            {pendingTasks.length}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="p-4">
                    {activeTab === 'plan' && (
                      <div>
                        <textarea
                          value={acctPlan.plan}
                          onChange={e => updatePlan(company.id, e.target.value)}
                          placeholder="Write account strategy, notes, goals here..."
                          className="w-full text-xs bg-transparent outline-none resize-none rounded-md p-2.5 min-h-[80px]"
                          style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }}
                        />
                        {/* Deals */}
                        {company.deals.length > 0 && (
                          <div className="mt-3">
                            <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Deals</span>
                            {company.deals.map(d => (
                              <div key={d.id} className="flex items-center gap-2 py-1.5 text-[10px]" style={{ borderBottom: '1px solid var(--border)' }}>
                                <a href={`https://app.hubspot.com/contacts/27215736/record/0-3/${d.id}`}
                                  target="_blank" rel="noopener"
                                  className="flex-1 truncate hover:underline" style={{ color: 'var(--text)' }}>
                                  {d.name}
                                </a>
                                <span className="shrink-0 font-medium" style={{ color: '#22c55e' }}>{formatCurrency(d.amount)}</span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg)', color: 'var(--text-muted)' }}>{d.stage}</span>
                                {d.ownerName && <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{d.ownerName.split(' ')[0]}</span>}
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Account info */}
                        <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
                          <div><span style={{ color: 'var(--text-muted)' }}>Owner:</span> <span style={{ color: 'var(--text)' }}>{company.ownerName || '—'}</span></div>
                          <div><span style={{ color: 'var(--text-muted)' }}>Employees:</span> <span style={{ color: 'var(--text)' }}>{company.employees || '—'}</span></div>
                          <div><span style={{ color: 'var(--text-muted)' }}>Industry:</span> <span style={{ color: 'var(--text)' }}>{company.industry || '—'}</span></div>
                          <div><span style={{ color: 'var(--text-muted)' }}>Last Activity:</span> <span style={{ color: 'var(--text)' }}>{company.lastActivity ? new Date(company.lastActivity).toLocaleDateString('en-GB') : '—'}</span></div>
                        </div>
                        {/* HubSpot link */}
                        <a href={`https://app.hubspot.com/contacts/27215736/company/${company.id}`}
                          target="_blank" rel="noopener"
                          className="flex items-center gap-1.5 mt-3 text-[10px] hover:underline"
                          style={{ color: 'var(--accent)' }}>
                          <ExternalLink size={10} /> View in HubSpot
                        </a>
                      </div>
                    )}

                    {activeTab === 'tasks' && (
                      <div>
                        {/* Add task form */}
                        <div className="rounded-md p-2.5 mb-3" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                          <input
                            value={newTaskText}
                            onChange={e => setNewTaskText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && newTaskText.trim()) addTask(company.id); }}
                            placeholder="Add a task..."
                            className="w-full text-xs bg-transparent outline-none mb-2"
                            style={{ color: 'var(--text)' }}
                          />
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Assignee */}
                            <select
                              value={newTaskAssignee}
                              onChange={e => setNewTaskAssignee(e.target.value)}
                              className="text-[10px] rounded px-1.5 py-1 outline-none"
                              style={{ background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                            >
                              <option value="">Assign to...</option>
                              {owners.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                            </select>
                            {/* Due date */}
                            <input
                              type="date"
                              value={newTaskDue}
                              onChange={e => setNewTaskDue(e.target.value)}
                              className="text-[10px] rounded px-1.5 py-1 outline-none"
                              style={{ background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                            />
                            {/* Priority */}
                            <select
                              value={newTaskPriority}
                              onChange={e => setNewTaskPriority(e.target.value as any)}
                              className="text-[10px] rounded px-1.5 py-1 outline-none"
                              style={{ background: 'var(--surface)', color: priColors[newTaskPriority], border: '1px solid var(--border)' }}
                            >
                              <option value="high">High</option>
                              <option value="medium">Medium</option>
                              <option value="low">Low</option>
                            </select>
                            <button onClick={() => addTask(company.id)}
                              disabled={!newTaskText.trim()}
                              className="ml-auto p-1.5 rounded-md transition-colors"
                              style={{ background: newTaskText.trim() ? 'var(--accent)' : 'var(--border)', color: '#fff' }}>
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Task list */}
                        {(acctPlan.tasks || []).length === 0 ? (
                          <p className="text-xs py-3 text-center" style={{ color: 'var(--text-muted)' }}>No tasks yet. Add one above.</p>
                        ) : (
                          <div className="space-y-1">
                            {/* Pending tasks first, then done */}
                            {[...acctPlan.tasks].sort((a, b) => {
                              if (a.done !== b.done) return a.done ? 1 : -1;
                              const priOrder = { high: 0, medium: 1, low: 2 };
                              return priOrder[a.priority] - priOrder[b.priority];
                            }).map(task => {
                              const isOverdue = !task.done && task.dueDate && task.dueDate < new Date().toISOString().split('T')[0];
                              return (
                                <div key={task.id} className="flex items-center gap-2 py-2 px-2.5 rounded-md group"
                                  style={{
                                    background: isOverdue ? '#f59e0b08' : 'var(--bg)',
                                    opacity: task.done ? 0.45 : 1,
                                    border: isOverdue ? '1px solid #f59e0b22' : '1px solid transparent',
                                  }}>
                                  <button onClick={() => toggleTask(company.id, task.id)} className="shrink-0">
                                    {task.done
                                      ? <Check size={14} style={{ color: '#22c55e' }} />
                                      : <Circle size={14} style={{ color: priColors[task.priority] }} />
                                    }
                                  </button>
                                  <div className="flex-1 min-w-0">
                                    <span className="text-xs block truncate" style={{ color: 'var(--text)', textDecoration: task.done ? 'line-through' : 'none' }}>
                                      {task.text}
                                    </span>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      {task.assignee && (
                                        <span className="text-[9px] flex items-center gap-0.5" style={{ color: 'var(--text-muted)' }}>
                                          <User size={8} /> {task.assignee.split(' ')[0]}
                                        </span>
                                      )}
                                      {task.dueDate && (
                                        <span className="text-[9px] flex items-center gap-0.5"
                                          style={{ color: isOverdue ? '#f59e0b' : 'var(--text-muted)' }}>
                                          <Calendar size={8} /> {formatDateShort(task.dueDate)}
                                          {isOverdue && ' (overdue)'}
                                        </span>
                                      )}
                                      <span className="text-[8px] px-1 rounded font-bold uppercase"
                                        style={{ background: priColors[task.priority] + '22', color: priColors[task.priority] }}>
                                        {task.priority}
                                      </span>
                                    </div>
                                  </div>
                                  <button onClick={() => removeTask(company.id, task.id)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                    <X size={12} style={{ color: 'var(--text-muted)' }} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'timeline' && (
                      <div className="space-y-2">
                        {company.lastActivity && (
                          <TimelineItem date={company.lastActivity} label="Last activity recorded" color={healthColors[health]} />
                        )}
                        {company.deals.map(d => d.closeDate && (
                          <TimelineItem key={d.id} date={d.closeDate} label={`Deal: ${d.name} — ${formatCurrency(d.amount)}`} color="#818cf8" />
                        ))}
                        {/* Show completed account tasks */}
                        {(acctPlan.tasks || []).filter(t => t.done).map(t => (
                          <TimelineItem key={t.id} date={t.dueDate || new Date().toISOString()} label={`Task completed: ${t.text}`} color="#22c55e" />
                        ))}
                        {!company.lastActivity && company.deals.length === 0 && (
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
