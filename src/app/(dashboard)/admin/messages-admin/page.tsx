'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { statusBadge } from '@/components/ui/Badge';
import FormField, { Input, Select, Textarea } from '@/components/ui/FormField';
import { Send, Eye, Trash2, Inbox } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface AdminMessage {
  record_id: number;
  message_date: string; message_time: string; role: string;
  sender: string; user_role: string; user_role2: string;
  tutor_name: string; tutor_id: string;
  student_name: string; student_id: string;
  parent_name: string; parent_id: string;
  recipient_admin: string; cc: string;
  subject: string; body: string; file_upload: string;
  status: string; user_id: string;
  entry_status: string; timestamp: string; last_updated: string;
  created_by: string; updated_by: string; ip: string; record_key: string;
}

function resolveSender(row: AdminMessage): string {
  return row.sender || row.tutor_name || row.student_name || row.parent_name || '—';
}

function resolveSenderRole(row: AdminMessage): string {
  if (row.tutor_name) return 'Tutor';
  if (row.student_name) return 'Student';
  if (row.parent_name) return 'Parent';
  return row.role || row.user_role || '—';
}

export default function MessagesAdminPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [tutors, setTutors] = useState<{tutor_id: string; firstname: string; surname: string}[]>([]);
  const [students, setStudents] = useState<{student_id: string; firstname: string; surname: string}[]>([]);
  const [parents, setParents] = useState<{parent_id: string; firstname: string; surname: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    role: '', sender: '', user_role: '', user_role2: '',
    tutor_name: '', tutor_id: '', student_name: '', student_id: '',
    parent_name: '', parent_id: '',
    recipient_admin: '', cc: '', subject: '', body: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, tRes, sRes, pRes] = await Promise.all([
        fetch('/api/messages/admin'), fetch('/api/tutors'),
        fetch('/api/students'), fetch('/api/parents'),
      ]);
      const [mData, tData, sData, pData] = await Promise.all([
        mRes.json(), tRes.json(), sRes.json(), pRes.json(),
      ]);
      setMessages(mData.messages || []);
      setTutors(tData.tutors || []);
      setStudents(sData.students || []);
      setParents(pData.parents || []);
    } catch { toast.error('Failed to load messages'); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/messages/admin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success('Message sent!');
      setComposeOpen(false);
      fetchData();
    } catch { toast.error('Failed to send message'); }
    setSubmitting(false);
  };

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    try {
      const res = await fetch('/api/messages/admin', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed to delete'); setDeletingAll(false); return; }
      toast.success(`Deleted ${data.deleted} message${data.deleted !== 1 ? 's' : ''}`);
      setDeleteAllOpen(false);
      fetchData();
    } catch { toast.error('Failed to delete messages'); }
    setDeletingAll(false);
  };

  const unreadCount = messages.filter(m => m.status === 'unread').length;

  const columns = [
    { key: 'message_date', label: 'Date', sortable: true, render: (v: unknown) => formatDate(v as string) },
    { key: 'message_time', label: 'Time', render: (v: unknown) => (v as string) || '—' },
    { key: 'sender', label: 'Sender', sortable: true, render: (_: unknown, row: AdminMessage) => (
      <div>
        <span className="font-medium block">{resolveSender(row)}</span>
        <span className="text-xs text-gray-400">{resolveSenderRole(row)}</span>
      </div>
    )},
    { key: 'recipient_admin', label: 'Recipient (Admin)', render: (v: unknown) => (
      <span className="text-sm">{v as string || '—'}</span>
    )},
    { key: 'subject', label: 'Subject', render: (v: unknown) => (
      <span className="font-medium text-gray-900 truncate max-w-[180px] block" title={v as string}>{v as string || '—'}</span>
    )},
    { key: 'status', label: 'Status', render: (v: unknown) => statusBadge(v as string) },
  ];

  return (
    <DashboardLayout title="Messages — Admin">
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Messages to Admin</h2>
            <div className="flex items-center gap-3 mt-0.5">
              <p className="text-gray-500 text-sm">{messages.length} message{messages.length !== 1 ? 's' : ''}</p>
              {unreadCount > 0 && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  {unreadCount} unread
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {messages.length > 0 && (
              <Button variant="danger" icon={Trash2} onClick={() => setDeleteAllOpen(true)}>Delete All</Button>
            )}
            <Button icon={Send} onClick={() => setComposeOpen(true)}>Compose</Button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Inbox size={16} />
          <span>Messages addressed to admin</span>
        </div>

        <DataTable data={messages} columns={columns} loading={loading}
          searchKeys={['sender', 'tutor_name', 'student_name', 'parent_name', 'recipient_admin', 'subject']}
          emptyMessage="No messages yet"
          actions={(row) => (
            <button onClick={() => router.push(`/admin/messages-admin/${row.record_id}`)}
              className={`p-1.5 rounded-lg transition-colors ${row.status === 'unread' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'hover:bg-blue-50 text-blue-600'}`}
              title="View message">
              <Eye size={15} />
            </button>
          )}
        />
      </div>

      {/* Delete All modal */}
      <Modal isOpen={deleteAllOpen} onClose={() => setDeleteAllOpen(false)} title="Delete All Admin Messages" size="sm">
        <div className="space-y-4">
          <p className="text-gray-600 text-sm">
            This will permanently delete all <strong>{messages.length}</strong> message{messages.length !== 1 ? 's' : ''}.
            This action cannot be undone.
          </p>
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" onClick={() => setDeleteAllOpen(false)}>Cancel</Button>
            <Button variant="danger" loading={deletingAll} onClick={handleDeleteAll}>Delete All</Button>
          </div>
        </div>
      </Modal>

      {/* Compose Modal */}
      <Modal isOpen={composeOpen} onClose={() => setComposeOpen(false)} title="Send Message to Admin" size="2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Sender Role" required>
              <Select value={form.role} onChange={e => setForm({...form, role: e.target.value, tutor_name: '', tutor_id: '', student_name: '', student_id: '', parent_name: '', parent_id: ''})} required>
                <option value="">Select Role</option>
                <option value="tutor">Tutor</option>
                <option value="student">Student</option>
                <option value="parent">Parent</option>
              </Select>
            </FormField>
            <FormField label="Recipient (Admin)">
              <Input value={form.recipient_admin} onChange={e => setForm({...form, recipient_admin: e.target.value})} placeholder="Admin name or email" />
            </FormField>

            {form.role === 'tutor' && (
              <FormField label="Tutor" required className="sm:col-span-2">
                <Select value={form.tutor_id} onChange={e => {
                  const t = tutors.find(t => t.tutor_id === e.target.value);
                  setForm({...form, tutor_id: e.target.value, tutor_name: t ? `${t.firstname} ${t.surname}` : '', sender: t ? `${t.firstname} ${t.surname}` : ''});
                }} required>
                  <option value="">Select Tutor</option>
                  {tutors.map(t => <option key={t.tutor_id} value={t.tutor_id}>{t.firstname} {t.surname}</option>)}
                </Select>
              </FormField>
            )}
            {form.role === 'student' && (
              <FormField label="Student" required className="sm:col-span-2">
                <Select value={form.student_id} onChange={e => {
                  const s = students.find(s => s.student_id === e.target.value);
                  setForm({...form, student_id: e.target.value, student_name: s ? `${s.firstname} ${s.surname}` : '', sender: s ? `${s.firstname} ${s.surname}` : ''});
                }} required>
                  <option value="">Select Student</option>
                  {students.map(s => <option key={s.student_id} value={s.student_id}>{s.firstname} {s.surname}</option>)}
                </Select>
              </FormField>
            )}
            {form.role === 'parent' && (
              <FormField label="Parent" required className="sm:col-span-2">
                <Select value={form.parent_id} onChange={e => {
                  const p = parents.find(p => p.parent_id === e.target.value);
                  setForm({...form, parent_id: e.target.value, parent_name: p ? `${p.firstname} ${p.surname}` : '', sender: p ? `${p.firstname} ${p.surname}` : ''});
                }} required>
                  <option value="">Select Parent</option>
                  {parents.map(p => <option key={p.parent_id} value={p.parent_id}>{p.firstname} {p.surname}</option>)}
                </Select>
              </FormField>
            )}

            <FormField label="Cc (optional)">
              <Input type="email" value={form.cc} onChange={e => setForm({...form, cc: e.target.value})} />
            </FormField>
          </div>
          <FormField label="Subject" required>
            <Input value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} required />
          </FormField>
          <FormField label="Message Body" required>
            <Textarea rows={5} value={form.body} onChange={e => setForm({...form, body: e.target.value})} required />
          </FormField>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setComposeOpen(false)}>Cancel</Button>
            <Button type="submit" loading={submitting} icon={Send}>Send Message</Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
