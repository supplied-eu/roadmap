'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { BarChart3, TrendingUp, CheckCircle, Clock, Mail, Target, Users, Activity, DollarSign, Circle, Edit3, Save, RotateCcw, AlertTriangle, ArrowDown, ArrowUp, SlidersHorizontal } from 'lucide-react';

type KPIData = {
  linear: {
    totalOpen: number; urgent: number; high: number; completed7d: number;
    byProject: { name: string; count: number }[];
    byStatus: { name: string; count: number; color: string }[];
    byAssignee: { name: string; count: number }[];
  };
  hubspot: {
    totalDeals: number; openDeals: number; openPipeline: number;
    closedWon: number; closedWonCount: number; closedLost: number; winRate: number;
    avgDealSize: number;
    byStage: { name: string; count: number; value: number; color: string }[];
  };
  google: { eventsToday: number; unreadEmails: number };
  health: { green: number; amber: number; red: number; total: number };
};

// Financial model types
type MonthData = {
  month: string; // "Jan-26", "Feb-26", etc.
  isActual: boolean;
  revenue: number; // k EUR
  recurringRevenue: number;
  nonRecurringRevenue: number;
  cogs: number;
  payroll: number;
  managementFees: number;
  opex: number;
  capex: number;
  ebitda: number;
  cashStart: number;
  cashEnd: number;
  netBurn: number;
  runway: number; // months
  mrr: number;
  arr: number;
  newCustomers: number;
  churnedCustomers: number;
  totalCustomers: number;
  headcount: number;
};

const MONTHS = ['Jan-26', 'Feb-26', 'Mar-26', 'Apr-26', 'May-26', 'Jun-26', 'Jul-26', 'Aug-26', 'Sep-26', 'Oct-26', 'Nov-26', 'Dec-26'];

// Default financial model based on the Google Sheets budget
const DEFAULT_FINANCIALS: MonthData[] = [
  { month: 'Jan-26', isActual: true, revenue: 9.1, recurringRevenue: 9.1, nonRecurringRevenue: 0, cogs: 3.5, payroll: 52, managementFees: 12, opex: 11.3, capex: 0, ebitda: -69.3, cashStart: 1162, cashEnd: 1099, netBurn: 63, runway: 17, mrr: 9, arr: 108, newCustomers: 0, churnedCustomers: 0, totalCustomers: 5, headcount: 12 },
  { month: 'Feb-26', isActual: false, revenue: 10.2, recurringRevenue: 10.2, nonRecurringRevenue: 0, cogs: 3.5, payroll: 52, managementFees: 12, opex: 11.3, capex: 0, ebitda: -68.1, cashStart: 1099, cashEnd: 1031, netBurn: 68, runway: 15, mrr: 10, arr: 122, newCustomers: 1, churnedCustomers: 0, totalCustomers: 6, headcount: 12 },
  { month: 'Mar-26', isActual: false, revenue: 11.5, recurringRevenue: 11.5, nonRecurringRevenue: 0, cogs: 3.7, payroll: 55, managementFees: 12, opex: 11.5, capex: 0, ebitda: -70.7, cashStart: 1031, cashEnd: 960, netBurn: 71, runway: 14, mrr: 11.5, arr: 138, newCustomers: 1, churnedCustomers: 0, totalCustomers: 7, headcount: 13 },
  { month: 'Apr-26', isActual: false, revenue: 13, recurringRevenue: 12.5, nonRecurringRevenue: 0.5, cogs: 3.9, payroll: 55, managementFees: 12, opex: 12, capex: 0, ebitda: -69.9, cashStart: 960, cashEnd: 890, netBurn: 70, runway: 13, mrr: 12.5, arr: 150, newCustomers: 1, churnedCustomers: 0, totalCustomers: 8, headcount: 13 },
  { month: 'May-26', isActual: false, revenue: 14.5, recurringRevenue: 14, nonRecurringRevenue: 0.5, cogs: 4.1, payroll: 58, managementFees: 12, opex: 12, capex: 0, ebitda: -71.6, cashStart: 890, cashEnd: 818, netBurn: 72, runway: 11, mrr: 14, arr: 168, newCustomers: 2, churnedCustomers: 0, totalCustomers: 10, headcount: 14 },
  { month: 'Jun-26', isActual: false, revenue: 16, recurringRevenue: 15.5, nonRecurringRevenue: 0.5, cogs: 4.3, payroll: 58, managementFees: 12, opex: 12.5, capex: 0, ebitda: -70.8, cashStart: 818, cashEnd: 747, netBurn: 71, runway: 11, mrr: 15.5, arr: 186, newCustomers: 2, churnedCustomers: 0, totalCustomers: 12, headcount: 14 },
  { month: 'Jul-26', isActual: false, revenue: 17, recurringRevenue: 16.5, nonRecurringRevenue: 0.5, cogs: 4.5, payroll: 60, managementFees: 12, opex: 12.5, capex: 0, ebitda: -72, cashStart: 747, cashEnd: 675, netBurn: 72, runway: 9, mrr: 16.5, arr: 198, newCustomers: 1, churnedCustomers: 0, totalCustomers: 13, headcount: 15 },
  { month: 'Aug-26', isActual: false, revenue: 18, recurringRevenue: 17.5, nonRecurringRevenue: 0.5, cogs: 4.7, payroll: 60, managementFees: 12, opex: 13, capex: 0, ebitda: -71.7, cashStart: 675, cashEnd: 603, netBurn: 72, runway: 8, mrr: 17.5, arr: 210, newCustomers: 1, churnedCustomers: 0, totalCustomers: 14, headcount: 15 },
  { month: 'Sep-26', isActual: false, revenue: 19, recurringRevenue: 18.5, nonRecurringRevenue: 0.5, cogs: 5, payroll: 62, managementFees: 12, opex: 13, capex: 0, ebitda: -73, cashStart: 603, cashEnd: 530, netBurn: 73, runway: 7, mrr: 18.5, arr: 222, newCustomers: 1, churnedCustomers: 0, totalCustomers: 15, headcount: 16 },
  { month: 'Oct-26', isActual: false, revenue: 19.5, recurringRevenue: 19, nonRecurringRevenue: 0.5, cogs: 5.2, payroll: 62, managementFees: 12, opex: 13.5, capex: 0, ebitda: -73.2, cashStart: 530, cashEnd: 457, netBurn: 73, runway: 6, mrr: 19, arr: 228, newCustomers: 1, churnedCustomers: 0, totalCustomers: 16, headcount: 16 },
  { month: 'Nov-26', isActual: false, revenue: 20, recurringRevenue: 19.5, nonRecurringRevenue: 0.5, cogs: 5.4, payroll: 65, managementFees: 12, opex: 13.5, capex: 0, ebitda: -75.9, cashStart: 457, cashEnd: 381, netBurn: 76, runway: 5, mrr: 19.5, arr: 234, newCustomers: 1, churnedCustomers: 0, totalCustomers: 17, headcount: 17 },
  { month: 'Dec-26', isActual: false, revenue: 21, recurringRevenue: 20.5, nonRecurringRevenue: 0.5, cogs: 5.6, payroll: 65, managementFees: 12, opex: 14, capex: 0, ebitda: -75.6, cashStart: 381, cashEnd: 305, netBurn: 76, runway: 4, mrr: 20.5, arr: 246, newCustomers: 1, churnedCustomers: 0, totalCustomers: 18, headcount: 17 },
];

const STAGE_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6', '#818cf8'];
const healthColors = { green: '#22c55e', amber: '#f59e0b', red: '#ef4444' };

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
}

function formatK(amount: number) {
  if (Math.abs(amount) >= 1000) return `€${(amount / 1000).toFixed(1)}M`;
  return `€${amount.toFixed(0)}k`;
}

// Recalculate derived fields after user edits
function recalculate(data: MonthData[]): MonthData[] {
  const result = [...data];
  for (let i = 0; i < result.length; i++) {
    const m = { ...result[i] };
    m.revenue = m.recurringRevenue + m.nonRecurringRevenue;
    m.ebitda = m.revenue - m.cogs - m.payroll - m.managementFees - m.opex - m.capex;
    m.netBurn = Math.max(0, -m.ebitda);
    if (i === 0) {
      m.cashEnd = m.cashStart + m.ebitda;
    } else {
      m.cashStart = result[i - 1].cashEnd;
      m.cashEnd = m.cashStart + m.ebitda;
    }
    m.mrr = m.recurringRevenue;
    m.arr = m.mrr * 12;
    m.runway = m.netBurn > 0 ? Math.round(m.cashEnd / m.netBurn) : 99;
    result[i] = m;
  }
  return result;
}

// LocalStorage for financial model
function loadFinancials(): MonthData[] {
  if (typeof window === 'undefined') return DEFAULT_FINANCIALS;
  try {
    const saved = localStorage.getItem('kpi_financials');
    if (saved) return JSON.parse(saved);
  } catch {}
  return DEFAULT_FINANCIALS;
}
function saveFinancials(data: MonthData[]) {
  localStorage.setItem('kpi_financials', JSON.stringify(data));
}

export default function KpisPage() {
  const { user } = useUser();
  const [data, setData] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [financials, setFinancials] = useState<MonthData[]>(loadFinancials);
  const [editingCell, setEditingCell] = useState<{ row: string; month: number } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showModeling, setShowModeling] = useState(true);

  // Scenario modelling state
  const [scenarioMrrGrowth, setScenarioMrrGrowth] = useState(10); // % per month
  const [scenarioPayrollChange, setScenarioPayrollChange] = useState(0); // % change
  const [scenarioOpexChange, setScenarioOpexChange] = useState(0); // % change
  const [scenarioFunding, setScenarioFunding] = useState(0); // k EUR additional cash
  const [scenarioCustomerGrowth, setScenarioCustomerGrowth] = useState(1); // new customers/month
  const [scenarioApplied, setScenarioApplied] = useState(false);

  // Calculate scenario-adjusted financials
  const computeScenarioFinancials = useCallback((
    base: MonthData[],
    mrrGrowthPct: number,
    payrollChangePct: number,
    opexChangePct: number,
    fundingK: number,
    custGrowth: number,
  ): MonthData[] => {
    const scenario = base.map(m => ({ ...m }));
    let fundingApplied = false;
    for (let i = 0; i < scenario.length; i++) {
      if (scenario[i].isActual) continue;
      const prev = i > 0 ? scenario[i - 1] : null;
      // Apply MRR growth rate to recurring revenue
      if (prev) {
        scenario[i].recurringRevenue = prev.recurringRevenue * (1 + mrrGrowthPct / 100);
        scenario[i].mrr = scenario[i].recurringRevenue;
        scenario[i].arr = scenario[i].mrr * 12;
      }
      // Apply payroll change
      scenario[i].payroll = base[i].payroll * (1 + payrollChangePct / 100);
      // Apply opex change
      scenario[i].opex = base[i].opex * (1 + opexChangePct / 100);
      // Apply customer growth
      scenario[i].newCustomers = custGrowth;
      if (prev) {
        scenario[i].totalCustomers = prev.totalCustomers + custGrowth - scenario[i].churnedCustomers;
      }
      // Apply funding injection to first forecast month
      if (!fundingApplied && fundingK > 0) {
        scenario[i].cashStart = (prev ? prev.cashEnd : scenario[i].cashStart) + fundingK;
        fundingApplied = true;
      }
    }
    return recalculate(scenario);
  }, []);

  // Base runway (last month with positive cash)
  const baseRunway = financials.filter(m => !m.isActual).slice(-1)[0]?.runway ?? 0;
  const scenarioFinancials = computeScenarioFinancials(
    financials, scenarioMrrGrowth, scenarioPayrollChange, scenarioOpexChange, scenarioFunding, scenarioCustomerGrowth
  );
  const scenarioRunway = scenarioFinancials.filter(m => !m.isActual).slice(-1)[0]?.runway ?? 0;
  const runwayDelta = scenarioRunway - baseRunway;

  const resetScenario = useCallback(() => {
    setScenarioMrrGrowth(10);
    setScenarioPayrollChange(0);
    setScenarioOpexChange(0);
    setScenarioFunding(0);
    setScenarioCustomerGrowth(1);
    setScenarioApplied(false);
  }, []);

  const applyScenario = useCallback(() => {
    setFinancials(scenarioFinancials);
    setScenarioApplied(true);
  }, [scenarioFinancials]);

  // Save on change
  useEffect(() => { saveFinancials(financials); }, [financials]);

  const resetFinancials = useCallback(() => {
    setFinancials(DEFAULT_FINANCIALS);
    localStorage.removeItem('kpi_financials');
  }, []);

  const updateField = useCallback((monthIdx: number, field: keyof MonthData, value: number) => {
    setFinancials(prev => {
      const updated = [...prev];
      updated[monthIdx] = { ...updated[monthIdx], [field]: value };
      return recalculate(updated);
    });
  }, []);

  useEffect(() => {
    if (!user?.email) return;

    const fetchAll = async () => {
      try {
        const [linearRes, hubspotRes, googleRes, companiesRes] = await Promise.all([
          fetch('/api/linear').then(r => r.json()).catch(() => ({ issues: [] })),
          fetch('/api/hubspot').then(r => r.json()).catch(() => ({ deals: [], pipelines: [] })),
          fetch(`/api/google?user=${user.name?.split(' ')[0]?.toLowerCase() || 'johann'}`)
            .then(r => r.json()).catch(() => ({ calendar: [], emails: [] })),
          fetch('/api/hubspot/companies').then(r => r.json()).catch(() => ({ companies: [] })),
        ]);

        const issues = linearRes.issues || [];
        const projectCounts = new Map<string, number>();
        const statusCounts = new Map<string, { count: number; color: string }>();
        const assigneeCounts = new Map<string, number>();
        for (const issue of issues) {
          const proj = issue.project || 'No Project';
          projectCounts.set(proj, (projectCounts.get(proj) || 0) + 1);
          const status = issue.status || 'Unknown';
          const existing = statusCounts.get(status) || { count: 0, color: issue.statusColor || '#94a3b8' };
          statusCounts.set(status, { count: existing.count + 1, color: existing.color });
          const assignee = issue.assignee || 'Unassigned';
          assigneeCounts.set(assignee, (assigneeCounts.get(assignee) || 0) + 1);
        }

        const linear = {
          totalOpen: issues.length,
          urgent: issues.filter((i: any) => i.priority === 1).length,
          high: issues.filter((i: any) => i.priority === 2).length,
          completed7d: 0,
          byProject: [...projectCounts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
          byStatus: [...statusCounts.entries()].map(([name, { count, color }]) => ({ name, count, color })).sort((a, b) => b.count - a.count),
          byAssignee: [...assigneeCounts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
        };

        const deals = hubspotRes.deals || [];
        const pipelines = hubspotRes.pipelines || [];
        const openDeals = deals.filter((d: any) => d.stage !== 'closedwon' && d.stage !== 'closedlost' && !d.stageLabel?.toLowerCase().includes('closed'));
        const wonDeals = deals.filter((d: any) => d.stage === 'closedwon' || d.stageLabel?.toLowerCase().includes('closed won'));
        const lostDeals = deals.filter((d: any) => d.stage === 'closedlost' || d.stageLabel?.toLowerCase().includes('closed lost'));
        const totalPipeline = openDeals.reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
        const totalWon = wonDeals.reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
        const wr = wonDeals.length + lostDeals.length > 0
          ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100) : 0;

        const stageMap = new Map<string, { count: number; value: number }>();
        for (const p of pipelines) for (const s of (p as any).stages || []) {}
        for (const d of openDeals) {
          const key = d.stageLabel || d.stage;
          const ex = stageMap.get(key) || { count: 0, value: 0 };
          stageMap.set(key, { count: ex.count + 1, value: ex.value + (d.amount || 0) });
        }

        const hubspot = {
          totalDeals: deals.length, openDeals: openDeals.length, openPipeline: totalPipeline,
          closedWon: totalWon, closedWonCount: wonDeals.length, closedLost: lostDeals.length, winRate: wr,
          avgDealSize: openDeals.length > 0 ? Math.round(totalPipeline / openDeals.length) : 0,
          byStage: [...stageMap.entries()].map(([name, { count, value }], i) => ({
            name, count, value, color: STAGE_COLORS[i % STAGE_COLORS.length],
          })),
        };

        const todayEvents = (googleRes.calendar || []).filter((e: any) => e.isToday);
        const unread = (googleRes.emails || []).filter((e: any) => e.unread).length;
        const google = { eventsToday: todayEvents.length, unreadEmails: unread };

        const companies = companiesRes.companies || [];
        const health = { green: 0, amber: 0, red: 0, total: companies.length };
        for (const c of companies) {
          if (!c.lastActivity) { health.red++; continue; }
          const daysSince = (Date.now() - new Date(c.lastActivity).getTime()) / 86400000;
          if (daysSince > 30) health.red++;
          else if (daysSince > 14) health.amber++;
          else health.green++;
        }

        setData({ linear, hubspot, google, health });
      } catch (err) {
        console.error('KPI fetch error:', err);
      }
      setLoading(false);
    };

    fetchAll();
  }, [user]);

  // Current month index (0-based for 2026)
  const currentMonthIdx = Math.max(0, Math.min(11, new Date().getMonth()));
  const currentData = financials[currentMonthIdx];
  const prevData = currentMonthIdx > 0 ? financials[currentMonthIdx - 1] : null;

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-lg font-bold" style={{ color: 'var(--text)' }}>KPIs</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Loading metrics...</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="rounded-lg p-5 animate-pulse" style={{ background: 'var(--surface)', height: '100px' }} />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-lg font-bold mb-4" style={{ color: 'var(--text)' }}>KPIs</h1>
        <p style={{ color: 'var(--text-muted)' }}>Failed to load metrics.</p>
      </div>
    );
  }

  const maxProjectCount = Math.max(...data.linear.byProject.map(p => p.count), 1);
  const maxStatusCount = Math.max(...data.linear.byStatus.map(s => s.count), 1);
  const maxAssigneeCount = Math.max(...data.linear.byAssignee.map(a => a.count), 1);
  const maxStageCount = Math.max(...data.hubspot.byStage.map(s => s.count), 1);

  // Runway warning
  const runwayMonths = currentData?.runway || 0;
  const runwayColor = runwayMonths <= 6 ? '#ef4444' : runwayMonths <= 12 ? '#f59e0b' : '#22c55e';

  // Editable cell handlers
  const startEdit = (row: string, monthIdx: number, currentValue: number) => {
    setEditingCell({ row, month: monthIdx });
    setEditValue(currentValue.toString());
  };

  const commitEdit = () => {
    if (!editingCell) return;
    const val = parseFloat(editValue);
    if (!isNaN(val)) {
      updateField(editingCell.month, editingCell.row as keyof MonthData, val);
    }
    setEditingCell(null);
  };

  const EDITABLE_ROWS: { key: keyof MonthData; label: string; color: string }[] = [
    { key: 'recurringRevenue', label: 'Recurring Revenue', color: '#22c55e' },
    { key: 'nonRecurringRevenue', label: 'Non-recurring Revenue', color: '#10b981' },
    { key: 'cogs', label: 'COGS', color: '#ef4444' },
    { key: 'payroll', label: 'Payroll', color: '#f97316' },
    { key: 'managementFees', label: 'Management Fees', color: '#f59e0b' },
    { key: 'opex', label: 'Other OPEX', color: '#ec4899' },
    { key: 'capex', label: 'CAPEX', color: '#8b5cf6' },
    { key: 'headcount', label: 'Headcount', color: '#6366f1' },
    { key: 'newCustomers', label: 'New Customers', color: '#14b8a6' },
    { key: 'churnedCustomers', label: 'Churned Customers', color: '#ef4444' },
  ];

  const DERIVED_ROWS: { key: keyof MonthData; label: string; color: string; bold?: boolean }[] = [
    { key: 'revenue', label: 'Total Revenue', color: '#22c55e', bold: true },
    { key: 'ebitda', label: 'EBITDA', color: '#818cf8', bold: true },
    { key: 'netBurn', label: 'Net Burn', color: '#ef4444' },
    { key: 'cashEnd', label: 'Cash Balance', color: '#3b82f6', bold: true },
    { key: 'runway', label: 'Runway (months)', color: runwayColor, bold: true },
    { key: 'mrr', label: 'MRR', color: '#22c55e' },
    { key: 'arr', label: 'ARR', color: '#22c55e' },
    { key: 'totalCustomers', label: 'Total Customers', color: '#14b8a6' },
  ];

  return (
    <div className="p-6 max-w-[1600px] mx-auto overflow-auto">
      <div className="mb-5">
        <h1 className="text-lg font-bold" style={{ color: 'var(--text)' }}>KPIs</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Cross-system performance metrics</p>
      </div>

      {/* Top stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Open Tasks" value={data.linear.totalOpen} icon={Target} color="var(--accent)" subtitle={`${data.linear.urgent} urgent · ${data.linear.high} high`} />
        <StatCard label="Open Pipeline" value={formatCurrency(data.hubspot.openPipeline)} icon={TrendingUp} color="#818cf8" subtitle={`${data.hubspot.openDeals} deals · avg ${formatCurrency(data.hubspot.avgDealSize)}`} />
        <StatCard label="Revenue Won" value={formatCurrency(data.hubspot.closedWon)} icon={CheckCircle} color="#22c55e" subtitle={`${data.hubspot.winRate}% win rate · ${data.hubspot.closedWonCount} deals`} />
        <StatCard label="Unread Emails" value={data.google.unreadEmails} icon={Mail} color="#f59e0b" subtitle={`${data.google.eventsToday} meetings today`} />
      </div>

      {/* Financial Runway Modeling */}
      <div className="rounded-lg mb-5 overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <DollarSign size={16} style={{ color: '#818cf8' }} />
            <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Financial Model & Runway
            </h3>
            {runwayMonths <= 12 && (
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-bold"
                style={{ background: runwayColor + '22', color: runwayColor }}>
                <AlertTriangle size={10} /> {runwayMonths} months runway
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={resetFinancials}
              className="text-[10px] px-2 py-1 rounded flex items-center gap-1"
              style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              <RotateCcw size={10} /> Reset
            </button>
            <button onClick={() => setShowModeling(!showModeling)}
              className="text-[10px] px-2 py-1 rounded"
              style={{ background: showModeling ? 'var(--accent)' : 'var(--bg)', color: showModeling ? '#fff' : 'var(--text-muted)', border: '1px solid var(--border)' }}>
              {showModeling ? 'Collapse' : 'Expand'}
            </button>
          </div>
        </div>

        {/* Key Financial KPIs strip */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 px-5 py-3" style={{ borderBottom: showModeling ? '1px solid var(--border)' : 'none' }}>
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Cash</div>
            <div className="text-lg font-bold" style={{ color: '#3b82f6' }}>{formatK(currentData?.cashEnd || 0)}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Runway</div>
            <div className="text-lg font-bold" style={{ color: runwayColor }}>{runwayMonths} mo</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>MRR</div>
            <div className="text-lg font-bold" style={{ color: '#22c55e' }}>{formatK(currentData?.mrr || 0)}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Net Burn</div>
            <div className="text-lg font-bold" style={{ color: '#ef4444' }}>{formatK(currentData?.netBurn || 0)}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>ARR</div>
            <div className="text-lg font-bold" style={{ color: '#22c55e' }}>{formatK(currentData?.arr || 0)}</div>
          </div>
        </div>

        {/* Scenario Modelling Panel */}
        {showModeling && (
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 mb-3">
              <SlidersHorizontal size={14} style={{ color: '#f59e0b' }} />
              <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Scenario Modelling
              </h3>
              {scenarioApplied && (
                <span className="text-[9px] px-2 py-0.5 rounded font-bold" style={{ background: '#22c55e22', color: '#22c55e' }}>
                  Applied
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
              {/* MRR Growth Rate */}
              <div>
                <label className="text-[10px] font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>
                  MRR Growth Rate: <span style={{ color: '#22c55e' }}>{scenarioMrrGrowth}%</span>/mo
                </label>
                <input type="range" min={0} max={30} step={1} value={scenarioMrrGrowth}
                  onChange={e => { setScenarioMrrGrowth(Number(e.target.value)); setScenarioApplied(false); }}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(to right, #22c55e ${(scenarioMrrGrowth / 30) * 100}%, var(--border) ${(scenarioMrrGrowth / 30) * 100}%)` }} />
                <div className="flex justify-between text-[8px]" style={{ color: 'var(--text-muted)' }}>
                  <span>0%</span><span>30%</span>
                </div>
              </div>
              {/* Payroll Change */}
              <div>
                <label className="text-[10px] font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>
                  Payroll Change: <span style={{ color: scenarioPayrollChange > 0 ? '#ef4444' : scenarioPayrollChange < 0 ? '#22c55e' : 'var(--text-muted)' }}>
                    {scenarioPayrollChange > 0 ? '+' : ''}{scenarioPayrollChange}%
                  </span>
                </label>
                <input type="range" min={-20} max={30} step={1} value={scenarioPayrollChange}
                  onChange={e => { setScenarioPayrollChange(Number(e.target.value)); setScenarioApplied(false); }}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(to right, var(--border) ${((scenarioPayrollChange + 20) / 50) * 100}%, var(--border) 0%)` }} />
                <div className="flex justify-between text-[8px]" style={{ color: 'var(--text-muted)' }}>
                  <span>-20%</span><span>+30%</span>
                </div>
              </div>
              {/* OPEX Change */}
              <div>
                <label className="text-[10px] font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>
                  OPEX Change: <span style={{ color: scenarioOpexChange > 0 ? '#ef4444' : scenarioOpexChange < 0 ? '#22c55e' : 'var(--text-muted)' }}>
                    {scenarioOpexChange > 0 ? '+' : ''}{scenarioOpexChange}%
                  </span>
                </label>
                <input type="range" min={-30} max={20} step={1} value={scenarioOpexChange}
                  onChange={e => { setScenarioOpexChange(Number(e.target.value)); setScenarioApplied(false); }}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(to right, var(--border) ${((scenarioOpexChange + 30) / 50) * 100}%, var(--border) 0%)` }} />
                <div className="flex justify-between text-[8px]" style={{ color: 'var(--text-muted)' }}>
                  <span>-30%</span><span>+20%</span>
                </div>
              </div>
              {/* New Funding */}
              <div>
                <label className="text-[10px] font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>
                  New Funding: <span style={{ color: '#3b82f6' }}>{formatK(scenarioFunding)}</span>
                </label>
                <input type="number" min={0} max={1000} step={50} value={scenarioFunding}
                  onChange={e => { setScenarioFunding(Math.max(0, Math.min(1000, Number(e.target.value)))); setScenarioApplied(false); }}
                  className="w-full text-[11px] px-2 py-1 rounded"
                  style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }}
                  placeholder="0 - 1000k" />
                <div className="flex justify-between text-[8px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  <span>0k</span><span>1,000k</span>
                </div>
              </div>
              {/* Customer Growth */}
              <div>
                <label className="text-[10px] font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>
                  Customer Growth: <span style={{ color: '#14b8a6' }}>{scenarioCustomerGrowth}</span>/mo
                </label>
                <input type="range" min={0} max={5} step={1} value={scenarioCustomerGrowth}
                  onChange={e => { setScenarioCustomerGrowth(Number(e.target.value)); setScenarioApplied(false); }}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(to right, #14b8a6 ${(scenarioCustomerGrowth / 5) * 100}%, var(--border) ${(scenarioCustomerGrowth / 5) * 100}%)` }} />
                <div className="flex justify-between text-[8px]" style={{ color: 'var(--text-muted)' }}>
                  <span>0</span><span>5</span>
                </div>
              </div>
            </div>

            {/* Scenario Results */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-3 rounded-md px-4 py-2" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <div>
                  <div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Projected Runway</div>
                  <div className="text-lg font-bold" style={{ color: scenarioRunway <= 6 ? '#ef4444' : scenarioRunway <= 12 ? '#f59e0b' : '#22c55e' }}>
                    {scenarioRunway} mo
                  </div>
                </div>
                <div style={{ width: '1px', height: '28px', background: 'var(--border)' }} />
                <div>
                  <div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>vs Base Case</div>
                  <div className="text-lg font-bold flex items-center gap-1" style={{ color: runwayDelta > 0 ? '#22c55e' : runwayDelta < 0 ? '#ef4444' : 'var(--text-muted)' }}>
                    {runwayDelta > 0 ? <ArrowUp size={14} /> : runwayDelta < 0 ? <ArrowDown size={14} /> : null}
                    {runwayDelta > 0 ? '+' : ''}{runwayDelta} mo
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={applyScenario}
                  className="text-[10px] px-3 py-1.5 rounded font-semibold flex items-center gap-1"
                  style={{ background: 'var(--accent)', color: '#fff', border: '1px solid var(--accent)' }}>
                  <Save size={10} /> Apply Scenario
                </button>
                <button onClick={resetScenario}
                  className="text-[10px] px-3 py-1.5 rounded flex items-center gap-1"
                  style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                  <RotateCcw size={10} /> Reset
                </button>
              </div>
            </div>
          </div>
        )}

        {showModeling && (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]" style={{ minWidth: '900px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th className="text-left px-3 py-2 sticky left-0 z-10" style={{ background: 'var(--surface)', color: 'var(--text-muted)', width: '160px' }}>
                    <span className="text-[9px] uppercase tracking-wider">k EUR</span>
                  </th>
                  {MONTHS.map((m, i) => (
                    <th key={m} className="text-right px-2 py-2" style={{
                      color: i === currentMonthIdx ? 'var(--accent)' : 'var(--text-muted)',
                      background: i === currentMonthIdx ? 'var(--accent)' + '08' : 'transparent',
                    }}>
                      <span className="text-[9px] uppercase">{m.split('-')[0]}</span>
                      {financials[i]?.isActual && <span className="text-[7px] ml-0.5 px-1 rounded" style={{ background: '#22c55e22', color: '#22c55e' }}>ACT</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Editable rows */}
                {EDITABLE_ROWS.map(row => (
                  <tr key={row.key} className="group" style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => { for (const td of e.currentTarget.children) (td as HTMLElement).style.background = 'var(--bg)'; }}
                    onMouseLeave={e => { for (const td of e.currentTarget.children) (td as HTMLElement).style.background = ''; }}>
                    <td className="px-3 py-1.5 sticky left-0 z-10 font-medium" style={{ background: 'var(--surface)', color: row.color }}>
                      {row.label}
                    </td>
                    {financials.map((m, i) => {
                      const val = m[row.key] as number;
                      const isEditing = editingCell?.row === row.key && editingCell?.month === i;
                      return (
                        <td key={i} className="text-right px-2 py-1.5 cursor-pointer"
                          style={{ background: i === currentMonthIdx ? 'var(--accent)' + '05' : 'transparent' }}
                          onClick={() => !m.isActual && startEdit(row.key, i, val)}>
                          {isEditing ? (
                            <input autoFocus type="number" value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              onBlur={commitEdit}
                              onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingCell(null); }}
                              className="w-14 text-right text-[11px] bg-transparent outline-none rounded px-1"
                              style={{ color: 'var(--text)', border: '1px solid var(--accent)' }} />
                          ) : (
                            <span style={{ color: m.isActual ? 'var(--text)' : 'var(--text-muted)' }}>
                              {val.toFixed(row.key === 'headcount' || row.key === 'newCustomers' || row.key === 'churnedCustomers' ? 0 : 1)}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {/* Separator */}
                <tr><td colSpan={13} style={{ height: '4px', background: 'var(--border)' }} /></tr>
                {/* Derived rows */}
                {DERIVED_ROWS.map(row => (
                  <tr key={row.key} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className={`px-3 py-1.5 sticky left-0 z-10 ${row.bold ? 'font-bold' : 'font-medium'}`}
                      style={{ background: 'var(--surface)', color: row.color }}>
                      {row.label}
                    </td>
                    {financials.map((m, i) => {
                      const val = m[row.key] as number;
                      const isRunway = row.key === 'runway';
                      const isCash = row.key === 'cashEnd';
                      return (
                        <td key={i} className={`text-right px-2 py-1.5 ${row.bold ? 'font-bold' : ''}`}
                          style={{
                            color: isRunway ? (val <= 6 ? '#ef4444' : val <= 12 ? '#f59e0b' : '#22c55e')
                              : isCash && val < 200 ? '#ef4444'
                              : row.key === 'ebitda' && val < 0 ? '#ef4444'
                              : row.color,
                            background: i === currentMonthIdx ? 'var(--accent)' + '05' : 'transparent',
                          }}>
                          {row.key === 'headcount' || row.key === 'totalCustomers' || isRunway
                            ? val.toFixed(0)
                            : val.toFixed(1)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Cash & Runway Visual */}
        <div className="px-5 py-3" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Cash Runway Projection</span>
          </div>
          <div className="flex items-end gap-1" style={{ height: '60px' }}>
            {financials.map((m, i) => {
              const maxCash = Math.max(...financials.map(f => f.cashEnd));
              const pct = maxCash > 0 ? (m.cashEnd / maxCash) * 100 : 0;
              const barColor = m.cashEnd < 200 ? '#ef4444' : m.cashEnd < 500 ? '#f59e0b' : '#3b82f6';
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={`${m.month}: ${formatK(m.cashEnd)}`}>
                  <div className="w-full rounded-t" style={{
                    height: `${Math.max(pct, 4)}%`, background: barColor,
                    opacity: i === currentMonthIdx ? 1 : 0.5,
                    border: i === currentMonthIdx ? '1px solid var(--accent)' : 'none',
                  }} />
                  <span className="text-[7px]" style={{ color: i === currentMonthIdx ? 'var(--accent)' : 'var(--text-muted)' }}>
                    {m.month.split('-')[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Customer Health + Sales Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Customer Health Distribution */}
        <div className="rounded-lg p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} style={{ color: 'var(--accent)' }} />
            <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Customer Health</h3>
          </div>
          <div className="flex items-center gap-6 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{data.health.total}</div>
              <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Total</div>
            </div>
            <div className="flex-1 flex items-center gap-1" style={{ height: '32px' }}>
              {data.health.green > 0 && (
                <div className="rounded-sm h-full transition-all" style={{
                  width: `${(data.health.green / data.health.total) * 100}%`,
                  background: healthColors.green, minWidth: '20px',
                }} />
              )}
              {data.health.amber > 0 && (
                <div className="rounded-sm h-full transition-all" style={{
                  width: `${(data.health.amber / data.health.total) * 100}%`,
                  background: healthColors.amber, minWidth: '20px',
                }} />
              )}
              {data.health.red > 0 && (
                <div className="rounded-sm h-full transition-all" style={{
                  width: `${(data.health.red / data.health.total) * 100}%`,
                  background: healthColors.red, minWidth: '20px',
                }} />
              )}
            </div>
          </div>
          <div className="flex items-center gap-6">
            <HealthStat label="Healthy" count={data.health.green} color={healthColors.green} />
            <HealthStat label="At Risk" count={data.health.amber} color={healthColors.amber} />
            <HealthStat label="Needs Attention" count={data.health.red} color={healthColors.red} />
          </div>
        </div>

        {/* Pipeline by Stage */}
        <div className="rounded-lg p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-4">
            <DollarSign size={16} style={{ color: '#818cf8' }} />
            <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Pipeline by Stage</h3>
          </div>
          {data.hubspot.byStage.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No pipeline data.</p>
          ) : (
            <div className="space-y-2.5">
              {data.hubspot.byStage.map(stage => (
                <div key={stage.name} className="flex items-center gap-3">
                  <span className="text-xs w-28 truncate" style={{ color: 'var(--text)' }}>{stage.name}</span>
                  <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--bg)' }}>
                    <div className="h-2 rounded-full transition-all" style={{
                      width: `${Math.max((stage.count / maxStageCount) * 100, 8)}%`,
                      background: stage.color,
                    }} />
                  </div>
                  <span className="text-xs font-medium w-6 text-right" style={{ color: 'var(--text-muted)' }}>{stage.count}</span>
                  <span className="text-xs w-20 text-right font-medium" style={{ color: stage.color }}>{formatCurrency(stage.value)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-4 mt-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="flex items-center gap-1.5">
              <Circle size={8} fill="#22c55e" stroke="#22c55e" />
              <span className="text-xs" style={{ color: '#22c55e' }}>Won: {data.hubspot.closedWonCount} ({formatCurrency(data.hubspot.closedWon)})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Circle size={8} fill="#ef4444" stroke="#ef4444" />
              <span className="text-xs" style={{ color: '#ef4444' }}>Lost: {data.hubspot.closedLost}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tasks by Project + Tasks by Status + Team Velocity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <div className="rounded-lg p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} style={{ color: 'var(--accent)' }} />
            <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Tasks by Project</h3>
          </div>
          {data.linear.byProject.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No tasks.</p>
          ) : (
            <div className="space-y-2.5">
              {data.linear.byProject.slice(0, 8).map(proj => (
                <ProgressBar key={proj.name} label={proj.name} value={proj.count} max={maxProjectCount} color="var(--accent)" />
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Clock size={16} style={{ color: 'var(--accent)' }} />
            <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Tasks by Status</h3>
          </div>
          {data.linear.byStatus.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No tasks.</p>
          ) : (
            <div className="space-y-2.5">
              {data.linear.byStatus.map(status => (
                <ProgressBar key={status.name} label={status.name} value={status.count} max={maxStatusCount} color={status.color} />
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} style={{ color: '#f59e0b' }} />
            <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Team Workload</h3>
          </div>
          {data.linear.byAssignee.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No data.</p>
          ) : (
            <div className="space-y-2.5">
              {data.linear.byAssignee.slice(0, 8).map((a, i) => (
                <ProgressBar key={a.name} label={a.name} value={a.count} max={maxAssigneeCount}
                  color={STAGE_COLORS[i % STAGE_COLORS.length]} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sales Summary */}
      <div className="rounded-lg p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} style={{ color: '#818cf8' }} />
          <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Sales Summary</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryBox label="Total Deals" value={data.hubspot.totalDeals} color="#818cf8" />
          <SummaryBox label="Open Deals" value={data.hubspot.openDeals} color="var(--accent)" />
          <SummaryBox label="Win Rate" value={`${data.hubspot.winRate}%`} color="#22c55e" />
          <SummaryBox label="Lost Deals" value={data.hubspot.closedLost} color="#ef4444" />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, subtitle }: {
  label: string; value: string | number; icon: any; color: string; subtitle?: string;
}) {
  return (
    <div className="rounded-lg p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</span>
        <Icon size={14} style={{ color }} />
      </div>
      <div className="text-xl font-bold" style={{ color }}>{value}</div>
      {subtitle && <div className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{subtitle}</div>}
    </div>
  );
}

function ProgressBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs w-28 truncate" style={{ color: 'var(--text)' }}>{label}</span>
      <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--bg)' }}>
        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-medium w-6 text-right" style={{ color: 'var(--text-muted)' }}>{value}</span>
    </div>
  );
}

function HealthStat({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Circle size={8} fill={color} stroke={color} />
      <span className="text-xs font-medium" style={{ color }}>{count}</span>
      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{label}</span>
    </div>
  );
}

function SummaryBox({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-md p-3 text-center" style={{ background: 'var(--bg)' }}>
      <div className="text-xl font-bold" style={{ color }}>{value}</div>
      <div className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
    </div>
  );
}
