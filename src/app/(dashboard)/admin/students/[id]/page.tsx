'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Avatar from '@/components/ui/Avatar';
import { statusBadge } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import {
  ArrowLeft, Mail, Phone, User, MapPin, Calendar, BookOpen, Video,
  ClipboardList, MessageSquare, GraduationCap, Clock,
  Edit, CheckCircle, AlertCircle, XCircle, FileText, Users, TrendingUp,
} from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils';
import Link from 'next/link';
import toast from 'react-hot-toast';
import AssessmentReport from '@/components/student/AssessmentReport';

type Tab = 'bio' | 'sessions' | 'activities' | 'courses' | 'messages' | 'assessment';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'bio',        label: 'Bio',              icon: User          },
  { id: 'sessions',   label: 'Session Log',       icon: Video         },
  { id: 'activities', label: 'Class Activities',  icon: ClipboardList },
  { id: 'courses',    label: 'Enrolled Courses',  icon: BookOpen      },
  { id: 'messages',   label: 'Messages',          icon: MessageSquare },
  { id: 'assessment', label: 'Assessment Report', icon: TrendingUp    },
];

interface Student {
  student_id: string; enrollment_id: string; user_id: number;
  firstname: string; surname: string; full_name_first_name: string; full_name_last_name: string;
  email: string; username: string; phone_no: string; sex: string;
  grade: string; school: string; date_of_birth: string;
  mothers_name: string; mothers_email: string; fathers_name: string; fathers_email: string;
  address: string; address_line_1: string; address_line_2: string; address_city: string;
  address_state_province: string; address_zip_postal: string; address_country: string;
  short_bio: string; status: string; reason_for_inactive: string;
  user_role: string; entry_status: string; timestamp: string; last_updated: string;
}

interface Session {
  ssid: string; tutor_name: string; course_name: string;
  start_session_date: string; start_session_time: string; end_session_time: string;
  session_duration: number; status: string;
}

interface Activity {
  id: number; ssid: string; tutor_name: string; course_name: string;
  class_activity_date: string; class_activity_time: string; topic_taught: string;
  tutors_general_observation: string;
}

interface Enrollment {
  assign_id: string; course_name: string; course_code: string;
  tutor_name: string; entry_status: string; timestamp: string;
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

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('bio');
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  const [sessions,   setSessions]   = useState<Session[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [courses,    setCourses]    = useState<Enrollment[]>([]);
  const [messages,   setMessages]   = useState<Message[]>([]);
  const [tabLoaded,  setTabLoaded]  = useState<Partial<Record<Tab, boolean>>>({});
  const [tabLoading, setTabLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/students/${id}`)
      .then(r => r.json())
      .then(d => { if (d.student) setStudent(d.student); else toast.error('Student not found'); })
      .catch(() => toast.error('Failed to load student'))
      .finally(() => setLoading(false));
  }, [id]);

  const loadTab = useCallback(async (t: Tab) => {
    if (tabLoaded[t] || t === 'bio' || t === 'assessment') return;
    setTabLoading(true);
    try {
      if (t === 'sessions') {
        const d = await fetch(`/api/sessions?student_id=${id}`).then(r => r.json());
        setSessions(d.sessions || []);
      } else if (t === 'activities') {
        const d = await fetch(`/api/activities?student_id=${id}`).then(r => r.json());
        setActivities(d.activities || []);
      } else if (t === 'courses') {
        const d = await fetch(`/api/enrollments?student_id=${id}`).then(r => r.json());
        setCourses(d.enrollments || []);
      } else if (t === 'messages') {
        const d = await fetch(`/api/messages/student?student_id=${id}`).then(r => r.json());
        setMessages(d.messages || []);
      }
      setTabLoaded(prev => ({ ...prev, [t]: true }));
    } catch { toast.error('Failed to load tab data'); }
    setTabLoading(false);
  }, [id, tabLoaded]);

  const switchTab = (t: Tab) => { setTab(t); loadTab(t); };

  if (loading) return (
    <DashboardLayout title="Student Profile">
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  );

  if (!student) return (
    <DashboardLayout title="Student Profile">
      <div className="text-center py-24 text-gray-400">Student not found.</div>
    </DashboardLayout>
  );

  const fullName = `${student.firstname || ''} ${student.surname || ''}`.trim() || student.email;
  const addressParts = [student.address_line_1, student.address_line_2, student.address_city,
    student.address_state_province, student.address_zip_postal, student.address_country].filter(Boolean);
  const fullAddress = addressParts.join(', ') || student.address;

  return (
    <DashboardLayout title="Student Profile">
      <div className="space-y-5">

        {/* Back */}
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft size={16} /> Back to Students
        </button>

        {/* Profile header */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Avatar name={fullName} size="xl" />
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900">{fullName}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-xs font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{student.student_id}</span>
                {student.enrollment_id && (
                  <span className="text-xs font-mono bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">{student.enrollment_id}</span>
                )}
                {statusBadge(student.status || student.entry_status)}
                {student.grade && (
                  <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">{student.grade}</span>
                )}
              </div>
              {student.email && <p className="text-sm text-gray-500 mt-1">{student.email}</p>}
              {student.school && <p className="text-xs text-gray-400 mt-0.5">{student.school}</p>}
            </div>
            <Link href={`/admin/students/${id}/edit`}>
              <Button icon={Edit} variant="secondary">Edit</Button>
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

            {/* BIO */}
            {!tabLoading && tab === 'bio' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Personal Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                      <InfoRow icon={Mail}          label="Email"          value={student.email} />
                      <InfoRow icon={Phone}         label="Phone"          value={student.phone_no} />
                      <InfoRow icon={User}          label="Sex"            value={student.sex} />
                      <InfoRow icon={Calendar}      label="Date of Birth"  value={formatDate(student.date_of_birth)} />
                      <InfoRow icon={GraduationCap} label="Grade"          value={student.grade} />
                      <InfoRow icon={BookOpen}      label="School"         value={student.school} />
                      <InfoRow icon={User}          label="Username"       value={student.username} />
                      <InfoRow icon={User}          label="Enrollment ID"  value={student.enrollment_id} />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Parent / Guardian</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                      <InfoRow icon={Users} label="Mother's Name"  value={student.mothers_name} />
                      <InfoRow icon={Mail}  label="Mother's Email" value={student.mothers_email} />
                      <InfoRow icon={Users} label="Father's Name"  value={student.fathers_name} />
                      <InfoRow icon={Mail}  label="Father's Email" value={student.fathers_email} />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Address</h3>
                    <InfoRow icon={MapPin} label="Full Address" value={fullAddress || undefined} />
                  </div>

                  {student.short_bio && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Bio</h3>
                      <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-4">{student.short_bio}</p>
                    </div>
                  )}
                </div>

                {/* Status & Meta */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Status</h3>
                    <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                      <div>
                        <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Account Status</p>
                        {statusBadge(student.status || student.entry_status)}
                      </div>
                      {student.reason_for_inactive && (
                        <div>
                          <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Reason</p>
                          <p className="text-sm text-gray-700">{student.reason_for_inactive}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Record</h3>
                    <InfoRow icon={Calendar} label="Registered"   value={formatDate(student.timestamp)} />
                    <InfoRow icon={Calendar} label="Last Updated" value={formatDate(student.last_updated)} />
                  </div>
                </div>
              </div>
            )}

            {/* SESSION LOG */}
            {!tabLoading && tab === 'sessions' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatChip label="Total"     value={sessions.length}                                       color="slate" />
                  <StatChip label="Completed" value={sessions.filter(s => s.status === 'ended').length}     color="green" />
                  <StatChip label="Scheduled" value={sessions.filter(s => s.status === 'scheduled').length} color="blue"  />
                  <StatChip label="Missed"    value={sessions.filter(s => s.status === 'missed').length}    color="red"   />
                </div>

                {sessions.length === 0 ? <EmptyState message="No sessions found for this student" /> : (
                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                        <tr>
                          {['Date', 'Tutor', 'Course', 'Time', 'Duration', 'Status'].map(h => (
                            <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {sessions.map(s => (
                          <tr key={s.ssid} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3 font-medium text-gray-900">{formatDate(s.start_session_date)}</td>
                            <td className="px-4 py-3 text-gray-600">{s.tutor_name || '—'}</td>
                            <td className="px-4 py-3 text-gray-600">{s.course_name || '—'}</td>
                            <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                              {s.start_session_time ? formatTime(s.start_session_time) : '—'}
                            </td>
                            <td className="px-4 py-3 text-gray-500">
                              {s.session_duration ? `${s.session_duration}h` : '—'}
                            </td>
                            <td className="px-4 py-3">{sessionStatusBadge(s.status)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* CLASS ACTIVITIES */}
            {!tabLoading && tab === 'activities' && (
              <div>
                {activities.length === 0 ? <EmptyState message="No class activities found for this student" /> : (
                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                        <tr>
                          {['Date', 'Tutor', 'Course', 'Topic Taught', 'Observation'].map(h => (
                            <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {activities.map(a => (
                          <tr key={a.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{formatDate(a.class_activity_date)}</td>
                            <td className="px-4 py-3 text-gray-600">{a.tutor_name || '—'}</td>
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

            {/* ENROLLED COURSES */}
            {!tabLoading && tab === 'courses' && (
              <div>
                {courses.length === 0 ? <EmptyState message="No courses enrolled for this student" /> : (
                  <>
                    <p className="text-sm text-gray-500 mb-4">{courses.length} course{courses.length !== 1 ? 's' : ''} enrolled</p>
                    <div className="overflow-x-auto rounded-xl border border-gray-100">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                          <tr>
                            {['Course', 'Code', 'Tutor', 'Enrolled On', 'Status'].map(h => (
                              <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {courses.map(e => (
                            <tr key={e.assign_id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-4 py-3 font-medium text-gray-900">{e.course_name || '—'}</td>
                              <td className="px-4 py-3">
                                {e.course_code && (
                                  <span className="text-xs font-mono bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">{e.course_code}</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-gray-600">{e.tutor_name || '—'}</td>
                              <td className="px-4 py-3 text-gray-500">{formatDate(e.timestamp)}</td>
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

            {/* MESSAGES */}
            {!tabLoading && tab === 'messages' && (
              <div>
                {messages.length === 0 ? <EmptyState message="No messages found for this student" /> : (
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
                          <p className="text-xs text-gray-500 mt-0.5">From: {m.sender || '—'}</p>
                          {m.body && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{m.body}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ASSESSMENT REPORT */}
            {!tabLoading && tab === 'assessment' && (
              <AssessmentReport studentId={id} />
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
