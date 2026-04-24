'use client';
import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import { XCircle } from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

interface MissedSession {
  ssid: string;
  student_name: string;
  course_name: string; course_code: string;
  entry_date: string;
  schedule_start_time: string;
  schedule_end_time: string;
}

export default function TutorMissedSessionsPage() {
  const user = useAuthStore(state => state.user);
  const [sessions, setSessions] = useState<MissedSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    if (!user?.user_id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions?status=missed&tutor_id=${user.user_id}`);
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch { /* silent */ }
    setLoading(false);
  }, [user?.user_id]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const columns = [
    { key: 'student_name', label: 'Student', sortable: true },
    { key: 'course_name', label: 'Course', render: (_: unknown, row: MissedSession) => (
      <div>
        <p className="font-medium text-sm">{row.course_name || '—'}</p>
        {row.course_code && (
          <span className="font-mono text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{row.course_code}</span>
        )}
      </div>
    )},
    { key: 'entry_date', label: 'Scheduled Date', render: (_: unknown, row: MissedSession) => (
      <div>
        <p className="text-sm">{row.entry_date ? formatDate(row.entry_date) : '—'}</p>
        {row.schedule_start_time && (
          <p className="text-xs text-gray-400">
            {formatTime(row.schedule_start_time)}{row.schedule_end_time ? ` – ${formatTime(row.schedule_end_time)}` : ''}
          </p>
        )}
      </div>
    )},
  ];

  return (
    <DashboardLayout title="Missed Sessions">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
            <XCircle size={22} className="text-red-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Missed Sessions</h2>
            <p className="text-gray-500 text-sm">{sessions.length} session{sessions.length !== 1 ? 's' : ''} missed</p>
          </div>
        </div>

        <DataTable
          data={sessions}
          columns={columns}
          loading={loading}
          searchKeys={['student_name', 'course_name']}
          emptyMessage="No missed sessions"
        />
      </div>
    </DashboardLayout>
  );
}
