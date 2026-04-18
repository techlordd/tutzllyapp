'use client';
import { useEffect, useState } from 'react';
import { Users, GraduationCap, BookOpen, Calendar, Video, ClipboardList, BarChart3, UserPlus } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import toast from 'react-hot-toast';

const radarData = [
  { subject: 'Punctuality', A: 85 },
  { subject: 'Attentiveness', A: 78 },
  { subject: 'Engagement', A: 90 },
  { subject: 'Homework', A: 72 },
  { subject: 'Test Score', A: 88 },
];

const sessionData = [
  { name: 'Mon', Completed: 8, Missed: 1 },
  { name: 'Tue', Completed: 12, Missed: 2 },
  { name: 'Wed', Completed: 9, Missed: 0 },
  { name: 'Thu', Completed: 14, Missed: 1 },
  { name: 'Fri', Completed: 11, Missed: 3 },
  { name: 'Sat', Completed: 6, Missed: 0 },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState({ tutors: 0, students: 0, parents: 0, courses: 0, sessions: 0, activities: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [tutors, students, parents, courses, sessions, activities] = await Promise.all([
          fetch('/api/tutors').then(r => r.json()),
          fetch('/api/students').then(r => r.json()),
          fetch('/api/parents').then(r => r.json()),
          fetch('/api/courses').then(r => r.json()),
          fetch('/api/sessions?count=true').then(r => r.json()),
          fetch('/api/activities').then(r => r.json()),
        ]);
        setStats({
          tutors: tutors.tutors?.length || 0,
          students: students.students?.length || 0,
          parents: parents.parents?.length || 0,
          courses: courses.courses?.length || 0,
          sessions: sessions.count || 0,
          activities: activities.activities?.length || 0,
        });
      } catch { toast.error('Failed to load stats'); }
      setLoading(false);
    };
    fetchStats();
  }, []);

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard title="Tutors" value={loading ? '...' : stats.tutors} icon={GraduationCap} color="blue" />
          <StatCard title="Students" value={loading ? '...' : stats.students} icon={Users} color="green" />
          <StatCard title="Parents" value={loading ? '...' : stats.parents} icon={UserPlus} color="purple" />
          <StatCard title="Courses" value={loading ? '...' : stats.courses} icon={BookOpen} color="orange" />
          <StatCard title="Sessions" value={loading ? '...' : stats.sessions} icon={Video} color="teal" />
          <StatCard title="Activities" value={loading ? '...' : stats.activities} icon={ClipboardList} color="red" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              Weekly Sessions Overview
              <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Sample Data</span>
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={sessionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Completed" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Missed" fill="#f87171" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              Average Student Performance
              <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Sample Data</span>
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                <Radar name="Avg" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Add Tutor', href: '/admin/tutors', icon: GraduationCap, color: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
              { label: 'Add Student', href: '/admin/students', icon: Users, color: 'bg-green-50 text-green-600 hover:bg-green-100' },
              { label: 'Add Course', href: '/admin/courses', icon: BookOpen, color: 'bg-orange-50 text-orange-600 hover:bg-orange-100' },
              { label: 'New Schedule', href: '/admin/schedules', icon: Calendar, color: 'bg-purple-50 text-purple-600 hover:bg-purple-100' },
            ].map((action) => (
              <a key={action.label} href={action.href}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-colors cursor-pointer ${action.color}`}>
                <action.icon size={22} />
                <span className="text-sm font-medium">{action.label}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
