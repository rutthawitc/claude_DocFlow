# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Essential Commands
- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

### Database Commands
- `pnpm db:generate` - Generate Drizzle migrations
- `pnpm db:push` - Push schema changes to database
- `pnpm db:studio` - Open Drizzle Studio for database management
- `pnpm db:seed-roles` - Seed default roles and permissions

### Docker Commands
- `docker-compose up -d` - Start all services (PostgreSQL, pgAdmin, app)
- `docker-compose down` - Stop all services
- `docker-compose logs app` - View application logs

## Architecture Overview

### PWA Authentication System
This is a Next.js 15 application with external PWA authentication integration:

- **External Auth Flow**: Authenticates against external PWA API endpoint (`PWA_AUTH_URL`)
- **User Sync**: Automatically syncs user data from external API to local PostgreSQL database
- **RBAC System**: Complete role-based access control with users, roles, and permissions
- **Session Management**: JWT-based sessions with 30-day expiration via Auth.js v5

### Database Architecture
- **ORM**: Drizzle ORM with PostgreSQL
- **Schema Location**: `src/db/schema.ts`
- **Key Tables**: users, roles, permissions, user_roles, role_permissions
- **Relationships**: Many-to-many relationships between users/roles and roles/permissions

### Key Components

#### Authentication (`src/auth.ts`)
- NextAuth.js configuration with Credentials provider
- External PWA API integration for login validation
- Automatic user creation/update in local database
- PWA user data extension in session object

#### Middleware (`src/middleware.ts`)
- Route protection based on roles and permissions
- Protected routes: `/admin`, `/reports`, `/users`
- Debugging mode for login page (`?debug=1`)

#### Database Connection (`src/db/`)
- Server-side database connection via `getDb()` function
- Separate server configurations for different environments

### Project Structure Patterns
- **App Router**: Uses Next.js 15 App Router with parallel routes (`@authModal`)
- **Server Actions**: Located in `src/actions/` for data mutations
- **Components**: Organized by feature (`admin/`, `auth/`, `ui/`)
- **UI Library**: shadcn/ui components with Radix UI primitives

## Environment Variables Required
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pwausers_db
PWA_AUTH_URL=https://your-pwa-auth-endpoint.com/api/login
AUTH_SECRET=your-secure-secret-key
NEXTAUTH_URL=http://localhost:3000
AUTH_TRUST_HOST=true
```

## Development Notes

### External PWA Integration
- Login credentials sent to external PWA API
- User data returned includes organizational structure (costCenter, ba, part, area, etc.)
- Local database stores complete user profile for session management

### Default Permissions
New users automatically get 'user' role with these permissions:
- `dashboard:access`
- `reports:read`

Admin users have full access with hardcoded roles: `['user', 'admin']`

### Database Seeding
Use SQL script for role seeding rather than TypeScript version:
```bash
docker-compose exec db psql -U postgres -d pwausers_db -f /scripts/seed-roles.sql
```