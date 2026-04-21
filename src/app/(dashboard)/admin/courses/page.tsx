'use client';
import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import FormField, { Input } from '@/components/ui/FormField';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Course {
  id: number; course_name: string; course_code: string;
  entry_status: string; created_at: string;
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ course_name: '', course_code: '' });

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/courses');
      const data = await res.json();
      setCourses(data.courses || []);
    } catch { toast.error('Failed to load courses'); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editingCourse ? `/api/courses/${editingCourse.id}` : '/api/courses';
      const method = editingCourse ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      toast.success(editingCourse ? 'Course updated!' : 'Course added!');
      setModalOpen(false);
      setForm({ course_name: '', course_code: '' });
      setEditingCourse(null);
      fetchCourses();
    } catch { toast.error('Failed to save course'); }
    setSubmitting(false);
  };

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    try {
      const res = await fetch('/api/courses', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed to delete courses'); setDeletingAll(false); return; }
      toast.success(`Deleted ${data.deleted} course${data.deleted !== 1 ? 's' : ''}`);
      setDeleteAllOpen(false);
      fetchCourses();
    } catch { toast.error('Failed to delete courses'); }
    setDeletingAll(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this course?')) return;
    try {
      await fetch(`/api/courses/${id}`, { method: 'DELETE' });
      toast.success('Course deleted');
      fetchCourses();
    } catch { toast.error('Failed to delete'); }
  };

  const columns = [
    { key: 'course_name', label: 'Course Name', sortable: true },
    { key: 'course_code', label: 'Course Code', render: (v: unknown) => (
      <span className="font-mono font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs">{v as string}</span>
    )},
    { key: 'created_at', label: 'Added On', render: (v: unknown) => formatDate(v as string) },
  ];

  return (
    <DashboardLayout title="Courses Management">
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Courses</h2>
            <p className="text-gray-500 text-sm mt-0.5">{courses.length} courses available</p>
          </div>
          <div className="flex gap-2">
            <Button variant="danger" icon={Trash2} onClick={() => setDeleteAllOpen(true)} disabled={courses.length === 0}>
              Delete All
            </Button>
            <Button icon={Plus} onClick={() => { setForm({ course_name: '', course_code: '' }); setEditingCourse(null); setModalOpen(true); }}>
              Add Course
            </Button>
          </div>
        </div>

        <DataTable data={courses} columns={columns} loading={loading}
          searchKeys={['course_name', 'course_code']}
          emptyMessage="No courses added yet"
          actions={(row) => (
            <>
              <button onClick={() => { setEditingCourse(row); setForm({ course_name: row.course_name, course_code: row.course_code }); setModalOpen(true); }}
                className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors">
                <Edit size={15} />
              </button>
              <button onClick={() => handleDelete(row.id)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors">
                <Trash2 size={15} />
              </button>
            </>
          )}
        />
      </div>

      <Modal isOpen={deleteAllOpen} onClose={() => setDeleteAllOpen(false)} title="Delete All Courses" size="sm">
        <div className="space-y-4">
          <p className="text-gray-600 text-sm">
            This will permanently delete all <strong>{courses.length}</strong> course{courses.length !== 1 ? 's' : ''}.
            This action cannot be undone.
          </p>
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" onClick={() => setDeleteAllOpen(false)}>Cancel</Button>
            <Button variant="danger" loading={deletingAll} onClick={handleDeleteAll}>Delete All</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingCourse ? 'Edit Course' : 'Add New Course'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Course Name" required>
            <Input value={form.course_name} onChange={e => setForm({...form, course_name: e.target.value})} required placeholder="e.g. Mathematics" />
          </FormField>
          <FormField label="Course Code" required hint="Will be converted to uppercase">
            <Input value={form.course_code} onChange={e => setForm({...form, course_code: e.target.value.toUpperCase()})} required placeholder="e.g. MATH101" />
          </FormField>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={submitting}>{editingCourse ? 'Update Course' : 'Add Course'}</Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
