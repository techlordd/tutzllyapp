'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import { Eye } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface Student {
  student_id: string; student_name: string; course_name: string;
}

export default function TutorStudentsPage() {
  const user = useAuthStore(state => state.user);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Student | null>(null);

  useEffect(() => {
    if (!user?.user_id) return;
    fetch(`/api/enrollments?tutor_id=${user.user_id}`)
      .then(r => r.json())
      .then(d => {
        const enrolled = d.enrollments || [];
        const unique: Record<string, Student> = {};
        enrolled.forEach((e: {student_id: string; student_name: string; course_name: string}) => {
          if (!unique[e.student_id]) unique[e.student_id] = {
            student_id: e.student_id,
            student_name: e.student_name || '',
            course_name: e.course_name,
          };
        });
        setStudents(Object.values(unique));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user?.user_id]);

  const columns = [
    { key: 'student_name', label: 'Student', render: (_: unknown, row: Student) => (
      <div className="flex items-center gap-2">
        <Avatar name={row.student_name} size="sm" />
        <p className="font-medium">{row.student_name}</p>
      </div>
    )},
    { key: 'course_name', label: 'Course' },
  ];

  return (
    <DashboardLayout title="My Students">
      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Students</h2>
          <p className="text-gray-500 text-sm">{students.length} students</p>
        </div>
        <DataTable data={students} columns={columns} loading={loading}
          searchKeys={['student_name', 'course_name']}
          emptyMessage="No students assigned yet"
          actions={(row) => (
            <button onClick={() => setSelected(row)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"><Eye size={15} /></button>
          )}
        />
      </div>
      {selected && (
        <Modal isOpen={true} onClose={() => setSelected(null)} title="Student Profile" size="md">
          <div className="text-center mb-4">
            <Avatar name={selected.student_name} size="lg" className="mx-auto mb-2" />
            <h3 className="text-lg font-bold">{selected.student_name}</h3>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {[['Course', selected.course_name]].map(([l, v]) => (
              <div key={l as string} className="bg-gray-50 p-3 rounded-xl">
                <p className="text-xs text-gray-400">{l as string}</p>
                <p className="font-medium text-gray-900">{v as string}</p>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}
