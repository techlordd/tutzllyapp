import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AcademyBranding {
  id: number;
  academy_id: string;
  academy_name: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  logo_url?: string;
  favicon_url?: string;
  site_title?: string;
  academy_description?: string;
  academy_email?: string;
}

export interface AcademyRole {
  academy_id: number;
  role: string;
  academy_name: string;
}

export interface AuthUser {
  id: number;
  user_id: string;
  username: string;
  email: string;
  role: 'admin' | 'tutor' | 'student' | 'parent';
  is_active?: boolean;
}

interface AuthState {
  user: AuthUser | null;
  current_academy_id: number | null;
  is_super_admin: boolean;
  roles: AcademyRole[];
  academy: AcademyBranding | null;
  setUser: (user: AuthUser) => void;
  setAcademyContext: (ctx: { current_academy_id: number | null; is_super_admin: boolean; roles: AcademyRole[]; academy: AcademyBranding | null }) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      current_academy_id: null,
      is_super_admin: false,
      roles: [],
      academy: null,
      setUser: (user) => set({ user }),
      setAcademyContext: (ctx) => set(ctx),
      clearUser: () => set({ user: null, current_academy_id: null, is_super_admin: false, roles: [], academy: null }),
    }),
    { name: 'tutzlly_auth' }
  )
);
