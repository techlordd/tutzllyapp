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

const DAY_THEME: Record<string, {
  header: string; badge: string; card: string; cardHover: string;
  icon: string; accent: string; tab: string; tabActive: string;
}> = {
  Monday:    { header: 'bg-blue-600',    badge: 'bg-blue-500/25 text-blue-100',    card: 'bg-blue-50/70 border-blue-200',    cardHover: 'hover:bg-blue-50 hover:border-blue-300',    icon: 'text-blue-500',    accent: 'text-blue-600',    tab: 'text-blue-700 bg-blue-50 border-blue-200',    tabActive: 'bg-blue-600 text-white border-blue-600' },
  Tuesday:   { header: 'bg-violet-600',  badge: 'bg-violet-500/25 text-violet-100', card: 'bg-violet-50/70 border-violet-200', cardHover: 'hover:bg-violet-50 hover:border-violet-300', icon: 'text-violet-500',  accent: 'text-violet-600',  tab: 'text-violet-700 bg-violet-50 border-violet-200', tabActive: 'bg-violet-600 text-white border-violet-600' },
  Wednesday: { header: 'bg-emerald-600', badge: 'bg-emerald-500/25 text-emerald-100', card: 'bg-emerald-50/70 border-emerald-200', cardHover: 'hover:bg-emerald-50 hover:border-emerald-300', icon: 'text-emerald-500', accent: 'text-emerald-600', tab: 'text-emerald-700 bg-emerald-50 border-emerald-200', tabActive: 'bg-emerald-600 text-white border-emerald-600' },
  Thursday:  { header: 'bg-amber-500',   badge: 'bg-amber-500/25 text-amber-100',   card: 'bg-amber-50/70 border-amber-200',   cardHover: 'hover:bg-amber-50 hover:border-amber-300',   icon: 'text-amber-500',   accent: 'text-amber-600',   tab: 'text-amber-700 bg-amber-50 border-amber-200',   tabActive: 'bg-amber-500 text-white border-amber-500' },
  Friday:    { header: 'bg-rose-600',    badge: 'bg-rose-500/25 text-rose-100',    card: 'bg-rose-50/70 border-rose-200',    cardHover: 'hover:bg-rose-50 hover:border-rose-300',    icon: 'text-rose-500',    accent: 'text-rose-600',    tab: 'text-rose-700 bg-rose-50 border-rose-200',    tabActive: 'bg-rose-600 text-white border-rose-600' },
  Saturday:  { header: 'bg-teal-600',    badge: 'bg-teal-500/25 text-teal-100',    card: 'bg-teal-50/70 border-teal-200',    cardHover: 'hover:bg-teal-50 hover:border-teal-300',    icon: 'text-teal-500',    accent: 'text-teal-600',    tab: 'text-teal-700 bg-teal-50 border-teal-200',    tabActive: 'bg-teal-600 text-white border-teal-600' },
  Sunday:    { header: 'bg-indigo-600',  badge: 'bg-indigo-500/25 text-indigo-100', card: 'bg-indigo-50/70 border-indigo-200', cardHover: 'hover:bg-indigo-50 hover:border-indigo-300', icon: 'text-indigo-500',  accent: 'text-indigo-600',  tab: 'text-indigo-700 bg-indigo-50 border-indigo-200', tabActive: 'bg-indigo-600 text-white border-indigo-600' },
};

interface Schedule {
  schedule_id: string; student_name: string; student_id: string;
  tutor_name: string; tutor_email: string; course_name: string; course_code: string;
  day: string; session_start_time: string; session_end_time: string;
  duration: number; assign_status: string; zoom_link: string; year: string;
}

function SessionCard({ s }: { s: Schedule }) {
  const theme = DAY_THEME[s.day] ?? DAY_THEME.Monday;
  const active = s.assign_status === 'active';
  return (
    <Link href={`/admin/schedules/${s.schedule_id}`}>
      <div className={`rounded-xl border p-3 space-y-2.5 cursor-pointer transition-all duration-150 ${
        active
          ? `${theme.card} ${theme.cardHover} shadow-sm hover:shadow-md`
          : 'bg-gray-50 border-gray-200 opacity-50 hover:opacity-70'
      }`}>
        {/* Time row */}
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5">
            <Clock size={11} className={active ? theme.icon : 'text-gray-400'} />
            <span className="text-xs font-bold text-slate-800 tracking-tight">
              {s.session_start_time ? formatTime(s.session_start_time) : '—'}
              <span className="font-normal text-slate-400 mx-0.5">–</span>
              {s.session_end_time ? formatTime(s.session_end_time) : '—'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {s.duration ? (
              <span className="text-[10px] bg-white/70 border border-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">{s.duration}m</span>
            ) : null}
            {s.zoom_link && (
              <a
                href={s.zoom_link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className={`flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-white border border-gray-200 transition-colors hover:bg-gray-50 ${active ? theme.accent : 'text-gray-400'}`}
              >
                <Video size={10} /> Join
              </a>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/60" />

        {/* Course */}
        <div className="flex items-start gap-1.5">
          <BookOpen size={11} className={`flex-shrink-0 mt-0.5 ${active ? theme.icon : 'text-gray-300'}`} />
          <div className="min-w-0">
            <span className="text-xs font-semibold text-slate-800 leading-tight block truncate">{s.course_name || '—'}</span>
            {s.course_code && (
              <span className="text-[10px] font-mono bg-white border border-gray-200 text-gray-500 px-1 rounded mt-0.5 inline-block">{s.course_code}</span>
            )}
          </div>
        </div>

        {/* Student */}
        <div className="flex items-center gap-1.5">
          <User size={11} className={`flex-shrink-0 ${active ? 'text-slate-400' : 'text-gray-300'}`} />
          <span className="text-[11px] text-slate-600 truncate">{s.student_name || '—'}</span>
        </div>

        {/* Tutor */}
        <div className="flex items-center gap-1.5">
          <GraduationCap size={11} className={`flex-shrink-0 ${active ? 'text-slate-400' : 'text-gray-300'}`} />
          <span className="text-[11px] text-slate-500 truncate">{s.tutor_name || '—'}</span>
        </div>
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
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Timetable</h2>
            <p className="text-gray-500 text-sm mt-0.5">{schedules.length} schedules · {totalActive} active</p>
          </div>

          {/* Day count chips */}
          <div className="flex gap-1.5 flex-wrap">
            {DAYS.map(d => {
              if (!dayCounts[d]) return null;
              const theme = DAY_THEME[d];
              return (
                <button
                  key={d}
                  onClick={() => setActiveDay(activeDay === d ? null : d)}
                  className={`text-xs px-2.5 py-1 rounded-full font-semibold border transition-all ${
                    activeDay === d
                      ? `${theme.tabActive} shadow-sm`
                      : `${theme.tab} hover:opacity-80`
                  }`}
                >
                  {DAY_ABBREV[d]} <span className="opacity-80">{dayCounts[d]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter bar */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5 flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search student, tutor, course…"
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 items-center">
            <Filter size={13} className="text-gray-400 flex-shrink-0" />
            <button
              onClick={() => setActiveDay(null)}
              className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                !activeDay ? 'bg-slate-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >All</button>
            {DAYS.map(d => {
              const theme = DAY_THEME[d];
              return (
                <button
                  key={d}
                  onClick={() => setActiveDay(activeDay === d ? null : d)}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium border transition-all ${
                    activeDay === d
                      ? `${theme.tabActive}`
                      : dayCounts[d] > 0
                        ? `${theme.tab} hover:opacity-80`
                        : 'bg-gray-50 text-gray-300 border-transparent'
                  }`}
                >
                  {DAY_ABBREV[d]}
                  {dayCounts[d] > 0 && <span className="ml-1 opacity-70">{dayCounts[d]}</span>}
                </button>
              );
            })}
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
              {DAYS.map(day => {
                const theme = DAY_THEME[day];
                const count = byDay[day].length;
                const dimmed = !!activeDay && activeDay !== day;
                return (
                  <div key={day} className={`transition-opacity duration-200 ${dimmed ? 'opacity-25' : ''}`}>
                    {/* Day header */}
                    <div className={`rounded-xl px-3 py-2.5 mb-2.5 text-center ${count > 0 ? theme.header : 'bg-gray-100'}`}>
                      <p className={`text-xs font-extrabold tracking-wide ${count > 0 ? 'text-white' : 'text-gray-400'}`}>
                        {DAY_ABBREV[day]}
                      </p>
                      <p className={`text-[10px] mt-0.5 ${count > 0 ? 'text-white/70' : 'text-gray-400'}`}>
                        {count} session{count !== 1 ? 's' : ''}
                      </p>
                    </div>

                    {/* Cards */}
                    <div className="space-y-2">
                      {count === 0 ? (
                        <div className="rounded-xl border border-dashed border-gray-200 p-4 text-center">
                          <CalendarDays size={16} className="mx-auto text-gray-300 mb-1" />
                          <p className="text-[10px] text-gray-300">No sessions</p>
                        </div>
                      ) : (
                        byDay[day].map(s => <SessionCard key={s.schedule_id} s={s} />)
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile/Tablet: tab per day */}
            <div className="lg:hidden">
              <div className="flex overflow-x-auto gap-1.5 pb-2 no-scrollbar">
                {DAYS.map(d => {
                  const theme = DAY_THEME[d];
                  const isActive = mobileDay === d;
                  return (
                    <button
                      key={d}
                      onClick={() => setMobileDay(d)}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        isActive ? theme.tabActive : `${theme.tab} opacity-70 hover:opacity-100`
                      }`}
                    >
                      {DAY_ABBREV[d]}
                      {byDay[d].length > 0 && (
                        <span className={`ml-1.5 text-[10px] px-1 py-0.5 rounded-full ${isActive ? 'bg-white/25' : 'bg-white/60'}`}>
                          {byDay[d].length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Selected day header */}
              {byDay[mobileDay].length > 0 && (
                <div className={`rounded-xl px-4 py-3 mt-2 mb-3 ${DAY_THEME[mobileDay].header}`}>
                  <p className="text-sm font-bold text-white">{mobileDay}</p>
                  <p className="text-xs text-white/70">{byDay[mobileDay].length} session{byDay[mobileDay].length !== 1 ? 's' : ''}</p>
                </div>
              )}

              <div className="space-y-2">
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
