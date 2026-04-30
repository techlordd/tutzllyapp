'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Avatar from '@/components/ui/Avatar';
import { statusBadge } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import {
  ArrowLeft, Mail, Phone, User, MapPin, Calendar, BookOpen, Video,
  ClipboardList, MessageSquare, DollarSign, GraduationCap, Clock,
  Edit, CheckCircle, AlertCircle, XCircle, FileText,
} from 'lucide-react';
import { formatDate, formatTime, formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import toast from 'react-hot-toast';

type Tab = 'bio' | 'sessions' | 'activities' | 'students' | 'messages' | 'payroll';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'bio',        label: 'Bio',               icon: User          },
  { id: 'sessions',   label: 'Session Log',        icon: Video         },
  { id: 'activities', label: 'Class Activities',   icon: ClipboardList },
  { id: 'students',   label: 'Assigned Students',  icon: GraduationCap },
  { id: 'messages',   label: 'Messages',           icon: MessageSquare },
  { id: 'payroll',    label: 'Payroll',            icon: DollarSign    },
];

interface Tutor {
  tutor_id: string; user_id: number; firstname: string; surname: string;
  email: string; username: string; phone_no: string; sex: string;
  date_of_birth: string; address: string; address_line_1: string;
  address_line_2: string; address_city: string; address_state_province: string;
  address_zip_postal: string; address_country: string; short_bio: string;
  pay_category: string; salary: number; payrate_per_hour: number;
  entry_status: string; user_role: string; timestamp: string; last_updated: string;
}

interface Session {
  ssid: string; student_name: string; course_name: string;
  start_session_date: string; schedule_start_time: string; schedule_end_time: string;
  start_session_time: string; end_session_time: string; status: string;
}

interface Activity {
  id: number; ssid: string; student_name: string; course_name: string;
  class_activity_date: string; class_activity_time: string; topic_taught: string;
  tutors_general_observation: string;
}

interface Enrollment {
  assign_id: string; student_id: string; student_name: string;
  course_name: string; course_code: string; entry_status: string;
}

interface Message {
  id: number; subject: string; body: string; message_date: string;
  status: string; sender: string; sender_student_name: string;
  sender_parent_name: string; user_role: string;
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

function StatChip({ label, value, color = 'slate' }: { label: string; value: number | string; color?: string }) {
  const colors: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-700',
    blue:  'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    red:   'bg-red-50 text-red-700',
    amber: 'bg-amber-50 text-amber-700',
  };
  return (
    <div className={`rounded-xl px-4 py-3 text-center ${colors[color] ?? colors.slate}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs mt-0.5 opacity-80">{label}</p>
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

export default function TutorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('bio');
  const [tutor, setTutor] = useState<Tutor | null>(null);
  const [loading, setLoading] = useState(true);

  const [sessions,   setSessions]   = useState<Session[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [students,   setStudents]   = useState<Enrollment[]>([]);
  const [messages,   setMessages]   = useState<Message[]>([]);
  const [tabLoaded,  setTabLoaded]  = useState<Partial<Record<Tab, boolean>>>({});
  const [tabLoading, setTabLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/tutors/${id}`)
      .then(r => r.json())
      .then(d => { if (d.tutor) setTutor(d.tutor); else toast.error('Tutor not found'); })
      .catch(() => toast.error('Failed to load tutor'))
      .finally(() => setLoading(false));
  }, [id]);

  const loadTab = useCallback(async (t: Tab) => {
    if (tabLoaded[t] || t === 'bio' || t === 'payroll') return;
    setTabLoading(true);
    try {
      if (t === 'sessions') {
        const d = await fetch(`/api/sessions?tutor_id=${id}`).then(r => r.json());
        setSessions(d.sessions || []);
      } else if (t === 'activities') {
        const d = await fetch(`/api/activities?tutor_id=${id}`).then(r => r.json());
        setActivities(d.activities || []);
      } else if (t === 'students') {
        const d = await fetch(`/api/enrollments?tutor_id=${id}`).then(r => r.json());
        setStudents(d.enrollments || []);
      } else if (t === 'messages') {
        const d = await fetch(`/api/messages/tutor?tutor_id=${id}`).then(r => r.json());
        setMessages(d.messages || []);
      }
      setTabLoaded(prev => ({ ...prev, [t]: true }));
    } catch { toast.error('Failed to load tab data'); }
    setTabLoading(false);
  }, [id, tabLoaded]);

  const switchTab = (t: Tab) => { setTab(t); loadTab(t); };

  if (loading) return (
    <DashboardLayout title="Tutor Profile">
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  );

  if (!tutor) return (
    <DashboardLayout title="Tutor Profile">
      <div className="text-center py-24 text-gray-400">Tutor not found.</div>
    </DashboardLayout>
  );

  const fullName = `${tutor.firstname || ''} ${tutor.surname || ''}`.trim() || tutor.email;
  const addressParts = [tutor.address_line_1, tutor.address_line_2, tutor.address_city,
    tutor.address_state_province, tutor.address_zip_postal, tutor.address_country].filter(Boolean);
  const fullAddress = addressParts.join(', ') || tutor.address;

  // Payroll calculations
  const endedSessions = sessions.filter(s => s.status === 'ended');
  const totalHours = endedSessions.reduce((sum, s) => sum + (Number(s.session_duration) || 0), 0);
  const estimatedEarnings = tutor.payrate_per_hour ? totalHours * tutor.payrate_per_hour : 0;

  return (
    <DashboardLayout title="Tutor Profile">
      <div className="space-y-5">

        {/* Back */}
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft size={16} /> Back to Tutors
        </button>

        {/* Profile header */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Avatar name={fullName} size="xl" />
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900">{fullName}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-xs font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{tutor.tutor_id}</span>
                {statusBadge(tutor.entry_status)}
                {tutor.pay_category && (
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{tutor.pay_category}</span>
                )}
              </div>
              {tutor.email && <p className="text-sm text-gray-500 mt-1">{tutor.email}</p>}
            </div>
            <Link href={`/admin/tutors/${id}/edit`}>
              <Button icon={Edit} variant="secondary" >Edit</Button>
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Tab bar */}
          <div className="flex overflow-x-auto border-b border-gray-100 no-scrollbar">
            {TABS.map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => switchTab(t.id)}
                  className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${
                    tab === t.id
                      ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={15} />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="p-5 min-h-64">
            {tabLoading && (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!tabLoading && tab === 'bio' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Personal info */}
                <div className="lg:col-span-2 space-y-6">
                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Personal Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                      <InfoRow icon={Mail}     label="Email"        value={tutor.email} />
                      <InfoRow icon={Phone}    label="Phone"        value={tutor.phone_no} />
                      <InfoRow icon={User}     label="Sex"          value={tutor.sex} />
                      <InfoRow icon={Calendar} label="Date of Birth" value={formatDate(tutor.date_of_birth)} />
                      <InfoRow icon={User}     label="Username"     value={tutor.username} />
                      <InfoRow icon={User}     label="User Role"    value={tutor.user_role} />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Address</h3>
                    <InfoRow icon={MapPin} label="Full Address" value={fullAddress || undefined} />
                  </div>

                  {tutor.short_bio && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Bio</h3>
                      <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-4">{tutor.short_bio}</p>
                    </div>
                  )}
                </div>

                {/* Employment & Meta */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Employment</h3>
                    <InfoRow icon={DollarSign} label="Pay Category"    value={tutor.pay_category} />
                    <InfoRow icon={DollarSign} label="Salary"          value={formatCurrency(tutor.salary)} />
                    <InfoRow icon={DollarSign} label="Rate / Hour"     value={formatCurrency(tutor.payrate_per_hour)} />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Record</h3>
                    <InfoRow icon={Calendar} label="Registered"    value={formatDate(tutor.timestamp)} />
                    <InfoRow icon={Calendar} label="Last Updated"  value={formatDate(tutor.last_updated)} />
                  </div>
                </div>
              </div>
            )}

            {!tabLoading && tab === 'sessions' && (
              <div className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatChip label="Total"     value={sessions.length}                                       color="slate" />
                  <StatChip label="Ended"     value={sessions.filter(s => s.status === 'ended').length}     color="green" />
                  <StatChip label="Scheduled" value={sessions.filter(s => s.status === 'scheduled').length} color="blue"  />
                  <StatChip label="Missed"    value={sessions.filter(s => s.status === 'missed').length}    color="red"   />
                </div>

                {sessions.length === 0 ? <EmptyState message="No sessions found for this tutor" /> : (
                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                        <tr>
                          {['Date', 'Student', 'Course', 'Period', 'Session Started', 'Session Ended'].map(h => (
                            <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {sessions.map(s => (
                          <tr key={s.ssid} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3 font-medium text-gray-900">{formatDate(s.start_session_date)}</td>
                            <td className="px-4 py-3 text-gray-600">{s.student_name || '—'}</td>
                            <td className="px-4 py-3 text-gray-600">{s.course_name || '—'}</td>
                            <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                              {s.schedule_start_time && s.schedule_end_time
                                ? `${formatTime(s.schedule_start_time)} – ${formatTime(s.schedule_end_time)}`
                                : '—'}
                            </td>
                            <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                              {s.start_session_time ? formatTime(s.start_session_time) : '—'}
                            </td>
                            <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                              {s.end_session_time ? formatTime(s.end_session_time) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {!tabLoading && tab === 'activities' && (
              <div>
                {activities.length === 0 ? <EmptyState message="No class activities found for this tutor" /> : (
                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                        <tr>
                          {['Date', 'Student', 'Course', 'Topic Taught', 'Observation'].map(h => (
                            <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {activities.map(a => (
                          <tr key={a.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{formatDate(a.class_activity_date)}</td>
                            <td className="px-4 py-3 text-gray-600">{a.student_name || '—'}</td>
                            <td className="px-4 py-3 text-gray-600">{a.course_name || '—'}</td>
                            <td className="px-4 py-3 text-gray-700 max-w-[200px] truncate">{a.topic_taught || '—'}</td>
                            <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">{a.tutors_general_observation || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {!tabLoading && tab === 'students' && (
              <div>
                {students.length === 0 ? <EmptyState message="No students assigned to this tutor" /> : (
                  <>
                    <p className="text-sm text-gray-500 mb-4">{students.length} enrollment{students.length !== 1 ? 's' : ''}</p>
                    <div className="overflow-x-auto rounded-xl border border-gray-100">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                          <tr>
                            {['Student', 'Student ID', 'Course', 'Code', 'Status'].map(h => (
                              <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {students.map(e => (
                            <tr key={e.assign_id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-4 py-3 font-medium text-gray-900">{e.student_name || '—'}</td>
                              <td className="px-4 py-3">
                                <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{e.student_id}</span>
                              </td>
                              <td className="px-4 py-3 text-gray-600">{e.course_name || '—'}</td>
                              <td className="px-4 py-3">
                                {e.course_code && <span className="text-xs font-mono bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">{e.course_code}</span>}
                              </td>
                              <td className="px-4 py-3">{statusBadge(e.entry_status)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {!tabLoading && tab === 'messages' && (
              <div>
                {messages.length === 0 ? <EmptyState message="No messages found for this tutor" /> : (
                  <div className="space-y-3">
                    {messages.map(m => (
                      <div key={m.id} className="flex items-start gap-3 p-4 rounded-xl border border-gray-100 hover:bg-gray-50/50 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <MessageSquare size={14} className="text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-gray-900 truncate">{m.subject || '(No subject)'}</p>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.status === 'unread' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                                {m.status}
                              </span>
                              <span className="text-xs text-gray-400">{formatDate(m.message_date)}</span>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            From: {m.sender || m.sender_student_name || m.sender_parent_name || '—'}
                          </p>
                          {m.body && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{m.body}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!tabLoading && tab === 'payroll' && (
              <div className="space-y-6">
                {/* Pay info */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Pay Structure</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-50 rounded-xl p-4">
                      <p className="text-xs text-gray-400 mb-1">Pay Category</p>
                      <p className="text-lg font-bold text-gray-900">{tutor.pay_category || '—'}</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-4">
                      <p className="text-xs text-gray-400 mb-1">Salary</p>
                      <p className="text-lg font-bold text-green-700">{formatCurrency(tutor.salary)}</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-4">
                      <p className="text-xs text-gray-400 mb-1">Rate / Hour</p>
                      <p className="text-lg font-bold text-blue-700">{formatCurrency(tutor.payrate_per_hour)}</p>
                    </div>
                  </div>
                </div>

                {/* Session hours summary */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Session Summary</h3>
                  {sessions.length === 0 ? (
                    <p className="text-sm text-gray-400 bg-gray-50 rounded-xl p-4">
                      Load the <button onClick={() => switchTab('sessions')} className="text-blue-600 underline">Session Log</button> tab first to calculate earnings.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <StatChip label="Total Sessions"  value={sessions.length}                                    color="slate" />
                        <StatChip label="Completed"       value={endedSessions.length}                              color="green" />
                        <StatChip label="Total Hours"     value={`${totalHours.toFixed(1)}h`}                      color="blue"  />
                        <StatChip label="Est. Earnings"   value={formatCurrency(estimatedEarnings)}                 color="amber" />
                      </div>

                      {/* Session list by date */}
                      <div className="overflow-x-auto rounded-xl border border-gray-100">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                            <tr>
                              {['Date', 'Student', 'Course', 'Duration', 'Rate', 'Session Pay', 'Status'].map(h => (
                                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {sessions.map(s => {
                              const pay = s.status === 'ended' && tutor.payrate_per_hour
                                ? (Number(s.session_duration) || 0) * tutor.payrate_per_hour
                                : null;
                              return (
                                <tr key={s.ssid} className="hover:bg-gray-50/50 transition-colors">
                                  <td className="px-4 py-3 text-gray-900 whitespace-nowrap">{formatDate(s.start_session_date)}</td>
                                  <td className="px-4 py-3 text-gray-600">{s.student_name || '—'}</td>
                                  <td className="px-4 py-3 text-gray-600">{s.course_name || '—'}</td>
                                  <td className="px-4 py-3 text-gray-500">{s.session_duration ? `${s.session_duration}h` : '—'}</td>
                                  <td className="px-4 py-3 text-gray-500">{formatCurrency(tutor.payrate_per_hour)}</td>
                                  <td className="px-4 py-3 font-medium text-green-700">{pay ? formatCurrency(pay) : '—'}</td>
                                  <td className="px-4 py-3">{sessionStatusBadge(s.status)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot className="bg-gray-50 border-t border-gray-200">
                            <tr>
                              <td colSpan={3} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Total</td>
                              <td className="px-4 py-3 font-semibold text-gray-700">{totalHours.toFixed(1)}h</td>
                              <td className="px-4 py-3" />
                              <td className="px-4 py-3 font-bold text-green-700">{formatCurrency(estimatedEarnings)}</td>
                              <td className="px-4 py-3" />
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
