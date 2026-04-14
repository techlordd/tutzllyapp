'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Link from 'next/link';
import { Building2, Users, ShieldCheck, RefreshCw } from 'lucide-react';

interface AcademyStat {
  id: number;
  academy_id: string;
  academy_name: string;
  academy_email: string;
  is_active: boolean;
  member_count: number;
  created_at: string;
}

export default function SuperAdminPage() {
  const [academies, setAcademies] = useState<AcademyStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    fetch('/api/super-admin/academies')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => setAcademies(data.academies || []))
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, []);

  const totalMembers = academies.reduce((sum, a) => sum + (a.member_count || 0), 0);
  const activeCount = academies.filter(a => a.is_active).length;

  return (
    <DashboardLayout title="Super Admin">
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <ShieldCheck size={20} className="text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Super Admin</h1>
              <p className="text-sm text-gray-500">Manage all academies on the platform</p>
            </div>
          </div>
          <Link
            href="/super-admin/academies"
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors text-sm"
          >
            <Building2 size={16} />
            Manage Academies
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Academies', value: academies.length, icon: Building2, color: 'bg-blue-50 text-blue-600' },
            { label: 'Active Academies', value: activeCount, icon: ShieldCheck, color: 'bg-green-50 text-green-600' },
            { label: 'Total Members', value: totalMembers, icon: Users, color: 'bg-purple-50 text-purple-600' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-200 p-6 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
                <Icon size={22} />
              </div>
              <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-2xl font-bold text-gray-900">{loading ? '—' : value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Academy List */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">All Academies</h2>
            {loading && <RefreshCw size={16} className="animate-spin text-gray-400" />}
          </div>
          {fetchError ? (
            <div className="text-center py-12 text-red-500 text-sm">
              Failed to load academies. Make sure you are logged in as a super admin.
            </div>
          ) : academies.length === 0 && !loading ? (
            <div className="text-center py-16 text-gray-400">
              <Building2 size={40} className="mx-auto mb-3 opacity-40" />
              <p>No academies yet</p>
              <Link href="/super-admin/academies" className="text-blue-600 text-sm mt-1 inline-block hover:underline">
                Create the first academy →
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-6 py-3 text-left">Academy</th>
                  <th className="px-6 py-3 text-left">ID</th>
                  <th className="px-6 py-3 text-left">Email</th>
                  <th className="px-6 py-3 text-right">Members</th>
                  <th className="px-6 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {academies.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{a.academy_name}</td>
                    <td className="px-6 py-4 font-mono text-gray-500 text-xs">{a.academy_id}</td>
                    <td className="px-6 py-4 text-gray-600">{a.academy_email || '—'}</td>
                    <td className="px-6 py-4 text-right text-gray-700">{a.member_count}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        a.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {a.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
