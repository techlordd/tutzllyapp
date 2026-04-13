'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import { statusBadge } from '@/components/ui/Badge';
import { BookOpen } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

interface Enrollment {
  assign_id: string; course_name: string; course_code: string;
  tutor_name: string; entry_status: string; created_at: string;
}

export default function StudentCoursesPage() {
  const user = useAuthStore(state => state.user);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.user_id) return;
    fetch(`/api/enrollments?student_id=${user.user_id}`)
      .then(r => r.json())
      .then(d => { setEnrollments(d.enrollments || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user?.user_id]);

  const columns = [
    { key: 'course_name', label: 'Course', sortable: true },
    { key: 'course_code', label: 'Code' },
    { key: 'tutor_name', label: 'My Tutor' },
    { key: 'created_at', label: 'Enrolled', render: (v: unknown) => formatDate(v as string) },
    { key: 'entry_status', label: 'Status', render: (v: unknown) => statusBadge(v as string) },
  ];

  return (
    <DashboardLayout title="My Courses">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <BookOpen size={24} className="text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">My Courses</h2>
            <p className="text-gray-500 text-sm">{enrollments.length} enrolled</p>
          </div>
        </div>
        <DataTable data={enrollments} columns={columns} loading={loading}
          searchKeys={['course_name', 'course_code', 'tutor_name']}
          emptyMessage="Not enrolled in any courses yet" />
      </div>
    </DashboardLayout>
  );
}
