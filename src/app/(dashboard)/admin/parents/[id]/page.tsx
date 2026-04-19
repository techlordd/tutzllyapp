'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Avatar from '@/components/ui/Avatar';
import { statusBadge } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import {
  ArrowLeft, Mail, Phone, User, MapPin, Calendar, Video,
  ClipboardList, MessageSquare, Users, FileText,
  CheckCircle, AlertCircle, XCircle, GraduationCap, BookOpen, Edit, ExternalLink,
} from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils';
import Link from 'next/link';
import toast from 'react-hot-toast';

type Tab = 'bio' | 'children' | 'sessions' | 'messages';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'bio',      label: 'Bio',        icon: User          },
  { id: 'children', label: 'Children',   icon: Users         },
  { id: 'sessions', label: 'Sessions',   icon: Video         },
  { id: 'messages', label: 'Messages',   icon: MessageSquare },
];

interface Parent {
  parent_id: string; user_id: number;
  full_name_first_name: string; full_name_last_name: string;
  email: string; username: string; phone_no: string; sex: string; date_of_birth: string;
  address: string; address_line_1: string; address_line_2: string; address_city: string;
  address_state_province: string; address_zip_postal: string; address_country: string;
  short_bio: string; no_of_students: number; entry_status: string;
  timestamp: string; last_updated: string;
  student1: string; student_id1: string;
  student2: string; student_id2: string;
  student3: string; student_id3: string;
  student4: string; student_id4: string;
  student5: string; student_id5: string;
}

interface StudentProfile {
  student_id: string; enrollment_id: string;
  firstname: string; surname: string;
  full_name_first_name: string; full_name_last_name: string;
  email: string; phone_no: string; sex: string; grade: string; school: string;
  status: string; date_of_birth: string;
  mothers_name: string; mothers_email: string; fathers_name: string; fathers_email: string;
  address_line_1: string; address_line_2: string; address_city: string;
  address_state_province: string; address_zip_postal: string; address_country: string;
  short_bio: string; timestamp: string;
}

interface Session {
  ssid: string; student_name: string; tutor_name: string; course_name: string;
  start_session_date: string; start_session_time: string;
  session_duration: number; status: string;
}

interface Message {
  id: number; subject: string; body: string; message_date: string;
  status: string; sender: string; user_role: string;
}

function InfoRow({ icon: Icon, label, value }: {
  icon: React.ElementType; label: string; value?: string | number | null;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={13} className="text-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-medium text-gray-900 mt-0.5">{value || <span className="text-gray-400 font-normal">—</span>}</p>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <FileText size={32} className="mb-3 opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

function sessionStatusBadge(status: string) {
  const map: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
    ended:       { label: 'Ended',       icon: CheckCircle, cls: 'bg-green-50 text-green-700' },
    started:     { label: 'Started',     icon: CheckCircle, cls: 'bg-blue-50 text-blue-700'   },
    scheduled:   { label: 'Scheduled',   icon: Calendar,    cls: 'bg-slate-100 text-slate-600' },
    missed:      { label: 'Missed',      icon: XCircle,     cls: 'bg-red-50 text-red-700'     },
    rescheduled: { label: 'Rescheduled', icon: AlertCircle, cls: 'bg-amber-50 text-amber-700' },
  };
  const s = map[status] ?? { label: status, icon: AlertCircle, cls: 'bg-gray-100 text-gray-600' };
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${s.cls}`}>
      <Icon size={10} /> {s.label}
    </span>
  );
}

function StudentCard({ student }: { student: StudentProfile }) {
  const [expanded, setExpanded] = useState(false);
  const fullName = [
    student.firstname || student.full_name_first_name,
    student.surname   || student.full_name_last_name,
  ].filter(Boolean).join(' ') || student.email || student.student_id;
  const addressParts = [student.address_line_1, student.address_line_2, student.address_city,
    student.address_state_province, student.address_zip_postal, student.address_country].filter(Boolean);

  return (
    <div className="border border-gray-100 rounded-2xl overflow-hidden">
      {/* Card header */}
      <div className="flex items-center gap-4 p-4 bg-purple-50/40">
        <Avatar name={fullName} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900">{fullName}</p>
            {statusBadge(student.status)}
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="font-mono text-xs bg-white text-gray-500 px-2 py-0.5 rounded border border-gray-200">{student.student_id}</span>
            {student.enrollment_id && (
              <span className="font-mono text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">{student.enrollment_id}</span>
            )}
            {student.grade && (
              <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">{student.grade}</span>
            )}
          </div>
          {student.school && <p className="text-xs text-gray-400 mt-0.5">{student.school}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link href={`/admin/students/${student.student_id}`}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 bg-white border border-blue-200 px-2 py-1 rounded-lg transition-colors"
            title="Open full student profile">
            <ExternalLink size={12} /> Full Profile
          </Link>
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-xs text-gray-500 hover:text-gray-800 bg-white border border-gray-200 px-2 py-1 rounded-lg transition-colors"
          >
            {expanded ? 'Less' : 'Details'}
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-6 border-t border-gray-100">
          {/* Contact */}
          <div>
            <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Contact</h4>
            <InfoRow icon={Mail}          label="Email"         value={student.email} />
            <InfoRow icon={Phone}         label="Phone"         value={student.phone_no} />
            <InfoRow icon={User}          label="Sex"           value={student.sex} />
            <InfoRow icon={Calendar}      label="Date of Birth" value={formatDate(student.date_of_birth)} />
            <InfoRow icon={GraduationCap} label="Grade"         value={student.grade} />
            <InfoRow icon={BookOpen}      label="School"        value={student.school} />
          </div>

          {/* Parent/Guardian cross-ref */}
          <div>
            <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Guardian on Record</h4>
            <InfoRow icon={Users} label="Mother's Name"  value={student.mothers_name} />
            <InfoRow icon={Mail}  label="Mother's Email" value={student.mothers_email} />
            <InfoRow icon={Users} label="Father's Name"  value={student.fathers_name} />
            <InfoRow icon={Mail}  label="Father's Email" value={student.fathers_email} />

            {addressParts.length > 0 && (
              <>
                <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mt-4 mb-3">Address</h4>
                <InfoRow icon={MapPin} label="Full Address" value={addressParts.join(', ')} />
              </>
            )}
          </div>

          {student.short_bio && (
            <div className="sm:col-span-2">
              <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Bio</h4>
              <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-3">{student.short_bio}</p>
            </div>
          )}

          <div className="sm:col-span-2 flex justify-end">
            <Link href={`/admin/students/${student.student_id}`}
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors">
              <ExternalLink size={14} /> View full session log, courses &amp; activities
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ParentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('bio');
  const [parent, setParent] = useState<Parent | null>(null);
  const [loading, setLoading] = useState(true);

  const [children,  setChildren]  = useState<StudentProfile[]>([]);
  const [sessions,  setSessions]  = useState<Session[]>([]);
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [tabLoaded, setTabLoaded] = useState<Partial<Record<Tab, boolean>>>({});
  const [tabLoading,setTabLoading]= useState(false);

  useEffect(() => {
    fetch(`/api/parents/${id}`)
      .then(r => r.json())
      .then(d => { if (d.parent) setParent(d.parent); else toast.error('Parent not found'); })
      .catch(() => toast.error('Failed to load parent'))
      .finally(() => setLoading(false));
  }, [id]);

  const loadTab = useCallback(async (t: Tab, p: Parent) => {
    if (tabLoaded[t] || t === 'bio') return;
    setTabLoading(true);
    try {
      if (t === 'children') {
        // Collect all linked student IDs
        const ids = [1,2,3,4,5]
          .map(i => p[`student_id${i}` as keyof Parent] as string)
          .filter(Boolean);
        const profiles = await Promise.all(
          ids.map(sid =>
            fetch(`/api/students/${sid}`)
              .then(r => r.ok ? r.json() : null)
              .then(d => d?.student ?? null)
              .catch(() => null)
          )
        );
        setChildren(profiles.filter((p): p is StudentProfile => p != null && Boolean(p.student_id)));

      } else if (t === 'sessions') {
        // Fetch sessions for all children in parallel
        const ids = [1,2,3,4,5]
          .map(i => p[`student_id${i}` as keyof Parent] as string)
          .filter(Boolean);
        const results = await Promise.all(
          ids.map(sid => fetch(`/api/sessions?student_id=${sid}`).then(r => r.json()).then(d => d.sessions || []))
        );
        setSessions(results.flat());

      } else if (t === 'messages') {
        const d = await fetch(`/api/messages/parent?user_id=${p.user_id}`).then(r => r.json());
        setMessages(d.messages || []);
      }
      setTabLoaded(prev => ({ ...prev, [t]: true }));
    } catch { toast.error('Failed to load tab data'); }
    setTabLoading(false);
  }, [tabLoaded]);

  const switchTab = (t: Tab) => {
    setTab(t);
    if (parent) loadTab(t, parent);
  };

  if (loading) return (
    <DashboardLayout title="Parent Profile">
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  );

  if (!parent) return (
    <DashboardLayout title="Parent Profile">
      <div className="text-center py-24 text-gray-400">Parent not found.</div>
    </DashboardLayout>
  );

  const fullName = `${parent.full_name_first_name || ''} ${parent.full_name_last_name || ''}`.trim() || parent.email;
  const addressParts = [parent.address_line_1, parent.address_line_2, parent.address_city,
    parent.address_state_province, parent.address_zip_postal, parent.address_country].filter(Boolean);
  const fullAddress = addressParts.join(', ') || parent.address;

  const linkedChildren = [1,2,3,4,5]
    .map(i => ({ name: parent[`student${i}` as keyof Parent] as string, id: parent[`student_id${i}` as keyof Parent] as string }))
    .filter(c => c.id);

  return (
    <DashboardLayout title="Parent Profile">
      <div className="space-y-5">

        {/* Back */}
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft size={16} /> Back to Parents
        </button>

        {/* Profile header */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Avatar name={fullName} size="xl" />
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900">{fullName}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-xs font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{parent.parent_id}</span>
                {statusBadge(parent.entry_status)}
                {parent.no_of_students > 0 && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                    {parent.no_of_students} {parent.no_of_students === 1 ? 'child' : 'children'}
                  </span>
                )}
              </div>
              {parent.email && <p className="text-sm text-gray-500 mt-1">{parent.email}</p>}
            </div>
            <Link href={`/admin/parents/${id}/edit`}>
              <Button icon={Edit} variant="secondary">Edit</Button>
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex overflow-x-auto border-b border-gray-100 no-scrollbar">
            {TABS.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => switchTab(t.id)}
                  className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${
                    tab === t.id
                      ? 'border-purple-600 text-purple-600 bg-purple-50/50'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                  }`}>
                  <Icon size={15} />{t.label}
                  {t.id === 'children' && linkedChildren.length > 0 && (
                    <span className="ml-1 text-xs bg-purple-100 text-purple-700 w-5 h-5 rounded-full flex items-center justify-center font-bold">
                      {linkedChildren.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="p-5 min-h-64">
            {tabLoading && (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* BIO */}
            {!tabLoading && tab === 'bio' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Personal Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                      <InfoRow icon={Mail}     label="Email"         value={parent.email} />
                      <InfoRow icon={Phone}    label="Phone"         value={parent.phone_no} />
                      <InfoRow icon={User}     label="Sex"           value={parent.sex} />
                      <InfoRow icon={Calendar} label="Date of Birth" value={formatDate(parent.date_of_birth)} />
                      <InfoRow icon={User}     label="Username"      value={parent.username} />
                    </div>
                  </div>

                  {linkedChildren.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Linked Children</h3>
                      <div className="space-y-2">
                        {linkedChildren.map((c, i) => (
                          <div key={i} className="flex items-center gap-3 bg-purple-50 px-3 py-2.5 rounded-xl">
                            <span className="w-6 h-6 rounded-full bg-purple-200 text-purple-800 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                            <Avatar name={c.name} size="sm" />
                            <span className="flex-1 text-sm font-medium text-purple-900">{c.name}</span>
                            <span className="font-mono text-xs text-purple-500">{c.id}</span>
                            <Link href={`/admin/students/${c.id}`}
                              className="text-purple-600 hover:text-purple-900 transition-colors" title="View student profile">
                              <ExternalLink size={14} />
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Address</h3>
                    <InfoRow icon={MapPin} label="Full Address" value={fullAddress || undefined} />
                  </div>

                  {parent.short_bio && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Bio</h3>
                      <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-4">{parent.short_bio}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Record</h3>
                    <InfoRow icon={Calendar} label="Registered"   value={formatDate(parent.timestamp)} />
                    <InfoRow icon={Calendar} label="Last Updated" value={formatDate(parent.last_updated)} />
                  </div>
                </div>
              </div>
            )}

            {/* CHILDREN */}
            {!tabLoading && tab === 'children' && (
              <div className="space-y-4">
                {linkedChildren.length === 0 ? (
                  <EmptyState message="No children linked to this parent" />
                ) : children.length === 0 ? (
                  <EmptyState message="Student profiles could not be loaded" />
                ) : (
                  <>
                    <p className="text-sm text-gray-500">{children.length} linked student{children.length !== 1 ? 's' : ''} — expand each card to see their full details or open their profile page</p>
                    <div className="space-y-3">
                      {children.map(s => <StudentCard key={s.student_id} student={s} />)}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* SESSIONS */}
            {!tabLoading && tab === 'sessions' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl px-4 py-3 text-center bg-slate-100 text-slate-700">
                    <p className="text-2xl font-bold">{sessions.length}</p>
                    <p className="text-xs mt-0.5 opacity-80">Total</p>
                  </div>
                  <div className="rounded-xl px-4 py-3 text-center bg-green-50 text-green-700">
                    <p className="text-2xl font-bold">{sessions.filter(s => s.status === 'ended').length}</p>
                    <p className="text-xs mt-0.5 opacity-80">Completed</p>
                  </div>
                  <div className="rounded-xl px-4 py-3 text-center bg-blue-50 text-blue-700">
                    <p className="text-2xl font-bold">{sessions.filter(s => s.status === 'scheduled').length}</p>
                    <p className="text-xs mt-0.5 opacity-80">Scheduled</p>
                  </div>
                  <div className="rounded-xl px-4 py-3 text-center bg-red-50 text-red-700">
                    <p className="text-2xl font-bold">{sessions.filter(s => s.status === 'missed').length}</p>
                    <p className="text-xs mt-0.5 opacity-80">Missed</p>
                  </div>
                </div>

                {sessions.length === 0 ? <EmptyState message="No sessions found for this parent's children" /> : (
                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                        <tr>
                          {['Date', 'Child', 'Tutor', 'Course', 'Time', 'Duration', 'Status'].map(h => (
                            <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {sessions.map(s => (
                          <tr key={s.ssid} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{formatDate(s.start_session_date)}</td>
                            <td className="px-4 py-3 text-gray-600">{s.student_name || '—'}</td>
                            <td className="px-4 py-3 text-gray-600">{s.tutor_name || '—'}</td>
                            <td className="px-4 py-3 text-gray-600">{s.course_name || '—'}</td>
                            <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                              {s.start_session_time ? formatTime(s.start_session_time) : '—'}
                            </td>
                            <td className="px-4 py-3 text-gray-500">{s.session_duration ? `${s.session_duration}h` : '—'}</td>
                            <td className="px-4 py-3">{sessionStatusBadge(s.status)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* MESSAGES */}
            {!tabLoading && tab === 'messages' && (
              <div>
                {messages.length === 0 ? <EmptyState message="No messages found for this parent" /> : (
                  <div className="space-y-3">
                    {messages.map(m => (
                      <div key={m.id} className="flex items-start gap-3 p-4 rounded-xl border border-gray-100 hover:bg-gray-50/50 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                          <MessageSquare size={14} className="text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-gray-900 truncate">{m.subject || '(No subject)'}</p>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.status === 'unread' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>
                                {m.status}
                              </span>
                              <span className="text-xs text-gray-400">{formatDate(m.message_date)}</span>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">From: {m.sender || '—'}</p>
                          {m.body && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{m.body}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
