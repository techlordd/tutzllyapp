'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Avatar from '@/components/ui/Avatar';
import { statusBadge } from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import {
  ArrowLeft, Mail, Phone, User, MapPin, Calendar, BookOpen, Video,
  ClipboardList, GraduationCap, CheckCircle, AlertCircle, XCircle,
  FileText, Users, BarChart3, ChevronLeft, ChevronRight, TrendingUp, Eye, Printer,
} from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils';
import toast from 'react-hot-toast';
import AssessmentReport from '@/components/student/AssessmentReport';

type Tab = 'bio' | 'sessions' | 'activities' | 'courses' | 'grades' | 'assessment';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'bio',        label: 'Bio',              icon: User          },
  { id: 'sessions',   label: 'Session Log',       icon: Video         },
  { id: 'activities', label: 'Class Activities',  icon: ClipboardList },
  { id: 'courses',    label: 'Enrolled Courses',  icon: BookOpen      },
  { id: 'grades',     label: 'Grade Book',        icon: BarChart3     },
  { id: 'assessment', label: 'Assessment Report', icon: TrendingUp    },
];

const PAGE_SIZE = 10;

interface Student {
  student_id: string; enrollment_id: string;
  firstname: string; surname: string;
  email: string; username: string; phone_no: string; sex: string;
  grade: string; school: string; date_of_birth: string;
  mothers_name: string; mothers_email: string; fathers_name: string; fathers_email: string;
  address: string; address_line_1: string; address_line_2: string; address_city: string;
  address_state_province: string; address_zip_postal: string; address_country: string;
  short_bio: string; status: string; reason_for_inactive: string;
  entry_status: string; timestamp: string; last_updated: string;
}

interface Session {
  ssid: string; tutor_name: string; course_name: string;
  start_session_date: string; schedule_start_time: string; schedule_end_time: string;
  start_session_time: string; end_session_time: string; status: string;
}

interface Activity {
  id: number; ssid: string; tutor_name: string; course_name: string;
  class_activity_date: string; class_activity_time: string; topic_taught: string;
  details_of_class_activity: string; activity: string;
  assigned_homework_from_prev: string; status_of_past_homework_review: string;
  new_homework_assigned: string; topic_of_homework: string; no_homework_why: string;
  did_student_complete_prev_homework: string; student_reason_for_not_completing: string;
  did_student_join_on_time: string; student_reason_for_late: string;
  student_engages_in_class: string; is_student_attentive: string;
  tutors_general_observation: string; tutors_intervention: string;
}

interface Enrollment {
  assign_id: string; course_name: string; course_code: string;
  tutor_name: string; entry_status: string; timestamp: string;
}

interface Grade {
  record_id: number; course_name: string; tutor_name: string; student_name: string;
  month: string; year: string;
  punctuality: number; attentiveness: number; engagement: number;
  homework: number; test_score: number; remarks: string; status: string;
}

interface Branding {
  logo_url?: string; academy_name?: string; site_title?: string;
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

function Paginator({ total, page, onPage }: { total: number; page: number; onPage: (p: number) => void }) {
  const totalPages = Math.ceil(total / PAGE_SIZE);
  if (totalPages <= 1) return null;
  const from = (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  return (
    <div className="flex items-center justify-between pt-3 px-1">
      <p className="text-xs text-gray-400">Showing {from}–{to} of {total}</p>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(page - 1)} disabled={page === 1}
          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600 transition-colors">
          <ChevronLeft size={15} />
        </button>
        <span className="text-xs text-gray-500 px-2">{page} / {totalPages}</span>
        <button onClick={() => onPage(page + 1)} disabled={page === totalPages}
          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600 transition-colors">
          <ChevronRight size={15} />
        </button>
      </div>
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

export default function TutorStudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore(state => state.user);
  const [tab, setTab] = useState<Tab>('bio');
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  const [sessions,        setSessions]        = useState<Session[]>([]);
  const [activities,      setActivities]      = useState<Activity[]>([]);
  const [courses,         setCourses]         = useState<Enrollment[]>([]);
  const [grades,          setGrades]          = useState<Grade[]>([]);
  const [tabLoaded,       setTabLoaded]       = useState<Partial<Record<Tab, boolean>>>({});
  const [tabLoading,      setTabLoading]      = useState(false);
  const [selectedActivity,setSelectedActivity]= useState<Activity | null>(null);
  const [selectedGrade,   setSelectedGrade]   = useState<Grade | null>(null);
  const [branding,        setBranding]        = useState<Branding | null>(null);

  const [pages, setPages] = useState<Record<Tab, number>>({
    bio: 1, sessions: 1, activities: 1, courses: 1, grades: 1, assessment: 1,
  });

  useEffect(() => {
    fetch(`/api/students/${id}`)
      .then(r => r.json())
      .then(d => { if (d.student) setStudent(d.student); else toast.error('Student not found'); })
      .catch(() => toast.error('Failed to load student'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetch('/api/branding').then(r => r.json()).then(d => setBranding(d.academy || d)).catch(() => {});
  }, []);

  const loadTab = useCallback(async (t: Tab) => {
    if (tabLoaded[t] || t === 'bio' || t === 'assessment') return;
    // Don't fetch tabs that need tutor identity if user hasn't hydrated yet
    if (!user?.user_id && (t === 'sessions' || t === 'activities' || t === 'grades')) return;
    setTabLoading(true);
    try {
      if (t === 'sessions') {
        const d = await fetch(`/api/sessions?student_id=${id}&tutor_id=${user?.user_id}`).then(r => r.json());
        setSessions(d.sessions || []);
      } else if (t === 'activities') {
        const d = await fetch(`/api/activities?student_id=${id}&tutor_id=${user?.user_id}`).then(r => r.json());
        setActivities(d.activities || []);
      } else if (t === 'courses') {
        const d = await fetch(`/api/enrollments?student_id=${id}`).then(r => r.json());
        setCourses(d.enrollments || []);
      } else if (t === 'grades') {
        const d = await fetch(`/api/grades?student_id=${id}&tutor_id=${user?.user_id}`).then(r => r.json());
        setGrades(d.grades || []);
      }
      setTabLoaded(prev => ({ ...prev, [t]: true }));
    } catch { toast.error('Failed to load tab data'); }
    setTabLoading(false);
  }, [id, tabLoaded, user?.user_id]);

  // Re-trigger active tab load once user hydrates from localStorage
  useEffect(() => {
    if (user?.user_id && !tabLoaded[tab] && tab !== 'bio' && tab !== 'assessment') {
      loadTab(tab);
    }
  }, [user?.user_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const switchTab = (t: Tab) => {
    setTab(t);
    setPages(prev => ({ ...prev, [t]: 1 }));
    loadTab(t);
  };

  const setPage = (t: Tab, p: number) => setPages(prev => ({ ...prev, [t]: p }));

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

  const pagedSessions   = sessions.slice((pages.sessions - 1) * PAGE_SIZE, pages.sessions * PAGE_SIZE);
  const pagedActivities = activities.slice((pages.activities - 1) * PAGE_SIZE, pages.activities * PAGE_SIZE);
  const pagedCourses    = courses.slice((pages.courses - 1) * PAGE_SIZE, pages.courses * PAGE_SIZE);
  const pagedGrades     = grades.slice((pages.grades - 1) * PAGE_SIZE, pages.grades * PAGE_SIZE);

  return (
    <DashboardLayout title="Student Profile">
      <div className="space-y-5">

        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft size={16} /> Back to My Students
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
                      ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                  }`}>
                  <Icon size={15} /> {t.label}
                </button>
              );
            })}
          </div>

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
                      <InfoRow icon={Mail}          label="Email"         value={student.email} />
                      <InfoRow icon={Phone}         label="Phone"         value={student.phone_no} />
                      <InfoRow icon={User}          label="Sex"           value={student.sex} />
                      <InfoRow icon={Calendar}      label="Date of Birth" value={formatDate(student.date_of_birth)} />
                      <InfoRow icon={GraduationCap} label="Grade"         value={student.grade} />
                      <InfoRow icon={BookOpen}      label="School"        value={student.school} />
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
                  <>
                    <div className="overflow-x-auto rounded-xl border border-gray-100">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                          <tr>{['Date','Tutor','Course','Period','Session Started','Session Ended'].map(h => (
                            <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                          ))}</tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {pagedSessions.map(s => (
                            <tr key={s.ssid} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-4 py-3 font-medium text-gray-900">{formatDate(s.start_session_date)}</td>
                              <td className="px-4 py-3 text-gray-600">{s.tutor_name || '—'}</td>
                              <td className="px-4 py-3 text-gray-600">{s.course_name || '—'}</td>
                              <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                                {s.schedule_start_time && s.schedule_end_time
                                  ? `${formatTime(s.schedule_start_time)} – ${formatTime(s.schedule_end_time)}`
                                  : '—'}
                              </td>
                              <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{s.start_session_time ? formatTime(s.start_session_time) : '—'}</td>
                              <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{s.end_session_time ? formatTime(s.end_session_time) : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <Paginator total={sessions.length} page={pages.sessions} onPage={p => setPage('sessions', p)} />
                  </>
                )}
              </div>
            )}

            {/* CLASS ACTIVITIES */}
            {!tabLoading && tab === 'activities' && (
              <div>
                {activities.length === 0 ? <EmptyState message="No class activities found for this student" /> : (
                  <>
                    <div className="overflow-x-auto rounded-xl border border-gray-100">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                          <tr>
                            {['Date','Tutor','Course','Topic Taught'].map(h => (
                              <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                            ))}
                            <th className="px-4 py-3 text-right font-medium">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {pagedActivities.map(a => (
                            <tr key={a.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{formatDate(a.class_activity_date)}</td>
                              <td className="px-4 py-3 text-gray-600">{a.tutor_name || '—'}</td>
                              <td className="px-4 py-3 text-gray-600">{a.course_name || '—'}</td>
                              <td className="px-4 py-3 text-gray-700 max-w-[200px] truncate">{a.topic_taught || '—'}</td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => setSelectedActivity(a)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-white hover:bg-blue-600 hover:text-white hover:border-blue-600 text-blue-600 transition-all text-xs font-semibold shadow-sm"
                                >
                                  <Eye size={12} /> View Details
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <Paginator total={activities.length} page={pages.activities} onPage={p => setPage('activities', p)} />
                  </>
                )}
              </div>
            )}

            {/* ACTIVITY DETAILS MODAL */}
            <Modal
              isOpen={!!selectedActivity}
              onClose={() => setSelectedActivity(null)}
              title="Class Activity Details"
              size="lg"
            >
              {selectedActivity && (() => {
                const rows: { label: string; value: string | null | undefined }[] = [
                  { label: 'Date',                                          value: formatDate(selectedActivity.class_activity_date) },
                  { label: 'Time',                                          value: selectedActivity.class_activity_time ? formatTime(selectedActivity.class_activity_time) : null },
                  { label: 'Tutor',                                         value: selectedActivity.tutor_name },
                  { label: 'Course',                                        value: selectedActivity.course_name },
                  { label: 'Topic Taught',                                  value: selectedActivity.topic_taught },
                  { label: 'Details of Class Activity',                     value: selectedActivity.details_of_class_activity },
                  { label: 'Activity',                                      value: selectedActivity.activity },
                  { label: 'Assigned Homework from Previous Session?',      value: selectedActivity.assigned_homework_from_prev },
                  { label: 'Status of Past Homework Review',                value: selectedActivity.status_of_past_homework_review },
                  { label: 'New Homework Assigned for Current Session?',    value: selectedActivity.new_homework_assigned },
                  { label: 'Topic of Homework Assigned',                    value: selectedActivity.topic_of_homework },
                  { label: 'No Homework Why?',                              value: selectedActivity.no_homework_why },
                  { label: 'Did Student Complete Previous Homework?',       value: selectedActivity.did_student_complete_prev_homework },
                  { label: 'Student Reason for Not Completing Homework',    value: selectedActivity.student_reason_for_not_completing },
                  { label: 'Did Student Join Session on Time?',             value: selectedActivity.did_student_join_on_time },
                  { label: 'Reason for Not Joining Session on Time',        value: selectedActivity.student_reason_for_late },
                  { label: 'Student Engage in Class?',                      value: selectedActivity.student_engages_in_class },
                  { label: 'Student Attentive in Class?',                   value: selectedActivity.is_student_attentive },
                  { label: "Tutor's General Observation",                   value: selectedActivity.tutors_general_observation },
                  { label: "Tutor's Intervention / Action",                 value: selectedActivity.tutors_intervention },
                ];
                return (
                  <div className="overflow-hidden rounded-xl border border-gray-100">
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-gray-100">
                        {rows.map(({ label, value }) => (
                          <tr key={label} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3 font-semibold text-gray-700 w-1/2 align-top">{label}</td>
                            <td className="px-4 py-3 text-gray-600 align-top whitespace-pre-wrap">{value || <span className="text-gray-300">—</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </Modal>

            {/* ENROLLED COURSES */}
            {!tabLoading && tab === 'courses' && (
              <div>
                {courses.length === 0 ? <EmptyState message="No courses enrolled for this student" /> : (
                  <>
                    <p className="text-sm text-gray-500 mb-4">{courses.length} course{courses.length !== 1 ? 's' : ''} enrolled</p>
                    <div className="overflow-x-auto rounded-xl border border-gray-100">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                          <tr>{['Course','Code','Tutor','Enrolled On','Status'].map(h => (
                            <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                          ))}</tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {pagedCourses.map(e => (
                            <tr key={e.assign_id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-4 py-3 font-medium text-gray-900">{e.course_name || '—'}</td>
                              <td className="px-4 py-3">
                                {e.course_code && <span className="text-xs font-mono bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">{e.course_code}</span>}
                              </td>
                              <td className="px-4 py-3 text-gray-600">{e.tutor_name || '—'}</td>
                              <td className="px-4 py-3 text-gray-500">{formatDate(e.timestamp)}</td>
                              <td className="px-4 py-3">{statusBadge(e.entry_status)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <Paginator total={courses.length} page={pages.courses} onPage={p => setPage('courses', p)} />
                  </>
                )}
              </div>
            )}

            {/* GRADE BOOK */}
            {!tabLoading && tab === 'grades' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <StatChip label="Total Entries" value={grades.length}                                        color="slate" />
                  <StatChip label="Approved"      value={grades.filter(g => g.status === 'approved').length}  color="green" />
                  <StatChip label="Pending"       value={grades.filter(g => g.status === 'pending').length}   color="amber" />
                </div>
                {grades.length === 0 ? <EmptyState message="No grade entries found for this student" /> : (
                  <>
                    <div className="overflow-x-auto rounded-xl border border-gray-100">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                          <tr>{['Period','Course','Tutor','Punct.','Attend.','Engage.','H/Work','Test','Avg','Action'].map(h => (
                            <th key={h} className={`px-4 py-3 text-left font-medium${h === 'Action' ? ' text-right' : ''}`}>{h}</th>
                          ))}</tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {pagedGrades.map(g => {
                            const scores = [g.punctuality, g.attentiveness, g.engagement, g.homework, g.test_score]
                              .map(v => parseFloat(String(v))).filter(v => !isNaN(v));
                            const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '—';
                            return (
                              <tr key={g.record_id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{g.month} {g.year}</td>
                                <td className="px-4 py-3 text-gray-600">{g.course_name || '—'}</td>
                                <td className="px-4 py-3 text-gray-600">{g.tutor_name || '—'}</td>
                                <td className="px-4 py-3 text-gray-500">{g.punctuality != null ? `${parseFloat(String(g.punctuality))}%` : '—'}</td>
                                <td className="px-4 py-3 text-gray-500">{g.attentiveness != null ? `${parseFloat(String(g.attentiveness))}%` : '—'}</td>
                                <td className="px-4 py-3 text-gray-500">{g.engagement != null ? `${parseFloat(String(g.engagement))}%` : '—'}</td>
                                <td className="px-4 py-3 text-gray-500">{g.homework != null ? `${parseFloat(String(g.homework))}%` : '—'}</td>
                                <td className="px-4 py-3 text-gray-500">{g.test_score != null ? `${parseFloat(String(g.test_score))}%` : '—'}</td>
                                <td className="px-4 py-3 font-semibold text-blue-600">{avg}{avg !== '—' ? '%' : ''}</td>
                                <td className="px-4 py-3 text-right">
                                  <button
                                    onClick={() => setSelectedGrade(g)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-white hover:bg-blue-600 hover:text-white hover:border-blue-600 text-blue-600 transition-all text-xs font-semibold shadow-sm"
                                  >
                                    <Eye size={12} /> Details
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <Paginator total={grades.length} page={pages.grades} onPage={p => setPage('grades', p)} />
                  </>
                )}
              </div>
            )}

            {/* GRADEBOOK PRINT MODAL */}
            {selectedGrade && (() => {
              const g = selectedGrade;
              const prev = grades.find(x =>
                x.course_name === g.course_name &&
                x.record_id !== g.record_id &&
                (Number(x.year) < Number(g.year) ||
                  (Number(x.year) === Number(g.year) &&
                    ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(x.month) <
                    ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(g.month)))
              );
              const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
              const monthIndex = MONTHS.indexOf(g.month);
              const sessionsThisMonth = sessions.filter(s => {
                if (!s.start_session_date) return false;
                const d = new Date(s.start_session_date);
                return d.getFullYear() === Number(g.year) && d.getMonth() === monthIndex;
              });
              const expected   = sessionsThisMonth.length || 0;
              const attended   = sessionsThisMonth.filter(s => s.status === 'ended').length;
              const missed     = sessionsThisMonth.filter(s => s.status === 'missed').length;
              const rescheduled= sessionsThisMonth.filter(s => s.status === 'rescheduled').length;

              const metrics: { label: string; curr: number | null; prevVal: number | null }[] = [
                { label: 'Punctuality',      curr: g.punctuality != null ? parseFloat(String(g.punctuality)) : null,    prevVal: prev?.punctuality  != null ? parseFloat(String(prev.punctuality))  : null },
                { label: 'Attentiveness',    curr: g.attentiveness != null ? parseFloat(String(g.attentiveness)) : null, prevVal: prev?.attentiveness != null ? parseFloat(String(prev.attentiveness)) : null },
                { label: 'Class Engagement', curr: g.engagement != null ? parseFloat(String(g.engagement)) : null,      prevVal: prev?.engagement != null ? parseFloat(String(prev.engagement)) : null },
                { label: 'Homework',         curr: g.homework != null ? parseFloat(String(g.homework)) : null,          prevVal: prev?.homework != null ? parseFloat(String(prev.homework)) : null },
                { label: 'Test Score',       curr: g.test_score != null ? parseFloat(String(g.test_score)) : null,      prevVal: prev?.test_score != null ? parseFloat(String(prev.test_score)) : null },
              ];

              const handlePrint = () => {
                const logoHtml = branding?.logo_url
                  ? `<img src="${branding.logo_url}" alt="logo" style="height:40px;object-fit:contain;" />`
                  : `<div style="width:80px;height:40px;background:#e5e7eb;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;color:#9ca3af;">${branding?.academy_name || branding?.site_title || 'Academy'}</div>`;
                const metricsRows = metrics.map(m => {
                  const tracker = m.prevVal != null && m.curr != null
                    ? m.curr >= m.prevVal
                      ? `<span style="color:#16a34a">&#8593; ${m.curr}%</span>`
                      : `<span style="color:#dc2626">&#8595; ${m.curr}%</span>`
                    : m.curr != null ? `<span style="color:#16a34a">&#8593; ${m.curr}%</span>` : '—';
                  return `<tr>
                    <td style="padding:8px 12px;font-weight:600;border-bottom:1px solid #e5e7eb;">${m.label}</td>
                    <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${m.curr != null ? m.curr + '%' : '—'}</td>
                    <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${m.prevVal != null ? m.prevVal + '%' : ''}</td>
                    <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${tracker}</td>
                  </tr>`;
                }).join('');
                const w = window.open('', '_blank', 'width=900,height=700');
                if (!w) return;
                w.document.write(`<!DOCTYPE html><html><head><title>Gradebook</title>
                <style>body{font-family:Arial,sans-serif;margin:0;padding:24px;color:#111;}
                  table{width:100%;border-collapse:collapse;}
                  th{background:#f3f4f6;padding:8px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#6b7280;}
                  .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0;}
                  .stat-cell{border:1px solid #e5e7eb;padding:12px;text-align:center;border-radius:4px;}
                  .stat-label{font-size:11px;color:#6b7280;}
                  .stat-val{font-size:22px;font-weight:700;margin-top:4px;}
                  .print-btn{display:block;width:100%;padding:12px;background:#3b82f6;color:#fff;border:none;cursor:pointer;font-size:14px;margin-top:24px;}
                  @media print{.print-btn{display:none;}}</style></head><body>
                <div style="display:flex;align-items:center;margin-bottom:16px;">${logoHtml}</div>
                <div style="text-align:center;margin-bottom:16px;">
                  <h2 style="margin:0;font-size:22px;">Gradebook</h2>
                  <p style="margin:4px 0;color:#555;">(${g.month} ${g.year})</p>
                  <p style="margin:0;font-weight:600;">${g.student_name || fullName}</p>
                </div>
                <div class="stats">
                  <div class="stat-cell" style="background:#eff6ff;"><div class="stat-label">Expected Sessions</div><div class="stat-val">${expected}</div></div>
                  <div class="stat-cell" style="background:#f0fdf4;"><div class="stat-label">Sessions Attended</div><div class="stat-val">${attended}</div></div>
                  <div class="stat-cell" style="background:#fff1f2;"><div class="stat-label">Sessions Missed</div><div class="stat-val">${missed}</div></div>
                  <div class="stat-cell" style="background:#fffbeb;"><div class="stat-label">Rescheduled</div><div class="stat-val">${rescheduled}</div></div>
                </div>
                <table><thead><tr>
                  <th>${g.course_name}</th><th>Current</th><th>Previous</th><th>Tracker</th>
                </tr></thead><tbody>${metricsRows}</tbody></table>
                ${g.remarks ? `<div style="margin-top:16px;"><p style="color:#dc2626;font-size:13px;margin-bottom:4px;">Remarks:</p><p style="font-size:13px;line-height:1.6;">${g.remarks}</p></div>` : ''}
                <p style="margin-top:16px;font-weight:600;">Tutor: <span style="font-weight:400;">${g.tutor_name || '—'}</span></p>
                <button class="print-btn" onclick="window.print()">Print Gradebook</button>
                </body></html>`);
                w.document.close();
              };

              return (
                <Modal isOpen={true} onClose={() => setSelectedGrade(null)} title="Gradebook" size="xl">
                  <div className="space-y-4">
                    {/* Preview header */}
                    <div className="flex items-center gap-3">
                      {branding?.logo_url
                        ? <img src={branding.logo_url} alt="logo" className="h-10 object-contain" />
                        : <div className="h-10 px-3 bg-gray-100 rounded-lg flex items-center text-xs text-gray-400 font-medium">{branding?.academy_name || branding?.site_title || 'Academy'}</div>
                      }
                    </div>
                    <div className="text-center">
                      <h3 className="text-xl font-bold text-gray-900">Gradebook</h3>
                      <p className="text-sm text-gray-500">({g.month} {g.year})</p>
                      <p className="text-sm font-semibold text-gray-800">{g.student_name || fullName}</p>
                    </div>
                    {/* Session stats */}
                    <div className="grid grid-cols-4 gap-3">
                      {[['Expected Sessions', expected,'bg-blue-50 border-blue-100'],['Sessions Attended', attended,'bg-green-50 border-green-100'],['Sessions Missed', missed,'bg-red-50 border-red-100'],['Rescheduled', rescheduled,'bg-amber-50 border-amber-100']].map(([label,val,cls]) => (
                        <div key={label as string} className={`border rounded-lg p-3 text-center ${cls}`}>
                          <p className="text-xs text-gray-500">{label as string}</p>
                          <p className="text-2xl font-bold text-gray-900 mt-1">{val as number}</p>
                        </div>
                      ))}
                    </div>
                    {/* Metrics table */}
                    <div className="overflow-hidden rounded-xl border border-gray-100">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{g.course_name}</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Current</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Previous</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Tracker</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {metrics.map(m => {
                            const up = m.prevVal == null || (m.curr != null && m.curr >= m.prevVal);
                            const arrow = m.curr != null ? (up ? '↑' : '↓') : '';
                            const arrowCls = up ? 'text-green-600' : 'text-red-500';
                            return (
                              <tr key={m.label} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-4 py-3 font-semibold text-gray-800">{m.label}</td>
                                <td className="px-4 py-3 text-gray-600">{m.curr != null ? `${m.curr}%` : '—'}</td>
                                <td className="px-4 py-3 text-gray-400">{m.prevVal != null ? `${m.prevVal}%` : ''}</td>
                                <td className={`px-4 py-3 font-semibold ${arrowCls}`}>{arrow} {m.curr != null ? `${m.curr}%` : ''}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {g.remarks && (
                      <div>
                        <p className="text-xs font-semibold text-red-500 mb-1">Remarks:</p>
                        <p className="text-sm text-gray-700 leading-relaxed">{g.remarks}</p>
                      </div>
                    )}
                    <p className="text-sm"><span className="font-semibold">Tutor:</span> {g.tutor_name || '—'}</p>
                    {/* Print button */}
                    <button
                      onClick={handlePrint}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
                    >
                      <Printer size={16} /> Print Gradebook
                    </button>
                  </div>
                </Modal>
              );
            })()}

            {/* ASSESSMENT REPORT */}
            {!tabLoading && tab === 'assessment' && (
              <AssessmentReport studentId={id} tutorId={user?.user_id} />
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
