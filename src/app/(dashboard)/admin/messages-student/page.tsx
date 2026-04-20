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

interface StudentMessage {
  record_id: number;
  message_date: string; message_time: string; role: string;
  sender_email: string; user_role: string; message_to: string;
  sender: string; tutor_name: string; tutor_id: string;
  student_name: string; student_id: string; lookup_tutor_id: string;
  recipient_name_student: string; recipient_id_student: string; recipient_email: string;
  cc: string; recipient_name_tutor: string; recipient_id_tutor: string;
  recipient_name_parent: string; recipient_id_parent: string; recipient_admin: string;
  subject: string; body: string; attach_file: string;
  status: string; user_id: string;
  entry_status: string; timestamp: string; last_updated: string;
  created_by: string; updated_by: string; ip: string; record_key: string;
}

function resolveRecipient(row: StudentMessage): string {
  return row.recipient_name_student || row.recipient_name_tutor ||
    row.recipient_name_parent || row.recipient_admin || '—';
}

export default function MessagesStudentPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<StudentMessage[]>([]);
  const [students, setStudents] = useState<{student_id: string; firstname: string; surname: string}[]>([]);
  const [tutors, setTutors] = useState<{tutor_id: string; firstname: string; surname: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    role: '', sender: '', sender_email: '', user_role: '', message_to: '',
    tutor_name: '', tutor_id: '', student_name: '', student_id: '',
    recipient_name_student: '', recipient_id_student: '', recipient_email: '',
    recipient_name_tutor: '', recipient_id_tutor: '',
    recipient_name_parent: '', recipient_id_parent: '',
    recipient_admin: '', cc: '', subject: '', body: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, sRes, tRes] = await Promise.all([
        fetch('/api/messages/student'), fetch('/api/students'), fetch('/api/tutors'),
      ]);
      const [mData, sData, tData] = await Promise.all([mRes.json(), sRes.json(), tRes.json()]);
      setMessages(mData.messages || []);
      setStudents(sData.students || []);
      setTutors(tData.tutors || []);
    } catch { toast.error('Failed to load messages'); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/messages/student', {
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
      const res = await fetch('/api/messages/student', { method: 'DELETE' });
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
    { key: 'sender', label: 'Sender', sortable: true, render: (_: unknown, row: StudentMessage) => (
      <span className="font-medium">{row.sender || row.tutor_name || row.student_name || '—'}</span>
    )},
    { key: 'message_to', label: 'Message To', render: (v: unknown) => (
      <span className="text-xs text-gray-600">{v as string || '—'}</span>
    )},
    { key: 'recipient_name_student', label: 'Recipient', render: (_: unknown, row: StudentMessage) => (
      <span className="font-medium">{resolveRecipient(row)}</span>
    )},
    { key: 'recipient_id_student', label: 'Recipient ID', render: (v: unknown) => (
      <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{v as string || '—'}</span>
    )},
    { key: 'subject', label: 'Subject', render: (v: unknown) => (
      <span className="font-medium text-gray-900 truncate max-w-[180px] block" title={v as string}>{v as string || '—'}</span>
    )},
    { key: 'status', label: 'Status', render: (v: unknown) => statusBadge(v as string) },
  ];

  return (
    <DashboardLayout title="Messages — Student">
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Messages to Students</h2>
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
          <span>Messages addressed to students</span>
        </div>

        <DataTable data={messages} columns={columns} loading={loading}
          searchKeys={['sender', 'tutor_name', 'student_name', 'recipient_name_student', 'recipient_id_student', 'subject', 'message_to']}
          emptyMessage="No messages yet"
          actions={(row) => (
            <button onClick={() => router.push(`/admin/messages-student/${row.record_id}`)}
              className={`p-1.5 rounded-lg transition-colors ${row.status === 'unread' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'hover:bg-blue-50 text-blue-600'}`}
              title="View message">
              <Eye size={15} />
            </button>
          )}
        />
      </div>

      {/* Delete All modal */}
      <Modal isOpen={deleteAllOpen} onClose={() => setDeleteAllOpen(false)} title="Delete All Student Messages" size="sm">
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
      <Modal isOpen={composeOpen} onClose={() => setComposeOpen(false)} title="Send Message to Student" size="2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Sender Name" required>
              <Input value={form.sender} onChange={e => setForm({...form, sender: e.target.value})} required />
            </FormField>
            <FormField label="Sender Email">
              <Input type="email" value={form.sender_email} onChange={e => setForm({...form, sender_email: e.target.value})} />
            </FormField>
            <FormField label="Sender Role" required>
              <Select value={form.role} onChange={e => setForm({...form, role: e.target.value})} required>
                <option value="">Select Role</option>
                <option value="admin">Admin</option><option value="tutor">Tutor</option>
                <option value="parent">Parent</option>
              </Select>
            </FormField>
            <FormField label="Message To">
              <Input value={form.message_to} onChange={e => setForm({...form, message_to: e.target.value})} placeholder="e.g. Student" />
            </FormField>
            <FormField label="Tutor (if applicable)">
              <Select value={form.tutor_id} onChange={e => {
                const t = tutors.find(t => t.tutor_id === e.target.value);
                setForm({...form, tutor_id: e.target.value, tutor_name: t ? `${t.firstname} ${t.surname}` : ''});
              }}>
                <option value="">Select Tutor</option>
                {tutors.map(t => <option key={t.tutor_id} value={t.tutor_id}>{t.firstname} {t.surname}</option>)}
              </Select>
            </FormField>
            <FormField label="Recipient Student" required>
              <Select value={form.recipient_id_student} onChange={e => {
                const s = students.find(s => s.student_id === e.target.value);
                setForm({...form, recipient_id_student: e.target.value, recipient_name_student: s ? `${s.firstname} ${s.surname}` : '', student_id: e.target.value, student_name: s ? `${s.firstname} ${s.surname}` : ''});
              }} required>
                <option value="">Select Student</option>
                {students.map(s => <option key={s.student_id} value={s.student_id}>{s.firstname} {s.surname}</option>)}
              </Select>
            </FormField>
            <FormField label="Recipient Email">
              <Input type="email" value={form.recipient_email} onChange={e => setForm({...form, recipient_email: e.target.value})} />
            </FormField>
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
