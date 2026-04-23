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
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Parent {
  parent_id: string; full_name_first_name: string; full_name_last_name: string;
  email: string; phone_no: string; sex: string; no_of_students: number;
  student1: string; student_id1: string; student2: string; student_id2: string;
  student3: string; student_id3: string; student4: string; student_id4: string;
  student5: string; student_id5: string; entry_status: string; timestamp: string;
}

export default function ParentsPage() {
  const [parents, setParents] = useState<Parent[]>([]);
  const [students, setStudents] = useState<{ student_id: string; firstname: string; surname: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingParent, setEditingParent] = useState<Parent | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [form, setForm] = useState({
    full_name_first_name: '', full_name_last_name: '', email: '', password: '',
    phone_no: '', sex: '', date_of_birth: '',
    address: '', address_line1: '', address_line2: '', address_city: '',
    address_state: '', address_zip: '', address_country: '', short_bio: '',
    no_of_students: '0',
    student1: '', student_id1: '', student2: '', student_id2: '',
    student3: '', student_id3: '', student4: '', student_id4: '',
    student5: '', student_id5: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([fetch('/api/parents'), fetch('/api/students')]);
      const [pData, sData] = await Promise.all([pRes.json(), sRes.json()]);
      setParents(pData.parents || []);
      setStudents(sData.students || []);
    } catch { toast.error('Failed to load data'); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStudentSelect = (index: number, studentId: string) => {
    const s = students.find(st => st.student_id === studentId);
    setForm(f => ({
      ...f,
      [`student${index}`]: s ? `${s.firstname} ${s.surname}` : '',
      [`student_id${index}`]: studentId,
    }));
  };

  const resetForm = () => {
    setForm({
      full_name_first_name: '', full_name_last_name: '', email: '', password: '',
      phone_no: '', sex: '', date_of_birth: '',
      address: '', address_line1: '', address_line2: '', address_city: '',
      address_state: '', address_zip: '', address_country: '', short_bio: '',
      no_of_students: '0',
      student1: '', student_id1: '', student2: '', student_id2: '',
      student3: '', student_id3: '', student4: '', student_id4: '',
      student5: '', student_id5: '',
    });
    setEditingParent(null);
  };

  const openEdit = (p: Parent) => {
    setEditingParent(p);
    setForm({
      ...form,
      full_name_first_name: p.full_name_first_name || '',
      full_name_last_name: p.full_name_last_name || '',
      email: p.email || '', password: '',
      phone_no: p.phone_no || '', sex: p.sex || '',
      no_of_students: String(p.no_of_students || 0),
      student1: p.student1 || '', student_id1: p.student_id1 || '',
      student2: p.student2 || '', student_id2: p.student_id2 || '',
      student3: p.student3 || '', student_id3: p.student_id3 || '',
      student4: p.student4 || '', student_id4: p.student_id4 || '',
      student5: p.student5 || '', student_id5: p.student_id5 || '',
      date_of_birth: '', address: '', address_line1: '', address_line2: '',
      address_city: '', address_state: '', address_zip: '', address_country: '', short_bio: '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editingParent ? `/api/parents/${editingParent.parent_id}` : '/api/parents';
      const method = editingParent ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      toast.success(editingParent ? 'Parent updated!' : 'Parent registered!');
      setModalOpen(false);
      resetForm();
      fetchData();
    } catch { toast.error('Failed to save parent'); }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this parent?')) return;
    try {
      await fetch(`/api/parents/${id}`, { method: 'DELETE' });
      toast.success('Parent deleted');
      fetchData();
    } catch { toast.error('Failed to delete'); }
  };

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    try {
      const res = await fetch('/api/parents', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`${data.deleted} parent${data.deleted !== 1 ? 's' : ''} deleted`);
      setDeleteAllOpen(false);
      fetchData();
    } catch { toast.error('Failed to delete all parents'); }
    setDeletingAll(false);
  };

  const columns = [
    {
      key: 'fullname', label: 'Parent', render: (_: unknown, row: Parent) => (
        <div className="flex items-center gap-3">
          <Avatar name={`${row.full_name_first_name} ${row.full_name_last_name}`} size="sm" />
          <p className="font-medium text-gray-900">{row.full_name_first_name} {row.full_name_last_name}</p>
        </div>
      )
    },
    { key: 'email', label: 'Email' },
    { key: 'phone_no', label: 'Phone' },
    {
      key: 'no_of_students', label: 'Children', render: (v: unknown) => (
        <span className="inline-flex items-center justify-center w-7 h-7 bg-purple-100 text-purple-700 text-xs font-bold rounded-full">{v as number}</span>
      )
    },
    { key: 'entry_status', label: 'Status', render: (v: unknown) => statusBadge(v as string) },
  ];

  return (
    <DashboardLayout title="Parents Management">
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Parents</h2>
            <p className="text-gray-500 text-sm mt-0.5">{parents.length} registered parents</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setDeleteAllOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors"
            >
              <Trash2 size={14} /> Delete All
            </button>
            <Button icon={Plus} onClick={() => { resetForm(); setModalOpen(true); }}>
              Register Parent
            </Button>
          </div>
        </div>

        <DataTable data={parents} columns={columns} loading={loading}
          searchKeys={['full_name_first_name', 'full_name_last_name', 'email', 'parent_id']}
          emptyMessage="No parents registered yet"
          actions={(row) => (
            <>
              <Link href={`/admin/parents/${row.parent_id}`}>
                <span className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors inline-flex" title="View">
                  <Eye size={15} />
                </span>
              </Link>
              <button onClick={() => openEdit(row)}
                className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors" title="Edit">
                <Edit size={15} />
              </button>
              <button onClick={() => handleDelete(row.parent_id)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors" title="Delete">
                <Trash2 size={15} />
              </button>
            </>
          )}
        />
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); resetForm(); }}
        title={editingParent ? 'Edit Parent' : 'Register New Parent'} size="2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="First Name" required>
              <Input value={form.full_name_first_name} onChange={e => setForm({ ...form, full_name_first_name: e.target.value })} required />
            </FormField>
            <FormField label="Last Name" required>
              <Input value={form.full_name_last_name} onChange={e => setForm({ ...form, full_name_last_name: e.target.value })} required />
            </FormField>
            <FormField label="Email" required>
              <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            </FormField>
            {!editingParent && (
              <FormField label="Password" required>
                <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
              </FormField>
            )}
            <FormField label="Phone">
              <Input value={form.phone_no} onChange={e => setForm({ ...form, phone_no: e.target.value })} />
            </FormField>
            <FormField label="Sex">
              <Select value={form.sex} onChange={e => setForm({ ...form, sex: e.target.value })}>
                <option value="">Select</option><option>Male</option><option>Female</option>
              </Select>
            </FormField>
            <FormField label="Date of Birth">
              <Input type="date" value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} />
            </FormField>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-semibold text-sm text-gray-700 mb-3">Children (up to 5)</h4>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{i}</span>
                  <Select className="flex-1"
                    value={form[`student_id${i}` as keyof typeof form] as string}
                    onChange={e => handleStudentSelect(i, e.target.value)}>
                    <option value="">Select Student {i}</option>
                    {students.map(s => <option key={s.student_id} value={s.student_id}>{s.firstname} {s.surname}</option>)}
                  </Select>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-semibold text-sm text-gray-700 mb-3">Address</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Address Line 1" className="sm:col-span-2">
                <Input value={form.address_line1} onChange={e => setForm({ ...form, address_line1: e.target.value })} />
              </FormField>
              <FormField label="Address Line 2" className="sm:col-span-2">
                <Input value={form.address_line2} onChange={e => setForm({ ...form, address_line2: e.target.value })} />
              </FormField>
              <FormField label="City">
                <Input value={form.address_city} onChange={e => setForm({ ...form, address_city: e.target.value })} />
              </FormField>
              <FormField label="State / Province">
                <Input value={form.address_state} onChange={e => setForm({ ...form, address_state: e.target.value })} />
              </FormField>
              <FormField label="Zip / Postal">
                <Input value={form.address_zip} onChange={e => setForm({ ...form, address_zip: e.target.value })} />
              </FormField>
              <FormField label="Country">
                <Input value={form.address_country} onChange={e => setForm({ ...form, address_country: e.target.value })} />
              </FormField>
            </div>
          </div>

          <FormField label="Short Bio">
            <Textarea rows={2} value={form.short_bio} onChange={e => setForm({ ...form, short_bio: e.target.value })} />
          </FormField>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setModalOpen(false); resetForm(); }}>Cancel</Button>
            <Button type="submit" loading={submitting}>{editingParent ? 'Update Parent' : 'Register Parent'}</Button>
          </div>
        </form>
      </Modal>

      {/* Delete All confirmation modal */}
      <Modal isOpen={deleteAllOpen} onClose={() => setDeleteAllOpen(false)} title="Delete All Parents" size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl border border-red-100">
            <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">This will delete all {parents.length} parent{parents.length !== 1 ? 's' : ''}</p>
              <p className="text-xs text-red-600 mt-1">All parent records will be removed. You can re-upload via CSV after this action.</p>
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
              Delete All {parents.length} Parents
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
