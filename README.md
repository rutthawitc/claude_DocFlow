# PWA Boilerplate with Next.js 15 and Auth.js

A modern, production-ready Progressive Web Application (PWA) boilerplate built with Next.js 15, pnpm, and Auth.js (formerly NextAuth.js) for authentication. This project includes a complete role-based access control (RBAC) system with user management, role management, and permission management.

## Features

- 🚀 **Next.js 15** with App Router and React 19
- 🔐 **External PWA Authentication** with Auth.js integration
- 👥 **Complete RBAC System** with users, roles, and permissions
- 🗄️ **PostgreSQL Database** with Drizzle ORM
- 🎨 **Modern UI** with shadcn/ui and Tailwind CSS v4
- 📱 **PWA Support** for offline capabilities
- 🐳 **Docker Ready** with docker-compose setup
- 🔄 **TypeScript** for type safety
- �️* **Security Headers** and CSRF protection

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS v4, shadcn/ui, Radix UI
- **Authentication**: Auth.js v5.0.0-beta with external PWA API
- **Database**: PostgreSQL 17.5, Drizzle ORM
- **Package Manager**: pnpm v10.11.0+
- **Containerization**: Docker with Alpine Linux
- **Development**: Turbopack, ESLint

## Project Structure

```
├── src/
│   ├── actions/           # Server Actions for data mutations
│   ├── app/               # Next.js App Router pages
│   │   ├── @authModal/    # Parallel route for auth modals
│   │   ├── admin/         # Admin dashboard routes
│   │   ├── api/           # API route handlers
│   │   └── dashboard/     # User dashboard routes
│   ├── components/        # Reusable React components
│   │   ├── admin/         # Admin-specific components
│   │   ├── auth/          # Authentication components
│   │   └── ui/            # shadcn/ui components
│   ├── db/                # Database schema and connections
│   └── lib/               # Utility functions
├── scripts/               # Database seeding scripts
├── instructions/          # Project documentation
└── drizzle/              # Database migration files
```

## Quick Start

### Option 1: Docker (Recommended)

1. **Clone and setup**
   ```bash
   git clone <repository-url>
   cd pwa_boilerplate_next15_pnpm_v2_authjs
   ```

2. **Configure environment**
   ```bash
   # Copy and edit .env file
   cp .env.example .env
   ```
   
   Required environment variables:
   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pwausers_db
   PWA_AUTH_URL=https://your-pwa-auth-endpoint.com/api/login
   AUTH_SECRET=your-secure-secret-key
   NEXTAUTH_URL=http://localhost:3000
   AUTH_TRUST_HOST=true
   ```

3. **Start with Docker**
   ```bash
   # Start all services
   docker-compose up -d
   
   # Check logs
   docker-compose logs -f app
   ```

4. **Setup database**
   ```bash
   # Create database schema
   pnpm db:push
   
   # Seed roles and permissions
   docker-compose exec db psql -U postgres -d pwausers_db -f /scripts/seed-roles.sql
   ```

5. **Access the application**
   - App: http://localhost:3000
   - pgAdmin: http://localhost:5050 (admin@example.com / adminpassword)

### Option 2: Local Development

1. **Prerequisites**
   - Node.js 18+
   - pnpm
   - PostgreSQL running locally

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Setup database**
   ```bash
   # Push schema to database
   pnpm db:push
   
   # Seed roles (requires local PostgreSQL)
   psql -h localhost -p 5432 -U postgres -d pwausers_db -f scripts/seed-roles.sql
   ```

4. **Start development server**
   ```bash
   pnpm dev
   ```

## Authentication System

This boilerplate integrates with external PWA authentication systems:

- **External API Integration**: Authenticates against your PWA login endpoint
- **User Data Sync**: Automatically syncs user data to local database
- **Role Assignment**: Assigns default roles to new users
- **Session Management**: JWT-based sessions with 30-day expiration
- **Permission Guards**: Route-level permission checking

### Default Roles & Permissions

| Role | Permissions |
|------|-------------|
| **admin** | All permissions (full access) |
| **manager** | users:*, roles:read, dashboard:access, reports:* |
| **user** | dashboard:access, reports:read |
| **guest** | dashboard:access |

## Database Management

### Common Commands

```bash
# Generate migrations
pnpm db:generate

# Push schema changes
pnpm db:push

# Open Drizzle Studio
pnpm db:studio

# Seed roles and permissions
docker-compose exec db psql -U postgres -d pwausers_db -f /scripts/seed-roles.sql
```

### Docker Database Access

```bash
# Connect to PostgreSQL
docker-compose exec db psql -U postgres -d pwausers_db

# View logs
docker-compose logs db

# Backup database
docker-compose exec db pg_dump -U postgres pwausers_db > backup.sql
```

## Development

### Available Scripts

```bash
# Development
pnpm dev              # Start dev server with Turbopack
pnpm build           # Build for production
pnpm start           # Start production server
pnpm lint            # Run ESLint

# Database
pnpm db:generate     # Generate Drizzle migrations
pnpm db:push         # Push schema to database
pnpm db:studio       # Open Drizzle Studio

# Docker
docker-compose up -d     # Start all services
docker-compose down      # Stop all services
docker-compose logs app  # View app logs
```

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `PWA_AUTH_URL` | External PWA authentication endpoint | `https://api.example.com/auth` |
| `AUTH_SECRET` | Auth.js secret key | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Application URL | `http://localhost:3000` |
| `AUTH_TRUST_HOST` | Trust host for Auth.js | `true` |

## Troubleshooting

### Common Issues

1. **Docker permission errors**
   - Ensure Docker has proper permissions
   - Try: `docker-compose down && docker-compose up -d`

2. **Database connection failed**
   - Check if PostgreSQL container is running: `docker-compose ps`
   - Verify DATABASE_URL in .env file

3. **Auth.js UntrustedHost error**
   - Set `AUTH_TRUST_HOST=true` in environment
   - Verify `NEXTAUTH_URL` matches your domain

4. **Module import errors**
   - Use SQL seed script instead of TypeScript version
   - Ensure all dependencies are installed: `pnpm install`

## Documentation

Detailed documentation available in the `instructions/` folder:

- [System Design](./instructions/system-design.md)
- [Database Design](./instructions/database-design.md)
- [Authentication Flow](./instructions/authentication-flow.md)
- [API Documentation](./instructions/api-documentation.md)
- [User Stories](./instructions/user-stories.md)

## License

MIT

## Acknowledgements

- [Next.js](https://nextjs.org/) - React framework
- [Auth.js](https://authjs.dev/) - Authentication library
- [Drizzle ORM](https://orm.drizzle.team/) - TypeScript ORM
- [shadcn/ui](https://ui.shadcn.com/) - UI component library
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
