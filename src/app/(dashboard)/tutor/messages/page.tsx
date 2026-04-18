'use client';
import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { statusBadge } from '@/components/ui/Badge';
import FormField, { Input, Select, Textarea } from '@/components/ui/FormField';
import { Send, Eye, MessageSquare, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

type MsgType = 'admin' | 'parent' | 'student' | 'tutor';

interface Message {
  id: number;
  message_date: string; message_time: string; role: string;
  subject: string; body: string; status: string;
  // sender variants
  sender?: string; sender_admin?: string; sender_tutor_name?: string;
  sender_student_name?: string; sender_parent_name?: string;
  tutor_name?: string; student_name?: string; parent_name?: string;
  // recipient variants
  recipient_admin?: string; recipient_name?: string;
  recipient_tutor_name?: string; recipient_name_student?: string;
  recipient_name_tutor?: string; recipient_name_parent?: string;
  // extras
  cc?: string; attach_file?: string; file_upload?: string;
}


function resolveSender(row: Message): string {
  return row.sender_admin || row.sender_tutor_name || row.sender_student_name ||
    row.sender_parent_name || row.sender || row.tutor_name || row.student_name ||
    row.parent_name || '—';
}

function resolveRecipient(row: Message): string {
  return row.recipient_tutor_name || row.recipient_name || row.recipient_name_student ||
    row.recipient_name_tutor || row.recipient_name_parent || row.recipient_admin || '—';
}
export default function MessagesSharedPage() {
  const [activeTab, setActiveTab] = useState<MsgType>('admin');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState<Message | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ role: '', sender: '', user_role: '', subject: '', body: '', user_id: '' });
  const [userRole, setUserRole] = useState('');
  const user = useAuthStore(state => state.user);

  useEffect(() => {
    if (user) { setUserRole(user.role); setForm(f => ({...f, role: user.role, sender: user.username, user_role: user.role, user_id: String(user.id)})); }
  }, [user]);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/messages/${activeTab}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch { toast.error('Failed to load data'); }
    setLoading(false);
  }, [activeTab]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const handleDeleteAll = async () => {
    if (deleteConfirm !== 'DELETE') return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/messages/${activeTab}`, { method: 'DELETE' });
      const data = await res.json();
      toast.success(`Deleted ${data.deleted} messages`);
      setDeleteOpen(false);
      setDeleteConfirm('');
      fetchMessages();
    } catch { toast.error('Failed to delete messages'); }
    setDeleting(false);
  };

  const getAvailableTabs = (): MsgType[] => {
    if (userRole === 'tutor') return ['admin', 'student', 'parent'];
    if (userRole === 'student') return ['admin', 'tutor', 'parent'];
    if (userRole === 'parent') return ['admin', 'tutor', 'student'];
    return ['admin', 'parent', 'student', 'tutor'];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/messages/${activeTab}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      toast.success('Message sent!');
      setComposeOpen(false);
      fetchMessages();
    } catch { toast.error('Failed to send message'); }
    setSubmitting(false);
  };

  const columns = [
    { key: 'message_date', label: 'Date', sortable: true, render: (v: unknown) => formatDate(v as string) },
    { key: 'message_time', label: 'Time' },
    { key: 'sender', label: 'Sender', sortable: true, render: (_v: unknown, row: Message) => resolveSender(row) },
    { key: 'subject', label: 'Subject', render: (v: unknown) => (
      <span className="font-medium text-gray-900 truncate max-w-[200px] block">{v as string}</span>
    )},
    { key: 'recipient_admin', label: 'Recipient', render: (_v: unknown, row: Message) => resolveRecipient(row) },
    { key: 'status', label: 'Status', render: (v: unknown) => statusBadge(v as string) },
  ];

  return (
    <DashboardLayout title="Messages">
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex gap-2 flex-wrap">
            {getAvailableTabs().map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${activeTab === tab ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                To {tab}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="danger" icon={Trash2} onClick={() => { setDeleteOpen(true); setDeleteConfirm(''); }}>Delete All</Button>
            <Button icon={Send} onClick={() => setComposeOpen(true)}>Compose</Button>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <MessageSquare size={16} />
          <span>{messages.length} messages</span>
        </div>
        <DataTable data={messages} columns={columns} loading={loading}
          searchKeys={['sender', 'subject']}
          emptyMessage="No messages"
          actions={(row) => (
            <button onClick={() => { setSelected(row); setViewOpen(true); }}
              className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"><Eye size={15} /></button>
          )}
        />
      </div>
      <Modal isOpen={composeOpen} onClose={() => setComposeOpen(false)} title="Compose Message" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Subject" required><Input value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} required /></FormField>
          <FormField label="Message" required><Textarea rows={5} value={form.body} onChange={e => setForm({...form, body: e.target.value})} required /></FormField>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setComposeOpen(false)}>Cancel</Button>
            <Button type="submit" loading={submitting} icon={Send}>Send</Button>
          </div>
        </form>
      </Modal>
      {selected && (
        <Modal isOpen={viewOpen} onClose={() => setViewOpen(false)} title="Message" size="lg">
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex items-start justify-between gap-4">
                <p className="font-semibold text-gray-900 text-base">{selected.subject}</p>
                {statusBadge(selected.status)}
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <div><span className="text-gray-400">From:</span> <span className="text-gray-800 font-medium">{resolveSender(selected)}</span></div>
                <div><span className="text-gray-400">To:</span> <span className="text-gray-800 font-medium">{resolveRecipient(selected)}</span></div>
                <div><span className="text-gray-400">Date:</span> <span className="text-gray-700">{formatDate(selected.message_date)}</span></div>
                <div><span className="text-gray-400">Time:</span> <span className="text-gray-700">{selected.message_time || '—'}</span></div>
                {selected.cc && <div className="col-span-2"><span className="text-gray-400">Cc:</span> <span className="text-gray-700">{selected.cc}</span></div>}
              </div>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-4"><div className="mt-1">{statusBadge(selected.status)}</div>
            </div>
            <p className="text-gray-700 whitespace-pre-wrap text-sm">{selected.body}</p>
          </div>
        </Modal>
      )}
      {/* Delete All Confirmation Modal */}
      <Modal isOpen={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete All Messages" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">This will permanently delete all messages in the current tab. This action cannot be undone.</p>
          <p className="text-sm text-gray-700">Type <strong>DELETE</strong> to confirm:</p>
          <input
            type="text"
            value={deleteConfirm}
            onChange={e => setDeleteConfirm(e.target.value)}
            placeholder="Type DELETE"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="danger" loading={deleting} onClick={handleDeleteAll} disabled={deleteConfirm !== 'DELETE'}>Delete All</Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
