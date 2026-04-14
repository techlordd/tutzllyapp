'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import { statusBadge } from '@/components/ui/Badge';
import { Video } from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

interface Session {
  ssid: string; student_name: string; tutor_firstname: string; tutor_lastname: string; course_name: string;
  entry_date: string; schedule_start_time: string; session_duration: number;
  status: string; zoom_link: string;
}

export default function ParentSessionsPage() {
  const user = useAuthStore(state => state.user);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.user_id) return;
    fetch(`/api/sessions?parent_id=${user.user_id}`)
      .then(r => r.json())
      .then(d => { setSessions(d.sessions || []); setLoading(false); })
      .catch(() => { setLoading(false); toast.error('Failed to load data'); });
  }, [user?.user_id]);

  const columns = [
    { key: 'student_name', label: 'Child', sortable: true },
    { key: 'course_name', label: 'Course' },
    { key: 'tutor_firstname', label: 'Tutor', render: (_: unknown, row: Session) => `${row.tutor_firstname} ${row.tutor_lastname}` },
    { key: 'entry_date', label: 'Date', render: (v: unknown) => formatDate(v as string) },
    { key: 'schedule_start_time', label: 'Time', render: (v: unknown) => formatTime(v as string) },
    { key: 'session_duration', label: 'Duration', render: (v: unknown) => v ? `${v} min` : '—' },
    { key: 'zoom_link', label: 'Zoom', render: (v: unknown) => v ? (
      <a href={v as string} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs flex items-center gap-1"><Video size={12}/> Join</a>
    ) : '—' },
    { key: 'status', label: 'Status', render: (v: unknown) => statusBadge(v as string) },
  ];

  return (
    <DashboardLayout title="Children's Sessions">
      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Children's Sessions</h2>
          <p className="text-gray-500 text-sm">{sessions.length} sessions</p>
        </div>
        <DataTable data={sessions} columns={columns} loading={loading}
          searchKeys={['student_name', 'tutor_firstname', 'course_name', 'status']}
          emptyMessage="No sessions found" />
      </div>
    </DashboardLayout>
  );
}
