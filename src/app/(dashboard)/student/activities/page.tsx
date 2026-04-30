'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import { Eye } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

interface Activity {
  id: number; tutor_firstname: string; tutor_lastname: string; course_name: string;
  class_activity_date: string; topic_taught: string;
  did_student_join_on_time: string; is_student_attentive: string;
  student_engages_in_class: string; tutors_general_observation: string;
  new_homework_assigned: string; topic_of_homework: string;
}

export default function StudentActivitiesPage() {
  const user = useAuthStore(state => state.user);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Activity | null>(null);

  useEffect(() => {
    if (!user?.user_id) return;
    fetch(`/api/activities?student_id=${user.user_id}`)
      .then(r => r.json())
      .then(d => { setActivities(d.activities || []); setLoading(false); })
      .catch(() => { setLoading(false); toast.error('Failed to load data'); });
  }, [user?.user_id]);

  const columns = [
    { key: 'course_name', label: 'Course', sortable: true },
    { key: 'tutor_firstname', label: 'Tutor', render: (_: unknown, row: Activity) => `${row.tutor_firstname} ${row.tutor_lastname}` },
    { key: 'class_activity_date', label: 'Date', render: (v: unknown) => formatDate(v as string) },
    { key: 'topic_taught', label: 'Topic Taught' },
    { key: 'did_student_join_on_time', label: 'On Time?', render: (v: unknown) => (
      <span className={`text-xs px-1.5 py-0.5 rounded ${v === 'Yes' ? 'bg-green-100 text-green-700' : v ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>{v as string || '—'}</span>
    )},
    { key: 'new_homework_assigned', label: 'HW?', render: (v: unknown) => (
      <span className={`text-xs px-1.5 py-0.5 rounded ${v === 'true' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>{v === 'true' ? 'Yes' : 'No'}</span>
    )},
    { key: 'id', label: 'Action', render: (_: unknown, row: Activity) => (
      <button
        onClick={() => setSelected(row)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors"
      >
        <Eye size={12} />
        View Details
      </button>
    )},
  ];

  return (
    <DashboardLayout title="Class Activities">
      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Class Activities</h2>
          <p className="text-gray-500 text-sm">{activities.length} records</p>
        </div>
        <DataTable data={activities} columns={columns} loading={loading}
          searchKeys={['course_name', 'tutor_firstname', 'topic_taught']}
          emptyMessage="No activity records yet"
        />
      </div>
      {selected && (
        <Modal isOpen={true} onClose={() => setSelected(null)} title="Activity Details" size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 p-3 rounded-xl"><p className="text-xs text-blue-400">Tutor</p><p className="font-semibold">{selected.tutor_firstname} {selected.tutor_lastname}</p></div>
              <div className="bg-green-50 p-3 rounded-xl"><p className="text-xs text-green-400">Course</p><p className="font-semibold">{selected.course_name}</p></div>
            </div>
            <div><p className="text-xs text-gray-400 mb-1">Topic Taught</p><p className="font-medium">{selected.topic_taught}</p></div>
            <div className="grid grid-cols-3 gap-3">
              {[['On Time?', selected.did_student_join_on_time], ['Attentive?', selected.is_student_attentive], ['Engaged?', selected.student_engages_in_class]].map(([l, v]) => (
                <div key={l as string} className="text-center p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-400">{l as string}</p>
                  <p className={`font-bold mt-1 text-sm ${v === 'Yes' ? 'text-green-600' : v === 'No' ? 'text-red-600' : 'text-amber-600'}`}>{v as string || '—'}</p>
                </div>
              ))}
            </div>
            {selected.new_homework_assigned === 'true' && selected.topic_of_homework && (
              <div><p className="text-xs text-gray-400">Homework Topic</p><p className="text-sm bg-amber-50 p-3 rounded-xl">{selected.topic_of_homework}</p></div>
            )}
            {selected.tutors_general_observation && (
              <div><p className="text-xs text-gray-400">Tutor's Observation</p><p className="text-sm bg-gray-50 p-3 rounded-xl">{selected.tutors_general_observation}</p></div>
            )}
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}
