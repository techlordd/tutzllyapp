'use client';
import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { statusBadge } from '@/components/ui/Badge';
import FormField, { Input, Select } from '@/components/ui/FormField';
import { Video, Play, Square, RotateCcw } from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

interface Session {
  ssid: string; student_name: string; course_name: string;
  entry_date: string; schedule_start_time: string; schedule_end_time: string;
  start_session_date: string; start_session_time: string;
  end_session_date: string; end_session_time: string;
  session_duration: number; status: string; zoom_link: string;
}

export default function TutorSessionsPage() {
  const user = useAuthStore(state => state.user);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState<{ session: Session; action: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionForm, setActionForm] = useState({
    start_session_date: new Date().toISOString().split('T')[0],
    start_session_time: new Date().toTimeString().slice(0, 5),
    end_session_date: new Date().toISOString().split('T')[0],
    end_session_time: '',
    session_duration: '',
    reschedule_to: '',
    reschedule_time: '',
  });

  const fetchSessions = useCallback(async () => {
    if (!user?.user_id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions?tutor_id=${user.user_id}`);
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch { toast.error('Failed to load data'); }
    setLoading(false);
  }, [user?.user_id]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const handleAction = async (action: string) => {
    if (!actionModal) return;
    setSubmitting(true);
    const statusMap: Record<string, string> = { start: 'started', end: 'ended', miss: 'missed', reschedule: 'rescheduled' };
    try {
      const res = await fetch(`/api/sessions/${actionModal.session.ssid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: statusMap[action], ...actionForm }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Session ${statusMap[action]}!`);
      setActionModal(null);
      fetchSessions();
    } catch { toast.error('Failed to update session'); }
    setSubmitting(false);
  };

  const columns = [
    { key: 'student_name', label: 'Student', sortable: true },
    { key: 'course_name', label: 'Course' },
    { key: 'entry_date', label: 'Date', render: (v: unknown) => formatDate(v as string) },
    { key: 'schedule_start_time', label: 'Sched. Time', render: (v: unknown) => formatTime(v as string) },
    { key: 'session_duration', label: 'Duration', render: (v: unknown) => v ? `${v} min` : '—' },
    { key: 'zoom_link', label: 'Zoom', render: (v: unknown) => v ? (
      <a href={v as string} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs flex items-center gap-1">
        <Video size={12}/> Join
      </a>
    ) : '—' },
    { key: 'status', label: 'Status', render: (v: unknown) => statusBadge(v as string) },
  ];

  return (
    <DashboardLayout title="My Sessions">
      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Sessions</h2>
          <p className="text-gray-500 text-sm">{sessions.length} sessions</p>
        </div>

        <DataTable data={sessions} columns={columns} loading={loading}
          searchKeys={['student_name', 'course_name', 'status']}
          emptyMessage="No sessions yet"
          actions={(row) => (
            <div className="flex items-center gap-1">
              {row.status === 'scheduled' && (
                <button onClick={() => setActionModal({ session: row, action: 'start' })}
                  className="px-2 py-1 text-xs rounded-lg bg-green-50 text-green-700 hover:bg-green-100 flex items-center gap-1">
                  <Play size={11} /> Start
                </button>
              )}
              {row.status === 'started' && (
                <button onClick={() => setActionModal({ session: row, action: 'end' })}
                  className="px-2 py-1 text-xs rounded-lg bg-red-50 text-red-700 hover:bg-red-100 flex items-center gap-1">
                  <Square size={11} /> End
                </button>
              )}
              {(row.status === 'scheduled' || row.status === 'started') && (
                <>
                  <button onClick={() => setActionModal({ session: row, action: 'reschedule' })}
                    className="px-2 py-1 text-xs rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 flex items-center gap-1">
                    <RotateCcw size={11} /> Reschedule
                  </button>
                  <button onClick={() => {
                    if (confirm('Mark this session as missed?'))
                      fetch(`/api/sessions/${row.ssid}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'missed' }) })
                        .then(() => { toast.success('Session marked as missed'); fetchSessions(); })
                        .catch(() => toast.error('Failed to mark session as missed'));
                  }}
                  className="px-2 py-1 text-xs rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200">
                    Missed
                  </button>
                </>
              )}
            </div>
          )}
        />
      </div>

      {actionModal && (
        <Modal isOpen={true} onClose={() => setActionModal(null)}
          title={actionModal.action === 'start' ? 'Start Session' : actionModal.action === 'end' ? 'End Session' : 'Reschedule Session'}
          size="md">
          <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm">
            <p><span className="font-medium">Student:</span> {actionModal.session.student_name}</p>
            <p><span className="font-medium">Course:</span> {actionModal.session.course_name}</p>
          </div>

          {actionModal.action === 'start' && (
            <div className="space-y-3">
              <FormField label="Start Date"><Input type="date" value={actionForm.start_session_date} onChange={e => setActionForm({...actionForm, start_session_date: e.target.value})} /></FormField>
              <FormField label="Start Time"><Input type="time" value={actionForm.start_session_time} onChange={e => setActionForm({...actionForm, start_session_time: e.target.value})} /></FormField>
            </div>
          )}

          {actionModal.action === 'end' && (
            <div className="space-y-3">
              <FormField label="End Date"><Input type="date" value={actionForm.end_session_date} onChange={e => setActionForm({...actionForm, end_session_date: e.target.value})} /></FormField>
              <FormField label="End Time"><Input type="time" value={actionForm.end_session_time} onChange={e => setActionForm({...actionForm, end_session_time: e.target.value})} /></FormField>
              <FormField label="Session Duration (minutes)" hint="Total duration of the session"><Input type="number" value={actionForm.session_duration} onChange={e => setActionForm({...actionForm, session_duration: e.target.value})} /></FormField>
            </div>
          )}

          {actionModal.action === 'reschedule' && (
            <div className="space-y-3">
              <FormField label="Reschedule To (Date)"><Input type="date" value={actionForm.reschedule_to} onChange={e => setActionForm({...actionForm, reschedule_to: e.target.value})} /></FormField>
              <FormField label="Reschedule Time"><Input type="time" value={actionForm.reschedule_time} onChange={e => setActionForm({...actionForm, reschedule_time: e.target.value})} /></FormField>
            </div>
          )}

          <div className="flex gap-3 mt-4">
            <Button variant="secondary" onClick={() => setActionModal(null)}>Cancel</Button>
            <Button loading={submitting} onClick={() => handleAction(actionModal.action)}>
              {actionModal.action === 'start' ? 'Start Session' : actionModal.action === 'end' ? 'End Session' : 'Reschedule'}
            </Button>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}
