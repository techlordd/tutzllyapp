'use client';
import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { statusBadge } from '@/components/ui/Badge';
import FormField, { Input, Select, Textarea } from '@/components/ui/FormField';
import Avatar from '@/components/ui/Avatar';
import { Plus, Trash2, X, AlertTriangle, Edit } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Assignment {
  tutor_assign_id: string; tutor_id: string;
  tutor_name: string; tutor_username: string; tutor_email: string;
  course_id: number; course_name: string; course_code: string;
  assigned_date: string; status: string; notes: string;
  entry_status: string; timestamp: string;
}

interface Tutor {
  tutor_id: string; firstname: string; surname: string;
  full_name_first_name: string; full_name_last_name: string;
  username: string; email: string;
}

interface Course {
  id: number; course_name: string; course_code: string;
}

interface CourseRow {
  rowId: string; course_id: string; course_name: string; course_code: string;
  assigned_date: string; status: string; notes: string;
}

const newRow = (): CourseRow => ({
  rowId: crypto.randomUUID(), course_id: '', course_name: '', course_code: '',
  assigned_date: '', status: 'active', notes: '',
});

export default function AssignCoursesPage() {
  const tutorDisplayName = (t: Tutor) =>
    [t.firstname || t.full_name_first_name, t.surname || t.full_name_last_name]
      .filter(Boolean).join(' ') || t.username || t.email;

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAssign, setEditingAssign] = useState<Assignment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  const [tutorId, setTutorId] = useState('');
  const [courseRows, setCourseRows] = useState<CourseRow[]>([newRow()]);

  // Edit form state (single row)
  const [editForm, setEditForm] = useState({
    tutor_name: '', tutor_username: '', tutor_email: '',
    course_name: '', course_code: '', assigned_date: '', status: 'active', notes: '',
  });

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

  const alreadyAssignedIds = new Set(
    assignments.filter(a => a.tutor_id === tutorId).map(a => a.course_id)
  );

  const getUnavailableIds = (currentRowId: string) => new Set([
    ...alreadyAssignedIds,
    ...courseRows.filter(r => r.rowId !== currentRowId && r.course_id).map(r => Number(r.course_id)),
  ]);

  const updateRow = (rowId: string, field: keyof CourseRow, value: string) => {
    setCourseRows(rows => rows.map(r => {
      if (r.rowId !== rowId) return r;
      if (field === 'course_id') {
        const c = courses.find(c => String(c.id) === value);
        return { ...r, course_id: value, course_name: c?.course_name || '', course_code: c?.course_code || '' };
      }
      return { ...r, [field]: value };
    }));
  };

  const addRow = () => setCourseRows(rows => [...rows, newRow()]);
  const removeRow = (rowId: string) => setCourseRows(rows => rows.filter(r => r.rowId !== rowId));

  const resetModal = () => {
    setTutorId('');
    setCourseRows([newRow()]);
    setEditingAssign(null);
  };

  const openEdit = (a: Assignment) => {
    setEditingAssign(a);
    setEditForm({
      tutor_name: a.tutor_name || '', tutor_username: a.tutor_username || '',
      tutor_email: a.tutor_email || '', course_name: a.course_name || '',
      course_code: a.course_code || '', assigned_date: a.assigned_date?.split('T')[0] || '',
      status: a.status || 'active', notes: a.notes || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Edit mode
    if (editingAssign) {
      setSubmitting(true);
      try {
        const res = await fetch(`/api/tutor-assignments/${editingAssign.tutor_assign_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editForm),
        });
        if (!res.ok) throw new Error();
        toast.success('Assignment updated!');
        setModalOpen(false);
        resetModal();
        fetchData();
      } catch { toast.error('Failed to update assignment'); }
      setSubmitting(false);
      return;
    }

    // Create mode
    const validRows = courseRows.filter(r => r.course_id);
    if (!tutorId || validRows.length === 0) {
      toast.error('Select a tutor and at least one course');
      return;
    }

    setSubmitting(true);
    const tutor = selectedTutor!;
    const tutorName = tutorDisplayName(tutor);
    const payload = {
      tutor_id: tutor.tutor_id,
      tutor_name: tutorName,
      tutor_username: tutor.username || '',
      tutor_email: tutor.email || '',
    };

    const results = await Promise.allSettled(
      validRows.map(row =>
        fetch('/api/tutor-assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            course_id: row.course_id, course_name: row.course_name, course_code: row.course_code,
            assigned_date: row.assigned_date || null, status: row.status, notes: row.notes || null,
          }),
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
    if (succeeded > 0) { setModalOpen(false); resetModal(); fetchData(); }
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

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    try {
      const res = await fetch('/api/tutor-assignments', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`${data.deleted} assignment${data.deleted !== 1 ? 's' : ''} deleted`);
      setDeleteAllOpen(false);
      fetchData();
    } catch { toast.error('Failed to delete all assignments'); }
    setDeletingAll(false);
  };

  const columns = [
    {
      key: 'tutor', label: 'Tutor', render: (_: unknown, row: Assignment) => (
        <div className="flex items-center gap-3">
          <Avatar name={row.tutor_name || row.tutor_username || ''} size="sm" />
          <p className="font-medium text-gray-900">{row.tutor_name || row.tutor_username || '—'}</p>
        </div>
      )
    },
    {
      key: 'tutor_id', label: 'Tutor ID', render: (v: unknown) => (
        <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">{v as string}</span>
      )
    },
    { key: 'tutor_email', label: 'Tutor Email' },
    { key: 'course_name', label: 'Course' },
    {
      key: 'course_code', label: 'Code', render: (v: unknown) => v ? (
        <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{v as string}</span>
      ) : <span className="text-gray-300">—</span>
    },
    {
      key: 'assigned_date', label: 'Assigned Date',
      render: (v: unknown) => <span className="text-gray-600 text-sm">{v ? formatDate(v as string) : '—'}</span>
    },
    { key: 'status', label: 'Status', render: (v: unknown) => statusBadge((v as string) || 'active') },
  ];

  return (
    <DashboardLayout title="Assign Courses to Tutors">
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Course Assignments</h2>
            <p className="text-gray-500 text-sm mt-0.5">{assignments.length} assignments</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setDeleteAllOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors"
            >
              <Trash2 size={14} /> Delete All
            </button>
            <Button icon={Plus} onClick={() => { resetModal(); setModalOpen(true); }}>Assign Course</Button>
          </div>
        </div>

        <DataTable
          data={assignments}
          columns={columns}
          loading={loading}
          searchKeys={['tutor_name', 'tutor_username', 'tutor_email', 'tutor_id', 'course_name', 'course_code']}
          emptyMessage="No course assignments yet"
          actions={(row) => (
            <>
              <button onClick={() => openEdit(row)}
                className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors" title="Edit">
                <Edit size={15} />
              </button>
              <button
                onClick={() => handleDelete(row.tutor_assign_id)}
                disabled={deletingId === row.tutor_assign_id}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                title="Remove assignment"
              >
                <Trash2 size={15} />
              </button>
            </>
          )}
        />
      </div>

      {/* Add / Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); resetModal(); }}
        title={editingAssign ? 'Edit Assignment' : 'Assign Course to Tutor'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">

          {editingAssign ? (
            /* Edit form */
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Tutor Name">
                  <Input value={editForm.tutor_name} onChange={e => setEditForm({ ...editForm, tutor_name: e.target.value })} />
                </FormField>
                <FormField label="Tutor Username">
                  <Input value={editForm.tutor_username} onChange={e => setEditForm({ ...editForm, tutor_username: e.target.value })} />
                </FormField>
                <FormField label="Tutor Email">
                  <Input type="email" value={editForm.tutor_email} onChange={e => setEditForm({ ...editForm, tutor_email: e.target.value })} />
                </FormField>
                <FormField label="Course Name">
                  <Input value={editForm.course_name} onChange={e => setEditForm({ ...editForm, course_name: e.target.value })} />
                </FormField>
                <FormField label="Course Code">
                  <Input value={editForm.course_code} onChange={e => setEditForm({ ...editForm, course_code: e.target.value })} />
                </FormField>
                <FormField label="Assigned Date">
                  <Input type="date" value={editForm.assigned_date} onChange={e => setEditForm({ ...editForm, assigned_date: e.target.value })} />
                </FormField>
                <FormField label="Status">
                  <Select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="completed">Completed</option>
                  </Select>
                </FormField>
              </div>
              <FormField label="Notes">
                <Textarea rows={2} value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} />
              </FormField>
            </div>
          ) : (
            /* Create form */
            <>
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

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700">Courses</p>
                  <button type="button" onClick={addRow} disabled={!tutorId}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-40 transition-colors">
                    <Plus size={13} /> Add course
                  </button>
                </div>

                {courseRows.map((row, idx) => {
                  const unavailable = getUnavailableIds(row.rowId);
                  const availableCourses = courses.filter(c => !unavailable.has(c.id));
                  return (
                    <div key={row.rowId} className="border border-gray-100 rounded-xl p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <Select value={row.course_id} onChange={e => updateRow(row.rowId, 'course_id', e.target.value)} disabled={!tutorId}>
                            <option value="">{tutorId ? `Course ${idx + 1}` : 'Select a tutor first'}</option>
                            {availableCourses.map(c => (
                              <option key={c.id} value={c.id}>{c.course_name} ({c.course_code})</option>
                            ))}
                          </Select>
                        </div>
                        {courseRows.length > 1 && (
                          <button type="button" onClick={() => removeRow(row.rowId)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0">
                            <X size={15} />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <FormField label="Assigned Date">
                          <Input type="date" value={row.assigned_date}
                            onChange={e => updateRow(row.rowId, 'assigned_date', e.target.value)} />
                        </FormField>
                        <FormField label="Status">
                          <Select value={row.status} onChange={e => updateRow(row.rowId, 'status', e.target.value)}>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="completed">Completed</option>
                          </Select>
                        </FormField>
                      </div>
                      <FormField label="Notes">
                        <Input placeholder="Optional notes" value={row.notes}
                          onChange={e => updateRow(row.rowId, 'notes', e.target.value)} />
                      </FormField>
                    </div>
                  );
                })}
              </div>

              {tutorId && courseRows.some(r => r.course_id) && (
                <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-800 space-y-1">
                  <p className="font-medium">Assigning to <strong>{selectedTutor && tutorDisplayName(selectedTutor)}</strong>:</p>
                  {courseRows.filter(r => r.course_id).map(r => (
                    <p key={r.rowId} className="ml-2">• {r.course_name} <span className="font-mono text-xs">({r.course_code})</span></p>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setModalOpen(false); resetModal(); }}>Cancel</Button>
            <Button type="submit" loading={submitting}
              disabled={!editingAssign && (!tutorId || courseRows.every(r => !r.course_id))}>
              {editingAssign ? 'Update Assignment' : `Assign ${courseRows.filter(r => r.course_id).length > 1
                ? `${courseRows.filter(r => r.course_id).length} Courses` : 'Course'}`}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete All confirmation */}
      <Modal isOpen={deleteAllOpen} onClose={() => setDeleteAllOpen(false)} title="Delete All Assignments" size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl border border-red-100">
            <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">This will delete all {assignments.length} assignment{assignments.length !== 1 ? 's' : ''}</p>
              <p className="text-xs text-red-600 mt-1">All tutor course assignments will be removed. You can re-upload via CSV after this action.</p>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setDeleteAllOpen(false)} className="flex-1">Cancel</Button>
            <button onClick={handleDeleteAll} disabled={deletingAll}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50">
              {deletingAll
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Trash2 size={14} />}
              Delete All {assignments.length}
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
