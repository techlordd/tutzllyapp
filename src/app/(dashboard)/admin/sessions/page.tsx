'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { statusBadge } from '@/components/ui/Badge';
import FormField, { Input, Select } from '@/components/ui/FormField';
import { Plus, Edit, Video, Eye, Trash2 } from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Session {
  ssid: string; schedule_id: string;
  tutor_id: string; tutor_firstname: string; tutor_lastname: string;
  student_id: string; student_name: string; student_email: string;
  email_lookup_student_id: string; confirmation: string;
  course_name: string; course_id_ref: string;
  entry_date: string; day: string;
  schedule_start_time: string; schedule_end_time: string; schedule_day: string;
  start_session_date: string; start_session_time: string; start_session_confirmation: string;
  end_session_date: string; end_session_time: string; end_session_confirmation: string;
  session_duration: number; status: string; status_admin: string; session_code_status: string;
  zoom_link: string; meeting_id: string; meeting_passcode: string;
  reschedule_to: string; reschedule_time: string;
  mothers_email: string; fathers_email: string;
  missed_session_id1: string; missed_schedule_id1: string; missed_status1: string;
  missed_tutor_id1: string; missed_tutor_firstname1: string; missed_tutor_lastname1: string;
  missed_student_name1: string; missed_course1: string; missed_course_id1: string; missed_session_code_status1: string;
  missed_session_id2: string; missed_schedule_id2: string; missed_status2: string;
  missed_tutor_id2: string; missed_tutor_firstname2: string; missed_tutor_lastname2: string;
  missed_student_name2: string; missed_course2: string; missed_course_id2: string; missed_session_code_status2: string;
  entry_status: string; timestamp: string; last_updated: string;
  created_by: string; updated_by: string; ip: string; record_key: string;
}

const STATUS_OPTIONS = ['scheduled', 'started', 'ended', 'missed', 'rescheduled'];

export default function SessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [schedules, setSchedules] = useState<{schedule_id: string; student_name: string; tutor_name: string; course_name: string; day: string; session_start_time: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  const [form, setForm] = useState({
    schedule_id: '', tutor_id: '', tutor_firstname: '', tutor_lastname: '',
    student_id: '', student_name: '', student_email: '', course_name: '', course_id: '',
    entry_date: new Date().toISOString().split('T')[0], day: '',
    schedule_start_time: '', schedule_end_time: '', schedule_day: '',
    zoom_link: '', meeting_id: '', meeting_passcode: '',
    mothers_email: '', fathers_email: '',
  });

  const [editForm, setEditForm] = useState({
    status: '', start_session_date: '', start_session_time: '',
    end_session_date: '', end_session_time: '', session_duration: '',
    reschedule_to: '', reschedule_time: '', session_code_status: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [sesRes, schRes] = await Promise.all([fetch('/api/sessions'), fetch('/api/schedules')]);
      const [sesData, schData] = await Promise.all([sesRes.json(), schRes.json()]);
      setSessions(sesData.sessions || []);
      setSchedules(schData.schedules || []);
    } catch { toast.error('Failed to load data'); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleScheduleChange = (scheduleId: string) => {
    const sch = schedules.find(s => s.schedule_id === scheduleId);
    if (sch) {
      setForm(f => ({
        ...f, schedule_id: scheduleId,
        schedule_start_time: (sch as any).session_start_time || '',
        schedule_end_time: (sch as any).session_end_time || '',
        course_name: sch.course_name || '', day: sch.day || '',
        zoom_link: (sch as any).zoom_link || '',
        meeting_id: (sch as any).meeting_id || '',
        meeting_passcode: (sch as any).meeting_passcode || '',
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      toast.success('Session created!');
      setModalOpen(false);
      fetchData();
    } catch { toast.error('Failed to create session'); }
    setSubmitting(false);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSession) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/sessions/${editingSession.ssid}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm)
      });
      if (!res.ok) throw new Error();
      toast.success('Session updated!');
      setEditModalOpen(false);
      fetchData();
    } catch { toast.error('Failed to update session'); }
    setSubmitting(false);
  };

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    try {
      const res = await fetch('/api/sessions', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed to delete sessions'); setDeletingAll(false); return; }
      toast.success(`Deleted ${data.deleted} session${data.deleted !== 1 ? 's' : ''}`);
      setDeleteAllOpen(false);
      fetchData();
    } catch { toast.error('Failed to delete sessions'); }
    setDeletingAll(false);
  };

  const openEdit = (session: Session) => {
    setEditingSession(session);
    setEditForm({
      status: session.status || 'scheduled',
      start_session_date: session.start_session_date || '',
      start_session_time: session.start_session_time || '',
      end_session_date: session.end_session_date || '',
      end_session_time: session.end_session_time || '',
      session_duration: String(session.session_duration || ''),
      reschedule_to: '', reschedule_time: '', session_code_status: '',
    });
    setEditModalOpen(true);
  };

  const columns = [
    { key: 'ssid', label: 'SSID', render: (v: unknown) =>
      <span className="font-mono text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">{(v as string)?.slice(0, 12)}…</span>
    },
    { key: 'student_name', label: 'Student Name', sortable: true, render: (v: unknown) => (
      <span className="font-medium">{v as string || '—'}</span>
    )},
    { key: 'student_id', label: 'Student ID', render: (v: unknown) => (
      <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{v as string || '—'}</span>
    )},
    { key: 'tutor_firstname', label: 'Tutor Name', render: (_: unknown, row: Session) => (
      <span className="font-medium">{[row.tutor_firstname, row.tutor_lastname].filter(Boolean).join(' ') || '—'}</span>
    )},
    { key: 'tutor_id', label: 'Tutor ID', render: (v: unknown) => (
      <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{v as string || '—'}</span>
    )},
    { key: 'course_name', label: 'Course' },
    { key: 'entry_date', label: 'Entry Date', render: (v: unknown) => formatDate(v as string) },
    { key: 'day', label: 'Day', render: (v: unknown) => <span className="text-sm">{v as string || '—'}</span> },
    { key: 'schedule_start_time', label: 'Schedule Time', render: (_: unknown, row: Session) => (
      <span className="text-sm">{formatTime(row.schedule_start_time)} – {formatTime(row.schedule_end_time)}</span>
    )},
    { key: 'zoom_link', label: 'Zoom', render: (v: unknown) => v ? (
      <a href={v as string} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 text-xs">
        <Video size={12} /> Join
      </a>
    ) : <span className="text-gray-400 text-xs">—</span> },
    { key: 'status', label: 'Status', render: (v: unknown) => statusBadge(v as string) },
  ];

  return (
    <DashboardLayout title="Sessions">
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Sessions</h2>
            <p className="text-gray-500 text-sm mt-0.5">{sessions.length} session{sessions.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="danger" icon={Trash2} onClick={() => setDeleteAllOpen(true)}>Delete All</Button>
            <Button icon={Plus} onClick={() => setModalOpen(true)}>Start Session</Button>
          </div>
        </div>

        <DataTable data={sessions} columns={columns} loading={loading}
          searchKeys={['student_name', 'student_id', 'tutor_firstname', 'course_name', 'ssid', 'status']}
          emptyMessage="No sessions recorded yet"
          actions={(row) => (
            <>
              <button onClick={() => router.push(`/admin/sessions/${row.ssid}`)}
                className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors" title="View details">
                <Eye size={15} />
              </button>
              <button onClick={() => openEdit(row)}
                className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors" title="Edit">
                <Edit size={15} />
              </button>
            </>
          )}
        />
      </div>

      {/* Delete All modal */}
      <Modal isOpen={deleteAllOpen} onClose={() => setDeleteAllOpen(false)} title="Delete All Sessions" size="sm">
        <div className="space-y-4">
          <p className="text-gray-600 text-sm">
            This will permanently delete all <strong>{sessions.length}</strong> session record{sessions.length !== 1 ? 's' : ''}.
            This action cannot be undone.
          </p>
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" onClick={() => setDeleteAllOpen(false)}>Cancel</Button>
            <Button variant="danger" loading={deletingAll} onClick={handleDeleteAll}>Delete All</Button>
          </div>
        </div>
      </Modal>

      {/* Create Session Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create Session" size="xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Schedule" required>
            <Select value={form.schedule_id} onChange={e => handleScheduleChange(e.target.value)} required>
              <option value="">Select Schedule</option>
              {schedules.map(s => (
                <option key={s.schedule_id} value={s.schedule_id}>
                  {s.student_name} — {s.tutor_name} — {s.course_name} ({s.day} {formatTime(s.session_start_time)})
                </option>
              ))}
            </Select>
          </FormField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Entry Date" required>
              <Input type="date" value={form.entry_date} onChange={e => setForm({...form, entry_date: e.target.value})} required />
            </FormField>
            <FormField label="Student Email">
              <Input type="email" value={form.student_email} onChange={e => setForm({...form, student_email: e.target.value})} />
            </FormField>
            <FormField label="Mother's Email">
              <Input type="email" value={form.mothers_email} onChange={e => setForm({...form, mothers_email: e.target.value})} />
            </FormField>
            <FormField label="Father's Email">
              <Input type="email" value={form.fathers_email} onChange={e => setForm({...form, fathers_email: e.target.value})} />
            </FormField>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={submitting}>Create Session</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Session Modal */}
      {editingSession && (
        <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Update Session" size="xl">
          <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm">
            <p><span className="font-medium">Student:</span> {editingSession.student_name}</p>
            <p><span className="font-medium">Course:</span> {editingSession.course_name}</p>
            <p><span className="font-medium">SSID:</span> <span className="font-mono">{editingSession.ssid}</span></p>
          </div>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <FormField label="Session Status" required>
              <Select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})} required>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </Select>
            </FormField>
            {(editForm.status === 'started' || editForm.status === 'ended') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Start Date"><Input type="date" value={editForm.start_session_date} onChange={e => setEditForm({...editForm, start_session_date: e.target.value})} /></FormField>
                <FormField label="Start Time"><Input type="time" value={editForm.start_session_time} onChange={e => setEditForm({...editForm, start_session_time: e.target.value})} /></FormField>
              </div>
            )}
            {editForm.status === 'ended' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="End Date"><Input type="date" value={editForm.end_session_date} onChange={e => setEditForm({...editForm, end_session_date: e.target.value})} /></FormField>
                <FormField label="End Time"><Input type="time" value={editForm.end_session_time} onChange={e => setEditForm({...editForm, end_session_time: e.target.value})} /></FormField>
                <FormField label="Duration (min)"><Input type="number" value={editForm.session_duration} onChange={e => setEditForm({...editForm, session_duration: e.target.value})} /></FormField>
              </div>
            )}
            {editForm.status === 'rescheduled' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Reschedule To"><Input type="date" value={editForm.reschedule_to} onChange={e => setEditForm({...editForm, reschedule_to: e.target.value})} /></FormField>
                <FormField label="Reschedule Time"><Input type="time" value={editForm.reschedule_time} onChange={e => setEditForm({...editForm, reschedule_time: e.target.value})} /></FormField>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setEditModalOpen(false)}>Cancel</Button>
              <Button type="submit" loading={submitting}>Update Session</Button>
            </div>
          </form>
        </Modal>
      )}
    </DashboardLayout>
  );
}
