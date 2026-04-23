'use client';
import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Badge, { statusBadge } from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import FormField, { Input, Select, Textarea } from '@/components/ui/FormField';
import { Plus, Edit, Trash2, Eye, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { formatDate, formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Tutor {
  tutor_id: string;
  firstname: string;
  surname: string;
  email: string;
  phone_no: string;
  sex: string;
  pay_category: string;
  payrate_per_hour: number;
  salary: number;
  entry_status: string;
  timestamp: string;
}

export default function TutorsPage() {
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editingTutor, setEditingTutor] = useState<Tutor | null>(null);
  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [form, setForm] = useState({
    firstname: '', surname: '', email: '', password: '', phone_no: '', sex: '',
    date_of_birth: '', address_line1: '', address_line2: '', address_city: '',
    address_state: '', address_zip: '', address_country: '', short_bio: '',
    pay_category: '', salary: '', payrate_per_hour: '',
  });

  const fetchTutors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tutors');
      const data = await res.json();
      setTutors(data.tutors || []);
    } catch { toast.error('Failed to load tutors'); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchTutors(); }, [fetchTutors]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editingTutor ? `/api/tutors/${editingTutor.tutor_id}` : '/api/tutors';
      const method = editingTutor ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      toast.success(editingTutor ? 'Tutor updated!' : 'Tutor registered!');
      setModalOpen(false);
      resetForm();
      fetchTutors();
    } catch { toast.error('Failed to save tutor'); }
    setSubmitting(false);
  };

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    try {
      const res = await fetch('/api/tutors', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`${data.deleted} tutor${data.deleted !== 1 ? 's' : ''} deleted`);
      setDeleteAllOpen(false);
      fetchTutors();
    } catch { toast.error('Failed to delete all tutors'); }
    setDeletingAll(false);
  };

  const handleDelete = async (tutorId: string) => {
    if (!confirm('Delete this tutor?')) return;
    try {
      await fetch(`/api/tutors/${tutorId}`, { method: 'DELETE' });
      toast.success('Tutor deleted');
      fetchTutors();
    } catch { toast.error('Failed to delete'); }
  };

  const resetForm = () => {
    setForm({ firstname: '', surname: '', email: '', password: '', phone_no: '', sex: '',
      date_of_birth: '', address_line1: '', address_line2: '', address_city: '',
      address_state: '', address_zip: '', address_country: '', short_bio: '',
      pay_category: '', salary: '', payrate_per_hour: '' });
    setEditingTutor(null);
  };

  const openEdit = (tutor: Tutor) => {
    setEditingTutor(tutor);
    setForm({ ...form, firstname: tutor.firstname || '', surname: tutor.surname || '',
      email: tutor.email || '', phone_no: tutor.phone_no || '', sex: tutor.sex || '',
      pay_category: tutor.pay_category || '', salary: String(tutor.salary || ''),
      payrate_per_hour: String(tutor.payrate_per_hour || ''), password: '' });
    setModalOpen(true);
  };

  const columns = [
    {
      key: 'fullname', label: 'Name', render: (_: unknown, row: Tutor) => (
        <div className="flex items-center gap-3">
          <Avatar name={`${row.firstname} ${row.surname}`} size="sm" />
          <p className="font-medium text-gray-900">{row.firstname} {row.surname}</p>
        </div>
      )
    },
    { key: 'email', label: 'Email' },
    { key: 'phone_no', label: 'Phone' },
    { key: 'pay_category', label: 'Pay Category' },
    {
      key: 'payrate_per_hour', label: 'Rate/Hr', render: (v: unknown) =>
        <span className="font-medium text-green-600">{formatCurrency(v as number)}</span>
    },
    {
      key: 'entry_status', label: 'Status', render: (v: unknown) => statusBadge(v as string)
    },
  ];

  return (
    <DashboardLayout title="Tutors Management">
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Tutors</h2>
            <p className="text-gray-500 text-sm mt-0.5">{tutors.length} registered tutors</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setDeleteAllOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors"
            >
              <Trash2 size={14} /> Delete All
            </button>
            <Button icon={Plus} onClick={() => { resetForm(); setModalOpen(true); }}>
              Register Tutor
            </Button>
          </div>
        </div>

        <DataTable
          data={tutors}
          columns={columns}
          loading={loading}
          searchKeys={['firstname', 'surname', 'email', 'tutor_id']}
          emptyMessage="No tutors registered yet"
          actions={(row) => (
            <>
              <Link href={`/admin/tutors/${row.tutor_id}`}>
                <span className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors inline-flex" title="View">
                  <Eye size={15} />
                </span>
              </Link>
              <button onClick={() => openEdit(row)}
                className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors" title="Edit">
                <Edit size={15} />
              </button>
              <button onClick={() => handleDelete(row.tutor_id)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors" title="Delete">
                <Trash2 size={15} />
              </button>
            </>
          )}
        />
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); resetForm(); }}
        title={editingTutor ? 'Edit Tutor' : 'Register New Tutor'} size="2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="First Name" required>
              <Input value={form.firstname} onChange={e => setForm({...form, firstname: e.target.value})} required />
            </FormField>
            <FormField label="Surname" required>
              <Input value={form.surname} onChange={e => setForm({...form, surname: e.target.value})} required />
            </FormField>
            <FormField label="Email" required>
              <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
            </FormField>
            {!editingTutor && (
              <FormField label="Password" required>
                <Input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required placeholder="Min 8 characters" />
              </FormField>
            )}
            <FormField label="Phone Number">
              <Input value={form.phone_no} onChange={e => setForm({...form, phone_no: e.target.value})} />
            </FormField>
            <FormField label="Sex">
              <Select value={form.sex} onChange={e => setForm({...form, sex: e.target.value})}>
                <option value="">Select</option>
                <option>Male</option><option>Female</option>
              </Select>
            </FormField>
            <FormField label="Date of Birth">
              <Input type="date" value={form.date_of_birth} onChange={e => setForm({...form, date_of_birth: e.target.value})} />
            </FormField>
            <FormField label="Pay Category">
              <Select value={form.pay_category} onChange={e => setForm({...form, pay_category: e.target.value})}>
                <option value="">Select</option>
                <option>Hourly</option><option>Monthly</option><option>Per Session</option>
              </Select>
            </FormField>
            <FormField label="Salary (₦)">
              <Input type="number" value={form.salary} onChange={e => setForm({...form, salary: e.target.value})} placeholder="0.00" />
            </FormField>
            <FormField label="Pay Rate Per Hour (₦)">
              <Input type="number" value={form.payrate_per_hour} onChange={e => setForm({...form, payrate_per_hour: e.target.value})} placeholder="0.00" />
            </FormField>
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Address</h4>
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
              <FormField label="State/Province">
                <Input value={form.address_state} onChange={e => setForm({...form, address_state: e.target.value})} />
              </FormField>
              <FormField label="Zip/Postal">
                <Input value={form.address_zip} onChange={e => setForm({...form, address_zip: e.target.value})} />
              </FormField>
              <FormField label="Country">
                <Input value={form.address_country} onChange={e => setForm({...form, address_country: e.target.value})} />
              </FormField>
            </div>
          </div>

          <FormField label="Short Bio">
            <Textarea rows={3} value={form.short_bio} onChange={e => setForm({...form, short_bio: e.target.value})} placeholder="Brief description about this tutor..." />
          </FormField>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setModalOpen(false); resetForm(); }}>Cancel</Button>
            <Button type="submit" loading={submitting}>{editingTutor ? 'Update Tutor' : 'Register Tutor'}</Button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      {selectedTutor && (
        <Modal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)} title="Tutor Profile" size="lg">
          <div className="space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b">
              <Avatar name={`${selectedTutor.firstname} ${selectedTutor.surname}`} size="xl" />
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedTutor.firstname} {selectedTutor.surname}</h3>
                <p className="text-sm text-gray-500">{selectedTutor.tutor_id}</p>
                <div className="mt-1">{statusBadge(selectedTutor.entry_status)}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Email', selectedTutor.email],
                ['Phone', selectedTutor.phone_no],
                ['Sex', selectedTutor.sex],
                ['Pay Category', selectedTutor.pay_category],
                ['Rate/Hr', formatCurrency(selectedTutor.payrate_per_hour)],
                ['Salary', formatCurrency(selectedTutor.salary)],
                ['Joined', formatDate(selectedTutor.timestamp)],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-gray-400 text-xs">{label}</p>
                  <p className="font-medium text-gray-900">{value || '—'}</p>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
      {/* Delete All confirmation modal */}
      <Modal isOpen={deleteAllOpen} onClose={() => setDeleteAllOpen(false)} title="Delete All Tutors" size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl border border-red-100">
            <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">This will delete all {tutors.length} tutor{tutors.length !== 1 ? 's' : ''}</p>
              <p className="text-xs text-red-600 mt-1">
                All tutor records for this academy will be removed. You can re-upload tutors via CSV after this action.
              </p>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setDeleteAllOpen(false)} className="flex-1">
              Cancel
            </Button>
            <button
              onClick={handleDeleteAll}
              disabled={deletingAll}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              {deletingAll ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Trash2 size={14} />
              )}
              Delete All {tutors.length} Tutors
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
