'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { statusBadge } from '@/components/ui/Badge';
import FormField, { Input, Select, Textarea } from '@/components/ui/FormField';
import { Plus, Eye, BarChart3, Sparkles, Loader2 } from 'lucide-react';
import { MONTHS } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

interface Grade {
  record_id: number; tutor_name: string; student_name: string; course_name: string;
  month: string; year: string; punctuality: number; attentiveness: number;
  engagement: number; homework: number; test_score: number; remarks: string; status: string;
}

interface Course { course_id: string; course_name: string; course_code: string; }
interface Enrollment { student_id: string; student_name: string; course_name: string; }

const getAvg = (g: Grade) => {
  const s = [g.punctuality, g.attentiveness, g.engagement, g.homework, g.test_score]
    .map(v => parseFloat(String(v)))
    .filter(v => !isNaN(v));
  return s.length ? (s.reduce((a, b) => a + b, 0) / s.length).toFixed(1) : '0';
};

const getLetter = (avg: number) => {
  if (avg >= 90) return { l: 'A+', c: 'text-emerald-600' };
  if (avg >= 80) return { l: 'A',  c: 'text-green-600'   };
  if (avg >= 70) return { l: 'B',  c: 'text-blue-600'    };
  if (avg >= 60) return { l: 'C',  c: 'text-amber-600'   };
  if (avg >= 50) return { l: 'D',  c: 'text-orange-600'  };
  return { l: 'F', c: 'text-red-600' };
};

const emptyForm = () => ({
  course_name: '', course_id: '',
  student_id: '', student_name: '',
  month: '', year: new Date().getFullYear().toString(),
  punctuality: '', attentiveness: '', engagement: '', homework: '',
  test_score: '', remarks: '', status: 'pending',
});

export default function TutorGradesPage() {
  const user = useAuthStore(state => state.user);
  const [grades, setGrades]         = useState<Grade[]>([]);
  const [courses, setCourses]       = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [tutorName, setTutorName]   = useState('');
  const [loading, setLoading]       = useState(true);
  const [modalOpen, setModalOpen]   = useState(false);
  const [viewOpen, setViewOpen]     = useState(false);
  const [selected, setSelected]     = useState<Grade | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [autoCalcing, setAutoCalcing] = useState(false);
  const [autoCalcNote, setAutoCalcNote] = useState('');
  const [form, setForm] = useState(emptyForm());

  const fetchData = useCallback(async () => {
    if (!user?.user_id) return;
    setLoading(true);
    try {
      const [graRes, assRes, enrRes] = await Promise.all([
        fetch(`/api/grades?tutor_id=${user.user_id}`),
        fetch(`/api/tutor-assignments?tutor_id=${user.user_id}`),
        fetch(`/api/enrollments?tutor_id=${user.user_id}`),
      ]);
      const [graData, assData, enrData] = await Promise.all([
        graRes.json(), assRes.json(), enrRes.json(),
      ]);
      setGrades(graData.grades || []);

      const assignments = assData.assignments || [];
      setCourses(assignments.map((a: { course_id: string; course_name: string; course_code: string }) => ({
        course_id: a.course_id, course_name: a.course_name, course_code: a.course_code,
      })));
      if (assignments[0]?.tutor_name) setTutorName(assignments[0].tutor_name);

      setEnrollments((enrData.enrollments || []).map((e: { student_id: string; student_name: string; course_name: string }) => ({
        student_id: e.student_id, student_name: e.student_name, course_name: e.course_name,
      })));
    } catch { toast.error('Failed to load data'); }
    setLoading(false);
  }, [user?.user_id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Students enrolled in the currently selected course (deduplicated)
  const students = useMemo(() => {
    if (!form.course_name) return [];
    const seen = new Set<string>();
    return enrollments.filter(e => {
      if (e.course_name !== form.course_name || !e.student_id || seen.has(e.student_id)) return false;
      seen.add(e.student_id);
      return true;
    });
  }, [enrollments, form.course_name]);

  // Auto-calculate scores when student + course + month + year are all set
  useEffect(() => {
    if (!form.student_id || !form.course_name || !form.month || !form.year) return;
    let cancelled = false;
    const calc = async () => {
      setAutoCalcing(true);
      setAutoCalcNote('');
      try {
        const params = new URLSearchParams({
          student_id: form.student_id,
          course_name: form.course_name,
          month: form.month,
          year: form.year,
        });
        const d = await fetch(`/api/grades/auto-calc?${params}`).then(r => r.json());
        if (cancelled) return;
        if (d.found) {
          setForm(f => ({
            ...f,
            punctuality:  d.punctuality  != null ? String(d.punctuality)  : f.punctuality,
            attentiveness: d.attentiveness != null ? String(d.attentiveness) : f.attentiveness,
            engagement:   d.engagement   != null ? String(d.engagement)   : f.engagement,
            homework:     d.homework     != null ? String(d.homework)     : f.homework,
          }));
          setAutoCalcNote(`Auto-calculated from ${d.total_activities} session activit${d.total_activities === 1 ? 'y' : 'ies'} in ${form.month} ${form.year}.`);
        } else {
          setForm(f => ({ ...f, punctuality: '', attentiveness: '', engagement: '', homework: '' }));
          setAutoCalcNote(`No session activities found for ${form.month} ${form.year}. Enter scores manually.`);
        }
      } catch { /* silent */ }
      setAutoCalcing(false);
    };
    calc();
    return () => { cancelled = true; };
  }, [form.student_id, form.course_name, form.month, form.year]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/grades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          tutor_id:   user?.user_id,
          tutor_name: tutorName,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Grades submitted!');
      setModalOpen(false);
      setForm(emptyForm());
      setAutoCalcNote('');
      fetchData();
    } catch { toast.error('Failed to submit grades'); }
    setSubmitting(false);
  };

  const columns = [
    { key: 'student_name', label: 'Student', sortable: true },
    { key: 'course_name',  label: 'Course' },
    { key: 'month', label: 'Period', render: (_: unknown, row: Grade) => `${row.month} ${row.year}` },
    { key: 'punctuality', label: 'Punct.', render: (v: unknown) => { const n = parseFloat(String(v)); return !isNaN(n) ? `${n}%` : '—'; } },
    { key: 'test_score',  label: 'Test',   render: (v: unknown) => { const n = parseFloat(String(v)); return !isNaN(n) ? `${n}%` : '—'; } },
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
          <Button icon={Plus} onClick={() => { setForm(emptyForm()); setAutoCalcNote(''); setModalOpen(true); }}>
            Submit Grades
          </Button>
        </div>

        <DataTable data={grades} columns={columns} loading={loading}
          searchKeys={['student_name', 'course_name', 'month']}
          emptyMessage="No grade entries yet"
          actions={(row) => (
            <button onClick={() => { setSelected(row); setViewOpen(true); }}
              className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-600">
              <Eye size={15} />
            </button>
          )}
        />
      </div>

      {/* Submit modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Submit Grade Report" size="2xl">
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Course */}
          <FormField label="Course" required>
            <Select value={form.course_name} onChange={e => {
              const c = courses.find(x => x.course_name === e.target.value);
              setForm(f => ({ ...f, course_name: e.target.value, course_id: c?.course_id || '', student_id: '', student_name: '' }));
              setAutoCalcNote('');
            }} required>
              <option value="">Select course</option>
              {courses.map(c => (
                <option key={c.course_id} value={c.course_name}>
                  {c.course_name}{c.course_code ? ` (${c.course_code})` : ''}
                </option>
              ))}
            </Select>
          </FormField>

          {/* Student */}
          <FormField label="Student" required>
            <Select value={form.student_id} onChange={e => {
              const s = students.find(x => x.student_id === e.target.value);
              setForm(f => ({ ...f, student_id: e.target.value, student_name: s?.student_name || '' }));
              setAutoCalcNote('');
            }} required disabled={!form.course_name}>
              <option value="">{form.course_name ? 'Select student' : 'Select a course first'}</option>
              {students.map(s => (
                <option key={s.student_id} value={s.student_id}>{s.student_name}</option>
              ))}
            </Select>
          </FormField>

          {/* Month + Year */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Month" required>
              <Select value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))} required>
                <option value="">Select</option>
                {MONTHS.map(m => <option key={m}>{m}</option>)}
              </Select>
            </FormField>
            <FormField label="Year" required>
              <Input type="number" value={form.year} min="2020" max="2030"
                onChange={e => setForm(f => ({ ...f, year: e.target.value }))} required />
            </FormField>
          </div>

          {/* Auto-calc scores */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Scores (0–100)</p>
              {autoCalcing && (
                <span className="flex items-center gap-1 text-xs text-blue-600">
                  <Loader2 size={11} className="animate-spin" /> Calculating…
                </span>
              )}
              {!autoCalcing && autoCalcNote && (
                <span className="flex items-center gap-1 text-xs text-emerald-600">
                  <Sparkles size={11} /> {autoCalcNote}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
              {(['punctuality', 'attentiveness', 'engagement', 'homework'] as const).map(field => (
                <FormField key={field} label={field.charAt(0).toUpperCase() + field.slice(1)}>
                  <div className="relative">
                    <Input
                      type="number" min="0" max="100"
                      value={form[field]}
                      onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                      className={autoCalcNote && form[field] ? 'pr-6' : ''}
                    />
                    {autoCalcNote && form[field] && (
                      <Sparkles size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" />
                    )}
                  </div>
                </FormField>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5 ml-1">
              Auto-filled from session activities · You can edit any value before submitting.
            </p>
          </div>

          {/* Test Score */}
          <FormField label="Test Score (0–100)">
            <Input type="number" min="0" max="100" value={form.test_score}
              onChange={e => setForm(f => ({ ...f, test_score: e.target.value }))} />
          </FormField>

          <FormField label="Remarks">
            <Textarea rows={2} value={form.remarks}
              onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} />
          </FormField>

          <FormField label="Status">
            <Select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
            </Select>
          </FormField>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={submitting}>Submit Grades</Button>
          </div>
        </form>
      </Modal>

      {/* View modal */}
      {selected && (
        <Modal isOpen={viewOpen} onClose={() => setViewOpen(false)} title="Grade Report" size="lg">
          <div className="space-y-4">
            <div className="text-center pb-4 border-b">
              <h3 className="text-lg font-bold text-gray-900">{selected.student_name}</h3>
              <p className="text-gray-500 text-sm">{selected.course_name} — {selected.month} {selected.year}</p>
              {(() => {
                const avg = parseFloat(getAvg(selected));
                const g = getLetter(avg);
                return (
                  <div className="mt-2">
                    <span className={`text-5xl font-black ${g.c}`}>{g.l}</span>
                    <p className={`text-lg font-semibold mt-1 ${g.c}`}>{avg}%</p>
                  </div>
                );
              })()}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                ['Punctuality',   selected.punctuality],
                ['Attentiveness', selected.attentiveness],
                ['Engagement',    selected.engagement],
                ['Homework',      selected.homework],
                ['Test Score',    selected.test_score],
              ].map(([l, v]) => {
                const num = parseFloat(String(v));
                return (
                  <div key={l as string} className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-400">{l as string}</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">{!isNaN(num) ? `${num}%` : '—'}</p>
                  </div>
                );
              })}
            </div>
            {selected.remarks && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Remarks</p>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-xl">{selected.remarks}</p>
              </div>
            )}
            <div className="flex justify-end">{statusBadge(selected.status)}</div>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}
