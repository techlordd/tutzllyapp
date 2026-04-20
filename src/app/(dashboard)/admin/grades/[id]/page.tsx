'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Button from '@/components/ui/Button';
import { statusBadge } from '@/components/ui/Badge';
import {
  ArrowLeft, Edit, User, GraduationCap, BookOpen,
  Calendar, Hash, Globe, Key, FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Grade {
  record_id: number; user_id: string;
  tutor_id: string; tutor_name: string;
  student_id: string; student_name: string;
  course_name: string; course_id_ref: string;
  month: string; year: string;
  punctuality: number; attentiveness: number; engagement: number;
  homework: number; test_score: number;
  remarks: string; grade_code_status: string; status: string;
  entry_status: string; timestamp: string; last_updated: string;
  created_by: string; updated_by: string; ip: string; record_key: string;
}

function InfoCard({ icon: Icon, label, value, mono = false }: {
  icon: React.ElementType; label: string; value?: string | number | null; mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={15} className="text-slate-500" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <p className={`text-sm font-medium text-gray-900 break-all ${mono ? 'font-mono' : ''}`}>
          {value != null && value !== '' ? value : <span className="text-gray-400 font-normal">—</span>}
        </p>
      </div>
    </div>
  );
}

function ScoreCard({ label, value }: { label: string; value: number | null }) {
  const pct = value ?? null;
  const color = pct == null ? 'text-gray-400'
    : pct >= 90 ? 'text-emerald-600'
    : pct >= 80 ? 'text-green-600'
    : pct >= 70 ? 'text-blue-600'
    : pct >= 60 ? 'text-amber-600'
    : pct >= 50 ? 'text-orange-600'
    : 'text-red-600';
  return (
    <div className="bg-gray-50 rounded-xl p-4 text-center">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{pct != null ? `${pct}%` : '—'}</p>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">{children}</h2>;
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">{children}</div>;
}

function getGradeLetter(avg: number) {
  if (avg >= 90) return { letter: 'A+', color: 'text-emerald-600' };
  if (avg >= 80) return { letter: 'A',  color: 'text-green-600' };
  if (avg >= 70) return { letter: 'B',  color: 'text-blue-600' };
  if (avg >= 60) return { letter: 'C',  color: 'text-amber-600' };
  if (avg >= 50) return { letter: 'D',  color: 'text-orange-600' };
  return { letter: 'F', color: 'text-red-600' };
}

export default function GradeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [grade, setGrade] = useState<Grade | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/grades/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.grade) setGrade(data.grade);
        else { toast.error('Grade entry not found'); router.push('/admin/grades'); }
      })
      .catch(() => { toast.error('Failed to load grade entry'); router.push('/admin/grades'); })
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading) {
    return (
      <DashboardLayout title="Grade Detail">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!grade) return null;

  const scores = [grade.punctuality, grade.attentiveness, grade.engagement, grade.homework, grade.test_score]
    .map(v => parseFloat(String(v ?? '')))
    .filter(v => !isNaN(v) && v > 0);
  const avg = scores.length ? parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)) : 0;
  const gradeLetter = getGradeLetter(avg);

  return (
    <DashboardLayout title="Grade Detail">
      <div className="max-w-4xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/admin/grades')}
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Grade Entry</h1>
              <p className="text-xs text-gray-400 font-mono mt-0.5">#{grade.record_id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {statusBadge(grade.status)}
            <Button icon={Edit} variant="secondary"
              onClick={() => router.push(`/admin/grades?edit=${grade.record_id}`)}>
              Edit
            </Button>
          </div>
        </div>

        {/* Grade summary banner */}
        <Card>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="text-center">
              <p className="text-xs text-gray-400 mb-1">Overall Grade</p>
              <span className={`text-6xl font-black ${gradeLetter.color}`}>{gradeLetter.letter}</span>
              <p className="text-sm text-gray-500 mt-1">{avg}% average</p>
            </div>
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3 w-full">
              <InfoCard icon={User}     label="Student"  value={grade.student_name} />
              <InfoCard icon={GraduationCap} label="Tutor" value={grade.tutor_name} />
              <InfoCard icon={BookOpen} label="Course"   value={grade.course_name} />
              <InfoCard icon={Calendar} label="Period"   value={`${grade.month} ${grade.year}`} />
              <InfoCard icon={Globe}    label="Grade Code Status" value={grade.grade_code_status} />
            </div>
          </div>
        </Card>

        {/* Scores */}
        <Card>
          <SectionTitle>Scores</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <ScoreCard label="Punctuality"   value={grade.punctuality} />
            <ScoreCard label="Attentiveness" value={grade.attentiveness} />
            <ScoreCard label="Engagement"    value={grade.engagement} />
            <ScoreCard label="Homework"      value={grade.homework} />
            <ScoreCard label="Test Score"    value={grade.test_score} />
          </div>
        </Card>

        {grade.remarks && (
          <Card>
            <SectionTitle>Remarks</SectionTitle>
            <p className="text-sm text-gray-700 leading-relaxed">{grade.remarks}</p>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Student & Tutor */}
          <Card>
            <SectionTitle>Participants</SectionTitle>
            <div className="space-y-4">
              <InfoCard icon={User}          label="Student Name" value={grade.student_name} />
              <InfoCard icon={Hash}          label="Student ID"   value={grade.student_id} mono />
              <InfoCard icon={GraduationCap} label="Tutor Name"   value={grade.tutor_name} />
              <InfoCard icon={Hash}          label="Tutor ID"     value={grade.tutor_id} mono />
              <InfoCard icon={Hash}          label="User ID"      value={grade.user_id} mono />
            </div>
          </Card>

          {/* Course */}
          <Card>
            <SectionTitle>Course & Period</SectionTitle>
            <div className="space-y-4">
              <InfoCard icon={BookOpen}  label="Course"      value={grade.course_name} />
              <InfoCard icon={Hash}      label="Course ID"   value={grade.course_id_ref} mono />
              <InfoCard icon={Calendar}  label="Month"       value={grade.month} />
              <InfoCard icon={Calendar}  label="Year"        value={grade.year} />
              <InfoCard icon={FileText}  label="Grade Code Status" value={grade.grade_code_status} />
            </div>
          </Card>

        </div>

        {/* Record Info */}
        <Card>
          <SectionTitle>Record Info</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <InfoCard icon={Hash}     label="Record ID"    value={grade.record_id} mono />
            <InfoCard icon={Globe}    label="Entry Status" value={grade.entry_status} />
            <InfoCard icon={Calendar} label="Timestamp"    value={grade.timestamp ? new Date(grade.timestamp).toLocaleString() : null} />
            <InfoCard icon={Calendar} label="Last Updated" value={grade.last_updated ? new Date(grade.last_updated).toLocaleString() : null} />
            <InfoCard icon={User}     label="Created By"   value={grade.created_by} />
            <InfoCard icon={User}     label="Updated By"   value={grade.updated_by} />
            <InfoCard icon={Globe}    label="IP"           value={grade.ip} />
            <InfoCard icon={Key}      label="Key"          value={grade.record_key} mono />
          </div>
        </Card>

      </div>
    </DashboardLayout>
  );
}
