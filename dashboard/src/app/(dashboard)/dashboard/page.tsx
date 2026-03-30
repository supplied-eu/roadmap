'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { isAdmin } from '@/lib/auth';
import { Calendar, Mail, CheckSquare, Clock, ExternalLink, Circle, X, AlarmClock, CheckCircle, Undo2, FileText, ChevronDown, ChevronUp, GripVertical, Phone, DollarSign } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';

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
type Meeting = {
  id: string; title: string; date: string; source: string;
  summary: string;
  suggestedTasks: { task: string; priority: string; category: string }[];
};
type HsDeal = {
  id: string; name: string; stage: string; stageLabel: string;
  amount: number | null; closeDate: string | null; ownerName: string | null;
};
type HsTask = {
  id: string; subject: string; status: string; priority: string;
  dueDate: string | null; ownerName: string | null; type: string;
};

// Combined stream item
type StreamItem = {
  id: string; title: string; source: 'linear' | 'hubspot' | 'gcal' | 'gmail';
  dueDate: string | null; status: string; url: string | null;
  priority: number; meta?: string; assignee?: string;
};

type Toast = { id: string; message: string; undoAction?: () => void };

// ── Helpers ────────────────────────────────────────────────────
function formatTime(iso: string) {
  if (!iso || !iso.includes('T')) return 'All day';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
function parseFrom(from: string) {
  const match = from.match(/^"?(.+?)"?\s*<.+>/);
  return match ? match[1] : from.split('@')[0];
}
function todayStr() { return new Date().toISOString().split('T')[0]; }
function isOverdue(d: string | null) { return !!d && d.split('T')[0] < todayStr(); }
function isDueToday(d: string | null) { return !!d && d.split('T')[0] === todayStr(); }
function isDueThisWeek(d: string | null) {
  if (!d) return false;
  const dt = new Date(d);
  const now = new Date();
  const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() + 7);
  return dt > now && dt <= weekEnd && !isDueToday(d);
}
function formatDate(d: string | null) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
function formatCurrency(n: number | null) {
  if (!n) return '—';
  return new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

const SOURCE_COLORS: Record<string, string> = {
  linear: '#6366f1', hubspot: '#f97316', gcal: '#3b82f6', gmail: '#ef4444',
};
const SOURCE_LABELS: Record<string, string> = {
  linear: 'Linear', hubspot: 'HubSpot', gcal: 'Calendar', gmail: 'Gmail',
};

const priCatColors: Record<string, string> = {
  high: '#f97316', medium: '#facc15', low: '#94a3b8', urgent: '#ef4444',
};

// ── Toast notification ─────────────────────────────────────────
function ToastBar({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(t => (
        <div key={t.id} className="flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg text-sm"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}>
          <span>{t.message}</span>
          {t.undoAction && (
            <button onClick={() => { t.undoAction!(); onDismiss(t.id); }}
              className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded"
              style={{ background: 'var(--accent)', color: '#fff' }}>
              <Undo2 size={10} /> Undo
            </button>
          )}
          <button onClick={() => onDismiss(t.id)} style={{ color: 'var(--text-muted)' }}><X size={14} /></button>
        </div>
      ))}
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
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [hsTasks, setHsTasks] = useState<HsTask[]>([]);
  const [hsDeals, setHsDeals] = useState<HsDeal[]>([]);
  const [loading, setLoading] = useState({ tasks: true, calendar: true, hubspot: true, meetings: true });

  // Task management state
  const [hiddenTasks, setHiddenTasks] = useState<Set<string>>(new Set());
  const [snoozedTasks, setSnoozedTasks] = useState<Set<string>>(new Set());
  const [doneTasks, setDoneTasks] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [expandedMeeting, setExpandedMeeting] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [personFilter, setPersonFilter] = useState<string>('all');

  const addToast = useCallback((message: string, undoAction?: () => void) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, undoAction }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  }, []);
  const dismissToast = useCallback((id: string) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  const markDone = useCallback((taskId: string, taskTitle: string) => {
    setDoneTasks(prev => new Set(prev).add(taskId));
    addToast(`"${taskTitle}" marked done`, () => {
      setDoneTasks(prev => { const next = new Set(prev); next.delete(taskId); return next; });
    });
  }, [addToast]);
  const snoozeTask = useCallback((taskId: string, taskTitle: string) => {
    setSnoozedTasks(prev => new Set(prev).add(taskId));
    addToast(`"${taskTitle}" snoozed until tomorrow`, () => {
      setSnoozedTasks(prev => { const next = new Set(prev); next.delete(taskId); return next; });
    });
  }, [addToast]);
  const dismissTask = useCallback((taskId: string, taskTitle: string) => {
    setHiddenTasks(prev => new Set(prev).add(taskId));
    addToast(`"${taskTitle}" dismissed`, () => {
      setHiddenTasks(prev => { const next = new Set(prev); next.delete(taskId); return next; });
    });
  }, [addToast]);

  useEffect(() => {
    if (!user?.email) return;

    fetch(`/api/linear?email=${encodeURIComponent(user.email)}`)
      .then(r => r.json())
      .then(data => { setTasks(data.issues || []); setLoading(l => ({ ...l, tasks: false })); })
      .catch(() => setLoading(l => ({ ...l, tasks: false })));

    const userName = user.name?.split(' ')[0]?.toLowerCase() || 'johann';
    fetch(`/api/google?user=${userName}`)
      .then(r => r.json())
      .then(data => {
        setCalendar((data.calendar || []).filter((e: CalEvent) => e.isToday));
        setEmails(data.emails || []);
        setLoading(l => ({ ...l, calendar: false }));
      })
      .catch(() => setLoading(l => ({ ...l, calendar: false })));

    fetch('/api/hubspot')
      .then(r => r.json())
      .then(data => {
        setHsTasks((data.tasks || []).filter((t: HsTask) => t.status !== 'COMPLETED'));
        setHsDeals(data.deals || []);
        setLoading(l => ({ ...l, hubspot: false }));
      })
      .catch(() => setLoading(l => ({ ...l, hubspot: false })));

    fetch('/api/meetings')
      .then(r => r.json())
      .then(data => { setMeetings(data.meetings || []); setLoading(l => ({ ...l, meetings: false })); })
      .catch(() => setLoading(l => ({ ...l, meetings: false })));
  }, [user]);

  // Build combined stream
  const streamItems: StreamItem[] = [];

  // Linear tasks
  for (const t of tasks) {
    if (hiddenTasks.has(t.id) || snoozedTasks.has(t.id) || doneTasks.has(t.id)) continue;
    streamItems.push({
      id: `lin_${t.id}`, title: t.title, source: 'linear',
      dueDate: null, status: t.status, url: t.url,
      priority: t.priority, meta: t.identifier, assignee: t.assignee,
    });
  }

  // HubSpot tasks
  for (const t of hsTasks) {
    if (hiddenTasks.has(t.id) || snoozedTasks.has(t.id) || doneTasks.has(t.id)) continue;
    streamItems.push({
      id: `hs_${t.id}`, title: t.subject, source: 'hubspot',
      dueDate: t.dueDate, status: t.status, url: null,
      priority: t.priority === 'HIGH' ? 2 : t.priority === 'MEDIUM' ? 3 : 4,
      meta: t.type, assignee: t.ownerName || undefined,
    });
  }

  // Person filter (admin only)
  const uniqueAssignees = [...new Set(streamItems.map(i => i.assignee).filter(Boolean))] as string[];
  const filteredStream = personFilter === 'all' ? streamItems
    : streamItems.filter(i => i.assignee?.toLowerCase().includes(personFilter.toLowerCase()));

  // Group by urgency
  const overdue = filteredStream.filter(i => isOverdue(i.dueDate));
  const dueToday = filteredStream.filter(i => isDueToday(i.dueDate));
  const thisWeek = filteredStream.filter(i => isDueThisWeek(i.dueDate));
  const later = filteredStream.filter(i => !isOverdue(i.dueDate) && !isDueToday(i.dueDate) && !isDueThisWeek(i.dueDate));

  // Sort each group by priority
  const sortByPri = (a: StreamItem, b: StreamItem) => a.priority - b.priority;
  overdue.sort(sortByPri);
  dueToday.sort(sortByPri);
  thisWeek.sort(sortByPri);
  later.sort(sortByPri);

  // Deals closing this week for sidebar
  const now = new Date();
  const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() + 7);
  const dealsClosingSoon = hsDeals.filter(d => {
    if (!d.closeDate) return false;
    const cd = new Date(d.closeDate);
    return cd >= now && cd <= weekEnd && d.stageLabel && !d.stageLabel.toLowerCase().includes('closed');
  });

  const isLoadingAll = loading.tasks && loading.calendar && loading.hubspot;
  const todayEvents = calendar;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: Task stream */}
      <div className="flex-1 overflow-auto" style={{ flex: '3' }}>
        {/* Greeting */}
        <div className="px-6 pt-5 pb-3">
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {firstName}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {isLoadingAll ? (
          <div className="px-6 space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="rounded-md animate-pulse" style={{ background: 'var(--surface)', height: '44px' }} />
            ))}
          </div>
        ) : (
          <>
            {overdue.length > 0 && (
              <StreamSection label="OVERDUE" count={overdue.length} color="#ef4444"
                items={overdue} expandedItem={expandedItem} setExpandedItem={setExpandedItem}
                onDone={markDone} onSnooze={snoozeTask} onDismiss={dismissTask} />
            )}
            {dueToday.length > 0 && (
              <StreamSection label="DUE TODAY" count={dueToday.length} color="var(--accent)"
                items={dueToday} expandedItem={expandedItem} setExpandedItem={setExpandedItem}
                onDone={markDone} onSnooze={snoozeTask} onDismiss={dismissTask} />
            )}
            {thisWeek.length > 0 && (
              <StreamSection label="THIS WEEK" count={thisWeek.length} color="#f59e0b"
                items={thisWeek} expandedItem={expandedItem} setExpandedItem={setExpandedItem}
                onDone={markDone} onSnooze={snoozeTask} onDismiss={dismissTask} />
            )}
            {later.length > 0 && (
              <StreamSection label="LATER" count={later.length} color="var(--text-muted)"
                items={later} expandedItem={expandedItem} setExpandedItem={setExpandedItem}
                onDone={markDone} onSnooze={snoozeTask} onDismiss={dismissTask} />
            )}
            {filteredStream.length === 0 && (
              <div className="px-6 py-8 text-center">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>All clear — no tasks right now.</p>
              </div>
            )}

            {/* Meeting Summaries */}
            {meetings.length > 0 && (
              <div className="px-6 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={14} style={{ color: 'var(--accent)' }} />
                  <h3 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Meeting Summaries</h3>
                </div>
                <div className="space-y-1.5">
                  {meetings.slice(0, 4).map(mtg => {
                    const isExpanded = expandedMeeting === mtg.id;
                    return (
                      <div key={mtg.id} className="rounded-md overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                        <button onClick={() => setExpandedMeeting(isExpanded ? null : mtg.id)}
                          className="w-full flex items-center gap-3 px-3 py-2 text-left hover:opacity-80">
                          {isExpanded ? <ChevronUp size={11} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={11} style={{ color: 'var(--text-muted)' }} />}
                          <span className="text-xs font-medium truncate flex-1" style={{ color: 'var(--text)' }}>{mtg.title}</span>
                          <span className="text-[9px] shrink-0" style={{ color: 'var(--text-muted)' }}>{mtg.date}</span>
                          {mtg.suggestedTasks.length > 0 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded shrink-0" style={{ background: 'var(--accent)', color: '#fff' }}>
                              {mtg.suggestedTasks.length} tasks
                            </span>
                          )}
                        </button>
                        {isExpanded && (
                          <div className="px-3 pb-2.5 border-t" style={{ borderColor: 'var(--border)' }}>
                            <p className="text-xs mt-2 mb-2" style={{ color: 'var(--text-muted)' }}>{mtg.summary}</p>
                            {mtg.suggestedTasks.length > 0 && (
                              <div className="space-y-1">
                                <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Suggested Tasks</span>
                                {mtg.suggestedTasks.map((st, i) => (
                                  <div key={i} className="flex items-center gap-2 text-xs rounded px-2 py-1" style={{ background: 'var(--bg)' }}>
                                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: priCatColors[st.priority] || '#94a3b8' }} />
                                    <span className="flex-1" style={{ color: 'var(--text)' }}>{st.task}</span>
                                    <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: (priCatColors[st.priority] || '#94a3b8') + '22', color: priCatColors[st.priority] || '#94a3b8' }}>
                                      {st.priority}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Right: Sidebar */}
      <div className="overflow-auto shrink-0" style={{ width: '320px', borderLeft: '1px solid var(--border)', background: 'var(--surface)' }}>
        {/* Person filter (admin only) */}
        {admin && uniqueAssignees.length > 0 && (
          <div className="px-4 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
            <span className="text-[8px] font-bold uppercase tracking-[1.5px] block mb-1.5" style={{ color: 'var(--text-muted)' }}>
              SHOWING FOR
            </span>
            <div className="flex flex-wrap gap-1">
              <button onClick={() => setPersonFilter('all')}
                className="text-[10px] px-2 py-0.5 rounded font-medium transition-colors"
                style={{ background: personFilter === 'all' ? 'var(--accent)' : 'var(--bg)', color: personFilter === 'all' ? '#fff' : 'var(--text-muted)' }}>
                All
              </button>
              {uniqueAssignees.slice(0, 6).map(name => (
                <button key={name} onClick={() => setPersonFilter(personFilter === name ? 'all' : name)}
                  className="text-[10px] px-2 py-0.5 rounded font-medium transition-colors"
                  style={{ background: personFilter === name ? 'var(--accent)' : 'var(--bg)', color: personFilter === name ? '#fff' : 'var(--text-muted)' }}>
                  {name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Deals closing soon */}
        <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-[8px] font-bold uppercase tracking-[1.5px] block mb-2" style={{ color: 'var(--text-muted)' }}>
            DEALS CLOSING THIS WEEK
          </span>
          {dealsClosingSoon.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No deals closing this week.</p>
          ) : (
            <div className="space-y-2">
              {dealsClosingSoon.map(d => (
                <div key={d.id} className="rounded-md p-2.5" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium truncate" style={{ color: 'var(--text)' }}>{d.name}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm font-bold" style={{ color: '#22c55e' }}>{formatCurrency(d.amount)}</span>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{formatDate(d.closeDate)}</span>
                  </div>
                  {d.ownerName && <span className="text-[9px] block mt-0.5" style={{ color: 'var(--text-muted)' }}>{d.ownerName}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Today's Schedule */}
        <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-[8px] font-bold uppercase tracking-[1.5px] block mb-2" style={{ color: 'var(--text-muted)' }}>
            TODAY&apos;S SCHEDULE
          </span>
          {loading.calendar ? (
            <div className="space-y-2">
              {[1, 2].map(i => <div key={i} className="rounded-md animate-pulse" style={{ background: 'var(--bg)', height: '48px' }} />)}
            </div>
          ) : todayEvents.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No events today.</p>
          ) : (
            <div className="space-y-1.5">
              {todayEvents.map(ev => (
                <div key={ev.id} className="rounded-md p-2.5" style={{ background: 'var(--bg)', borderLeft: '3px solid var(--accent)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium truncate" style={{ color: 'var(--text)' }}>{ev.title}</span>
                    {ev.meetLink && (
                      <a href={ev.meetLink} target="_blank" rel="noopener" title="Join">
                        <ExternalLink size={10} style={{ color: 'var(--accent)' }} />
                      </a>
                    )}
                  </div>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{formatTime(ev.start)} – {formatTime(ev.end)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Emails */}
        <div className="px-4 py-3">
          <span className="text-[8px] font-bold uppercase tracking-[1.5px] block mb-2" style={{ color: 'var(--text-muted)' }}>
            RECENT EMAILS
          </span>
          {emails.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No recent emails.</p>
          ) : (
            <div className="space-y-1">
              {emails.slice(0, 8).map(email => (
                <div key={email.id} className="rounded-md px-2.5 py-1.5"
                  style={{ background: email.unread ? 'var(--bg)' : 'transparent' }}>
                  <div className="flex items-center gap-1.5">
                    {email.unread && <Circle size={5} fill="var(--accent)" stroke="var(--accent)" />}
                    <span className="text-[11px] font-medium flex-1 truncate" style={{ color: 'var(--text)' }}>{parseFrom(email.from)}</span>
                  </div>
                  <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{email.subject}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ToastBar toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

// ── Stream section ─────────────────────────────────────────────
function StreamSection({ label, count, color, items, expandedItem, setExpandedItem, onDone, onSnooze, onDismiss }: {
  label: string; count: number; color: string; items: StreamItem[];
  expandedItem: string | null; setExpandedItem: (id: string | null) => void;
  onDone: (id: string, title: string) => void;
  onSnooze: (id: string, title: string) => void;
  onDismiss: (id: string, title: string) => void;
}) {
  return (
    <>
      <div className="px-6 py-1.5 sticky top-0 z-10" style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
        <span className="text-[8px] font-bold uppercase tracking-[1.5px]" style={{ color }}>{label} ({count})</span>
      </div>
      {items.map(item => {
        const rawId = item.id.replace(/^(lin_|hs_)/, '');
        const isExpanded = expandedItem === item.id;
        return (
          <div key={item.id} className="group">
            <div
              className="flex items-center gap-2 px-6 py-2 transition-colors cursor-pointer"
              style={{ borderBottom: '1px solid var(--border)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              onClick={() => setExpandedItem(isExpanded ? null : item.id)}
            >
              {/* Source badge */}
              <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0"
                style={{ background: SOURCE_COLORS[item.source] + '22', color: SOURCE_COLORS[item.source] }}>
                {SOURCE_LABELS[item.source]}
              </span>

              {/* Title */}
              {item.url ? (
                <a href={item.url} target="_blank" rel="noopener"
                  className="text-xs flex-1 truncate hover:underline"
                  style={{ color: 'var(--text)' }}
                  onClick={e => e.stopPropagation()}>
                  {item.title}
                </a>
              ) : (
                <span className="text-xs flex-1 truncate" style={{ color: 'var(--text)' }}>{item.title}</span>
              )}

              {/* Priority */}
              {item.priority <= 2 && (
                <span className="text-[9px] px-1 py-0.5 rounded shrink-0 font-bold"
                  style={{ background: (item.priority === 1 ? '#ef4444' : '#f97316') + '22', color: item.priority === 1 ? '#ef4444' : '#f97316' }}>
                  {item.priority === 1 ? 'URGENT' : 'HIGH'}
                </span>
              )}

              {/* Due date */}
              {item.dueDate && (
                <span className="text-[10px] shrink-0" style={{
                  color: isOverdue(item.dueDate) ? '#ef4444' : isDueToday(item.dueDate) ? 'var(--accent)' : '#f59e0b',
                }}>
                  {formatDate(item.dueDate)}
                </span>
              )}

              {/* Assignee */}
              {item.assignee && (
                <span className="text-[9px] px-1.5 py-0.5 rounded shrink-0" style={{ background: 'var(--bg)', color: 'var(--text-muted)' }}>
                  {item.assignee.split(' ')[0]}
                </span>
              )}

              {/* Status */}
              <span className="text-[9px] shrink-0" style={{ color: 'var(--text-muted)' }}>{item.status}</span>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button onClick={e => { e.stopPropagation(); onDone(rawId, item.title); }} title="Done">
                  <CheckCircle size={12} style={{ color: '#22c55e' }} />
                </button>
                <button onClick={e => { e.stopPropagation(); onSnooze(rawId, item.title); }} title="Snooze">
                  <AlarmClock size={12} style={{ color: 'var(--text-muted)' }} />
                </button>
                <button onClick={e => { e.stopPropagation(); onDismiss(rawId, item.title); }} title="Dismiss">
                  <X size={12} style={{ color: 'var(--text-muted)' }} />
                </button>
              </div>
            </div>

            {/* Expansion panel */}
            {isExpanded && (
              <div className="px-10 py-2 text-xs" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                <div className="flex items-center gap-4">
                  {item.meta && <span style={{ color: 'var(--text-muted)' }}>{item.meta}</span>}
                  {item.dueDate && <span style={{ color: isOverdue(item.dueDate) ? '#ef4444' : 'var(--text-muted)' }}>
                    {isOverdue(item.dueDate) ? `Overdue — due ${formatDate(item.dueDate)}` : `Due ${formatDate(item.dueDate)}`}
                  </span>}
                  {item.assignee && <span style={{ color: 'var(--text-muted)' }}>Assigned to {item.assignee}</span>}
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noopener"
                      className="flex items-center gap-1 hover:underline" style={{ color: 'var(--accent)' }}>
                      Open in {SOURCE_LABELS[item.source]} <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
