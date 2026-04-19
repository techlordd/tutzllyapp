'use client';
import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import FormField, { Select } from '@/components/ui/FormField';
import Avatar from '@/components/ui/Avatar';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Enrollment {
  assign_id: string;
  student_id: string;
  student_name: string;
  student_sex: string;
  tutor_id: string;
  tutor_name: string;
  tutor_username: string;
  tutor_sex: string;
  tutor_email: string;
  course_name: string;
  course_code: string;
  course_name_deprecated: string;
  course_name_2: string;
  course_code_2: string;
  course_id_ref_2: string;
  course_name_deprecated_2: string;
  entry_status: string;
  timestamp: string;
  last_updated: string;
  record_key: string;
}

interface Student {
  student_id: string; firstname: string; surname: string; username: string; email: string; sex: string;
}

interface TutorAssignment {
  tutor_assign_id: string; tutor_id: string; tutor_username: string; tutor_sex: string; tutor_email: string;
  firstname: string; surname: string; tutor_name: string;
  course_id: number; course_name: string; course_code: string;
}

const emptyForm = {
  student_id: '', student_name: '', student_sex: '',
  tutor_id: '', tutor_name: '', tutor_username: '', tutor_sex: '', tutor_email: '',
  course_id: '', course_name: '', course_code: '',
};

export default function EnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [tutorAssignments, setTutorAssignments] = useState<TutorAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  const assignedTutors = [...new Map(tutorAssignments.map(a => [a.tutor_id, a])).values()];
  const tutorCourses = tutorAssignments.filter(a => a.tutor_id === form.tutor_id);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [eRes, sRes, taRes] = await Promise.all([
        fetch('/api/enrollments'), fetch('/api/students'), fetch('/api/tutor-assignments'),
      ]);
      const [eData, sData, taData] = await Promise.all([eRes.json(), sRes.json(), taRes.json()]);
      setEnrollments(eData.enrollments || []);
      setStudents(sData.students || []);
      setTutorAssignments(taData.assignments || []);
    } catch { toast.error('Failed to load data'); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const studentDisplayName = (s: Student) =>
    [s.firstname, s.surname].filter(Boolean).join(' ') || s.username || s.email;

  const tutorDisplayName = (a: TutorAssignment) =>
    a.tutor_name || [a.firstname, a.surname].filter(Boolean).join(' ') || a.tutor_username || a.tutor_email;

  const handleStudentChange = (studentId: string) => {
    const s = students.find(s => s.student_id === studentId);
    setForm(f => ({ ...f, student_id: studentId, student_name: s ? studentDisplayName(s) : '', student_sex: s?.sex || '' }));
  };

  const handleTutorChange = (tutorId: string) => {
    const a = tutorAssignments.find(a => a.tutor_id === tutorId);
    setForm(f => ({
      ...f,
      tutor_id: tutorId,
      tutor_name: a ? tutorDisplayName(a) : '',
      tutor_username: a?.tutor_username || '',
      tutor_sex: a?.tutor_sex || '',
      tutor_email: a?.tutor_email || '',
      course_id: '', course_name: '', course_code: '',
    }));
  };

  const handleCourseChange = (courseId: string) => {
    const c = tutorCourses.find(c => String(c.course_id) === courseId);
    setForm(f => ({ ...f, course_id: courseId, course_name: c?.course_name || '', course_code: c?.course_code || '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed to enroll student'); setSubmitting(false); return; }
      toast.success('Student enrolled successfully!');
      setModalOpen(false);
      setForm(emptyForm);
      fetchData();
    } catch { toast.error('Failed to enroll student'); }
    setSubmitting(false);
  };

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    try {
      const res = await fetch('/api/enrollments', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed to delete enrollments'); setDeletingAll(false); return; }
      toast.success(`Deleted ${data.deleted} enrollment${data.deleted !== 1 ? 's' : ''}`);
      setDeleteAllOpen(false);
      fetchData();
    } catch { toast.error('Failed to delete enrollments'); }
    setDeletingAll(false);
  };

  const columns = [
    { key: 'student_name', label: 'Student', render: (_: unknown, row: Enrollment) => (
      <div className="flex items-center gap-3">
        <Avatar name={row.student_name} size="sm" />
        <div>
          <p className="font-medium">{row.student_name || '—'}</p>
          <p className="text-xs text-gray-400 font-mono">{row.student_id}</p>
        </div>
      </div>
    )},
    { key: 'tutor_name', label: 'Tutor', render: (_: unknown, row: Enrollment) => (
      <div>
        <p className="font-medium">{row.tutor_name || '—'}</p>
        <p className="text-xs text-gray-400">{row.tutor_username || row.tutor_id}</p>
      </div>
    )},
    { key: 'tutor_email', label: 'Tutor Email', render: (v: unknown) => (
      <span className="text-sm text-gray-600">{v as string || '—'}</span>
    )},
    { key: 'course_name', label: 'Course', render: (_: unknown, row: Enrollment) => (
      <div>
        <p className="font-medium">{row.course_name || row.course_name_2 || '—'}</p>
        {row.course_name_deprecated && (
          <p className="text-xs text-gray-400 line-through">{row.course_name_deprecated}</p>
        )}
      </div>
    )},
    { key: 'course_code', label: 'Code', render: (_: unknown, row: Enrollment) => (
      <div className="flex flex-col gap-0.5">
        {row.course_code && (
          <span className="font-mono text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded w-fit">{row.course_code}</span>
        )}
        {row.course_code_2 && (
          <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded w-fit">{row.course_code_2}</span>
        )}
      </div>
    )},
    { key: 'student_sex', label: 'Student Sex', render: (v: unknown) => (
      <span className="text-sm text-gray-600">{v as string || '—'}</span>
    )},
    { key: 'tutor_sex', label: 'Tutor Sex', render: (v: unknown) => (
      <span className="text-sm text-gray-600">{v as string || '—'}</span>
    )},
    { key: 'assign_id', label: 'Assign ID', render: (v: unknown) => (
      <span className="font-mono text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">{(v as string)?.slice(0, 14)}…</span>
    )},
    { key: 'entry_status', label: 'Status', render: (v: unknown) => {
      const s = v as string;
      const cls = s === 'active' ? 'bg-green-100 text-green-700' : s === 'deleted' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600';
      return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{s || 'active'}</span>;
    }},
  ];

  return (
    <DashboardLayout title="Student Enrollments">
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Enrollments</h2>
            <p className="text-gray-500 text-sm mt-0.5">{enrollments.length} enrollment{enrollments.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex gap-2">
            {enrollments.length > 0 && (
              <Button variant="danger" icon={Trash2} onClick={() => setDeleteAllOpen(true)}>
                Delete All
              </Button>
            )}
            <Button icon={Plus} onClick={() => setModalOpen(true)}>Enroll Student</Button>
          </div>
        </div>

        <DataTable data={enrollments} columns={columns} loading={loading}
          searchKeys={['student_name', 'student_id', 'tutor_name', 'tutor_email', 'course_name', 'assign_id']}
          emptyMessage="No enrollments yet"
        />
      </div>

      {/* Enroll modal */}
      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setForm(emptyForm); }} title="Enroll Student & Assign Tutor" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Select Student" required>
            <Select value={form.student_id} onChange={e => handleStudentChange(e.target.value)} required>
              <option value="">Choose a student</option>
              {students.map(s => (
                <option key={s.student_id} value={s.student_id}>
                  {studentDisplayName(s)} — {s.email}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Assign Tutor" required>
            <Select value={form.tutor_id} onChange={e => handleTutorChange(e.target.value)} required>
              <option value="">Choose a tutor</option>
              {assignedTutors.map(a => (
                <option key={a.tutor_id} value={a.tutor_id}>
                  {tutorDisplayName(a)} — {a.tutor_email}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Assign Course" required>
            <Select
              value={form.course_id}
              onChange={e => handleCourseChange(e.target.value)}
              required
              disabled={!form.tutor_id}
            >
              <option value="">{form.tutor_id ? 'Choose a course' : 'Select a tutor first'}</option>
              {tutorCourses.map(c => (
                <option key={c.tutor_assign_id} value={c.course_id}>
                  {c.course_name} ({c.course_code})
                </option>
              ))}
            </Select>
          </FormField>

          {form.student_name && form.tutor_name && form.course_name && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm space-y-1">
              <p className="font-semibold text-green-800 mb-2">Enrollment Summary</p>
              <p className="text-green-700"><span className="font-medium">Student:</span> {form.student_name}</p>
              <p className="text-green-700"><span className="font-medium">Tutor:</span> {form.tutor_name}</p>
              <p className="text-green-700"><span className="font-medium">Course:</span> {form.course_name} ({form.course_code})</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setModalOpen(false); setForm(emptyForm); }}>Cancel</Button>
            <Button type="submit" loading={submitting} disabled={!form.student_id || !form.tutor_id || !form.course_id}>
              Enroll Student
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete All confirmation modal */}
      <Modal isOpen={deleteAllOpen} onClose={() => setDeleteAllOpen(false)} title="Delete All Enrollments" size="sm">
        <div className="space-y-4">
          <p className="text-gray-600 text-sm">
            This will permanently delete all <strong>{enrollments.length}</strong> enrollment record{enrollments.length !== 1 ? 's' : ''}.
            This action cannot be undone.
          </p>
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" onClick={() => setDeleteAllOpen(false)}>Cancel</Button>
            <Button variant="danger" loading={deletingAll} onClick={handleDeleteAll}>
              Delete All
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
