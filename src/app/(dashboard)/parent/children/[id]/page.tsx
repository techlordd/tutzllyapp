'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Avatar from '@/components/ui/Avatar';
import { statusBadge } from '@/components/ui/Badge';
import {
  ArrowLeft, User, Phone, Mail, MapPin, BookOpen, Video,
  BarChart3, Calendar, GraduationCap, School,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

type Tab = 'bio' | 'courses' | 'sessions' | 'grades';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'bio',     label: 'Profile',          icon: User      },
  { id: 'courses', label: 'Enrolled Courses',  icon: BookOpen  },
  { id: 'sessions',label: 'Sessions',          icon: Video     },
  { id: 'grades',  label: 'Grade Book',        icon: BarChart3 },
];

interface Student {
  student_id: string; firstname: string; surname: string;
  email: string; username: string; phone_no: string; sex: string;
  grade: string; school: string; date_of_birth: string;
  mothers_name: string; mothers_email: string; fathers_name: string; fathers_email: string;
  address: string; address_line_1: string; address_city: string;
  address_state_province: string; address_country: string;
  short_bio: string; status: string; entry_status: string;
}

interface Enrollment {
  assign_id: string; course_name: string; course_code: string;
  tutor_name: string; entry_status: string;
}

interface Session {
  ssid: string; course_name: string; tutor_name: string;
  entry_date: string; start_session_time: string; status: string;
}

interface Grade {
  record_id: number; course_name: string; tutor_name: string;
  month: string; year: string; punctuality: number; attentiveness: number;
  engagement: number; homework: number; test_score: number; status: string;
}

const avg = (g: Grade) => {
  const s = [g.punctuality, g.attentiveness, g.engagement, g.homework, g.test_score].filter(Boolean);
  return s.length ? (s.reduce((a, b) => a + b, 0) / s.length).toFixed(1) : '—';
};

const InfoRow = ({ label, value }: { label: string; value?: string | null }) =>
  value ? (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-800 mt-0.5">{value}</p>
    </div>
  ) : null;

export default function ParentChildDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('bio');
  const [student, setStudent] = useState<Student | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/students/${id}`).then(r => r.json()),
      fetch(`/api/enrollments?student_id=${id}`).then(r => r.json()),
      fetch(`/api/sessions?student_id=${id}`).then(r => r.json()),
      fetch(`/api/grades?student_id=${id}`).then(r => r.json()),
    ])
      .then(([s, e, ss, g]) => {
        setStudent(s.student || null);
        setEnrollments(e.enrollments || []);
        setSessions(ss.sessions || []);
        setGrades(g.grades || []);
        setLoading(false);
      })
      .catch(() => { setLoading(false); toast.error('Failed to load student data'); });
  }, [id]);

  const fullName = student
    ? `${student.firstname || ''} ${student.surname || ''}`.trim() || student.username || 'Student'
    : 'Student';

  if (loading) return (
    <DashboardLayout title="Child Profile">
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  );

  if (!student) return (
    <DashboardLayout title="Child Profile">
      <div className="text-center py-16 text-gray-500">Student not found.</div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout title="Child Profile">
      <div className="max-w-4xl mx-auto space-y-5">

        {/* Back + Header */}
        <button onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft size={16} /> Back to My Children
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-5">
            <Avatar name={fullName} size="lg" />
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-gray-900">{fullName}</h2>
              {student.email && <p className="text-sm text-gray-500 mt-0.5">{student.email}</p>}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {statusBadge(student.entry_status)}
                {student.grade && (
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                    {student.grade}
                  </span>
                )}
                {student.school && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {student.school}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-xs text-gray-400">Student ID</p>
              <p className="text-sm font-mono text-gray-600">{student.student_id}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${
                  tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                <Icon size={14} />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab: Bio */}
        {tab === 'bio' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <User size={12} /> Personal Details
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <InfoRow label="Phone" value={student.phone_no} />
                <InfoRow label="Sex" value={student.sex} />
                <InfoRow label="Date of Birth" value={student.date_of_birth ? formatDate(student.date_of_birth) : undefined} />
                <InfoRow label="Grade" value={student.grade} />
                <InfoRow label="School" value={student.school} />
              </div>
            </div>

            {(student.mothers_name || student.fathers_name) && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <GraduationCap size={12} /> Parent / Guardian
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
                  <InfoRow label="Mother's Name" value={student.mothers_name} />
                  <InfoRow label="Mother's Email" value={student.mothers_email} />
                  <InfoRow label="Father's Name" value={student.fathers_name} />
                  <InfoRow label="Father's Email" value={student.fathers_email} />
                </div>
              </div>
            )}

            {(student.address || student.address_city) && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <MapPin size={12} /> Address
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <InfoRow label="Address" value={student.address || student.address_line_1} />
                  <InfoRow label="City" value={student.address_city} />
                  <InfoRow label="State / Province" value={student.address_state_province} />
                  <InfoRow label="Country" value={student.address_country} />
                </div>
              </div>
            )}

            {student.short_bio && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">About</p>
                <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-xl">{student.short_bio}</p>
              </div>
            )}
          </div>
        )}

        {/* Tab: Courses */}
        {tab === 'courses' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <BookOpen size={12} /> Enrolled Courses ({enrollments.length})
            </p>
            {enrollments.length === 0 ? (
              <p className="text-center text-gray-400 py-10">No courses found.</p>
            ) : (
              <div className="space-y-3">
                {enrollments.map(e => (
                  <div key={e.assign_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-medium text-gray-900">{e.course_name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{e.course_code} · Tutor: {e.tutor_name}</p>
                    </div>
                    {statusBadge(e.entry_status)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Sessions */}
        {tab === 'sessions' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Video size={12} /> Sessions ({sessions.length})
            </p>
            {sessions.length === 0 ? (
              <p className="text-center text-gray-400 py-10">No sessions found.</p>
            ) : (
              <div className="space-y-3">
                {sessions.slice(0, 30).map(s => (
                  <div key={s.ssid} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-medium text-gray-900">{s.course_name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {s.tutor_name} · {s.entry_date ? formatDate(s.entry_date) : '—'}
                        {s.start_session_time ? ` at ${s.start_session_time}` : ''}
                      </p>
                    </div>
                    {statusBadge(s.status)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Grades */}
        {tab === 'grades' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <BarChart3 size={12} /> Grade Book ({grades.length})
            </p>
            {grades.length === 0 ? (
              <p className="text-center text-gray-400 py-10">No grade entries found.</p>
            ) : (
              <div className="space-y-3">
                {grades.map(g => (
                  <div key={g.record_id} className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium text-gray-900">{g.course_name}</p>
                        <p className="text-xs text-gray-500">{g.tutor_name} · {g.month} {g.year}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Average</p>
                        <p className="text-lg font-bold text-blue-600">{avg(g)}%</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {([['Punct.', g.punctuality], ['Attend.', g.attentiveness], ['Engage.', g.engagement],
                         ['H/Work', g.homework], ['Test', g.test_score]] as [string, number][]).map(([label, val]) => (
                        <div key={label} className="bg-white rounded-lg p-2 text-center border border-gray-100">
                          <p className="text-xs text-gray-400">{label}</p>
                          <p className="text-sm font-bold text-gray-800">{val != null ? `${val}%` : '—'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
