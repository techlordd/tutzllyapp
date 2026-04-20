'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Button from '@/components/ui/Button';
import { statusBadge } from '@/components/ui/Badge';
import FormField, { Textarea } from '@/components/ui/FormField';
import {
  ArrowLeft, Send, User, GraduationCap, Mail,
  Calendar, Clock, Hash, Globe, Key, FileText, CornerUpLeft,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface TutorMessage {
  record_id: number;
  message_date: string; message_time: string; role: string;
  sender: string; sender_email: string; user_role: string; user_role2: string;
  sender_admin: string; sender_student_name: string; sender_student_id: string;
  lookup_student_id: string; sender_parent_name: string; sender_parent_id: string;
  recipient_tutor_name: string; recipient_tutor_id: string; recipient_email: string;
  cc: string; subject: string; body: string; attach_file: string;
  status: string; user_id: string;
  entry_status: string; timestamp: string; last_updated: string;
  created_by: string; updated_by: string; ip: string; record_key: string;
}

function InfoCard({ icon: Icon, label, value, mono = false }: {
  icon: React.ElementType; label: string; value?: string | null; mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={15} className="text-slate-500" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <p className={`text-sm font-medium text-gray-900 break-all ${mono ? 'font-mono' : ''}`}>
          {value != null && value !== '' ? value : <span className="text-gray-400 font-normal">—</span>}
        </p>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">{children}</h2>;
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">{children}</div>;
}

function resolveSender(msg: TutorMessage) {
  return msg.sender_admin || msg.sender_student_name || msg.sender_parent_name || msg.sender || null;
}

function resolveSenderLabel(msg: TutorMessage) {
  if (msg.sender_admin) return 'Admin';
  if (msg.sender_student_name) return 'Student';
  if (msg.sender_parent_name) return 'Parent';
  if (msg.sender) return msg.role || 'Sender';
  return msg.role || 'Unknown';
}

export default function MessageTutorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [message, setMessage] = useState<TutorMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch(`/api/messages/tutor/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.message) setMessage(data.message);
        else { toast.error('Message not found'); router.push('/admin/messages-tutor'); }
      })
      .catch(() => { toast.error('Failed to load message'); router.push('/admin/messages-tutor'); })
      .finally(() => setLoading(false));
  }, [id, router]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message) return;
    setSending(true);
    try {
      const res = await fetch('/api/messages/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'admin',
          sender: 'Admin',
          sender_email: '',
          recipient_tutor_name: message.recipient_tutor_name,
          recipient_tutor_id: message.recipient_tutor_id,
          recipient_email: message.recipient_email,
          subject: `Re: ${message.subject}`,
          body: replyBody,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Reply sent!');
      setReplyOpen(false);
      setReplyBody('');
    } catch { toast.error('Failed to send reply'); }
    setSending(false);
  };

  if (loading) {
    return (
      <DashboardLayout title="Message Detail">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!message) return null;

  const sender = resolveSender(message);
  const senderLabel = resolveSenderLabel(message);

  return (
    <DashboardLayout title="Message Detail">
      <div className="max-w-3xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/admin/messages-tutor')}
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">{message.subject || '(No Subject)'}</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {formatDate(message.message_date)}{message.message_time ? ` · ${message.message_time}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {statusBadge(message.status)}
            {sender && (
              <Button icon={CornerUpLeft} variant="secondary" onClick={() => setReplyOpen(v => !v)}>
                Reply
              </Button>
            )}
          </div>
        </div>

        {/* Message envelope */}
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
            {/* From */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">From ({senderLabel})</p>
              <div className="space-y-3">
                {message.sender_admin && <InfoCard icon={User} label="Sender (Admin)" value={message.sender_admin} />}
                {message.sender_student_name && <InfoCard icon={User} label="Sender (Student)" value={message.sender_student_name} />}
                {message.sender_student_id && <InfoCard icon={Hash} label="Student ID" value={message.sender_student_id} mono />}
                {message.sender_parent_name && <InfoCard icon={User} label="Sender (Parent)" value={message.sender_parent_name} />}
                {message.sender_parent_id && <InfoCard icon={Hash} label="Parent ID" value={message.sender_parent_id} mono />}
                {!message.sender_admin && !message.sender_student_name && !message.sender_parent_name && message.sender && (
                  <InfoCard icon={User} label="Sender" value={message.sender} />
                )}
                {message.sender_email && <InfoCard icon={Mail} label="Sender Email" value={message.sender_email} />}
                {message.user_role && <InfoCard icon={Globe} label="User Role" value={message.user_role} />}
              </div>
            </div>
            {/* To */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">To (Tutor)</p>
              <div className="space-y-3">
                <InfoCard icon={GraduationCap} label="Recipient (Tutor)" value={message.recipient_tutor_name} />
                <InfoCard icon={Hash}          label="Tutor ID"          value={message.recipient_tutor_id} mono />
                <InfoCard icon={Mail}          label="Recipient Email"   value={message.recipient_email} />
                {message.cc && <InfoCard icon={Mail} label="Cc" value={message.cc} />}
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="border-t pt-4">
            <p className="text-xs text-gray-400 mb-2">Message</p>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                {message.body || <span className="text-gray-400">(No message body)</span>}
              </p>
            </div>
          </div>

          {message.attach_file && (
            <div className="border-t mt-4 pt-4">
              <InfoCard icon={FileText} label="Attached File" value={message.attach_file} />
            </div>
          )}
        </Card>

        {/* Reply panel */}
        {replyOpen && sender && (
          <Card>
            <SectionTitle>Reply to {sender}</SectionTitle>
            <form onSubmit={handleReply} className="space-y-3">
              <div className="bg-blue-50 text-blue-700 text-xs rounded-lg px-3 py-2">
                Replying as Admin → <strong>{message.recipient_tutor_name || 'Tutor'}</strong>
                {' · '}Subject: <strong>Re: {message.subject}</strong>
              </div>
              <FormField label="Reply">
                <Textarea rows={5} value={replyBody}
                  onChange={e => setReplyBody(e.target.value)}
                  placeholder="Write your reply…" required />
              </FormField>
              <div className="flex gap-3">
                <Button type="button" variant="secondary" onClick={() => setReplyOpen(false)}>Cancel</Button>
                <Button type="submit" icon={Send} loading={sending} disabled={!replyBody.trim()}>Send Reply</Button>
              </div>
            </form>
          </Card>
        )}

        {/* Record Info */}
        <Card>
          <SectionTitle>Record Info</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <InfoCard icon={Hash}     label="Record ID"    value={String(message.record_id)} mono />
            <InfoCard icon={Globe}    label="Entry Status" value={message.entry_status} />
            <InfoCard icon={Calendar} label="Timestamp"    value={message.timestamp ? new Date(message.timestamp).toLocaleString() : null} />
            <InfoCard icon={Calendar} label="Last Updated" value={message.last_updated ? new Date(message.last_updated).toLocaleString() : null} />
            <InfoCard icon={Clock}    label="Message Date" value={formatDate(message.message_date)} />
            <InfoCard icon={Clock}    label="Message Time" value={message.message_time} />
            <InfoCard icon={User}     label="Created By"   value={message.created_by} />
            <InfoCard icon={User}     label="Updated By"   value={message.updated_by} />
            <InfoCard icon={Globe}    label="IP"           value={message.ip} />
            <InfoCard icon={Key}      label="Key"          value={message.record_key} mono />
          </div>
        </Card>

      </div>
    </DashboardLayout>
  );
}
