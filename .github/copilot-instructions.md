# Tutzlly Workspace Instructions

**Project**: Tutzlly Academy — A full-stack tutoring management platform enabling admins, tutors, students, and parents to manage courses, schedules, sessions, grades, and communications.

**Tech Stack**: Next.js 16 + React 19 + TypeScript + PostgreSQL + Zustand + React Hook Form + Tailwind CSS

---

## Quick Start

### Commands
```bash
npm run dev       # Dev server (http://localhost:3000)
npm run build     # Production build
npm start         # Production server
npm run lint      # ESLint
npm run migrate   # CSV data import
```

### Critical Setup
After `npm build` or fresh deployment, **must initialize database schema**:
```bash
curl http://localhost:3000/api/setup
```

---

## Architecture Patterns

### 1. **API Routes** (`src/app/api/**`)
- **RESTful convention**: `GET/POST` on base routes, `PUT/DELETE` on `[id]` routes
- **Request context extraction**:
  ```ts
  const academyId = getAcademyId(request);  // from x-academy-id header
  const role = getUserRole(request);        // from x-user-role header
  ```
- **Query helpers** (src/lib/db.ts):
  ```ts
  query<T>(sql, params): Promise<T[]>          // Array results
  queryOne<T>(sql, params): Promise<T | null>  // Single row
  ```
- **Soft deletes**: `UPDATE table SET entry_status='deleted'` (no hard deletes)
- **Error handling**: Wrap in `try/catch`, return JSON with status codes

**Example** ([src/app/api/courses/route.ts](src/app/api/courses/route.ts)):
```ts
export async function GET(request: Request) {
  try {
    const academyId = getAcademyId(request);
    const courses = await query(
      `SELECT * FROM courses WHERE academy_id = $1 AND entry_status != 'deleted'`,
      [academyId]
    );
    return Response.json(courses);
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 2. **Authentication & Authorization**
- **JWT token flow** ([src/lib/auth.ts](src/lib/auth.ts)):
  - `POST /api/auth/login` → Generates signed JWT, sets httpOnly cookie
  - Token payload: `{ id, email, role, current_academy_id, is_super_admin, roles: [{ academy_id, role }] }`
- **Middleware** ([src/middleware.ts](src/middleware.ts)):
  - Extracts domain slug from hostname
  - Verifies JWT using `jose` (Edge-compatible, not jsonwebtoken)
  - Sets headers: `x-academy-id`, `x-user-role`, `x-is-super-admin`
  - Redirects unauthenticated users to `/login`
- **Multi-academy queries**: Use `academy_id = $1 OR $1 = 0` pattern (super_admin bypass)

### 3. **React Components** (`src/components/*`)
- All interactive components use `'use client'` directive
- **State management**:
  - Form state: `useState` (simple object, no React Hook Form yet)
  - App-level auth: Zustand store ([src/store/authStore.ts](src/store/authStore.ts))
  - Form submission pattern:
    ```tsx
    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        const res = await fetch(url, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(form) 
        });
        if (!res.ok) throw new Error();
        toast.success('Success message');
        // Refetch data & reset form
      } catch (error) {
        toast.error(error.message || 'Error');
      }
    };
    ```
- **UI composition**: Use [FormField](src/components/ui/FormField.tsx), [Modal](src/components/ui/Modal.tsx), [DataTable](src/components/ui/DataTable.tsx)
- **Notifications**: `react-hot-toast` for user feedback
- **Error display**: FormField component has optional error text below input

**Exemplary files**:
- [src/app/(dashboard)/admin/courses/page.tsx](src/app/(dashboard)/admin/courses/page.tsx) — Complete CRUD with modal forms
- [src/components/layout/DashboardLayout.tsx](src/components/layout/DashboardLayout.tsx) — Role-based layout wrapper

### 4. **State Management** (Zustand)
```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthStore {
  user: User | null;
  current_academy_id: number;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      current_academy_id: 0,
      setUser: (user) => set({ user }),
    }),
    { name: 'tutzlly_auth' }
  )
);
```

---

## File Organization

| Path | Purpose |
|------|---------|
| `src/app/(auth)/` | Login & academy selection pages |
| `src/app/(dashboard)/` | Role-based dashboards (admin, tutor, student, parent) |
| `src/app/api/` | RESTful API endpoints |
| `src/components/ui/` | Reusable UI components (Button, FormField, Modal, DataTable) |
| `src/components/layout/` | Layouts (DashboardLayout, Header, Sidebar) |
| `src/lib/` | Utilities: `auth.ts`, `db.ts`, `utils.ts`, `request-context.ts` |
| `src/store/` | Zustand stores |
| `scripts/` | Utilities: `migrate-csv.js`, `init-db.ts` |

---

## Common Patterns & Helpers

### Request Context Extraction
```ts
import { getAcademyId, getUserRole } from '@/lib/request-context';

const academyId = getAcademyId(request);  // From x-academy-id header
const role = getUserRole(request);        // From x-user-role header
```

### Styling & Classes
```ts
import { cn } from '@/lib/utils';

// Merge Tailwind classes safely
className={cn('px-4 py-2', isActive && 'bg-blue-500')}
```

### ID Generation
```ts
import { generateId } from '@/lib/utils';

const studentId = generateId('STU');  // STU-1735689600000-a1b2c3d4
```

### Date/Currency Formatting
```ts
import { formatDate, formatCurrency } from '@/lib/utils';

formatDate(new Date(), 'MMM dd, yyyy')  // Format dates consistently
formatCurrency(1500.50)                 // Format currency (USD)
```

---

## Common Pitfalls & Solutions

| Issue | Root Cause | Solution |
|-------|-----------|----------|
| **"API returns 401 Unauthorized"** | Missing or invalid JWT | Check `x-academy-id` header is set; verify token cookie exists |
| **"Academy ID is always 0"** | Not calling `getAcademyId()` | Use `getAcademyId(request)` in API routes; don't hardcode IDs |
| **"Connection pool exhausted in Vercel"** | Vercel serverless runs single container | Use external connection pooler (Neon, Supabase) with pooling mode |
| **"JWT not decoding in middleware"** | Using `jsonwebtoken` instead of `jose` | Use `jose` for Edge Runtime compatibility |
| **"Database schema not initialized"** | Skipped `/api/setup` call | Call `POST /api/setup` after deploys or builds |
| **"Domain routing fails on localhost"** | `NEXT_PUBLIC_ROOT_DOMAIN` env var missing | Set in `.env.local` for local domain-based routing (Vercel auto-sets) |
| **"Form data not persisting after submit"** | Forgot to refetch data | After successful POST/PUT, re-call `GET` endpoint to refresh UI |
| **"Zustand store is undefined in component"** | Hydration mismatch in `'use client'` | Add `useEffect` before reading store: `const user = useAuthStore(s => s.user)` |

---

## Development Workflow

### Adding a New API Endpoint
1. Create file in `src/app/api/[resource]/route.ts`
2. Use `getAcademyId(request)` to scope queries
3. Use parameterized queries: `query($1, $2...)`
4. Wrap in `try/catch` with `console.error()`
5. Return `Response.json()` with status codes

### Adding a New Page
1. Create in appropriate layout group: `src/app/(dashboard)/[role]/[feature]/page.tsx`
2. Fetch data with `useCallback` to prevent rerun loops
3. Use `useState` for form state
4. Compose with FormField, Modal, DataTable as needed
5. Use `toast.success()` / `toast.error()` for feedback

### Adding a New Component
1. Add `'use client'` if interactive
2. Accept data via props, not direct queries
3. Use Tailwind classes directly; wrap with `cn()` for dynamic classes
4. Compose with reusable UI components

---

## Database Context

- **Connection pooling**: Production uses `max: 1` (Vercel constraint); dev uses `max: 10`
- **Multi-academy scoping**: All queries should filter by `academy_id` (or `$1 = 0` for super_admin)
- **Timestamps**: Use `NOW()` in SQL for created_at/updated_at
- **Soft deletes**: Set `entry_status = 'deleted'` instead of hard delete

---

## Links to Documentation

- [System Architecture](SYSTEM_ARCHITECTURE.md) — Detailed system design
- [README](README.md) — Features, tech stack, full project structure

---

## Personalization

When working with this codebase:
1. **Always check** `getAcademyId()` context for multi-tenancy safety
2. **Prefer** soft deletes over hard deletes
3. **Use** React Hook Form + Zod when validation becomes complex
4. **Test** domain routing with `NEXT_PUBLIC_ROOT_DOMAIN` in `.env.local`
5. **Monitor** database connection pool in Vercel (use external pooler if needed)
