'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Building2, Plus, RefreshCw, X, CheckCircle2, Copy, KeyRound, ShieldAlert } from 'lucide-react';
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
  subdomain: string | null;
  custom_domain: string | null;
}

interface CreateForm {
  academy_name: string;
  academy_email: string;
  academy_description: string;
  subdomain: string;
  custom_domain: string;
  admin_email: string;
  admin_username: string;
  admin_password: string;
}

interface CreatedAdmin {
  email: string;
  username: string;
  password: string;
}

interface AdminUser {
  id: number;
  user_id: string;
  username: string;
  email: string;
  is_active: boolean;
}

export default function AcademiesPage() {
  const [academies, setAcademies] = useState<Academy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [switching, setSwitching] = useState<number | null>(null);
  const [createdAdmin, setCreatedAdmin] = useState<CreatedAdmin | null>(null);
  const [resetTarget, setResetTarget] = useState<Academy | null>(null);
  const [resetAdmins, setResetAdmins] = useState<AdminUser[]>([]);
  const [resetForm, setResetForm] = useState({ user_id: '', new_password: '' });
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState<CreatedAdmin | null>(null);
  const [form, setForm] = useState<CreateForm>({
    academy_name: '', academy_email: '', academy_description: '', subdomain: '', custom_domain: '',
    admin_email: '', admin_username: '', admin_password: '',
  });

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
      setForm({ academy_name: '', academy_email: '', academy_description: '', subdomain: '', custom_domain: '', admin_email: '', admin_username: '', admin_password: '' });
      if (data.adminUser) setCreatedAdmin(data.adminUser);
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

  const openReset = async (a: Academy) => {
    setResetTarget(a);
    setResetForm({ user_id: '', new_password: '' });
    setResetDone(null);
    const res = await fetch(`/api/super-admin/academies/${a.id}/admins`);
    const data = await res.json();
    setResetAdmins(data.admins || []);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget || !resetForm.user_id || !resetForm.new_password) return;
    setResetting(true);
    try {
      const res = await fetch(`/api/super-admin/academies/${resetTarget.id}/admins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resetForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reset failed');
      setResetDone({ email: data.email, username: data.username, password: resetForm.new_password });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setResetting(false);
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
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-6">
            <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
                <h2 className="font-semibold text-gray-900">Create New Academy</h2>
                <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleCreate} className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
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
                    rows={2}
                    placeholder="Brief description..."
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
                {/* Domain routing */}
                <div className="border-t border-gray-100 pt-4 space-y-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Domain Routing <span className="font-normal normal-case text-gray-400">(optional)</span></p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Subdomain</label>
                    <div className="flex items-center">
                      <input
                        type="text"
                        value={form.subdomain}
                        onChange={e => setForm(f => ({ ...f, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                        placeholder="brightminds"
                        className="flex-1 min-w-0 border border-gray-300 rounded-l-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="bg-gray-100 border border-l-0 border-gray-300 rounded-r-xl px-2 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                        .{process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'yourdomain.com'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Add wildcard *.{process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'yourdomain.com'} in Vercel → Domains</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Custom Domain</label>
                    <input
                      type="text"
                      value={form.custom_domain}
                      onChange={e => setForm(f => ({ ...f, custom_domain: e.target.value.toLowerCase() }))}
                      placeholder="portal.brightminds.com"
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">Academy adds <span className="font-mono">CNAME → cname.vercel-dns.com</span>, you add domain in Vercel</p>
                  </div>
                </div>
                {/* Admin Account */}
                <div className="border-t border-gray-100 pt-4 space-y-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                    <KeyRound size={12} /> Admin Login <span className="font-normal normal-case text-gray-400">(optional — creates admin account)</span>
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Admin Email</label>
                    <input
                      type="email"
                      value={form.admin_email}
                      onChange={e => setForm(f => ({ ...f, admin_email: e.target.value }))}
                      placeholder="admin@academy.com"
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
                      <input
                        type="text"
                        value={form.admin_username}
                        onChange={e => setForm(f => ({ ...f, admin_username: e.target.value }))}
                        placeholder="auto from email"
                        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                      <input
                        type="text"
                        value={form.admin_password}
                        onChange={e => setForm(f => ({ ...f, admin_password: e.target.value }))}
                        placeholder="Tutzlly@123"
                        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
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

        {/* Admin credentials reveal */}
        {createdAdmin && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <KeyRound size={16} className="text-green-600" /> Admin Credentials Created
                </h2>
                <button onClick={() => setCreatedAdmin(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-gray-500">Share these credentials with the academy admin. The password can be changed after first login.</p>
                {[
                  { label: 'Email', value: createdAdmin.email },
                  { label: 'Username', value: createdAdmin.username },
                  { label: 'Password', value: createdAdmin.password },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 mb-1">{label}</p>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-mono text-sm font-medium text-gray-900 break-all">{value}</p>
                      <button
                        onClick={() => { navigator.clipboard.writeText(value); toast.success(`${label} copied!`); }}
                        className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => setCreatedAdmin(null)}
                  className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors mt-2"
                >
                  Done
                </button>
              </div>
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
                    {(a.subdomain || a.custom_domain) && (
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {a.subdomain && (
                          <a
                            href={`https://${a.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'yourdomain.com'}/login`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-xs text-blue-600 font-mono hover:underline"
                          >
                            {a.subdomain}.{process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'yourdomain.com'}
                          </a>
                        )}
                        {a.custom_domain && (
                          <a
                            href={`https://${a.custom_domain}/login`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-xs text-emerald-600 font-mono hover:underline"
                          >
                            {a.custom_domain}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => openReset(a)}
                      className="flex items-center gap-1.5 text-xs bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors font-medium whitespace-nowrap"
                      title="Reset admin password"
                    >
                      <KeyRound size={12} /> Reset Password
                    </button>
                    <button
                      onClick={() => switchAcademy(a.id, a.academy_name)}
                      disabled={switching === a.id}
                      className="flex items-center gap-1.5 text-xs bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 font-medium whitespace-nowrap"
                    >
                      {switching === a.id ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                      Switch to
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reset Password Modal */}
      {resetTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <ShieldAlert size={16} className="text-amber-500" /> Reset Admin Password
              </h2>
              <button onClick={() => { setResetTarget(null); setResetDone(null); }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            {resetDone ? (
              <div className="p-6 space-y-4">
                <p className="text-sm text-gray-500">Password reset successfully. Share these updated credentials:</p>
                {[
                  { label: 'Email', value: resetDone.email },
                  { label: 'Username', value: resetDone.username },
                  { label: 'New Password', value: resetDone.password },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 mb-1">{label}</p>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-mono text-sm font-medium text-gray-900 break-all">{value}</p>
                      <button
                        onClick={() => { navigator.clipboard.writeText(value); toast.success(`${label} copied!`); }}
                        className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                <button onClick={() => { setResetTarget(null); setResetDone(null); }}
                  className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleReset} className="p-6 space-y-4">
                <p className="text-sm text-gray-500">
                  Resetting password for <strong>{resetTarget.academy_name}</strong>
                </p>
                {resetAdmins.length === 0 ? (
                  <div className="bg-amber-50 text-amber-700 rounded-xl p-3 text-sm">
                    No admin accounts found for this academy. Create one when adding the academy.
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Admin</label>
                      <select
                        value={resetForm.user_id}
                        onChange={e => setResetForm(f => ({ ...f, user_id: e.target.value }))}
                        required
                        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Choose admin account</option>
                        {resetAdmins.map(u => (
                          <option key={u.id} value={u.id}>{u.username} — {u.email}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                      <input
                        type="text"
                        value={resetForm.new_password}
                        onChange={e => setResetForm(f => ({ ...f, new_password: e.target.value }))}
                        required
                        placeholder="Enter new password"
                        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex gap-3 pt-1">
                      <button type="button" onClick={() => { setResetTarget(null); setResetDone(null); }}
                        className="flex-1 border border-gray-300 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                        Cancel
                      </button>
                      <button type="submit" disabled={resetting}
                        className="flex-1 bg-amber-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                        {resetting && <RefreshCw size={14} className="animate-spin" />}
                        {resetting ? 'Resetting…' : 'Reset Password'}
                      </button>
                    </div>
                  </>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
