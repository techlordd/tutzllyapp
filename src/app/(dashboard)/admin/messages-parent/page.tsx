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

interface ParentMessage {
  record_id: number;
  message_date: string; message_time: string; role: string;
  sender: string; sender_email: string; user_role: string;
  sender_admin: string; sender_tutor_name: string; sender_tutor_id: string;
  reply_to_tutor: string; reply_to_tutor_id: string; reply_to_admin: string;
  recipient_id: string; recipient_name: string;
  recipient_id_deprecated: string; recipient_deprecated: string;
  recipient_email: string; cc: string;
  subject: string; body: string; attach_file: string;
  status: string; user_id: string;
  entry_status: string; timestamp: string; last_updated: string;
  created_by: string; updated_by: string; ip: string; record_key: string;
}

function resolveSender(row: ParentMessage): string {
  return row.sender_admin || row.sender_tutor_name || row.sender || '—';
}

export default function MessagesParentPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ParentMessage[]>([]);
  const [parents, setParents] = useState<{parent_id: string; firstname: string; surname: string}[]>([]);
  const [tutors, setTutors] = useState<{tutor_id: string; firstname: string; surname: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    role: '', sender: '', sender_email: '', user_role: '',
    sender_admin: '', sender_tutor_name: '', sender_tutor_id: '',
    reply_to_tutor: '', reply_to_tutor_id: '', reply_to_admin: '',
    recipient_id: '', recipient_name: '', recipient_email: '', cc: '',
    subject: '', body: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, pRes, tRes] = await Promise.all([
        fetch('/api/messages/parent'), fetch('/api/parents'), fetch('/api/tutors'),
      ]);
      const [mData, pData, tData] = await Promise.all([mRes.json(), pRes.json(), tRes.json()]);
      setMessages(mData.messages || []);
      setParents(pData.parents || []);
      setTutors(tData.tutors || []);
    } catch { toast.error('Failed to load messages'); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/messages/parent', {
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
      const res = await fetch('/api/messages/parent', { method: 'DELETE' });
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
    { key: 'sender_admin', label: 'Sender', sortable: true, render: (_: unknown, row: ParentMessage) => (
      <span className="font-medium">{resolveSender(row)}</span>
    )},
    { key: 'recipient_name', label: 'Recipient (Parent)', render: (v: unknown) => (
      <span className="font-medium">{v as string || '—'}</span>
    )},
    { key: 'recipient_id', label: 'Recipient ID', render: (v: unknown) => (
      <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{v as string || '—'}</span>
    )},
    { key: 'subject', label: 'Subject', render: (v: unknown) => (
      <span className="font-medium text-gray-900 truncate max-w-[180px] block" title={v as string}>{v as string || '—'}</span>
    )},
    { key: 'status', label: 'Status', render: (v: unknown) => statusBadge(v as string) },
  ];

  return (
    <DashboardLayout title="Messages — Parent">
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Messages to Parents</h2>
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
          <span>Messages addressed to parents</span>
        </div>

        <DataTable data={messages} columns={columns} loading={loading}
          searchKeys={['sender_admin', 'sender_tutor_name', 'sender', 'recipient_name', 'recipient_id', 'subject']}
          emptyMessage="No messages yet"
          actions={(row) => (
            <button onClick={() => router.push(`/admin/messages-parent/${row.record_id}`)}
              className={`p-1.5 rounded-lg transition-colors ${row.status === 'unread' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'hover:bg-blue-50 text-blue-600'}`}
              title="View message">
              <Eye size={15} />
            </button>
          )}
        />
      </div>

      {/* Delete All modal */}
      <Modal isOpen={deleteAllOpen} onClose={() => setDeleteAllOpen(false)} title="Delete All Parent Messages" size="sm">
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
      <Modal isOpen={composeOpen} onClose={() => setComposeOpen(false)} title="Send Message to Parent" size="2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Sender Role" required>
              <Select value={form.role} onChange={e => setForm({...form, role: e.target.value})} required>
                <option value="">Select Role</option>
                <option value="admin">Admin</option><option value="tutor">Tutor</option>
              </Select>
            </FormField>
            <FormField label="Sender Email">
              <Input type="email" value={form.sender_email} onChange={e => setForm({...form, sender_email: e.target.value})} />
            </FormField>
            {form.role === 'admin' && (
              <FormField label="Sender (Admin)" className="sm:col-span-2">
                <Input value={form.sender_admin} onChange={e => setForm({...form, sender_admin: e.target.value})} />
              </FormField>
            )}
            {form.role === 'tutor' && (
              <>
                <FormField label="Sender Tutor">
                  <Select value={form.sender_tutor_id} onChange={e => {
                    const t = tutors.find(t => t.tutor_id === e.target.value);
                    setForm({...form, sender_tutor_id: e.target.value, sender_tutor_name: t ? `${t.firstname} ${t.surname}` : ''});
                  }}>
                    <option value="">Select Tutor</option>
                    {tutors.map(t => <option key={t.tutor_id} value={t.tutor_id}>{t.firstname} {t.surname}</option>)}
                  </Select>
                </FormField>
              </>
            )}
            <FormField label="Recipient Parent" required>
              <Select value={form.recipient_id} onChange={e => {
                const p = parents.find(p => p.parent_id === e.target.value);
                setForm({...form, recipient_id: e.target.value, recipient_name: p ? `${p.firstname} ${p.surname}` : ''});
              }} required>
                <option value="">Select Parent</option>
                {parents.map(p => <option key={p.parent_id} value={p.parent_id}>{p.firstname} {p.surname}</option>)}
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
