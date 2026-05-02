'use client';
import { useEffect, useState, useCallback } from 'react';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { statusBadge } from '@/components/ui/Badge';
import FormField, { Input, Select, Textarea } from '@/components/ui/FormField';
import { Eye, Send, CornerUpLeft, PenSquare, Mail, Calendar, Clock, User, Paperclip } from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils';
import toast from 'react-hot-toast';

type MsgType = 'admin' | 'parent' | 'student' | 'tutor';

const ROLE_OPTIONS: Record<string, MsgType[]> = {
  tutor:   ['admin', 'student', 'parent'],
  student: ['admin', 'tutor',   'parent'],
  parent:  ['admin', 'tutor',   'student'],
  admin:   ['tutor', 'student', 'parent'],
};

interface Message {
  record_id?: number;
  message_date: string;
  message_time: string;
  role?: string;
  user_role?: string;
  subject: string;
  body: string;
  status: string;
  sender?: string;
  sender_admin?: string;
  sender_tutor_name?: string;
  sender_student_name?: string;
  sender_parent_name?: string;
  sender_email?: string;
  tutor_name?: string;
  tutor_id?: string;
  student_name?: string;
  student_id?: string;
  parent_name?: string;
  parent_id?: string;
  sender_tutor_id?: string;
  sender_parent_id?: string;
  sender_student_id?: string;
  user_id?: string;
  recipient_admin?: string;
  recipient_name?: string;
  recipient_tutor_name?: string;
  recipient_tutor_id?: string;
  recipient_email?: string;
  recipient_name_student?: string;
  recipient_name_tutor?: string;
  recipient_name_parent?: string;
}

interface ReplyTarget {
  tab: MsgType;
  subject: string;
  recipientName: string;
  extraFields: Record<string, string>;
}

interface CurrentUser {
  id: number;
  user_id: string;
  role: string;
  username: string;
}

function resolveSender(row: Message): string {
  return row.sender_admin || row.sender_tutor_name || row.sender_student_name ||
    row.sender_parent_name || row.sender || row.tutor_name || row.student_name ||
    row.parent_name || '—';
}

function buildReplyTarget(msg: Message): ReplyTarget {
  const senderRole = ((msg.role || msg.user_role || '') as string).toLowerCase() as MsgType;
  const senderName = resolveSender(msg);
  const senderEmail = msg.sender_email || '';
  const targetTab: MsgType = (['admin', 'tutor', 'student', 'parent'] as MsgType[]).includes(senderRole)
    ? senderRole : 'admin';

  let extraFields: Record<string, string> = {};
  if (targetTab === 'tutor') {
    extraFields = { recipient_tutor_name: senderName, recipient_tutor_id: msg.tutor_id || msg.sender_tutor_id || '', recipient_sender_user_id: msg.user_id || '', recipient_email: senderEmail };
  } else if (targetTab === 'student') {
    extraFields = { recipient_name_student: senderName, recipient_id_student: msg.sender_student_id || msg.student_id || '', recipient_sender_user_id: msg.user_id || '', recipient_email: senderEmail };
  } else if (targetTab === 'parent') {
    extraFields = { recipient_name: senderName, recipient_id: msg.sender_parent_id || msg.parent_id || '', recipient_email: senderEmail };
  } else {
    extraFields = { recipient_admin: senderName || 'Admin', recipient_email: senderEmail };
  }

  return { tab: targetTab, subject: `Re: ${msg.subject}`, recipientName: senderName, extraFields };
}

interface InboxViewProps {
  fetchUrl: string;
  currentUser: CurrentUser;
  messageType: MsgType;
}

export default function InboxView({ fetchUrl, currentUser, messageType }: InboxViewProps) {
  const [messages, setMessages]     = useState<Message[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [loading, setLoading]       = useState(true);
  const [viewOpen, setViewOpen]     = useState(false);
  const [selected, setSelected]     = useState<Message | null>(null);
  const [replyOpen, setReplyOpen]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [replyForm, setReplyForm] = useState({
    subject: '', body: '', send_email: false,
  });

  const composeOptions = ROLE_OPTIONS[currentUser.role] || ['admin'];
  const [composeOpen, setComposeOpen]             = useState(false);
  const [composeSubmitting, setComposeSubmitting] = useState(false);
  const [composeTo, setComposeTo]                 = useState<MsgType>(composeOptions[0]);
  const [composeForm, setComposeForm]             = useState({
    subject: '', body: '', recipient_email: '', send_email: false,
  });

  const handleComposeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setComposeSubmitting(true);
    try {
      const payload = {
        role: currentUser.role,
        sender: currentUser.username,
        user_role: currentUser.role,
        user_id: String(currentUser.id),
        ...composeForm,
      };
      const res = await fetch(`/api/messages/${composeTo}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      toast.success('Message sent!');
      setComposeOpen(false);
      setComposeForm({ subject: '', body: '', recipient_email: '', send_email: false });
    } catch { toast.error('Failed to send message'); }
    setComposeSubmitting(false);
  };

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(fetchUrl);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch { toast.error('Failed to load messages'); }
    setLoading(false);
  }, [fetchUrl]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const isRead = (status: string | undefined | null) => status?.toLowerCase() === 'read';

  const unreadCount = messages.filter(m => !isRead(m.status)).length;
  const readCount   = messages.filter(m =>  isRead(m.status)).length;

  const filteredMessages = statusFilter === 'all'
    ? messages
    : statusFilter === 'unread'
      ? messages.filter(m => !isRead(m.status))
      : messages.filter(m =>  isRead(m.status));

  const openReply = (msg: Message) => {
    const target = buildReplyTarget(msg);
    setReplyTarget(target);
    setReplyForm({ subject: target.subject, body: '', send_email: false });
    setViewOpen(false);
    setReplyOpen(true);
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyTarget) return;
    setSubmitting(true);
    try {
      const payload = {
        role: currentUser.role,
        sender: currentUser.username,
        user_role: currentUser.role,
        user_id: String(currentUser.id),
        ...replyForm,
        ...replyTarget.extraFields,
      };
      const res = await fetch(`/api/messages/${replyTarget.tab}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      toast.success('Reply sent!');
      setReplyOpen(false);
      setReplyTarget(null);
    } catch { toast.error('Failed to send reply'); }
    setSubmitting(false);
  };

  const columns = [
    { key: 'message_date', label: 'Date', sortable: true, render: (v: unknown) => formatDate(v as string) },
    { key: 'message_time', label: 'Time', render: (v: unknown) => formatTime(v as string) },
    { key: 'sender', label: 'From', sortable: true, render: (_v: unknown, row: Message) => (
      <span className={!isRead(row.status) ? 'font-semibold text-gray-900' : 'font-medium text-gray-600'}>
        {resolveSender(row)}
      </span>
    )},
    { key: 'subject', label: 'Subject', render: (v: unknown, row: Message) => (
      <span className={`truncate max-w-[200px] block ${!isRead(row.status) ? 'font-semibold text-gray-900' : 'font-medium text-gray-500'}`}>
        {v as string}
      </span>
    )},
    { key: 'status', label: 'Status', render: (v: unknown) => statusBadge(v as string) },
  ];

  const filterBtns: { key: 'all' | 'unread' | 'read'; label: string; count: number }[] = [
    { key: 'all',    label: 'All',    count: messages.length },
    { key: 'unread', label: 'Unread', count: unreadCount },
    { key: 'read',   label: 'Read',   count: readCount },
  ];

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {filterBtns.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              statusFilter === key ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'
            }`}>{count}</span>
          </button>
        ))}
        </div>
        <Button icon={PenSquare} onClick={() => setComposeOpen(true)}>Compose</Button>
      </div>

      <DataTable
        data={filteredMessages}
        columns={columns}
        loading={loading}
        searchKeys={['subject']}
        emptyMessage={statusFilter === 'all' ? 'Your inbox is empty' : `No ${statusFilter} messages`}
        rowClassName={(row: Message) => !isRead(row.status)
          ? 'bg-white hover:bg-blue-50 border-l-4 border-l-blue-500'
          : 'bg-gray-50 hover:bg-gray-100 border-l-4 border-l-transparent opacity-80'
        }
        actions={(row) => (
          <button
            onClick={() => {
              setSelected(row);
              setViewOpen(true);
              if (!isRead(row.status) && row.record_id) {
                fetch(`/api/messages/${messageType}/${row.record_id}`)
                  .then(res => res.ok ? res.json() : null)
                  .then(data => {
                    if (!data) return;
                    const updatedStatus = data.message?.status || 'read';
                    setMessages(prev => prev.map(m =>
                      m.record_id === row.record_id ? { ...m, status: updatedStatus } : m
                    ));
                    setSelected(prev => prev?.record_id === row.record_id ? { ...prev!, status: updatedStatus } : prev);
                  })
                  .catch(() => {});
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-blue-50 text-blue-600 text-sm font-medium transition-colors"
          >
            <Eye size={14} />
            View
          </button>
        )}
      />

      {/* View message modal */}
      {selected && (
        <Modal isOpen={viewOpen} onClose={() => setViewOpen(false)} title="Message" size="2xl">
          <div className="flex flex-col gap-0 -m-5">
            {/* Email header strip */}
            <div className="px-6 pt-6 pb-5 border-b border-gray-100">
              {/* Subject */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <h3 className="text-xl font-bold text-gray-900 leading-snug flex-1">{selected.subject}</h3>
                {statusBadge(selected.status)}
              </div>

              {/* Sender avatar + meta */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-sm uppercase select-none">
                  {(resolveSender(selected) || '?').charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="font-semibold text-gray-900 text-sm">{resolveSender(selected)}</span>
                    {selected.sender_email && (
                      <span className="text-xs text-gray-400">&lt;{selected.sender_email}&gt;</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-0.5 text-xs text-gray-500">
                    {(selected.recipient_name_student || selected.recipient_tutor_name || selected.recipient_name || selected.recipient_admin) && (
                      <span className="flex items-center gap-1">
                        <User size={11} />
                        To: <span className="font-medium text-gray-700">
                          {selected.recipient_name_student || selected.recipient_tutor_name || selected.recipient_name || selected.recipient_admin}
                        </span>
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      {formatDate(selected.message_date)}
                    </span>
                    {selected.message_time && (
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {formatTime(selected.message_time)}
                      </span>
                    )}
                    {selected.attach_file && (
                      <span className="flex items-center gap-1 text-blue-500">
                        <Paperclip size={11} />
                        Attachment
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Message body */}
            <div className="px-6 py-6 flex-1 overflow-y-auto">
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed text-sm">
                {selected.body || <span className="italic text-gray-400">No message body</span>}
              </div>
            </div>

            {/* Footer actions */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Mail size={12} />
                <span className="capitalize">{selected.role || selected.user_role || 'message'}</span>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => setViewOpen(false)}>Close</Button>
                <Button icon={CornerUpLeft} onClick={() => openReply(selected)}>Reply</Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Reply modal */}
      <Modal
        isOpen={replyOpen}
        onClose={() => { setReplyOpen(false); setReplyTarget(null); }}
        title="Reply to Message"
        size="lg"
      >
        <form onSubmit={handleReplySubmit} className="space-y-4">
          {replyTarget && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
              <CornerUpLeft size={14} />
              <span>Replying to <strong>{replyTarget.recipientName}</strong></span>
            </div>
          )}
          <FormField label="Subject" required>
            <Input
              value={replyForm.subject}
              onChange={e => setReplyForm({ ...replyForm, subject: e.target.value })}
              required
            />
          </FormField>
          <FormField label="Message" required>
            <Textarea
              rows={5}
              value={replyForm.body}
              onChange={e => setReplyForm({ ...replyForm, body: e.target.value })}
              required
            />
          </FormField>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setReplyOpen(false); setReplyTarget(null); }}>Cancel</Button>
            <Button type="submit" loading={submitting} icon={Send}>Send Reply</Button>
          </div>
        </form>
      </Modal>

      {/* Compose modal */}
      <Modal isOpen={composeOpen} onClose={() => setComposeOpen(false)} title="New Message" size="lg">
        <form onSubmit={handleComposeSubmit} className="space-y-4">
          <FormField label="To" required>
            <Select value={composeTo} onChange={e => setComposeTo(e.target.value as MsgType)} required>
              {composeOptions.map(opt => (
                <option key={opt} value={opt}>
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Subject" required>
            <Input
              value={composeForm.subject}
              onChange={e => setComposeForm({ ...composeForm, subject: e.target.value })}
              required
              placeholder="Message subject"
            />
          </FormField>
          <FormField label="Message" required>
            <Textarea
              rows={6}
              value={composeForm.body}
              onChange={e => setComposeForm({ ...composeForm, body: e.target.value })}
              required
              placeholder="Write your message here..."
            />
          </FormField>
          <FormField label="Recipient Email (optional)">
            <Input
              type="email"
              value={composeForm.recipient_email}
              onChange={e => setComposeForm({ ...composeForm, recipient_email: e.target.value })}
              placeholder="recipient@email.com"
            />
          </FormField>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={composeForm.send_email}
              onChange={e => setComposeForm({ ...composeForm, send_email: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Also send to recipient&apos;s real email address
          </label>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setComposeOpen(false)}>Cancel</Button>
            <Button type="submit" loading={composeSubmitting} icon={Send}>Send Message</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
