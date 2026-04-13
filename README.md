# Tutzlly

A comprehensive web-based tutoring management platform, built with modern web technologies. The platform enables admins, tutors, students, and parents to manage courses, schedules, sessions, grades, and communications in a unified system.

## Features

- **Multi-Role Authentication**: Secure login system with support for admin, tutor, student, and parent accounts
- **Course Management**: Create and manage courses with tutor assignments
- **Student Enrollment**: Assign students to tutors and courses
- **Schedule Management**: Create and manage tutoring session schedules with timezone support
- **Session Tracking**: Record session details including session duration, attendance, and outcomes
- **Class Activities**: Tutors can log class activities, homework assignments, student engagement, and punctuality
- **Grade Book**: Comprehensive grading system tracking punctuality, attentiveness, engagement, homework, and test scores
- **Messaging System**: Role-based messaging between admins, tutors, students, and parents
- **Data Import**: CSV migration script for bulk data import

## Tech Stack

- **Frontend**: React 19, Next.js 16, TypeScript, Tailwind CSS
- **State Management**: Zustand with persistence
- **Authentication**: JWT-based custom authentication + NextAuth.js integration
- **Backend**: Next.js API routes, Node.js
- **Database**: PostgreSQL with pg driver
- **Forms**: React Hook Form with Zod validation
- **UI Components**: Lucide React icons, Recharts for analytics
- **Utilities**: uuid, date-fns, bcrypt

## Project Structure

```
src/
├── app/                          # Next.js app directory
│   ├── api/                      # API routes
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── tutors/               # Tutor management
│   │   ├── students/             # Student management
│   │   ├── courses/              # Course management
│   │   ├── schedules/            # Schedule management
│   │   ├── sessions/             # Session tracking
│   │   ├── grades/               # Grade book
│   │   ├── activities/           # Class activities
│   │   ├── enrollments/          # Student enrollments
│   │   ├── messages/             # Messaging system
│   │   └── setup/                # Database setup
│   ├── (auth)/                   # Auth layout group
│   │   └── login/                # Login page
│   ├── (dashboard)/              # Dashboard layout group
│   │   ├── admin/                # Admin dashboard
│   │   ├── tutor/                # Tutor dashboard
│   │   ├── student/              # Student dashboard
│   │   └── parent/               # Parent dashboard
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Home page
├── components/                   # Reusable React components
│   ├── layout/                   # Layout components
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── DashboardLayout.tsx
│   └── ui/                       # UI components
│       ├── Button.tsx
│       ├── Modal.tsx
│       ├── DataTable.tsx
│       ├── FormField.tsx
│       ├── StatCard.tsx
│       ├── Avatar.tsx
│       └── Badge.tsx
├── lib/                          # Utility functions
│   ├── auth.ts                   # Authentication helpers
│   ├── db.ts                     # Database connection pool
│   ├── utils.ts                  # Utility functions
│   └── schema.sql                # Database schema
├── store/                        # Zustand stores
│   └── authStore.ts              # Authentication state
└── middleware.ts                 # Next.js middleware
```

## Getting Started

### Prerequisites

- Node.js 18 or higher
- PostgreSQL database
- Environment variables configured

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd tutzlly
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
# Create .env.local with:
DATABASE_URL=postgresql://user:password@localhost:5432/tutzlly
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
NODE_ENV=development
```

4. Initialize the database
```bash
npm run build  # Includes schema setup
curl http://localhost:3000/api/setup  # Run setup route to create tables
```

5. Start development server
```bash
npm run dev
```

Access the application at `http://localhost:3000`

### Scripts

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm start         # Start production server
npm run lint      # Run ESLint
npm run migrate   # Import CSV data
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Resources
- `GET/POST /api/tutors` - Tutor management
- `GET/POST /api/students` - Student management
- `GET/POST /api/parents` - Parent management
- `GET/POST /api/courses` - Course management
- `GET/POST /api/schedules` - Schedule management
- `GET/POST /api/sessions` - Session tracking
- `GET/POST /api/grades` - Grade book
- `GET/POST /api/activities` - Class activities
- `GET/POST /api/enrollments` - Student enrollments
- `GET/POST /api/messages` - Messaging

## Role-Based Access

- **Admin**: Full system access, user management, course setup, analytics
- **Tutor**: Manage assigned courses, create schedules, log activities, grade students
- **Student**: View schedules, courses, grades, activities, and messages
- **Parent**: View child's schedules, grades, activities, and receive updates

## Database

The application uses PostgreSQL with the following main tables:

- `users` - Central authentication
- `tutors` - Tutor profiles and details
- `students` - Student profiles and enrollment info
- `parents` - Parent profiles and student mappings
- `courses` - Course definitions
- `tutor_course_assignments` - Tutor course assignments
- `student_enrollments` - Student-tutor-course mappings
- `schedules` - Session schedules
- `sessions` - Session records and tracking
- `class_activities` - Class activity logs
- `grade_book` - Student grades and performance
- `messages_admin/parent/student/tutor` - Role-based messaging

See `SYSTEM_ARCHITECTURE.md` for detailed database schema documentation.

## Security

- Passwords hashed with bcryptjs
- JWT tokens for API authentication
- SQL injection prevention via parameterized queries
- CORS and middleware protection
- Role-based access control (RBAC)

## Deployment

The application is configured for Vercel deployment:

- Uses `serverExternalPackages` to prevent bundling of Node.js dependencies
- Database schema included in build output via `outputFileTracingIncludes`
- Optimized connection pooling for serverless environment

## Future Enhancements

- Real-time notifications
- Advanced analytics dashboard
- Payment integration for course fees
- Student performance predictions
- Automated attendance tracking via Zoom integration
- Mobile application

## Support

For issues and feature requests, please check the issue tracker.

## License

All rights reserved. Tutzlly.
