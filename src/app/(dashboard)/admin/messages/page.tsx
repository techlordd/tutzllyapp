'use client';
import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { statusBadge } from '@/components/ui/Badge';
import FormField, { Input, Select, Textarea } from '@/components/ui/FormField';
import InboxView from '@/components/messages/InboxView';
import SentView from '@/components/messages/SentView';
import TrashView from '@/components/messages/TrashView';
import { Send, Eye, Inbox, SendHorizonal, LayoutList, Trash2, CornerUpLeft } from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

interface Message {
  id: number;
  record_id?: number;
  message_date: string; message_time: string; role: string; user_role?: string;
  subject: string; body: string; status: string;
  sender?: string; sender_admin?: string; sender_tutor_name?: string;
  sender_student_name?: string; sender_parent_name?: string;
  sender_email?: string;
  tutor_name?: string; tutor_id?: string;
  student_name?: string; student_id?: string;
  parent_name?: string; parent_id?: string;
  sender_tutor_id?: string; sender_parent_id?: string; sender_student_id?: string;
  recipient_admin?: string; recipient_name?: string;
  recipient_tutor_name?: string; recipient_tutor_id?: string; recipient_email?: string;
  recipient_name_student?: string; recipient_name_tutor?: string; recipient_name_parent?: string;
  cc?: string; attach_file?: string; file_upload?: string;
}

type MsgType = 'admin' | 'parent' | 'student' | 'tutor';
type ViewMode = 'all' | 'inbox' | 'sent' | 'trash';

interface ReplyTarget {
  tab: MsgType;
  subject: string;
  recipientName: string;
  extraFields: Record<string, string>;
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

function buildReplyTarget(msg: Message, currentTab: MsgType): ReplyTarget {
  const senderRole = ((msg.role || msg.user_role || '') as string).toLowerCase() as MsgType;
  const senderName = resolveSender(msg);
  const senderEmail = msg.sender_email || '';
  const targetTab: MsgType = (['admin', 'tutor', 'student', 'parent'] as MsgType[]).includes(senderRole)
    ? senderRole : currentTab;

  let extraFields: Record<string, string> = {};
  if (targetTab === 'tutor') {
    extraFields = { recipient_tutor_name: senderName, recipient_tutor_id: msg.tutor_id || msg.sender_tutor_id || '', recipient_email: senderEmail };
  } else if (targetTab === 'student') {
    extraFields = { student_name: senderName, student_id: msg.student_id || msg.sender_student_id || '', recipient_email: senderEmail };
  } else if (targetTab === 'parent') {
    extraFields = { recipient_name: senderName, recipient_id: msg.parent_id || msg.sender_parent_id || '', recipient_email: senderEmail };
  } else {
    extraFields = { recipient_admin: senderName || 'Admin', recipient_email: senderEmail };
  }

  return { tab: targetTab, subject: `Re: ${msg.subject}`, recipientName: senderName, extraFields };
}

export default function AdminMessagesPage() {
  const user = useAuthStore(state => state.user);
  const [viewMode, setViewMode]   = useState<ViewMode>('all');
  const [activeType, setActiveType] = useState<MsgType>('admin');
  const [messages, setMessages]   = useState<Message[]>([]);
  const [loading, setLoading]     = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const [viewOpen, setViewOpen]   = useState(false);
  const [selected, setSelected]   = useState<Message | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting]   = useState(false);
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [form, setForm] = useState({
    role: 'admin', sender: '', user_role: 'admin', subject: '', body: '',
    user_id: '', recipient_email: '', send_email: false,
  });

  useEffect(() => {
    if (user) {
      setForm(f => ({ ...f, sender: user.username, user_id: String(user.id) }));
    }
  }, [user]);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/messages/${activeType}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch { toast.error('Failed to load messages'); }
    setLoading(false);
  }, [activeType]);

  useEffect(() => {
    if (viewMode === 'all') fetchMessages();
  }, [viewMode, fetchMessages]);

  const openCompose = () => {
    setReplyTarget(null);
    setForm(f => ({ ...f, subject: '', body: '', recipient_email: '', send_email: false }));
    setComposeOpen(true);
  };

  const openReply = (msg: Message) => {
    const target = buildReplyTarget(msg, activeType);
    setReplyTarget(target);
    setActiveType(target.tab);
    setForm(f => ({ ...f, subject: target.subject, body: '', recipient_email: target.extraFields.recipient_email || '', send_email: false }));
    setViewOpen(false);
    setComposeOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const targetTab = replyTarget ? replyTarget.tab : activeType;
      const payload = { ...form, ...(replyTarget?.extraFields || {}) };
      const res = await fetch(`/api/messages/${targetTab}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      toast.success('Message sent!');
      setComposeOpen(false);
      setReplyTarget(null);
      fetchMessages();
    } catch { toast.error('Failed to send message'); }
    setSubmitting(false);
  };

  const handleDeleteAll = async () => {
    if (deleteConfirm !== 'DELETE') return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/messages/${activeType}`, { method: 'DELETE' });
      const data = await res.json();
      toast.success(`Deleted ${data.deleted} messages`);
      setDeleteOpen(false);
      setDeleteConfirm('');
      fetchMessages();
    } catch { toast.error('Failed to delete messages'); }
    setDeleting(false);
  };

  const msgTypeLabels: Record<MsgType, string> = {
    admin: 'Messages to Admin', parent: 'Messages to Parent',
    student: 'Messages to Student', tutor: 'Messages to Tutor',
  };

  const columns = [
    { key: 'message_date', label: 'Date', sortable: true, render: (v: unknown) => formatDate(v as string) },
    { key: 'message_time', label: 'Time', render: (v: unknown) => formatTime(v as string) },
    { key: 'sender', label: 'Sender', sortable: true, render: (_v: unknown, row: Message) => resolveSender(row) },
    { key: 'subject', label: 'Subject', render: (v: unknown) => (
      <span className="font-medium text-gray-900 truncate max-w-[200px] block">{v as string}</span>
    )},
    { key: 'recipient_admin', label: 'Recipient', render: (_v: unknown, row: Message) => resolveRecipient(row) },
    { key: 'status', label: 'Status', render: (v: unknown) => statusBadge(v as string) },
  ];

  const viewTabs: { key: ViewMode; label: string; icon: React.ElementType }[] = [
    { key: 'all',   label: 'All Messages', icon: LayoutList },
    { key: 'inbox', label: 'Inbox',         icon: Inbox },
    { key: 'sent',  label: 'Sent',          icon: SendHorizonal },
    { key: 'trash', label: 'Trash',         icon: Trash2 },
  ];

  return (
    <DashboardLayout title="Messages">
      <div className="space-y-5">

        {/* View mode switcher */}
        <div className="flex gap-2 border-b border-gray-200 pb-3">
          {viewTabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setViewMode(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                viewMode === key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {/* Inbox view */}
        {viewMode === 'inbox' && user && (
          <InboxView fetchUrl="/api/messages/admin" currentUser={user} messageType="admin" />
        )}

        {/* Sent view */}
        {viewMode === 'sent' && user && (
          <SentView userId={String(user.id)} userRole="admin" />
        )}

        {/* Trash view */}
        {viewMode === 'trash' && user && (
          <TrashView userId={String(user.id)} userRole="admin" />
        )}

        {/* All messages view (original) */}
        {viewMode === 'all' && (
          <>
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
              <div className="flex gap-2">
                <Button variant="danger" icon={Trash2} onClick={() => { setDeleteOpen(true); setDeleteConfirm(''); }}>Delete All</Button>
                <Button icon={Send} onClick={openCompose}>Compose</Button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Inbox size={16} />
              <span>{msgTypeLabels[activeType]} ({messages.length})</span>
            </div>

            <DataTable data={messages} columns={columns} loading={loading}
              searchKeys={['sender', 'subject', 'role']}
              emptyMessage="No messages yet"
              actions={(row) => (
                <button onClick={() => {
                  setSelected(row);
                  setViewOpen(true);
                  if (row.status === 'unread' && (row.record_id || row.id)) {
                    const msgId = row.record_id || row.id;
                    fetch(`/api/messages/${activeType}/${msgId}`)
                      .then(res => res.ok ? res.json() : null)
                      .then(data => {
                        if (!data) return;
                        const updatedStatus = data.message?.status || 'read';
                        setMessages(prev => prev.map(m => (m.record_id || m.id) === msgId ? { ...m, status: updatedStatus } : m));
                        setSelected(prev => prev && (prev.record_id || prev.id) === msgId ? { ...prev, status: updatedStatus } : prev);
                      })
                      .catch(() => {});
                  }
                }}
                  className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"><Eye size={15} /></button>
              )}
            />
          </>
        )}
      </div>

      {/* Compose Modal */}
      <Modal isOpen={composeOpen} onClose={() => { setComposeOpen(false); setReplyTarget(null); }} title={replyTarget ? 'Reply to Message' : 'Compose Message'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {replyTarget && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
              <CornerUpLeft size={14} />
              <span>Replying to <strong>{replyTarget.recipientName}</strong></span>
            </div>
          )}
          {!replyTarget && (
            <>
              <FormField label="Sender Name" required>
                <Input value={form.sender} onChange={e => setForm({...form, sender: e.target.value})} required />
              </FormField>
              <FormField label="Role" required>
                <Select value={form.role} onChange={e => setForm({...form, role: e.target.value})} required>
                  <option value="admin">Admin</option><option value="tutor">Tutor</option>
                  <option value="student">Student</option><option value="parent">Parent</option>
                </Select>
              </FormField>
            </>
          )}
          <FormField label="Subject" required>
            <Input value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} required />
          </FormField>
          <FormField label="Message Body" required>
            <Textarea rows={5} value={form.body} onChange={e => setForm({...form, body: e.target.value})} required />
          </FormField>
          <FormField label="Recipient Email (for external email)">
            <Input type="email" value={form.recipient_email} onChange={e => setForm({...form, recipient_email: e.target.value})} placeholder="recipient@email.com" />
          </FormField>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={form.send_email} onChange={e => setForm({...form, send_email: e.target.checked})}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            Also send to recipient&apos;s real email address
          </label>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setComposeOpen(false); setReplyTarget(null); }}>Cancel</Button>
            <Button type="submit" loading={submitting} icon={Send}>{replyTarget ? 'Send Reply' : 'Send Message'}</Button>
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
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="secondary" onClick={() => setViewOpen(false)}>Close</Button>
              <Button icon={CornerUpLeft} onClick={() => openReply(selected)}>Reply</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete All Confirmation Modal */}
      <Modal isOpen={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete All Messages" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">This will permanently delete all <strong>{msgTypeLabels[activeType]}</strong>. This action cannot be undone.</p>
          <p className="text-sm text-gray-700">Type <strong>DELETE</strong> to confirm:</p>
          <input
            type="text" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
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
