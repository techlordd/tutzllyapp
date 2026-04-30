'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import { formatDate, formatTime } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

interface Session {
  ssid: string; tutor_firstname: string; tutor_lastname: string; course_name: string;
  start_session_date: string; schedule_start_time: string; schedule_end_time: string;
  start_session_time: string; end_session_time: string;
  status: string; zoom_link: string;
}

export default function StudentSessionsPage() {
  const user = useAuthStore(state => state.user);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.user_id) return;
    fetch(`/api/sessions?student_id=${user.user_id}`)
      .then(r => r.json())
      .then(d => { setSessions(d.sessions || []); setLoading(false); })
      .catch(() => { setLoading(false); toast.error('Failed to load data'); });
  }, [user?.user_id]);

  const columns = [
    { key: 'start_session_date', label: 'Date', render: (v: unknown) => formatDate(v as string) },
    { key: 'tutor_firstname', label: 'Tutor', render: (_: unknown, row: Session) => `${row.tutor_firstname} ${row.tutor_lastname}` },
    { key: 'course_name', label: 'Course', sortable: true },
    { key: 'schedule_start_time', label: 'Period', render: (_: unknown, row: Session) =>
      row.schedule_start_time && row.schedule_end_time
        ? `${formatTime(row.schedule_start_time)} – ${formatTime(row.schedule_end_time)}`
        : '—'
    },
    { key: 'start_session_time', label: 'Session Started', render: (v: unknown) => v ? formatTime(v as string) : '—' },
    { key: 'end_session_time', label: 'Session Ended', render: (v: unknown) => v ? formatTime(v as string) : '—' },
  ];

  return (
    <DashboardLayout title="My Sessions">
      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Sessions</h2>
          <p className="text-gray-500 text-sm">{sessions.length} sessions total</p>
        </div>
        <DataTable data={sessions} columns={columns} loading={loading}
          searchKeys={['course_name', 'tutor_firstname', 'status']}
          emptyMessage="No sessions yet" />
      </div>
    </DashboardLayout>
  );
}
