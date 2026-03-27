'use client';

import { useEffect, useState } from 'react';
import { Circle, ChevronDown, ChevronUp } from 'lucide-react';

type Company = {
  id: string; name: string; domain: string | null; industry: string | null;
  lifecycle: string | null; leadStatus: string | null;
  revenue: number | null; employees: number | null; lastActivity: string | null;
};
type Deal = {
  id: string; name: string; stage: string; amount: number | null; closeDate: string | null;
};

type Health = 'green' | 'amber' | 'red';

function computeHealth(company: Company): Health {
  if (!company.lastActivity) return 'red';
  const daysSince = (Date.now() - new Date(company.lastActivity).getTime()) / 86400000;
  if (daysSince > 30) return 'red';
  if (daysSince > 14) return 'amber';
  return 'green';
}

const healthColors: Record<Health, string> = { green: '#22c55e', amber: '#f59e0b', red: '#ef4444' };
const healthLabels: Record<Health, string> = { green: 'Healthy', amber: 'At Risk', red: 'Needs Attention' };

const nextSteps: Record<Health, string[]> = {
  red: ['Schedule urgent check-in call', 'Review open support tickets', 'Prepare account recovery plan'],
  amber: ['Send proactive update email', 'Review upcoming renewal dates', 'Identify expansion opportunities'],
  green: ['Explore upsell opportunities', 'Request referral or case study', 'Schedule quarterly business review'],
};

function formatCurrency(amount: number | null) {
  if (!amount) return '—';
  return new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
}

export default function AccountsPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Health | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/hubspot/companies')
      .then(r => r.json())
      .then(data => {
        setCompanies(data.companies || []);
        setDeals(data.deals || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const companiesWithHealth = companies.map(c => ({ ...c, health: computeHealth(c) }));
  const filtered = filter === 'all' ? companiesWithHealth : companiesWithHealth.filter(c => c.health === filter);
  const counts = { green: 0, amber: 0, red: 0 };
  companiesWithHealth.forEach(c => counts[c.health]++);

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text)' }}>Accounts</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Accounts</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{companies.length} companies</p>
      </div>

      {/* Health filter */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setFilter('all')}
          className="text-xs px-3 py-1.5 rounded transition-colors"
          style={{ background: filter === 'all' ? 'var(--accent)' : 'var(--surface)', color: filter === 'all' ? '#fff' : 'var(--text-muted)', border: '1px solid var(--border)' }}>
          All ({companies.length})
        </button>
        {(['green', 'amber', 'red'] as Health[]).map(h => (
          <button key={h} onClick={() => setFilter(h)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded transition-colors"
            style={{ background: filter === h ? healthColors[h] + '22' : 'var(--surface)', color: filter === h ? healthColors[h] : 'var(--text-muted)', border: `1px solid ${filter === h ? healthColors[h] : 'var(--border)'}` }}>
            <Circle size={8} fill={healthColors[h]} stroke={healthColors[h]} />
            {healthLabels[h]} ({counts[h]})
          </button>
        ))}
      </div>

      {/* Company cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <p className="text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>No companies match this filter.</p>
        ) : filtered.map(company => {
          const isExpanded = expandedId === company.id;
          const health = company.health;
          return (
            <div key={company.id} className="rounded-lg overflow-hidden"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <button
                onClick={() => setExpandedId(isExpanded ? null : company.id)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left transition-colors hover:opacity-90"
              >
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: healthColors[health] }} />
                <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 text-sm font-bold"
                  style={{ background: healthColors[health] + '22', color: healthColors[health] }}>
                  {company.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{company.name}</span>
                    {company.domain && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{company.domain}</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {company.industry && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{company.industry}</span>}
                    {company.revenue && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{formatCurrency(company.revenue)} ARR</span>}
                  </div>
                </div>
                <span className="text-[10px] px-2 py-1 rounded shrink-0"
                  style={{ background: healthColors[health] + '22', color: healthColors[health] }}>
                  {healthLabels[health]}
                </span>
                {isExpanded ? <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />}
              </button>

              {isExpanded && (
                <div className="px-5 pb-5 border-t" style={{ borderColor: 'var(--border)' }}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="rounded-md p-3" style={{ background: 'var(--bg)' }}>
                      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Details</span>
                      <div className="mt-2 space-y-1.5 text-xs" style={{ color: 'var(--text)' }}>
                        <div>Lifecycle: <span style={{ color: 'var(--text-muted)' }}>{company.lifecycle || '—'}</span></div>
                        <div>Employees: <span style={{ color: 'var(--text-muted)' }}>{company.employees || '—'}</span></div>
                        <div>Last Activity: <span style={{ color: 'var(--text-muted)' }}>
                          {company.lastActivity ? new Date(company.lastActivity).toLocaleDateString('en-GB') : '—'}
                        </span></div>
                      </div>
                    </div>
                    <div className="rounded-md p-3" style={{ background: 'var(--bg)' }}>
                      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Recent Deals</span>
                      <div className="mt-2 space-y-1.5">
                        {deals.slice(0, 3).map(d => (
                          <div key={d.id} className="text-xs flex items-center justify-between">
                            <span style={{ color: 'var(--text)' }} className="truncate">{d.name}</span>
                            <span className="shrink-0 ml-2" style={{ color: 'var(--text-muted)' }}>{formatCurrency(d.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-md p-3" style={{ background: 'var(--bg)' }}>
                      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: healthColors[health] }}>
                        Next Steps
                      </span>
                      <div className="mt-2 space-y-1.5">
                        {nextSteps[health].map((step, i) => (
                          <div key={i} className="flex items-start gap-1.5 text-xs">
                            <span className="mt-0.5" style={{ color: healthColors[health] }}>•</span>
                            <span style={{ color: 'var(--text)' }}>{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>
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
