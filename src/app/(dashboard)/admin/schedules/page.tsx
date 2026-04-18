'use client';
import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import FormField, { Input, Select } from '@/components/ui/FormField';
import Link from 'next/link';
import { Plus, Edit, Trash2, Video, Eye } from 'lucide-react';
import { DAYS_OF_WEEK, TIMEZONES, formatTime } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Schedule {
  schedule_id: string; student_name: string; student_id: string;
  tutor_name: string; tutor_id: string; tutor_email: string; course_name: string;
  course_id: number; course_code: string;
  day: string; session_start_time: string; session_end_time: string;
  duration: number; zoom_link: string; meeting_id: string; meeting_passcode: string;
  time_zone: string; assign_status: string; year: string;
}

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [students, setStudents] = useState<{student_id: string; firstname: string; surname: string; email: string}[]>([]);
  const [tutors, setTutors] = useState<{tutor_id: string; firstname: string; surname: string; email: string}[]>([]);
  const [courses, setCourses] = useState<{id: number; course_name: string; course_code: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    student_id: '', student_name: '', tutor_id: '', tutor_name: '', tutor_email: '',
    course_id: '', course_name: '', course_code: '', year: new Date().getFullYear().toString(),
    day: '', duration: '60', session_start_time: '', session_end_time: '',
    time_zone: 'WAT (Africa/Lagos)', zoom_link: '', meeting_id: '', meeting_passcode: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [schRes, stuRes, tutRes, courRes] = await Promise.all([
        fetch('/api/schedules'), fetch('/api/students'), fetch('/api/tutors'), fetch('/api/courses')
      ]);
      const [schData, stuData, tutData, courData] = await Promise.all([schRes.json(), stuRes.json(), tutRes.json(), courRes.json()]);
      setSchedules(schData.schedules || []);
      setStudents(stuData.students || []);
      setTutors(tutData.tutors || []);
      setCourses(courData.courses || []);
    } catch { toast.error('Failed to load data'); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStudentChange = (studentId: string) => {
    const s = students.find(s => s.student_id === studentId);
    setForm(f => ({ ...f, student_id: studentId, student_name: s ? `${s.firstname} ${s.surname}` : '' }));
  };

  const handleTutorChange = (tutorId: string) => {
    const t = tutors.find(t => t.tutor_id === tutorId);
    setForm(f => ({ ...f, tutor_id: tutorId, tutor_name: t ? `${t.firstname} ${t.surname}` : '', tutor_email: t?.email || '' }));
  };

  const handleCourseChange = (courseId: string) => {
    const c = courses.find(c => c.id === parseInt(courseId));
    setForm(f => ({ ...f, course_id: courseId, course_name: c?.course_name || '', course_code: c?.course_code || '' }));
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
      fetchData();
    } catch { toast.error('Failed to save schedule'); }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this schedule?')) return;
    try {
      await fetch(`/api/schedules/${id}`, { method: 'DELETE' });
      toast.success('Schedule deleted');
      fetchData();
    } catch { toast.error('Failed to delete'); }
  };

  const columns = [
    { key: 'student_name', label: 'Student', sortable: true },
    { key: 'tutor_name', label: 'Tutor', sortable: true },
    { key: 'course_name', label: 'Course' },
    { key: 'day', label: 'Day' },
    { key: 'session_start_time', label: 'Time', render: (_: unknown, row: Schedule) =>
      <span className="text-sm">{formatTime(row.session_start_time)} – {formatTime(row.session_end_time)}</span>
    },
    { key: 'duration', label: 'Duration', render: (v: unknown) => `${v} min` },
    { key: 'zoom_link', label: 'Zoom', render: (v: unknown) => v ? (
      <a href={v as string} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs">
        <Video size={12} /> Join
      </a>
    ) : <span className="text-gray-400 text-xs">—</span> },
    { key: 'assign_status', label: 'Status', render: (v: unknown) =>
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${v === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{v as string}</span>
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
          <Button icon={Plus} onClick={() => { setEditingSchedule(null); setModalOpen(true); }}>
            Create Schedule
          </Button>
        </div>

        <DataTable data={schedules} columns={columns} loading={loading}
          searchKeys={['student_name', 'tutor_name', 'course_name', 'day']}
          emptyMessage="No schedules created yet"
          actions={(row) => (
            <>
              <Link href={`/admin/schedules/${row.schedule_id}`}>
                <span className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors inline-flex"><Eye size={15} /></span>
              </Link>
              <button onClick={() => { setEditingSchedule(row); setForm({...form, ...row, course_id: String(row.course_id), duration: String(row.duration) }); setModalOpen(true); }}
                className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors"><Edit size={15} /></button>
              <button onClick={() => handleDelete(row.schedule_id)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors"><Trash2 size={15} /></button>
            </>
          )}
        />
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingSchedule ? 'Edit Schedule' : 'Create Schedule'} size="2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Student" required>
              <Select value={form.student_id} onChange={e => handleStudentChange(e.target.value)} required>
                <option value="">Select Student</option>
                {students.map(s => <option key={s.student_id} value={s.student_id}>{s.firstname} {s.surname}</option>)}
              </Select>
            </FormField>
            <FormField label="Tutor" required>
              <Select value={form.tutor_id} onChange={e => handleTutorChange(e.target.value)} required>
                <option value="">Select Tutor</option>
                {tutors.map(t => <option key={t.tutor_id} value={t.tutor_id}>{t.firstname} {t.surname}</option>)}
              </Select>
            </FormField>
            <FormField label="Course" required>
              <Select value={form.course_id} onChange={e => handleCourseChange(e.target.value)} required>
                <option value="">Select Course</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.course_name} ({c.course_code})</option>)}
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
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={submitting}>{editingSchedule ? 'Update' : 'Create Schedule'}</Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
