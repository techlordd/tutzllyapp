'use client';
import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { statusBadge } from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import FormField, { Input, Select, Textarea } from '@/components/ui/FormField';
import { Plus, Edit, Trash2, Eye, AlertTriangle } from 'lucide-react';
import { formatDate, GRADES } from '@/lib/utils';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Student {
  student_id: string; enrollment_id: string; firstname: string; surname: string;
  email: string; phone_no: string; sex: string; grade: string; school: string;
  status: string; mothers_name: string; mothers_email: string;
  fathers_name: string; fathers_email: string; timestamp: string;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [form, setForm] = useState({
    enrollment_id: '', firstname: '', surname: '', email: '', password: '', phone_no: '', sex: '',
    grade: '', school: '', date_of_birth: '', mothers_name: '', mothers_email: '',
    fathers_name: '', fathers_email: '', address: '', address_line1: '', address_line2: '',
    address_city: '', address_state: '', address_zip: '', address_country: '',
    short_bio: '', status: 'active', reason_for_inactive: '',
  });

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/students');
      const data = await res.json();
      setStudents(data.students || []);
    } catch { toast.error('Failed to load students'); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editingStudent ? `/api/students/${editingStudent.student_id}` : '/api/students';
      const method = editingStudent ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      toast.success(editingStudent ? 'Student updated!' : 'Student registered!');
      setModalOpen(false);
      resetForm();
      fetchStudents();
    } catch { toast.error('Failed to save student'); }
    setSubmitting(false);
  };

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    try {
      const res = await fetch('/api/students', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`${data.deleted} student${data.deleted !== 1 ? 's' : ''} deleted`);
      setDeleteAllOpen(false);
      fetchStudents();
    } catch { toast.error('Failed to delete all students'); }
    setDeletingAll(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this student?')) return;
    try {
      await fetch(`/api/students/${id}`, { method: 'DELETE' });
      toast.success('Student deleted');
      fetchStudents();
    } catch { toast.error('Failed to delete'); }
  };

  const resetForm = () => {
    setForm({
      enrollment_id: '', firstname: '', surname: '', email: '', password: '', phone_no: '', sex: '',
      grade: '', school: '', date_of_birth: '', mothers_name: '', mothers_email: '',
      fathers_name: '', fathers_email: '', address: '', address_line1: '', address_line2: '',
      address_city: '', address_state: '', address_zip: '', address_country: '',
      short_bio: '', status: 'active', reason_for_inactive: '',
    });
    setEditingStudent(null);
  };

  const openEdit = (s: Student) => {
    setEditingStudent(s);
    setForm({ ...form, enrollment_id: s.enrollment_id || '', firstname: s.firstname || '',
      surname: s.surname || '', email: s.email || '', phone_no: s.phone_no || '', sex: s.sex || '',
      grade: s.grade || '', school: s.school || '', status: s.status || 'active',
      mothers_name: s.mothers_name || '', mothers_email: s.mothers_email || '',
      fathers_name: s.fathers_name || '', fathers_email: s.fathers_email || '', password: '' });
    setModalOpen(true);
  };

  const columns = [
    {
      key: 'fullname', label: 'Name', render: (_: unknown, row: Student) => (
        <div className="flex items-center gap-3">
          <Avatar name={`${row.firstname} ${row.surname}`} size="sm" />
          <p className="font-medium text-gray-900">{row.firstname} {row.surname}</p>
        </div>
      )
    },
    { key: 'email', label: 'Email' },
    { key: 'grade', label: 'Grade' },
    { key: 'school', label: 'School' },
    { key: 'status', label: 'Status', render: (v: unknown) => statusBadge(v as string) },
  ];

  return (
    <DashboardLayout title="Students Management">
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Students</h2>
            <p className="text-gray-500 text-sm mt-0.5">{students.length} registered students</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setDeleteAllOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors"
            >
              <Trash2 size={14} /> Delete All
            </button>
            <Button icon={Plus} onClick={() => { resetForm(); setModalOpen(true); }}>
              Register Student
            </Button>
          </div>
        </div>

        <DataTable data={students} columns={columns} loading={loading}
          searchKeys={['firstname', 'surname', 'email', 'student_id', 'grade']}
          emptyMessage="No students registered yet"
          actions={(row) => (
            <>
              <Link href={`/admin/students/${row.student_id}`}>
                <span className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors inline-flex" title="View">
                  <Eye size={15} />
                </span>
              </Link>
              <button onClick={() => openEdit(row)}
                className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors" title="Edit">
                <Edit size={15} />
              </button>
              <button onClick={() => handleDelete(row.student_id)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors" title="Delete">
                <Trash2 size={15} />
              </button>
            </>
          )}
        />
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); resetForm(); }}
        title={editingStudent ? 'Edit Student' : 'Register New Student'} size="2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="First Name" required>
              <Input value={form.firstname} onChange={e => setForm({...form, firstname: e.target.value})} required />
            </FormField>
            <FormField label="Surname" required>
              <Input value={form.surname} onChange={e => setForm({...form, surname: e.target.value})} required />
            </FormField>
            <FormField label="Student ID / Enrollment No.">
              <Input value={form.enrollment_id} onChange={e => setForm({...form, enrollment_id: e.target.value})} placeholder="e.g. 2024-001" />
            </FormField>
            <FormField label="Email" required>
              <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
            </FormField>
            {!editingStudent && (
              <FormField label="Password" required>
                <Input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
              </FormField>
            )}
            <FormField label="Phone">
              <Input value={form.phone_no} onChange={e => setForm({...form, phone_no: e.target.value})} />
            </FormField>
            <FormField label="Sex">
              <Select value={form.sex} onChange={e => setForm({...form, sex: e.target.value})}>
                <option value="">Select</option><option>Male</option><option>Female</option>
              </Select>
            </FormField>
            <FormField label="Grade">
              <Select value={form.grade} onChange={e => setForm({...form, grade: e.target.value})}>
                <option value="">Select Grade</option>
                {GRADES.map(g => <option key={g}>{g}</option>)}
              </Select>
            </FormField>
            <FormField label="School">
              <Input value={form.school} onChange={e => setForm({...form, school: e.target.value})} />
            </FormField>
            <FormField label="Date of Birth">
              <Input type="date" value={form.date_of_birth} onChange={e => setForm({...form, date_of_birth: e.target.value})} />
            </FormField>
            <FormField label="Status">
              <Select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                <option value="active">Active</option><option value="inactive">Inactive</option>
              </Select>
            </FormField>
            {form.status === 'inactive' && (
              <FormField label="Reason for Inactive" className="sm:col-span-2">
                <Input value={form.reason_for_inactive} onChange={e => setForm({...form, reason_for_inactive: e.target.value})} />
              </FormField>
            )}
          </div>

          <div className="border-t pt-4">
            <h4 className="font-semibold text-sm text-gray-700 mb-3">Parent / Guardian Info</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Mother's Name">
                <Input value={form.mothers_name} onChange={e => setForm({...form, mothers_name: e.target.value})} />
              </FormField>
              <FormField label="Mother's Email">
                <Input type="email" value={form.mothers_email} onChange={e => setForm({...form, mothers_email: e.target.value})} />
              </FormField>
              <FormField label="Father's Name">
                <Input value={form.fathers_name} onChange={e => setForm({...form, fathers_name: e.target.value})} />
              </FormField>
              <FormField label="Father's Email">
                <Input type="email" value={form.fathers_email} onChange={e => setForm({...form, fathers_email: e.target.value})} />
              </FormField>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-semibold text-sm text-gray-700 mb-3">Address</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Address Line 1" className="sm:col-span-2">
                <Input value={form.address_line1} onChange={e => setForm({...form, address_line1: e.target.value})} />
              </FormField>
              <FormField label="Address Line 2" className="sm:col-span-2">
                <Input value={form.address_line2} onChange={e => setForm({...form, address_line2: e.target.value})} />
              </FormField>
              <FormField label="City">
                <Input value={form.address_city} onChange={e => setForm({...form, address_city: e.target.value})} />
              </FormField>
              <FormField label="State / Province">
                <Input value={form.address_state} onChange={e => setForm({...form, address_state: e.target.value})} />
              </FormField>
              <FormField label="Zip / Postal">
                <Input value={form.address_zip} onChange={e => setForm({...form, address_zip: e.target.value})} />
              </FormField>
              <FormField label="Country">
                <Input value={form.address_country} onChange={e => setForm({...form, address_country: e.target.value})} />
              </FormField>
            </div>
          </div>

          <FormField label="Short Bio">
            <Textarea rows={3} value={form.short_bio} onChange={e => setForm({...form, short_bio: e.target.value})} />
          </FormField>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setModalOpen(false); resetForm(); }}>Cancel</Button>
            <Button type="submit" loading={submitting}>{editingStudent ? 'Update Student' : 'Register Student'}</Button>
          </div>
        </form>
      </Modal>

      {/* Delete All confirmation modal */}
      <Modal isOpen={deleteAllOpen} onClose={() => setDeleteAllOpen(false)} title="Delete All Students" size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl border border-red-100">
            <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">This will delete all {students.length} student{students.length !== 1 ? 's' : ''}</p>
              <p className="text-xs text-red-600 mt-1">All student records will be removed. You can re-upload via CSV after this action.</p>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setDeleteAllOpen(false)} className="flex-1">Cancel</Button>
            <button
              onClick={handleDeleteAll}
              disabled={deletingAll}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              {deletingAll
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Trash2 size={14} />}
              Delete All {students.length} Students
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
