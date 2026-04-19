'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Button from '@/components/ui/Button';
import { statusBadge } from '@/components/ui/Badge';
import {
  ArrowLeft, Edit, User, GraduationCap, BookOpen,
  Calendar, Clock, Globe, Video, Copy, CheckCheck, Hash, Mail, Key,
} from 'lucide-react';
import { formatTime } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Session {
  ssid: string; schedule_id: string;
  tutor_id: string; tutor_firstname: string; tutor_lastname: string;
  student_id: string; student_name: string; student_email: string;
  email_lookup_student_id: string; confirmation: string;
  course_name: string; course_id_ref: string;
  entry_date: string; day: string;
  schedule_start_time: string; schedule_end_time: string; schedule_day: string;
  start_session_date: string; start_session_time: string; start_session_confirmation: string;
  end_session_date: string; end_session_time: string; end_session_confirmation: string;
  session_duration: number; status: string; status_admin: string; session_code_status: string;
  zoom_link: string; meeting_id: string; meeting_passcode: string;
  reschedule_to: string; reschedule_time: string;
  mothers_email: string; fathers_email: string;
  missed_session_id1: string; missed_schedule_id1: string; missed_status1: string;
  missed_tutor_id1: string; missed_tutor_firstname1: string; missed_tutor_lastname1: string;
  missed_student_name1: string; missed_course1: string; missed_course_id1: string; missed_session_code_status1: string;
  missed_session_id2: string; missed_schedule_id2: string; missed_status2: string;
  missed_tutor_id2: string; missed_tutor_firstname2: string; missed_tutor_lastname2: string;
  missed_student_name2: string; missed_course2: string; missed_course_id2: string; missed_session_code_status2: string;
  entry_status: string; timestamp: string; last_updated: string;
  created_by: string; updated_by: string; ip: string; record_key: string;
}

function InfoCard({ icon: Icon, label, value, mono = false }: {
  icon: React.ElementType; label: string; value?: string | number | null; mono?: boolean;
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

function formatDate(val?: string | null) {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? val : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/sessions/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.session) setSession(data.session);
        else { toast.error('Session not found'); router.push('/admin/sessions'); }
      })
      .catch(() => { toast.error('Failed to load session'); router.push('/admin/sessions'); })
      .finally(() => setLoading(false));
  }, [id, router]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  if (loading) {
    return (
      <DashboardLayout title="Session Detail">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!session) return null;

  const hasMissed1 = session.missed_session_id1 || session.missed_schedule_id1;
  const hasMissed2 = session.missed_session_id2 || session.missed_schedule_id2;

  return (
    <DashboardLayout title="Session Detail">
      <div className="max-w-4xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/admin/sessions')}
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Session Detail</h1>
              <p className="text-xs text-gray-400 font-mono mt-0.5">{session.ssid}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {statusBadge(session.status)}
            <Button icon={Edit} variant="secondary"
              onClick={() => router.push(`/admin/sessions?edit=${session.ssid}`)}>
              Edit
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Student */}
          <Card>
            <SectionTitle>Student</SectionTitle>
            <div className="space-y-4">
              <InfoCard icon={User}  label="Student Name"  value={session.student_name} />
              <InfoCard icon={Hash}  label="Student ID"    value={session.student_id} mono />
              <InfoCard icon={Mail}  label="Student Email" value={session.student_email} />
              <InfoCard icon={Hash}  label="Email Lookup (Student ID)" value={session.email_lookup_student_id} mono />
              <InfoCard icon={Globe} label="Confirmation"  value={session.confirmation} />
            </div>
          </Card>

          {/* Tutor */}
          <Card>
            <SectionTitle>Tutor</SectionTitle>
            <div className="space-y-4">
              <InfoCard icon={GraduationCap} label="Tutor Name"
                value={[session.tutor_firstname, session.tutor_lastname].filter(Boolean).join(' ')} />
              <InfoCard icon={Hash} label="Tutor ID" value={session.tutor_id} mono />
            </div>
          </Card>

          {/* Course & Schedule */}
          <Card>
            <SectionTitle>Course & Schedule</SectionTitle>
            <div className="space-y-4">
              <InfoCard icon={BookOpen} label="Course"        value={session.course_name} />
              <InfoCard icon={Hash}     label="Course ID Ref" value={session.course_id_ref} mono />
              <InfoCard icon={Hash}     label="Schedule ID"   value={session.schedule_id} mono />
              <InfoCard icon={Calendar} label="Entry Date"    value={formatDate(session.entry_date)} />
              <InfoCard icon={Calendar} label="Day"           value={session.day} />
              <InfoCard icon={Calendar} label="Schedule Day"  value={session.schedule_day} />
              <InfoCard icon={Clock}    label="Schedule Time" value={
                session.schedule_start_time
                  ? `${formatTime(session.schedule_start_time)} – ${formatTime(session.schedule_end_time)}`
                  : undefined
              } />
            </div>
          </Card>

          {/* Session Times */}
          <Card>
            <SectionTitle>Session Times</SectionTitle>
            <div className="space-y-4">
              <InfoCard icon={Calendar} label="Start Date"     value={formatDate(session.start_session_date)} />
              <InfoCard icon={Clock}    label="Start Time"     value={formatTime(session.start_session_time)} />
              <InfoCard icon={Globe}    label="Start Confirmation" value={session.start_session_confirmation} />
              <InfoCard icon={Calendar} label="End Date"       value={formatDate(session.end_session_date)} />
              <InfoCard icon={Clock}    label="End Time"       value={formatTime(session.end_session_time)} />
              <InfoCard icon={Globe}    label="End Confirmation" value={session.end_session_confirmation} />
              <InfoCard icon={Clock}    label="Duration"       value={session.session_duration ? `${session.session_duration}` : undefined} />
              <InfoCard icon={Calendar} label="Reschedule To"  value={formatDate(session.reschedule_to)} />
              <InfoCard icon={Clock}    label="Reschedule Time" value={formatTime(session.reschedule_time)} />
            </div>
          </Card>

          {/* Status & Zoom */}
          <Card>
            <SectionTitle>Status & Zoom</SectionTitle>
            <div className="space-y-4">
              <InfoCard icon={Globe} label="Status"            value={session.status} />
              <InfoCard icon={Globe} label="Status (Admin)"    value={session.status_admin} />
              <InfoCard icon={Hash}  label="Session Code Status" value={session.session_code_status} />
              {session.zoom_link ? (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Video size={15} className="text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 mb-0.5">Zoom Link</p>
                    <div className="flex items-center gap-2">
                      <a href={session.zoom_link} target="_blank" rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline truncate">{session.zoom_link}</a>
                      <button onClick={() => copyToClipboard(session.zoom_link, 'link')}
                        className="flex-shrink-0 p-1 rounded hover:bg-gray-100 text-gray-400 transition-colors">
                        {copied === 'link' ? <CheckCheck size={13} className="text-green-500" /> : <Copy size={13} />}
                      </button>
                    </div>
                  </div>
                </div>
              ) : <InfoCard icon={Video} label="Zoom Link" value={null} />}
              <InfoCard icon={Hash}  label="Meeting ID"       value={session.meeting_id} mono />
              <InfoCard icon={Hash}  label="Meeting Passcode" value={session.meeting_passcode} mono />
            </div>
          </Card>

          {/* Notifications */}
          <Card>
            <SectionTitle>Notifications</SectionTitle>
            <div className="space-y-4">
              <InfoCard icon={Mail} label="Mother's Email" value={session.mothers_email} />
              <InfoCard icon={Mail} label="Father's Email" value={session.fathers_email} />
            </div>
          </Card>

        </div>

        {/* Missed Sessions */}
        {(hasMissed1 || hasMissed2) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {hasMissed1 && (
              <Card>
                <SectionTitle>Missed Session 1</SectionTitle>
                <div className="space-y-4">
                  <InfoCard icon={Hash}          label="Session Missed ID" value={session.missed_session_id1} mono />
                  <InfoCard icon={Hash}          label="Schedule ID"       value={session.missed_schedule_id1} mono />
                  <InfoCard icon={Globe}         label="Status"            value={session.missed_status1} />
                  <InfoCard icon={GraduationCap} label="Tutor ID"          value={session.missed_tutor_id1} mono />
                  <InfoCard icon={GraduationCap} label="Tutor Name"
                    value={[session.missed_tutor_firstname1, session.missed_tutor_lastname1].filter(Boolean).join(' ')} />
                  <InfoCard icon={User}    label="Student Name" value={session.missed_student_name1} />
                  <InfoCard icon={BookOpen} label="Course"      value={session.missed_course1} />
                  <InfoCard icon={Hash}    label="Course ID"    value={session.missed_course_id1} mono />
                  <InfoCard icon={Hash}    label="Session Code Status" value={session.missed_session_code_status1} />
                </div>
              </Card>
            )}
            {hasMissed2 && (
              <Card>
                <SectionTitle>Missed Session 2</SectionTitle>
                <div className="space-y-4">
                  <InfoCard icon={Hash}          label="Session Missed ID" value={session.missed_session_id2} mono />
                  <InfoCard icon={Hash}          label="Schedule ID"       value={session.missed_schedule_id2} mono />
                  <InfoCard icon={Globe}         label="Status"            value={session.missed_status2} />
                  <InfoCard icon={GraduationCap} label="Tutor ID"          value={session.missed_tutor_id2} mono />
                  <InfoCard icon={GraduationCap} label="Tutor Name"
                    value={[session.missed_tutor_firstname2, session.missed_tutor_lastname2].filter(Boolean).join(' ')} />
                  <InfoCard icon={User}    label="Student Name" value={session.missed_student_name2} />
                  <InfoCard icon={BookOpen} label="Course"      value={session.missed_course2} />
                  <InfoCard icon={Hash}    label="Course ID"    value={session.missed_course_id2} mono />
                  <InfoCard icon={Hash}    label="Session Code Status" value={session.missed_session_code_status2} />
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Record Info */}
        <Card>
          <SectionTitle>Record Info</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <InfoCard icon={Hash}     label="SSID"          value={session.ssid} mono />
            <InfoCard icon={Globe}    label="Entry Status"  value={session.entry_status} />
            <InfoCard icon={Calendar} label="Timestamp"     value={session.timestamp ? new Date(session.timestamp).toLocaleString() : null} />
            <InfoCard icon={Calendar} label="Last Updated"  value={session.last_updated ? new Date(session.last_updated).toLocaleString() : null} />
            <InfoCard icon={User}     label="Created By"    value={session.created_by} />
            <InfoCard icon={User}     label="Updated By"    value={session.updated_by} />
            <InfoCard icon={Globe}    label="IP"            value={session.ip} />
            <InfoCard icon={Key}      label="Key"           value={session.record_key} mono />
          </div>
        </Card>

      </div>
    </DashboardLayout>
  );
}
