'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
}

export default function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { user, setUser, academy, setAcademyContext, is_super_admin } = useAuthStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const router = useRouter();

  // Always refresh academy context on mount — Zustand persists `user` across reloads,
  // so an `if (!user)` guard would skip the fetch and leave `academy` stale (causing
  // the sidebar to fall back to the hardcoded 'Tutzlly' placeholder).
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          setAcademyContext({
            current_academy_id: data.current_academy_id ?? null,
            is_super_admin: data.is_super_admin ?? false,
            roles: data.roles ?? [],
            academy: data.academy ?? null,
          });
        } else {
          router.push('/login');
        }
      })
      .catch(() => router.push('/login'));

    const handleResize = () => {
      if (window.innerWidth < 768) setSidebarCollapsed(true);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply academy branding as CSS custom properties
  useEffect(() => {
    if (!academy) return;
    const root = document.documentElement;
    if (academy.primary_color) root.style.setProperty('--color-primary', academy.primary_color);
    if (academy.secondary_color) root.style.setProperty('--color-secondary', academy.secondary_color);
    if (academy.accent_color) root.style.setProperty('--color-accent', academy.accent_color);
    if (academy.site_title) document.title = academy.site_title;
  }, [academy]);

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-600 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        role={user.role}
        userName={user.username}
        userEmail={user.email}
        isSuperAdmin={is_super_admin}
        academyName={academy?.academy_name}
        collapsed={mobileSidebarOpen ? false : sidebarCollapsed}
        onCollapse={setSidebarCollapsed}
        onNavClick={() => setMobileSidebarOpen(false)}
        mobileOpen={mobileSidebarOpen}
      />

      {/* Main Content */}
      <div className={cn(
        'flex-1 flex flex-col min-w-0 transition-all duration-300',
        sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'
      )}>
        <Header
          title={title}
          userName={user.username}
          role={user.role}
          onMenuClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
