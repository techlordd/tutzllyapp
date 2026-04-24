'use client';
import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import { Video, Radio } from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils';

interface ActiveSession {
  ssid: string;
  tutor_firstname: string; tutor_lastname: string;
  student_name: string;
  course_name: string; course_code: string;
  start_session_date: string; start_session_time: string;
  schedule_start_time: string;
  zoom_link: string;
  entry_date: string;
}

function elapsed(startDate: string, startTime: string): string {
  if (!startDate || !startTime) return '—';
  const start = new Date(`${startDate.split('T')[0]}T${startTime}`);
  const diff = Math.floor((Date.now() - start.getTime()) / 60000);
  if (diff < 0) return '—';
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function ActiveSessionsPage() {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(0);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sessions?status=started');
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSessions();
    const refresh = setInterval(fetchSessions, 30000);
    // Tick every minute to keep elapsed times live
    const tick = setInterval(() => setTick(t => t + 1), 60000);
    return () => { clearInterval(refresh); clearInterval(tick); };
  }, [fetchSessions]);

  const columns = [
    { key: 'tutor_firstname', label: 'Tutor', render: (_: unknown, row: ActiveSession) =>
      `${row.tutor_firstname || ''} ${row.tutor_lastname || ''}`.trim() || '—'
    },
    { key: 'student_name', label: 'Student', sortable: true },
    { key: 'course_name', label: 'Course', render: (_: unknown, row: ActiveSession) => (
      <div>
        <p className="font-medium text-sm">{row.course_name || '—'}</p>
        {row.course_code && (
          <span className="font-mono text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{row.course_code}</span>
        )}
      </div>
    )},
    { key: 'start_session_date', label: 'Started At', render: (_: unknown, row: ActiveSession) => {
      const d = row.start_session_date?.split('T')[0];
      const t = row.start_session_time;
      if (!d && !t) return '—';
      return `${d ? formatDate(d) : ''} ${t ? formatTime(t) : ''}`.trim();
    }},
    { key: 'ssid', label: 'Elapsed', render: (_: unknown, row: ActiveSession) =>
      elapsed(row.start_session_date || row.entry_date, row.start_session_time || row.schedule_start_time)
    },
    { key: 'zoom_link', label: 'Zoom', render: (v: unknown) => v ? (
      <a href={v as string} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-1 text-blue-600 hover:underline text-xs">
        <Video size={12} /> Join
      </a>
    ) : '—' },
  ];

  return (
    <DashboardLayout title="Active Sessions">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Radio size={24} className="text-green-600" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Active Sessions</h2>
            <p className="text-gray-500 text-sm">
              {sessions.length} session{sessions.length !== 1 ? 's' : ''} currently in progress · refreshes every 30s
            </p>
          </div>
        </div>

        <DataTable
          data={sessions}
          columns={columns}
          loading={loading}
          searchKeys={['student_name', 'course_name', 'tutor_firstname', 'tutor_lastname']}
          emptyMessage="No active sessions right now"
        />
      </div>
    </DashboardLayout>
  );
}
