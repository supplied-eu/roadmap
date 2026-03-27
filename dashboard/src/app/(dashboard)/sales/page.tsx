'use client';

import { TrendingUp } from 'lucide-react';

export default function SalesPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Sales Pipeline</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          HubSpot deals and pipeline overview
        </p>
      </div>

      <div
        className="rounded-lg p-8 text-center"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <TrendingUp size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
        <p style={{ color: 'var(--text-muted)' }}>
          Connect HubSpot API to display your sales pipeline and deal stages here.
        </p>
      </div>
    </div>
  );
}
