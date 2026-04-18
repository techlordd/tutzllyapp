'use client';
import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Clock, User, GraduationCap, BookOpen, Search, Video, CalendarDays, Filter } from 'lucide-react';
import { formatTime } from '@/lib/utils';
import Link from 'next/link';
import toast from 'react-hot-toast';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_ABBREV: Record<string, string> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu',
  Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
};

interface Schedule {
  schedule_id: string; student_name: string; student_id: string;
  tutor_name: string; tutor_email: string; course_name: string; course_code: string;
  day: string; session_start_time: string; session_end_time: string;
  duration: number; assign_status: string; zoom_link: string; year: string;
}

function SessionCard({ s }: { s: Schedule }) {
  const active = s.assign_status === 'active';
  return (
    <Link href={`/admin/schedules/${s.schedule_id}`}>
      <div className={`rounded-xl border p-3 space-y-2 cursor-pointer transition-shadow hover:shadow-md ${
        active ? 'border-blue-100 bg-blue-50/60 hover:bg-blue-50' : 'border-gray-100 bg-gray-50 opacity-60'
      }`}>
        {/* Time */}
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5">
            <Clock size={11} className="text-blue-400 flex-shrink-0" />
            <span className="text-xs font-semibold text-slate-700">
              {s.session_start_time ? formatTime(s.session_start_time) : '—'}
              {' – '}
              {s.session_end_time ? formatTime(s.session_end_time) : '—'}
            </span>
          </div>
          {s.zoom_link && (
            <a
              href={s.zoom_link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-0.5 text-blue-600 hover:text-blue-800 text-xs font-medium flex-shrink-0"
            >
              <Video size={11} /> Join
            </a>
          )}
        </div>

        {/* Course */}
        <div className="flex items-start gap-1.5">
          <BookOpen size={11} className="text-indigo-400 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <span className="text-xs font-medium text-gray-800 leading-tight block truncate">{s.course_name || '—'}</span>
            {s.course_code && (
              <span className="text-[10px] font-mono bg-white border border-gray-200 text-gray-500 px-1 py-0.5 rounded mt-0.5 inline-block">{s.course_code}</span>
            )}
          </div>
        </div>

        {/* Student */}
        <div className="flex items-center gap-1.5">
          <User size={11} className="text-green-400 flex-shrink-0" />
          <span className="text-[11px] text-gray-600 truncate">{s.student_name || '—'}</span>
        </div>

        {/* Tutor */}
        <div className="flex items-center gap-1.5">
          <GraduationCap size={11} className="text-purple-400 flex-shrink-0" />
          <span className="text-[11px] text-gray-600 truncate">{s.tutor_name || '—'}</span>
        </div>

        {/* Duration pill */}
        {s.duration ? (
          <div className="pt-0.5">
            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-medium">{s.duration} min</span>
          </div>
        ) : null}
      </div>
    </Link>
  );
}

export default function TimetablePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const [activeOnly, setActiveOnly] = useState(false);
  const [mobileDay, setMobileDay] = useState(DAYS[0]);

  useEffect(() => {
    fetch('/api/schedules')
      .then(r => r.json())
      .then(d => setSchedules(d.schedules || []))
      .catch(() => toast.error('Failed to load schedules'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return schedules.filter(s => {
      const matchSearch = !q ||
        s.student_name?.toLowerCase().includes(q) ||
        s.tutor_name?.toLowerCase().includes(q) ||
        s.course_name?.toLowerCase().includes(q) ||
        s.course_code?.toLowerCase().includes(q);
      const matchDay = !activeDay || s.day === activeDay;
      const matchStatus = !activeOnly || s.assign_status === 'active';
      return matchSearch && matchDay && matchStatus;
    });
  }, [schedules, search, activeDay, activeOnly]);

  const byDay = useMemo(() => {
    const map: Record<string, Schedule[]> = {};
    DAYS.forEach(d => { map[d] = []; });
    filtered.forEach(s => {
      const d = s.day;
      if (d && map[d]) map[d].push(s);
    });
    Object.values(map).forEach(arr =>
      arr.sort((a, b) => (a.session_start_time || '').localeCompare(b.session_start_time || ''))
    );
    return map;
  }, [filtered]);

  const dayCounts = useMemo(() => {
    const map: Record<string, number> = {};
    DAYS.forEach(d => { map[d] = schedules.filter(s => s.day === d).length; });
    return map;
  }, [schedules]);

  const totalActive = schedules.filter(s => s.assign_status === 'active').length;

  return (
    <DashboardLayout title="Timetable">
      <div className="space-y-5">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Timetable</h2>
            <p className="text-gray-500 text-sm mt-0.5">
              {schedules.length} schedules · {totalActive} active
            </p>
          </div>
          {/* Stats chips */}
          <div className="flex gap-2 flex-wrap">
            {DAYS.map(d => dayCounts[d] > 0 && (
              <span key={d} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">
                {DAY_ABBREV[d]} <span className="font-bold">{dayCounts[d]}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Filter bar */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search student, tutor, course…"
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
          </div>

          {/* Day chips */}
          <div className="flex flex-wrap gap-1.5 items-center">
            <Filter size={13} className="text-gray-400 flex-shrink-0" />
            <button
              onClick={() => setActiveDay(null)}
              className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                !activeDay ? 'bg-slate-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >All</button>
            {DAYS.map(d => (
              <button
                key={d}
                onClick={() => setActiveDay(activeDay === d ? null : d)}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                  activeDay === d
                    ? 'bg-blue-600 text-white'
                    : dayCounts[d] > 0
                      ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                      : 'bg-gray-50 text-gray-300'
                }`}
              >
                {DAY_ABBREV[d]}
                {dayCounts[d] > 0 && <span className="ml-1 opacity-70">{dayCounts[d]}</span>}
              </button>
            ))}
            <button
              onClick={() => setActiveOnly(v => !v)}
              className={`text-xs px-2.5 py-1 rounded-full font-medium border transition-colors ${
                activeOnly ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              }`}
            >Active only</button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Desktop: 7-column weekly grid */}
            <div className="hidden lg:grid grid-cols-7 gap-3">
              {DAYS.map(day => (
                <div key={day} className={`${activeDay && activeDay !== day ? 'opacity-30' : ''} transition-opacity`}>
                  {/* Day header */}
                  <div className={`rounded-xl px-3 py-2 mb-2 text-center ${
                    byDay[day].length > 0 ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-400'
                  }`}>
                    <p className="text-xs font-bold">{DAY_ABBREV[day]}</p>
                    <p className="text-[10px] opacity-70">{byDay[day].length} session{byDay[day].length !== 1 ? 's' : ''}</p>
                  </div>

                  {/* Session cards */}
                  <div className="space-y-2">
                    {byDay[day].length === 0 ? (
                      <div className="rounded-xl border border-dashed border-gray-200 p-4 text-center">
                        <CalendarDays size={16} className="mx-auto text-gray-300 mb-1" />
                        <p className="text-[10px] text-gray-300">No sessions</p>
                      </div>
                    ) : (
                      byDay[day].map(s => <SessionCard key={s.schedule_id} s={s} />)
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile/Tablet: tab per day */}
            <div className="lg:hidden">
              {/* Day tabs */}
              <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar">
                {DAYS.map(d => (
                  <button
                    key={d}
                    onClick={() => setMobileDay(d)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      mobileDay === d
                        ? 'bg-slate-800 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {DAY_ABBREV[d]}
                    {byDay[d].length > 0 && (
                      <span className={`ml-1.5 text-[10px] px-1 py-0.5 rounded-full ${mobileDay === d ? 'bg-white/20' : 'bg-gray-200'}`}>
                        {byDay[d].length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Selected day sessions */}
              <div className="mt-3 space-y-2">
                {byDay[mobileDay].length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-gray-400 border border-dashed border-gray-200 rounded-2xl">
                    <CalendarDays size={24} className="mb-2 opacity-40" />
                    <p className="text-sm">No sessions for {mobileDay}</p>
                  </div>
                ) : (
                  byDay[mobileDay].map(s => <SessionCard key={s.schedule_id} s={s} />)
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
