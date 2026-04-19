'use client';
import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import FormField, { Input, Select } from '@/components/ui/FormField';
import Link from 'next/link';
import { Plus, Edit, Trash2, Video, Eye, CalendarDays } from 'lucide-react';
import { DAYS_OF_WEEK, TIMEZONES, formatTime } from '@/lib/utils';
import toast from 'react-hot-toast';
import TimetableDrawer from '@/components/layout/TimetableDrawer';

interface Schedule {
  schedule_id: string; student_name: string; student_id: string;
  tutor_name: string; tutor_id: string; tutor_email: string; course_name: string;
  course_id: number; course_code: string;
  day: string; session_start_time: string; session_end_time: string;
  duration: number; zoom_link: string; meeting_id: string; meeting_passcode: string;
  time_zone: string; time_zone_deprecated: string; assign_status: string;
  year: string; sort_id: number;
  entry_status: string; timestamp: string; last_updated: string;
  created_by: string; updated_by: string; ip: string; record_key: string;
}

interface Enrollment {
  assign_id: string; student_id: string; student_name: string;
  tutor_id: string; tutor_name: string; tutor_email: string;
  course_id: number; course_name: string; course_code: string;
}

interface TutorAssignment {
  tutor_assign_id: string; tutor_id: string;
  course_id: number; course_name: string; course_code: string;
}

const emptyForm = {
  student_id: '', student_name: '', tutor_id: '', tutor_name: '', tutor_email: '',
  course_id: '', course_name: '', course_code: '', year: new Date().getFullYear().toString(),
  day: '', duration: '60', session_start_time: '', session_end_time: '',
  time_zone: 'WAT (Africa/Lagos)', zoom_link: '', meeting_id: '', meeting_passcode: '',
};

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [tutorAssignments, setTutorAssignments] = useState<TutorAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [timetableOpen, setTimetableOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  // Unique enrolled students
  const enrolledStudents = [...new Map(enrollments.map(e => [e.student_id, e])).values()];

  // Tutors teaching the selected student
  const studentTutors = [
    ...new Map(
      enrollments.filter(e => e.student_id === form.student_id).map(e => [e.tutor_id, e])
    ).values(),
  ];

  // Courses assigned to the selected tutor — sourced from tutor-assignments
  // (JOINs the courses table, so course_name/code are always accurate)
  const tutorCourses = tutorAssignments.filter(a => a.tutor_id === form.tutor_id);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [schRes, enrRes, taRes] = await Promise.all([
        fetch('/api/schedules'), fetch('/api/enrollments'), fetch('/api/tutor-assignments'),
      ]);
      const [schData, enrData, taData] = await Promise.all([schRes.json(), enrRes.json(), taRes.json()]);
      setSchedules(schData.schedules || []);
      setEnrollments(enrData.enrollments || []);
      setTutorAssignments(taData.assignments || []);
    } catch { toast.error('Failed to load data'); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStudentChange = (studentId: string) => {
    const e = enrollments.find(e => e.student_id === studentId);
    setForm(f => ({
      ...f,
      student_id: studentId,
      student_name: e?.student_name || '',
      // Reset downstream selections
      tutor_id: '', tutor_name: '', tutor_email: '',
      course_id: '', course_name: '', course_code: '',
    }));
  };

  const handleTutorChange = (tutorId: string) => {
    const e = enrollments.find(e => e.student_id === form.student_id && e.tutor_id === tutorId);
    setForm(f => ({
      ...f,
      tutor_id: tutorId,
      tutor_name: e?.tutor_name || '',
      tutor_email: e?.tutor_email || '',
      // Reset course when tutor changes
      course_id: '', course_name: '', course_code: '',
    }));
  };

  const handleCourseChange = (courseId: string) => {
    const e = tutorCourses.find(e => String(e.course_id) === courseId);
    setForm(f => ({ ...f, course_id: courseId, course_name: e?.course_name || '', course_code: e?.course_code || '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editingSchedule ? `/api/schedules/${editingSchedule.schedule_id}` : '/api/schedules';
      const method = editingSchedule ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      toast.success(editingSchedule ? 'Schedule updated!' : 'Schedule created!');
      setModalOpen(false);
      setEditingSchedule(null);
      setForm(emptyForm);
      fetchData();
    } catch { toast.error('Failed to save schedule'); }
    setSubmitting(false);
  };

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    try {
      const res = await fetch('/api/schedules', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed to delete schedules'); setDeletingAll(false); return; }
      toast.success(`Deleted ${data.deleted} schedule${data.deleted !== 1 ? 's' : ''}`);
      setDeleteAllOpen(false);
      fetchData();
    } catch { toast.error('Failed to delete schedules'); }
    setDeletingAll(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this schedule?')) return;
    try {
      await fetch(`/api/schedules/${id}`, { method: 'DELETE' });
      toast.success('Schedule deleted');
      fetchData();
    } catch { toast.error('Failed to delete'); }
  };

  const openCreate = () => {
    setEditingSchedule(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (row: Schedule) => {
    setEditingSchedule(row);
    setForm({ ...emptyForm, ...row, course_id: String(row.course_id), duration: String(row.duration) });
    setModalOpen(true);
  };

  const columns = [
    { key: 'schedule_id', label: 'Schedule ID', render: (v: unknown) => (
      <span className="font-mono text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">{(v as string)?.slice(0, 14)}…</span>
    )},
    { key: 'student_name', label: 'Student Name', sortable: true, render: (_: unknown, row: Schedule) => (
      <div>
        <p className="font-medium">{row.student_name || '—'}</p>
        <p className="text-xs text-gray-400 font-mono">{row.student_id}</p>
      </div>
    )},
    { key: 'sort_id', label: 'Sort ID', render: (v: unknown) => (
      <span className="text-sm text-gray-600">{v != null ? String(v) : '—'}</span>
    )},
    { key: 'year', label: 'Year', render: (v: unknown) => <span className="text-sm">{v as string || '—'}</span> },
    { key: 'day', label: 'Day' },
    { key: 'tutor_name', label: 'Tutor', sortable: true, render: (_: unknown, row: Schedule) => (
      <div>
        <p className="font-medium">{row.tutor_name || '—'}</p>
        <p className="text-xs text-gray-400 font-mono">{row.tutor_id}</p>
      </div>
    )},
    { key: 'course_name', label: 'Course', render: (_: unknown, row: Schedule) => (
      <div>
        <p className="font-medium">{row.course_name || '—'}</p>
        <span className="font-mono text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded">{row.course_code}</span>
      </div>
    )},
    { key: 'session_start_time', label: 'Time', render: (_: unknown, row: Schedule) =>
      <span className="text-sm">{formatTime(row.session_start_time)} – {formatTime(row.session_end_time)}</span>
    },
    { key: 'duration', label: 'Duration', render: (v: unknown) => v ? `${v} min` : '—' },
    { key: 'time_zone', label: 'Time Zone', render: (v: unknown) => <span className="text-xs text-gray-600">{v as string || '—'}</span> },
    { key: 'zoom_link', label: 'Zoom', render: (v: unknown) => v ? (
      <a href={v as string} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs">
        <Video size={12} /> Join
      </a>
    ) : <span className="text-gray-400 text-xs">—</span> },
    { key: 'assign_status', label: 'Status', render: (v: unknown) =>
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${v === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{v as string || '—'}</span>
    },
  ];

  return (
    <DashboardLayout title="Schedules">
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Schedules</h2>
            <p className="text-gray-500 text-sm mt-0.5">{schedules.length} schedules</p>
          </div>
          <div className="flex gap-2">
            <Button icon={CalendarDays} variant="secondary" onClick={() => setTimetableOpen(true)}>Timetable</Button>
            {schedules.length > 0 && (
              <Button variant="danger" icon={Trash2} onClick={() => setDeleteAllOpen(true)}>Delete All</Button>
            )}
            <Button icon={Plus} onClick={openCreate}>Create Schedule</Button>
          </div>
        </div>

        <DataTable data={schedules} columns={columns} loading={loading}
          searchKeys={['student_name', 'tutor_name', 'course_name', 'day']}
          emptyMessage="No schedules created yet"
          actions={(row) => (
            <>
              <Link href={`/admin/schedules/${row.schedule_id}`}>
                <span className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors inline-flex"><Eye size={15} /></span>
              </Link>
              <button onClick={() => openEdit(row)}
                className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors"><Edit size={15} /></button>
              <button onClick={() => handleDelete(row.schedule_id)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors"><Trash2 size={15} /></button>
            </>
          )}
        />
      </div>

      <TimetableDrawer
        open={timetableOpen}
        onClose={() => setTimetableOpen(false)}
        schedules={schedules}
      />

      {/* Delete All confirmation modal */}
      <Modal isOpen={deleteAllOpen} onClose={() => setDeleteAllOpen(false)} title="Delete All Schedules" size="sm">
        <div className="space-y-4">
          <p className="text-gray-600 text-sm">
            This will permanently delete all <strong>{schedules.length}</strong> schedule{schedules.length !== 1 ? 's' : ''}.
            This action cannot be undone.
          </p>
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" onClick={() => setDeleteAllOpen(false)}>Cancel</Button>
            <Button variant="danger" loading={deletingAll} onClick={handleDeleteAll}>Delete All</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditingSchedule(null); setForm(emptyForm); }}
        title={editingSchedule ? 'Edit Schedule' : 'Create Schedule'} size="2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Student — enrolled students only */}
            <FormField label="Student" required>
              <Select value={form.student_id} onChange={e => handleStudentChange(e.target.value)} required>
                <option value="">Select Student</option>
                {enrolledStudents.map(e => (
                  <option key={e.student_id} value={e.student_id}>{e.student_name}</option>
                ))}
              </Select>
            </FormField>

            {/* Tutor — only tutors assigned to the selected student */}
            <FormField label="Tutor" required>
              <Select
                value={form.tutor_id}
                onChange={e => handleTutorChange(e.target.value)}
                required
                disabled={!form.student_id}
              >
                <option value="">{form.student_id ? 'Select Tutor' : 'Select a student first'}</option>
                {studentTutors.map(e => (
                  <option key={e.tutor_id} value={e.tutor_id}>{e.tutor_name}</option>
                ))}
              </Select>
            </FormField>

            {/* Course — only courses the selected tutor teaches the selected student */}
            <FormField label="Course" required>
              <Select
                value={form.course_id}
                onChange={e => handleCourseChange(e.target.value)}
                required
                disabled={!form.tutor_id}
              >
                <option value="">{form.tutor_id ? 'Select Course' : 'Select a tutor first'}</option>
                {tutorCourses.map(a => (
                  <option key={a.tutor_assign_id} value={a.course_id}>{a.course_name} ({a.course_code})</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Year">
              <Input value={form.year} onChange={e => setForm({...form, year: e.target.value})} />
            </FormField>
            <FormField label="Day" required>
              <Select value={form.day} onChange={e => setForm({...form, day: e.target.value})} required>
                <option value="">Select Day</option>
                {DAYS_OF_WEEK.map(d => <option key={d}>{d}</option>)}
              </Select>
            </FormField>
            <FormField label="Duration (minutes)">
              <Input type="number" value={form.duration} onChange={e => setForm({...form, duration: e.target.value})} />
            </FormField>
            <FormField label="Start Time" required>
              <Input type="time" value={form.session_start_time} onChange={e => setForm({...form, session_start_time: e.target.value})} required />
            </FormField>
            <FormField label="End Time" required>
              <Input type="time" value={form.session_end_time} onChange={e => setForm({...form, session_end_time: e.target.value})} required />
            </FormField>
            <FormField label="Time Zone">
              <Select value={form.time_zone} onChange={e => setForm({...form, time_zone: e.target.value})}>
                {TIMEZONES.map(tz => <option key={tz}>{tz}</option>)}
              </Select>
            </FormField>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-semibold text-sm text-gray-700 mb-3">Zoom Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="Zoom Link" className="sm:col-span-3">
                <Input value={form.zoom_link} onChange={e => setForm({...form, zoom_link: e.target.value})} placeholder="https://zoom.us/j/..." />
              </FormField>
              <FormField label="Meeting ID">
                <Input value={form.meeting_id} onChange={e => setForm({...form, meeting_id: e.target.value})} />
              </FormField>
              <FormField label="Passcode">
                <Input value={form.meeting_passcode} onChange={e => setForm({...form, meeting_passcode: e.target.value})} />
              </FormField>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setModalOpen(false); setEditingSchedule(null); setForm(emptyForm); }}>Cancel</Button>
            <Button type="submit" loading={submitting}>{editingSchedule ? 'Update' : 'Create Schedule'}</Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
