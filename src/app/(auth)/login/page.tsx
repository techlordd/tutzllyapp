'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

const DEMO_ACCOUNTS = [
  { role: 'Admin',   email: 'admin@tutzllyacademy.com',          password: 'Admin@Tutzlly1!', color: 'bg-red-500/20 border-red-500/30 text-red-300 hover:bg-red-500/30' },
  { role: 'Tutor',   email: 'demo.tutor@tutzllyacademy.com',   password: 'Tutzlly@123',    color: 'bg-blue-500/20 border-blue-500/30 text-blue-300 hover:bg-blue-500/30' },
  { role: 'Student', email: 'demo.student@tutzllyacademy.com', password: 'Tutzlly@123',    color: 'bg-green-500/20 border-green-500/30 text-green-300 hover:bg-green-500/30' },
  { role: 'Parent',  email: 'demo.parent@tutzllyacademy.com',  password: 'Tutzlly@123',    color: 'bg-purple-500/20 border-purple-500/30 text-purple-300 hover:bg-purple-500/30' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const router = useRouter();
  const { setUser, setAcademyContext } = useAuthStore();

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
    router.push(`/${data.user.role}`);
    return data.user;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await doLogin(email, password);
      toast.success('Welcome back!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string, demoPassword: string, role: string) => {
    setDemoLoading(role);
    try {
      await doLogin(demoEmail, demoPassword);
      toast.success(`Signed in as Demo ${role}`);
    } catch {
      toast.error(`Demo ${role} account not found. Run POST /api/setup first.`);
    } finally {
      setDemoLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/40 mb-4">
            <BookOpen size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Tutzlly</h1>
          <p className="text-blue-300 mt-1">Academy Portal</p>
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
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/40 flex items-center justify-center gap-2 mt-2"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-white/40 text-xs mt-6">
            Contact your administrator if you need access
          </p>
        </div>

        {/* Demo Access */}
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
      </div>
    </div>
  );
}
