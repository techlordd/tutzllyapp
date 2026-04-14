'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import { Users, Video, ClipboardList, BarChart3, Calendar, BookOpen } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

export default function TutorDashboard() {
  const user = useAuthStore(state => state.user);
  const [stats, setStats] = useState({ students: 0, sessions: 0, activities: 0, grades: 0 });
  const [loading, setLoading] = useState(true);
  const [todaySchedules, setTodaySchedules] = useState<{schedule_id: string; student_name: string; course_name: string; session_start_time: string; day: string; zoom_link: string}[]>([]);

  useEffect(() => {
    if (!user?.user_id) return;
    const fetchData = async () => {
      try {
        const [sesRes, actRes, schRes] = await Promise.all([
          fetch(`/api/sessions?tutor_id=${user.user_id}`),
          fetch(`/api/activities?tutor_id=${user.user_id}`),
          fetch(`/api/schedules?tutor_id=${user.user_id}`),
        ]);
        const [sesData, actData, schData] = await Promise.all([sesRes.json(), actRes.json(), schRes.json()]);
        setStats({
          students: new Set((sesData.sessions || []).map((s: {student_id: string}) => s.student_id)).size,
          sessions: sesData.sessions?.length || 0,
          activities: actData.activities?.length || 0,
          grades: 0,
        });
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        setTodaySchedules((schData.schedules || []).filter((s: {day: string}) => s.day === today));
      } catch { toast.error('Failed to load dashboard data'); }
      setLoading(false);
    };
    fetchData();
  }, [user?.user_id]);

  return (
    <DashboardLayout title="Tutor Dashboard">
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="My Students" value={loading ? '...' : stats.students} icon={Users} color="blue" />
          <StatCard title="Sessions" value={loading ? '...' : stats.sessions} icon={Video} color="green" />
          <StatCard title="Activities" value={loading ? '...' : stats.activities} icon={ClipboardList} color="purple" />
          <StatCard title="Today's Classes" value={loading ? '...' : todaySchedules.length} icon={Calendar} color="orange" />
        </div>

        {todaySchedules.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Calendar size={18} className="text-blue-600" /> Today's Schedule
            </h3>
            <div className="space-y-3">
              {todaySchedules.map(sch => (
                <div key={sch.schedule_id} className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                      <Video size={16} className="text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{sch.student_name}</p>
                      <p className="text-xs text-gray-500">{sch.course_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-blue-700">{sch.session_start_time?.slice(0, 5)}</p>
                    {sch.zoom_link && (
                      <a href={sch.zoom_link} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:text-blue-700">Join Zoom →</a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'My Schedule', href: '/tutor/schedule', icon: Calendar, color: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
              { label: 'Start Session', href: '/tutor/sessions', icon: Video, color: 'bg-green-50 text-green-600 hover:bg-green-100' },
              { label: 'Log Activity', href: '/tutor/activities', icon: ClipboardList, color: 'bg-purple-50 text-purple-600 hover:bg-purple-100' },
              { label: 'Grade Book', href: '/tutor/grades', icon: BarChart3, color: 'bg-orange-50 text-orange-600 hover:bg-orange-100' },
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
