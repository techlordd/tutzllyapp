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

interface Activity {
  id: number; ssid: string; student_name: string; course_name: string;
  class_activity_date: string; topic_taught: string;
  did_student_join_on_time: string; is_student_attentive: string;
  student_engages_in_class: string; tutors_general_observation: string;
}

export default function TutorActivitiesPage() {
  const user = useAuthStore(state => state.user);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [sessions, setSessions] = useState<{ssid: string; student_name: string; course_name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState<Activity | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    ssid: '', tutor_id: '', tutor_firstname: '', tutor_lastname: '',
    student_name: '', course_name: '',
    class_activity_date: new Date().toISOString().split('T')[0],
    class_activity_time: new Date().toTimeString().slice(0,5),
    topic_taught: '', details_of_class_activity: '', activity: '',
    did_student_complete_prev_homework: '', new_homework_assigned: 'false',
    topic_of_homework: '', did_student_join_on_time: '',
    punctuality1: '', is_student_attentive: '', attentiveness1: '',
    student_engages_in_class: '', class_engagement1: '',
    tutors_general_observation: '', tutors_intervention: '',
    helpful_link1: '', helpful_link2: '', helpful_link3: '',
  });

  const fetchData = useCallback(async () => {
    if (!user?.user_id) return;
    setLoading(true);
    try {
      const [actRes, sesRes] = await Promise.all([
        fetch(`/api/activities?tutor_id=${user.user_id}`),
        fetch(`/api/sessions?tutor_id=${user.user_id}&status=ended`),
      ]);
      const [actData, sesData] = await Promise.all([actRes.json(), sesRes.json()]);
      setActivities(actData.activities || []);
      setSessions(sesData.sessions || []);
    } catch { toast.error('Failed to load data'); }
    setLoading(false);
  }, [user?.user_id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/activities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, tutor_id: user?.user_id }) });
      if (!res.ok) throw new Error();
      toast.success('Activity recorded!');
      setModalOpen(false);
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
      <span className={`text-xs px-1.5 py-0.5 rounded ${v === 'Yes' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{v as string || '—'}</span>
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
          <Button icon={Plus} onClick={() => setModalOpen(true)}>Log Activity</Button>
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

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Log Class Activity" size="2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Session" required>
            <Select value={form.ssid} onChange={e => {
              const s = sessions.find(s => s.ssid === e.target.value);
              setForm(f => ({...f, ssid: e.target.value, student_name: s?.student_name || '', course_name: s?.course_name || ''}));
            }} required>
              <option value="">Select completed session</option>
              {sessions.map(s => <option key={s.ssid} value={s.ssid}>{s.student_name} — {s.course_name}</option>)}
            </Select>
          </FormField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Date"><Input type="date" value={form.class_activity_date} onChange={e => setForm({...form, class_activity_date: e.target.value})} /></FormField>
            <FormField label="Time"><Input type="time" value={form.class_activity_time} onChange={e => setForm({...form, class_activity_time: e.target.value})} /></FormField>
          </div>
          <FormField label="Topic Taught" required><Input value={form.topic_taught} onChange={e => setForm({...form, topic_taught: e.target.value})} required /></FormField>
          <FormField label="Class Details"><Textarea rows={3} value={form.details_of_class_activity} onChange={e => setForm({...form, details_of_class_activity: e.target.value})} /></FormField>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="Student Joined On Time?"><Select value={form.did_student_join_on_time} onChange={e => setForm({...form, did_student_join_on_time: e.target.value})}><option value="">Select</option><option>Yes</option><option>No</option></Select></FormField>
            <FormField label="Student Attentive?"><Select value={form.is_student_attentive} onChange={e => setForm({...form, is_student_attentive: e.target.value})}><option value="">Select</option><option>Yes</option><option>No</option><option>Sometimes</option></Select></FormField>
            <FormField label="Student Engaged?"><Select value={form.student_engages_in_class} onChange={e => setForm({...form, student_engages_in_class: e.target.value})}><option value="">Select</option><option>Yes</option><option>No</option><option>Sometimes</option></Select></FormField>
          </div>
          <FormField label="General Observation"><Textarea rows={2} value={form.tutors_general_observation} onChange={e => setForm({...form, tutors_general_observation: e.target.value})} /></FormField>
          <FormField label="Intervention/Action"><Textarea rows={2} value={form.tutors_intervention} onChange={e => setForm({...form, tutors_intervention: e.target.value})} /></FormField>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={submitting}>Log Activity</Button>
          </div>
        </form>
      </Modal>

      {selected && (
        <Modal isOpen={viewOpen} onClose={() => setViewOpen(false)} title="Activity Details" size="lg">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 p-3 rounded-xl"><p className="text-xs text-blue-400">Student</p><p className="font-semibold text-blue-900">{selected.student_name}</p></div>
              <div className="bg-green-50 p-3 rounded-xl"><p className="text-xs text-green-400">Course</p><p className="font-semibold text-green-900">{selected.course_name}</p></div>
            </div>
            <div><p className="text-xs text-gray-400">Topic</p><p className="font-medium">{selected.topic_taught}</p></div>
            <div className="grid grid-cols-3 gap-3">
              {[['On Time?', selected.did_student_join_on_time], ['Attentive?', selected.is_student_attentive], ['Engaged?', selected.student_engages_in_class]].map(([l, v]) => (
                <div key={l} className="text-center p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-400">{l}</p>
                  <p className={`font-bold mt-1 ${v === 'Yes' ? 'text-green-600' : v === 'No' ? 'text-red-600' : 'text-amber-600'}`}>{v || '—'}</p>
                </div>
              ))}
            </div>
            {selected.tutors_general_observation && <div><p className="text-xs text-gray-400">Observation</p><p className="text-sm bg-gray-50 p-3 rounded-xl">{selected.tutors_general_observation}</p></div>}
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}
