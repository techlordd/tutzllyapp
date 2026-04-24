'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import { Video, Calendar } from 'lucide-react';
import { formatTime } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

interface Schedule {
  schedule_id: string; tutor_name: string; course_name: string;
  day: string; session_start_time: string; session_end_time: string;
  duration: number; zoom_link: string; meeting_id: string; time_zone: string;
}

const DAYS = [
  { label: 'Mon', full: 'Monday',    bg: 'bg-blue-500',   ring: 'ring-blue-500',   light: 'bg-blue-100 text-blue-700' },
  { label: 'Tue', full: 'Tuesday',   bg: 'bg-purple-500', ring: 'ring-purple-500', light: 'bg-purple-100 text-purple-700' },
  { label: 'Wed', full: 'Wednesday', bg: 'bg-emerald-500',ring: 'ring-emerald-500',light: 'bg-emerald-100 text-emerald-700' },
  { label: 'Thu', full: 'Thursday',  bg: 'bg-orange-500', ring: 'ring-orange-500', light: 'bg-orange-100 text-orange-700' },
  { label: 'Fri', full: 'Friday',    bg: 'bg-red-500',    ring: 'ring-red-500',    light: 'bg-red-100 text-red-700' },
  { label: 'Sat', full: 'Saturday',  bg: 'bg-pink-500',   ring: 'ring-pink-500',   light: 'bg-pink-100 text-pink-700' },
  { label: 'Sun', full: 'Sunday',    bg: 'bg-amber-500',  ring: 'ring-amber-500',  light: 'bg-amber-100 text-amber-700' },
];

export default function StudentSchedulePage() {
  const user = useAuthStore(state => state.user);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.user_id) return;
    fetch(`/api/schedules?student_id=${user.user_id}`)
      .then(r => r.json())
      .then(d => { setSchedules(d.schedules || []); setLoading(false); })
      .catch(() => { setLoading(false); toast.error('Failed to load data'); });
  }, [user?.user_id]);

  const filtered = selectedDay ? schedules.filter(s => s.day === selectedDay) : schedules;

  const columns = [
    { key: 'course_name', label: 'Course', sortable: true },
    { key: 'tutor_name', label: 'Tutor' },
    { key: 'day', label: 'Day', render: (v: unknown) => {
      const d = DAYS.find(d => d.full === (v as string));
      return d ? <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${d.light}`}>{v as string}</span> : <span>{v as string}</span>;
    }},
    { key: 'session_start_time', label: 'Time', render: (_: unknown, row: Schedule) =>
      `${formatTime(row.session_start_time)} – ${formatTime(row.session_end_time)}` },
    { key: 'duration', label: 'Duration', render: (v: unknown) => `${v} min` },
    { key: 'time_zone', label: 'Timezone' },
    { key: 'meeting_id', label: 'Meeting ID' },
    { key: 'zoom_link', label: 'Zoom', render: (v: unknown) => v ? (
      <a href={v as string} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline text-xs">
        <Video size={12} /> Join Zoom
      </a>
    ) : '—' },
  ];

  return (
    <DashboardLayout title="My Schedule">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Calendar size={24} className="text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">My Schedule</h2>
            <p className="text-gray-500 text-sm">{filtered.length} of {schedules.length} sessions scheduled</p>
          </div>
        </div>

        {/* Day filter buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedDay(null)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              selectedDay === null
                ? 'bg-gray-800 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {DAYS.map(d => (
            <button
              key={d.full}
              onClick={() => setSelectedDay(selectedDay === d.full ? null : d.full)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                selectedDay === d.full
                  ? `${d.bg} text-white shadow-sm ring-2 ${d.ring} ring-offset-1`
                  : `${d.light} hover:opacity-80`
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        <DataTable data={filtered} columns={columns} loading={loading}
          searchKeys={['course_name', 'tutor_name', 'day']}
          emptyMessage="No schedule found for this day" />
      </div>
    </DashboardLayout>
  );
}
