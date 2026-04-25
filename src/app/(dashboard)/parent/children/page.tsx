'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import Avatar from '@/components/ui/Avatar';
import { statusBadge } from '@/components/ui/Badge';
import { Eye, Users } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

interface Student {
  student_id: string; student_name: string;
  tutor_name: string; course_name: string; entry_status: string;
}

export default function ParentChildrenPage() {
  const user = useAuthStore(state => state.user);
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.user_id) return;
    fetch(`/api/enrollments?parent_id=${user.user_id}`)
      .then(r => r.json())
      .then(d => {
        const enrollments = d.enrollments || [];
        const unique: Record<string, Student> = {};
        enrollments.forEach((e: {student_id: string; student_name?: string; tutor_name?: string; course_name?: string; entry_status?: string}) => {
          if (e.student_id && !unique[e.student_id]) {
            unique[e.student_id] = {
              student_id: e.student_id,
              student_name: e.student_name || '',
              tutor_name: e.tutor_name || '',
              course_name: e.course_name || '',
              entry_status: e.entry_status || '',
            };
          }
        });
        setStudents(Object.values(unique));
        setLoading(false);
      })
      .catch(() => { setLoading(false); toast.error('Failed to load data'); });
  }, [user?.user_id]);

  const columns = [
    { key: 'student_name', label: 'Child', render: (_: unknown, row: Student) => (
      <div className="flex items-center gap-2">
        <Avatar name={row.student_name} size="sm" />
        <p className="font-medium">{row.student_name}</p>
      </div>
    )},
    { key: 'course_name', label: 'Course' },
    { key: 'tutor_name', label: 'Tutor' },
    { key: 'entry_status', label: 'Status', render: (v: unknown) => statusBadge(v as string) },
  ];

  return (
    <DashboardLayout title="My Children">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Users size={24} className="text-purple-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">My Children</h2>
            <p className="text-gray-500 text-sm">{students.length} children enrolled</p>
          </div>
        </div>
        <DataTable data={students} columns={columns} loading={loading}
          searchKeys={['student_name', 'course_name', 'tutor_name']}
          emptyMessage="No children found"
          actions={(row) => (
            <button
              onClick={() => router.push(`/parent/children/${row.student_id}`)}
              className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-600 transition-colors"
              title="View details"
            >
              <Eye size={15} />
            </button>
          )}
        />
      </div>
    </DashboardLayout>
  );
}
