'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import Avatar from '@/components/ui/Avatar';
import { Eye, Users } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

interface Student {
  student_id: string; student_name: string; course_name: string;
}

export default function TutorStudentsPage() {
  const user = useAuthStore(state => state.user);
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.user_id) return;
    fetch(`/api/enrollments?tutor_id=${user.user_id}`)
      .then(r => r.json())
      .then(d => {
        const enrolled = d.enrollments || [];
        const unique: Record<string, Student> = {};
        enrolled.forEach((e: { student_id: string; student_name: string; course_name: string }) => {
          if (!unique[e.student_id]) unique[e.student_id] = {
            student_id: e.student_id,
            student_name: e.student_name || '',
            course_name: e.course_name,
          };
        });
        setStudents(Object.values(unique));
        setLoading(false);
      })
      .catch(() => { setLoading(false); toast.error('Failed to load data'); });
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
        <div className="flex items-center gap-3">
          <Users size={24} className="text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">My Students</h2>
            <p className="text-gray-500 text-sm">{students.length} students</p>
          </div>
        </div>
        <DataTable data={students} columns={columns} loading={loading}
          searchKeys={['student_name', 'course_name']}
          emptyMessage="No students assigned yet"
          actions={(row) => (
            <button
              onClick={() => router.push(`/tutor/students/${row.student_id}`)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors text-xs font-medium"
              title="View details"
            >
              <Eye size={13} />
              View Details
            </button>
          )}
        />
      </div>
    </DashboardLayout>
  );
}
