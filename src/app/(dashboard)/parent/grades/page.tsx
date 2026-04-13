'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import { statusBadge } from '@/components/ui/Badge';
import { Eye, BarChart3 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface Grade {
  id: number; tutor_name: string; student_name: string; course_name: string;
  month: string; year: string; punctuality: number; attentiveness: number;
  engagement: number; homework: number; test_score: number; remarks: string; status: string;
}

const getAvg = (g: Grade) => {
  const s = [g.punctuality, g.attentiveness, g.engagement, g.homework, g.test_score].filter(Boolean);
  return s.length ? (s.reduce((a, b) => a + b, 0) / s.length).toFixed(1) : '0';
};

const getLetter = (avg: number) => {
  if (avg >= 90) return { l: 'A+', c: 'text-emerald-600' };
  if (avg >= 80) return { l: 'A', c: 'text-green-600' };
  if (avg >= 70) return { l: 'B', c: 'text-blue-600' };
  if (avg >= 60) return { l: 'C', c: 'text-amber-600' };
  if (avg >= 50) return { l: 'D', c: 'text-orange-600' };
  return { l: 'F', c: 'text-red-600' };
};

export default function GradesSharedPage() {
  const user = useAuthStore(state => state.user);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Grade | null>(null);

  useEffect(() => {
    if (!user?.user_id) return;
    const param = `parent_id=${user.user_id}`;
    fetch(`/api/grades?${param}`)
      .then(r => r.json())
      .then(d => { setGrades(d.grades || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user?.user_id]);

  const columns = [
    { key: 'student_name', label: 'Student', sortable: true },
    { key: 'tutor_name', label: 'Tutor' },
    { key: 'course_name', label: 'Course' },
    { key: 'month', label: 'Period', render: (_: unknown, row: Grade) => `${row.month} ${row.year}` },
    { key: 'punctuality', label: 'Punct.', render: (v: unknown) => v ? `${v}%` : '—' },
    { key: 'test_score', label: 'Test', render: (v: unknown) => v ? `${v}%` : '—' },
    { key: 'average', label: 'Average', render: (_: unknown, row: Grade) => {
      const avg = parseFloat(getAvg(row)); const g = getLetter(avg);
      return <span className={`font-bold ${g.c}`}>{avg}% ({g.l})</span>;
    }},
    { key: 'status', label: 'Status', render: (v: unknown) => statusBadge(v as string) },
  ];

  return (
    <DashboardLayout title="Grade Book">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <BarChart3 size={24} className="text-purple-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Grade Book</h2>
            <p className="text-gray-500 text-sm">{grades.length} grade entries</p>
          </div>
        </div>
        <DataTable data={grades} columns={columns} loading={loading}
          searchKeys={['student_name', 'course_name', 'month', 'year']}
          emptyMessage="No grade reports available"
          actions={(row) => (
            <button onClick={() => setSelected(row)}
              className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"><Eye size={15} /></button>
          )}
        />
      </div>
      {selected && (
        <Modal isOpen={true} onClose={() => setSelected(null)} title="Grade Report" size="lg">
          <div className="space-y-4">
            <div className="text-center pb-4 border-b">
              <h3 className="text-lg font-bold">{selected.student_name}</h3>
              <p className="text-gray-500 text-sm">{selected.course_name} — {selected.month} {selected.year}</p>
              {(() => { const avg = parseFloat(getAvg(selected)); const g = getLetter(avg);
                return <span className={`text-5xl font-black ${g.c}`}>{g.l}</span>; })()}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[['Punctuality', selected.punctuality], ['Attentiveness', selected.attentiveness],
                ['Engagement', selected.engagement], ['Homework', selected.homework], ['Test Score', selected.test_score],
              ].map(([label, value]) => (
                <div key={label as string} className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-400">{label as string}</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{value !== null ? `${value}%` : '—'}</p>
                </div>
              ))}
            </div>
            {selected.remarks && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Remarks</p>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-xl">{selected.remarks}</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}
