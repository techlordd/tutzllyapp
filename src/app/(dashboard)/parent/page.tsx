'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import { Users, Video, BarChart3, Calendar, MessageSquare } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

export default function ParentDashboard() {
  const user = useAuthStore(state => state.user);
  const [stats, setStats] = useState({ children: 0, sessions: 0, grades: 0, schedules: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.user_id) return;
    Promise.all([
      fetch(`/api/enrollments?parent_id=${user.user_id}`).then(r => r.json()),
      fetch(`/api/sessions?parent_id=${user.user_id}`).then(r => r.json()),
      fetch(`/api/schedules?parent_id=${user.user_id}`).then(r => r.json()),
      fetch(`/api/grades?parent_id=${user.user_id}`).then(r => r.json()),
    ]).then(([enrollData, sessData, schedData, gradeData]) => {
      const enrollments = enrollData.enrollments || [];
      const uniqueChildren = new Set(enrollments.map((e: {student_id: string}) => e.student_id)).size;
      setStats({
        children: uniqueChildren,
        sessions: (sessData.sessions || []).length,
        schedules: (schedData.schedules || []).length,
        grades: (gradeData.grades || []).length,
      });
    }).catch(() => toast.error('Failed to load dashboard data'))
      .finally(() => setLoading(false));
  }, [user?.user_id]);

  return (
    <DashboardLayout title="Parent Dashboard">
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="My Children" value={loading ? '...' : stats.children} icon={Users} color="purple" />
          <StatCard title="Total Sessions" value={loading ? '...' : stats.sessions} icon={Video} color="blue" />
          <StatCard title="Grade Reports" value={loading ? '...' : stats.grades} icon={BarChart3} color="green" />
          <StatCard title="Schedules" value={loading ? '...' : stats.schedules} icon={Calendar} color="orange" />
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">Quick Links</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Children's Progress", href: '/parent/children', icon: Users, color: 'bg-purple-50 text-purple-600 hover:bg-purple-100' },
              { label: 'View Schedule', href: '/parent/schedule', icon: Calendar, color: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
              { label: 'Grade Reports', href: '/parent/grades', icon: BarChart3, color: 'bg-green-50 text-green-600 hover:bg-green-100' },
              { label: 'Send Message', href: '/parent/messages', icon: MessageSquare, color: 'bg-orange-50 text-orange-600 hover:bg-orange-100' },
            ].map((a) => (
              <a key={a.label} href={a.href}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-colors ${a.color}`}>
                <a.icon size={22} />
                <span className="text-sm font-medium text-center">{a.label}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
