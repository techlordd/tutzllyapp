'use client';
import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { statusBadge } from '@/components/ui/Badge';
import FormField, { Input, Select } from '@/components/ui/FormField';
import { Plus, Trash2, ExternalLink, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

interface Classroom {
  record_id: number;
  classroom_id: string;
  room_name: string;
  link: string;
  meeting_id: string;
  passcode: string;
  assigned_to: string;
  user_id: string;
  entry_status: string;
  ip: string;
  record_key: string;
  created_by: string;
  updated_by: string;
  timestamp: string;
  last_updated: string;
}

const emptyForm = () => ({
  room_name: '',
  link: '',
  meeting_id: '',
  passcode: '',
  assigned_to: '',
  user_id: '',
  entry_status: 'active',
});

export default function ClassroomsPage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/classrooms');
      const data = await res.json();
      setClassrooms(data.classrooms || []);
    } catch { toast.error('Failed to load classrooms'); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/classrooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success('Classroom added!');
      setModalOpen(false);
      setForm(emptyForm());
      fetchData();
    } catch { toast.error('Failed to add classroom'); }
    setSubmitting(false);
  };

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    try {
      const res = await fetch('/api/classrooms', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed to delete'); setDeletingAll(false); return; }
      toast.success(`Deleted ${data.deleted} classroom${data.deleted !== 1 ? 's' : ''}`);
      setDeleteAllOpen(false);
      fetchData();
    } catch { toast.error('Failed to delete classrooms'); }
    setDeletingAll(false);
  };

  const columns = [
    {
      key: 'room_name', label: 'Room Name', sortable: true,
      render: (v: unknown) => <span className="font-semibold text-gray-900">{v as string || '—'}</span>,
    },
    {
      key: 'classroom_id', label: 'Classroom ID',
      render: (v: unknown) => (
        <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{v as string || '—'}</span>
      ),
    },
    {
      key: 'meeting_id', label: 'Meeting ID',
      render: (v: unknown) => v ? (
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs text-gray-700">{v as string}</span>
          <button onClick={() => { navigator.clipboard.writeText(v as string); toast.success('Copied!'); }}
            className="p-0.5 text-gray-400 hover:text-gray-600 transition-colors">
            <Copy size={12} />
          </button>
        </div>
      ) : <span className="text-gray-400">—</span>,
    },
    {
      key: 'passcode', label: 'Passcode',
      render: (v: unknown) => v ? (
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs text-gray-700">{v as string}</span>
          <button onClick={() => { navigator.clipboard.writeText(v as string); toast.success('Copied!'); }}
            className="p-0.5 text-gray-400 hover:text-gray-600 transition-colors">
            <Copy size={12} />
          </button>
        </div>
      ) : <span className="text-gray-400">—</span>,
    },
    {
      key: 'assigned_to', label: 'Assigned To',
      render: (v: unknown) => <span className="text-gray-700">{v as string || '—'}</span>,
    },
    {
      key: 'link', label: 'Join Link',
      render: (v: unknown) => v ? (
        <a href={v as string} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm">
          Join <ExternalLink size={12} />
        </a>
      ) : <span className="text-gray-400">—</span>,
    },
    {
      key: 'entry_status', label: 'Status',
      render: (v: unknown) => statusBadge(v as string),
    },
  ];

  return (
    <DashboardLayout title="Classrooms">
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Classrooms</h2>
            <p className="text-gray-500 text-sm mt-0.5">
              {classrooms.length} classroom{classrooms.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="danger" icon={Trash2} onClick={() => setDeleteAllOpen(true)}
              disabled={classrooms.length === 0}>
              Delete All
            </Button>
            <Button icon={Plus} onClick={() => { setForm(emptyForm()); setModalOpen(true); }}>
              Add Classroom
            </Button>
          </div>
        </div>

        <DataTable
          data={classrooms}
          columns={columns}
          loading={loading}
          searchKeys={['room_name', 'classroom_id', 'meeting_id', 'assigned_to']}
          emptyMessage="No classrooms yet"
        />
      </div>

      {/* Delete All Modal */}
      <Modal isOpen={deleteAllOpen} onClose={() => setDeleteAllOpen(false)} title="Delete All Classrooms" size="sm">
        <div className="space-y-4">
          <p className="text-gray-600 text-sm">
            This will permanently delete all <strong>{classrooms.length}</strong> classroom{classrooms.length !== 1 ? 's' : ''}.
            This action cannot be undone.
          </p>
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" onClick={() => setDeleteAllOpen(false)}>Cancel</Button>
            <Button variant="danger" loading={deletingAll} onClick={handleDeleteAll}>Delete All</Button>
          </div>
        </div>
      </Modal>

      {/* Add Classroom Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Classroom" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Room Name" required>
            <Input
              value={form.room_name}
              onChange={e => setForm({ ...form, room_name: e.target.value })}
              placeholder="e.g. Math Room A"
              required
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Meeting ID">
              <Input
                value={form.meeting_id}
                onChange={e => setForm({ ...form, meeting_id: e.target.value })}
                placeholder="e.g. 123 456 7890"
              />
            </FormField>
            <FormField label="Passcode">
              <Input
                value={form.passcode}
                onChange={e => setForm({ ...form, passcode: e.target.value })}
                placeholder="e.g. abc123"
              />
            </FormField>
          </div>

          <FormField label="Join Link">
            <Input
              type="url"
              value={form.link}
              onChange={e => setForm({ ...form, link: e.target.value })}
              placeholder="https://zoom.us/j/..."
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Assigned To">
              <Input
                value={form.assigned_to}
                onChange={e => setForm({ ...form, assigned_to: e.target.value })}
                placeholder="Tutor or group name"
              />
            </FormField>
            <FormField label="User ID">
              <Input
                value={form.user_id}
                onChange={e => setForm({ ...form, user_id: e.target.value })}
                placeholder="e.g. TUT-001"
              />
            </FormField>
          </div>

          <FormField label="Status">
            <Select
              value={form.entry_status}
              onChange={e => setForm({ ...form, entry_status: e.target.value })}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </FormField>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={submitting}>Add Classroom</Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
