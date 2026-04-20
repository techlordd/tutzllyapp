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

function resolveSender(msg: AdminMessage) {
  return msg.sender || msg.tutor_name || msg.student_name || msg.parent_name || null;
}

function resolveSenderLabel(msg: AdminMessage) {
  if (msg.tutor_name) return 'Tutor';
  if (msg.student_name) return 'Student';
  if (msg.parent_name) return 'Parent';
  if (msg.role) return msg.role.charAt(0).toUpperCase() + msg.role.slice(1);
  return 'Unknown';
}

export default function MessageAdminDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [message, setMessage] = useState<AdminMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch(`/api/messages/admin/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.message) setMessage(data.message);
        else { toast.error('Message not found'); router.push('/admin/messages-admin'); }
      })
      .catch(() => { toast.error('Failed to load message'); router.push('/admin/messages-admin'); })
      .finally(() => setLoading(false));
  }, [id, router]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message) return;
    setSending(true);
    try {
      const res = await fetch('/api/messages/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'admin',
          sender: 'Admin',
          tutor_name: message.tutor_name,
          tutor_id: message.tutor_id,
          student_name: message.student_name,
          student_id: message.student_id,
          parent_name: message.parent_name,
          parent_id: message.parent_id,
          recipient_admin: message.recipient_admin,
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
            <button onClick={() => router.push('/admin/messages-admin')}
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
                {message.sender       && <InfoCard icon={User}          label="Sender"       value={message.sender} />}
                {message.user_role    && <InfoCard icon={Globe}         label="User Role"    value={message.user_role} />}
                {message.user_role2   && <InfoCard icon={Globe}         label="User Role 2"  value={message.user_role2} />}
                {message.tutor_name   && <InfoCard icon={GraduationCap} label="Tutor Name"   value={message.tutor_name} />}
                {message.tutor_id     && <InfoCard icon={Hash}          label="Tutor ID"     value={message.tutor_id} mono />}
                {message.student_name && <InfoCard icon={User}          label="Student Name" value={message.student_name} />}
                {message.student_id   && <InfoCard icon={Hash}          label="Student ID"   value={message.student_id} mono />}
                {message.parent_name  && <InfoCard icon={User}          label="Parent Name"  value={message.parent_name} />}
                {message.parent_id    && <InfoCard icon={Hash}          label="Parent ID"    value={message.parent_id} mono />}
              </div>
            </div>
            {/* To */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">To (Admin)</p>
              <div className="space-y-3">
                <InfoCard icon={User} label="Recipient (Admin)" value={message.recipient_admin} />
                {message.cc && <InfoCard icon={Mail} label="Cc" value={message.cc} />}
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="border-t pt-4">
            <p className="text-xs text-gray-400 mb-2">Message</p>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                {message.body || <span className="text-gray-400 italic">(No message body)</span>}
              </p>
            </div>
          </div>

          {message.file_upload && (
            <div className="border-t mt-4 pt-4">
              <InfoCard icon={FileText} label="File Upload" value={message.file_upload} />
            </div>
          )}
        </Card>

        {/* Reply panel */}
        {replyOpen && sender && (
          <Card>
            <SectionTitle>Reply to {sender}</SectionTitle>
            <form onSubmit={handleReply} className="space-y-3">
              <div className="bg-blue-50 text-blue-700 text-xs rounded-lg px-3 py-2">
                Replying as Admin → <strong>{sender}</strong>
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
