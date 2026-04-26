'use client';
import { useEffect, useState, useCallback } from 'react';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { statusBadge } from '@/components/ui/Badge';
import FormField, { Input, Textarea } from '@/components/ui/FormField';
import { Eye, Send, CornerUpLeft } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

type MsgType = 'admin' | 'parent' | 'student' | 'tutor';

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
    extraFields = { recipient_tutor_name: senderName, recipient_tutor_id: msg.tutor_id || msg.sender_tutor_id || '', recipient_email: senderEmail };
  } else if (targetTab === 'student') {
    extraFields = { student_name: senderName, student_id: msg.student_id || msg.sender_student_id || '', recipient_email: senderEmail };
  } else if (targetTab === 'parent') {
    extraFields = { recipient_name: senderName, recipient_id: msg.parent_id || msg.sender_parent_id || '', recipient_email: senderEmail };
  } else {
    extraFields = { recipient_admin: 'Admin', recipient_email: senderEmail };
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
  const [loading, setLoading]       = useState(true);
  const [viewOpen, setViewOpen]     = useState(false);
  const [selected, setSelected]     = useState<Message | null>(null);
  const [replyOpen, setReplyOpen]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [replyForm, setReplyForm] = useState({
    subject: '', body: '', send_email: false,
  });

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
    { key: 'message_time', label: 'Time' },
    { key: 'sender', label: 'From', sortable: true, render: (_v: unknown, row: Message) => (
      <span className="font-medium text-gray-800">{resolveSender(row)}</span>
    )},
    { key: 'subject', label: 'Subject', render: (v: unknown) => (
      <span className="font-medium text-gray-900 truncate max-w-[200px] block">{v as string}</span>
    )},
    { key: 'status', label: 'Status', render: (v: unknown) => statusBadge(v as string) },
  ];

  return (
    <>
      <DataTable
        data={messages}
        columns={columns}
        loading={loading}
        searchKeys={['subject']}
        emptyMessage="Your inbox is empty"
        actions={(row) => (
          <button
            onClick={() => {
              setSelected(row);
              setViewOpen(true);
              if (row.status === 'unread' && row.record_id) {
                fetch(`/api/messages/${messageType}/${row.record_id}`)
                  .then(() => setMessages(prev => prev.map(m =>
                    m.record_id === row.record_id ? { ...m, status: 'read' } : m
                  )))
                  .catch(() => {});
              }
            }}
            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
          >
            <Eye size={15} />
          </button>
        )}
      />

      {/* View message modal */}
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
                <div><span className="text-gray-400">Date:</span> <span className="text-gray-700">{formatDate(selected.message_date)}</span></div>
                {selected.message_time && (
                  <div><span className="text-gray-400">Time:</span> <span className="text-gray-700">{selected.message_time}</span></div>
                )}
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
    </>
  );
}
