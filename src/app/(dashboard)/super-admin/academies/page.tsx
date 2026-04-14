'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Building2, Plus, RefreshCw, X, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Academy {
  id: number;
  academy_id: string;
  academy_name: string;
  academy_email: string;
  academy_description: string;
  is_active: boolean;
  member_count: number;
  created_at: string;
}

interface CreateForm {
  academy_name: string;
  academy_email: string;
  academy_description: string;
}

export default function AcademiesPage() {
  const [academies, setAcademies] = useState<Academy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [switching, setSwitching] = useState<number | null>(null);
  const [form, setForm] = useState<CreateForm>({ academy_name: '', academy_email: '', academy_description: '' });

  const load = () => {
    setLoading(true);
    fetch('/api/super-admin/academies')
      .then(r => r.json())
      .then(data => setAcademies(data.academies || []))
      .catch(() => toast.error('Failed to load academies'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.academy_name.trim()) return toast.error('Academy name is required');
    setCreating(true);
    try {
      const res = await fetch('/api/super-admin/academies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Create failed');
      toast.success(`Academy "${data.academy.academy_name}" created!`);
      setShowCreate(false);
      setForm({ academy_name: '', academy_email: '', academy_description: '' });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setCreating(false);
    }
  };

  const switchAcademy = async (academyId: number, academyName: string) => {
    setSwitching(academyId);
    try {
      const res = await fetch('/api/super-admin/switch-academy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ academy_id: academyId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Switch failed');
      toast.success(`Switched to ${academyName}`);
      window.location.href = '/admin';
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Switch failed');
    } finally {
      setSwitching(null);
    }
  };

  return (
    <DashboardLayout title="Manage Academies">
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Academies</h1>
            <p className="text-sm text-gray-500 mt-0.5">Onboard and manage tutoring academies</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors text-sm"
          >
            <Plus size={16} />
            New Academy
          </button>
        </div>

        {/* Create Modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Create New Academy</h2>
                <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Academy Name *</label>
                  <input
                    type="text"
                    value={form.academy_name}
                    onChange={e => setForm(f => ({ ...f, academy_name: e.target.value }))}
                    required
                    placeholder="e.g. Bright Minds Academy"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Email</label>
                  <input
                    type="email"
                    value={form.academy_email}
                    onChange={e => setForm(f => ({ ...f, academy_email: e.target.value }))}
                    placeholder="info@academy.com"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                  <textarea
                    value={form.academy_description}
                    onChange={e => setForm(f => ({ ...f, academy_description: e.target.value }))}
                    rows={3}
                    placeholder="Brief description..."
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="flex-1 border border-gray-300 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {creating && <RefreshCw size={14} className="animate-spin" />}
                    {creating ? 'Creating...' : 'Create Academy'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-600 font-medium">{academies.length} academ{academies.length === 1 ? 'y' : 'ies'}</p>
            {loading && <RefreshCw size={15} className="animate-spin text-gray-400" />}
          </div>

          {academies.length === 0 && !loading ? (
            <div className="text-center py-16 text-gray-400">
              <Building2 size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">No academies yet</p>
              <p className="text-sm mt-1">Click &quot;New Academy&quot; to get started</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {academies.map(a => (
                <div key={a.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Building2 size={18} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 truncate">{a.academy_name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        a.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {a.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                      <span className="font-mono">{a.academy_id}</span>
                      {a.academy_email && <span>· {a.academy_email}</span>}
                      <span>· {a.member_count} member{a.member_count !== 1 ? 's' : ''}</span>
                    </div>
                    {a.academy_description && (
                      <p className="text-sm text-gray-500 mt-0.5 truncate">{a.academy_description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => switchAcademy(a.id, a.academy_name)}
                    disabled={switching === a.id}
                    className="flex items-center gap-1.5 text-xs bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 font-medium whitespace-nowrap"
                  >
                    {switching === a.id ? (
                      <RefreshCw size={12} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={12} />
                    )}
                    Switch to
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
