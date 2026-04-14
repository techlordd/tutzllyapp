'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Building2, LogIn } from 'lucide-react';

interface Academy {
  id: number;
  academy_id: string;
  academy_name: string;
  academy_description?: string;
  logo_url?: string;
  role: string;
}

export default function SelectAcademyPage() {
  const [academies, setAcademies] = useState<Academy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    // Academies are passed via sessionStorage from the login flow
    const stored = sessionStorage.getItem('pending_academies');
    if (stored) {
      try {
        setAcademies(JSON.parse(stored));
      } catch {
        setError('Failed to load academy list. Please log in again.');
      }
    } else {
      // Redirect to login if no pending academies
      router.replace('/login');
    }
  }, [router]);

  const selectAcademy = async (academyId: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/select-academy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ academy_id: academyId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to select academy');
        return;
      }
      sessionStorage.removeItem('pending_academies');
      // Redirect based on role in the selected academy
      const academy = academies.find(a => a.id === academyId);
      const role = academy?.role || data.role || 'admin';
      router.push(`/${role}`);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center font-bold text-2xl mx-auto mb-4">T</div>
          <h1 className="text-2xl font-bold text-white mb-2">Select Academy</h1>
          <p className="text-slate-400 text-sm">You have access to multiple academies. Choose one to continue.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 mb-6 text-sm text-center">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {academies.map((academy) => (
            <button
              key={academy.id}
              onClick={() => selectAcademy(academy.id)}
              disabled={loading}
              className="flex items-start gap-4 p-5 bg-slate-800 border border-slate-700 rounded-2xl hover:border-blue-500 hover:bg-slate-750 transition-all text-left group disabled:opacity-50"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
                {academy.logo_url ? (
                  <img src={academy.logo_url} alt={academy.academy_name} className="w-10 h-10 object-contain rounded-lg" />
                ) : (
                  <Building2 size={22} className="text-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                  {academy.academy_name}
                </p>
                {academy.academy_description && (
                  <p className="text-slate-400 text-sm mt-0.5 line-clamp-2">{academy.academy_description}</p>
                )}
                <span className="inline-block mt-2 text-xs font-medium bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full capitalize">
                  {academy.role}
                </span>
              </div>
              <LogIn size={16} className="text-slate-500 group-hover:text-blue-400 mt-1 flex-shrink-0 transition-colors" />
            </button>
          ))}
        </div>

        {academies.length === 0 && !error && (
          <p className="text-center text-slate-400 py-8">Loading academies...</p>
        )}
      </div>
    </div>
  );
}
