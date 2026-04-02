'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { isAdmin } from '@/lib/auth';
import { Calendar, Mail, CheckSquare, Clock, ExternalLink, Circle, X, AlarmClock, CheckCircle, Undo2, FileText, ChevronDown, ChevronUp, GripVertical, Phone, DollarSign, Plus, Trash2, Bell, Edit3, AlertTriangle, ArrowRight, MessageSquare, FolderOpen, Hash } from 'lucide-react';
import { useEffect, useState, useCallback, useRef } from 'react';
import WbsoTracker from '@/components/WbsoTracker';

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
  id: string; threadId: string; from: string; subject: string; date: string;
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
  id: string; title: string; source: 'linear' | 'hubspot' | 'gcal' | 'gmail' | 'personal' | 'drive' | 'chat' | 'ai';
  dueDate: string | null; status: string; url: string | null;
  priority: number; meta?: string; assignee?: string;
};

// Google notifications
type DriveItem = {
  id: string; type: 'comment' | 'edit'; title: string; docName: string;
  author: string; authorPhoto: string | null; createdAt: string;
  url: string; hasReplies: boolean; replyCount: number;
};
type ChatItem = {
  id: string; type: 'dm' | 'mention'; title: string; spaceName: string;
  author: string; createdAt: string; spaceUrl: string;
};
type NotificationsData = {
  drive: { available: boolean; error?: string; items: DriveItem[] };
  chat: { available: boolean; error?: string; items: ChatItem[] };
};

// Personal task
type PersonalTask = {
  id: string; title: string; dueDate: string | null;
  priority: 'high' | 'medium' | 'low';
  done: boolean; reminder: string | null;
  sourceLabel?: string; sourceUrl?: string;
  createdAt: string;
};

type Toast = { id: string; message: string; undoAction?: () => void };

// Dismissed meeting tasks (persisted)
function loadDismissedMeetingTasks(): string[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem('dismissed_meeting_tasks') || '[]'); } catch { return []; }
}
function saveDismissedMeetingTasks(tasks: string[]) {
  localStorage.setItem('dismissed_meeting_tasks', JSON.stringify(tasks));
}

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

function getTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function cleanAssignee(name: string | undefined | null): string | undefined {
  if (!name) return undefined;
  if (name.includes('@')) {
    const local = name.split('@')[0];
    const first = local.split(/[._-]/)[0];
    return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
  }
  return name;
}

function cleanAssigneeFull(name: string): string {
  if (name.includes('@')) {
    const local = name.split('@')[0];
    const parts = local.split(/[._-]/);
    return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
  }
  return name;
}

const SOURCE_COLORS: Record<string, string> = {
  linear: '#6366f1', hubspot: '#f97316', gcal: '#3b82f6', gmail: '#ef4444', personal: '#22c55e', drive: '#4285F4', chat: '#34A853', ai: '#a855f7',
};
const SOURCE_LABELS: Record<string, string> = {
  linear: 'Linear', hubspot: 'HubSpot', gcal: 'Calendar', gmail: 'Email', personal: 'My Task', drive: 'Drive', chat: 'Chat', ai: 'AI Suggested',
};

const priCatColors: Record<string, string> = {
  high: '#f97316', medium: '#facc15', low: '#94a3b8', urgent: '#ef4444',
};

const PRIORITY_MAP: Record<string, number> = { high: 2, medium: 3, low: 4 };

// ── LocalStorage helpers ──────────────────────────────────────
function loadPersonalTasks(): PersonalTask[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem('dashboard_personal_tasks') || '[]'); } catch { return []; }
}
function savePersonalTasks(tasks: PersonalTask[]) {
  localStorage.setItem('dashboard_personal_tasks', JSON.stringify(tasks));
}
function loadDoneTaskIds(): string[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem('dashboard_done_tasks') || '[]'); } catch { return []; }
}
function saveDoneTaskIds(ids: string[]) {
  localStorage.setItem('dashboard_done_tasks', JSON.stringify(ids));
}
function loadHiddenTaskIds(): string[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem('dashboard_hidden_tasks') || '[]'); } catch { return []; }
}
function saveHiddenTaskIds(ids: string[]) {
  localStorage.setItem('dashboard_hidden_tasks', JSON.stringify(ids));
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

// ── Personal Task Input ────────────────────────────────────────
function AddTaskInput({ onAdd }: { onAdd: (title: string, dueDate: string | null, priority: 'high' | 'medium' | 'low') => void }) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [showOptions, setShowOptions] = useState(false);

  const handleSubmit = () => {
    if (!title.trim()) return;
    onAdd(title.trim(), dueDate || null, priority);
    setTitle('');
    setDueDate('');
    setPriority('medium');
    setShowOptions(false);
  };

  return (
    <div className="rounded-lg overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 px-3 py-2">
        <Plus size={14} style={{ color: 'var(--accent)' }} />
        <input
          type="text" value={title}
          onChange={e => setTitle(e.target.value)}
          onFocus={() => setShowOptions(true)}
          onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
          placeholder="Add a task..."
          className="flex-1 text-xs bg-transparent border-none outline-none"
          style={{ color: 'var(--text)' }}
        />
        {title && (
          <button onClick={handleSubmit} className="text-[10px] px-2 py-0.5 rounded font-medium"
            style={{ background: 'var(--accent)', color: '#fff' }}>Add</button>
        )}
      </div>
      {showOptions && title && (
        <div className="flex items-center gap-3 px-3 py-1.5" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
          <div className="flex items-center gap-1">
            <Calendar size={10} style={{ color: 'var(--text-muted)' }} />
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
              className="text-[10px] bg-transparent border-none outline-none" style={{ color: 'var(--text-muted)' }} />
          </div>
          <div className="flex items-center gap-1">
            {(['high', 'medium', 'low'] as const).map(p => (
              <button key={p} onClick={() => setPriority(p)}
                className="text-[9px] px-1.5 py-0.5 rounded capitalize"
                style={{
                  background: priority === p ? (priCatColors[p] || '#94a3b8') + '33' : 'transparent',
                  color: priority === p ? priCatColors[p] : 'var(--text-muted)',
                  border: priority === p ? `1px solid ${priCatColors[p]}44` : '1px solid transparent',
                }}>{p}</button>
            ))}
          </div>
        </div>
      )}
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
  const [hsPortalId, setHsPortalId] = useState<string>('');
  const [loading, setLoading] = useState({ tasks: true, calendar: true, hubspot: true, meetings: true });
  const [personalTasks, setPersonalTasks] = useState<PersonalTask[]>(loadPersonalTasks);
  const [dismissedMeetingTasks, setDismissedMeetingTasks] = useState<string[]>(loadDismissedMeetingTasks);
  const [notifications, setNotifications] = useState<NotificationsData | null>(null);
  const [aiRecommendations, setAiRecommendations] = useState<{ title: string; source: string; priority: string; reason: string }[]>([]);

  // Task management state — persisted to localStorage
  const [hiddenTasks, setHiddenTasks] = useState<Set<string>>(() => new Set(loadHiddenTaskIds()));
  const [snoozedTasks, setSnoozedTasks] = useState<Set<string>>(new Set());
  const [doneTasks, setDoneTasks] = useState<Set<string>>(() => new Set(loadDoneTaskIds()));
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [expandedMeeting, setExpandedMeeting] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [personFilter, setPersonFilter] = useState<string>('');
  const [personFilterInitialized, setPersonFilterInitialized] = useState(false);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [priorityExpanded, setPriorityExpanded] = useState(false);
  const [editingPriorityDate, setEditingPriorityDate] = useState<string | null>(null);

  // Save personal tasks & dismissed meeting tasks on change
  useEffect(() => { savePersonalTasks(personalTasks); }, [personalTasks]);
  useEffect(() => { saveDismissedMeetingTasks(dismissedMeetingTasks); }, [dismissedMeetingTasks]);
  useEffect(() => { saveDoneTaskIds([...doneTasks]); }, [doneTasks]);
  useEffect(() => { saveHiddenTaskIds([...hiddenTasks]); }, [hiddenTasks]);

  const addToast = useCallback((message: string, undoAction?: () => void) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, undoAction }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  }, []);
  const dismissToast = useCallback((id: string) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  const markDone = useCallback((taskId: string, taskTitle: string) => {
    if (taskId.startsWith('pt_')) {
      const ptId = taskId.replace('pt_', '');
      setPersonalTasks(prev => prev.map(t => t.id === ptId ? { ...t, done: true } : t));
      addToast(`"${taskTitle}" completed`, () => {
        setPersonalTasks(prev => prev.map(t => t.id === ptId ? { ...t, done: false } : t));
      });
      return;
    }
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
    if (taskId.startsWith('pt_')) {
      const ptId = taskId.replace('pt_', '');
      const removed = personalTasks.find(t => t.id === ptId);
      setPersonalTasks(prev => prev.filter(t => t.id !== ptId));
      addToast(`"${taskTitle}" removed`, () => {
        if (removed) setPersonalTasks(prev => [...prev, removed]);
      });
      return;
    }
    setHiddenTasks(prev => new Set(prev).add(taskId));
    addToast(`"${taskTitle}" dismissed`, () => {
      setHiddenTasks(prev => { const next = new Set(prev); next.delete(taskId); return next; });
    });
  }, [addToast, personalTasks]);

  const addPersonalTask = useCallback((title: string, dueDate: string | null, priority: 'high' | 'medium' | 'low', sourceLabel?: string, sourceUrl?: string) => {
    const newTask: PersonalTask = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title, dueDate, priority, done: false, reminder: null,
      sourceLabel, sourceUrl, createdAt: new Date().toISOString(),
    };
    setPersonalTasks(prev => [newTask, ...prev]);
    addToast(`Task added: "${title}"`);
  }, [addToast]);

  const updatePersonalTaskDate = useCallback((taskId: string, date: string) => {
    setPersonalTasks(prev => prev.map(t => t.id === taskId ? { ...t, dueDate: date || null } : t));
  }, []);

  const setTaskReminder = useCallback((taskId: string, reminder: string | null) => {
    setPersonalTasks(prev => prev.map(t => t.id === taskId ? { ...t, reminder } : t));
    if (reminder) addToast(`Reminder set for ${formatDate(reminder)}`);
  }, [addToast]);

  const dismissMeetingTask = useCallback((key: string) => {
    setDismissedMeetingTasks(prev => [...prev, key]);
    addToast('Task marked as done');
  }, [addToast]);

  useEffect(() => {
    if (!user?.email) return;

    fetch('/api/linear')
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
        if (data.portalId) setHsPortalId(data.portalId);
        setLoading(l => ({ ...l, hubspot: false }));
      })
      .catch(() => setLoading(l => ({ ...l, hubspot: false })));

    fetch('/api/meetings')
      .then(r => r.json())
      .then(data => { setMeetings(data.meetings || []); setLoading(l => ({ ...l, meetings: false })); })
      .catch(() => setLoading(l => ({ ...l, meetings: false })));

    // Fetch Google Drive & Chat notifications
    fetch(`/api/google/notifications?user=${userName}`)
      .then(r => r.json())
      .then(data => setNotifications(data))
      .catch(() => setNotifications({ drive: { available: false, items: [] }, chat: { available: false, items: [] } }));
  }, [user]);

  // Fetch AI-recommended actions when emails/notifications arrive
  useEffect(() => {
    if (emails.length === 0 && !notifications) return;
    const driveItems = notifications?.drive?.items || [];
    const chatItems = notifications?.chat?.items || [];
    if (emails.length === 0 && driveItems.length === 0 && chatItems.length === 0) return;

    fetch('/api/recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emails: emails.filter(e => e.unread).slice(0, 8).map(e => ({
          from: e.from, subject: e.subject, snippet: e.snippet,
        })),
        driveComments: driveItems.filter((d: DriveItem) => d.type === 'comment').map((d: DriveItem) => ({
          docName: d.docName, author: d.author, title: d.title,
        })),
        chatMessages: chatItems.map((c: ChatItem) => ({
          spaceName: c.spaceName, author: c.author, title: c.title,
        })),
      }),
    })
      .then(r => r.json())
      .then(data => { if (data.recommendations?.length) setAiRecommendations(data.recommendations); })
      .catch(() => {});
  }, [emails, notifications]);

  // Build combined stream
  const streamItems: StreamItem[] = [];

  // Personal tasks (active only)
  for (const t of personalTasks) {
    if (t.done) continue;
    streamItems.push({
      id: `pt_${t.id}`, title: t.title, source: 'personal',
      dueDate: t.dueDate, status: 'Active', url: t.sourceUrl || null,
      priority: PRIORITY_MAP[t.priority] || 3,
      meta: t.sourceLabel, assignee: firstName,
    });
  }

  // Linear tasks
  for (const t of tasks) {
    if (hiddenTasks.has(t.id) || snoozedTasks.has(t.id) || doneTasks.has(t.id)) continue;
    streamItems.push({
      id: `lin_${t.id}`, title: t.title, source: 'linear',
      dueDate: null, status: t.status, url: t.url,
      priority: t.priority, meta: t.identifier, assignee: cleanAssignee(t.assignee) || t.assignee,
    });
  }

  // HubSpot tasks
  for (const t of hsTasks) {
    if (hiddenTasks.has(t.id) || snoozedTasks.has(t.id) || doneTasks.has(t.id)) continue;
    const hsUrl = `https://app.hubspot.com/contacts/27215736/record/0-27/${t.id}`;
    streamItems.push({
      id: `hs_${t.id}`, title: t.subject, source: 'hubspot',
      dueDate: t.dueDate, status: t.status, url: hsUrl,
      priority: t.priority === 'HIGH' ? 2 : t.priority === 'MEDIUM' ? 3 : 4,
      meta: t.type, assignee: cleanAssignee(t.ownerName) || t.ownerName || undefined,
    });
  }

  // Google Drive comments → stream items
  if (notifications?.drive?.items) {
    for (const d of notifications.drive.items) {
      if (d.type !== 'comment') continue;
      if (hiddenTasks.has(d.id) || hiddenTasks.has(`drv_${d.id}`) || doneTasks.has(d.id) || doneTasks.has(`drv_${d.id}`)) continue;
      streamItems.push({
        id: `drv_${d.id}`, title: `${d.author}: "${d.title}"`,
        source: 'drive',
        dueDate: null, status: d.docName, url: d.url,
        priority: 3, meta: d.docName, assignee: firstName,
      });
    }
  }

  // Google Chat messages → stream items
  if (notifications?.chat?.items) {
    for (const c of notifications.chat.items) {
      if (hiddenTasks.has(c.id) || hiddenTasks.has(`cht_${c.id}`) || doneTasks.has(c.id) || doneTasks.has(`cht_${c.id}`)) continue;
      streamItems.push({
        id: `cht_${c.id}`, title: c.title,
        source: 'chat',
        dueDate: null, status: c.spaceName, url: c.spaceUrl,
        priority: 3, meta: c.spaceName, assignee: firstName,
      });
    }
  }

  // Email action items — only surface emails that likely need a personal reply
  // Skip newsletters, marketing, notifications, and no-reply addresses
  const SPAM_PATTERNS = /noreply|no-reply|notifications?@|newsletter|marketing|unsubscribe|updates@|info@|support@|billing@|hello@|team@|do-not-reply|donotreply|mailer-daemon|anvr|nieuwsbrief|digest|weekly.?update|promo|announcement/i;
  const actionEmails = emails
    .filter(e => e.unread)
    .filter(e => !SPAM_PATTERNS.test(e.from))
    .filter(e => !SPAM_PATTERNS.test(e.subject))
    .filter(e => {
      // Skip short auto-generated subjects
      if (e.subject.length < 5) return false;
      // Skip common notification patterns
      if (/invitation:|shared .* with you|commented on|assigned to you|reminder:/i.test(e.subject)) return false;
      return true;
    })
    .slice(0, 5);
  for (const email of actionEmails) {
    const emailId = `eml_${email.id}`;
    if (hiddenTasks.has(emailId) || hiddenTasks.has(email.id) || doneTasks.has(emailId) || doneTasks.has(email.id)) continue;
    const alreadyTask = personalTasks.some(pt => pt.title.includes(email.subject));
    if (alreadyTask) continue;
    streamItems.push({
      id: emailId, title: `${parseFrom(email.from)}: ${email.subject}`,
      source: 'gmail', dueDate: null,
      status: email.unread ? 'Unread' : 'Read',
      url: `https://mail.google.com/mail/u/0/#all/${email.threadId}`,
      priority: 3, meta: email.snippet?.slice(0, 60), assignee: firstName,
    });
  }

  // AI recommended actions
  for (const rec of aiRecommendations) {
    const recId = `ai_${rec.title.slice(0, 20).replace(/\s/g, '_').replace(/[^a-zA-Z0-9_]/g, '')}`;
    if (hiddenTasks.has(recId) || doneTasks.has(recId)) continue;
    streamItems.push({
      id: recId, title: rec.title, source: 'ai',
      dueDate: null, status: rec.reason, url: null,
      priority: rec.priority === 'high' ? 2 : rec.priority === 'medium' ? 3 : 4,
      meta: rec.reason, assignee: firstName,
    });
  }

  // Person filter
  const assigneeMap = new Map<string, string>();
  for (const item of streamItems) {
    if (!item.assignee) continue;
    const first = item.assignee.split(' ')[0];
    if (!assigneeMap.has(first)) assigneeMap.set(first, item.assignee);
  }
  const uniqueAssignees = [...assigneeMap.values()];

  // Default to logged-in user's name on first load
  if (!personFilterInitialized && uniqueAssignees.length > 0 && firstName !== 'there') {
    const match = uniqueAssignees.find(a => a.toLowerCase().startsWith(firstName.toLowerCase()));
    if (match) {
      setPersonFilter(match);
      setPersonFilterInitialized(true);
    }
  }

  const filteredStream = !personFilter ? streamItems
    : streamItems.filter(i => i.assignee?.toLowerCase().includes(personFilter.toLowerCase()));

  // Priority summary — personal tasks + urgent/high + overdue + Drive/Chat/Email items
  const priorityItems = filteredStream.filter(i =>
    i.source === 'personal' || i.source === 'drive' || i.source === 'chat' || i.source === 'gmail' || i.source === 'ai' ||
    i.priority <= 2 || isOverdue(i.dueDate)
  );

  // Group by urgency
  const overdue = filteredStream.filter(i => isOverdue(i.dueDate));
  const dueToday = filteredStream.filter(i => isDueToday(i.dueDate));
  const thisWeek = filteredStream.filter(i => isDueThisWeek(i.dueDate));
  const later = filteredStream.filter(i => !isOverdue(i.dueDate) && !isDueToday(i.dueDate) && !isDueThisWeek(i.dueDate));

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
  const completedPersonalCount = personalTasks.filter(t => t.done).length;

  // Collect all meeting suggested tasks that aren't done
  const allMeetingTasks: { task: string; priority: string; meetingTitle: string; meetingDate: string; key: string }[] = [];
  for (const mtg of meetings) {
    for (const st of mtg.suggestedTasks) {
      const key = `${mtg.id}_${st.task}`;
      if (!dismissedMeetingTasks.includes(key)) {
        allMeetingTasks.push({ task: st.task, priority: st.priority, meetingTitle: mtg.title, meetingDate: mtg.date, key });
      }
    }
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: Task stream */}
      <div className="flex-1 overflow-auto" style={{ flex: '3' }}>
        {/* Greeting */}
        <div className="px-6 pt-5 pb-2">
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {firstName}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Priority Summary Strip */}
        {!isLoadingAll && priorityItems.length > 0 && (
          <div className="px-6 pb-2">
            <div className="rounded-lg p-3" style={{ background: 'var(--surface)', border: '1px solid var(--accent)' + '44' }}>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={12} style={{ color: 'var(--accent)' }} />
                <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
                  Priority Focus — {priorityItems.length} items
                </span>
              </div>
              <div className="space-y-1">
                {(priorityExpanded ? priorityItems : priorityItems.slice(0, 8)).map(item => {
                  const rawId = item.id.replace(/^(lin_|hs_|pt_|drv_|cht_|eml_)/, '');
                  const isPersonal = item.source === 'personal';
                  const pt = isPersonal ? personalTasks.find(t => t.id === rawId) : null;
                  const isEditingDate = editingPriorityDate === item.id;
                  return (
                    <div key={item.id} className="flex items-center gap-2 group">
                      {/* Cross off / mark done — works for ALL task types */}
                      <button
                        onClick={() => markDone(isPersonal ? item.id : rawId, item.title)}
                        className="shrink-0 hover:scale-110 transition-transform" title="Mark done">
                        <Circle size={13} style={{ color: 'var(--text-muted)' }} />
                      </button>
                      {/* Source badge — clickable link to source */}
                      {item.url ? (
                        <a href={item.url} target="_blank" rel="noopener"
                          className="text-[8px] font-bold uppercase px-1 py-0.5 rounded shrink-0 hover:opacity-80"
                          style={{ background: SOURCE_COLORS[item.source] + '22', color: SOURCE_COLORS[item.source] }}
                          title={`Open in ${SOURCE_LABELS[item.source]}`}>
                          {SOURCE_LABELS[item.source]}
                        </a>
                      ) : (
                        <span className="text-[8px] font-bold uppercase px-1 py-0.5 rounded shrink-0"
                          style={{ background: SOURCE_COLORS[item.source] + '22', color: SOURCE_COLORS[item.source] }}>
                          {SOURCE_LABELS[item.source]}
                        </span>
                      )}
                      {/* Title — clickable to source */}
                      {item.url ? (
                        <a href={item.url} target="_blank" rel="noopener"
                          className="text-[11px] flex-1 truncate hover:underline"
                          style={{ color: 'var(--text)' }}>{item.title}</a>
                      ) : (
                        <span className="text-[11px] flex-1 truncate" style={{ color: 'var(--text)' }}>{item.title}</span>
                      )}
                      {/* Overdue / priority badges */}
                      {isOverdue(item.dueDate) && (
                        <span className="text-[9px] px-1 py-0.5 rounded font-bold shrink-0"
                          style={{ background: '#ef444422', color: '#ef4444' }}>OVERDUE</span>
                      )}
                      {item.priority <= 2 && !isOverdue(item.dueDate) && (
                        <span className="text-[9px] px-1 py-0.5 rounded font-bold shrink-0"
                          style={{ background: '#f9731622', color: '#f97316' }}>
                          {item.priority === 1 ? 'URGENT' : 'HIGH'}
                        </span>
                      )}
                      {/* Due date */}
                      {isPersonal && isEditingDate ? (
                        <input type="date" autoFocus
                          value={pt?.dueDate || ''}
                          onChange={e => { updatePersonalTaskDate(rawId, e.target.value); }}
                          onBlur={() => setEditingPriorityDate(null)}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditingPriorityDate(null); }}
                          className="text-[9px] bg-transparent outline-none px-1 py-0.5 rounded shrink-0"
                          style={{ color: 'var(--text)', border: '1px solid var(--accent)', width: '110px' }}
                        />
                      ) : item.dueDate ? (
                        <span className="text-[9px] shrink-0"
                          style={{ color: isOverdue(item.dueDate) ? '#ef4444' : 'var(--text-muted)' }}>
                          {formatDate(item.dueDate)}
                        </span>
                      ) : null}
                      {/* Actions — always visible for core actions, hover for extras */}
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Snooze — works for all */}
                        <button onClick={() => snoozeTask(rawId, item.title)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity" title="Snooze until tomorrow">
                          <AlarmClock size={10} style={{ color: 'var(--text-muted)' }} />
                        </button>
                        {/* Open in source — always visible if url exists */}
                        {item.url && (
                          <a href={item.url} target="_blank" rel="noopener"
                            className="opacity-0 group-hover:opacity-100 transition-opacity" title={`Open in ${SOURCE_LABELS[item.source]}`}>
                            <ExternalLink size={10} style={{ color: 'var(--accent)' }} />
                          </a>
                        )}
                        {/* Edit for personal */}
                        {isPersonal && (
                          <button onClick={() => { setEditTitle(item.title); setEditingTask(rawId); }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity" title="Edit">
                            <Edit3 size={10} style={{ color: 'var(--accent)' }} />
                          </button>
                        )}
                        {/* Date for personal */}
                        {isPersonal && (
                          <button onClick={() => setEditingPriorityDate(item.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity" title="Set due date">
                            <Calendar size={10} style={{ color: 'var(--text-muted)' }} />
                          </button>
                        )}
                        {/* Dismiss/delete */}
                        <button onClick={() => dismissTask(isPersonal ? item.id : rawId, item.title)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          title={isPersonal ? 'Delete' : 'Dismiss'}>
                          {isPersonal ? <Trash2 size={10} style={{ color: '#ef4444' }} />
                            : <X size={10} style={{ color: 'var(--text-muted)' }} />}
                        </button>
                      </div>
                    </div>
                  );
                })}
                {priorityItems.length > 8 && (
                  <button onClick={() => setPriorityExpanded(!priorityExpanded)}
                    className="text-[9px] flex items-center gap-1 mt-1 hover:underline"
                    style={{ color: 'var(--accent)' }}>
                    {priorityExpanded ? (
                      <><ChevronUp size={10} /> Show less</>
                    ) : (
                      <><ChevronDown size={10} /> + {priorityItems.length - 8} more items</>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Add Task Input */}
        <div className="px-6 pb-2">
          <AddTaskInput onAdd={(title, dueDate, priority) => addPersonalTask(title, dueDate, priority)} />
          {completedPersonalCount > 0 && (
            <button onClick={() => setPersonalTasks(prev => prev.filter(t => !t.done))}
              className="text-[9px] mt-1.5 px-2 py-0.5 rounded"
              style={{ color: 'var(--text-muted)', background: 'var(--surface)', border: '1px solid var(--border)' }}>
              Clear {completedPersonalCount} completed
            </button>
          )}
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
                onDone={markDone} onSnooze={snoozeTask} onDismiss={dismissTask}
                personalTasks={personalTasks} onUpdateDate={updatePersonalTaskDate}
                onSetReminder={setTaskReminder} editingTask={editingTask}
                setEditingTask={setEditingTask} editTitle={editTitle} setEditTitle={setEditTitle}
                onEditSave={(id, title) => setPersonalTasks(prev => prev.map(t => t.id === id ? { ...t, title } : t))} />
            )}
            {dueToday.length > 0 && (
              <StreamSection label="DUE TODAY" count={dueToday.length} color="var(--accent)"
                items={dueToday} expandedItem={expandedItem} setExpandedItem={setExpandedItem}
                onDone={markDone} onSnooze={snoozeTask} onDismiss={dismissTask}
                personalTasks={personalTasks} onUpdateDate={updatePersonalTaskDate}
                onSetReminder={setTaskReminder} editingTask={editingTask}
                setEditingTask={setEditingTask} editTitle={editTitle} setEditTitle={setEditTitle}
                onEditSave={(id, title) => setPersonalTasks(prev => prev.map(t => t.id === id ? { ...t, title } : t))} />
            )}
            {thisWeek.length > 0 && (
              <StreamSection label="THIS WEEK" count={thisWeek.length} color="#f59e0b"
                items={thisWeek} expandedItem={expandedItem} setExpandedItem={setExpandedItem}
                onDone={markDone} onSnooze={snoozeTask} onDismiss={dismissTask}
                personalTasks={personalTasks} onUpdateDate={updatePersonalTaskDate}
                onSetReminder={setTaskReminder} editingTask={editingTask}
                setEditingTask={setEditingTask} editTitle={editTitle} setEditTitle={setEditTitle}
                onEditSave={(id, title) => setPersonalTasks(prev => prev.map(t => t.id === id ? { ...t, title } : t))} />
            )}
            {later.length > 0 && (
              <StreamSection label="LATER" count={later.length} color="var(--text-muted)"
                items={later} expandedItem={expandedItem} setExpandedItem={setExpandedItem}
                onDone={markDone} onSnooze={snoozeTask} onDismiss={dismissTask}
                personalTasks={personalTasks} onUpdateDate={updatePersonalTaskDate}
                onSetReminder={setTaskReminder} editingTask={editingTask}
                setEditingTask={setEditingTask} editTitle={editTitle} setEditTitle={setEditTitle}
                onEditSave={(id, title) => setPersonalTasks(prev => prev.map(t => t.id === id ? { ...t, title } : t))} />
            )}
            {filteredStream.length === 0 && (
              <div className="px-6 py-8 text-center">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>All clear — no tasks right now.</p>
              </div>
            )}

            {/* Action Items from Emails */}
            {actionEmails.length > 0 && (
              <div className="px-6 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <Mail size={14} style={{ color: '#ef4444' }} />
                  <h3 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    Emails Requiring Action
                  </h3>
                </div>
                <div className="space-y-1">
                  {actionEmails.map(email => {
                    const alreadyTask = personalTasks.some(pt => pt.title.includes(email.subject));
                    return (
                      <div key={email.id} className="flex items-center gap-2 rounded px-3 py-1.5 group"
                        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                        <Circle size={5} fill="#ef4444" stroke="#ef4444" className="shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] font-medium block truncate" style={{ color: 'var(--text)' }}>
                            {email.subject}
                          </span>
                          <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                            from {parseFrom(email.from)}
                          </span>
                        </div>
                        {alreadyTask ? (
                          <CheckCircle size={12} style={{ color: '#22c55e' }} />
                        ) : (
                          <button
                            onClick={() => addPersonalTask(
                              `Reply: ${email.subject}`, null, 'medium',
                              'Email', `https://mail.google.com/mail/u/0/#all/${email.threadId}`
                            )}
                            className="text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            style={{ background: 'var(--accent)', color: '#fff' }}
                            title="Add as task">
                            <Plus size={10} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Meeting Summaries with crossable tasks */}
            {meetings.length > 0 && (
              <div className="px-6 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={14} style={{ color: 'var(--accent)' }} />
                  <h3 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Meeting Summaries</h3>
                  {allMeetingTasks.length > 0 && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'var(--accent)', color: '#fff' }}>
                      {allMeetingTasks.length} open
                    </span>
                  )}
                </div>
                <div className="space-y-1.5">
                  {meetings.slice(0, 6).map(mtg => {
                    const isExpanded = expandedMeeting === mtg.id;
                    const activeTasks = mtg.suggestedTasks.filter(st => !dismissedMeetingTasks.includes(`${mtg.id}_${st.task}`));
                    return (
                      <div key={mtg.id} className="rounded-md overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                        <button onClick={() => setExpandedMeeting(isExpanded ? null : mtg.id)}
                          className="w-full flex items-center gap-3 px-3 py-2 text-left hover:opacity-80">
                          {isExpanded ? <ChevronUp size={11} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={11} style={{ color: 'var(--text-muted)' }} />}
                          <span className="text-xs font-medium truncate flex-1" style={{ color: 'var(--text)' }}>{mtg.title}</span>
                          <span className="text-[9px] shrink-0" style={{ color: 'var(--text-muted)' }}>{mtg.date}</span>
                          {activeTasks.length > 0 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded shrink-0" style={{ background: 'var(--accent)', color: '#fff' }}>
                              {activeTasks.length} tasks
                            </span>
                          )}
                          {activeTasks.length === 0 && mtg.suggestedTasks.length > 0 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded shrink-0" style={{ background: '#22c55e22', color: '#22c55e' }}>
                              all done
                            </span>
                          )}
                        </button>
                        {isExpanded && (
                          <div className="px-3 pb-2.5 border-t" style={{ borderColor: 'var(--border)' }}>
                            <p className="text-xs mt-2 mb-2" style={{ color: 'var(--text-muted)' }}>{mtg.summary}</p>
                            {mtg.suggestedTasks.length > 0 && (
                              <div className="space-y-1">
                                <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Suggested Tasks</span>
                                {mtg.suggestedTasks.map((st, i) => {
                                  const taskKey = `${mtg.id}_${st.task}`;
                                  const isDismissed = dismissedMeetingTasks.includes(taskKey);
                                  const alreadyAdded = personalTasks.some(pt => pt.title === st.task && pt.sourceLabel === mtg.title);
                                  return (
                                    <div key={i} className="flex items-center gap-2 text-xs rounded px-2 py-1 group"
                                      style={{ background: 'var(--bg)', opacity: isDismissed ? 0.4 : 1 }}>
                                      {/* Cross off button */}
                                      <button onClick={() => isDismissed ? null : dismissMeetingTask(taskKey)}
                                        className="shrink-0" title={isDismissed ? 'Done' : 'Mark done'}>
                                        {isDismissed
                                          ? <CheckCircle size={12} style={{ color: '#22c55e' }} />
                                          : <Circle size={12} style={{ color: 'var(--text-muted)' }} />
                                        }
                                      </button>
                                      <span className="flex-1" style={{
                                        color: 'var(--text)',
                                        textDecoration: isDismissed ? 'line-through' : 'none',
                                      }}>{st.task}</span>
                                      <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: (priCatColors[st.priority] || '#94a3b8') + '22', color: priCatColors[st.priority] || '#94a3b8' }}>
                                        {st.priority}
                                      </span>
                                      {!isDismissed && !alreadyAdded && (
                                        <button
                                          onClick={() => addPersonalTask(
                                            st.task, null,
                                            (st.priority === 'urgent' ? 'high' : st.priority as 'high' | 'medium' | 'low') || 'medium',
                                            mtg.title
                                          )}
                                          className="text-[9px] px-1.5 py-0.5 rounded hover:opacity-80 transition-opacity opacity-0 group-hover:opacity-100 shrink-0"
                                          style={{ background: 'var(--accent)', color: '#fff' }}
                                          title="Add to my tasks">
                                          <Plus size={10} />
                                        </button>
                                      )}
                                      {alreadyAdded && !isDismissed && (
                                        <span className="shrink-0" style={{ color: '#22c55e' }}><CheckCircle size={10} /></span>
                                      )}
                                    </div>
                                  );
                                })}
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

            {/* Connected sources status */}
            {notifications && (
              <div className="px-6 py-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <FolderOpen size={11} style={{ color: notifications.drive.available ? '#4285F4' : 'var(--text-muted)' }} />
                    <span className="text-[9px]" style={{ color: notifications.drive.available ? '#4285F4' : 'var(--text-muted)' }}>
                      Drive {notifications.drive.available
                        ? `(${notifications.drive.items.filter(i => i.type === 'comment').length} comments)`
                        : notifications.drive.error?.includes('403') ? '— needs scope' : '— not connected'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MessageSquare size={11} style={{ color: notifications.chat.available ? '#34A853' : 'var(--text-muted)' }} />
                    <span className="text-[9px]" style={{ color: notifications.chat.available ? '#34A853' : 'var(--text-muted)' }}>
                      Chat {notifications.chat.available
                        ? `(${notifications.chat.items.length} messages)`
                        : notifications.chat.error?.includes('403') ? '— needs scope' : '— not connected'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Hash size={11} style={{ color: 'var(--text-muted)' }} />
                    <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>Discord — add bot token</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Right: Sidebar */}
      <div className="overflow-auto shrink-0" style={{ width: '320px', borderLeft: '1px solid var(--border)', background: 'var(--surface)' }}>
        {/* Person filter */}
        {uniqueAssignees.length > 0 && (
          <div className="px-4 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
            <span className="text-[8px] font-bold uppercase tracking-[1.5px] block mb-1.5" style={{ color: 'var(--text-muted)' }}>
              SHOWING FOR
            </span>
            <div className="flex flex-wrap gap-1">
              {uniqueAssignees.map(name => {
                const displayName = name.toLowerCase().startsWith(firstName.toLowerCase()) ? 'Me' : cleanAssigneeFull(name).split(' ')[0];
                return (
                  <button key={name} onClick={() => setPersonFilter(name)}
                    className="text-[10px] px-2 py-0.5 rounded font-medium transition-colors"
                    style={{ background: personFilter === name ? 'var(--accent)' : 'var(--bg)', color: personFilter === name ? '#fff' : 'var(--text-muted)' }}>
                    {displayName}
                  </button>
                );
              })}
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

        {admin && (
          <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
            <WbsoTracker />
          </div>
        )}
      </div>

      <ToastBar toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

// ── Stream section ─────────────────────────────────────────────
function StreamSection({ label, count, color, items, expandedItem, setExpandedItem, onDone, onSnooze, onDismiss, personalTasks, onUpdateDate, onSetReminder, editingTask, setEditingTask, editTitle, setEditTitle, onEditSave }: {
  label: string; count: number; color: string; items: StreamItem[];
  expandedItem: string | null; setExpandedItem: (id: string | null) => void;
  onDone: (id: string, title: string) => void;
  onSnooze: (id: string, title: string) => void;
  onDismiss: (id: string, title: string) => void;
  personalTasks: PersonalTask[];
  onUpdateDate: (taskId: string, date: string) => void;
  onSetReminder: (taskId: string, reminder: string | null) => void;
  editingTask: string | null;
  setEditingTask: (id: string | null) => void;
  editTitle: string;
  setEditTitle: (title: string) => void;
  onEditSave: (id: string, title: string) => void;
}) {
  return (
    <>
      <div className="px-6 py-1.5 sticky top-0 z-10" style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
        <span className="text-[8px] font-bold uppercase tracking-[1.5px]" style={{ color }}>{label} ({count})</span>
      </div>
      {items.map(item => {
        const rawId = item.id.replace(/^(lin_|hs_|pt_|drv_|cht_|eml_)/, '');
        const isExpanded = expandedItem === item.id;
        const isPersonal = item.source === 'personal';
        const pt = isPersonal ? personalTasks.find(t => t.id === rawId) : null;
        const isEditing = editingTask === rawId;

        return (
          <div key={item.id} className="group">
            <div
              className="flex items-center gap-2 px-6 py-2 transition-colors cursor-pointer"
              style={{ borderBottom: '1px solid var(--border)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              onClick={() => setExpandedItem(isExpanded ? null : item.id)}
            >
              {/* Checkbox for ALL tasks */}
              <button onClick={e => { e.stopPropagation(); onDone(isPersonal ? item.id : rawId, item.title); }}
                className="shrink-0" title="Mark done">
                <Circle size={14} style={{ color: 'var(--text-muted)' }} />
              </button>

              {/* Source badge */}
              <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0"
                style={{ background: SOURCE_COLORS[item.source] + '22', color: SOURCE_COLORS[item.source] }}>
                {SOURCE_LABELS[item.source]}
              </span>

              {/* Title */}
              {isEditing ? (
                <input autoFocus value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { onEditSave(rawId, editTitle); setEditingTask(null); }
                    if (e.key === 'Escape') setEditingTask(null);
                  }}
                  onBlur={() => { onEditSave(rawId, editTitle); setEditingTask(null); }}
                  onClick={e => e.stopPropagation()}
                  className="text-xs flex-1 bg-transparent border-none outline-none px-1 rounded"
                  style={{ color: 'var(--text)', background: 'var(--bg)', border: '1px solid var(--accent)' }}
                />
              ) : item.url ? (
                <a href={item.url} target="_blank" rel="noopener"
                  className="text-xs flex-1 truncate hover:underline"
                  style={{ color: 'var(--text)' }}
                  onClick={e => e.stopPropagation()}>
                  {item.title}
                </a>
              ) : (
                <span className="text-xs flex-1 truncate" style={{ color: 'var(--text)' }}>{item.title}</span>
              )}

              {/* Source label for personal tasks from meetings */}
              {isPersonal && pt?.sourceLabel && (
                <span className="text-[8px] px-1 py-0.5 rounded shrink-0 truncate max-w-[100px]"
                  style={{ background: 'var(--bg)', color: 'var(--text-muted)' }}>
                  {pt.sourceLabel}
                </span>
              )}

              {/* Priority */}
              {item.priority <= 2 && (
                <span className="text-[9px] px-1 py-0.5 rounded shrink-0 font-bold"
                  style={{ background: (item.priority === 1 ? '#ef4444' : '#f97316') + '22', color: item.priority === 1 ? '#ef4444' : '#f97316' }}>
                  {item.priority === 1 ? 'URGENT' : 'HIGH'}
                </span>
              )}

              {/* Due date — clickable for personal tasks */}
              {isPersonal && !item.dueDate ? (
                <button onClick={e => { e.stopPropagation(); setExpandedItem(item.id); }}
                  className="text-[9px] shrink-0 px-1.5 py-0.5 rounded flex items-center gap-1"
                  style={{ color: 'var(--accent)', background: 'var(--bg)', border: '1px dashed var(--accent)' }}
                  title="Click to set due date">
                  <Calendar size={8} /> Add date
                </button>
              ) : item.dueDate ? (
                <button onClick={e => { if (isPersonal) { e.stopPropagation(); setExpandedItem(item.id); } }}
                  className="text-[10px] shrink-0 px-1.5 py-0.5 rounded flex items-center gap-0.5"
                  style={{
                    color: isOverdue(item.dueDate) ? '#ef4444' : isDueToday(item.dueDate) ? 'var(--accent)' : '#f59e0b',
                    background: isPersonal ? 'var(--bg)' : 'transparent',
                    border: isPersonal ? '1px solid var(--border)' : 'none',
                    cursor: isPersonal ? 'pointer' : 'default',
                  }}
                  title={isPersonal ? 'Click to change date' : undefined}>
                  {isPersonal && <Calendar size={8} />}
                  {formatDate(item.dueDate)}
                </button>
              ) : null}

              {/* Assignee */}
              {item.assignee && !isPersonal && (
                <span className="text-[9px] px-1.5 py-0.5 rounded shrink-0" style={{ background: 'var(--bg)', color: 'var(--text-muted)' }}>
                  {item.assignee.split(' ')[0]}
                </span>
              )}

              {/* Status */}
              {!isPersonal && (
                <span className="text-[9px] shrink-0" style={{ color: 'var(--text-muted)' }}>{item.status}</span>
              )}

              {/* Actions on hover */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                {isPersonal && (
                  <button onClick={e => { e.stopPropagation(); setEditTitle(item.title); setEditingTask(rawId); }} title="Edit">
                    <Edit3 size={12} style={{ color: 'var(--accent)' }} />
                  </button>
                )}
                <button onClick={e => { e.stopPropagation(); onSnooze(rawId, item.title); }} title="Snooze">
                  <AlarmClock size={12} style={{ color: 'var(--text-muted)' }} />
                </button>
                <button onClick={e => { e.stopPropagation(); onDismiss(isPersonal ? item.id : rawId, item.title); }} title={isPersonal ? 'Delete' : 'Dismiss'}>
                  {isPersonal ? <Trash2 size={12} style={{ color: '#ef4444' }} /> : <X size={12} style={{ color: 'var(--text-muted)' }} />}
                </button>
              </div>
            </div>

            {/* Expansion panel */}
            {isExpanded && (
              <div className="px-10 py-2 text-xs" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                <div className="flex items-center gap-4 flex-wrap">
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
                  {isPersonal && pt && (
                    <>
                      <div className="flex items-center gap-1.5">
                        <Calendar size={10} style={{ color: 'var(--text-muted)' }} />
                        <input type="date" value={pt.dueDate || ''}
                          onChange={e => onUpdateDate(rawId, e.target.value)}
                          onClick={e => e.stopPropagation()}
                          className="text-[10px] bg-transparent outline-none px-1 py-0.5 rounded"
                          style={{ color: 'var(--text)', border: '1px solid var(--border)' }} />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Bell size={10} style={{ color: pt.reminder ? '#f59e0b' : 'var(--text-muted)' }} />
                        <input type="date" value={pt.reminder || ''}
                          onChange={e => onSetReminder(rawId, e.target.value || null)}
                          onClick={e => e.stopPropagation()}
                          className="text-[10px] bg-transparent outline-none px-1 py-0.5 rounded"
                          style={{ color: 'var(--text)', border: '1px solid var(--border)' }}
                          title="Set reminder date" />
                      </div>
                    </>
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
