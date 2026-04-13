# Tutzlly Academy - System Architecture

## Overview

Tutzlly Academy is a full-stack web application built with Next.js, React, and PostgreSQL. It manages a comprehensive tutoring ecosystem supporting multiple user roles with distinct responsibilities and workflows.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Browser    │  │     React    │  │   Zustand    │     │
│  │   (SPA)      │  │   Components │  │    Store     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────┬───────────────────────────────────────────┘
                  │ HTTP/HTTPS
┌─────────────────▼───────────────────────────────────────────┐
│                 NEXT.JS APPLICATION                         │
│  ┌────────────────────────────────────────────────────┐   │
│  │              Page Rendering (SSR/SSG)              │   │
│  │  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │   (auth)     │  │  (dashboard)  │               │   │
│  │  │   routes     │  │   routes      │               │   │
│  │  └──────────────┘  └──────────────┘               │   │
│  └────────────────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────────────────┐   │
│  │              API Layer (Route Handlers)            │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐           │   │
│  │  │   Auth   │ │ Resources│ │ Messages │           │   │
│  │  │ Endpoints│ │ Endpoints│ │ Endpoints│           │   │
│  │  └──────────┘ └──────────┘ └──────────┘           │   │
│  └────────────────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────────────────┐   │
│  │         Middleware & Authentication               │   │
│  │  ┌──────────────────────────────────────────┐    │   │
│  │  │    JWT Verification & Role Checking      │    │   │
│  │  └──────────────────────────────────────────┘    │   │
│  └────────────────────────────────────────────────────┘   │
└─────────────────┬───────────────────────────────────────────┘
                  │ Node.js/PostgreSQL Wire Protocol
┌─────────────────▼───────────────────────────────────────────┐
│              DATABASE LAYER (PostgreSQL)                    │
│  ┌────────────────────────────────────────────────────┐   │
│  │  Connection Pool (pg driver, max:1 prod, max:10   │   │
│  │  dev, idle timeout: 30s, connection timeout: 5s)  │   │
│  └────────────────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────────────────┐   │
│  │              Tables & Indexes                      │   │
│  │  • users (authentication)                         │   │
│  │  • tutors, students, parents (profiles)          │   │
│  │  • courses, tutor_course_assignments             │   │
│  │  • student_enrollments                           │   │
│  │  • schedules, sessions, class_activities         │   │
│  │  • grade_book                                    │   │
│  │  • messages_admin/parent/student/tutor           │   │
│  └────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Client-Side Architecture

**Framework**: React 19 + Next.js 16
- **SSR/SSG**: Pages rendered on server for performance and SEO
- **Route Groups**: Organized using layout routes for auth and dashboard
- **SPA Features**: JavaScript hydration for interactive components

**State Management**: Zustand
- Lightweight alternative to Redux
- Persistent store for authentication state (`tutzlly_auth`)
- Client-side auth user caching

**Styling**: Tailwind CSS + PostCSS 4
- Utility-first CSS framework
- Component-scoped styling with clsx/tailwind-merge

**Form Handling**: React Hook Form + Zod
- Declarative form validation
- Type-safe schema validation

**UI Components**:
- Custom components in `src/components/ui/`
- Lucide React for icons
- Recharts for analytics visualizations

### 2. API Layer

All API endpoints follow RESTful conventions in `src/app/api/`:

#### Authentication Endpoints
```
POST   /api/auth/login       → Authenticate user, return JWT
POST   /api/auth/logout      → Logout (optional)
GET    /api/auth/me          → Get current user profile
```

#### Resource Endpoints (CRUD)
```
GET    /api/{resource}       → List resources
POST   /api/{resource}       → Create resource
GET    /api/{resource}/[id]  → Get single resource
PUT    /api/{resource}/[id]  → Update resource
DELETE /api/{resource}/[id]  → Delete resource
```

**Resources managed**:
- `/api/tutors` - Tutor profiles
- `/api/students` - Student profiles
- `/api/parents` - Parent profiles
- `/api/courses` - Course definitions
- `/api/schedules` - Session schedules
- `/api/sessions` - Session records
- `/api/grades` - Grade book entries
- `/api/activities` - Class activity logs
- `/api/enrollments` - Student enrollments
- `/api/tutor-assignments` - Tutor course assignments
- `/api/messages` - Messaging (role-specific routes)

#### Middleware & Authentication
```
src/middleware.ts → JWT verification, role checking, route protection
```

### 3. Database Architecture

#### Schema Overview

**Core Tables**:

1. **users** (Central Authentication)
   - Shared across all roles
   - Fields: id, user_id, username, email, password_hash, role, is_active
   - Roles: admin, tutor, student, parent

2. **Profile Tables** (Role-Specific)
   - `tutors` - Teaching qualifications, pay info, bio
   - `students` - Enrollment info, school, parents' contact
   - `parents` - Child mappings, contact info

3. **Relationship Tables**
   - `courses` - Course definitions and codes
   - `tutor_course_assignments` - Tutor → Courses
   - `student_enrollments` - Students → Tutors → Courses

4. **Session Management**
   - `schedules` - Recurring schedule templates
   - `sessions` - Individual session instances
   - `class_activities` - Activity logs per session

5. **Academic Tracking**
   - `grade_book` - Monthly grades and performance metrics
   - Records: punctuality, attentiveness, engagement, homework, test_score

6. **Communication** (Role-Based)
   - `messages_admin` - Admin system messages
   - `messages_tutor` - Tutor communications
   - `messages_student` - Student communications
   - `messages_parent` - Parent communications

#### Database Indexes
Optimized queries with strategic indexing:
```sql
idx_students_student_id
idx_tutors_tutor_id
idx_parents_parent_id
idx_schedules_student_id
idx_schedules_tutor_id
idx_sessions_student_id
idx_sessions_tutor_id
idx_class_activities_tutor_id
idx_class_activities_student_id
idx_grade_book_student_id
idx_enrollments_student_id
idx_enrollments_tutor_id
```

#### Connection Pool Configuration
- **Production**: max:1 (serverless optimization)
- **Development**: max:10 (local testing)
- **Idle Timeout**: 30 seconds
- **Connection Timeout**: 5 seconds
- Uses global singleton to prevent exhaustion in serverless

### 4. Authentication & Authorization

**Authentication Flow**:
```
1. User submits credentials → /api/auth/login
2. Backend validates email/password
3. Password verified via bcryptjs.compare()
4. JWT token generated (exp: 7 days)
5. Token returned to client
6. Client stores token in Zustand store
7. Token included in Authorization header for API requests
```

**Authorization**:
- Middleware checks JWT validity
- Extracts role from token claims
- Guards routes based on role access matrix
- Role-based component rendering

**Token Structure**:
```json
{
  "id": 1,
  "user_id": "USR123",
  "email": "user@example.com",
  "role": "tutor",
  "iat": 1234567890,
  "exp": 1234654290
}
```

### 5. Data Layer

**Query Functions** (`src/lib/db.ts`):
```typescript
pool.query(sql, params)      // Raw query with params
query<T>(sql, params)        // Typed query returning T[]
queryOne<T>(sql, params)     // Single row query
```

**Benefits**:
- Parameterized queries prevent SQL injection
- Type-safe with TypeScript generics
- Connection pooling for efficiency

**Migration & Setup**:
- Schema defined in `src/lib/schema.sql`
- Setup route reads schema from build output
- CSV migration via `scripts/migrate-csv.js`

## Workflows

### User Registration Flow
```
CSV Import or Manual Entry
  ↓
Create users table entry
  ↓
Create role-specific profile (tutors/students/parents)
  ↓
Generate user_id, set hashed password
  ↓
User can login with credentials
```

### Tutoring Session Flow
```
Admin/Tutor creates Schedule
  ↓
Student enrolls in course with tutor
  ↓
Session scheduled for specific date/time
  ↓
Tutor starts session → creates Sessions entry
  ↓
Tutor logs Class Activity and Homework
  ↓
Admin reviews and approves Grades
  ↓
Parent/Student views results in dashboard
```

### Messaging Flow
```
Sender composes message
  ↓
Route message to role-specific table
  ↓
Recipient views in inbox
  ↓
Optional reply creates conversation thread
  ↓
Message marked as read/unread
```

## Role-Based Access Control

### Admin Dashboard
- Manage all users (tutors, students, parents)
- Create and assign courses
- Manage schedules and sessions
- Review grades and activities
- View system-wide analytics
- Handle messaging

### Tutor Dashboard
- View assigned courses and students
- Create/manage schedules
- Start and log sessions
- Record class activities
- Grade students
- Message students/parents/admins

### Student Dashboard
- View enrolled courses and schedules
- See sessions and activities
- View grades and performance
- Message tutors/parents/admins
- Track progress

### Parent Dashboard
- Monitor children's schedules
- View children's grades
- See class activities and progress
- Message tutors and admins
- Track multiple children

## File Organization

**By Responsibility**:
- `/api` - HTTP request handlers
- `/components` - Reusable UI logic
- `/lib` - Utilities and infrastructure
- `/(auth)` - Authentication routes
- `/(dashboard)` - Protected routes

**By Layer**:
- Client: React components, Zustand stores
- Server: API handlers, utility functions
- Database: Schema, connection management

## Security Considerations

1. **Authentication**
   - Passwords hashed with bcryptjs (cost: 12 rounds)
   - JWT tokens with 7-day expiration
   - Secure token verification on each request

2. **Authorization**
   - Middleware enforces role-based access
   - API endpoints validate user identity
   - Row-level security via user_id checks

3. **Data Protection**
   - Parameterized SQL queries prevent injection
   - HTTPS in production
   - Secure cookie handling via NextAuth considerations

4. **Infrastructure**
   - Connection pooling prevents resource exhaustion
   - Request timeouts configured
   - Error handling without exposing internals

## Deployment Considerations

**Vercel Optimization**:
- `serverExternalPackages` prevents bundling Node.js libraries
- `outputFileTracingIncludes` ensures schema.sql in output
- Serverless functions with max:1 connection pool

**Environment Variables**:
```
DATABASE_URL         - PostgreSQL connection string
NEXTAUTH_SECRET      - JWT signing key
NEXTAUTH_URL         - Application URL
NODE_ENV            - development/production
```

**Scaling Strategies**:
- Use external connection pooler (Neon, Supabase) for production
- Implement caching layer for frequent queries
- Archive old session/activity records
- Use CDN for static assets

## Technology Decision Rationale

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **Backend** | Next.js API Routes | Unified TypeScript, full-stack framework, low overhead |
| **Database** | PostgreSQL | ACID compliance, relational data model fit, JSON support |
| **Auth** | Custom JWT | Lightweight, self-contained tokens, easy role mapping |
| **State Mgmt** | Zustand | Minimal boilerplate, persistence out-of-box |
| **Forms** | React Hook Form | Performance, built-in validation, Zod integration |
| **Deployment** | Vercel | Native Next.js optimization, automatic scaling |

## Testing Strategy

**Recommended**:
1. Unit tests for utilities and auth functions
2. Integration tests for API endpoints
3. E2E tests for user workflows
4. Database tests with transactions/rollback

## Performance Optimizations

1. **Database**
   - Strategic indexes on frequently queried columns
   - Connection pooling to reduce connection overhead
   - Parameterized queries reduce parse overhead

2. **Frontend**
   - SSR for initial page load
   - Code splitting via dynamic imports
   - Image optimization (Lucide SVG icons)

3. **API**
   - Minimal response payloads
   - Caching headers for static content
   - Error responses with meaningful messages

## Future Enhancements

1. **Real-time Features**
   - WebSocket integration for live messaging
   - Instant notifications via Next.js Streaming

2. **Analytics**
   - Advanced dashboard with Recharts
   - Student performance predictions
   - Attendance trends

3. **Integration**
   - Zoom API for automatic meeting links
   - Email notifications
   - Calendar sync (Google Calendar, iCal)

4. **Mobile**
   - React Native application
   - Native app for iOS/Android

5. **Payment**
   - Stripe integration for course fees
   - Invoice generation and tracking
