'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/store/authStore';
import { Palette, Save, RefreshCw, ExternalLink, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

interface BrandingForm {
  academy_name: string;
  site_title: string;
  academy_email: string;
  academy_description: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  logo_url: string;
  favicon_url: string;
  login_bg_url: string;
  login_tagline: string;
  subdomain: string;
  custom_domain: string;
  smtp_host: string;
  smtp_port: string;
  smtp_username: string;
  smtp_password: string;
  smtp_from_name: string;
  smtp_from_email: string;
  smtp_encryption: string;
}

const DEFAULT_BRANDING: BrandingForm = {
  academy_name: '',
  site_title: '',
  academy_email: '',
  academy_description: '',
  primary_color: '#3B82F6',
  secondary_color: '#1E40AF',
  accent_color: '#10B981',
  logo_url: '',
  favicon_url: '',
  login_bg_url: '',
  login_tagline: '',
  subdomain: '',
  custom_domain: '',
  smtp_host: '',
  smtp_port: '587',
  smtp_username: '',
  smtp_password: '',
  smtp_from_name: '',
  smtp_from_email: '',
  smtp_encryption: 'tls',
};

export default function BrandingPage() {
  const [form, setForm] = useState<BrandingForm>(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { setAcademyContext, current_academy_id, is_super_admin, roles, academy } = useAuthStore();

  const loadBranding = () => {
    setLoading(true);
    fetch('/api/branding')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        if (data.academy) {
          setForm({
            academy_name: data.academy.academy_name || '',
            site_title: data.academy.site_title || '',
            academy_email: data.academy.academy_email || '',
            academy_description: data.academy.academy_description || '',
            primary_color: data.academy.primary_color || '#3B82F6',
            secondary_color: data.academy.secondary_color || '#1E40AF',
            accent_color: data.academy.accent_color || '#10B981',
            logo_url: data.academy.logo_url || '',
            favicon_url: data.academy.favicon_url || '',
            login_bg_url: data.academy.login_bg_url || '',
            login_tagline: data.academy.login_tagline || '',
            subdomain: data.academy.subdomain || '',
            custom_domain: data.academy.custom_domain || '',
            smtp_host: data.academy.smtp_host || '',
            smtp_port: String(data.academy.smtp_port || '587'),
            smtp_username: data.academy.smtp_username || '',
            smtp_password: data.academy.smtp_password || '',
            smtp_from_name: data.academy.smtp_from_name || '',
            smtp_from_email: data.academy.smtp_from_email || '',
            smtp_encryption: data.academy.smtp_encryption || 'tls',
          });
        }
      })
      .catch(() => toast.error('Failed to load branding settings'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadBranding(); }, [current_academy_id]); // re-fetch if super admin switches academy

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/branding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      // Update store with new branding
      setAcademyContext({
        current_academy_id: current_academy_id,
        is_super_admin,
        roles,
        academy: data.academy,
      });
      toast.success('Branding saved!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const set = (key: keyof BrandingForm, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  if (loading) {
    return (
      <DashboardLayout title="Settings">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Settings">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Palette size={20} className="text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Site Branding</h1>
              <p className="text-sm text-gray-500">Customize your academy&apos;s look and identity</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50"
          >
            {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Academy Identity */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-800">Academy Identity</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Academy Name *</label>
              <input
                type="text"
                value={form.academy_name}
                onChange={e => set('academy_name', e.target.value)}
                placeholder="e.g. Bright Minds Academy"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Site Title</label>
              <input
                type="text"
                value={form.site_title}
                onChange={e => set('site_title', e.target.value)}
                placeholder="e.g. Bright Minds – Student Portal"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Email</label>
              <input
                type="email"
                value={form.academy_email}
                onChange={e => set('academy_email', e.target.value)}
                placeholder="info@youracademy.com"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
              <textarea
                value={form.academy_description}
                onChange={e => set('academy_description', e.target.value)}
                rows={3}
                placeholder="A short description of your academy..."
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Colors */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-800">Brand Colors</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {([
              { key: 'primary_color' as const, label: 'Primary Color', hint: 'Main accent (buttons, links)' },
              { key: 'secondary_color' as const, label: 'Secondary Color', hint: 'Supporting accent' },
              { key: 'accent_color' as const, label: 'Accent Color', hint: 'Highlights, badges' },
            ]).map(({ key, label, hint }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form[key]}
                    onChange={e => set(key, e.target.value)}
                    className="w-12 h-10 border-0 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={form[key]}
                    onChange={e => set(key, e.target.value)}
                    maxLength={7}
                    className="flex-1 border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">{hint}</p>
              </div>
            ))}
          </div>

          {/* Preview */}
          <div className="mt-4 p-4 rounded-xl border border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wide">Preview</p>
            <div className="flex items-center gap-3 flex-wrap">
              <button style={{ backgroundColor: form.primary_color }} className="px-4 py-2 rounded-lg text-white text-sm font-medium">
                Primary
              </button>
              <button style={{ backgroundColor: form.secondary_color }} className="px-4 py-2 rounded-lg text-white text-sm font-medium">
                Secondary
              </button>
              <span style={{ backgroundColor: form.accent_color + '20', color: form.accent_color }} className="px-3 py-1 rounded-full text-sm font-medium">
                Accent Badge
              </span>
              <div style={{ borderLeftColor: form.primary_color }} className="border-l-4 pl-3 py-1">
                <p className="text-sm text-gray-700">Sample content highlighted</p>
              </div>
            </div>
          </div>
        </div>

        {/* Logo & Favicon */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-800">Logo &amp; Favicon</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Logo URL</label>
              <input
                type="url"
                value={form.logo_url}
                onChange={e => set('logo_url', e.target.value)}
                placeholder="https://..."
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {form.logo_url && (
                <img src={form.logo_url} alt="Logo preview" className="mt-2 h-12 object-contain rounded" />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Favicon URL</label>
              <input
                type="url"
                value={form.favicon_url}
                onChange={e => set('favicon_url', e.target.value)}
                placeholder="https://..."
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {form.favicon_url && (
                <img src={form.favicon_url} alt="Favicon preview" className="mt-2 h-8 w-8 object-contain rounded" />
              )}
            </div>
          </div>
        </div>

        {/* Login Page */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-800">Login Page</h2>
          {academy && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl text-sm">
              <span className="text-gray-600 flex-1 truncate font-mono text-xs">
                {typeof window !== 'undefined' ? window.location.origin : ''}/login?a={academy.academy_id}
              </span>
              <a
                href={`/login?a=${academy.academy_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap"
              >
                <ExternalLink size={14} /> Preview
              </a>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Background Image URL</label>
            <input
              type="url"
              value={form.login_bg_url}
              onChange={e => set('login_bg_url', e.target.value)}
              placeholder="https://..."
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {form.login_bg_url && (
              <img src={form.login_bg_url} alt="Login background preview" className="mt-2 h-24 w-full object-cover rounded-xl" />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Login Page Tagline</label>
            <input
              type="text"
              value={form.login_tagline}
              onChange={e => set('login_tagline', e.target.value)}
              placeholder="e.g. Student Portal"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Domain Settings */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Domain Settings</h2>
            <p className="text-sm text-gray-500 mt-0.5">Set a branded URL for this academy&apos;s portal. Contact Tutzlly support to activate DNS after saving.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Subdomain</label>
            <div className="flex items-center">
              <input
                type="text"
                value={form.subdomain}
                onChange={e => set('subdomain', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="brightminds"
                className="flex-1 border border-gray-300 rounded-l-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="bg-gray-100 border border-l-0 border-gray-300 rounded-r-xl px-3 py-2.5 text-sm text-gray-500 whitespace-nowrap">
                .{process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'yourdomain.com'}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Lowercase letters, numbers, and hyphens only</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Custom Domain</label>
            <input
              type="text"
              value={form.custom_domain}
              onChange={e => set('custom_domain', e.target.value.toLowerCase())}
              placeholder="portal.brightminds.com"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Your IT team adds <span className="font-mono">CNAME → cname.vercel-dns.com</span>, then Tutzlly adds the domain in Vercel.
            </p>
          </div>
          {(form.subdomain || form.custom_domain) && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              <strong>After saving:</strong> notify Tutzlly to activate DNS routing. Users will access the portal at{' '}
              {form.subdomain && <span className="font-mono">{form.subdomain}.{process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'yourdomain.com'}</span>}
              {form.subdomain && form.custom_domain && ' or '}
              {form.custom_domain && <span className="font-mono">{form.custom_domain}</span>}.
            </div>
          )}
        </div>

        {/* SMTP / Email Settings */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Mail size={16} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Email / SMTP Settings</h2>
              <p className="text-xs text-gray-500">Used to send internal messages to users&apos; real email addresses.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">SMTP Host</label>
              <input type="text" value={form.smtp_host} onChange={e => set('smtp_host', e.target.value)}
                placeholder="smtp.gmail.com"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">SMTP Port</label>
              <input type="number" value={form.smtp_port} onChange={e => set('smtp_port', e.target.value)}
                placeholder="587"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Encryption</label>
              <select value={form.smtp_encryption} onChange={e => set('smtp_encryption', e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="tls">TLS (STARTTLS)</option>
                <option value="ssl">SSL</option>
                <option value="none">None</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
              <input type="text" value={form.smtp_username} onChange={e => set('smtp_username', e.target.value)}
                placeholder="your@email.com"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input type="password" value={form.smtp_password} onChange={e => set('smtp_password', e.target.value)}
                placeholder="••••••••"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">From Name</label>
              <input type="text" value={form.smtp_from_name} onChange={e => set('smtp_from_name', e.target.value)}
                placeholder="Bright Minds Academy"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">From Email</label>
              <input type="email" value={form.smtp_from_email} onChange={e => set('smtp_from_email', e.target.value)}
                placeholder="noreply@youracademy.com"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        {/* Save bottom */}
        <div className="flex justify-end pb-8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors disabled:opacity-50"
          >
            {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
