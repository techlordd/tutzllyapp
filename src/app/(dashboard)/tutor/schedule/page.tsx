'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import { Video, Calendar } from 'lucide-react';
import { formatTime } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

interface Schedule {
  schedule_id: string; student_name: string; course_name: string;
  day: string; session_start_time: string; session_end_time: string;
  duration: number; zoom_link: string; meeting_id: string; time_zone: string;
  assign_status: string;
}

export default function TutorSchedulePage() {
  const user = useAuthStore(state => state.user);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.user_id) return;
    fetch(`/api/schedules?tutor_id=${user.user_id}`)
      .then(r => r.json())
      .then(d => { setSchedules(d.schedules || []); setLoading(false); })
      .catch(() => { setLoading(false); toast.error('Failed to load data'); });
  }, [user?.user_id]);

  const columns = [
    { key: 'student_name', label: 'Student', sortable: true },
    { key: 'course_name', label: 'Course' },
    { key: 'day', label: 'Day' },
    { key: 'session_start_time', label: 'Time', render: (_: unknown, row: Schedule) =>
      `${formatTime(row.session_start_time)} – ${formatTime(row.session_end_time)}` },
    { key: 'duration', label: 'Duration', render: (v: unknown) => `${v} min` },
    { key: 'time_zone', label: 'Timezone' },
    { key: 'zoom_link', label: 'Zoom', render: (v: unknown) => v ? (
      <a href={v as string} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline text-xs">
        <Video size={12} /> Join Zoom
      </a>
    ) : '—' },
    { key: 'assign_status', label: 'Status', render: (v: unknown) =>
      <span className={`text-xs px-2 py-0.5 rounded-full ${v === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{v as string}</span>
    },
  ];

  return (
    <DashboardLayout title="My Schedule">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Calendar size={24} className="text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">My Schedule</h2>
            <p className="text-gray-500 text-sm">{schedules.length} scheduled sessions</p>
          </div>
        </div>
        <DataTable data={schedules} columns={columns} loading={loading}
          searchKeys={['student_name', 'course_name', 'day']}
          emptyMessage="No schedules assigned yet" />
      </div>
    </DashboardLayout>
  );
}
