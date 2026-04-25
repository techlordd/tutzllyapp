'use client';
import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import FormField, { Input } from '@/components/ui/FormField';
import { RotateCcw, Play, Video } from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils';
import toast from 'react-hot-toast';

interface RescheduledSession {
  ssid: string;
  tutor_firstname: string; tutor_lastname: string;
  student_name: string;
  course_name: string; course_code: string;
  entry_date: string;
  schedule_start_time: string; schedule_end_time: string;
  schedule_day: string;
  reschedule_to: string;
  reschedule_time: string;
  zoom_link: string;
}

export default function AdminRescheduledSessionsPage() {
  const [sessions, setSessions] = useState<RescheduledSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [startModal, setStartModal] = useState<RescheduledSession | null>(null);
  const [startForm, setStartForm] = useState({ start_session_date: '', start_session_time: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sessions?status=rescheduled');
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const openStartModal = (session: RescheduledSession) => {
    const now = new Date();
    setStartForm({
      start_session_date: now.toISOString().split('T')[0],
      start_session_time: now.toTimeString().slice(0, 5),
    });
    setStartModal(session);
  };

  const handleStartSession = async () => {
    if (!startModal) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/sessions/${startModal.ssid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'started',
          start_session_date: startForm.start_session_date,
          start_session_time: startForm.start_session_time,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Session started!');
      setStartModal(null);
      fetchSessions();
    } catch { toast.error('Failed to start session'); }
    setSubmitting(false);
  };

  const columns = [
    { key: 'tutor_firstname', label: 'Tutor', render: (_: unknown, row: RescheduledSession) =>
      `${row.tutor_firstname || ''} ${row.tutor_lastname || ''}`.trim() || '—'
    },
    { key: 'student_name', label: 'Student', sortable: true },
    { key: 'course_name', label: 'Course', render: (_: unknown, row: RescheduledSession) => (
      <div>
        <p className="font-medium text-sm">{row.course_name || '—'}</p>
        {row.course_code && (
          <span className="font-mono text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{row.course_code}</span>
        )}
      </div>
    )},
    { key: 'entry_date', label: 'Original Schedule', render: (_: unknown, row: RescheduledSession) => (
      <div>
        <p className="text-sm">{row.entry_date ? formatDate(row.entry_date) : '—'}</p>
        {(row.schedule_start_time || row.schedule_end_time) && (
          <p className="text-xs text-gray-400">
            {row.schedule_start_time ? formatTime(row.schedule_start_time) : ''}
            {row.schedule_end_time ? ` – ${formatTime(row.schedule_end_time)}` : ''}
          </p>
        )}
        {row.schedule_day && <p className="text-xs text-gray-400">{row.schedule_day}</p>}
      </div>
    )},
    { key: 'reschedule_to', label: 'Rescheduled To', render: (_: unknown, row: RescheduledSession) => (
      <div>
        <p className="text-sm font-medium text-amber-700">{row.reschedule_to ? formatDate(row.reschedule_to) : '—'}</p>
        {row.reschedule_time && (
          <p className="text-xs text-amber-500">{formatTime(row.reschedule_time)}</p>
        )}
      </div>
    )},
  ];

  return (
    <DashboardLayout title="Rescheduled Sessions">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
            <RotateCcw size={22} className="text-amber-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Rescheduled Sessions</h2>
            <p className="text-gray-500 text-sm">{sessions.length} session{sessions.length !== 1 ? 's' : ''} rescheduled</p>
          </div>
        </div>

        <DataTable
          data={sessions}
          columns={columns}
          loading={loading}
          searchKeys={['student_name', 'course_name', 'tutor_firstname', 'tutor_lastname']}
          emptyMessage="No rescheduled sessions"
          actions={(row) => (
            <button
              onClick={() => openStartModal(row)}
              className="px-2 py-1 text-xs rounded-lg bg-green-50 text-green-700 hover:bg-green-100 flex items-center gap-1"
            >
              <Play size={11} /> Start
            </button>
          )}
        />
      </div>

      {startModal && (
        <Modal isOpen={true} onClose={() => setStartModal(null)} title="Start Session" size="sm">
          <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm space-y-1">
            <p><span className="font-medium">Tutor:</span> {`${startModal.tutor_firstname || ''} ${startModal.tutor_lastname || ''}`.trim() || '—'}</p>
            <p><span className="font-medium">Student:</span> {startModal.student_name}</p>
            <p><span className="font-medium">Course:</span> {startModal.course_name}{startModal.course_code ? ` (${startModal.course_code})` : ''}</p>
            {startModal.schedule_day && (
              <p><span className="font-medium">Day:</span> {startModal.schedule_day}</p>
            )}
            <div className="pt-1 border-t border-gray-200 mt-1 space-y-0.5">
              <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Original Schedule</p>
              <p>
                <span className="font-medium">Date:</span>{' '}
                {startModal.entry_date ? formatDate(startModal.entry_date) : '—'}
              </p>
              {(startModal.schedule_start_time || startModal.schedule_end_time) && (
                <p>
                  <span className="font-medium">Time:</span>{' '}
                  {startModal.schedule_start_time ? formatTime(startModal.schedule_start_time) : ''}
                  {startModal.schedule_end_time ? ` – ${formatTime(startModal.schedule_end_time)}` : ''}
                </p>
              )}
            </div>
            <div className="pt-1 border-t border-amber-200 mt-1 space-y-0.5">
              <p className="text-amber-600 text-xs font-medium uppercase tracking-wide">Rescheduled To</p>
              <p className="text-amber-700">
                <span className="font-medium">Date:</span>{' '}
                {startModal.reschedule_to ? formatDate(startModal.reschedule_to) : '—'}
              </p>
              {startModal.reschedule_time && (
                <p className="text-amber-700">
                  <span className="font-medium">Time:</span> {formatTime(startModal.reschedule_time)}
                </p>
              )}
            </div>
            {startModal.zoom_link && (
              <div className="pt-1 border-t border-gray-200 mt-1">
                <a href={startModal.zoom_link} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-600 hover:underline text-xs">
                  <Video size={12} /> Join Zoom
                </a>
              </div>
            )}
          </div>
          <div className="space-y-3">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Actual Start</p>
            <FormField label="Start Date">
              <Input type="date" value={startForm.start_session_date}
                onChange={e => setStartForm(f => ({ ...f, start_session_date: e.target.value }))} />
            </FormField>
            <FormField label="Start Time">
              <Input type="time" value={startForm.start_session_time}
                onChange={e => setStartForm(f => ({ ...f, start_session_time: e.target.value }))} />
            </FormField>
          </div>
          <div className="flex gap-3 mt-4">
            <Button variant="secondary" onClick={() => setStartModal(null)}>Cancel</Button>
            <Button loading={submitting} onClick={handleStartSession}>Start Session</Button>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}
