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
  assign_id: string; student_id: string; student_name: string; student_sex: string;
  tutor_id: string; tutor_name: string; tutor_email: string; course_name: string; course_code: string; timestamp: string;
}

interface Student {
  student_id: string; firstname: string; surname: string; username: string; email: string; sex: string;
}

interface TutorAssignment {
  tutor_assign_id: string; tutor_id: string; tutor_name: string; tutor_username: string; tutor_sex: string; tutor_email: string;
  firstname: string; surname: string;
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
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);

  // Unique tutors who have at least one course assigned
  const assignedTutors = [...new Map(tutorAssignments.map(a => [a.tutor_id, a])).values()];

  // Courses that the currently selected tutor is assigned to teach
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
    [a.firstname, a.surname].filter(Boolean).join(' ') || a.tutor_name || a.tutor_username || a.tutor_email;

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
      // Reset course when tutor changes
      course_id: '', course_name: '', course_code: '',
    }));
  };

  const handleCourseChange = (courseId: string) => {
    const c = tutorCourses.find(c => String(c.course_id) === courseId);
    setForm(f => ({ ...f, course_id: courseId, course_name: c?.course_name || '', course_code: c?.course_code || '' }));
  };

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    try {
      const res = await fetch('/api/enrollments', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed to delete'); setDeletingAll(false); return; }
      toast.success(`Deleted ${data.deleted} enrollment${data.deleted !== 1 ? 's' : ''}`);
      setDeleteAllOpen(false);
      fetchData();
    } catch { toast.error('Failed to delete enrollments'); }
    setDeletingAll(false);
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

  const columns = [
    { key: 'student_name', label: 'Student Name', sortable: true, render: (_: unknown, row: Enrollment) => (
      <div className="flex items-center gap-3">
        <Avatar name={row.student_name} size="sm" />
        <span className="font-medium">{row.student_name || '—'}</span>
      </div>
    )},
    { key: 'student_id', label: 'Student ID', render: (v: unknown) => (
      <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{v as string || '—'}</span>
    )},
    { key: 'tutor_name', label: 'Tutor' },
    {
      key: 'course_name', label: 'Course', render: (_: unknown, row: Enrollment) => (
        <div>
          <p className="font-medium">{row.course_name || '—'}</p>
          {row.course_code && <span className="font-mono text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded">{row.course_code}</span>}
        </div>
      )
    },
  ];

  return (
    <DashboardLayout title="Student Enrollments">
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Enrollments</h2>
            <p className="text-gray-500 text-sm mt-0.5">{enrollments.length} enrollments</p>
          </div>
          <div className="flex gap-2">
            <Button variant="danger" icon={Trash2} onClick={() => setDeleteAllOpen(true)} disabled={enrollments.length === 0}>
              Delete All
            </Button>
            <Button icon={Plus} onClick={() => setModalOpen(true)}>Enroll Student</Button>
          </div>
        </div>

        <DataTable data={enrollments} columns={columns} loading={loading}
          searchKeys={['student_name', 'tutor_name', 'course_name', 'tutor_email']}
          emptyMessage="No enrollments yet"
        />
      </div>

      <Modal isOpen={deleteAllOpen} onClose={() => setDeleteAllOpen(false)} title="Delete All Enrollments" size="sm">
        <div className="space-y-4">
          <p className="text-gray-600 text-sm">
            This will permanently delete all <strong>{enrollments.length}</strong> enrollment{enrollments.length !== 1 ? 's' : ''}.
            This action cannot be undone.
          </p>
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" onClick={() => setDeleteAllOpen(false)}>Cancel</Button>
            <Button variant="danger" loading={deletingAll} onClick={handleDeleteAll}>Delete All</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setForm(emptyForm); }} title="Enroll Student & Assign Tutor" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Select Student" required>
            <Select value={form.student_id} onChange={e => handleStudentChange(e.target.value)} required>
              <option value="">Choose a student</option>
              {students.map(s => (
                <option key={s.student_id} value={s.student_id}>
                  {studentDisplayName(s)}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Assign Tutor" required>
            <Select value={form.tutor_id} onChange={e => handleTutorChange(e.target.value)} required>
              <option value="">Choose a tutor</option>
              {assignedTutors.map(a => (
                <option key={a.tutor_id} value={a.tutor_id}>
                  {tutorDisplayName(a)}
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
    </DashboardLayout>
  );
}
