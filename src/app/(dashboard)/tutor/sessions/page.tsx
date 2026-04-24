'use client';
import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { statusBadge } from '@/components/ui/Badge';
import FormField, { Input, Select, Textarea } from '@/components/ui/FormField';
import { Video, Square, ClipboardList } from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

interface Session {
  ssid: string; schedule_id: string;
  student_id: string; student_name: string;
  tutor_id: string; tutor_firstname: string; tutor_lastname: string;
  course_name: string; course_code: string;
  entry_date: string; schedule_start_time: string; schedule_end_time: string;
  start_session_date: string; start_session_time: string;
  end_session_date: string; end_session_time: string;
  session_duration: number; status: string; zoom_link: string;
}

const emptyActivityForm = {
  ssid: '', student_id: '', student_name: '', course_name: '', course_code: '',
  tutor_id: '', tutor_firstname: '', tutor_lastname: '',
  class_activity_date: new Date().toISOString().split('T')[0],
  class_activity_time: new Date().toTimeString().slice(0, 5),
  topic_taught: '', details_of_class_activity: '',
  did_student_complete_prev_homework: '',
  new_homework_assigned: 'false', topic_of_homework: '',
  did_student_join_on_time: '', punctuality1: '',
  is_student_attentive: '', attentiveness1: '',
  student_engages_in_class: '', class_engagement1: '',
  tutors_general_observation: '', tutors_intervention: '',
  helpful_link1: '', helpful_link2: '', helpful_link3: '',
};

function scorePunctuality(v: string) { return v === 'Yes' ? '100' : v === 'No' ? '50' : ''; }
function scoreAttentiveness(v: string) { return v === 'Yes' ? '100' : v === 'Partially' ? '50' : v === 'No' ? '0' : ''; }
function scoreEngagement(v: string) { return v === 'Yes' ? '100' : v === 'Partially' ? '50' : v === 'No' ? '0' : ''; }

function ScoreBadge({ score }: { score: string }) {
  if (!score) return null;
  const n = Number(score);
  const c = n === 100 ? 'bg-green-100 text-green-700' : n >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
  return <span className={`ml-1.5 text-xs font-semibold px-1.5 py-0.5 rounded-full ${c}`}>{score}/100</span>;
}

function calcDuration(startDate: string, startTime: string, endDate: string, endTime: string): string {
  if (!startDate || !startTime || !endDate || !endTime) return '';
  const start = new Date(`${startDate}T${startTime}`);
  const end = new Date(`${endDate}T${endTime}`);
  const diff = Math.round((end.getTime() - start.getTime()) / 60000);
  return diff > 0 ? String(diff) : '';
}

export default function TutorSessionsPage() {
  const user = useAuthStore(state => state.user);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  // End session modal
  const [endModal, setEndModal] = useState<Session | null>(null);
  const [endForm, setEndForm] = useState({
    end_session_date: '',
    end_session_time: '',
    session_duration: '',
    // submitted but not shown
    start_session_date: '',
    start_session_time: '',
    schedule_start_time: '',
    schedule_end_time: '',
  });
  const [endSubmitting, setEndSubmitting] = useState(false);

  // Log activity modal
  const [activityModal, setActivityModal] = useState<Session | null>(null);
  const [activityForm, setActivityForm] = useState(emptyActivityForm);
  const [actSubmitting, setActSubmitting] = useState(false);

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

  const openLogActivity = (session: Session) => {
    setActivityForm({
      ...emptyActivityForm,
      ssid: session.ssid,
      student_id: session.student_id || '',
      student_name: session.student_name || '',
      course_name: session.course_name || '',
      course_code: session.course_code || '',
      tutor_id: session.tutor_id || '',
      tutor_firstname: session.tutor_firstname || '',
      tutor_lastname: session.tutor_lastname || '',
      class_activity_date: session.end_session_date
        ? session.end_session_date.split('T')[0]
        : session.entry_date
          ? session.entry_date.split('T')[0]
          : new Date().toISOString().split('T')[0],
    });
    setActivityModal(session);
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

  const handleLogActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    setActSubmitting(true);
    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...activityForm, tutor_id: user?.user_id }),
      });
      if (!res.ok) throw new Error();
      toast.success('Activity logged!');
      setActivityModal(null);
    } catch { toast.error('Failed to log activity'); }
    setActSubmitting(false);
  };

  const columns = [
    { key: 'student_name', label: 'Student', sortable: true },
    { key: 'course_name', label: 'Course', render: (_: unknown, row: Session) => (
      <div>
        <p className="font-medium text-sm">{row.course_name || '—'}</p>
        {row.course_code && <span className="font-mono text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{row.course_code}</span>}
      </div>
    )},
    { key: 'entry_date', label: 'Date', render: (v: unknown) => formatDate(v as string) },
    { key: 'schedule_start_time', label: 'Time', render: (v: unknown) => formatTime(v as string) },
    { key: 'session_duration', label: 'Duration', render: (v: unknown) => v ? `${v} min` : '—' },
    { key: 'zoom_link', label: 'Zoom', render: (v: unknown) => v ? (
      <a href={v as string} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs flex items-center gap-1">
        <Video size={12} /> Join
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
              {row.status === 'started' && (
                <button onClick={() => {
                  const now = new Date();
                  const nowDate = now.toISOString().split('T')[0];
                  const nowTime = now.toTimeString().slice(0, 5);
                  const startDate = row.start_session_date?.split('T')[0] || row.entry_date?.split('T')[0] || nowDate;
                  const startTime = row.start_session_time || '';
                  setEndForm({
                    end_session_date: nowDate,
                    end_session_time: nowTime,
                    session_duration: calcDuration(startDate, startTime, nowDate, nowTime),
                    start_session_date: startDate,
                    start_session_time: startTime,
                    schedule_start_time: row.schedule_start_time || '',
                    schedule_end_time: row.schedule_end_time || '',
                  });
                  setEndModal(row);
                }}
                  className="px-2 py-1 text-xs rounded-lg bg-red-50 text-red-700 hover:bg-red-100 flex items-center gap-1">
                  <Square size={11} /> End
                </button>
              )}
              {row.status === 'ended' && (
                <button onClick={() => openLogActivity(row)}
                  className="px-2 py-1 text-xs rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 flex items-center gap-1">
                  <ClipboardList size={11} /> Log Activity
                </button>
              )}
            </div>
          )}
        />
      </div>

      {/* End Session Modal */}
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

      {/* Log Activity Modal */}
      {activityModal && (
        <Modal isOpen={true} onClose={() => setActivityModal(null)} title="Log Class Activity" size="2xl">
          <form onSubmit={handleLogActivity} className="space-y-5">

            {/* Auto-populated session info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-blue-50 rounded-xl p-3">
              <div>
                <p className="text-xs text-blue-400 font-medium">Student</p>
                <p className="font-semibold text-blue-900 text-sm">{activityForm.student_name || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-blue-400 font-medium">Course</p>
                <p className="font-semibold text-blue-900 text-sm">{activityForm.course_name || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-blue-400 font-medium">Course Code</p>
                <p className="font-semibold text-blue-900 text-sm font-mono">{activityForm.course_code || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-blue-400 font-medium">Tutor</p>
                <p className="font-semibold text-blue-900 text-sm">{[activityForm.tutor_firstname, activityForm.tutor_lastname].filter(Boolean).join(' ') || '—'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Date">
                <Input type="date" value={activityForm.class_activity_date} onChange={e => setActivityForm({ ...activityForm, class_activity_date: e.target.value })} />
              </FormField>
              <FormField label="Time">
                <Input type="time" value={activityForm.class_activity_time} onChange={e => setActivityForm({ ...activityForm, class_activity_time: e.target.value })} />
              </FormField>
            </div>

            <FormField label="Topic Taught" required>
              <Input value={activityForm.topic_taught} onChange={e => setActivityForm({ ...activityForm, topic_taught: e.target.value })} required />
            </FormField>
            <FormField label="Class Details">
              <Textarea rows={3} value={activityForm.details_of_class_activity} onChange={e => setActivityForm({ ...activityForm, details_of_class_activity: e.target.value })} />
            </FormField>

            {/* Grading */}
            <div className="border-t pt-4">
              <h4 className="font-semibold text-sm text-gray-700 mb-3">Class Performance</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <FormField label={<span className="flex items-center">Student Joined On Time? <ScoreBadge score={activityForm.punctuality1} /></span>}>
                    <Select value={activityForm.did_student_join_on_time} onChange={e => setActivityForm(f => ({ ...f, did_student_join_on_time: e.target.value, punctuality1: scorePunctuality(e.target.value) }))}>
                      <option value="">Select</option><option>Yes</option><option>No</option>
                    </Select>
                  </FormField>
                  {activityForm.punctuality1 && <p className="text-xs text-gray-400">Score: <strong>{activityForm.punctuality1}/100</strong></p>}
                </div>
                <div className="space-y-1">
                  <FormField label={<span className="flex items-center">Student Attentive? <ScoreBadge score={activityForm.attentiveness1} /></span>}>
                    <Select value={activityForm.is_student_attentive} onChange={e => setActivityForm(f => ({ ...f, is_student_attentive: e.target.value, attentiveness1: scoreAttentiveness(e.target.value) }))}>
                      <option value="">Select</option><option>Yes</option><option>Partially</option><option>No</option>
                    </Select>
                  </FormField>
                  {activityForm.attentiveness1 && <p className="text-xs text-gray-400">Score: <strong>{activityForm.attentiveness1}/100</strong></p>}
                </div>
                <div className="space-y-1">
                  <FormField label={<span className="flex items-center">Student Engaged? <ScoreBadge score={activityForm.class_engagement1} /></span>}>
                    <Select value={activityForm.student_engages_in_class} onChange={e => setActivityForm(f => ({ ...f, student_engages_in_class: e.target.value, class_engagement1: scoreEngagement(e.target.value) }))}>
                      <option value="">Select</option><option>Yes</option><option>Partially</option><option>No</option>
                    </Select>
                  </FormField>
                  {activityForm.class_engagement1 && <p className="text-xs text-gray-400">Score: <strong>{activityForm.class_engagement1}/100</strong></p>}
                </div>
              </div>
              {(activityForm.punctuality1 || activityForm.attentiveness1 || activityForm.class_engagement1) && (
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm bg-gray-50 rounded-xl px-4 py-2">
                  {[['Punctuality', activityForm.punctuality1], ['Attentiveness', activityForm.attentiveness1], ['Engagement', activityForm.class_engagement1]].filter(([, s]) => s).map(([l, s]) => (
                    <span key={l} className="flex items-center gap-1 text-gray-600"><span className="text-gray-400">{l}:</span><strong>{s}</strong></span>
                  ))}
                </div>
              )}
            </div>

            <FormField label="General Observation">
              <Textarea rows={2} value={activityForm.tutors_general_observation} onChange={e => setActivityForm({ ...activityForm, tutors_general_observation: e.target.value })} />
            </FormField>
            <FormField label="Intervention / Action">
              <Textarea rows={2} value={activityForm.tutors_intervention} onChange={e => setActivityForm({ ...activityForm, tutors_intervention: e.target.value })} />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(['helpful_link1', 'helpful_link2', 'helpful_link3'] as const).map((k, i) => (
                <FormField key={k} label={`Helpful Link ${i + 1}`}>
                  <Input value={activityForm[k]} onChange={e => setActivityForm({ ...activityForm, [k]: e.target.value })} placeholder="https://..." />
                </FormField>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setActivityModal(null)}>Cancel</Button>
              <Button type="submit" loading={actSubmitting} icon={ClipboardList}>Log Activity</Button>
            </div>
          </form>
        </Modal>
      )}
    </DashboardLayout>
  );
}
