'use client';
import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import { TrendingUp } from 'lucide-react';

interface StatRow {
  id: string;
  name: string;
  month: string;
  expected: number;
  completed: number;
  missed: number;
  rescheduled: number;
}

function formatMonth(ym: string) {
  if (!ym) return '—';
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function CompletionBar({ completed, expected }: { completed: number; expected: number }) {
  const pct = expected > 0 ? Math.round((completed / expected) * 100) : 0;
  const colour = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden w-16">
        <div className={`h-full ${colour} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-700 w-8 text-right">{pct}%</span>
    </div>
  );
}

export default function SessionReportsPage() {
  const [tab, setTab] = useState<'student' | 'tutor'>('student');
  const [rows, setRows] = useState<StatRow[]>([]);
  const [months, setMonths] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const url = `/api/reports/monthly?type=${tab}${selectedMonth ? `&month=${selectedMonth}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      const fetched: StatRow[] = data.rows || [];
      setRows(fetched);
      if (!selectedMonth) {
        const unique = [...new Set(fetched.map(r => r.month))].sort().reverse();
        setMonths(unique);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [tab, selectedMonth]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // Reset month filter when switching tabs
  const switchTab = (t: 'student' | 'tutor') => {
    setSelectedMonth('');
    setTab(t);
  };

  const columns = [
    { key: 'name', label: tab === 'student' ? 'Student' : 'Tutor', sortable: true },
    { key: 'month', label: 'Month', render: (v: unknown) => formatMonth(v as string), sortable: true },
    { key: 'expected', label: 'Expected', render: (v: unknown) => (
      <span className="font-semibold text-gray-700">{v as number}</span>
    )},
    { key: 'completed', label: 'Completed', render: (v: unknown) => (
      <span className="font-semibold text-green-700">{v as number}</span>
    )},
    { key: 'missed', label: 'Missed', render: (v: unknown) => (
      <span className={`font-semibold ${(v as number) > 0 ? 'text-red-600' : 'text-gray-400'}`}>{v as number}</span>
    )},
    { key: 'rescheduled', label: 'Rescheduled', render: (v: unknown) => (
      <span className={`font-semibold ${(v as number) > 0 ? 'text-amber-600' : 'text-gray-400'}`}>{v as number}</span>
    )},
    { key: 'completed', label: 'Completion', render: (_: unknown, row: StatRow) => (
      <CompletionBar completed={row.completed} expected={row.expected} />
    )},
  ];

  const totals = rows.reduce((acc, r) => ({
    expected: acc.expected + r.expected,
    completed: acc.completed + r.completed,
    missed: acc.missed + r.missed,
    rescheduled: acc.rescheduled + r.rescheduled,
  }), { expected: 0, completed: 0, missed: 0, rescheduled: 0 });

  return (
    <DashboardLayout title="Session Reports">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <TrendingUp size={22} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Session Reports</h2>
            <p className="text-gray-500 text-sm">Monthly session counts per {tab}</p>
          </div>
        </div>

        {/* Summary cards */}
        {rows.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Expected', value: totals.expected, colour: 'text-gray-700 bg-gray-50 border-gray-200' },
              { label: 'Completed', value: totals.completed, colour: 'text-green-700 bg-green-50 border-green-200' },
              { label: 'Missed', value: totals.missed, colour: 'text-red-700 bg-red-50 border-red-200' },
              { label: 'Rescheduled', value: totals.rescheduled, colour: 'text-amber-700 bg-amber-50 border-amber-200' },
            ].map(({ label, value, colour }) => (
              <div key={label} className={`rounded-xl border px-4 py-3 ${colour}`}>
                <p className="text-xs font-medium opacity-70 mb-0.5">{label}</p>
                <p className="text-2xl font-bold">{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            {(['student', 'tutor'] as const).map(t => (
              <button key={t} onClick={() => switchTab(t)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                  tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {t === 'student' ? 'Students' : 'Tutors'}
              </button>
            ))}
          </div>

          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All months</option>
            {months.map(m => (
              <option key={m} value={m}>{formatMonth(m)}</option>
            ))}
          </select>
        </div>

        <DataTable
          data={rows}
          columns={columns}
          loading={loading}
          searchKeys={['name', 'month']}
          emptyMessage={`No session data for ${tab === 'student' ? 'students' : 'tutors'}`}
        />
      </div>
    </DashboardLayout>
  );
}
