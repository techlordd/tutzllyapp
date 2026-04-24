'use client';
import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import FormField, { Input, Select, Textarea } from '@/components/ui/FormField';
import { Plus, Eye } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

interface Session {
  ssid: string;
  student_id: string;
  student_name: string;
  course_name: string;
  tutor_id: string;
  tutor_firstname: string;
  tutor_lastname: string;
  entry_date: string;
  zoom_link: string;
  status: string;
}

interface Activity {
  record_id: number; ssid: string; student_name: string; course_name: string;
  class_activity_date: string; topic_taught: string;
  did_student_join_on_time: string; punctuality1: string;
  is_student_attentive: string; attentiveness1: string;
  student_engages_in_class: string; class_engagement1: string;
  tutors_general_observation: string;
}

const emptyForm = {
  ssid: '',
  student_id: '', student_name: '', course_name: '',
  tutor_id: '', tutor_firstname: '', tutor_lastname: '',
  class_activity_date: new Date().toISOString().split('T')[0],
  class_activity_time: new Date().toTimeString().slice(0, 5),
  topic_taught: '', details_of_class_activity: '', activity: '',
  did_student_complete_prev_homework: '',
  new_homework_assigned: 'false', topic_of_homework: '',
  did_student_join_on_time: '', punctuality1: '',
  is_student_attentive: '', attentiveness1: '',
  student_engages_in_class: '', class_engagement1: '',
  tutors_general_observation: '', tutors_intervention: '',
  helpful_link1: '', helpful_link2: '', helpful_link3: '',
};

function scorePunctuality(val: string) {
  if (val === 'Yes') return '100';
  if (val === 'No') return '50';
  return '';
}

function scoreAttentiveness(val: string) {
  if (val === 'Yes') return '100';
  if (val === 'Partially') return '50';
  if (val === 'No') return '0';
  return '';
}

function scoreEngagement(val: string) {
  if (val === 'Yes') return '100';
  if (val === 'Partially') return '50';
  if (val === 'No') return '0';
  return '';
}

function ScoreBadge({ score }: { score: string }) {
  if (score === '') return null;
  const n = Number(score);
  const color = n === 100 ? 'bg-green-100 text-green-700' : n >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
  return <span className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{score}/100</span>;
}

export default function TutorActivitiesPage() {
  const user = useAuthStore(state => state.user);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState<Activity | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const fetchData = useCallback(async () => {
    if (!user?.user_id) return;
    setLoading(true);
    try {
      const [actRes, sesRes] = await Promise.all([
        fetch(`/api/activities?tutor_id=${user.user_id}`),
        fetch(`/api/sessions?tutor_id=${user.user_id}`),
      ]);
      const [actData, sesData] = await Promise.all([actRes.json(), sesRes.json()]);
      setActivities(actData.activities || []);
      setSessions(sesData.sessions || []);
    } catch { toast.error('Failed to load data'); }
    setLoading(false);
  }, [user?.user_id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSessionChange = (ssid: string) => {
    const s = sessions.find(s => s.ssid === ssid);
    setForm(f => ({
      ...f,
      ssid,
      student_id: s?.student_id || '',
      student_name: s?.student_name || '',
      course_name: s?.course_name || '',
      tutor_id: s?.tutor_id || '',
      tutor_firstname: s?.tutor_firstname || '',
      tutor_lastname: s?.tutor_lastname || '',
      class_activity_date: s?.entry_date ? s.entry_date.split('T')[0] : f.class_activity_date,
    }));
  };

  const handlePunctuality = (val: string) =>
    setForm(f => ({ ...f, did_student_join_on_time: val, punctuality1: scorePunctuality(val) }));

  const handleAttentiveness = (val: string) =>
    setForm(f => ({ ...f, is_student_attentive: val, attentiveness1: scoreAttentiveness(val) }));

  const handleEngagement = (val: string) =>
    setForm(f => ({ ...f, student_engages_in_class: val, class_engagement1: scoreEngagement(val) }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, tutor_id: user?.user_id }),
      });
      if (!res.ok) throw new Error();
      toast.success('Activity recorded!');
      setModalOpen(false);
      setForm(emptyForm);
      fetchData();
    } catch { toast.error('Failed to record activity'); }
    setSubmitting(false);
  };

  const columns = [
    { key: 'student_name', label: 'Student', sortable: true },
    { key: 'course_name', label: 'Course' },
    { key: 'class_activity_date', label: 'Date', render: (v: unknown) => formatDate(v as string) },
    { key: 'topic_taught', label: 'Topic' },
    { key: 'did_student_join_on_time', label: 'On Time?', render: (v: unknown) => (
      <span className={`text-xs px-1.5 py-0.5 rounded ${v === 'Yes' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{v as string || '—'}</span>
    )},
    { key: 'is_student_attentive', label: 'Attentive?', render: (v: unknown) => (
      <span className={`text-xs px-1.5 py-0.5 rounded ${v === 'Yes' ? 'bg-green-100 text-green-700' : v === 'Partially' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{v as string || '—'}</span>
    )},
    { key: 'student_engages_in_class', label: 'Engaged?', render: (v: unknown) => (
      <span className={`text-xs px-1.5 py-0.5 rounded ${v === 'Yes' ? 'bg-green-100 text-green-700' : v === 'Partially' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{v as string || '—'}</span>
    )},
  ];

  return (
    <DashboardLayout title="Class Activities">
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Class Activities</h2>
            <p className="text-gray-500 text-sm">{activities.length} records</p>
          </div>
          <Button icon={Plus} onClick={() => { setForm(emptyForm); setModalOpen(true); }}>Log Activity</Button>
        </div>
        <DataTable data={activities} columns={columns} loading={loading}
          searchKeys={['student_name', 'course_name', 'topic_taught']}
          emptyMessage="No activities logged yet"
          actions={(row) => (
            <button onClick={() => { setSelected(row); setViewOpen(true); }}
              className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"><Eye size={15} /></button>
          )}
        />
      </div>

      {/* Log Activity Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Log Class Activity" size="2xl">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Session selector */}
          <FormField label="Session" required>
            <Select value={form.ssid} onChange={e => handleSessionChange(e.target.value)} required>
              <option value="">Select a completed session</option>
              {sessions.map(s => (
                <option key={s.ssid} value={s.ssid}>
                  {s.student_name} — {s.course_name}{s.entry_date ? ` (${formatDate(s.entry_date)})` : ''}{s.status ? ` [${s.status}]` : ''}
                </option>
              ))}
            </Select>
          </FormField>

          {/* Auto-populated session details */}
          {form.ssid && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-blue-50 rounded-xl p-3">
              <div>
                <p className="text-xs text-blue-400 font-medium">Student</p>
                <p className="font-semibold text-blue-900 text-sm">{form.student_name}</p>
              </div>
              <div>
                <p className="text-xs text-blue-400 font-medium">Course</p>
                <p className="font-semibold text-blue-900 text-sm">{form.course_name}</p>
              </div>
              <div>
                <p className="text-xs text-blue-400 font-medium">Tutor</p>
                <p className="font-semibold text-blue-900 text-sm">{[form.tutor_firstname, form.tutor_lastname].filter(Boolean).join(' ') || '—'}</p>
              </div>
            </div>
          )}

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Date">
              <Input type="date" value={form.class_activity_date} onChange={e => setForm({ ...form, class_activity_date: e.target.value })} />
            </FormField>
            <FormField label="Time">
              <Input type="time" value={form.class_activity_time} onChange={e => setForm({ ...form, class_activity_time: e.target.value })} />
            </FormField>
          </div>

          {/* Topic */}
          <FormField label="Topic Taught" required>
            <Input value={form.topic_taught} onChange={e => setForm({ ...form, topic_taught: e.target.value })} required />
          </FormField>
          <FormField label="Class Details">
            <Textarea rows={3} value={form.details_of_class_activity} onChange={e => setForm({ ...form, details_of_class_activity: e.target.value })} />
          </FormField>

          {/* Grading section */}
          <div className="border-t pt-4">
            <h4 className="font-semibold text-sm text-gray-700 mb-3">Class Performance</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

              <div className="space-y-1.5">
                <FormField label={<span className="flex items-center gap-1">Student Joined On Time? <ScoreBadge score={form.punctuality1} /></span>}>
                  <Select value={form.did_student_join_on_time} onChange={e => handlePunctuality(e.target.value)}>
                    <option value="">Select</option>
                    <option>Yes</option>
                    <option>No</option>
                  </Select>
                </FormField>
                {form.punctuality1 && (
                  <p className="text-xs text-gray-400">Punctuality score: <strong>{form.punctuality1}/100</strong></p>
                )}
              </div>

              <div className="space-y-1.5">
                <FormField label={<span className="flex items-center gap-1">Student Attentive? <ScoreBadge score={form.attentiveness1} /></span>}>
                  <Select value={form.is_student_attentive} onChange={e => handleAttentiveness(e.target.value)}>
                    <option value="">Select</option>
                    <option>Yes</option>
                    <option>Partially</option>
                    <option>No</option>
                  </Select>
                </FormField>
                {form.attentiveness1 && (
                  <p className="text-xs text-gray-400">Attentiveness score: <strong>{form.attentiveness1}/100</strong></p>
                )}
              </div>

              <div className="space-y-1.5">
                <FormField label={<span className="flex items-center gap-1">Student Engaged? <ScoreBadge score={form.class_engagement1} /></span>}>
                  <Select value={form.student_engages_in_class} onChange={e => handleEngagement(e.target.value)}>
                    <option value="">Select</option>
                    <option>Yes</option>
                    <option>Partially</option>
                    <option>No</option>
                  </Select>
                </FormField>
                {form.class_engagement1 && (
                  <p className="text-xs text-gray-400">Engagement score: <strong>{form.class_engagement1}/100</strong></p>
                )}
              </div>
            </div>

            {/* Running total */}
            {(form.punctuality1 || form.attentiveness1 || form.class_engagement1) && (
              <div className="mt-3 flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-xl px-4 py-2">
                <span>Overall:</span>
                {[
                  { label: 'Punctuality', score: form.punctuality1 },
                  { label: 'Attentiveness', score: form.attentiveness1 },
                  { label: 'Engagement', score: form.class_engagement1 },
                ].filter(x => x.score !== '').map(x => (
                  <span key={x.label} className="flex items-center gap-1">
                    <span className="text-gray-400">{x.label}:</span>
                    <strong>{x.score}</strong>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Observations */}
          <FormField label="General Observation">
            <Textarea rows={2} value={form.tutors_general_observation} onChange={e => setForm({ ...form, tutors_general_observation: e.target.value })} />
          </FormField>
          <FormField label="Intervention / Action">
            <Textarea rows={2} value={form.tutors_intervention} onChange={e => setForm({ ...form, tutors_intervention: e.target.value })} />
          </FormField>

          {/* Homework */}
          <div className="border-t pt-4">
            <h4 className="font-semibold text-sm text-gray-700 mb-3">Homework</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Student Completed Previous Homework?">
                <Select value={form.did_student_complete_prev_homework} onChange={e => setForm({ ...form, did_student_complete_prev_homework: e.target.value })}>
                  <option value="">Select</option>
                  <option>Yes</option>
                  <option>No</option>
                  <option>N/A</option>
                </Select>
              </FormField>
              <FormField label="New Homework Assigned?">
                <Select value={form.new_homework_assigned} onChange={e => setForm({ ...form, new_homework_assigned: e.target.value })}>
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </Select>
              </FormField>
            </div>
            {form.new_homework_assigned === 'true' && (
              <FormField label="Homework Topic" className="mt-3">
                <Input value={form.topic_of_homework} onChange={e => setForm({ ...form, topic_of_homework: e.target.value })} />
              </FormField>
            )}
          </div>

          {/* Helpful links */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(['helpful_link1', 'helpful_link2', 'helpful_link3'] as const).map((key, i) => (
              <FormField key={key} label={`Helpful Link ${i + 1}`}>
                <Input value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} placeholder="https://..." />
              </FormField>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={submitting}>Log Activity</Button>
          </div>
        </form>
      </Modal>

      {/* View Activity Modal */}
      {selected && (
        <Modal isOpen={viewOpen} onClose={() => setViewOpen(false)} title="Activity Details" size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 p-3 rounded-xl"><p className="text-xs text-blue-400">Student</p><p className="font-semibold text-blue-900">{selected.student_name}</p></div>
              <div className="bg-green-50 p-3 rounded-xl"><p className="text-xs text-green-400">Course</p><p className="font-semibold text-green-900">{selected.course_name}</p></div>
            </div>
            <div><p className="text-xs text-gray-400">Date</p><p className="font-medium">{formatDate(selected.class_activity_date)}</p></div>
            <div><p className="text-xs text-gray-400">Topic</p><p className="font-medium">{selected.topic_taught}</p></div>

            <div className="border-t pt-3">
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Class Performance</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Punctuality', answer: selected.did_student_join_on_time, score: selected.punctuality1 },
                  { label: 'Attentiveness', answer: selected.is_student_attentive, score: selected.attentiveness1 },
                  { label: 'Engagement', answer: selected.student_engages_in_class, score: selected.class_engagement1 },
                ].map(({ label, answer, score }) => {
                  const n = Number(score);
                  const scoreColor = n === 100 ? 'text-green-600' : n >= 50 ? 'text-amber-600' : 'text-red-600';
                  return (
                    <div key={label} className="text-center p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-400">{label}</p>
                      <p className={`font-bold text-sm mt-0.5 ${answer === 'Yes' ? 'text-green-600' : answer === 'No' ? 'text-red-600' : 'text-amber-600'}`}>{answer || '—'}</p>
                      {score !== '' && score != null && (
                        <p className={`text-xs font-semibold mt-1 ${scoreColor}`}>{score}/100</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {selected.tutors_general_observation && (
              <div><p className="text-xs text-gray-400">Observation</p><p className="text-sm bg-gray-50 p-3 rounded-xl">{selected.tutors_general_observation}</p></div>
            )}
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}
