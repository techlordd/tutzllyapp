'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

const DEMO_ACCOUNTS = [
  { role: 'Super Admin', email: 'superadmin@tutzlly.com',             password: 'Tutzlly@SuperAdmin1!', color: 'bg-amber-500/20 border-amber-500/30 text-amber-300 hover:bg-amber-500/30' },
  { role: 'Admin',       email: 'admin@tutzllyacademy.com',            password: 'Admin@Tutzlly1!',      color: 'bg-red-500/20 border-red-500/30 text-red-300 hover:bg-red-500/30' },
  { role: 'Tutor',       email: 'demo.tutor@tutzllyacademy.com',     password: 'Tutzlly@123',          color: 'bg-blue-500/20 border-blue-500/30 text-blue-300 hover:bg-blue-500/30' },
  { role: 'Student',     email: 'demo.student@tutzllyacademy.com',   password: 'Tutzlly@123',          color: 'bg-green-500/20 border-green-500/30 text-green-300 hover:bg-green-500/30' },
  { role: 'Parent',      email: 'demo.parent@tutzllyacademy.com',    password: 'Tutzlly@123',          color: 'bg-purple-500/20 border-purple-500/30 text-purple-300 hover:bg-purple-500/30' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const router = useRouter();
  const { setUser, setAcademyContext } = useAuthStore();

  // If ?a=ACADEMY_SLUG is in the URL, fetch public branding before login.
  // We read window.location.search directly (no useSearchParams — avoids Suspense requirement).
  const [branding, setBranding] = useState<{
    academy_name?: string;
    primary_color?: string;
    logo_url?: string;
    login_bg_url?: string;
    login_tagline?: string;
  } | null>(null);

  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get('a');
    if (!slug) return;
    fetch(`/api/branding/public?a=${encodeURIComponent(slug)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.branding) setBranding(data.branding); })
      .catch(() => {});
  }, []);

  const primaryColor = branding?.primary_color ?? '#2563EB';
  const academyName  = branding?.academy_name  ?? 'Tutzlly';
  const tagline      = branding?.login_tagline  ?? 'Academy Portal';

  const doLogin = async (loginEmail: string, loginPassword: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: loginEmail, password: loginPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');

    // Multi-academy: user must pick which academy to enter
    if (data.needs_academy_selection) {
      sessionStorage.setItem('pending_academies', JSON.stringify(data.academies));
      router.push('/select-academy');
      return null;
    }

    setUser(data.user);
    if (data.current_academy_id !== undefined) {
      setAcademyContext({
        current_academy_id: data.current_academy_id ?? null,
        is_super_admin: data.is_super_admin ?? false,
        roles: data.roles ?? [],
        academy: data.academy ?? null,
      });
    }
    // super_admin role lives at /super-admin, all others at /<role>
    const dest = data.user.role === 'super_admin' ? '/super-admin' : `/${data.user.role}`;
    router.push(dest);
    return data.user;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await doLogin(email, password);
      if (user) toast.success('Welcome back!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string, demoPassword: string, role: string) => {
    setDemoLoading(role);
    try {
      const user = await doLogin(demoEmail, demoPassword);
      if (user) toast.success(`Signed in as Demo ${role}`);
    } catch {
      toast.error(`Demo ${role} account not found. Run POST /api/setup first.`);
    } finally {
      setDemoLoading(null);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={branding?.login_bg_url
        ? { backgroundImage: `url(${branding.login_bg_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
        : { background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)' }
      }
    >
      {branding?.login_bg_url && <div className="absolute inset-0 bg-black/60 pointer-events-none" />}
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          {branding?.logo_url
            ? <img src={branding.logo_url} alt={academyName} className="h-16 mx-auto mb-4 object-contain" />
            : (
              <div
                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-lg mb-4"
                style={{ backgroundColor: primaryColor }}
              >
                <BookOpen size={28} className="text-white" />
              </div>
            )
          }
          <h1 className="text-3xl font-bold text-white">{academyName}</h1>
          <p className="text-blue-300 mt-1">{tagline}</p>
        </div>

        {/* Form card */}
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-6">Sign in to your account</h2>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-blue-200 mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 text-white placeholder-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-200 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 bg-white/10 border border-white/20 text-white placeholder-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ backgroundColor: primaryColor }}
              className="w-full py-3 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 mt-2 hover:opacity-90 disabled:opacity-60"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-white/40 text-xs mt-6">
            Contact your administrator if you need access
          </p>
        </div>

        {/* Demo Access — only shown on the root Tutzlly portal, not academy portals */}
        {!branding && (
        <div className="mt-4 bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-white/40 px-2 shrink-0">Demo Access</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>
          <p className="text-xs text-white/30 text-center mb-3">Click any role to sign in instantly</p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map(({ role, email: demoEmail, password: demoPassword, color }) => (
              <button
                key={role}
                onClick={() => handleDemoLogin(demoEmail, demoPassword, role)}
                disabled={!!demoLoading || loading}
                className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${color} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {demoLoading === role
                  ? <><Loader2 size={13} className="animate-spin" /> Signing in...</>
                  : role}
              </button>
            ))}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
