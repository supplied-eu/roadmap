'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, DollarSign, Clock, CheckCircle, AlertCircle } from 'lucide-react';

type Deal = {
  id: string;
  name: string;
  stage: string;
  stageLabel: string;
  amount: number | null;
  closeDate: string | null;
  ownerName: string | null;
  pipeline: string;
};

// Colors for pipeline stages (cycled through)
const STAGE_COLORS = ['#60a5fa', '#818cf8', '#a78bfa', '#c084fc', '#f59e0b', '#fb923c', '#f472b6'];
const CLOSED_COLORS: Record<string, string> = { closedwon: '#22c55e', closedlost: '#ef4444' };

function getStageColor(stage: string, index: number) {
  if (CLOSED_COLORS[stage]) return CLOSED_COLORS[stage];
  return STAGE_COLORS[index % STAGE_COLORS.length];
}

function formatCurrency(amount: number | null) {
  if (!amount) return '—';
  return new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function SalesPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/hubspot')
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setDeals(data.deals || []);
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Pipeline stats
  const openDeals = deals.filter(d => d.stage !== 'closedwon' && d.stage !== 'closedlost');
  const wonDeals = deals.filter(d => d.stage === 'closedwon');
  const lostDeals = deals.filter(d => d.stage === 'closedlost');
  const totalPipeline = openDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
  const totalWon = wonDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
  const winRate = wonDeals.length + lostDeals.length > 0
    ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100)
    : 0;

  // Group deals by stageLabel for pipeline view
  const stageGroups = new Map<string, { label: string; deals: Deal[] }>();
  for (const deal of openDeals) {
    const key = deal.stage;
    if (!stageGroups.has(key)) stageGroups.set(key, { label: deal.stageLabel || deal.stage, deals: [] });
    stageGroups.get(key)!.deals.push(deal);
  }
  const sortedStages = [...stageGroups.entries()];

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Sales Pipeline</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Loading HubSpot deals...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-lg p-5 animate-pulse" style={{ background: 'var(--surface)', height: '100px' }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Sales Pipeline</h1>
        </div>
        <div className="rounded-lg p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <AlertCircle size={20} style={{ color: '#ef4444' }} />
            <p style={{ color: 'var(--text-muted)' }}>Failed to load HubSpot data: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Sales Pipeline</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          {deals.length} deals in HubSpot
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-lg p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} style={{ color: 'var(--accent)' }} />
            <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Open Pipeline</span>
          </div>
          <div className="text-xl font-bold" style={{ color: 'var(--text)' }}>{formatCurrency(totalPipeline)}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{openDeals.length} deals</div>
        </div>

        <div className="rounded-lg p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={14} style={{ color: '#22c55e' }} />
            <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Closed Won</span>
          </div>
          <div className="text-xl font-bold" style={{ color: '#22c55e' }}>{formatCurrency(totalWon)}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{wonDeals.length} deals</div>
        </div>

        <div className="rounded-lg p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={14} style={{ color: '#f59e0b' }} />
            <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Win Rate</span>
          </div>
          <div className="text-xl font-bold" style={{ color: 'var(--text)' }}>{winRate}%</div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{wonDeals.length}W / {lostDeals.length}L</div>
        </div>

        <div className="rounded-lg p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} style={{ color: '#818cf8' }} />
            <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Avg Deal Size</span>
          </div>
          <div className="text-xl font-bold" style={{ color: 'var(--text)' }}>
            {openDeals.length > 0 ? formatCurrency(Math.round(totalPipeline / openDeals.length)) : '—'}
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>open deals</div>
        </div>
      </div>

      {/* Pipeline stages */}
      <div className="rounded-lg p-5 mb-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h3 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: 'var(--text-muted)' }}>
          Pipeline Stages
        </h3>

        {sortedStages.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No open deals in the pipeline.</p>
        ) : (
          <div className="space-y-4">
            {sortedStages.map(([stageId, { label, deals: stageDeals }], idx) => {
              const color = getStageColor(stageId, idx);
              const stageTotal = stageDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
              return (
                <div key={stageId}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                      <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{label}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: color + '22', color }}>
                        {stageDeals.length}
                      </span>
                    </div>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                      {formatCurrency(stageTotal)}
                    </span>
                  </div>
                  <div className="space-y-1 ml-5">
                    {stageDeals.map(deal => (
                      <div
                        key={deal.id}
                        className="flex items-center justify-between rounded-md px-3 py-2"
                        style={{ background: 'var(--bg)' }}
                      >
                        <div className="flex-1 min-w-0">
                          <span className="text-sm truncate block" style={{ color: 'var(--text)' }}>{deal.name}</span>
                          {deal.ownerName && (
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{deal.ownerName}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 ml-4">
                          <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                            {formatCurrency(deal.amount)}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {formatDate(deal.closeDate)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Closed won deals */}
      {wonDeals.length > 0 && (
        <div className="rounded-lg p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h3 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: '#22c55e' }}>
            Closed Won
          </h3>
          <div className="space-y-1">
            {wonDeals.map(deal => (
              <div
                key={deal.id}
                className="flex items-center justify-between rounded-md px-3 py-2"
                style={{ background: 'var(--bg)' }}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <CheckCircle size={14} style={{ color: '#22c55e' }} />
                  <span className="text-sm truncate" style={{ color: 'var(--text)' }}>{deal.name}</span>
                </div>
                <div className="flex items-center gap-4 ml-4">
                  <span className="text-sm font-bold" style={{ color: '#22c55e' }}>{formatCurrency(deal.amount)}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(deal.closeDate)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
