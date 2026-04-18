'use client';
import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { statusBadge } from '@/components/ui/Badge';
import FormField, { Input, Select, Textarea } from '@/components/ui/FormField';
import { Send, Eye, Inbox } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

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

type MsgType = 'admin' | 'parent' | 'student' | 'tutor';


function resolveSender(row: Message): string {
  return row.sender_admin || row.sender_tutor_name || row.sender_student_name ||
    row.sender_parent_name || row.sender || row.tutor_name || row.student_name ||
    row.parent_name || '—';
}

function resolveRecipient(row: Message): string {
  return row.recipient_tutor_name || row.recipient_name || row.recipient_name_student ||
    row.recipient_name_tutor || row.recipient_name_parent || row.recipient_admin || '—';
}
export default function MessagesPage() {
  const [activeType, setActiveType] = useState<MsgType>('admin');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState<Message | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ role: '', sender: '', user_role: '', subject: '', body: '', user_id: '' });

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/messages/${activeType}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch { toast.error('Failed to load messages'); }
    setLoading(false);
  }, [activeType]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/messages/${activeType}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error();
      toast.success('Message sent!');
      setComposeOpen(false);
      fetchMessages();
    } catch { toast.error('Failed to send message'); }
    setSubmitting(false);
  };

  const msgTypeLabels: Record<MsgType, string> = {
    admin: 'Messages to Admin', parent: 'Messages to Parent',
    student: 'Messages to Student', tutor: 'Messages to Tutor',
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
        {/* Tab switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex gap-2 flex-wrap">
            {(['admin', 'parent', 'student', 'tutor'] as MsgType[]).map(type => (
              <button key={type} onClick={() => setActiveType(type)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors capitalize ${
                  activeType === type ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}>
                {type}
              </button>
            ))}
          </div>
          <Button icon={Send} onClick={() => setComposeOpen(true)}>Compose</Button>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Inbox size={16} />
          <span>{msgTypeLabels[activeType]} ({messages.length})</span>
        </div>

        <DataTable data={messages} columns={columns} loading={loading}
          searchKeys={['sender', 'subject', 'role']}
          emptyMessage="No messages yet"
          actions={(row) => (
            <button onClick={() => { setSelected(row); setViewOpen(true); }}
              className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"><Eye size={15} /></button>
          )}
        />
      </div>

      {/* Compose Modal */}
      <Modal isOpen={composeOpen} onClose={() => setComposeOpen(false)} title="Compose Message" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Sender Name" required>
            <Input value={form.sender} onChange={e => setForm({...form, sender: e.target.value})} required />
          </FormField>
          <FormField label="Role" required>
            <Select value={form.role} onChange={e => setForm({...form, role: e.target.value})} required>
              <option value="">Select Role</option>
              <option value="admin">Admin</option><option value="tutor">Tutor</option>
              <option value="student">Student</option><option value="parent">Parent</option>
            </Select>
          </FormField>
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

      {/* View Message Modal */}
      {selected && (
        <Modal isOpen={viewOpen} onClose={() => setViewOpen(false)} title="Message Details" size="lg">
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
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">{selected.body}</p>
            </div>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}
