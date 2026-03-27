'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { isAdmin } from '@/lib/auth';
import { Calendar, Mail, CheckSquare, Clock, ExternalLink, Circle, Plus, X, AlarmClock, CheckCircle, Undo2, FileText, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { useEffect, useState, useCallback, useRef } from 'react';

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
  1: '#f87171', 2: '#fb923c', 3: '#facc15', 4: '#94a3b8',
};

const priCatColors: Record<string, string> = {
  high: '#f97316', medium: '#facc15', low: '#94a3b8', urgent: '#ef4444',
};

// ── Card wrapper ───────────────────────────────────────────────
function Card({ title, icon: Icon, children, action }: { title: string; icon: any; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-lg p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 mb-4">
        <Icon size={16} style={{ color: 'var(--accent)' }} />
        <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{title}</h3>
        {action && <div className="ml-auto">{action}</div>}
      </div>
      {children}
    </div>
  );
}

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
  const [loading, setLoading] = useState({ tasks: true, calendar: true, emails: true, meetings: true });

  // Task management state
  const [hiddenTasks, setHiddenTasks] = useState<Set<string>>(new Set());
  const [snoozedTasks, setSnoozedTasks] = useState<Set<string>>(new Set());
  const [doneTasks, setDoneTasks] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [expandedMeeting, setExpandedMeeting] = useState<string | null>(null);

  // Drag reorder state for tasks
  const [taskOrder, setTaskOrder] = useState<string[] | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const addToast = useCallback((message: string, undoAction?: () => void) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, undoAction }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Task actions
  const markDone = useCallback((taskId: string, taskTitle: string) => {
    setDoneTasks(prev => new Set(prev).add(taskId));
    addToast(`"${taskTitle}" marked done`, () => {
      setDoneTasks(prev => { const next = new Set(prev); next.delete(taskId); return next; });
    });
  }, [addToast]);

  const snoozeTask = useCallback((taskId: string, taskTitle: string, duration: string) => {
    setSnoozedTasks(prev => new Set(prev).add(taskId));
    addToast(`"${taskTitle}" snoozed until ${duration}`, () => {
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
        setLoading(l => ({ ...l, calendar: false, emails: false }));
      })
      .catch(() => setLoading(l => ({ ...l, calendar: false, emails: false })));

    fetch('/api/meetings')
      .then(r => r.json())
      .then(data => { setMeetings(data.meetings || []); setLoading(l => ({ ...l, meetings: false })); })
      .catch(() => setLoading(l => ({ ...l, meetings: false })));
  }, [user]);

  // Visible tasks (filtered + ordered)
  const visibleTasks = tasks.filter(t => !hiddenTasks.has(t.id) && !snoozedTasks.has(t.id) && !doneTasks.has(t.id));
  const orderedTasks = taskOrder
    ? taskOrder.filter(id => visibleTasks.some(t => t.id === id)).map(id => visibleTasks.find(t => t.id === id)!).concat(visibleTasks.filter(t => !taskOrder.includes(t.id)))
    : visibleTasks;

  const handleTaskDragStart = (idx: number) => setDragIdx(idx);
  const handleTaskDrop = (dropIdx: number) => {
    if (dragIdx === null || dragIdx === dropIdx) { setDragIdx(null); setDragOverIdx(null); return; }
    const ids = orderedTasks.map(t => t.id);
    const [moved] = ids.splice(dragIdx, 1);
    ids.splice(dropIdx, 0, moved);
    setTaskOrder(ids);
    setDragIdx(null);
    setDragOverIdx(null);
  };

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
          <Card title="My Tasks" icon={CheckSquare} action={
            <button onClick={() => setShowNewTask(!showNewTask)}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors"
              style={{ background: 'var(--bg)', color: 'var(--accent)', border: '1px solid var(--border)' }}>
              <Plus size={12} /> Add Task
            </button>
          }>
            {/* New task input */}
            {showNewTask && (
              <div className="flex items-center gap-2 mb-3 p-2 rounded-md" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  placeholder="Task title — creates in Linear"
                  className="flex-1 text-sm bg-transparent outline-none"
                  style={{ color: 'var(--text)' }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newTaskTitle.trim()) {
                      addToast(`Task "${newTaskTitle}" will be created in Linear`);
                      setNewTaskTitle('');
                      setShowNewTask(false);
                    }
                  }}
                />
                <button onClick={() => { setShowNewTask(false); setNewTaskTitle(''); }}
                  style={{ color: 'var(--text-muted)' }}><X size={14} /></button>
              </div>
            )}

            {loading.tasks ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="rounded-md p-3 animate-pulse" style={{ background: 'var(--bg)', height: '48px' }} />
                ))}
              </div>
            ) : orderedTasks.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No tasks assigned to you right now.</p>
            ) : (
              <div className="space-y-1">
                {orderedTasks.slice(0, 15).map((task, idx) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => handleTaskDragStart(idx)}
                    onDragOver={e => { e.preventDefault(); setDragOverIdx(idx); }}
                    onDragLeave={() => setDragOverIdx(null)}
                    onDrop={() => handleTaskDrop(idx)}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 group transition-colors"
                    style={{
                      borderTop: dragOverIdx === idx ? '2px solid var(--accent)' : '2px solid transparent',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Drag handle */}
                    <GripVertical size={12} className="shrink-0 opacity-0 group-hover:opacity-40 cursor-grab" style={{ color: 'var(--text-muted)' }} />

                    {/* Done button */}
                    <button onClick={() => markDone(task.id, task.title)}
                      className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Mark done">
                      <CheckCircle size={14} style={{ color: '#22c55e' }} />
                    </button>

                    {/* Task link */}
                    <a href={task.url} target="_blank" rel="noopener"
                      className="flex items-center gap-2 flex-1 min-w-0"
                      style={{ color: 'var(--text)' }}
                      onClick={e => e.stopPropagation()}>
                      <Circle size={10} fill={task.statusColor || '#666'} stroke={task.statusColor || '#666'} className="shrink-0" />
                      <span className="text-xs font-mono shrink-0" style={{ color: 'var(--text-muted)', minWidth: '64px' }}>
                        {task.identifier}
                      </span>
                      <span className="text-sm flex-1 truncate">{task.title}</span>
                    </a>

                    {task.priority <= 2 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded shrink-0"
                        style={{ background: priorityColors[task.priority] + '22', color: priorityColors[task.priority] }}>
                        {task.priority === 1 ? 'Urgent' : 'High'}
                      </span>
                    )}
                    <span className="text-[10px] shrink-0" style={{ color: 'var(--text-muted)' }}>{task.status}</span>

                    {/* Snooze / Dismiss buttons */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => snoozeTask(task.id, task.title, 'tomorrow')} title="Snooze to tomorrow">
                        <AlarmClock size={12} style={{ color: 'var(--text-muted)' }} />
                      </button>
                      <button onClick={() => dismissTask(task.id, task.title)} title="Dismiss">
                        <X size={12} style={{ color: 'var(--text-muted)' }} />
                      </button>
                    </div>
                  </div>
                ))}
                {orderedTasks.length > 15 && (
                  <p className="text-xs pt-2 pl-3" style={{ color: 'var(--text-muted)' }}>
                    + {orderedTasks.length - 15} more tasks
                  </p>
                )}
              </div>
            )}
          </Card>

          {/* Meeting Summaries */}
          <Card title="Meeting Summaries" icon={FileText}>
            {loading.meetings ? (
              <div className="space-y-2">
                {[1, 2].map(i => (
                  <div key={i} className="rounded-md p-3 animate-pulse" style={{ background: 'var(--bg)', height: '48px' }} />
                ))}
              </div>
            ) : meetings.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No recent meeting summaries.</p>
            ) : (
              <div className="space-y-2">
                {meetings.slice(0, 6).map(mtg => {
                  const isExpanded = expandedMeeting === mtg.id;
                  return (
                    <div key={mtg.id} className="rounded-md overflow-hidden" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                      <button
                        onClick={() => setExpandedMeeting(isExpanded ? null : mtg.id)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:opacity-80"
                      >
                        {isExpanded ? <ChevronUp size={12} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={12} style={{ color: 'var(--text-muted)' }} />}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{mtg.title}</span>
                            <span className="text-[10px] shrink-0" style={{ color: 'var(--text-muted)' }}>{mtg.date}</span>
                          </div>
                          {!isExpanded && (
                            <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{mtg.summary}</p>
                          )}
                        </div>
                        {mtg.suggestedTasks.length > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded shrink-0"
                            style={{ background: 'var(--accent)', color: '#fff' }}>
                            {mtg.suggestedTasks.length} tasks
                          </span>
                        )}
                      </button>
                      {isExpanded && (
                        <div className="px-3 pb-3 border-t" style={{ borderColor: 'var(--border)' }}>
                          <p className="text-sm mt-2 mb-3" style={{ color: 'var(--text-muted)' }}>{mtg.summary}</p>
                          {mtg.suggestedTasks.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim, var(--text-muted))' }}>Suggested Tasks</span>
                              {mtg.suggestedTasks.map((st, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs rounded px-2 py-1.5"
                                  style={{ background: 'var(--surface)' }}>
                                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: priCatColors[st.priority] || '#94a3b8' }} />
                                  <span className="flex-1" style={{ color: 'var(--text)' }}>{st.task}</span>
                                  <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: priCatColors[st.priority] + '22', color: priCatColors[st.priority] || '#94a3b8' }}>
                                    {st.priority}
                                  </span>
                                  <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{st.category}</span>
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
                  <div key={email.id} className="rounded-md px-3 py-2"
                    style={{ background: email.unread ? 'var(--bg)' : 'transparent' }}>
                    <div className="flex items-center gap-2">
                      {email.unread && <Circle size={6} fill="var(--accent)" stroke="var(--accent)" />}
                      <span className="text-sm font-medium flex-1 truncate" style={{ color: 'var(--text)' }}>
                        {parseFrom(email.from)}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{timeAgo(email.date)}</span>
                    </div>
                    <p className="text-sm truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{email.subject}</p>
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
                  <div key={ev.id} className="rounded-md p-3"
                    style={{ background: 'var(--bg)', borderLeft: '3px solid var(--accent)' }}>
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
                  <div key={block} className="rounded-md p-3 text-center"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
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

      {/* Toast notifications */}
      <ToastBar toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
