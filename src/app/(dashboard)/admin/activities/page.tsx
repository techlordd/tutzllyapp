'use client';
import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import FormField, { Input, Select, Textarea } from '@/components/ui/FormField';
import Avatar from '@/components/ui/Avatar';
import { Plus, Eye } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Activity {
  id: number; ssid: string; tutor_id: string; tutor_firstname: string; tutor_lastname: string;
  student_id: string; student_name: string; course_name: string; class_activity_date: string;
  topic_taught: string; activity: string; did_student_join_on_time: string;
  is_student_attentive: string; student_engages_in_class: string;
  tutors_general_observation: string;
}

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [sessions, setSessions] = useState<{ssid: string; tutor_id: string; tutor_firstname: string; tutor_lastname: string; student_id: string; student_name: string; course_name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selected, setSelected] = useState<Activity | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    ssid: '', tutor_id: '', tutor_firstname: '', tutor_lastname: '',
    student_id: '', student_name: '', course_name: '', course_id: '',
    session_code_status: '', mothers_email: '', fathers_email: '',
    class_activity_date: new Date().toISOString().split('T')[0],
    class_activity_time: new Date().toTimeString().slice(0, 5),
    topic_taught: '', details_of_class_activity: '', activity: '',
    assigned_homework_from_prev: false, status_of_past_homework_review: '',
    new_homework_assigned: false, topic_of_homework: '', no_homework_why: '',
    did_student_complete_prev_homework: '', homework1: '', homework2: '', homework3: '',
    student_reason_for_not_completing: '', did_student_join_on_time: '',
    punctuality1: '', punctuality2: '', student_reason_for_late: '',
    is_student_attentive: '', attentiveness1: '', attentiveness2: '', attentiveness3: '',
    student_engages_in_class: '', class_engagement1: '', class_engagement2: '', class_engagement3: '',
    tutors_general_observation: '', tutors_intervention: '',
    helpful_link1: '', helpful_link2: '', helpful_link3: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [actRes, sesRes] = await Promise.all([fetch('/api/activities'), fetch('/api/sessions?status=ended')]);
      const [actData, sesData] = await Promise.all([actRes.json(), sesRes.json()]);
      setActivities(actData.activities || []);
      setSessions(sesData.sessions || []);
    } catch { toast.error('Failed to load data'); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSessionChange = (ssid: string) => {
    const s = sessions.find(s => s.ssid === ssid);
    if (s) {
      setForm(f => ({
        ...f, ssid,
        tutor_id: s.tutor_id || '',
        tutor_firstname: s.tutor_firstname || '',
        tutor_lastname: s.tutor_lastname || '',
        student_id: s.student_id || '',
        student_name: s.student_name || '',
        course_name: s.course_name || '',
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/activities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      toast.success('Activity recorded!');
      setModalOpen(false);
      fetchData();
    } catch { toast.error('Failed to save activity'); }
    setSubmitting(false);
  };

  const columns = [
    { key: 'student_name', label: 'Student', sortable: true, render: (_: unknown, row: Activity) => (
      <div className="flex items-center gap-2">
        <Avatar name={row.student_name || 'S'} size="sm" />
        <span>{row.student_name}</span>
      </div>
    )},
    { key: 'tutor_firstname', label: 'Tutor', render: (_: unknown, row: Activity) => `${row.tutor_firstname} ${row.tutor_lastname}` },
    { key: 'course_name', label: 'Course' },
    { key: 'class_activity_date', label: 'Date', render: (v: unknown) => formatDate(v as string) },
    { key: 'topic_taught', label: 'Topic', render: (v: unknown) => (
      <span className="truncate max-w-[150px] block" title={v as string}>{v as string || '—'}</span>
    )},
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
            <h2 className="text-2xl font-bold text-gray-900">Class Activities</h2>
            <p className="text-gray-500 text-sm mt-0.5">{activities.length} activity records</p>
          </div>
          <Button icon={Plus} onClick={() => setModalOpen(true)}>Record Activity</Button>
        </div>

        <DataTable data={activities} columns={columns} loading={loading}
          searchKeys={['student_name', 'tutor_firstname', 'course_name', 'topic_taught']}
          emptyMessage="No class activities recorded yet"
          actions={(row) => (
            <button onClick={() => { setSelected(row); setViewModalOpen(true); }}
              className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"><Eye size={15} /></button>
          )}
        />
      </div>

      {/* Add Activity Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Record Class Activity" size="2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Session selection */}
          <FormField label="Session (SSID)" required>
            <Select value={form.ssid} onChange={e => handleSessionChange(e.target.value)} required>
              <option value="">Select Session</option>
              {sessions.map(s => (
                <option key={s.ssid} value={s.ssid}>
                  {s.student_name} — {s.course_name} — {s.tutor_firstname} {s.tutor_lastname}
                </option>
              ))}
            </Select>
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Activity Date" required>
              <Input type="date" value={form.class_activity_date} onChange={e => setForm({...form, class_activity_date: e.target.value})} required />
            </FormField>
            <FormField label="Activity Time">
              <Input type="time" value={form.class_activity_time} onChange={e => setForm({...form, class_activity_time: e.target.value})} />
            </FormField>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-semibold text-sm text-gray-700 mb-3">Class Details</h4>
            <div className="space-y-3">
              <FormField label="Topic Taught" required>
                <Input value={form.topic_taught} onChange={e => setForm({...form, topic_taught: e.target.value})} required />
              </FormField>
              <FormField label="Details of Class Activity">
                <Textarea rows={3} value={form.details_of_class_activity} onChange={e => setForm({...form, details_of_class_activity: e.target.value})} />
              </FormField>
              <FormField label="Activity Type">
                <Select value={form.activity} onChange={e => setForm({...form, activity: e.target.value})}>
                  <option value="">Select</option>
                  <option>Lesson</option><option>Revision</option><option>Test Prep</option>
                  <option>Assessment</option><option>Practice</option>
                </Select>
              </FormField>
            </div>
          </div>

          <div className="border-t pt-4 space-y-3">
            <h4 className="font-semibold text-sm text-gray-700">Homework</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Did Student Complete Previous Homework?">
                <Select value={form.did_student_complete_prev_homework} onChange={e => setForm({...form, did_student_complete_prev_homework: e.target.value})}>
                  <option value="">Select</option><option>Yes</option><option>No</option><option>N/A</option>
                </Select>
              </FormField>
              <FormField label="New Homework Assigned?">
                <Select value={form.new_homework_assigned ? 'true' : 'false'} onChange={e => setForm({...form, new_homework_assigned: e.target.value === 'true'})}>
                  <option value="false">No</option><option value="true">Yes</option>
                </Select>
              </FormField>
              {form.new_homework_assigned && (
                <FormField label="Topic of Homework" className="sm:col-span-2">
                  <Input value={form.topic_of_homework} onChange={e => setForm({...form, topic_of_homework: e.target.value})} />
                </FormField>
              )}
            </div>
          </div>

          <div className="border-t pt-4 space-y-3">
            <h4 className="font-semibold text-sm text-gray-700">Student Assessment</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="Joined On Time?">
                <Select value={form.did_student_join_on_time} onChange={e => setForm({...form, did_student_join_on_time: e.target.value})}>
                  <option value="">Select</option><option>Yes</option><option>No</option>
                </Select>
              </FormField>
              <FormField label="Attentive in Class?">
                <Select value={form.is_student_attentive} onChange={e => setForm({...form, is_student_attentive: e.target.value})}>
                  <option value="">Select</option><option>Yes</option><option>No</option><option>Sometimes</option>
                </Select>
              </FormField>
              <FormField label="Engaged in Class?">
                <Select value={form.student_engages_in_class} onChange={e => setForm({...form, student_engages_in_class: e.target.value})}>
                  <option value="">Select</option><option>Yes</option><option>No</option><option>Sometimes</option>
                </Select>
              </FormField>
            </div>
          </div>

          <div className="border-t pt-4 space-y-3">
            <h4 className="font-semibold text-sm text-gray-700">Tutor's Notes</h4>
            <FormField label="General Observation">
              <Textarea rows={2} value={form.tutors_general_observation} onChange={e => setForm({...form, tutors_general_observation: e.target.value})} />
            </FormField>
            <FormField label="Intervention/Action">
              <Textarea rows={2} value={form.tutors_intervention} onChange={e => setForm({...form, tutors_intervention: e.target.value})} />
            </FormField>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField label="Helpful Link 1"><Input type="url" value={form.helpful_link1} onChange={e => setForm({...form, helpful_link1: e.target.value})} placeholder="https://..." /></FormField>
              <FormField label="Helpful Link 2"><Input type="url" value={form.helpful_link2} onChange={e => setForm({...form, helpful_link2: e.target.value})} placeholder="https://..." /></FormField>
              <FormField label="Helpful Link 3"><Input type="url" value={form.helpful_link3} onChange={e => setForm({...form, helpful_link3: e.target.value})} placeholder="https://..." /></FormField>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={submitting}>Record Activity</Button>
          </div>
        </form>
      </Modal>

      {/* View Activity Modal */}
      {selected && (
        <Modal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)} title="Class Activity Details" size="xl">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 p-3 rounded-xl">
                <p className="text-xs text-blue-500 font-medium">Student</p>
                <p className="font-semibold text-blue-900">{selected.student_name}</p>
              </div>
              <div className="bg-purple-50 p-3 rounded-xl">
                <p className="text-xs text-purple-500 font-medium">Tutor</p>
                <p className="font-semibold text-purple-900">{selected.tutor_firstname} {selected.tutor_lastname}</p>
              </div>
              <div className="bg-green-50 p-3 rounded-xl">
                <p className="text-xs text-green-500 font-medium">Course</p>
                <p className="font-semibold text-green-900">{selected.course_name}</p>
              </div>
              <div className="bg-orange-50 p-3 rounded-xl">
                <p className="text-xs text-orange-500 font-medium">Date</p>
                <p className="font-semibold text-orange-900">{formatDate(selected.class_activity_date)}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Topic Taught</p>
              <p className="font-medium">{selected.topic_taught || '—'}</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                ['On Time?', selected.did_student_join_on_time],
                ['Attentive?', selected.is_student_attentive],
                ['Engaged?', selected.student_engages_in_class],
              ].map(([label, value]) => (
                <div key={label} className="text-center p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className={`font-bold mt-1 ${value === 'Yes' ? 'text-green-600' : value === 'No' ? 'text-red-600' : 'text-amber-600'}`}>{value || '—'}</p>
                </div>
              ))}
            </div>
            {selected.tutors_general_observation && (
              <div>
                <p className="text-xs text-gray-400 mb-1">General Observation</p>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-xl">{selected.tutors_general_observation}</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}
