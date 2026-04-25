'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  ArrowLeft, User, GraduationCap, BookOpen,
  Calendar, Clock, Globe, Link2, FileText, CheckCircle, AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Activity {
  record_id: number; ssid: string; tutor_id: string; tutor_firstname: string; tutor_lastname: string;
  student_id: string; student_name: string; course_name: string; course_id_ref: string;
  class_activity_date: string; class_activity_time: string;
  topic_taught: string; details_of_class_activity: string; activity: string;
  session_code_status: string; mothers_email: string; fathers_email: string;
  assigned_homework_from_prev: string; status_of_past_homework_review: string;
  new_homework_assigned: string; topic_of_homework: string; no_homework_why: string;
  did_student_complete_prev_homework: string; homework1: string; homework2: string; homework3: string;
  student_reason_for_not_completing: string;
  did_student_join_on_time: string; punctuality1: string; punctuality2: string; student_reason_for_late: string;
  is_student_attentive: string; attentiveness1: string; attentiveness2: string; attentiveness3: string;
  student_engages_in_class: string; class_engagement1: string; class_engagement2: string; class_engagement3: string;
  tutors_general_observation: string; tutors_intervention: string;
  helpful_link1: string; helpful_link2: string; helpful_link3: string;
}

function InfoCard({ icon: Icon, label, value, mono = false }: {
  icon: React.ElementType; label: string; value?: string | number | boolean | null; mono?: boolean;
}) {
  const display = value != null && value !== '' && value !== false ? String(value) : null;
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={15} className="text-slate-500" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <p className={`text-sm font-medium text-gray-900 break-words ${mono ? 'font-mono' : ''}`}>
          {display ?? <span className="text-gray-400 font-normal">—</span>}
        </p>
      </div>
    </div>
  );
}

function YesNoBadge({ label, value }: { label: string; value: string | null | undefined }) {
  const cls = value === 'Yes' ? 'bg-green-100 text-green-700'
    : value === 'No' ? 'bg-red-100 text-red-700'
    : 'bg-gray-100 text-gray-500';
  return (
    <div className="flex items-center gap-2">
      {value === 'Yes'
        ? <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
        : <AlertCircle size={14} className="text-gray-400 flex-shrink-0" />}
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${cls}`}>{value || '—'}</span>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">{children}</h2>;
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">{children}</div>;
}

function formatDate(val?: string | null) {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? val : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function TutorActivityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/activities/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.activity) setActivity(data.activity);
        else { toast.error('Activity not found'); router.push('/tutor/sessions'); }
      })
      .catch(() => { toast.error('Failed to load activity'); router.push('/tutor/sessions'); })
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading) {
    return (
      <DashboardLayout title="Activity Detail">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!activity) return null;

  const hasLinks = activity.helpful_link1 || activity.helpful_link2 || activity.helpful_link3;

  return (
    <DashboardLayout title="Activity Detail">
      <div className="max-w-4xl mx-auto space-y-5">

        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/tutor/sessions')}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Class Activity</h1>
            <p className="text-xs text-gray-400 font-mono mt-0.5">#{activity.record_id}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          <Card>
            <SectionTitle>Student</SectionTitle>
            <div className="space-y-4">
              <InfoCard icon={User}     label="Student Name" value={activity.student_name} />
              <InfoCard icon={User}     label="Student ID"   value={activity.student_id} mono />
            </div>
          </Card>

          <Card>
            <SectionTitle>Tutor</SectionTitle>
            <div className="space-y-4">
              <InfoCard icon={GraduationCap} label="Tutor Name"
                value={[activity.tutor_firstname, activity.tutor_lastname].filter(Boolean).join(' ')} />
            </div>
          </Card>

          <Card>
            <SectionTitle>Course & Session</SectionTitle>
            <div className="space-y-4">
              <InfoCard icon={BookOpen} label="Course"         value={activity.course_name} />
              <InfoCard icon={Calendar} label="Activity Date"  value={formatDate(activity.class_activity_date)} />
              <InfoCard icon={Clock}    label="Activity Time"  value={activity.class_activity_time} />
            </div>
          </Card>

          <Card>
            <SectionTitle>Class Details</SectionTitle>
            <div className="space-y-4">
              <InfoCard icon={FileText} label="Topic Taught"              value={activity.topic_taught} />
              <InfoCard icon={FileText} label="Activity Type"             value={activity.activity} />
              <InfoCard icon={FileText} label="Details of Class Activity" value={activity.details_of_class_activity} />
            </div>
          </Card>

        </div>

        <Card>
          <SectionTitle>Homework</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <InfoCard icon={FileText} label="Did Student Complete Prev. Homework?" value={activity.did_student_complete_prev_homework} />
            <InfoCard icon={FileText} label="Student Reason for Not Completing"   value={activity.student_reason_for_not_completing} />
            <InfoCard icon={FileText} label="New Homework Assigned?"  value={activity.new_homework_assigned} />
            <InfoCard icon={FileText} label="Topic of Homework"       value={activity.topic_of_homework} />
            <div className="space-y-2">
              <p className="text-xs text-gray-400">Homework Items</p>
              {[activity.homework1, activity.homework2, activity.homework3].filter(Boolean).length > 0
                ? [activity.homework1, activity.homework2, activity.homework3].filter(Boolean).map((hw, i) => (
                    <p key={i} className="text-sm font-medium text-gray-900">{hw}</p>
                  ))
                : <p className="text-sm text-gray-400">—</p>}
            </div>
          </div>
        </Card>

        <Card>
          <SectionTitle>Student Assessment</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-5">
            <YesNoBadge label="Joined on Time?"     value={activity.did_student_join_on_time} />
            <YesNoBadge label="Attentive in Class?" value={activity.is_student_attentive} />
            <YesNoBadge label="Engaged in Class?"   value={activity.student_engages_in_class} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <InfoCard icon={Globe} label="Punctuality"       value={activity.punctuality1} />
            <InfoCard icon={Globe} label="Attentiveness"     value={activity.attentiveness1} />
            <InfoCard icon={Globe} label="Class Engagement"  value={activity.class_engagement1} />
            <InfoCard icon={Globe} label="Student Reason for Late" value={activity.student_reason_for_late} />
          </div>
        </Card>

        <Card>
          <SectionTitle>Tutor&apos;s Notes</SectionTitle>
          <div className="space-y-4">
            <InfoCard icon={FileText} label="General Observation"   value={activity.tutors_general_observation} />
            <InfoCard icon={FileText} label="Intervention / Action" value={activity.tutors_intervention} />
            {hasLinks && (
              <div>
                <p className="text-xs text-gray-400 mb-2">Helpful Links</p>
                <div className="space-y-2">
                  {[activity.helpful_link1, activity.helpful_link2, activity.helpful_link3].filter(Boolean).map((link, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Link2 size={13} className="text-blue-500 flex-shrink-0" />
                      <a href={link} target="_blank" rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline break-all">{link}</a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

      </div>
    </DashboardLayout>
  );
}
