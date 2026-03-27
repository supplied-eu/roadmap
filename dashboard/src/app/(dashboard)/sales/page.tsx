'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, DollarSign, Clock, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';

type Deal = {
  id: string;
  name: string;
  stage: string;
  amount: number | null;
  closeDate: string | null;
  ownerName: string | null;
  pipeline: string;
};

// Map HubSpot stage IDs to human-readable names + order
const STAGE_MAP: Record<string, { label: string; order: number; color: string }> = {
  appointmentscheduled: { label: 'Appointment Scheduled', order: 1, color: '#60a5fa' },
  qualifiedtobuy: { label: 'Qualified to Buy', order: 2, color: '#818cf8' },
  presentationscheduled: { label: 'Presentation Scheduled', order: 3, color: '#a78bfa' },
  decisionmakerboughtin: { label: 'Decision Maker Bought In', order: 4, color: '#c084fc' },
  contractsent: { label: 'Contract Sent', order: 5, color: '#f59e0b' },
  closedwon: { label: 'Closed Won', order: 6, color: '#22c55e' },
  closedlost: { label: 'Closed Lost', order: 7, color: '#ef4444' },
};

function getStageMeta(stage: string) {
  return STAGE_MAP[stage] || { label: stage, order: 99, color: '#94a3b8' };
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

  // Group deals by stage for pipeline view
  const stageGroups = new Map<string, Deal[]>();
  for (const deal of openDeals) {
    const key = deal.stage;
    if (!stageGroups.has(key)) stageGroups.set(key, []);
    stageGroups.get(key)!.push(deal);
  }
  const sortedStages = [...stageGroups.entries()].sort(
    (a, b) => getStageMeta(a[0]).order - getStageMeta(b[0]).order
  );

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
            {sortedStages.map(([stageId, stageDeals]) => {
              const meta = getStageMeta(stageId);
              const stageTotal = stageDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
              return (
                <div key={stageId}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: meta.color }} />
                      <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{meta.label}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: meta.color + '22', color: meta.color }}>
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
