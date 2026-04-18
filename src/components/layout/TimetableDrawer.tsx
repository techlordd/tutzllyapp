'use client';
import { useState, useMemo } from 'react';
import { X, Clock, User, GraduationCap, BookOpen, Search, Video } from 'lucide-react';
import { formatTime } from '@/lib/utils';

const ORDERED_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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
    // Sort sessions within each day by start time
    Object.values(map).forEach(arr =>
      arr.sort((a, b) => (a.session_start_time || '').localeCompare(b.session_start_time || ''))
    );
    return map;
  }, [filtered]);

  const activeDays = ORDERED_DAYS.filter(d => byDay[d]?.length > 0);
  const totalVisible = filtered.length;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div className={`
        fixed top-0 right-0 h-full w-full sm:w-96 bg-white shadow-2xl z-50
        flex flex-col transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : 'translate-x-full'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 bg-slate-900">
          <div>
            <h2 className="text-base font-bold text-white">Timetable</h2>
            <p className="text-xs text-slate-400 mt-0.5">{totalVisible} session{totalVisible !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X size={17} />
          </button>
        </div>

        {/* Filters */}
        <div className="px-4 pt-3 pb-2 border-b border-gray-100 space-y-2 flex-shrink-0">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search student, tutor, course…"
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
          </div>

          {/* Day filter chips */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedDay(null)}
              className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                !selectedDay
                  ? 'bg-slate-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {ORDERED_DAYS.map(d => {
              const count = byDay[d]?.length ?? 0;
              const abbrev = d.slice(0, 3);
              return (
                <button
                  key={d}
                  onClick={() => setSelectedDay(selectedDay === d ? null : d)}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                    selectedDay === d
                      ? 'bg-blue-600 text-white'
                      : count > 0
                        ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                        : 'bg-gray-100 text-gray-400 cursor-default'
                  }`}
                  disabled={count === 0 && selectedDay !== d}
                >
                  {abbrev}
                  {count > 0 && <span className="ml-1 opacity-70">{count}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Schedule list grouped by day */}
        <div className="flex-1 overflow-y-auto">
          {activeDays.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <BookOpen size={32} className="mb-2 opacity-40" />
              <p className="text-sm">No sessions found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {(selectedDay ? [selectedDay] : activeDays).map(day => (
                <div key={day}>
                  {/* Day header */}
                  <div className="sticky top-0 px-4 py-2 bg-gray-50 border-b border-gray-100 z-10">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{day}</span>
                    <span className="ml-2 text-xs text-gray-400">{byDay[day].length} session{byDay[day].length !== 1 ? 's' : ''}</span>
                  </div>

                  {/* Sessions */}
                  <div className="px-3 py-2 space-y-2">
                    {byDay[day].map(s => (
                      <div
                        key={s.schedule_id}
                        className={`rounded-xl border p-3 text-sm space-y-2 ${
                          s.assign_status === 'active'
                            ? 'border-blue-100 bg-blue-50/50'
                            : 'border-gray-100 bg-gray-50 opacity-60'
                        }`}
                      >
                        {/* Time row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            <Clock size={12} className="text-blue-500" />
                            <span className="text-xs">
                              {s.session_start_time ? formatTime(s.session_start_time) : '—'}
                              {' – '}
                              {s.session_end_time ? formatTime(s.session_end_time) : '—'}
                            </span>
                            {s.duration && (
                              <span className="text-xs text-gray-400">({s.duration}m)</span>
                            )}
                          </div>
                          {s.zoom_link && (
                            <a
                              href={s.zoom_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                            >
                              <Video size={11} /> Join
                            </a>
                          )}
                        </div>

                        {/* Course */}
                        <div className="flex items-center gap-1.5">
                          <BookOpen size={12} className="text-indigo-400 flex-shrink-0" />
                          <span className="font-medium text-gray-800 truncate">{s.course_name || '—'}</span>
                          {s.course_code && (
                            <span className="text-xs font-mono bg-white border border-gray-200 text-gray-500 px-1.5 py-0.5 rounded flex-shrink-0">{s.course_code}</span>
                          )}
                        </div>

                        {/* Student */}
                        <div className="flex items-center gap-1.5">
                          <User size={12} className="text-green-400 flex-shrink-0" />
                          <span className="text-gray-600 truncate text-xs">{s.student_name || '—'}</span>
                        </div>

                        {/* Tutor */}
                        <div className="flex items-center gap-1.5">
                          <GraduationCap size={12} className="text-purple-400 flex-shrink-0" />
                          <span className="text-gray-600 truncate text-xs">{s.tutor_name || '—'}</span>
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
