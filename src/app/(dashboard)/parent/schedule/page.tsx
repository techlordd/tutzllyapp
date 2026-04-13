'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import { Video, Calendar } from 'lucide-react';
import { formatTime } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

interface Schedule {
  schedule_id: string; student_name: string; tutor_name: string; course_name: string;
  day: string; session_start_time: string; session_end_time: string;
  duration: number; zoom_link: string; meeting_id: string; time_zone: string;
}

export default function ParentSchedulePage() {
  const user = useAuthStore(state => state.user);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.user_id) return;
    fetch(`/api/schedules?parent_id=${user.user_id}`)
      .then(r => r.json())
      .then(d => { setSchedules(d.schedules || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user?.user_id]);

  const columns = [
    { key: 'student_name', label: 'Child', sortable: true },
    { key: 'course_name', label: 'Course' },
    { key: 'tutor_name', label: 'Tutor' },
    { key: 'day', label: 'Day' },
    { key: 'session_start_time', label: 'Time', render: (_: unknown, row: Schedule) =>
      `${formatTime(row.session_start_time)} – ${formatTime(row.session_end_time)}` },
    { key: 'duration', label: 'Dur.', render: (v: unknown) => v ? `${v} min` : '—' },
    { key: 'zoom_link', label: 'Zoom', render: (v: unknown) => v ? (
      <a href={v as string} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline text-xs">
        <Video size={12} /> Join
      </a>
    ) : '—' },
  ];

  return (
    <DashboardLayout title="Children's Schedule">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Calendar size={24} className="text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Children's Schedule</h2>
            <p className="text-gray-500 text-sm">{schedules.length} scheduled sessions</p>
          </div>
        </div>
        <DataTable data={schedules} columns={columns} loading={loading}
          searchKeys={['student_name', 'course_name', 'tutor_name', 'day']}
          emptyMessage="No schedules found" />
      </div>
    </DashboardLayout>
  );
}
