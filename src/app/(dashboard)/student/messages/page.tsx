'use client';
import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { statusBadge } from '@/components/ui/Badge';
import FormField, { Input, Select, Textarea } from '@/components/ui/FormField';
import { Send, Eye, MessageSquare } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

type MsgType = 'admin' | 'parent' | 'student' | 'tutor';

interface Message {
  id: number; message_date: string; message_time: string; sender: string; subject: string; body: string; status: string;
}

export default function MessagesSharedPage() {
  const [activeTab, setActiveTab] = useState<MsgType>('admin');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState<Message | null>(null);
  const [submitting, setSubmitting] = useState(false);
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
    } catch { ''; }
    setLoading(false);
  }, [activeTab]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

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
    { key: 'sender', label: 'Sender', sortable: true },
    { key: 'subject', label: 'Subject', render: (v: unknown) => (
      <span className="font-medium text-gray-900 truncate max-w-[200px] block">{v as string}</span>
    )},
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
          <Button icon={Send} onClick={() => setComposeOpen(true)}>Compose</Button>
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
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="font-semibold">{selected.subject}</p>
              <p className="text-sm text-gray-500">From: {selected.sender} — {formatDate(selected.message_date)}</p>
              <div className="mt-1">{statusBadge(selected.status)}</div>
            </div>
            <p className="text-gray-700 whitespace-pre-wrap text-sm">{selected.body}</p>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}
