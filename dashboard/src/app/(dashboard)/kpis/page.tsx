'use client';

import { BarChart3 } from 'lucide-react';

export default function KpisPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>KPIs</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Key performance indicators and business metrics
        </p>
      </div>

      <div
        className="rounded-lg p-8 text-center"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <BarChart3 size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
        <p style={{ color: 'var(--text-muted)' }}>
          Connect data sources to display MRR, burn rate, runway, and other KPIs here.
        </p>
      </div>
    </div>
  );
}
