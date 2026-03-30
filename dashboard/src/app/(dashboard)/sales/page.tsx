'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, DollarSign, Clock, CheckCircle, AlertCircle, X, ExternalLink, User, Calendar } from 'lucide-react';

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

type Pipeline = {
  id: string;
  label: string;
  stages: { id: string; label: string; displayOrder: number }[];
};

const STAGE_COLORS = ['#60a5fa', '#818cf8', '#a78bfa', '#c084fc', '#f59e0b', '#fb923c', '#f472b6', '#34d399', '#38bdf8'];
const CLOSED_WON_COLOR = '#22c55e';
const CLOSED_LOST_COLOR = '#ef4444';

function getStageColor(stageId: string, index: number) {
  if (stageId === 'closedwon' || stageId.toLowerCase().includes('won')) return CLOSED_WON_COLOR;
  if (stageId === 'closedlost' || stageId.toLowerCase().includes('lost')) return CLOSED_LOST_COLOR;
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

function isClosedStage(stageId: string, label: string) {
  return stageId === 'closedwon' || stageId === 'closedlost' ||
    label.toLowerCase().includes('closed won') || label.toLowerCase().includes('closed lost');
}

export default function SalesPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPipeline, setSelectedPipeline] = useState<string | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [view, setView] = useState<'kanban' | 'funnel'>('kanban');

  useEffect(() => {
    fetch('/api/hubspot')
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setDeals(data.deals || []);
          setPipelines(data.pipelines || []);
          // Auto-select the pipeline with the most deals
          const pipelineCounts: Record<string, number> = {};
          for (const d of data.deals || []) {
            pipelineCounts[d.pipeline] = (pipelineCounts[d.pipeline] || 0) + 1;
          }
          const topPipeline = Object.entries(pipelineCounts).sort((a, b) => b[1] - a[1])[0];
          if (topPipeline) setSelectedPipeline(topPipeline[0]);
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Filter deals by selected pipeline
  const pipelineDeals = selectedPipeline ? deals.filter(d => d.pipeline === selectedPipeline) : deals;
  const currentPipeline = pipelines.find(p => p.id === selectedPipeline);

  // Get ordered stages for current pipeline (exclude closed stages from kanban)
  const orderedStages = currentPipeline?.stages || [];
  const openStages = orderedStages.filter(s => !isClosedStage(s.id, s.label));
  const closedWonStage = orderedStages.find(s => s.id === 'closedwon' || s.label.toLowerCase().includes('closed won'));
  const closedLostStage = orderedStages.find(s => s.id === 'closedlost' || s.label.toLowerCase().includes('closed lost'));

  // Group deals by stage
  const dealsByStage = new Map<string, Deal[]>();
  for (const deal of pipelineDeals) {
    if (!dealsByStage.has(deal.stage)) dealsByStage.set(deal.stage, []);
    dealsByStage.get(deal.stage)!.push(deal);
  }

  // Pipeline stats
  const openDeals = pipelineDeals.filter(d => !isClosedStage(d.stage, d.stageLabel));
  const wonDeals = pipelineDeals.filter(d => d.stage === 'closedwon' || d.stageLabel.toLowerCase().includes('closed won'));
  const lostDeals = pipelineDeals.filter(d => d.stage === 'closedlost' || d.stageLabel.toLowerCase().includes('closed lost'));
  const totalPipeline = openDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
  const totalWon = wonDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
  const winRate = wonDeals.length + lostDeals.length > 0
    ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100)
    : 0;

  // Funnel data
  const funnelData = openStages.map((stage, idx) => {
    const stageDeals = dealsByStage.get(stage.id) || [];
    return {
      label: stage.label,
      count: stageDeals.length,
      value: stageDeals.reduce((sum, d) => sum + (d.amount || 0), 0),
      color: getStageColor(stage.id, idx),
    };
  });

  if (loading) {
    return (
      <div className="p-6 max-w-full">
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text)' }}>Sales Pipeline</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading HubSpot deals...</p>
        <div className="grid grid-cols-4 gap-4 mt-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-lg p-5 animate-pulse" style={{ background: 'var(--surface)', height: '100px' }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-full">
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text)' }}>Sales Pipeline</h1>
        <div className="rounded-lg p-6 mt-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <AlertCircle size={20} style={{ color: '#ef4444' }} />
            <p style={{ color: 'var(--text-muted)' }}>Failed to load HubSpot data: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  const maxFunnelCount = Math.max(...funnelData.map(d => d.count), 1);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Sales Pipeline</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              {pipelineDeals.length} deals{currentPipeline ? ` in ${currentPipeline.label}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Pipeline selector */}
            {pipelines.length > 1 && (
              <select
                value={selectedPipeline || ''}
                onChange={e => setSelectedPipeline(e.target.value)}
                className="text-sm rounded-md px-3 py-1.5"
                style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}
              >
                {pipelines.map(p => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            )}
            {/* View toggle */}
            <div className="flex rounded-md overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              {(['kanban', 'funnel'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className="px-3 py-1.5 text-xs font-medium capitalize"
                  style={{
                    background: view === v ? 'var(--accent)' : 'var(--surface)',
                    color: view === v ? '#fff' : 'var(--text-muted)',
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard icon={<TrendingUp size={14} />} iconColor="var(--accent)" label="Open Pipeline" value={formatCurrency(totalPipeline)} sub={`${openDeals.length} deals`} />
          <StatCard icon={<CheckCircle size={14} />} iconColor={CLOSED_WON_COLOR} label="Closed Won" value={formatCurrency(totalWon)} sub={`${wonDeals.length} deals`} valueColor={CLOSED_WON_COLOR} />
          <StatCard icon={<DollarSign size={14} />} iconColor="#f59e0b" label="Win Rate" value={`${winRate}%`} sub={`${wonDeals.length}W / ${lostDeals.length}L`} />
          <StatCard icon={<Clock size={14} />} iconColor="#818cf8" label="Avg Deal Size" value={openDeals.length > 0 ? formatCurrency(Math.round(totalPipeline / openDeals.length)) : '—'} sub="open deals" />
        </div>

        {view === 'funnel' ? (
          /* ── Funnel view ── */
          <div className="rounded-lg p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h3 className="text-sm font-semibold uppercase tracking-wide mb-5" style={{ color: 'var(--text-muted)' }}>Pipeline Funnel</h3>
            <div className="space-y-3">
              {funnelData.map((stage, idx) => {
                const widthPct = Math.max(15, (stage.count / maxFunnelCount) * 100);
                return (
                  <div key={idx} className="flex items-center gap-4">
                    <div className="w-32 shrink-0 text-right">
                      <span className="text-xs font-medium" style={{ color: 'var(--text)' }}>{stage.label}</span>
                    </div>
                    <div className="flex-1 relative">
                      <div
                        className="h-10 rounded-md flex items-center px-3 transition-all"
                        style={{
                          width: `${widthPct}%`,
                          background: `linear-gradient(135deg, ${stage.color}, ${stage.color}cc)`,
                          minWidth: '80px',
                        }}
                      >
                        <span className="text-xs font-bold text-white">{stage.count} deals</span>
                      </div>
                    </div>
                    <div className="w-28 shrink-0 text-right">
                      <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{formatCurrency(stage.value)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Won / Lost summary bar */}
            <div className="flex items-center gap-4 mt-6 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: CLOSED_WON_COLOR }} />
                <span className="text-xs font-medium" style={{ color: CLOSED_WON_COLOR }}>Won: {wonDeals.length} ({formatCurrency(totalWon)})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: CLOSED_LOST_COLOR }} />
                <span className="text-xs font-medium" style={{ color: CLOSED_LOST_COLOR }}>Lost: {lostDeals.length}</span>
              </div>
            </div>
          </div>
        ) : (
          /* ── Kanban view ── */
          <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: '400px' }}>
            {openStages.map((stage, idx) => {
              const stageDeals = dealsByStage.get(stage.id) || [];
              const stageTotal = stageDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
              const color = getStageColor(stage.id, idx);

              return (
                <div
                  key={stage.id}
                  className="shrink-0 rounded-lg flex flex-col"
                  style={{
                    width: '260px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {/* Column header */}
                  <div className="p-3 shrink-0" style={{ borderBottom: `2px solid ${color}` }}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text)' }}>
                          {stage.label}
                        </span>
                      </div>
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: color + '22', color }}>
                        {stageDeals.length}
                      </span>
                    </div>
                    <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                      {formatCurrency(stageTotal)}
                    </span>
                  </div>

                  {/* Deal cards */}
                  <div className="flex-1 overflow-auto p-2 space-y-2">
                    {stageDeals.length === 0 && (
                      <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>No deals</p>
                    )}
                    {stageDeals.map(deal => (
                      <div
                        key={deal.id}
                        className="rounded-md p-3 cursor-pointer transition-all hover:ring-1"
                        style={{
                          background: 'var(--bg)',
                          border: '1px solid var(--border)',
                          '--tw-ring-color': color,
                        } as any}
                        onClick={() => setSelectedDeal(deal)}
                      >
                        <p className="text-sm font-medium truncate mb-1" style={{ color: 'var(--text)' }}>{deal.name}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold" style={{ color }}>{formatCurrency(deal.amount)}</span>
                          {deal.closeDate && (
                            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                              {formatDate(deal.closeDate)}
                            </span>
                          )}
                        </div>
                        {deal.ownerName && (
                          <div className="flex items-center gap-1 mt-1.5">
                            <div className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: color + '22', color }}>
                              {deal.ownerName.charAt(0)}
                            </div>
                            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{deal.ownerName}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Closed Won column */}
            {wonDeals.length > 0 && (
              <div className="shrink-0 rounded-lg flex flex-col" style={{ width: '260px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="p-3 shrink-0" style={{ borderBottom: `2px solid ${CLOSED_WON_COLOR}` }}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={12} style={{ color: CLOSED_WON_COLOR }} />
                      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: CLOSED_WON_COLOR }}>Closed Won</span>
                    </div>
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: CLOSED_WON_COLOR + '22', color: CLOSED_WON_COLOR }}>
                      {wonDeals.length}
                    </span>
                  </div>
                  <span className="text-xs font-medium" style={{ color: CLOSED_WON_COLOR }}>{formatCurrency(totalWon)}</span>
                </div>
                <div className="flex-1 overflow-auto p-2 space-y-2">
                  {wonDeals.map(deal => (
                    <div
                      key={deal.id}
                      className="rounded-md p-3 cursor-pointer hover:ring-1"
                      style={{ background: 'var(--bg)', border: '1px solid var(--border)', '--tw-ring-color': CLOSED_WON_COLOR } as any}
                      onClick={() => setSelectedDeal(deal)}
                    >
                      <p className="text-sm font-medium truncate mb-1" style={{ color: 'var(--text)' }}>{deal.name}</p>
                      <span className="text-sm font-bold" style={{ color: CLOSED_WON_COLOR }}>{formatCurrency(deal.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Detail sidebar ── */}
      {selectedDeal && (
        <div className="w-80 shrink-0 overflow-auto" style={{ background: 'var(--surface)', borderLeft: '1px solid var(--border)' }}>
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Deal Details</h3>
              <button onClick={() => setSelectedDeal(null)} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
                <X size={16} />
              </button>
            </div>

            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text)' }}>{selectedDeal.name}</h2>

            <div className="space-y-4">
              <DetailRow icon={<DollarSign size={14} />} label="Amount" value={formatCurrency(selectedDeal.amount)} />
              <DetailRow icon={<TrendingUp size={14} />} label="Stage" value={selectedDeal.stageLabel} />
              <DetailRow icon={<User size={14} />} label="Owner" value={selectedDeal.ownerName || '—'} />
              <DetailRow icon={<Calendar size={14} />} label="Close Date" value={formatDate(selectedDeal.closeDate)} />
            </div>

            <a
              href={`https://app.hubspot.com/contacts/27215736/record/0-3/${selectedDeal.id}`}
              target="_blank"
              rel="noopener"
              className="flex items-center gap-2 mt-6 px-4 py-2 rounded-md text-sm font-medium transition-colors hover:opacity-90"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              <ExternalLink size={14} />
              View in HubSpot
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, iconColor, label, value, sub, valueColor }: {
  icon: React.ReactNode; iconColor: string; label: string; value: string; sub: string; valueColor?: string;
}) {
  return (
    <div className="rounded-lg p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color: iconColor }}>{icon}</span>
        <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</span>
      </div>
      <div className="text-xl font-bold" style={{ color: valueColor || 'var(--text)' }}>{value}</div>
      <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{sub}</div>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5" style={{ color: 'var(--text-muted)' }}>{icon}</span>
      <div>
        <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</p>
        <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{value}</p>
      </div>
    </div>
  );
}
