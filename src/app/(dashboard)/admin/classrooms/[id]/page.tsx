'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Button from '@/components/ui/Button';
import { statusBadge } from '@/components/ui/Badge';
import { ArrowLeft, Monitor, Link2, Hash, Lock, User, Calendar, Globe, Key, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

interface Classroom {
  record_id: number;
  classroom_id: string;
  room_name: string;
  link: string;
  meeting_id: string;
  passcode: string;
  assigned_to: string;
  user_id: string;
  entry_status: string;
  ip: string;
  record_key: string;
  created_by: string;
  updated_by: string;
  timestamp: string;
  last_updated: string;
}

function InfoCard({ icon: Icon, label, value, mono = false, copiable = false }: {
  icon: React.ElementType; label: string; value?: string | null; mono?: boolean; copiable?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={15} className="text-slate-500" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <div className="flex items-center gap-2">
          <p className={`text-sm font-medium text-gray-900 break-all ${mono ? 'font-mono' : ''}`}>
            {value ? value : <span className="text-gray-400 font-normal">—</span>}
          </p>
          {copiable && value && (
            <button
              onClick={() => { navigator.clipboard.writeText(value); toast.success('Copied!'); }}
              className="p-0.5 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
            >
              <Copy size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 ${className}`}>{children}</div>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">{children}</h2>;
}

export default function ClassroomDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/classrooms/${id}`)
      .then(r => r.json())
      .then(data => { setClassroom(data.classroom || null); setLoading(false); })
      .catch(() => { toast.error('Failed to load classroom'); setLoading(false); });
  }, [id]);

  if (loading) {
    return (
      <DashboardLayout title="Classroom Details">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!classroom) {
    return (
      <DashboardLayout title="Classroom Details">
        <div className="text-center py-20 text-gray-500">Classroom not found.</div>
      </DashboardLayout>
    );
  }

  const fmt = (d?: string | null) => d ? new Date(d).toLocaleString() : '—';

  return (
    <DashboardLayout title="Classroom Details">
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="secondary" icon={ArrowLeft} onClick={() => router.push('/admin/classrooms')}>
            Back
          </Button>
        </div>

        {/* Identity card */}
        <Card>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center flex-shrink-0">
              <Monitor size={26} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 truncate">{classroom.room_name || '—'}</h1>
              <p className="text-sm font-mono text-blue-700 bg-blue-50 inline-block px-2 py-0.5 rounded mt-1">
                {classroom.classroom_id}
              </p>
            </div>
            <div>{statusBadge(classroom.entry_status)}</div>
          </div>
        </Card>

        {/* Meeting details */}
        <Card>
          <SectionTitle>Meeting Details</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <InfoCard icon={Hash}  label="Meeting ID"  value={classroom.meeting_id}  mono copiable />
            <InfoCard icon={Lock}  label="Passcode"    value={classroom.passcode}    mono copiable />
          </div>
          {classroom.link && (
            <div className="mt-5 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-2">Join Link</p>
              <a
                href={classroom.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-600 hover:underline text-sm break-all"
              >
                <Link2 size={14} className="flex-shrink-0" />
                {classroom.link}
              </a>
            </div>
          )}
        </Card>

        {/* Assignment */}
        <Card>
          <SectionTitle>Assignment</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <InfoCard icon={User}   label="Assigned To" value={classroom.assigned_to} />
            <InfoCard icon={User}   label="User ID"     value={classroom.user_id} mono />
          </div>
        </Card>

        {/* Record metadata */}
        <Card>
          <SectionTitle>Record Info</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <InfoCard icon={Calendar} label="Created"     value={fmt(classroom.timestamp)} />
            <InfoCard icon={Calendar} label="Last Updated" value={fmt(classroom.last_updated)} />
            <InfoCard icon={User}     label="Created By"  value={classroom.created_by} />
            <InfoCard icon={User}     label="Updated By"  value={classroom.updated_by} />
            <InfoCard icon={Globe}    label="IP"          value={classroom.ip} mono />
            <InfoCard icon={Key}      label="Record Key"  value={classroom.record_key} mono />
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
