'use client';
import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { statusBadge } from '@/components/ui/Badge';
import FormField, { Input, Select, Textarea } from '@/components/ui/FormField';
import { Plus, Eye, BarChart3 } from 'lucide-react';
import { MONTHS, GRADES } from '@/lib/utils';
import toast from 'react-hot-toast';
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

export default function TutorGradesPage() {
  const user = useAuthStore(state => state.user);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [sessions, setSessions] = useState<{ssid: string; student_name: string; course_name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState<Grade | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    ssid: '', tutor_id: '', student_name: '', course_name: '',
    month: '', year: new Date().getFullYear().toString(),
    punctuality: '', attentiveness: '', engagement: '', homework: '', test_score: '',
    remarks: '', status: 'submitted',
  });

  const fetchData = useCallback(async () => {
    if (!user?.user_id) return;
    setLoading(true);
    try {
      const [graRes, sesRes] = await Promise.all([
        fetch(`/api/grades?tutor_id=${user.user_id}`),
        fetch(`/api/sessions?tutor_id=${user.user_id}&status=ended`),
      ]);
      const [graData, sesData] = await Promise.all([graRes.json(), sesRes.json()]);
      setGrades(graData.grades || []);
      setSessions(sesData.sessions || []);
    } catch { ''; }
    setLoading(false);
  }, [user?.user_id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/grades', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, tutor_id: user?.user_id }) });
      if (!res.ok) throw new Error();
      toast.success('Grades submitted!');
      setModalOpen(false);
      fetchData();
    } catch { toast.error('Failed to submit grades'); }
    setSubmitting(false);
  };

  const columns = [
    { key: 'student_name', label: 'Student', sortable: true },
    { key: 'course_name', label: 'Course' },
    { key: 'month', label: 'Period', render: (_: unknown, row: Grade) => `${row.month} ${row.year}` },
    { key: 'punctuality', label: 'Punct.', render: (v: unknown) => v ? `${v}%` : '—' },
    { key: 'test_score', label: 'Test', render: (v: unknown) => v ? `${v}%` : '—' },
    { key: 'average', label: 'Avg', render: (_: unknown, row: Grade) => {
      const avg = parseFloat(getAvg(row)); const g = getLetter(avg);
      return <span className={`font-bold text-sm ${g.c}`}>{avg}% ({g.l})</span>;
    }},
    { key: 'status', label: 'Status', render: (v: unknown) => statusBadge(v as string) },
  ];

  return (
    <DashboardLayout title="Grade Book">
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BarChart3 size={24} className="text-purple-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Grade Book</h2>
              <p className="text-gray-500 text-sm">{grades.length} entries</p>
            </div>
          </div>
          <Button icon={Plus} onClick={() => setModalOpen(true)}>Submit Grades</Button>
        </div>
        <DataTable data={grades} columns={columns} loading={loading}
          searchKeys={['student_name', 'course_name', 'month']}
          emptyMessage="No grade entries yet"
          actions={(row) => (
            <button onClick={() => { setSelected(row); setViewOpen(true); }} className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-600"><Eye size={15} /></button>
          )}
        />
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Submit Grade Report" size="2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Session" required>
            <Select value={form.ssid} onChange={e => {
              const s = sessions.find(x => x.ssid === e.target.value);
              setForm(f => ({...f, ssid: e.target.value, student_name: s?.student_name || '', course_name: s?.course_name || ''}));
            }} required>
              <option value="">Select session</option>
              {sessions.map(s => <option key={s.ssid} value={s.ssid}>{s.student_name} — {s.course_name}</option>)}
            </Select>
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Month" required><Select value={form.month} onChange={e => setForm({...form, month: e.target.value})} required><option value="">Select</option>{MONTHS.map(m => <option key={m}>{m}</option>)}</Select></FormField>
            <FormField label="Year" required><Input type="number" value={form.year} min="2020" max="2030" onChange={e => setForm({...form, year: e.target.value})} required /></FormField>
          </div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Scores (0–100)</p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <FormField label="Punctuality"><Input type="number" min="0" max="100" value={form.punctuality} onChange={e => setForm({...form, punctuality: e.target.value})} /></FormField>
            <FormField label="Attentiveness"><Input type="number" min="0" max="100" value={form.attentiveness} onChange={e => setForm({...form, attentiveness: e.target.value})} /></FormField>
            <FormField label="Engagement"><Input type="number" min="0" max="100" value={form.engagement} onChange={e => setForm({...form, engagement: e.target.value})} /></FormField>
            <FormField label="Homework"><Input type="number" min="0" max="100" value={form.homework} onChange={e => setForm({...form, homework: e.target.value})} /></FormField>
            <FormField label="Test Score"><Input type="number" min="0" max="100" value={form.test_score} onChange={e => setForm({...form, test_score: e.target.value})} /></FormField>
          </div>
          <FormField label="Remarks"><Textarea rows={2} value={form.remarks} onChange={e => setForm({...form, remarks: e.target.value})} /></FormField>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={submitting}>Submit Grades</Button>
          </div>
        </form>
      </Modal>

      {selected && (
        <Modal isOpen={viewOpen} onClose={() => setViewOpen(false)} title="Grade Report" size="lg">
          <div className="space-y-4">
            <div className="text-center pb-4 border-b">
              <h3 className="text-lg font-bold">{selected.student_name}</h3>
              <p className="text-gray-500 text-sm">{selected.course_name} — {selected.month} {selected.year}</p>
              {(() => { const avg = parseFloat(getAvg(selected)); const g = getLetter(avg);
                return <span className={`text-5xl font-black ${g.c}`}>{g.l}</span>; })()}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[['Punctuality', selected.punctuality], ['Attentiveness', selected.attentiveness], ['Engagement', selected.engagement], ['Homework', selected.homework], ['Test Score', selected.test_score]].map(([l, v]) => (
                <div key={l as string} className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-400">{l as string}</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{v !== null && v !== undefined ? `${v}%` : '—'}</p>
                </div>
              ))}
            </div>
            {selected.remarks && <div><p className="text-xs text-gray-400 mb-1">Remarks</p><p className="text-sm bg-gray-50 p-3 rounded-xl">{selected.remarks}</p></div>}
            <div className="flex justify-end">{statusBadge(selected.status)}</div>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}
