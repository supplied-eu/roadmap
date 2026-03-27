'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { isAdmin } from '@/lib/auth';
import { Calendar, Mail, CheckSquare, Clock, ExternalLink, Circle } from 'lucide-react';
import { useEffect, useState } from 'react';

// ── Types ──────────────────────────────────────────────────────
type Issue = {
  id: string; identifier: string; title: string; priority: number;
  status: string; statusType: string; statusColor: string;
  assignee: string; project: string; url: string;
  labels: { name: string; color: string }[];
};
type CalEvent = {
  id: string; title: string; start: string; end: string;
  isToday: boolean; location: string; meetLink: string; allDay: boolean;
};
type Email = {
  id: string; from: string; subject: string; date: string;
  snippet: string; unread: boolean;
};

// ── Helpers ────────────────────────────────────────────────────
function formatTime(iso: string) {
  if (!iso || !iso.includes('T')) return 'All day';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function parseFrom(from: string) {
  const match = from.match(/^"?(.+?)"?\s*<.+>/);
  return match ? match[1] : from.split('@')[0];
}

function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const priorityColors: Record<number, string> = {
  1: '#f87171', // urgent - red
  2: '#fb923c', // high - orange
  3: '#facc15', // medium - yellow
  4: '#94a3b8', // low - gray
};

// ── Card wrapper ───────────────────────────────────────────────
function Card({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="rounded-lg p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 mb-4">
        <Icon size={16} style={{ color: 'var(--accent)' }} />
        <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useUser();
  const firstName = user?.name?.split(' ')[0] || 'there';
  const admin = isAdmin(user?.email);

  const [tasks, setTasks] = useState<Issue[]>([]);
  const [calendar, setCalendar] = useState<CalEvent[]>([]);
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState({ tasks: true, calendar: true, emails: true });

  useEffect(() => {
    if (!user?.email) return;

    // Fetch Linear tasks
    fetch(`/api/linear?email=${encodeURIComponent(user.email)}`)
      .then(r => r.json())
      .then(data => {
        setTasks(data.issues || []);
        setLoading(l => ({ ...l, tasks: false }));
      })
      .catch(() => setLoading(l => ({ ...l, tasks: false })));

    // Fetch Google Calendar + Gmail
    const userName = user.name?.split(' ')[0]?.toLowerCase() || 'johann';
    fetch(`/api/google?user=${userName}`)
      .then(r => r.json())
      .then(data => {
        setCalendar((data.calendar || []).filter((e: CalEvent) => e.isToday));
        setEmails(data.emails || []);
        setLoading(l => ({ ...l, calendar: false, emails: false }));
      })
      .catch(() => setLoading(l => ({ ...l, calendar: false, emails: false })));
  }, [user]);

  const todayEvents = calendar;

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
        {/* Left column */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* Tasks */}
          <Card title="My Tasks" icon={CheckSquare}>
            {loading.tasks ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="rounded-md p-3 animate-pulse" style={{ background: 'var(--bg)', height: '48px' }} />
                ))}
              </div>
            ) : tasks.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No tasks assigned to you right now.</p>
            ) : (
              <div className="space-y-1">
                {tasks.slice(0, 10).map(task => (
                  <a
                    key={task.id}
                    href={task.url}
                    target="_blank"
                    rel="noopener"
                    className="flex items-center gap-3 rounded-md px-3 py-2 transition-colors"
                    style={{ color: 'var(--text)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <Circle
                      size={10}
                      fill={task.statusColor || '#666'}
                      stroke={task.statusColor || '#666'}
                    />
                    <span className="text-xs font-mono" style={{ color: 'var(--text-muted)', minWidth: '72px' }}>
                      {task.identifier}
                    </span>
                    <span className="text-sm flex-1 truncate">{task.title}</span>
                    {task.priority <= 2 && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{ background: priorityColors[task.priority] + '22', color: priorityColors[task.priority] }}
                      >
                        {task.priority === 1 ? 'Urgent' : 'High'}
                      </span>
                    )}
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{task.status}</span>
                  </a>
                ))}
                {tasks.length > 10 && (
                  <p className="text-xs pt-2 pl-3" style={{ color: 'var(--text-muted)' }}>
                    + {tasks.length - 10} more tasks
                  </p>
                )}
              </div>
            )}
          </Card>

          {/* Recent Emails */}
          <Card title="Recent Emails" icon={Mail}>
            {loading.emails ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="rounded-md p-3 animate-pulse" style={{ background: 'var(--bg)', height: '48px' }} />
                ))}
              </div>
            ) : emails.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No recent emails.</p>
            ) : (
              <div className="space-y-1">
                {emails.map(email => (
                  <div
                    key={email.id}
                    className="rounded-md px-3 py-2"
                    style={{ background: email.unread ? 'var(--bg)' : 'transparent' }}
                  >
                    <div className="flex items-center gap-2">
                      {email.unread && <Circle size={6} fill="var(--accent)" stroke="var(--accent)" />}
                      <span className="text-sm font-medium flex-1 truncate" style={{ color: 'var(--text)' }}>
                        {parseFrom(email.from)}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {timeAgo(email.date)}
                      </span>
                    </div>
                    <p className="text-sm truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {email.subject}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right column - sidebar */}
        <div className="flex flex-col gap-5">
          {/* Today's Schedule */}
          <Card title="Today's Schedule" icon={Calendar}>
            {loading.calendar ? (
              <div className="space-y-2">
                {[1, 2].map(i => (
                  <div key={i} className="rounded-md p-3 animate-pulse" style={{ background: 'var(--bg)', height: '56px' }} />
                ))}
              </div>
            ) : todayEvents.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No events today.</p>
            ) : (
              <div className="space-y-2">
                {todayEvents.map(ev => (
                  <div
                    key={ev.id}
                    className="rounded-md p-3"
                    style={{ background: 'var(--bg)', borderLeft: '3px solid var(--accent)' }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{ev.title}</span>
                      {ev.meetLink && (
                        <a href={ev.meetLink} target="_blank" rel="noopener" title="Join meeting">
                          <ExternalLink size={12} style={{ color: 'var(--accent)' }} />
                        </a>
                      )}
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      {formatTime(ev.start)} – {formatTime(ev.end)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* WBSO Time Tracker (admin only) */}
          {admin && (
            <Card title="WBSO Time Tracker" icon={Clock}>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Weekly R&D hour tracking for WBSO compliance.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {['Block 1', 'Block 2', 'Block 3', 'Block 4'].map(block => (
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
