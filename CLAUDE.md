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
- **System Settings**: Database-persisted system configuration including maintenance mode
- **Maintenance Mode**: System-wide maintenance toggle with admin controls and user redirection

### Authentication & Authorization

- **External PWA API**: Authenticates against `PWA_AUTH_URL` endpoint
- **User Synchronization**: PWA user data synced to local PostgreSQL database
- **DocFlow RBAC**: Specialized roles (uploader, branch_user, branch_manager, district_manager)
- **Permission System**: Granular permissions (documents:upload, documents:view, branches:manage)
- **Session Management**: Enhanced JWT-based sessions with dual timeout system
  - **Idle Timeout**: 30 minutes of inactivity triggers automatic logout
  - **Absolute Timeout**: 4 hours maximum session duration regardless of activity
  - **Session Warning**: Users notified 5 minutes before expiration with option to extend
  - **Activity Tracking**: Optimized session monitoring without navigation interference

### Database Architecture

- **ORM**: Drizzle ORM with PostgreSQL 17.5
- **Schema Location**: `src/db/schema.ts`
- **Core Tables**: users, roles, permissions, user_roles, role_permissions
- **DocFlow Tables**: branches, documents, comments, activity_logs, document_status_history, system_settings
- **Relationships**: Complex many-to-many relationships with branch-level access control

### Project Structure Patterns

- **App Router**: Next.js 15 App Router with parallel routes (`@authModal`)
- **Component Organization**: Feature-based (`admin/`, `auth/`, `docflow/`, `ui/`)
- **Service Layer**: `src/lib/services/` for business logic (document-service, activity-logger, branch-service, telegram-service, notification-service, system-settings-service)
- **Middleware Layer**: `src/lib/middleware/` with centralized utility functions
  - `api-auth.ts`: Authentication middleware replacing 30+ duplicated auth patterns
  - `api-responses.ts`: Standardized API response patterns
  - `document-upload-handler.ts`: Reusable document upload processing middleware
- **API Architecture**: RESTful endpoints in `src/app/api/` with authentication middleware and rate limiting
- **Validation Layer**: Comprehensive Zod schemas with middleware for request validation
- **Type Safety**: Comprehensive TypeScript interfaces and Drizzle schema types

#### Middleware Architecture Benefits
- **Code Consolidation**: Eliminated ~2,300+ lines of duplicated code
- **Consistent Patterns**: Unified authentication, error handling, and upload processing
- **Improved Maintainability**: Future changes require updates in single utility files
- **Enhanced Security**: Centralized middleware with consistent error handling and validation

### Reference Documentation

- use MCP Context7 for fetches up-to-date code examples and documentation.

### Key Components

#### File Management Service (`src/lib/services/file-management-service.ts`)

- Comprehensive file statistics tracking and reporting
- Automated file cleanup and backup functionality
- Advanced file system health monitoring
- Configurable retention policies via system settings
- Integration with database settings for persistent configuration
- Professional Thai-localized user interface for file management

#### Custom Modal Components

- `FileCleanupModal`: Professional modal for initiating file cleanup
  - Real-time file size and count statistics
  - Configurable cleanup thresholds
  - Thai-localized user interface
- `FileBackupModal`: Secure file backup management interface
  - Backup destination configuration
  - Backup job scheduling
  - Comprehensive backup status reporting

#### Authentication (`src/auth.ts`)

- NextAuth.js v5 configuration with Credentials provider
- External PWA API integration for login validation
- Automatic user creation/update with organizational data sync
- Enhanced session management with dual timeout system (30min idle, 4hr absolute)
- JWT-based session tracking with activity monitoring and timeout validation

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

#### Session Timeout Management (`src/lib/config/session-config.ts`, `src/hooks/useSessionTimeoutSimple.ts`, `src/components/auth/SessionTimeoutWarning.tsx`)

- **Centralized Configuration**: All session timeout values managed in `src/lib/config/session-config.ts`
- **Environment Variable Support**: Configurable timeout values via environment variables
- **Dual Timeout System**: 4-hour absolute timeout and 30-minute idle timeout
- **Client-side Monitoring**: Real-time session status checking with 30-second intervals
- **User Warning System**: 5-minute warning before session expiration with extension option
- **Automatic Logout**: Seamless logout with timeout-specific redirect messages
- **Type Safety**: TypeScript interfaces and validation for all timeout configurations
- **Optimized Performance**: Prevention of navigation interference during timeout checks
- **Thai Localization**: Complete Thai language support for all timeout-related messages

#### System Settings Service (`src/lib/services/system-settings-service.ts`)

- Complete CRUD operations for persistent system configuration
- Type-safe settings management with validation and default values
- Maintenance mode management with database persistence
- Settings initialization and default configuration management
- Support for multiple setting types (boolean, string, number, JSON)

## Environment Variables Required

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/docflow_db
PWA_AUTH_URL=https://your-pwa-auth-endpoint.com/api/login
AUTH_SECRET=your-secure-secret-key
NEXTAUTH_URL=http://localhost:3000
AUTH_TRUST_HOST=true

# Optional: Telegram Bot Configuration (can also be set via UI)
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_CHAT_ID=your-default-chat-id

# Optional: Session Timeout Configuration (defaults will be used if not set)
SESSION_ABSOLUTE_TIMEOUT_SECONDS=14400  # 4 hours
SESSION_IDLE_TIMEOUT_SECONDS=1800       # 30 minutes  
SESSION_WARNING_TIME_SECONDS=300        # 5 minutes

# Optional: Redis Configuration for Caching (falls back to in-memory if not configured)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0
REDIS_KEY_PREFIX=docflow:

# Optional: Document Upload Configuration
NEXT_PUBLIC_MONTH_YEAR_FUTURE_YEARS=1
NEXT_PUBLIC_MONTH_YEAR_PAST_YEARS=1
```

## Development Notes

### DocFlow Initialization

After database setup, initialize DocFlow data:

```bash
pnpm docflow:init
```

This creates branches, roles, and permissions specific to the DocFlow system.

### Document Upload Configuration

The month/year dropdown in document upload forms is dynamically generated based on the current date. You can customize the year range using environment variables:

- `NEXT_PUBLIC_MONTH_YEAR_FUTURE_YEARS`: Number of years to show in the future (default: 1)
- `NEXT_PUBLIC_MONTH_YEAR_PAST_YEARS`: Number of years to show in the past (default: 1)

For example, if it's 2025 (2568 Buddhist era) and you set:

- `NEXT_PUBLIC_MONTH_YEAR_FUTURE_YEARS=3`
- `NEXT_PUBLIC_MONTH_YEAR_PAST_YEARS=1`

The dropdown will show months from 2567 to 2571 (Buddhist era).

### Shadcn UI components

- Always use official CLI tools first when available
- Don't try to create custom components when official ones exist
- shadcn/ui provides reliable, tested components through their CLI
- Custom implementations should be last resort, not first approach
- Use official components as much as possible
- Use shadcn/ui components as a starting point

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
- **File Management Security**:
  - Secure file cleanup with role-based access control
  - Encrypted file backup mechanisms
  - Configurable file retention policies
  - Comprehensive file system monitoring and reporting
  - Protection against unauthorized file system modifications
- **Rate Limiting**: API endpoints protected with rate limiting (login, upload, general API)
- **Request Validation**: All API requests validated with Zod schemas
- **Bot Token Security**: Telegram bot tokens stored securely and validated on input

### API Endpoints

#### File Management API

- `GET /api/files/management` - Retrieve current file system statistics
- `POST /api/files/management/cleanup` - Initiate file cleanup process
- `POST /api/files/management/backup` - Trigger manual file backup
- `PUT /api/files/management/settings` - Update file management configuration

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

#### System Settings API

- `GET /api/system-settings` - Retrieve current system settings
- `PUT /api/system-settings` - Update system settings (admin/district_manager only)
- `POST /api/system-settings` - Initialize default system settings

#### Maintenance Mode API

- `GET /api/test-maintenance` - Check maintenance mode status (development)
- `POST /api/test-maintenance` - Toggle maintenance mode (development)

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
- Test maintenance mode functionality and system settings management

### Maintenance Mode System

- **Configuration**: Available in `/settings` page for admin and district_manager roles
- **Database Persistence**: System settings stored in `system_settings` table with type-safe management
- **User Experience**: Professional maintenance page at `/maintenance` with Thai localization and real-time clock
- **Admin Override**: Emergency access using `?admin=1` parameter for administrators
- **API Protection**: Maintenance mode doesn't block API endpoints or critical system functions
- **Middleware Integration**: Automatic user redirection when maintenance mode is enabled
- **Error Handling**: Graceful fallback behavior when maintenance checks fail

---

## Research Query

show me auth work flow.

*Session: 6d33147a8f071b93446f9cbffd89eca2 | Generated: 8/13/2025, 10:40:11 AM*

### Analysis Summary

# Authentication Workflow Report

This report outlines the authentication workflow within the DocFlow application, detailing the key components, their responsibilities, and their interactions.

## High-Level Architecture

The authentication system is primarily handled by the **Next.js backend** for credential verification and session management, with **Next.js frontend components** providing the user interface for login. Middleware intercepts requests to enforce authentication, and a database stores user and session information.

*   **Frontend (UI)**: Handles user input for login and displays authentication-related modals.
*   **Backend (Next.js API Routes/Server Actions)**: Processes login requests, verifies credentials, creates sessions, and manages user roles.
*   **Middleware**: Protects routes by checking authentication status before allowing access.
*   **Database**: Stores user credentials (hashed), roles, and session information.

## Mid-Level Workflow: User Login

The user login process involves the following steps and components:

### 1. User Interface and Input

The primary entry point for user authentication is the login page or an authentication modal.

*   **Login Page**: [src/app/login/page.tsx](src/app/login/page.tsx)
    *   Provides the form for users to enter their credentials.
*   **Authentication Modal**: [src/app/@authModal/login/page.tsx](src/app/@authModal/login/page.tsx)
    *   An intercepting route that displays the login form as a modal over the current page.
*   **Auth Components**: [src/components/auth/](src/components/auth/)
    *   Contains reusable UI components related to authentication, such as forms and buttons.

### 2. Credential Submission and Server Actions

When a user submits their credentials, a **Server Action** is invoked to handle the authentication logic on the server.

*   **Auth Actions**: [src/actions/auth.ts](src/actions/auth.ts)
    *   Contains the `login` function responsible for processing the submitted credentials.
    *   This function interacts with the authentication library to verify the user.

### 3. Authentication Core Logic

The core authentication logic, including credential verification and session management, is encapsulated within the **Auth.js (NextAuth.js)** configuration.

*   **Auth Configuration**: [src/auth.ts](src/auth.ts)
    *   Defines the authentication providers (e.g., Credentials provider).
    *   Configures callbacks for session management (`jwt`, `session`).
    *   The `authorize` function within the Credentials provider is crucial for validating user input against the database.
    *   It uses the **Drizzle ORM** to query the database for user information.
    *   It handles password hashing and comparison using `bcryptjs`.

### 4. Session Management

Upon successful authentication, a session is established, and user information is stored.

*   **Session Provider**: [src/context/auth-context.tsx](src/context/auth-context.tsx)
    *   Provides the authentication context to client components, allowing them to access session data.
*   **Session Handling in Auth.js**: [src/auth.ts](src/auth.ts)
    *   The `jwt` callback in [src/auth.ts](src/auth.ts) is responsible for persisting user information (like ID, email, roles) into the JWT token.
    *   The `session` callback then exposes this information to the client-side session object.

### 5. Route Protection with Middleware

The **Next.js Middleware** is used to protect routes, ensuring that only authenticated users can access certain parts of the application.

*   **Middleware**: [middleware.ts](middleware.ts)
    *   Intercepts incoming requests.
    *   Checks the authentication status of the request using the configured Auth.js instance.
    *   Redirects unauthenticated users to the login page or an unauthorized page.
    *   It also handles authorization based on roles and permissions.

## Low-Level Implementation Details

### Database Interaction

*   **Database Schema**: [src/db/schema.ts](src/db/schema.ts)
    *   Defines the `users` and `sessions` tables, including fields for `email`, `passwordHash`, `role`, etc.
*   **Database Connection**: [src/db/index.ts](src/db/index.ts) and [src/db/server.ts](src/db/server.ts)
    *   Establishes the connection to the PostgreSQL database using Drizzle ORM.

### Security Measures

*   **CSRF Protection**: [src/lib/csrf.ts](src/lib/csrf.ts)
    *   Provides utilities for Cross-Site Request Forgery protection, although its direct integration with Auth.js might be implicit or handled by Next.js's built-in protections for Server Actions.
*   **Rate Limiting**: [src/lib/rate-limit.ts](src/lib/rate-limit.ts)
    *   Implements rate limiting to prevent brute-force attacks on authentication endpoints. This is typically applied at the API route or middleware level.

### Utility Functions

*   **Utils**: [src/lib/utils.ts](src/lib/utils.ts)
    *   May contain general utility functions used across the application, potentially including helpers for authentication-related tasks like hashing or token manipulation.
*   **Auth Utilities**: [src/lib/auth/](src/lib/auth/)
    *   This directory would contain any specific helper functions or types related to authentication that are not part of the main Auth.js configuration.
*   **Security Utilities**: [src/lib/security/](src/lib/security/)
    *   Contains functions related to general security practices, which might be leveraged by the authentication system.

---

## Research Query

where is session time definition ?

*Session: cda5cde822ddbe646b512837406f7bdd | Generated: 8/13/2025, 3:38:05 PM*

### Analysis Summary

# Codebase Analysis Report: Session Time Definition

This report details the definition and implementation of session timeouts within the codebase, covering both server-side configuration and client-side handling.

## High-Level Overview

Session time definitions are primarily managed by **NextAuth.js** on the server-side, configured in [src/auth.ts](src/auth.ts). These server-side settings dictate the absolute and idle timeouts for user sessions. On the client-side, a custom React hook, [useSessionTimeout](src/hooks/useSessionTimeoutSimple.ts), consumes these definitions to provide real-time session status, warnings, and automatic logout functionality.

## Mid-Level: Session Configuration

The core session timeout parameters are defined within the `session` object of the NextAuth.js configuration in [src/auth.ts](src/auth.ts).

### NextAuth.js Session Configuration

*   **Purpose**: Configures how user sessions are managed, including their strategy and duration.
*   **Internal Parts**:
    *   `strategy: 'jwt'`: Specifies that JSON Web Tokens (JWTs) are used for session management.
    *   `maxAge`: Defines the absolute maximum age of a session.
    *   `updateAge`: Defines the idle timeout for a session, after which it will be updated if there is activity.
*   **External Relationships**: These configurations directly influence the behavior of the `jwt` callback and the client-side session management.

**Relevant Code**:
The session configuration is found in [src/auth.ts:198-202](src/auth.ts:198-202):
```typescript
  session: {
    strategy: 'jwt',
    maxAge: 4 * 60 * 60, // 4 hours absolute timeout
    updateAge: 30 * 60, // 30 minutes idle timeout - session updates every 30 minutes
  },
```
*   **Absolute Timeout**: `maxAge: 4 * 60 * 60` (4 hours).
*   **Idle Timeout**: `updateAge: 30 * 60` (30 minutes).

## Low-Level: Implementation Details

### JWT Callback in NextAuth.js

The `jwt` callback in [src/auth.ts](src/auth.ts) is responsible for enforcing both idle and absolute session timeouts by inspecting the JWT.

*   **Purpose**: Processes the JWT on each request, updating activity timestamps and checking for session expiration.
*   **Internal Parts**:
    *   `token.lastActivity`: A custom field added to the JWT to track the last user activity timestamp.
    *   Idle timeout logic: Compares current time with `token.lastActivity`.
    *   Absolute timeout logic: Compares current time with `token.iat` (token issuance time).
*   **External Relationships**: Receives the JWT and user data, and can return `null` to force re-authentication if a timeout is detected.

**Relevant Code**:
The `jwt` callback is found in [src/auth.ts:165-187](src/auth.ts:165-187):
```typescript
    async jwt({ token, user, trigger }) {
      const now = Math.floor(Date.now() / 1000);

      if (user) {
        // New login - set creation time and last activity
        // ...
        token.iat = now; // Set creation time
        token.lastActivity = now; // Set initial activity time
      } else if (trigger === 'update' || !token.lastActivity) {
        // Update activity time on token refresh/update
        token.lastActivity = now;
      }

      // Check idle timeout (30 minutes = 1800 seconds)
      if (token.lastActivity && now - (token.lastActivity as number) > 30 * 60) {
        console.log('Session idle timeout exceeded');
        return null; // Force re-authentication
      }

      // Check absolute timeout (4 hours = 14400 seconds)
      if (token.iat && now - (token.iat as number) > 4 * 60 * 60) {
        console.log('Session absolute timeout exceeded');
        return null; // Force re-authentication
      }

      return token;
    },
```

### Client-Side Session Timeout Hook

The [useSessionTimeout](src/hooks/useSessionTimeoutSimple.ts) hook provides client-side session management, including displaying warnings and initiating logout.

*   **Purpose**: Manages the client-side representation of the session, providing visual cues and handling automatic logout based on server-defined timeouts.
*   **Internal Parts**:
    *   `SessionTimeoutOptions` interface: Allows configuration of `warningTime`, `checkInterval`, and `enableActivityTracking`.
    *   `timeLeft` state: Tracks the remaining time until session expiration.
    *   `showWarning` state: Controls the visibility of session warning messages.
*   **External Relationships**: Utilizes `useSession` from `next-auth/react` to get session expiration data and `signOut` to log out the user.

**Relevant Code**:
The `SessionTimeoutOptions` interface is defined in [src/hooks/useSessionTimeoutSimple.ts:12-17](src/hooks/useSessionTimeoutSimple.ts:12-17):
```typescript
interface SessionTimeoutOptions {
  warningTime?: number; // Seconds before expiration to show warning (default: 300 = 5 minutes)
  checkInterval?: number; // How often to check session in milliseconds (default: 30000 = 30 seconds)
  enableActivityTracking?: boolean; // Enable automatic activity tracking (default: false)
  activityUpdateThrottle?: number; // Throttle activity updates in milliseconds (default: 300000 = 5 minutes)
}
```
The `useSessionTimeout` hook's core logic for checking expiration is in [src/hooks/useSessionTimeoutSimple.ts:100-116](src/hooks/useSessionTimeoutSimple.ts:100-116):
```typescript
      if (sessionExp) {
        const remaining = sessionExp - now;
        setTimeLeft(remaining);

        // Show warning before expiration
        if (remaining <= warningTime && remaining > 0 && !warningShownRef.current) {
          setShowWarning(true);
          warningShownRef.current = true;
        }

        // Auto logout when session expires
        if (remaining <= 0) {
          console.log('Session expired, signing out');
          signOut({ callbackUrl: '/login?expired=1' });
        }
      }
```

