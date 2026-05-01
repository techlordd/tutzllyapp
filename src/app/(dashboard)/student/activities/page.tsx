'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import { Eye } from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

interface Activity {
  id: number; tutor_name: string; tutor_firstname: string; tutor_lastname: string; course_name: string;
  class_activity_date: string; class_activity_time: string; topic_taught: string;
  details_of_class_activity: string; activity: string;
  assigned_homework_from_prev: string; status_of_past_homework_review: string;
  new_homework_assigned: string; topic_of_homework: string; no_homework_why: string;
  did_student_complete_prev_homework: string; student_reason_for_not_completing: string;
  did_student_join_on_time: string; student_reason_for_late: string;
  student_engages_in_class: string; is_student_attentive: string;
  tutors_general_observation: string; tutors_intervention: string;
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
    { key: 'class_activity_date', label: 'Date', sortable: true, render: (v: unknown) => <span className="text-gray-800">{formatDate(v as string)}</span> },
    { key: 'class_activity_time', label: 'Time', render: (v: unknown) => <span className="text-blue-500 font-medium">{formatTime(v as string)}</span> },
    { key: 'tutor_firstname', label: 'Tutor Name', render: (_: unknown, row: Activity) => <span className="text-blue-500 font-medium">{`${row.tutor_firstname} ${row.tutor_lastname}`.trim() || '—'}</span> },
    { key: 'course_name', label: 'Course ID', render: (v: unknown) => <span className="text-blue-500 font-medium">{(v as string) || '—'}</span> },
    { key: 'topic_taught', label: 'Topic Taught', render: (v: unknown) => <span className="text-gray-700">{(v as string) || '—'}</span> },
    { key: 'id', label: '', render: (_: unknown, row: Activity) => (
      <button
        onClick={() => setSelected(row)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg transition-colors"
      >
        <Eye size={12} />
        View
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
        <Modal isOpen={true} onClose={() => setSelected(null)} title="Class Activity Details" size="lg">
          {selected && (() => {
            const rows: { label: string; value: string | null | undefined }[] = [
              { label: 'Date',                                          value: formatDate(selected.class_activity_date) },
              { label: 'Time',                                          value: selected.class_activity_time ? formatTime(selected.class_activity_time) : null },
              { label: 'Tutor',                                         value: selected.tutor_name || `${selected.tutor_firstname} ${selected.tutor_lastname}` },
              { label: 'Course',                                        value: selected.course_name },
              { label: 'Topic Taught',                                  value: selected.topic_taught },
              { label: 'Details of Class Activity',                     value: selected.details_of_class_activity },
              { label: 'Activity',                                      value: selected.activity },
              { label: 'Assigned Homework from Previous Session?',      value: selected.assigned_homework_from_prev },
              { label: 'Status of Past Homework Review',                value: selected.status_of_past_homework_review },
              { label: 'New Homework Assigned for Current Session?',    value: selected.new_homework_assigned },
              { label: 'Topic of Homework Assigned',                    value: selected.topic_of_homework },
              { label: 'No Homework Why?',                              value: selected.no_homework_why },
              { label: 'Did Student Complete Previous Homework?',       value: selected.did_student_complete_prev_homework },
              { label: 'Student Reason for Not Completing Homework',    value: selected.student_reason_for_not_completing },
              { label: 'Did Student Join Session on Time?',             value: selected.did_student_join_on_time },
              { label: 'Reason for Not Joining Session on Time',        value: selected.student_reason_for_late },
              { label: 'Student Engage in Class?',                      value: selected.student_engages_in_class },
              { label: 'Student Attentive in Class?',                   value: selected.is_student_attentive },
              { label: "Tutor's General Observation",                   value: selected.tutors_general_observation },
              { label: "Tutor's Intervention / Action",                 value: selected.tutors_intervention },
            ];
            return (
              <div className="overflow-hidden rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-100">
                    {rows.map(({ label, value }) => (
                      <tr key={label} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-gray-700 w-1/2 align-top">{label}</td>
                        <td className="px-4 py-3 text-gray-600 align-top whitespace-pre-wrap">{value || <span className="text-gray-300">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </Modal>
      )}
    </DashboardLayout>
  );
}
