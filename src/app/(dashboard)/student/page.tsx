'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import { Video, ClipboardList, BarChart3, Calendar, BookOpen } from 'lucide-react';
import { formatTime } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

export default function StudentDashboard() {
  const user = useAuthStore(state => state.user);
  const [stats, setStats] = useState({ sessions: 0, activities: 0, grades: 0, schedule: 0 });
  const [todaySchedules, setTodaySchedules] = useState<{schedule_id: string; tutor_name: string; course_name: string; session_start_time: string; zoom_link: string}[]>([]);
  const [recentGrades, setRecentGrades] = useState<{id: number; course_name: string; month: string; year: string; test_score: number}[]>([]);

  useEffect(() => {
    if (!user?.user_id) return;
    const fetchData = async () => {
      try {
        const [sesRes, actRes, schRes, graRes] = await Promise.all([
          fetch(`/api/sessions?student_id=${user.user_id}`),
          fetch(`/api/activities?student_id=${user.user_id}`),
          fetch(`/api/schedules?student_id=${user.user_id}`),
          fetch(`/api/grades?student_id=${user.user_id}`),
        ]);
        const [sesData, actData, schData, graData] = await Promise.all([sesRes.json(), actRes.json(), schRes.json(), graRes.json()]);
        setStats({
          sessions: sesData.sessions?.length || 0,
          activities: actData.activities?.length || 0,
          grades: graData.grades?.length || 0,
          schedule: schData.schedules?.length || 0,
        });
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        setTodaySchedules((schData.schedules || []).filter((s: {day: string}) => s.day === today));
        setRecentGrades((graData.grades || []).slice(0, 3));
      } catch { ''; }
    };
    fetchData();
  }, [user?.user_id]);

  return (
    <DashboardLayout title="Student Dashboard">
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="My Sessions" value={stats.sessions} icon={Video} color="blue" />
          <StatCard title="Class Activities" value={stats.activities} icon={ClipboardList} color="green" />
          <StatCard title="Grade Reports" value={stats.grades} icon={BarChart3} color="purple" />
          <StatCard title="My Schedules" value={stats.schedule} icon={Calendar} color="orange" />
        </div>

        {todaySchedules.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Calendar size={18} className="text-blue-600" /> Today's Classes
            </h3>
            <div className="space-y-3">
              {todaySchedules.map(sch => (
                <div key={sch.schedule_id} className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-900">{sch.course_name}</p>
                    <p className="text-xs text-gray-500">Tutor: {sch.tutor_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-green-700">{formatTime(sch.session_start_time)}</p>
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

        {recentGrades.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <BarChart3 size={18} className="text-purple-600" /> Recent Grade Reports
            </h3>
            <div className="space-y-2">
              {recentGrades.map(g => (
                <div key={g.id} className="flex items-center justify-between p-3 bg-purple-50 rounded-xl">
                  <div>
                    <p className="font-medium text-purple-900">{g.course_name}</p>
                    <p className="text-xs text-purple-500">{g.month} {g.year}</p>
                  </div>
                  <span className="font-bold text-purple-700">{g.test_score !== null ? `${g.test_score}%` : '—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
