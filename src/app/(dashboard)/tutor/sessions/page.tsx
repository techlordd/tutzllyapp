'use client';
import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { statusBadge } from '@/components/ui/Badge';
import FormField, { Input, Select, Textarea } from '@/components/ui/FormField';
import { Video, Square, ClipboardList, Eye, CheckCircle, AlertCircle, Link2 } from 'lucide-react';
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

interface Activity {
  record_id: number; ssid: string; student_name: string; course_name: string; course_code: string;
  class_activity_date: string; class_activity_time: string;
  topic_taught: string; details_of_class_activity: string;
  did_student_complete_prev_homework: string; new_homework_assigned: string; topic_of_homework: string;
  homework1: string; homework2: string; homework3: string;
  did_student_join_on_time: string; punctuality1: string;
  is_student_attentive: string; attentiveness1: string;
  student_engages_in_class: string; class_engagement1: string;
  tutors_general_observation: string; tutors_intervention: string;
  helpful_link1: string; helpful_link2: string; helpful_link3: string;
}

export default function TutorSessionsPage() {
  const user = useAuthStore(state => state.user);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activityMap, setActivityMap] = useState<Map<string, Activity>>(new Map());
  const [viewActivity, setViewActivity] = useState<Activity | null>(null);
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
      const [sessRes, actRes] = await Promise.all([
        fetch(`/api/sessions?tutor_id=${user.user_id}`),
        fetch(`/api/activities?tutor_id=${user.user_id}`),
      ]);
      const [sessData, actData] = await Promise.all([sessRes.json(), actRes.json()]);
      setSessions(sessData.sessions || []);
      const map = new Map<string, Activity>();
      for (const a of (actData.activities || []) as Activity[]) {
        if (a.ssid) map.set(a.ssid, a);
      }
      setActivityMap(map);
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
                activityMap.has(row.ssid)
                  ? (
                    <button onClick={() => setViewActivity(activityMap.get(row.ssid)!)}
                      className="px-2 py-1 text-xs rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 flex items-center gap-1">
                      <Eye size={11} /> View Class Activity
                    </button>
                  ) : (
                    <button onClick={() => openLogActivity(row)}
                      className="px-2 py-1 text-xs rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 flex items-center gap-1">
                      <ClipboardList size={11} /> Log Activity
                    </button>
                  )
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
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Start Time">
                <Input type="time" value={endForm.start_session_time}
                  onChange={e => {
                    const t = e.target.value;
                    setEndForm(f => ({ ...f, start_session_time: t, session_duration: calcDuration(f.start_session_date, t, f.end_session_date, f.end_session_time) }));
                  }} />
              </FormField>
              <FormField label="End Time">
                <Input type="time" value={endForm.end_session_time}
                  onChange={e => {
                    const t = e.target.value;
                    setEndForm(f => ({ ...f, end_session_time: t, session_duration: calcDuration(f.start_session_date, f.start_session_time, f.end_session_date, t) }));
                  }} />
              </FormField>
            </div>
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

      {/* View Class Activity Modal */}
      {viewActivity && (
        <Modal isOpen={true} onClose={() => setViewActivity(null)} title="Class Activity" size="2xl">
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-blue-50 rounded-xl p-3">
              <div><p className="text-xs text-blue-400 font-medium">Student</p><p className="font-semibold text-blue-900 text-sm">{viewActivity.student_name || '—'}</p></div>
              <div><p className="text-xs text-blue-400 font-medium">Course</p><p className="font-semibold text-blue-900 text-sm">{viewActivity.course_name || '—'}</p></div>
              {viewActivity.course_code && <div><p className="text-xs text-blue-400 font-medium">Code</p><p className="font-semibold text-blue-900 text-sm font-mono">{viewActivity.course_code}</p></div>}
              <div>
                <p className="text-xs text-blue-400 font-medium">Date</p>
                <p className="font-semibold text-blue-900 text-sm">
                  {viewActivity.class_activity_date ? formatDate(viewActivity.class_activity_date) : '—'}
                  {viewActivity.class_activity_time ? ` · ${formatTime(viewActivity.class_activity_time)}` : ''}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Topic Taught</p>
                <p className="text-sm text-gray-900">{viewActivity.topic_taught || '—'}</p>
              </div>
              {viewActivity.details_of_class_activity && (
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Class Details</p>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{viewActivity.details_of_class_activity}</p>
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">Student Assessment</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                {[
                  ['Joined on Time?', viewActivity.did_student_join_on_time, viewActivity.punctuality1],
                  ['Attentive?', viewActivity.is_student_attentive, viewActivity.attentiveness1],
                  ['Engaged?', viewActivity.student_engages_in_class, viewActivity.class_engagement1],
                ].map(([label, answer, score]) => (
                  <div key={label as string} className="flex items-start gap-2">
                    {answer === 'Yes'
                      ? <CheckCircle size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                      : <AlertCircle size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />}
                    <div>
                      <p className="text-xs text-gray-400">{label as string}</p>
                      <p className="text-sm font-medium text-gray-900">{answer || '—'}{score ? <span className="ml-1.5 text-xs text-gray-400">({score}/100)</span> : null}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {(viewActivity.did_student_complete_prev_homework || viewActivity.new_homework_assigned || viewActivity.topic_of_homework || viewActivity.homework1) && (
              <div className="border-t pt-4">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">Homework</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {viewActivity.did_student_complete_prev_homework && <p><span className="text-gray-400">Completed prev:</span> {viewActivity.did_student_complete_prev_homework}</p>}
                  {viewActivity.new_homework_assigned && <p><span className="text-gray-400">New assigned:</span> {viewActivity.new_homework_assigned}</p>}
                  {viewActivity.topic_of_homework && <p><span className="text-gray-400">Topic:</span> {viewActivity.topic_of_homework}</p>}
                  {[viewActivity.homework1, viewActivity.homework2, viewActivity.homework3].filter(Boolean).length > 0 && (
                    <div>
                      <p className="text-gray-400 mb-1">Items:</p>
                      {[viewActivity.homework1, viewActivity.homework2, viewActivity.homework3].filter(Boolean).map((hw, i) => (
                        <p key={i} className="text-gray-900">{hw}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {(viewActivity.tutors_general_observation || viewActivity.tutors_intervention) && (
              <div className="border-t pt-4">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">Tutor&apos;s Notes</p>
                <div className="space-y-2 text-sm">
                  {viewActivity.tutors_general_observation && <div><p className="text-gray-400 text-xs mb-0.5">General Observation</p><p className="text-gray-900 whitespace-pre-wrap">{viewActivity.tutors_general_observation}</p></div>}
                  {viewActivity.tutors_intervention && <div><p className="text-gray-400 text-xs mb-0.5">Intervention / Action</p><p className="text-gray-900 whitespace-pre-wrap">{viewActivity.tutors_intervention}</p></div>}
                </div>
              </div>
            )}

            {(viewActivity.helpful_link1 || viewActivity.helpful_link2 || viewActivity.helpful_link3) && (
              <div className="border-t pt-4">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Helpful Links</p>
                <div className="space-y-1.5">
                  {[viewActivity.helpful_link1, viewActivity.helpful_link2, viewActivity.helpful_link3].filter(Boolean).map((link, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Link2 size={13} className="text-blue-500 flex-shrink-0" />
                      <a href={link} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-all">{link}</a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setViewActivity(null)}>Close</Button>
            </div>
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
