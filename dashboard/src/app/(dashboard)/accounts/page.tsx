'use client';

import { Users } from 'lucide-react';

export default function AccountsPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Accounts</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Customer accounts and website visitors
        </p>
      </div>

      <div
        className="rounded-lg p-8 text-center"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <Users size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
        <p style={{ color: 'var(--text-muted)' }}>
          Connect HubSpot and Leadfeeder APIs to display account data and website visitors here.
        </p>
      </div>
    </div>
  );
}
