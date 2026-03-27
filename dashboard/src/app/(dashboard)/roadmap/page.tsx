'use client';

import { GitBranch } from 'lucide-react';

export default function RoadmapPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Roadmap</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Product development timeline from Linear
        </p>
      </div>

      <div
        className="rounded-lg p-8 text-center"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <GitBranch size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
        <p style={{ color: 'var(--text-muted)' }}>
          Connect Linear API to display your project roadmap and Gantt chart here.
        </p>
      </div>
    </div>
  );
}
