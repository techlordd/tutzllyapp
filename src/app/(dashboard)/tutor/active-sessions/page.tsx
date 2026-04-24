'use client';
import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import FormField, { Input } from '@/components/ui/FormField';
import { Video, Radio, Square } from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

interface ActiveSession {
  ssid: string;
  student_id: string;
  student_name: string;
  course_name: string; course_code: string;
  start_session_date: string; start_session_time: string;
  schedule_start_time: string; schedule_end_time: string;
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

function calcDuration(startDate: string, startTime: string, endDate: string, endTime: string): string {
  if (!startDate || !startTime || !endDate || !endTime) return '';
  const start = new Date(`${startDate}T${startTime}`);
  const end = new Date(`${endDate}T${endTime}`);
  const diff = Math.round((end.getTime() - start.getTime()) / 60000);
  return diff > 0 ? String(diff) : '';
}

export default function TutorActiveSessionsPage() {
  const user = useAuthStore(state => state.user);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(0);

  const [endModal, setEndModal] = useState<ActiveSession | null>(null);
  const [endForm, setEndForm] = useState({
    end_session_date: '',
    end_session_time: '',
    session_duration: '',
    start_session_date: '',
    start_session_time: '',
    schedule_start_time: '',
    schedule_end_time: '',
  });
  const [endSubmitting, setEndSubmitting] = useState(false);

  const fetchSessions = useCallback(async () => {
    if (!user?.user_id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions?status=started&tutor_id=${user.user_id}`);
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch { /* silent */ }
    setLoading(false);
  }, [user?.user_id]);

  useEffect(() => {
    fetchSessions();
    const refresh = setInterval(fetchSessions, 30000);
    const tick = setInterval(() => setTick(t => t + 1), 60000);
    return () => { clearInterval(refresh); clearInterval(tick); };
  }, [fetchSessions]);

  const openEndModal = (session: ActiveSession) => {
    const now = new Date();
    const nowDate = now.toISOString().split('T')[0];
    const nowTime = now.toTimeString().slice(0, 5);
    const startDate = session.start_session_date?.split('T')[0] || session.entry_date?.split('T')[0] || nowDate;
    const startTime = session.start_session_time || '';
    setEndForm({
      end_session_date: nowDate,
      end_session_time: nowTime,
      session_duration: calcDuration(startDate, startTime, nowDate, nowTime),
      start_session_date: startDate,
      start_session_time: startTime,
      schedule_start_time: session.schedule_start_time || '',
      schedule_end_time: session.schedule_end_time || '',
    });
    setEndModal(session);
  };

  const handleEndSession = async () => {
    if (!endModal) return;
    setEndSubmitting(true);
    try {
      const res = await fetch(`/api/sessions/${endModal.ssid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ended', ...endForm }),
      });
      if (!res.ok) throw new Error();
      toast.success('Session ended!');
      setEndModal(null);
      fetchSessions();
    } catch { toast.error('Failed to end session'); }
    setEndSubmitting(false);
  };

  const columns = [
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
            <h2 className="text-2xl font-bold text-gray-900">My Active Sessions</h2>
            <p className="text-gray-500 text-sm">
              {sessions.length} session{sessions.length !== 1 ? 's' : ''} currently in progress · refreshes every 30s
            </p>
          </div>
        </div>

        <DataTable
          data={sessions}
          columns={columns}
          loading={loading}
          searchKeys={['student_name', 'course_name']}
          emptyMessage="No active sessions right now"
          actions={(row) => (
            <button
              onClick={() => openEndModal(row)}
              className="px-2 py-1 text-xs rounded-lg bg-red-50 text-red-700 hover:bg-red-100 flex items-center gap-1"
            >
              <Square size={11} /> End
            </button>
          )}
        />
      </div>

      {endModal && (
        <Modal isOpen={true} onClose={() => setEndModal(null)} title="End Session" size="sm">
          <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm space-y-0.5">
            <p><span className="font-medium">Student:</span> {endModal.student_name}</p>
            <p><span className="font-medium">Course:</span> {endModal.course_name}</p>
            {endForm.start_session_time && (
              <p className="pt-1 text-blue-700">
                <span className="font-medium">Started:</span>{' '}
                {endForm.start_session_date} at {formatTime(endForm.start_session_time)}
              </p>
            )}
          </div>
          <div className="space-y-3">
            <FormField label="End Date">
              <Input type="date" value={endForm.end_session_date}
                onChange={e => {
                  const d = e.target.value;
                  setEndForm(f => ({ ...f, end_session_date: d, session_duration: calcDuration(f.start_session_date, f.start_session_time, d, f.end_session_time) }));
                }} />
            </FormField>
            <FormField label="End Time">
              <Input type="time" value={endForm.end_session_time}
                onChange={e => {
                  const t = e.target.value;
                  setEndForm(f => ({ ...f, end_session_time: t, session_duration: calcDuration(f.start_session_date, f.start_session_time, f.end_session_date, t) }));
                }} />
            </FormField>
            <FormField label="Duration (minutes)" hint="Auto-calculated from start and end time">
              <Input type="number" value={endForm.session_duration}
                onChange={e => setEndForm({ ...endForm, session_duration: e.target.value })} />
            </FormField>
          </div>
          <div className="flex gap-3 mt-4">
            <Button variant="secondary" onClick={() => setEndModal(null)}>Cancel</Button>
            <Button loading={endSubmitting} onClick={handleEndSession}>End Session</Button>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}
