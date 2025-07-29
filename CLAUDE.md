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
- `pnpm docflow:init` - Initialize DocFlow data (branches, roles, permissions)

### Docker Commands
- `docker-compose up -d` - Start all services (PostgreSQL, pgAdmin, app)
- `docker-compose down` - Stop all services
- `docker-compose logs app` - View application logs

## Architecture Overview

**Claude DocFlow** is a Next.js 15 PWA for document management across R6 region branches (22 branches) with external authentication integration.

### Core Technologies
- **Next.js 15.4.1** with App Router and React 19
- **TypeScript 5.8.3** with strict configuration
- **Tailwind CSS 4.1** with shadcn/ui component library
- **Drizzle ORM 0.43.1** with PostgreSQL
- **NextAuth.js v5** with external PWA integration

### DocFlow System Architecture
This application manages document workflow across regional branches:

- **Document Workflow**: `draft` → `sent_to_branch` → `acknowledged` → `sent_back_to_district`
- **Branch Management**: 22 R6 region branches with BA codes and organizational structure
- **PDF Management**: Upload, storage, and viewing with CSP-compliant PDF.js workers
- **Comment System**: Real-time document commenting and collaboration
- **Activity Logging**: Comprehensive audit trail for all document actions
- **Telegram Notifications**: Real-time notifications for document workflow events
- **Settings Management**: Persistent configuration system with file-based storage

### Authentication & Authorization
- **External PWA API**: Authenticates against `PWA_AUTH_URL` endpoint
- **User Synchronization**: PWA user data synced to local PostgreSQL database
- **DocFlow RBAC**: Specialized roles (uploader, branch_user, branch_manager, district_manager)
- **Permission System**: Granular permissions (documents:upload, documents:view, branches:manage)
- **Session Management**: JWT-based sessions with 30-day expiration

### Database Architecture
- **ORM**: Drizzle ORM with PostgreSQL 17.5
- **Schema Location**: `src/db/schema.ts`
- **Core Tables**: users, roles, permissions, user_roles, role_permissions
- **DocFlow Tables**: branches, documents, comments, activity_logs, document_status_history
- **Relationships**: Complex many-to-many relationships with branch-level access control

### Project Structure Patterns
- **App Router**: Next.js 15 App Router with parallel routes (`@authModal`)
- **Component Organization**: Feature-based (`admin/`, `auth/`, `docflow/`, `ui/`)
- **Service Layer**: `src/lib/services/` for business logic (document-service, activity-logger, branch-service, telegram-service, notification-service)
- **API Architecture**: RESTful endpoints in `src/app/api/` with authentication middleware and rate limiting
- **Validation Layer**: Comprehensive Zod schemas with middleware for request validation
- **Type Safety**: Comprehensive TypeScript interfaces and Drizzle schema types

### Key Components

#### Authentication (`src/auth.ts`)
- NextAuth.js v5 configuration with Credentials provider
- External PWA API integration for login validation
- Automatic user creation/update with organizational data sync
- Session extension with PWA user data and branch assignments

#### Document Management (`src/lib/services/document-service.ts`)
- PDF upload validation and secure storage
- Document workflow state management
- Branch-based access control enforcement
- File metadata extraction and storage

#### PDF Viewer (`src/components/docflow/pdf-viewer.tsx`)
- CSP-compliant PDF.js integration with web workers
- Client-side rendering with proper security headers
- Comment overlay system for document annotations

#### Activity Logger (`src/lib/services/activity-logger.ts`)
- Comprehensive audit trail for all document actions
- User activity tracking with IP and timestamp logging
- Integration with document workflow state changes

#### Telegram Integration (`src/lib/services/telegram-service.ts`)
- Telegram Bot API integration with connection testing
- Message formatting and delivery with error handling
- Support for document notifications and system alerts
- Bot token and chat ID validation

#### Notification Service (`src/lib/services/notification-service.ts`)
- Central notification management system
- File-based settings persistence (`./tmp/telegram-settings.json`)
- Real-time document workflow notifications
- System alert broadcasting with severity levels
- Configurable message formatting and notification types

#### Validation Middleware (`src/lib/validation/middleware.ts`)
- Zod-based request validation for all API endpoints
- Comprehensive error handling with standardized responses
- Form data, query parameters, and JSON body validation
- Type-safe parameter extraction and validation

## Environment Variables Required
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pwausers_db
PWA_AUTH_URL=https://your-pwa-auth-endpoint.com/api/login
AUTH_SECRET=your-secure-secret-key
NEXTAUTH_URL=http://localhost:3000
AUTH_TRUST_HOST=true

# Optional: Telegram Bot Configuration (can also be set via UI)
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_CHAT_ID=your-default-chat-id
```

## Development Notes

### DocFlow Initialization
After database setup, initialize DocFlow data:
```bash
pnpm docflow:init
```
This creates branches, roles, and permissions specific to the DocFlow system.

### External PWA Integration
- Login credentials validated against external PWA API
- User data includes organizational structure (costCenter, ba, part, area, branch assignments)
- Local database maintains complete user profile with DocFlow-specific roles
- Branch assignments determine document access permissions

### DocFlow Roles and Permissions
- **uploader**: Can create and upload documents
- **branch_user**: Can view and comment on branch documents
- **branch_manager**: Can manage branch documents and users
- **district_manager**: Can oversee multiple branches and approve workflows

### Telegram Notification System
- **Settings Configuration**: Available in `/settings` page for admin and district managers
- **Notification Types**: Document uploads, status changes, system alerts, daily reports
- **Message Formatting**: Customizable Thai language notifications with emojis
- **Test Functions**: Built-in connection testing and message sending capabilities
- **File Persistence**: Settings stored in `./tmp/telegram-settings.json` for persistence
- **Error Handling**: Graceful degradation when notifications fail (doesn't break document operations)

### Security Considerations
- **Content Security Policy**: Configured in `next.config.js` for PDF worker support
- **File Validation**: PDF mime type and size validation on upload
- **Access Control**: Branch-level document access based on user assignments
- **Audit Trail**: All document actions logged with user and timestamp information
- **Rate Limiting**: API endpoints protected with rate limiting (login, upload, general API)
- **Request Validation**: All API requests validated with Zod schemas
- **Bot Token Security**: Telegram bot tokens stored securely and validated on input

### API Endpoints

#### Telegram API
- `POST /api/telegram/test-connection` - Test bot token validity
- `POST /api/telegram/test-message` - Send test message to verify chat configuration
- `POST /api/telegram/system-alert` - Send system alert notifications
- `GET /api/telegram/settings` - Retrieve current Telegram settings
- `POST /api/telegram/settings` - Save Telegram notification settings

#### Document API (Enhanced with Notifications)
- `POST /api/documents` - Upload document (triggers upload notification)
- `PATCH /api/documents/[id]/status` - Update document status (triggers status change notification)
- `GET /api/documents` - Search and filter documents
- `GET /api/documents/branch/[branchBaCode]` - Get branch-specific documents

#### Rate Limiting
- **Login**: 5 attempts per 15 minutes per IP
- **Upload**: 10 uploads per hour per user
- **API**: 100 requests per 15 minutes per IP

### Testing Setup
No test framework currently configured. When implementing tests:
- Use Jest with Testing Library for React components
- Test document workflow state transitions
- Mock external PWA API calls for authentication tests
- Test branch-based access control logic
- Test Telegram notification integration
- Test rate limiting functionality