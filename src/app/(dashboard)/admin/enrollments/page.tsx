'use client';
import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import FormField, { Select } from '@/components/ui/FormField';
import Avatar from '@/components/ui/Avatar';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';

interface Enrollment {
  assign_id: string; student_id: string; student_name: string; student_sex: string;
  tutor_id: string; tutor_name: string; tutor_email: string; course_name: string; course_code: string; created_at: string;
}

export default function EnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [students, setStudents] = useState<{student_id: string; firstname: string; surname: string; sex: string}[]>([]);
  const [tutors, setTutors] = useState<{tutor_id: string; firstname: string; surname: string; username: string; sex: string; email: string}[]>([]);
  const [courses, setCourses] = useState<{id: number; course_name: string; course_code: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    student_id: '', student_name: '', student_sex: '',
    tutor_id: '', tutor_name: '', tutor_username: '', tutor_sex: '', tutor_email: '',
    course_id: '', course_name: '', course_code: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [eRes, sRes, tRes, cRes] = await Promise.all([
        fetch('/api/enrollments'), fetch('/api/students'), fetch('/api/tutors'), fetch('/api/courses')
      ]);
      const [eData, sData, tData, cData] = await Promise.all([eRes.json(), sRes.json(), tRes.json(), cRes.json()]);
      setEnrollments(eData.enrollments || []);
      setStudents(sData.students || []);
      setTutors(tData.tutors || []);
      setCourses(cData.courses || []);
    } catch { toast.error('Failed to load data'); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStudentChange = (studentId: string) => {
    const s = students.find(s => s.student_id === studentId);
    setForm(f => ({ ...f, student_id: studentId, student_name: s ? `${s.firstname} ${s.surname}` : '', student_sex: s?.sex || '' }));
  };

  const handleTutorChange = (tutorId: string) => {
    const t = tutors.find(t => t.tutor_id === tutorId);
    setForm(f => ({ ...f, tutor_id: tutorId, tutor_name: t ? `${t.firstname} ${t.surname}` : '', tutor_username: t?.username || '', tutor_sex: t?.sex || '', tutor_email: t?.email || '' }));
  };

  const handleCourseChange = (courseId: string) => {
    const c = courses.find(c => c.id === parseInt(courseId));
    setForm(f => ({ ...f, course_id: courseId, course_name: c?.course_name || '', course_code: c?.course_code || '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/enrollments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      toast.success('Student enrolled successfully!');
      setModalOpen(false);
      setForm({ student_id: '', student_name: '', student_sex: '', tutor_id: '', tutor_name: '', tutor_username: '', tutor_sex: '', tutor_email: '', course_id: '', course_name: '', course_code: '' });
      fetchData();
    } catch { toast.error('Failed to enroll student'); }
    setSubmitting(false);
  };

  const columns = [
    { key: 'student_name', label: 'Student', render: (_: unknown, row: Enrollment) => (
      <div className="flex items-center gap-3">
        <Avatar name={row.student_name} size="sm" />
        <div>
          <p className="font-medium">{row.student_name}</p>
          <p className="text-xs text-gray-400">{row.student_id}</p>
        </div>
      </div>
    )},
    { key: 'tutor_name', label: 'Tutor' },
    { key: 'tutor_email', label: 'Tutor Email' },
    { key: 'course_name', label: 'Course' },
    { key: 'course_code', label: 'Code', render: (v: unknown) => (
      <span className="font-mono text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">{v as string}</span>
    )},
    { key: 'assign_id', label: 'Assign ID', render: (v: unknown) => (
      <span className="font-mono text-xs text-gray-400">{(v as string)?.slice(0, 14)}...</span>
    )},
  ];

  return (
    <DashboardLayout title="Student Enrollments">
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Enrollments</h2>
            <p className="text-gray-500 text-sm mt-0.5">{enrollments.length} enrollments</p>
          </div>
          <Button icon={Plus} onClick={() => setModalOpen(true)}>Enroll Student</Button>
        </div>

        <DataTable data={enrollments} columns={columns} loading={loading}
          searchKeys={['student_name', 'tutor_name', 'course_name', 'tutor_email']}
          emptyMessage="No enrollments yet"
        />
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Enroll Student & Assign Tutor" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Select Student" required>
            <Select value={form.student_id} onChange={e => handleStudentChange(e.target.value)} required>
              <option value="">Choose a student</option>
              {students.map(s => <option key={s.student_id} value={s.student_id}>{s.firstname} {s.surname}</option>)}
            </Select>
          </FormField>
          <FormField label="Assign Tutor" required>
            <Select value={form.tutor_id} onChange={e => handleTutorChange(e.target.value)} required>
              <option value="">Choose a tutor</option>
              {tutors.map(t => <option key={t.tutor_id} value={t.tutor_id}>{t.firstname} {t.surname} ({t.email})</option>)}
            </Select>
          </FormField>
          <FormField label="Assign Course" required>
            <Select value={form.course_id} onChange={e => handleCourseChange(e.target.value)} required>
              <option value="">Choose a course</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.course_name} ({c.course_code})</option>)}
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
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={submitting}>Enroll Student</Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
