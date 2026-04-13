'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import { statusBadge } from '@/components/ui/Badge';
import { BookOpen } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

interface Assignment {
  tutor_assign_id: string; course_name: string; course_code: string;
  tutor_email: string; entry_status: string; created_at: string;
}

export default function TutorCoursesPage() {
  const user = useAuthStore(state => state.user);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.user_id) return;
    fetch(`/api/tutor-assignments?tutor_id=${user.user_id}`)
      .then(r => r.json())
      .then(d => { setAssignments(d.assignments || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user?.user_id]);

  const columns = [
    { key: 'course_name', label: 'Course', sortable: true },
    { key: 'course_code', label: 'Code' },
    { key: 'tutor_email', label: 'Contact Email' },
    { key: 'created_at', label: 'Assigned', render: (v: unknown) => formatDate(v as string) },
    { key: 'entry_status', label: 'Status', render: (v: unknown) => statusBadge(v as string) },
  ];

  return (
    <DashboardLayout title="My Courses">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <BookOpen size={24} className="text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">My Courses</h2>
            <p className="text-gray-500 text-sm">{assignments.length} courses assigned</p>
          </div>
        </div>
        <DataTable data={assignments} columns={columns} loading={loading}
          searchKeys={['course_name', 'course_code', 'entry_status']}
          emptyMessage="No courses assigned yet" />
      </div>
    </DashboardLayout>
  );
}
