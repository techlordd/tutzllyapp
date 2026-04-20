'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { statusBadge } from '@/components/ui/Badge';
import FormField, { Input, Select, Textarea } from '@/components/ui/FormField';
import Avatar from '@/components/ui/Avatar';
import { Plus, Eye, Trash2 } from 'lucide-react';
import { MONTHS } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Grade {
  record_id: number; user_id: string;
  tutor_id: string; tutor_name: string;
  student_id: string; student_name: string;
  course_name: string; course_id_ref: string;
  month: string; year: string;
  punctuality: number; attentiveness: number; engagement: number;
  homework: number; test_score: number;
  remarks: string; grade_code_status: string; status: string;
  entry_status: string; timestamp: string; last_updated: string;
  created_by: string; updated_by: string; ip: string; record_key: string;
}

export default function GradesPage() {
  const router = useRouter();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [students, setStudents] = useState<{student_id: string; firstname: string; surname: string}[]>([]);
  const [tutors, setTutors] = useState<{tutor_id: string; firstname: string; surname: string}[]>([]);
  const [courses, setCourses] = useState<{id: number; course_name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    tutor_id: '', tutor_name: '', student_id: '', student_name: '', course_name: '', course_id_ref: '',
    month: '', year: new Date().getFullYear().toString(),
    punctuality: '', attentiveness: '', engagement: '', homework: '', test_score: '', remarks: '',
    grade_code_status: '', status: 'draft',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [gRes, sRes, tRes, cRes] = await Promise.all([
        fetch('/api/grades'), fetch('/api/students'), fetch('/api/tutors'), fetch('/api/courses')
      ]);
      const [gData, sData, tData, cData] = await Promise.all([gRes.json(), sRes.json(), tRes.json(), cRes.json()]);
      setGrades(gData.grades || []);
      setStudents(sData.students || []);
      setTutors(tData.tutors || []);
      setCourses(cData.courses || []);
    } catch { toast.error('Failed to load data'); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/grades', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      toast.success('Grade entry saved!');
      setModalOpen(false);
      fetchData();
    } catch { toast.error('Failed to save grade'); }
    setSubmitting(false);
  };

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    try {
      const res = await fetch('/api/grades', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed to delete grades'); setDeletingAll(false); return; }
      toast.success(`Deleted ${data.deleted} grade entr${data.deleted !== 1 ? 'ies' : 'y'}`);
      setDeleteAllOpen(false);
      fetchData();
    } catch { toast.error('Failed to delete grades'); }
    setDeletingAll(false);
  };

  const getAverage = (g: Grade) => {
    const scores = [g.punctuality, g.attentiveness, g.engagement, g.homework, g.test_score].filter(v => v != null && v !== 0);
    if (!scores.length) return 0;
    return parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1));
  };

  const getGradeLetter = (avg: number) => {
    if (avg >= 90) return { letter: 'A+', color: 'text-emerald-600' };
    if (avg >= 80) return { letter: 'A',  color: 'text-green-600' };
    if (avg >= 70) return { letter: 'B',  color: 'text-blue-600' };
    if (avg >= 60) return { letter: 'C',  color: 'text-amber-600' };
    if (avg >= 50) return { letter: 'D',  color: 'text-orange-600' };
    return { letter: 'F', color: 'text-red-600' };
  };

  const columns = [
    { key: 'student_name', label: 'Student Name', sortable: true, render: (_: unknown, row: Grade) => (
      <div className="flex items-center gap-2">
        <Avatar name={row.student_name || 'S'} size="sm" />
        <span className="font-medium">{row.student_name || '—'}</span>
      </div>
    )},
    { key: 'student_id', label: 'Student ID', render: (v: unknown) => (
      <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{v as string || '—'}</span>
    )},
    { key: 'tutor_name', label: 'Tutor Name', render: (v: unknown) => (
      <span className="font-medium">{v as string || '—'}</span>
    )},
    { key: 'tutor_id', label: 'Tutor ID', render: (v: unknown) => (
      <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{v as string || '—'}</span>
    )},
    { key: 'course_name', label: 'Course' },
    { key: 'month', label: 'Period', render: (_: unknown, row: Grade) => `${row.month} ${row.year}` },
    { key: 'punctuality', label: 'Punct.', render: (v: unknown) => v ? `${v}%` : '—' },
    { key: 'test_score', label: 'Test Score', render: (v: unknown) => v ? `${v}%` : '—' },
    { key: 'average', label: 'Average', render: (_: unknown, row: Grade) => {
      const avg = getAverage(row);
      const g = getGradeLetter(avg);
      return <span className={`font-bold ${g.color}`}>{avg}% ({g.letter})</span>;
    }},
    { key: 'status', label: 'Status', render: (v: unknown) => statusBadge(v as string) },
  ];

  return (
    <DashboardLayout title="Grade Book">
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Grade Book</h2>
            <p className="text-gray-500 text-sm mt-0.5">{grades.length} grade entr{grades.length !== 1 ? 'ies' : 'y'}</p>
          </div>
          <div className="flex gap-2">
            {grades.length > 0 && (
              <Button variant="danger" icon={Trash2} onClick={() => setDeleteAllOpen(true)}>Delete All</Button>
            )}
            <Button icon={Plus} onClick={() => setModalOpen(true)}>Add Grade Entry</Button>
          </div>
        </div>

        <DataTable data={grades} columns={columns} loading={loading}
          searchKeys={['student_name', 'student_id', 'tutor_name', 'tutor_id', 'course_name', 'month', 'year']}
          emptyMessage="No grade entries yet"
          actions={(row) => (
            <button onClick={() => router.push(`/admin/grades/${row.record_id}`)}
              className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors" title="View details">
              <Eye size={15} />
            </button>
          )}
        />
      </div>

      {/* Delete All modal */}
      <Modal isOpen={deleteAllOpen} onClose={() => setDeleteAllOpen(false)} title="Delete All Grade Entries" size="sm">
        <div className="space-y-4">
          <p className="text-gray-600 text-sm">
            This will permanently delete all <strong>{grades.length}</strong> grade entr{grades.length !== 1 ? 'ies' : 'y'}.
            This action cannot be undone.
          </p>
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" onClick={() => setDeleteAllOpen(false)}>Cancel</Button>
            <Button variant="danger" loading={deletingAll} onClick={handleDeleteAll}>Delete All</Button>
          </div>
        </div>
      </Modal>

      {/* Add Grade Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Grade Entry" size="2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Student" required>
              <Select value={form.student_id} onChange={e => {
                const s = students.find(s => s.student_id === e.target.value);
                setForm({...form, student_id: e.target.value, student_name: s ? `${s.firstname} ${s.surname}` : ''});
              }} required>
                <option value="">Select Student</option>
                {students.map(s => <option key={s.student_id} value={s.student_id}>{s.firstname} {s.surname}</option>)}
              </Select>
            </FormField>
            <FormField label="Tutor" required>
              <Select value={form.tutor_id} onChange={e => {
                const t = tutors.find(t => t.tutor_id === e.target.value);
                setForm({...form, tutor_id: e.target.value, tutor_name: t ? `${t.firstname} ${t.surname}` : ''});
              }} required>
                <option value="">Select Tutor</option>
                {tutors.map(t => <option key={t.tutor_id} value={t.tutor_id}>{t.firstname} {t.surname}</option>)}
              </Select>
            </FormField>
            <FormField label="Course" required>
              <Select value={form.course_id_ref} onChange={e => {
                const c = courses.find(c => String(c.id) === e.target.value);
                setForm({...form, course_id_ref: e.target.value, course_name: c?.course_name || ''});
              }} required>
                <option value="">Select Course</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.course_name}</option>)}
              </Select>
            </FormField>
            <FormField label="Month" required>
              <Select value={form.month} onChange={e => setForm({...form, month: e.target.value})} required>
                <option value="">Select Month</option>
                {MONTHS.map(m => <option key={m}>{m}</option>)}
              </Select>
            </FormField>
            <FormField label="Year" required>
              <Input value={form.year} onChange={e => setForm({...form, year: e.target.value})} required />
            </FormField>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-semibold text-sm text-gray-700 mb-3">Scores (0–100)</h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                ['Punctuality', 'punctuality'], ['Attentiveness', 'attentiveness'],
                ['Engagement', 'engagement'], ['Homework', 'homework'], ['Test Score', 'test_score'],
              ].map(([label, key]) => (
                <FormField key={key} label={label}>
                  <Input type="number" min="0" max="100" value={form[key as keyof typeof form] as string}
                    onChange={e => setForm({...form, [key]: e.target.value})} placeholder="0" />
                </FormField>
              ))}
            </div>
          </div>

          <FormField label="Remarks">
            <Textarea rows={3} value={form.remarks} onChange={e => setForm({...form, remarks: e.target.value})} />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Grade Code Status">
              <Input value={form.grade_code_status} onChange={e => setForm({...form, grade_code_status: e.target.value})} />
            </FormField>
            <FormField label="Status">
              <Select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                <option value="draft">Draft</option><option value="published">Published</option>
              </Select>
            </FormField>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={submitting}>Save Grade Entry</Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
