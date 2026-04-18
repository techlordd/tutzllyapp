'use client';
import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import FormField, { Select } from '@/components/ui/FormField';
import Avatar from '@/components/ui/Avatar';
import { Plus, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface Assignment {
  tutor_assign_id: string; tutor_id: string; tutor_username: string;
  tutor_email: string; course_id: number; course_name: string; course_code: string;
  firstname: string; surname: string; created_at: string;
}

interface Tutor {
  tutor_id: string; firstname: string; surname: string; username: string; sex: string; email: string;
}

interface Course {
  id: number; course_name: string; course_code: string;
}

interface CourseRow {
  rowId: string;
  course_id: string;
  course_name: string;
  course_code: string;
}

const newRow = (): CourseRow => ({ rowId: crypto.randomUUID(), course_id: '', course_name: '', course_code: '' });

export default function AssignCoursesPage() {
  const tutorDisplayName = (t: Tutor) =>
    [t.firstname, t.surname].filter(Boolean).join(' ') || t.username || t.email;

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [tutorId, setTutorId] = useState('');
  const [courseRows, setCourseRows] = useState<CourseRow[]>([newRow()]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, tRes, cRes] = await Promise.all([
        fetch('/api/tutor-assignments'), fetch('/api/tutors'), fetch('/api/courses'),
      ]);
      const [aData, tData, cData] = await Promise.all([aRes.json(), tRes.json(), cRes.json()]);
      setAssignments(aData.assignments || []);
      setTutors(tData.tutors || []);
      setCourses(cData.courses || []);
    } catch { toast.error('Failed to load data'); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const selectedTutor = tutors.find(t => t.tutor_id === tutorId);

  // Course IDs already assigned to this tutor (active)
  const alreadyAssignedIds = new Set(
    assignments.filter(a => a.tutor_id === tutorId).map(a => a.course_id)
  );

  // Course IDs selected in other rows (to avoid duplicates within the form)
  const getUnavailableIds = (currentRowId: string) => new Set([
    ...alreadyAssignedIds,
    ...courseRows.filter(r => r.rowId !== currentRowId && r.course_id).map(r => Number(r.course_id)),
  ]);

  const updateRow = (rowId: string, courseId: string) => {
    const c = courses.find(c => String(c.id) === courseId);
    setCourseRows(rows => rows.map(r =>
      r.rowId === rowId
        ? { ...r, course_id: courseId, course_name: c?.course_name || '', course_code: c?.course_code || '' }
        : r
    ));
  };

  const addRow = () => setCourseRows(rows => [...rows, newRow()]);
  const removeRow = (rowId: string) => setCourseRows(rows => rows.filter(r => r.rowId !== rowId));

  const resetModal = () => {
    setTutorId('');
    setCourseRows([newRow()]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validRows = courseRows.filter(r => r.course_id);
    if (!tutorId || validRows.length === 0) {
      toast.error('Select a tutor and at least one course');
      return;
    }

    setSubmitting(true);
    const tutor = selectedTutor!;
    const payload = {
      tutor_id: tutor.tutor_id,
      tutor_username: tutor.username || '',
      tutor_sex: tutor.sex || '',
      tutor_email: tutor.email || '',
    };

    const results = await Promise.allSettled(
      validRows.map(row =>
        fetch('/api/tutor-assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, course_id: row.course_id, course_name: row.course_name, course_code: row.course_code }),
        }).then(async r => {
          const data = await r.json();
          if (!r.ok) throw new Error(data.error || 'Failed');
          return data;
        })
      )
    );

    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[];

    if (succeeded > 0) toast.success(`${succeeded} course${succeeded > 1 ? 's' : ''} assigned!`);
    failed.forEach(f => toast.error(f.reason?.message || 'One assignment failed'));

    setSubmitting(false);
    if (succeeded > 0) {
      setModalOpen(false);
      resetModal();
      fetchData();
    }
  };

  const handleDelete = async (assignId: string) => {
    if (!confirm('Remove this course assignment?')) return;
    setDeletingId(assignId);
    try {
      const res = await fetch(`/api/tutor-assignments/${assignId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Assignment removed');
      setAssignments(prev => prev.filter(a => a.tutor_assign_id !== assignId));
    } catch { toast.error('Failed to remove assignment'); }
    setDeletingId(null);
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
    { key: 'actions', label: '', render: (_: unknown, row: Assignment) => (
      <button
        onClick={() => handleDelete(row.tutor_assign_id)}
        disabled={deletingId === row.tutor_assign_id}
        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
        title="Remove assignment"
      >
        <Trash2 size={15} />
      </button>
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
          <Button icon={Plus} onClick={() => { resetModal(); setModalOpen(true); }}>Assign Course</Button>
        </div>

        <DataTable
          data={assignments}
          columns={columns}
          loading={loading}
          searchKeys={['firstname', 'surname', 'tutor_email', 'course_name', 'course_code']}
          emptyMessage="No course assignments yet"
        />
      </div>

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); resetModal(); }}
        title="Assign Course to Tutor" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Tutor selector */}
          <FormField label="Select Tutor" required>
            <Select value={tutorId} onChange={e => { setTutorId(e.target.value); setCourseRows([newRow()]); }} required>
              <option value="">Choose a tutor</option>
              {tutors.map(t => (
                <option key={t.tutor_id} value={t.tutor_id}>
                  {tutorDisplayName(t)} — {t.email}
                </option>
              ))}
            </Select>
          </FormField>

          {/* Course rows repeater */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">Courses</p>
              <button
                type="button"
                onClick={addRow}
                disabled={!tutorId}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Plus size={13} /> Add course
              </button>
            </div>

            {courseRows.map((row, idx) => {
              const unavailable = getUnavailableIds(row.rowId);
              const availableCourses = courses.filter(c => !unavailable.has(c.id));
              return (
                <div key={row.rowId} className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select
                      value={row.course_id}
                      onChange={e => updateRow(row.rowId, e.target.value)}
                      disabled={!tutorId}
                    >
                      <option value="">{tutorId ? `Course ${idx + 1}` : 'Select a tutor first'}</option>
                      {availableCourses.map(c => (
                        <option key={c.id} value={c.id}>{c.course_name} ({c.course_code})</option>
                      ))}
                    </Select>
                  </div>
                  {courseRows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRow(row.rowId)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                      title="Remove row"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Summary preview */}
          {tutorId && courseRows.some(r => r.course_id) && (
            <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-800 space-y-1">
              <p className="font-medium">Assigning to <strong>{selectedTutor && tutorDisplayName(selectedTutor)}</strong>:</p>
              {courseRows.filter(r => r.course_id).map(r => (
                <p key={r.rowId} className="ml-2">• {r.course_name} <span className="font-mono text-xs">({r.course_code})</span></p>
              ))}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setModalOpen(false); resetModal(); }}>Cancel</Button>
            <Button
              type="submit"
              loading={submitting}
              disabled={!tutorId || courseRows.every(r => !r.course_id)}
            >
              Assign {courseRows.filter(r => r.course_id).length > 1
                ? `${courseRows.filter(r => r.course_id).length} Courses`
                : 'Course'}
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
