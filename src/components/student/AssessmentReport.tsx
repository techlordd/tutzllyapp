'use client';
import { useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const ALL_MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

interface MonthData {
  month: string;
  count: string;
  avg_punctuality: string | null;
  avg_attentiveness: string | null;
  avg_engagement: string | null;
  avg_homework: string | null;
  avg_test_score: string | null;
}

interface AssessmentReportProps {
  studentId: string;
  tutorId?: string;
}

const parse = (v: string | null | undefined): number | null =>
  v != null && v !== '' ? parseFloat(v) : null;

const METRIC_LINES = [
  { key: 'Punctuality',   color: '#3b82f6' },
  { key: 'Attentiveness', color: '#8b5cf6' },
  { key: 'Engagement',    color: '#10b981' },
  { key: 'Homework',      color: '#f59e0b' },
];

const SUMMARY_CARDS = [
  { key: 'avg_punctuality',   label: 'Punctuality',   cls: 'bg-blue-50   text-blue-700   border-blue-100'   },
  { key: 'avg_attentiveness', label: 'Attentiveness', cls: 'bg-purple-50 text-purple-700 border-purple-100' },
  { key: 'avg_engagement',    label: 'Engagement',    cls: 'bg-green-50  text-green-700  border-green-100'  },
  { key: 'avg_homework',      label: 'Homework',      cls: 'bg-amber-50  text-amber-700  border-amber-100'  },
  { key: 'avg_test_score',    label: 'Test Score',    cls: 'bg-red-50    text-red-700    border-red-100'    },
];

export default function AssessmentReport({ studentId, tutorId }: AssessmentReportProps) {
  const currentYear  = new Date().getFullYear();
  const currentMonth = ALL_MONTHS[new Date().getMonth()];

  const [year,       setYear]       = useState(currentYear.toString());
  const [month,      setMonth]      = useState(currentMonth);
  const [yearlyData, setYearlyData] = useState<MonthData[]>([]);
  const [loading,    setLoading]    = useState(false);

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    const p = new URLSearchParams({ student_id: studentId, year });
    if (tutorId) p.set('tutor_id', tutorId);
    fetch(`/api/grades/stats?${p}`)
      .then(r => r.json())
      .then(d => setYearlyData(d.yearly_data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [studentId, year, tutorId]);

  const monthSummary = yearlyData.find(d => d.month === month);

  const chartData = ALL_MONTHS.map((m, i) => {
    const d = yearlyData.find(x => x.month === m);
    return {
      month: SHORT_MONTHS[i],
      'Test Score':    parse(d?.avg_test_score),
      'Punctuality':   parse(d?.avg_punctuality),
      'Attentiveness': parse(d?.avg_attentiveness),
      'Engagement':    parse(d?.avg_engagement),
      'Homework':      parse(d?.avg_homework),
    };
  });

  const yearOptions = Array.from({ length: 6 }, (_, i) => (currentYear - i).toString());

  return (
    <div className="space-y-6">

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Month</p>
          <select value={month} onChange={e => setMonth(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            {ALL_MONTHS.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Year</p>
          <select value={year} onChange={e => setYear(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            {yearOptions.map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Monthly summary cards */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Average Scores — {month} {year}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {SUMMARY_CARDS.map(({ key, label, cls }) => {
                const val = parse(monthSummary?.[key as keyof MonthData] as string | null);
                return (
                  <div key={key} className={`rounded-xl px-4 py-4 text-center border ${cls}`}>
                    <p className="text-2xl font-bold">{val != null ? `${val}%` : '—'}</p>
                    <p className="text-xs mt-1 opacity-80">{label}</p>
                  </div>
                );
              })}
            </div>
            {!monthSummary && (
              <p className="text-sm text-gray-400 mt-3 text-center">
                No grade data found for {month} {year}
              </p>
            )}
          </div>

          {/* Chart 1 — Test Score Jan–Dec */}
          <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              Average Test Score — {year}
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => v != null ? [`${v}%`, 'Test Score'] : ['—', 'Test Score']} />
                <Bar dataKey="Test Score" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Chart 2 — Academic Metrics Jan–Dec */}
          <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              Academic Metrics — {year}
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v, name) => v != null ? [`${v}%`, name] : ['—', name]} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                {METRIC_LINES.map(({ key, color }) => (
                  <Line key={key} type="monotone" dataKey={key} stroke={color}
                    strokeWidth={2} dot={{ r: 3 }} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
