'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import FormField, { Input, Select, Textarea } from '@/components/ui/FormField';
import { Send, PenSquare } from 'lucide-react';
import toast from 'react-hot-toast';

type MsgType = 'admin' | 'tutor' | 'student' | 'parent';

interface CurrentUser {
  id: number;
  user_id: string;
  role: string;
  username: string;
}

interface ComposeViewProps {
  currentUser: CurrentUser;
  sentUrl: string;
}

const ROLE_OPTIONS: Record<string, MsgType[]> = {
  tutor:   ['admin', 'student', 'parent'],
  student: ['admin', 'tutor',   'parent'],
  parent:  ['admin', 'tutor',   'student'],
  admin:   ['tutor', 'student', 'parent'],
};

export default function ComposeView({ currentUser, sentUrl }: ComposeViewProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const options = ROLE_OPTIONS[currentUser.role] || ['admin'];
  const [to, setTo] = useState<MsgType>(options[0]);
  const [form, setForm] = useState({
    subject: '', body: '', recipient_email: '', send_email: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        role: currentUser.role,
        sender: currentUser.username,
        user_role: currentUser.role,
        user_id: String(currentUser.id),
        ...form,
      };
      const res = await fetch(`/api/messages/${to}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      toast.success('Message sent!');
      router.push(sentUrl);
    } catch { toast.error('Failed to send message'); }
    setSubmitting(false);
  };

  return (
    <div className="max-w-2xl">
      {/* Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Card header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-100 text-blue-600">
            <PenSquare size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">New Message</h2>
            <p className="text-xs text-gray-500">Send a message to another member</p>
          </div>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <FormField label="To" required>
            <Select value={to} onChange={e => setTo(e.target.value as MsgType)} required>
              {options.map(opt => (
                <option key={opt} value={opt}>
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Subject" required>
            <Input
              value={form.subject}
              onChange={e => setForm({ ...form, subject: e.target.value })}
              required
              placeholder="Message subject"
            />
          </FormField>

          <FormField label="Message" required>
            <Textarea
              rows={8}
              value={form.body}
              onChange={e => setForm({ ...form, body: e.target.value })}
              required
              placeholder="Write your message here..."
            />
          </FormField>

          {/* Divider */}
          <div className="border-t border-gray-100 pt-4 space-y-4">
            <FormField label="Recipient Email (optional — for external email delivery)">
              <Input
                type="email"
                value={form.recipient_email}
                onChange={e => setForm({ ...form, recipient_email: e.target.value })}
                placeholder="recipient@email.com"
              />
            </FormField>

            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.send_email}
                onChange={e => setForm({ ...form, send_email: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Also send to recipient&apos;s real email address
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" loading={submitting} icon={Send}>Send Message</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
