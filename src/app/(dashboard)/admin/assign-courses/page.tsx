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

interface Assignment {
  tutor_assign_id: string; tutor_id: string; tutor_username: string;
  tutor_email: string; course_id: number; course_name: string; course_code: string;
  firstname: string; surname: string; created_at: string;
}

export default function AssignCoursesPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [tutors, setTutors] = useState<{tutor_id: string; firstname: string; surname: string; username: string; sex: string; email: string}[]>([]);
  const [courses, setCourses] = useState<{id: number; course_name: string; course_code: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ tutor_id: '', tutor_username: '', tutor_sex: '', tutor_email: '', course_id: '', course_name: '', course_code: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, tRes, cRes] = await Promise.all([
        fetch('/api/tutor-assignments'), fetch('/api/tutors'), fetch('/api/courses')
      ]);
      const [aData, tData, cData] = await Promise.all([aRes.json(), tRes.json(), cRes.json()]);
      setAssignments(aData.assignments || []);
      setTutors(tData.tutors || []);
      setCourses(cData.courses || []);
    } catch { toast.error('Failed to load data'); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleTutorChange = (tutorId: string) => {
    const t = tutors.find(t => t.tutor_id === tutorId);
    setForm(f => ({ ...f, tutor_id: tutorId, tutor_username: t?.username || '', tutor_sex: t?.sex || '', tutor_email: t?.email || '' }));
  };

  const handleCourseChange = (courseId: string) => {
    const c = courses.find(c => c.id === parseInt(courseId));
    setForm(f => ({ ...f, course_id: courseId, course_name: c?.course_name || '', course_code: c?.course_code || '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/tutor-assignments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      toast.success('Course assigned to tutor!');
      setModalOpen(false);
      setForm({ tutor_id: '', tutor_username: '', tutor_sex: '', tutor_email: '', course_id: '', course_name: '', course_code: '' });
      fetchData();
    } catch { toast.error('Failed to assign course'); }
    setSubmitting(false);
  };

  const columns = [
    { key: 'tutor', label: 'Tutor', render: (_: unknown, row: Assignment) => (
      <div className="flex items-center gap-3">
        <Avatar name={`${row.firstname || ''} ${row.surname || ''}`} size="sm" />
        <div>
          <p className="font-medium">{row.firstname} {row.surname}</p>
          <p className="text-xs text-gray-400">{row.tutor_id}</p>
        </div>
      </div>
    )},
    { key: 'tutor_email', label: 'Tutor Email' },
    { key: 'course_name', label: 'Course' },
    { key: 'course_code', label: 'Code', render: (v: unknown) => (
      <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{v as string}</span>
    )},
  ];

  return (
    <DashboardLayout title="Assign Courses to Tutors">
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Course Assignments</h2>
            <p className="text-gray-500 text-sm mt-0.5">{assignments.length} assignments</p>
          </div>
          <Button icon={Plus} onClick={() => setModalOpen(true)}>Assign Course</Button>
        </div>

        <DataTable data={assignments} columns={columns} loading={loading}
          searchKeys={['tutor_email', 'course_name', 'course_code']}
          emptyMessage="No course assignments yet"
        />
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Assign Course to Tutor" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Select Tutor" required>
            <Select value={form.tutor_id} onChange={e => handleTutorChange(e.target.value)} required>
              <option value="">Choose a tutor</option>
              {tutors.map(t => <option key={t.tutor_id} value={t.tutor_id}>{t.firstname} {t.surname} ({t.email})</option>)}
            </Select>
          </FormField>
          <FormField label="Select Course" required>
            <Select value={form.course_id} onChange={e => handleCourseChange(e.target.value)} required>
              <option value="">Choose a course</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.course_name} ({c.course_code})</option>)}
            </Select>
          </FormField>
          {form.tutor_id && form.course_id && (
            <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-800">
              <p>You are assigning <strong>{form.course_name}</strong> ({form.course_code}) to tutor with email <strong>{form.tutor_email}</strong></p>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={submitting}>Assign Course</Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
