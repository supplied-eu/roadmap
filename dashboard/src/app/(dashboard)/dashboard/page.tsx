'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { isAdmin } from '@/lib/auth';
import { Calendar, Mail, CheckSquare, Clock } from 'lucide-react';

function Card({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div
      className="rounded-lg p-5"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Icon size={16} style={{ color: 'var(--accent)' }} />
        <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useUser();
  const firstName = user?.name?.split(' ')[0] || 'there';
  const admin = isAdmin(user?.email);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {firstName}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column - takes 2 cols */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* Tasks */}
          <Card title="My Tasks" icon={CheckSquare}>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Connect Linear API to load your assigned tasks here.
            </p>
            <div className="mt-3 space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-md p-3 animate-pulse"
                  style={{ background: 'var(--bg)', height: '48px' }}
                />
              ))}
            </div>
          </Card>

          {/* Recent Emails */}
          <Card title="Recent Emails" icon={Mail}>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Connect Google API to load your recent emails here.
            </p>
            <div className="mt-3 space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-md p-3 animate-pulse"
                  style={{ background: 'var(--bg)', height: '48px' }}
                />
              ))}
            </div>
          </Card>
        </div>

        {/* Right column - sidebar */}
        <div className="flex flex-col gap-5">
          {/* Today's Schedule */}
          <Card title="Today's Schedule" icon={Calendar}>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Connect Google Calendar to see today's events.
            </p>
            <div className="mt-3 space-y-2">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-md p-3 animate-pulse"
                  style={{ background: 'var(--bg)', height: '56px' }}
                />
              ))}
            </div>
          </Card>

          {/* Time Tracking (admin only) */}
          {admin && (
            <Card title="WBSO Time Tracker" icon={Clock}>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Weekly R&D hour tracking for WBSO compliance.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {['Block 1', 'Block 2', 'Block 3', 'Block 4'].map((block) => (
                  <div
                    key={block}
                    className="rounded-md p-3 text-center"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
                  >
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{block}</div>
                    <div className="text-lg font-bold mt-1" style={{ color: 'var(--accent)' }}>—</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>hours</div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
