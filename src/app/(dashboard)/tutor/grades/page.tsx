'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { statusBadge } from '@/components/ui/Badge';
import FormField, { Input, Select, Textarea } from '@/components/ui/FormField';
import { Plus, Eye, BarChart3, Sparkles, Loader2, Printer } from 'lucide-react';
import { MONTHS, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

interface Grade {
  record_id: number; tutor_id: string; tutor_name: string; student_id: string; student_name: string; course_name: string;
  month: string; year: string; punctuality: number; attentiveness: number;
  engagement: number; homework: number; test_score: number; remarks: string; status: string;
  timestamp?: string;
}
interface Branding { logo_url?: string; academy_name?: string; site_title?: string; }
interface Session {
  ssid: string; student_id: string; student_name: string; course_name: string;
  status: string; start_session_date?: string; entry_date?: string;
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
  const [branding, setBranding] = useState<Branding | null>(null);
  const [viewSessions, setViewSessions] = useState<Session[]>([]);
  const [viewSessionsLoading, setViewSessionsLoading] = useState(false);

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
      fetch('/api/branding').then(r => r.json()).then(d => setBranding(d.academy || d)).catch(() => {});
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

  const openViewModal = async (row: Grade) => {
    setSelected(row);
    setViewOpen(true);
    if (!user?.user_id) return;
    setViewSessionsLoading(true);
    try {
      const res = await fetch(`/api/sessions?tutor_id=${user.user_id}&student_id=${row.student_id || ''}`);
      const data = await res.json();
      setViewSessions(data.sessions || []);
    } catch { setViewSessions([]); }
    setViewSessionsLoading(false);
  };

  const columns = [
    { key: 'timestamp', label: 'Entry Date', sortable: true, render: (v: unknown) => <span className="text-gray-800 text-sm">{v ? formatDate(v as string) : '—'}</span> },
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
            <button onClick={() => openViewModal(row)}
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

      {/* View modal — printable gradebook */}
      {selected && (() => {
        const g = selected;
        const avg = parseFloat(getAvg(g));
        const letter = getLetter(avg);
        // Previous grade (same student + course, immediately preceding month/year)
        const prev = grades
          .filter(x => x.student_name === g.student_name && x.course_name === g.course_name && x.record_id !== g.record_id)
          .sort((a, b) => {
            const ay = parseInt(a.year) * 12 + MONTHS.indexOf(a.month);
            const by = parseInt(b.year) * 12 + MONTHS.indexOf(b.month);
            return by - ay;
          })
          .find(x => {
            const xi = parseInt(x.year) * 12 + MONTHS.indexOf(x.month);
            const gi = parseInt(g.year) * 12 + MONTHS.indexOf(g.month);
            return xi < gi;
          }) || null;

        // Session counts for this student in this month/year
        const sessionsThisMonth = viewSessions.filter(s => {
          const d = s.start_session_date || s.entry_date;
          if (!d) return false;
          const date = new Date(d);
          return date.getFullYear().toString() === g.year && MONTHS[date.getMonth()] === g.month;
        });
        const expected    = sessionsThisMonth.length;
        const attended    = sessionsThisMonth.filter(s => s.status === 'completed').length;
        const missed      = sessionsThisMonth.filter(s => s.status === 'missed').length;
        const rescheduled = sessionsThisMonth.filter(s => s.status === 'rescheduled').length;

        const metrics: { label: string; curr: number | null; prevVal: number | null }[] = [
          { label: 'Punctuality',      curr: g.punctuality    != null ? parseFloat(String(g.punctuality))    : null, prevVal: prev?.punctuality    != null ? parseFloat(String(prev.punctuality))    : null },
          { label: 'Attentiveness',    curr: g.attentiveness   != null ? parseFloat(String(g.attentiveness))   : null, prevVal: prev?.attentiveness   != null ? parseFloat(String(prev.attentiveness))   : null },
          { label: 'Class Engagement', curr: g.engagement      != null ? parseFloat(String(g.engagement))      : null, prevVal: prev?.engagement      != null ? parseFloat(String(prev.engagement))      : null },
          { label: 'Homework',         curr: g.homework        != null ? parseFloat(String(g.homework))        : null, prevVal: prev?.homework        != null ? parseFloat(String(prev.homework))        : null },
          { label: 'Test Score',       curr: g.test_score      != null ? parseFloat(String(g.test_score))      : null, prevVal: prev?.test_score      != null ? parseFloat(String(prev.test_score))      : null },
        ];

        const handlePrint = () => {
          const logoHtml = branding?.logo_url
            ? `<img src="${branding.logo_url}" alt="logo" style="height:40px;object-fit:contain;" />`
            : `<div style="width:80px;height:40px;background:#e5e7eb;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;color:#9ca3af;">${branding?.academy_name || branding?.site_title || 'Academy'}</div>`;
          const metricsRows = metrics.map(m => {
            let tracker = '—';
            if (m.curr != null && m.prevVal != null) {
              const diff = parseFloat((m.curr - m.prevVal).toFixed(1));
              const sign = diff >= 0 ? '+' : '';
              const color = diff >= 0 ? '#16a34a' : '#dc2626';
              const arrow = diff >= 0 ? '&#8593;' : '&#8595;';
              tracker = `<span style="color:${color}">${arrow} ${sign}${diff}%</span>`;
            } else if (m.prevVal == null) {
              tracker = '';
            }
            return `<tr>
              <td style="padding:8px 12px;font-weight:600;border-bottom:1px solid #e5e7eb;">${m.label}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${m.curr != null ? m.curr + '%' : '—'}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${m.prevVal != null ? m.prevVal + '%' : ''}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${tracker}</td>
            </tr>`;
          }).join('');
          const w = window.open('', '_blank', 'width=900,height=700');
          if (!w) return;
          w.document.write(`<!DOCTYPE html><html><head><title>Gradebook</title>
          <style>body{font-family:Arial,sans-serif;margin:0;padding:24px;color:#111;}
            table{width:100%;border-collapse:collapse;}
            th{background:#f3f4f6;padding:8px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#6b7280;}
            .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0;}
            .stat-cell{border:1px solid #e5e7eb;padding:12px;text-align:center;border-radius:4px;}
            .stat-label{font-size:11px;color:#6b7280;}
            .stat-val{font-size:22px;font-weight:700;margin-top:4px;}
            .print-btn{display:block;width:100%;padding:12px;background:#3b82f6;color:#fff;border:none;cursor:pointer;font-size:14px;margin-top:24px;}
            @media print{.print-btn{display:none;}}</style></head><body>
          <div style="display:flex;align-items:center;margin-bottom:16px;">${logoHtml}</div>
          <div style="text-align:center;margin-bottom:16px;">
            <h2 style="margin:0;font-size:22px;">Gradebook</h2>
            <p style="margin:4px 0;color:#555;">(${g.month} ${g.year})</p>
            <p style="margin:0;font-weight:600;">${g.student_name}</p>
          </div>
          <div class="stats">
            <div class="stat-cell" style="background:#eff6ff;"><div class="stat-label">Expected Sessions</div><div class="stat-val">${expected}</div></div>
            <div class="stat-cell" style="background:#f0fdf4;"><div class="stat-label">Sessions Attended</div><div class="stat-val">${attended}</div></div>
            <div class="stat-cell" style="background:#fff1f2;"><div class="stat-label">Sessions Missed</div><div class="stat-val">${missed}</div></div>
            <div class="stat-cell" style="background:#fffbeb;"><div class="stat-label">Rescheduled</div><div class="stat-val">${rescheduled}</div></div>
          </div>
          <table><thead><tr>
            <th>${g.course_name}</th><th>Current</th><th>Previous</th><th>Tracker</th>
          </tr></thead><tbody>${metricsRows}</tbody></table>
          ${g.remarks ? `<div style="margin-top:16px;"><p style="color:#dc2626;font-size:13px;margin-bottom:4px;">Remarks:</p><p style="font-size:13px;line-height:1.6;">${g.remarks}</p></div>` : ''}
          <p style="margin-top:16px;font-weight:600;">Tutor: <span style="font-weight:400;">${g.tutor_name || '—'}</span></p>
          <button class="print-btn" onclick="window.print()">Print Gradebook</button>
          </body></html>`);
          w.document.close();
        };

        return (
          <Modal isOpen={viewOpen} onClose={() => setViewOpen(false)} title="Gradebook" size="xl">
            <div className="space-y-4">
              {/* Branding */}
              <div className="flex items-center gap-3">
                {branding?.logo_url
                  ? <img src={branding.logo_url} alt="logo" className="h-10 object-contain" />
                  : <div className="h-10 px-3 bg-gray-100 rounded-lg flex items-center text-xs text-gray-400 font-medium">{branding?.academy_name || branding?.site_title || 'Academy'}</div>
                }
              </div>
              {/* Header */}
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900">Gradebook</h3>
                <p className="text-sm text-gray-500">({g.month} {g.year})</p>
                <p className="text-sm font-semibold text-gray-800">{g.student_name}</p>
                <div className="mt-2">
                  <span className={`text-5xl font-black ${letter.c}`}>{letter.l}</span>
                  <p className={`text-lg font-semibold mt-1 ${letter.c}`}>{avg}%</p>
                </div>
              </div>
              {/* Session stats */}
              {viewSessionsLoading
                ? <div className="flex justify-center py-2"><Loader2 size={16} className="animate-spin text-gray-400" /></div>
                : (
                  <div className="grid grid-cols-4 gap-3">
                    {([
                      ['Expected Sessions', expected,  'bg-blue-50 border-blue-100'],
                      ['Sessions Attended', attended,  'bg-green-50 border-green-100'],
                      ['Sessions Missed',   missed,    'bg-red-50 border-red-100'],
                      ['Rescheduled',       rescheduled,'bg-amber-50 border-amber-100'],
                    ] as [string, number, string][]).map(([label, val, cls]) => (
                      <div key={label} className={`border rounded-lg p-3 text-center ${cls}`}>
                        <p className="text-xs text-gray-500">{label}</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{val}</p>
                      </div>
                    ))}
                  </div>
                )
              }
              {/* Metrics table */}
              <div className="overflow-hidden rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{g.course_name}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Current</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Previous</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Tracker</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {metrics.map(m => {
                      let trackerEl: React.ReactNode = '';
                      if (m.curr != null && m.prevVal != null) {
                        const diff = parseFloat((m.curr - m.prevVal).toFixed(1));
                        const sign = diff >= 0 ? '+' : '';
                        const cls  = diff >= 0 ? 'text-green-600' : 'text-red-500';
                        const arr  = diff >= 0 ? '↑' : '↓';
                        trackerEl = <span className={`font-semibold ${cls}`}>{arr} {sign}{diff}%</span>;
                      }
                      return (
                        <tr key={m.label} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 font-semibold text-gray-800">{m.label}</td>
                          <td className="px-4 py-3 text-gray-600">{m.curr != null ? `${m.curr}%` : '—'}</td>
                          <td className="px-4 py-3 text-gray-400">{m.prevVal != null ? `${m.prevVal}%` : ''}</td>
                          <td className="px-4 py-3">{trackerEl}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {g.remarks && (
                <div>
                  <p className="text-xs font-semibold text-red-500 mb-1">Remarks:</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{g.remarks}</p>
                </div>
              )}
              <p className="text-sm"><span className="font-semibold">Tutor:</span> {g.tutor_name || '—'}</p>
              <div className="flex items-center justify-between pt-1">
                {statusBadge(g.status)}
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors text-sm"
                >
                  <Printer size={15} /> Print Gradebook
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}
    </DashboardLayout>
  );
}
