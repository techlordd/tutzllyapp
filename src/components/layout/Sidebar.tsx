'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, Calendar, CalendarDays, Video, ClipboardList,
  BarChart3, MessageSquare, ChevronLeft, ChevronRight, UserPlus, BookMarked,
  School, LogOut, Upload, Palette, Building2, ShieldCheck, Monitor, Radio, RotateCcw, XCircle,
  TrendingUp, UserCircle, Inbox, Send, SquarePen, Trash2,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  exact?: boolean;
}

const adminNav: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Tutors', href: '/admin/tutors', icon: GraduationCap },
  { label: 'Students', href: '/admin/students', icon: Users },
  { label: 'Parents', href: '/admin/parents', icon: UserPlus },
  { label: 'Courses', href: '/admin/courses', icon: BookOpen },
  { label: 'Assign Courses', href: '/admin/assign-courses', icon: BookMarked },
  { label: 'Enroll Students', href: '/admin/enrollments', icon: School },
  { label: 'Schedules', href: '/admin/schedules', icon: Calendar },
  { label: 'Timetable', href: '/admin/timetable', icon: CalendarDays },
  { label: 'Sessions', href: '/admin/sessions', icon: Video },
  { label: 'Active Sessions', href: '/admin/active-sessions', icon: Radio },
  { label: 'Rescheduled Sessions', href: '/admin/rescheduled-sessions', icon: RotateCcw },
  { label: 'Missed Sessions', href: '/admin/missed-sessions', icon: XCircle },
  { label: 'Session Reports', href: '/admin/session-reports', icon: TrendingUp },
  { label: 'Classrooms', href: '/admin/classrooms', icon: Monitor },
  { label: 'Class Activities', href: '/admin/activities', icon: ClipboardList },
  { label: 'Grade Book', href: '/admin/grades', icon: BarChart3 },
  { label: 'Messages', href: '/admin/messages', icon: MessageSquare },
  { label: 'Import CSV', href: '/admin/import', icon: Upload },
  { label: 'Settings', href: '/admin/branding', icon: Palette },
  { label: 'Profile', href: '/admin/profile', icon: UserCircle },
];

const tutorNav: NavItem[] = [
  { label: 'Dashboard', href: '/tutor', icon: LayoutDashboard },
  { label: 'My Students', href: '/tutor/students', icon: Users },
  { label: 'My Courses', href: '/tutor/courses', icon: BookOpen },
  { label: 'Schedule', href: '/tutor/schedule', icon: Calendar },
  { label: 'Sessions', href: '/tutor/sessions', icon: Video },
  { label: 'Active Sessions', href: '/tutor/active-sessions', icon: Radio },
  { label: 'Rescheduled Sessions', href: '/tutor/rescheduled-sessions', icon: RotateCcw },
  { label: 'Missed Sessions', href: '/tutor/missed-sessions', icon: XCircle },
  { label: 'Class Activities', href: '/tutor/activities', icon: ClipboardList },
  { label: 'Grade Book', href: '/tutor/grades', icon: BarChart3 },
  { label: 'Inbox', href: '/tutor/messages/inbox', icon: Inbox, exact: true },
  { label: 'Sent', href: '/tutor/messages/sent', icon: Send, exact: true },
  { label: 'Compose', href: '/tutor/messages/compose', icon: SquarePen, exact: true },
  { label: 'Trash', href: '/tutor/messages/trash', icon: Trash2, exact: true },
  { label: 'Profile', href: '/tutor/profile', icon: UserCircle },
];

const studentNav: NavItem[] = [
  { label: 'Dashboard', href: '/student', icon: LayoutDashboard },
  { label: 'My Courses', href: '/student/courses', icon: BookOpen },
  { label: 'Schedule', href: '/student/schedule', icon: Calendar },
  { label: 'Sessions', href: '/student/sessions', icon: Video },
  { label: 'Class Activities', href: '/student/activities', icon: ClipboardList },
  { label: 'Grade Book', href: '/student/grades', icon: BarChart3 },
  { label: 'Inbox', href: '/student/messages/inbox', icon: Inbox, exact: true },
  { label: 'Sent', href: '/student/messages/sent', icon: Send, exact: true },
  { label: 'Compose', href: '/student/messages/compose', icon: SquarePen, exact: true },
  { label: 'Trash', href: '/student/messages/trash', icon: Trash2, exact: true },
  { label: 'Profile', href: '/student/profile', icon: UserCircle },
];

const parentNav: NavItem[] = [
  { label: 'Dashboard', href: '/parent', icon: LayoutDashboard },
  { label: 'My Children', href: '/parent/children', icon: Users },
  { label: 'Schedule', href: '/parent/schedule', icon: Calendar },
  { label: 'Sessions', href: '/parent/sessions', icon: Video },
  { label: 'Grade Book', href: '/parent/grades', icon: BarChart3 },
  { label: 'Inbox', href: '/parent/messages/inbox', icon: Inbox, exact: true },
  { label: 'Sent', href: '/parent/messages/sent', icon: Send, exact: true },
  { label: 'Compose', href: '/parent/messages/compose', icon: SquarePen, exact: true },
  { label: 'Trash', href: '/parent/messages/trash', icon: Trash2, exact: true },
  { label: 'Profile', href: '/parent/profile', icon: UserCircle },
];

const superAdminNav: NavItem[] = [
  { label: 'Super Admin', href: '/super-admin', icon: ShieldCheck },
  { label: 'Academies', href: '/super-admin/academies', icon: Building2 },
  { label: 'Import CSV', href: '/super-admin/import', icon: Upload },
];

const navMap: Record<string, NavItem[]> = {
  admin: adminNav,
  tutor: tutorNav,
  student: studentNav,
  parent: parentNav,
  super_admin: superAdminNav,
};

interface SidebarProps {
  role: string;
  userName: string;
  userEmail: string;
  isSuperAdmin?: boolean;
  academyName?: string;
  collapsed?: boolean;
  onCollapse?: (v: boolean) => void;
  onNavClick?: () => void;
  mobileOpen?: boolean;
}

export default function Sidebar({ role, userName, userEmail, isSuperAdmin, academyName, collapsed = false, onCollapse, onNavClick, mobileOpen = false }: SidebarProps) {
  const pathname = usePathname();
  const { clearUser, user } = useAuthStore();
  const [activeSessionsCount, setActiveSessionsCount] = useState(0);
  const [rescheduledCount, setRescheduledCount] = useState(0);
  const [missedCount, setMissedCount] = useState(0);
  const [inboxUnreadCount, setInboxUnreadCount] = useState(0);

  useEffect(() => {
    if (role !== 'admin' && role !== 'tutor') return;
    const tutorParam = role === 'tutor' && user?.user_id ? `&tutor_id=${user.user_id}` : '';
    const fetchCounts = () => {
      fetch(`/api/sessions?status=started&count=true${tutorParam}`)
        .then(r => r.json()).then(d => setActiveSessionsCount(d.count || 0)).catch(() => {});
      fetch(`/api/sessions?status=rescheduled&count=true${tutorParam}`)
        .then(r => r.json()).then(d => setRescheduledCount(d.count || 0)).catch(() => {});
      fetch(`/api/sessions?status=missed&count=true${tutorParam}`)
        .then(r => r.json()).then(d => setMissedCount(d.count || 0)).catch(() => {});
    };
    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, [role, user?.user_id]);

  useEffect(() => {
    const msgRole = role === 'super_admin' ? null : role;
    if (!msgRole || !user?.user_id) return;
    const recipientParam = role === 'admin' ? '' : `&recipient_id=${encodeURIComponent(user.user_id)}`;
    const fetchUnread = () => {
      fetch(`/api/messages/${msgRole}?count=true&status=unread${recipientParam}`)
        .then(r => r.json()).then(d => setInboxUnreadCount(d.count || 0)).catch(() => {});
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [role, user?.user_id]);

  const sessionBadges: Record<string, number> = {
    '/admin/active-sessions': activeSessionsCount,
    '/tutor/active-sessions': activeSessionsCount,
    '/admin/rescheduled-sessions': rescheduledCount,
    '/tutor/rescheduled-sessions': rescheduledCount,
    '/admin/missed-sessions': missedCount,
    '/tutor/missed-sessions': missedCount,
    '/admin/messages': inboxUnreadCount,
    '/tutor/messages/inbox': inboxUnreadCount,
    '/student/messages/inbox': inboxUnreadCount,
    '/parent/messages/inbox': inboxUnreadCount,
  };

  const navItems = (navMap[role] || []).map(item =>
    sessionBadges[item.href] !== undefined
      ? { ...item, badge: sessionBadges[item.href] }
      : item
  );

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    clearUser();
    window.location.href = '/login';
  };

  return (
    <aside className={cn(
      'flex flex-col h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white transition-all duration-300 ease-in-out fixed top-0 left-0 z-40 shadow-2xl',
      collapsed ? 'w-16' : 'w-64',
      mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-sm">T</div>
            <div>
              <p className="font-bold text-sm leading-tight">{academyName || 'Tutzlly'}</p>
              <p className="text-xs text-slate-400">Portal</p>
            </div>
          </div>
        )}
        <button
          onClick={() => onCollapse?.(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-slate-700 transition-colors ml-auto"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Role Badge */}
      {!collapsed && (
        <div className="px-4 py-3">
          <span className={cn(
            'text-xs font-semibold px-2.5 py-1 rounded-full capitalize',
            role === 'admin' ? 'bg-red-500/20 text-red-300' :
            role === 'super_admin' ? 'bg-amber-500/20 text-amber-300' :
            role === 'tutor' ? 'bg-blue-500/20 text-blue-300' :
            role === 'student' ? 'bg-green-500/20 text-green-300' :
            'bg-purple-500/20 text-purple-300'
          )}>
            {role === 'super_admin' ? 'Super Admin' : role}
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          // Use the first nav item's href as the "root" for this role to avoid
          // the super_admin underscore-vs-hyphen mismatch with /${role}.
          const rootHref = navItems[0]?.href ?? '';
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || (item.href !== rootHref && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavClick}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition-all duration-200 group relative',
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:bg-slate-700 hover:text-white'
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && (
                <>
                  <span className="text-sm font-medium truncate flex-1">{item.label}</span>
                  {!!item.badge && (
                    <span className="ml-1 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center leading-none">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </>
              )}
              {collapsed && (
                <>
                  {!!item.badge && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                  <div className="absolute left-full ml-2 px-2 py-1 bg-slate-700 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 transition-opacity">
                    {item.label}{item.badge ? ` (${item.badge})` : ''}
                  </div>
                </>
              )}
            </Link>
          );
        })}

        {/* Return to Control Panel — shown when super admin has switched into an academy */}
        {isSuperAdmin && role === 'admin' && (
          <>
            {!collapsed && (
              <p className="text-xs text-amber-500/70 uppercase tracking-wider px-3 pt-4 pb-1">
                Tutzlly Platform
              </p>
            )}
            <button
              onClick={async () => {
                await fetch('/api/super-admin/exit-academy', { method: 'POST' });
                window.location.href = '/super-admin';
              }}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 w-full transition-all duration-200',
                'text-amber-400 hover:bg-amber-500/20 hover:text-amber-300'
              )}
              title={collapsed ? 'Return to Control Panel' : undefined}
            >
              <ShieldCheck size={18} className="flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium truncate">Return to Control Panel</span>}
            </button>
          </>
        )}
      </nav>

      {/* User Info + Logout */}
      <div className="border-t border-slate-700 p-3">
        {!collapsed && (
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{userName}</p>
              <p className="text-xs text-slate-400 truncate">{userEmail}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2 rounded-xl text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition-colors',
            collapsed && 'justify-center'
          )}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut size={16} />
          {!collapsed && <span className="text-sm">Logout</span>}
        </button>
      </div>
    </aside>
  );
}
