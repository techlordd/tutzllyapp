'use client';
import { useState, useMemo } from 'react';
import { X, Clock, User, GraduationCap, BookOpen, Search, Video, CalendarDays } from 'lucide-react';
import { formatTime } from '@/lib/utils';

const ORDERED_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_ABBREV: Record<string, string> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed',
  Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
};

interface Schedule {
  schedule_id: string; student_name: string; tutor_name: string; course_name: string;
  course_code: string; day: string; session_start_time: string; session_end_time: string;
  duration: number; assign_status: string; zoom_link: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  schedules: Schedule[];
}

export default function TimetableDrawer({ open, onClose, schedules }: Props) {
  const [search, setSearch] = useState('');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return schedules.filter(s => {
      const matchesSearch = !q ||
        s.student_name?.toLowerCase().includes(q) ||
        s.tutor_name?.toLowerCase().includes(q) ||
        s.course_name?.toLowerCase().includes(q) ||
        s.course_code?.toLowerCase().includes(q);
      const matchesDay = !selectedDay || s.day === selectedDay;
      return matchesSearch && matchesDay && s.assign_status !== 'deleted';
    });
  }, [schedules, search, selectedDay]);

  const byDay = useMemo(() => {
    const map: Record<string, Schedule[]> = {};
    ORDERED_DAYS.forEach(d => { map[d] = []; });
    filtered.forEach(s => {
      const d = s.day || 'Other';
      if (!map[d]) map[d] = [];
      map[d].push(s);
    });
    Object.values(map).forEach(arr =>
      arr.sort((a, b) => (a.session_start_time || '').localeCompare(b.session_start_time || ''))
    );
    return map;
  }, [filtered]);

  const activeDays = ORDERED_DAYS.filter(d => byDay[d]?.length > 0);
  const totalVisible = filtered.length;
  const daysToShow = selectedDay ? [selectedDay] : activeDays;

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden" onClick={onClose} />
      )}

      <div className={`
        fixed top-0 right-0 h-full w-full sm:w-[380px] bg-white z-50
        flex flex-col transition-transform duration-300 ease-in-out shadow-[−8px_0_40px_rgba(0,0,0,0.12)]
        ${open ? 'translate-x-0' : 'translate-x-full'}
      `}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-indigo-600 to-indigo-500 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
              <CalendarDays size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Weekly Timetable</h2>
              <p className="text-xs text-indigo-200 mt-0.5">
                {totalVisible} session{totalVisible !== 1 ? 's' : ''}
                {selectedDay ? ` · ${selectedDay}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-3 pb-2 flex-shrink-0 bg-white border-b border-gray-100">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search student, tutor, or course…"
              className="w-full pl-8 pr-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Day filter chips */}
        <div className="px-4 py-2.5 flex-shrink-0 border-b border-gray-100 bg-white">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setSelectedDay(null)}
              className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                !selectedDay
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {ORDERED_DAYS.map(d => {
              const count = byDay[d]?.length ?? 0;
              const active = selectedDay === d;
              return (
                <button
                  key={d}
                  onClick={() => setSelectedDay(active ? null : d)}
                  disabled={count === 0 && !active}
                  className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    active
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                      : count > 0
                        ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                        : 'bg-gray-50 text-gray-300 cursor-default'
                  }`}
                >
                  {DAY_ABBREV[d]}
                  {count > 0 && (
                    <span className={`ml-1.5 text-[10px] font-bold px-1 py-0.5 rounded-md ${
                      active ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-500'
                    }`}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Schedule list */}
        <div className="flex-1 overflow-y-auto bg-gray-50/50">
          {daysToShow.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-52 gap-3 text-gray-400">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                <BookOpen size={24} className="opacity-40" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-500">No sessions found</p>
                <p className="text-xs text-gray-400 mt-0.5">Try a different day or search term</p>
              </div>
            </div>
          ) : (
            <div className="py-3 space-y-4">
              {daysToShow.map(day => (
                <div key={day}>
                  {/* Day header */}
                  <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-2 bg-gray-50/95 backdrop-blur-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">{day}</span>
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-50 px-2 py-0.5 rounded-full">
                      {byDay[day].length}
                    </span>
                  </div>

                  {/* Session cards */}
                  <div className="px-4 pt-1 space-y-2.5">
                    {byDay[day].map(s => (
                      <div
                        key={s.schedule_id}
                        className={`rounded-2xl bg-white border transition-all ${
                          s.assign_status === 'active'
                            ? 'border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-200'
                            : 'border-gray-100 opacity-50'
                        }`}
                      >
                        {/* Card top — time + join */}
                        <div className="flex items-center justify-between px-3.5 pt-3 pb-2.5 border-b border-gray-100">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                              <Clock size={11} className="text-indigo-500" />
                            </div>
                            <span className="text-xs font-bold text-gray-800">
                              {s.session_start_time ? formatTime(s.session_start_time) : '—'}
                              <span className="mx-1 text-gray-400 font-normal">→</span>
                              {s.session_end_time ? formatTime(s.session_end_time) : '—'}
                            </span>
                            {s.duration && (
                              <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md font-medium">
                                {s.duration}m
                              </span>
                            )}
                          </div>
                          {s.zoom_link ? (
                            <a
                              href={s.zoom_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-[11px] font-bold text-white bg-indigo-500 hover:bg-indigo-600 px-2.5 py-1 rounded-lg transition-colors"
                            >
                              <Video size={10} />
                              Join
                            </a>
                          ) : (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              s.assign_status === 'active'
                                ? 'text-emerald-600 bg-emerald-50'
                                : 'text-gray-400 bg-gray-100'
                            }`}>
                              {s.assign_status === 'active' ? 'Active' : s.assign_status}
                            </span>
                          )}
                        </div>

                        {/* Card body */}
                        <div className="px-3.5 py-2.5 space-y-2">
                          {/* Course */}
                          <div className="flex items-center gap-2">
                            <BookOpen size={11} className="text-gray-400 flex-shrink-0" />
                            <span className="text-xs font-semibold text-gray-800 truncate flex-1">{s.course_name || '—'}</span>
                            {s.course_code && (
                              <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md flex-shrink-0">
                                {s.course_code}
                              </span>
                            )}
                          </div>

                          {/* Student & Tutor side by side */}
                          <div className="grid grid-cols-2 gap-2 pt-0.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <div className="w-5 h-5 rounded-md bg-sky-50 flex items-center justify-center flex-shrink-0">
                                <User size={9} className="text-sky-500" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide leading-none mb-0.5">Student</p>
                                <p className="text-[11px] font-medium text-gray-700 truncate">{s.student_name || '—'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <div className="w-5 h-5 rounded-md bg-violet-50 flex items-center justify-center flex-shrink-0">
                                <GraduationCap size={9} className="text-violet-500" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide leading-none mb-0.5">Tutor</p>
                                <p className="text-[11px] font-medium text-gray-700 truncate">{s.tutor_name || '—'}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
