'use client';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import { Eye, Users, BookOpen } from 'lucide-react';
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

  const uniqueCourseCount = useMemo(
    () => new Set(students.map(s => s.course_name).filter(Boolean)).size,
    [students]
  );

  const columns = [
    {
      key: 'student_name',
      label: 'Student',
      sortable: true,
      render: (_: unknown, row: Student) => (
        <div className="flex items-center gap-3">
          <Avatar name={row.student_name} size="sm" />
          <div>
            <p className="font-semibold text-gray-900 leading-tight">{row.student_name}</p>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{row.student_id}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'course_name',
      label: 'Course',
      sortable: true,
      render: (value: unknown) => (
        <Badge variant="info">{String(value ?? '')}</Badge>
      ),
    },
  ];

  return (
    <DashboardLayout title="My Students">
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 max-w-xs">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-xl">
              <Users size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Students</p>
              <p className="text-xl font-bold text-gray-900">{students.length}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-xl">
              <BookOpen size={18} className="text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Courses</p>
              <p className="text-xl font-bold text-gray-900">{uniqueCourseCount}</p>
            </div>
          </div>
        </div>
        <DataTable
          data={students}
          columns={columns}
          loading={loading}
          searchKeys={['student_name', 'course_name']}
          emptyMessage="No students assigned yet"
          rowClassName={() => 'hover:bg-blue-50/40 transition-colors cursor-default'}
          actions={(row) => (
            <button
              onClick={() => router.push(`/tutor/students/${row.student_id}`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-white hover:bg-blue-600 hover:text-white hover:border-blue-600 text-blue-600 transition-all text-xs font-semibold shadow-sm"
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
