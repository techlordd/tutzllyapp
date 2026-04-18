'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Button from '@/components/ui/Button';
import {
  ArrowLeft, Edit, Trash2, User, GraduationCap, BookOpen,
  Calendar, Clock, Globe, Video, Copy, CheckCheck,
} from 'lucide-react';
import { formatTime } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Schedule {
  schedule_id: string; student_name: string; student_id: string;
  tutor_name: string; tutor_id: string; tutor_email: string;
  course_name: string; course_id: number; course_code: string;
  day: string; session_start_time: string; session_end_time: string;
  duration: number; zoom_link: string; meeting_id: string; meeting_passcode: string;
  time_zone: string; assign_status: string; year: string; created_at: string;
}

function InfoCard({ icon: Icon, label, value, mono = false }: {
  icon: React.ElementType; label: string; value?: string | number | null; mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={15} className="text-slate-500" />
      </div>
      <div>
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <p className={`text-sm font-medium text-gray-900 ${mono ? 'font-mono' : ''}`}>
          {value || <span className="text-gray-400 font-normal">—</span>}
        </p>
      </div>
    </div>
  );
}

export default function ScheduleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/schedules/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.schedule) setSchedule(data.schedule);
        else { toast.error('Schedule not found'); router.push('/admin/schedules'); }
      })
      .catch(() => { toast.error('Failed to load schedule'); router.push('/admin/schedules'); })
      .finally(() => setLoading(false));
  }, [id, router]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const handleDelete = async () => {
    if (!confirm('Delete this schedule? This cannot be undone.')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/schedules/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Schedule deleted');
      router.push('/admin/schedules');
    } catch { toast.error('Failed to delete schedule'); setDeleting(false); }
  };

  if (loading) {
    return (
      <DashboardLayout title="Schedule Detail">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!schedule) return null;

  const isActive = schedule.assign_status === 'active';

  return (
    <DashboardLayout title="Schedule Detail">
      <div className="max-w-3xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/admin/schedules')}
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Schedule Detail</h1>
              <p className="text-xs text-gray-400 font-mono mt-0.5">{schedule.schedule_id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {schedule.assign_status}
            </span>
            <Button
              icon={Edit}
              variant="secondary"
              onClick={() => router.push(`/admin/schedules?edit=${schedule.schedule_id}`)}
            >
              Edit
            </Button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-2 rounded-xl hover:bg-red-50 text-red-500 transition-colors disabled:opacity-40"
              title="Delete schedule"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Participants */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Participants</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <InfoCard icon={User} label="Student" value={schedule.student_name} />
            <InfoCard icon={User} label="Student ID" value={schedule.student_id} mono />
            <InfoCard icon={GraduationCap} label="Tutor" value={schedule.tutor_name} />
            <InfoCard icon={GraduationCap} label="Tutor Email" value={schedule.tutor_email} />
          </div>
        </div>

        {/* Session Details */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Session Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <InfoCard icon={BookOpen} label="Course" value={`${schedule.course_name} (${schedule.course_code})`} />
            <InfoCard icon={Calendar} label="Day" value={schedule.day} />
            <InfoCard icon={Clock} label="Time" value={
              schedule.session_start_time
                ? `${formatTime(schedule.session_start_time)} – ${formatTime(schedule.session_end_time)}`
                : undefined
            } />
            <InfoCard icon={Clock} label="Duration" value={schedule.duration ? `${schedule.duration} minutes` : undefined} />
            <InfoCard icon={Calendar} label="Year" value={schedule.year} />
            <InfoCard icon={Globe} label="Time Zone" value={schedule.time_zone} />
          </div>
        </div>

        {/* Zoom Details */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Zoom Details</h2>
          <div className="space-y-4">
            {schedule.zoom_link ? (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Video size={15} className="text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 mb-1">Zoom Link</p>
                  <div className="flex items-center gap-2">
                    <a
                      href={schedule.zoom_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline truncate"
                    >
                      {schedule.zoom_link}
                    </a>
                    <button
                      onClick={() => copyToClipboard(schedule.zoom_link, 'link')}
                      className="flex-shrink-0 p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Copy link"
                    >
                      {copied === 'link' ? <CheckCheck size={13} className="text-green-500" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">No Zoom link set</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <p className="text-xs text-gray-400 mb-1">Meeting ID</p>
                {schedule.meeting_id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-medium text-gray-900">{schedule.meeting_id}</span>
                    <button
                      onClick={() => copyToClipboard(schedule.meeting_id, 'id')}
                      className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {copied === 'id' ? <CheckCheck size={13} className="text-green-500" /> : <Copy size={13} />}
                    </button>
                  </div>
                ) : <span className="text-sm text-gray-400">—</span>}
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Passcode</p>
                {schedule.meeting_passcode ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-medium text-gray-900">{schedule.meeting_passcode}</span>
                    <button
                      onClick={() => copyToClipboard(schedule.meeting_passcode, 'pass')}
                      className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {copied === 'pass' ? <CheckCheck size={13} className="text-green-500" /> : <Copy size={13} />}
                    </button>
                  </div>
                ) : <span className="text-sm text-gray-400">—</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-gray-400 text-center pb-2">
          Created {schedule.created_at ? new Date(schedule.created_at).toLocaleString() : '—'}
        </p>
      </div>
    </DashboardLayout>
  );
}
