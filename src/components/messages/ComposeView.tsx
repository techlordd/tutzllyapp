'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import FormField, { Input, Select, Textarea } from '@/components/ui/FormField';
import { Send, PenSquare, Search, X, User } from 'lucide-react';
import toast from 'react-hot-toast';

type MsgType = 'admin' | 'tutor' | 'student' | 'parent';

interface CurrentUser {
  id: number;
  user_id: string;
  role: string;
  username: string;
}

interface RecipientOption {
  id: string;         // tutor_id / student_id / parent_id
  name: string;
  email: string;
  subtext?: string;   // e.g. student ID or email for disambiguation
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

function buildRecipientFields(to: MsgType, r: RecipientOption): Record<string, string> {
  if (to === 'tutor')   return { recipient_tutor_name: r.name, recipient_tutor_id: r.id, recipient_email: r.email };
  if (to === 'student') return { recipient_name_student: r.name, recipient_id_student: r.id, recipient_email: r.email };
  if (to === 'parent')  return { recipient_name: r.name, recipient_id: r.id, recipient_email: r.email };
  return {};
}

async function searchRecipients(to: MsgType, q: string): Promise<RecipientOption[]> {
  if (to === 'admin' || q.trim().length < 1) return [];
  const endpoint = to === 'tutor' ? 'tutors' : to === 'student' ? 'students' : 'parents';
  const res = await fetch(`/api/${endpoint}?search=${encodeURIComponent(q)}`);
  if (!res.ok) return [];
  const data = await res.json();

  if (to === 'tutor') {
    return (data.tutors || []).slice(0, 8).map((t: Record<string, string>) => ({
      id: t.tutor_id,
      name: `${t.firstname || ''} ${t.surname || ''}`.trim() || t.username || t.tutor_id,
      email: t.email || '',
      subtext: t.tutor_id,
    }));
  }
  if (to === 'student') {
    return (data.students || []).slice(0, 8).map((s: Record<string, string>) => ({
      id: s.student_id,
      name: `${s.firstname || ''} ${s.surname || ''}`.trim() || s.username || s.student_id,
      email: s.email || '',
      subtext: s.student_id,
    }));
  }
  // parent
  return (data.parents || []).slice(0, 8).map((p: Record<string, string>) => ({
    id: p.parent_id,
    name: `${p.full_name_first_name || ''} ${p.full_name_last_name || ''}`.trim() || p.username || p.parent_id,
    email: p.email || '',
    subtext: p.parent_id,
  }));
}

export default function ComposeView({ currentUser, sentUrl }: ComposeViewProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const options = ROLE_OPTIONS[currentUser.role] || ['admin'];
  const [to, setTo] = useState<MsgType>(options[0]);
  const [form, setForm] = useState({
    subject: '', body: '', recipient_email: '', send_email: false,
  });

  // Recipient autocomplete state
  const [recipientQuery, setRecipientQuery]       = useState('');
  const [suggestions, setSuggestions]             = useState<RecipientOption[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<RecipientOption | null>(null);
  const [showDropdown, setShowDropdown]           = useState(false);
  const [searching, setSearching]                 = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Reset recipient when role changes
  useEffect(() => {
    setRecipientQuery('');
    setSuggestions([]);
    setSelectedRecipient(null);
    setShowDropdown(false);
  }, [to]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleRecipientInput = useCallback((value: string) => {
    setRecipientQuery(value);
    setSelectedRecipient(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) { setSuggestions([]); setShowDropdown(false); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const results = await searchRecipients(to, value);
      setSuggestions(results);
      setShowDropdown(true);
      setSearching(false);
    }, 300);
  }, [to]);

  const handleSelectRecipient = (r: RecipientOption) => {
    setSelectedRecipient(r);
    setRecipientQuery(r.name);
    setSuggestions([]);
    setShowDropdown(false);
    setForm(f => ({ ...f, recipient_email: r.email }));
  };

  const clearRecipient = () => {
    setSelectedRecipient(null);
    setRecipientQuery('');
    setSuggestions([]);
    setForm(f => ({ ...f, recipient_email: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Require a selected recipient for non-admin targets
    if (to !== 'admin' && !selectedRecipient) {
      toast.error('Please select a recipient from the suggestions');
      return;
    }
    setSubmitting(true);
    try {
      const recipientFields = selectedRecipient ? buildRecipientFields(to, selectedRecipient) : {};
      const payload = {
        role: currentUser.role,
        sender: currentUser.username,
        user_role: currentUser.role,
        user_id: String(currentUser.id),
        ...form,
        ...recipientFields,
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

          {/* Recipient search — shown for all non-admin targets */}
          {to !== 'admin' && (
            <FormField label="Recipient" required>
              <div className="relative" ref={dropdownRef}>
                {selectedRecipient ? (
                  /* Selected pill */
                  <div className="flex items-center gap-2 px-3 py-2 border border-blue-300 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-600 shrink-0">
                      <User size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{selectedRecipient.name}</p>
                      {selectedRecipient.email && (
                        <p className="text-xs text-gray-500 truncate">{selectedRecipient.email}</p>
                      )}
                    </div>
                    <button type="button" onClick={clearRecipient} className="p-1 rounded hover:bg-blue-100 text-gray-400 hover:text-gray-600 transition-colors shrink-0">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  /* Search input */
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                      {searching ? (
                        <span className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin block" />
                      ) : (
                        <Search size={15} />
                      )}
                    </span>
                    <input
                      type="text"
                      value={recipientQuery}
                      onChange={e => handleRecipientInput(e.target.value)}
                      onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                      placeholder={`Search ${to} by name…`}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      autoComplete="off"
                    />
                  </div>
                )}

                {/* Dropdown suggestions */}
                {showDropdown && suggestions.length > 0 && (
                  <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    {suggestions.map(r => (
                      <li key={r.id}>
                        <button
                          type="button"
                          onMouseDown={() => handleSelectRecipient(r)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 text-left transition-colors"
                        >
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-500 shrink-0">
                            <User size={14} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{r.name}</p>
                            <p className="text-xs text-gray-400 truncate">{r.email || r.subtext}</p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {showDropdown && recipientQuery.trim().length > 0 && suggestions.length === 0 && !searching && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm text-gray-500">
                    No {to}s found matching &ldquo;{recipientQuery}&rdquo;
                  </div>
                )}
              </div>
            </FormField>
          )}

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
