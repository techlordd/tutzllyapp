'use client';
import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import FormField, { Input } from '@/components/ui/FormField';
import { Calendar, Play, RotateCcw } from 'lucide-react';
import { formatTime } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

interface Schedule {
  schedule_id: string; student_id: string; student_name: string;
  tutor_id: string; tutor_name: string; tutor_email: string;
  course_name: string; course_code: string; course_id: number;
  day: string; session_start_time: string; session_end_time: string;
  duration: number; zoom_link: string; meeting_id: string; time_zone: string;
  assign_status: string;
}

interface Session {
  ssid: string; schedule_id: string; student_name: string; course_name: string;
  status: string; entry_date: string;
}

const DAYS = [
  { label: 'Mon', full: 'Monday',    bg: 'bg-blue-500',   ring: 'ring-blue-500',   light: 'bg-blue-100 text-blue-700' },
  { label: 'Tue', full: 'Tuesday',   bg: 'bg-purple-500', ring: 'ring-purple-500', light: 'bg-purple-100 text-purple-700' },
  { label: 'Wed', full: 'Wednesday', bg: 'bg-emerald-500',ring: 'ring-emerald-500',light: 'bg-emerald-100 text-emerald-700' },
  { label: 'Thu', full: 'Thursday',  bg: 'bg-orange-500', ring: 'ring-orange-500', light: 'bg-orange-100 text-orange-700' },
  { label: 'Fri', full: 'Friday',    bg: 'bg-red-500',    ring: 'ring-red-500',    light: 'bg-red-100 text-red-700' },
  { label: 'Sat', full: 'Saturday',  bg: 'bg-pink-500',   ring: 'ring-pink-500',   light: 'bg-pink-100 text-pink-700' },
  { label: 'Sun', full: 'Sunday',    bg: 'bg-amber-500',  ring: 'ring-amber-500',  light: 'bg-amber-100 text-amber-700' },
];

const today = new Date().toISOString().split('T')[0];

export default function TutorSchedulePage() {
  const user = useAuthStore(state => state.user);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Action modal state (Start / Reschedule)
  const [actionModal, setActionModal] = useState<{ schedule: Schedule; action: string } | null>(null);
  const [actionForm, setActionForm] = useState({
    start_session_date: today,
    start_session_time: new Date().toTimeString().slice(0, 5),
    reschedule_to: '',
    reschedule_time: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.user_id) return;
    setLoading(true);
    try {
      const [schRes, sesRes] = await Promise.all([
        fetch(`/api/schedules?tutor_id=${user.user_id}`),
        fetch(`/api/sessions?tutor_id=${user.user_id}`),
      ]);
      const [schData, sesData] = await Promise.all([schRes.json(), sesRes.json()]);
      setSchedules(schData.schedules || []);
      setSessions(sesData.sessions || []);
    } catch { toast.error('Failed to load data'); }
    setLoading(false);
  }, [user?.user_id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const sessionForToday = useCallback((schedule: Schedule): Session | undefined => {
    return sessions.find(s =>
      s.schedule_id === schedule.schedule_id &&
      s.entry_date && s.entry_date.split('T')[0] === today
    );
  }, [sessions]);

  const buildSessionBody = (schedule: Schedule, status: string, form: typeof actionForm) => ({
    schedule_id: schedule.schedule_id,
    tutor_id: schedule.tutor_id,
    tutor_firstname: schedule.tutor_name?.split(' ')[0] || '',
    tutor_lastname: schedule.tutor_name?.split(' ').slice(1).join(' ') || '',
    student_id: schedule.student_id,
    student_name: schedule.student_name,
    course_name: schedule.course_name,
    course_id: schedule.course_id,
    entry_date: form.start_session_date || today,
    day: schedule.day,
    schedule_start_time: schedule.session_start_time,
    schedule_end_time: schedule.session_end_time,
    zoom_link: schedule.zoom_link,
    meeting_id: schedule.meeting_id,
    start_session_date: form.start_session_date,
    start_session_time: form.start_session_time,
    reschedule_to: form.reschedule_to,
    reschedule_time: form.reschedule_time,
    status,
  });

  const handleAction = async (action: string) => {
    if (!actionModal) return;
    setSubmitting(true);
    const statusMap: Record<string, string> = { start: 'started', reschedule: 'rescheduled' };
    const status = statusMap[action];
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildSessionBody(actionModal.schedule, status, actionForm)),
      });
      if (!res.ok) throw new Error();
      toast.success(action === 'start' ? 'Session started!' : 'Session rescheduled!');
      setActionModal(null);
      fetchData();
    } catch { toast.error('Failed to update session'); }
    setSubmitting(false);
  };

  const handleMissed = async (schedule: Schedule) => {
    if (!confirm('Mark this session as missed?')) return;
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildSessionBody(schedule, 'missed', { start_session_date: today, start_session_time: '', reschedule_to: '', reschedule_time: '' })),
      });
      if (!res.ok) throw new Error();
      toast.success('Session marked as missed');
      fetchData();
    } catch { toast.error('Failed to mark session as missed'); }
  };

  const filtered = selectedDay ? schedules.filter(s => s.day === selectedDay) : schedules;

  const sessionStatusBadge = (schedule: Schedule) => {
    const s = sessionForToday(schedule);
    if (!s) return <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 font-medium">Scheduled</span>;
    const map: Record<string, string> = {
      started:     'bg-blue-50 text-blue-700',
      ended:       'bg-green-50 text-green-700',
      missed:      'bg-red-50 text-red-600',
      rescheduled: 'bg-amber-50 text-amber-700',
    };
    const labels: Record<string, string> = {
      started: '● Active',
      ended: '✓ Concluded',
      missed: 'Missed',
      rescheduled: 'Rescheduled',
    };
    return (
      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${map[s.status] ?? 'bg-gray-100 text-gray-500'}`}>
        {labels[s.status] ?? s.status}
      </span>
    );
  };

  const columns = [
    { key: 'course_name', label: 'Course', sortable: true, render: (_: unknown, row: Schedule) => (
      <div>
        <p className="font-medium text-sm">{row.course_name || '—'}</p>
        {row.course_code && <span className="font-mono text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{row.course_code}</span>}
      </div>
    )},
    { key: 'day', label: 'Day', sortable: true, render: (v: unknown) => {
      const d = DAYS.find(d => d.full === (v as string));
      return d ? <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${d.light}`}>{v as string}</span> : <span>{v as string}</span>;
    }},
    { key: 'student_name', label: 'Student Name', sortable: true },
    { key: 'session_start_time', label: 'Period', render: (_: unknown, row: Schedule) => (
      <span className="text-sm text-gray-700 font-mono whitespace-nowrap">
        {formatTime(row.session_start_time)} – {formatTime(row.session_end_time)}
      </span>
    )},
    { key: 'status', label: 'Status', render: (_: unknown, row: Schedule) => sessionStatusBadge(row) },
  ];

  return (
    <DashboardLayout title="My Schedule">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Calendar size={24} className="text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">My Schedule</h2>
            <p className="text-gray-500 text-sm">{filtered.length} of {schedules.length} scheduled sessions</p>
          </div>
        </div>

        {/* Day filter buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedDay(null)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${selectedDay === null ? 'bg-gray-800 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >All</button>
          {DAYS.map(d => (
            <button key={d.full}
              onClick={() => setSelectedDay(selectedDay === d.full ? null : d.full)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${selectedDay === d.full ? `${d.bg} text-white shadow-sm ring-2 ${d.ring} ring-offset-1` : `${d.light} hover:opacity-80`}`}
            >{d.label}</button>
          ))}
        </div>

        <DataTable data={filtered} columns={columns} loading={loading}
          searchKeys={['student_name', 'course_name', 'day']}
          emptyMessage="No schedules for this day"
          actions={(row) => {
            const todaySession = sessionForToday(row);
            const isActive     = todaySession?.status === 'started';
            const isConcluded  = todaySession?.status === 'ended';
            return (
              <div className="flex items-center gap-2">
                <button
                  disabled={isActive || isConcluded}
                  onClick={() => { setActionForm({ start_session_date: today, start_session_time: new Date().toTimeString().slice(0, 5), reschedule_to: '', reschedule_time: '' }); setActionModal({ schedule: row, action: 'start' }); }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 active:bg-green-800 shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  <Play size={11} fill="currentColor" /> Start
                </button>
                <button
                  disabled={isConcluded}
                  onClick={() => { setActionForm(f => ({ ...f, reschedule_to: '', reschedule_time: '' })); setActionModal({ schedule: row, action: 'reschedule' }); }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-amber-400 bg-white text-amber-700 hover:bg-amber-50 active:bg-amber-100 shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  <RotateCcw size={11} /> Reschedule
                </button>
                <button
                  disabled={isConcluded}
                  onClick={() => handleMissed(row)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-300 bg-white text-red-600 hover:bg-red-50 active:bg-red-100 shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  Missed
                </button>
              </div>
            );
          }}
        />
      </div>

      {/* Action Modal */}
      {actionModal && (
        <Modal isOpen={true} onClose={() => setActionModal(null)}
          title={actionModal.action === 'start' ? 'Start Session' : 'Reschedule Session'}
          size="sm">
          <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm space-y-0.5">
            <p><span className="font-medium">Student:</span> {actionModal.schedule.student_name}</p>
            <p><span className="font-medium">Course:</span> {actionModal.schedule.course_name}</p>
          </div>

          {actionModal.action === 'start' && (
            <div className="space-y-3">
              <FormField label="Start Date"><Input type="date" value={actionForm.start_session_date} onChange={e => setActionForm({ ...actionForm, start_session_date: e.target.value })} /></FormField>
              <FormField label="Start Time"><Input type="time" value={actionForm.start_session_time} onChange={e => setActionForm({ ...actionForm, start_session_time: e.target.value })} /></FormField>
            </div>
          )}

          {actionModal.action === 'reschedule' && (
            <div className="space-y-3">
              <FormField label="Reschedule To (Date)"><Input type="date" value={actionForm.reschedule_to} onChange={e => setActionForm({ ...actionForm, reschedule_to: e.target.value })} /></FormField>
              <FormField label="New Time"><Input type="time" value={actionForm.reschedule_time} onChange={e => setActionForm({ ...actionForm, reschedule_time: e.target.value })} /></FormField>
            </div>
          )}

          <div className="flex gap-3 mt-4">
            <Button variant="secondary" onClick={() => setActionModal(null)}>Cancel</Button>
            <Button loading={submitting} onClick={() => handleAction(actionModal.action)}>
              {actionModal.action === 'start' ? 'Start Session' : 'Reschedule'}
            </Button>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}
