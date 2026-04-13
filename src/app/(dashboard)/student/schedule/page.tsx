'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import { Video, Calendar } from 'lucide-react';
import { formatTime } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

interface Schedule {
  schedule_id: string; tutor_name: string; course_name: string;
  day: string; session_start_time: string; session_end_time: string;
  duration: number; zoom_link: string; meeting_id: string; time_zone: string;
}

export default function StudentSchedulePage() {
  const user = useAuthStore(state => state.user);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.user_id) return;
    fetch(`/api/schedules?student_id=${user.user_id}`)
      .then(r => r.json())
      .then(d => { setSchedules(d.schedules || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user?.user_id]);

  const columns = [
    { key: 'course_name', label: 'Course', sortable: true },
    { key: 'tutor_name', label: 'Tutor' },
    { key: 'day', label: 'Day' },
    { key: 'session_start_time', label: 'Time', render: (_: unknown, row: Schedule) =>
      `${formatTime(row.session_start_time)} – ${formatTime(row.session_end_time)}` },
    { key: 'duration', label: 'Duration', render: (v: unknown) => `${v} min` },
    { key: 'time_zone', label: 'Timezone' },
    { key: 'meeting_id', label: 'Meeting ID' },
    { key: 'zoom_link', label: 'Zoom', render: (v: unknown) => v ? (
      <a href={v as string} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline text-xs">
        <Video size={12} /> Join Zoom
      </a>
    ) : '—' },
  ];

  return (
    <DashboardLayout title="My Schedule">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Calendar size={24} className="text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">My Schedule</h2>
            <p className="text-gray-500 text-sm">{schedules.length} sessions scheduled</p>
          </div>
        </div>
        <DataTable data={schedules} columns={columns} loading={loading}
          searchKeys={['course_name', 'tutor_name', 'day']}
          emptyMessage="No schedule found" />
      </div>
    </DashboardLayout>
  );
}
