'use client';
import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import FormField, { Input } from '@/components/ui/FormField';
import { XCircle, RotateCcw } from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

interface MissedSession {
  ssid: string;
  student_name: string;
  course_name: string; course_code: string;
  entry_date: string;
  schedule_start_time: string; schedule_end_time: string;
}

export default function TutorMissedSessionsPage() {
  const user = useAuthStore(state => state.user);
  const [sessions, setSessions] = useState<MissedSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<MissedSession | null>(null);
  const [form, setForm] = useState({ reschedule_to: '', reschedule_time: '' });
  const [submitting, setSubmitting] = useState(false);

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

  const handleReschedule = async () => {
    if (!modal) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/sessions/${modal.ssid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rescheduled', reschedule_to: form.reschedule_to, reschedule_time: form.reschedule_time }),
      });
      if (!res.ok) throw new Error();
      toast.success('Session rescheduled!');
      setModal(null);
      fetchSessions();
    } catch { toast.error('Failed to reschedule session'); }
    setSubmitting(false);
  };

  const columns = [
    { key: 'student_name', label: 'Student', sortable: true },
    { key: 'course_name', label: 'Course', render: (_: unknown, row: MissedSession) => (
      <div>
        <p className="font-medium text-sm">{row.course_name || '—'}</p>
        {row.course_code && <span className="font-mono text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{row.course_code}</span>}
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
          actions={(row) => (
            <button
              onClick={() => { setForm({ reschedule_to: '', reschedule_time: '' }); setModal(row); }}
              className="px-2 py-1 text-xs rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 flex items-center gap-1"
            >
              <RotateCcw size={11} /> Reschedule
            </button>
          )}
        />
      </div>

      {modal && (
        <Modal isOpen={true} onClose={() => setModal(null)} title="Reschedule Session" size="sm">
          <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm space-y-0.5">
            <p><span className="font-medium">Student:</span> {modal.student_name}</p>
            <p><span className="font-medium">Course:</span> {modal.course_name}</p>
            <p className="text-gray-400 text-xs pt-1">
              Originally: {modal.entry_date ? formatDate(modal.entry_date) : '—'}
              {modal.schedule_start_time ? ` at ${formatTime(modal.schedule_start_time)}` : ''}
            </p>
          </div>
          <div className="space-y-3">
            <FormField label="New Date">
              <Input type="date" value={form.reschedule_to}
                onChange={e => setForm(f => ({ ...f, reschedule_to: e.target.value }))} />
            </FormField>
            <FormField label="New Time">
              <Input type="time" value={form.reschedule_time}
                onChange={e => setForm(f => ({ ...f, reschedule_time: e.target.value }))} />
            </FormField>
          </div>
          <div className="flex gap-3 mt-4">
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button loading={submitting} onClick={handleReschedule}
              disabled={!form.reschedule_to || !form.reschedule_time}>
              Reschedule
            </Button>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}
