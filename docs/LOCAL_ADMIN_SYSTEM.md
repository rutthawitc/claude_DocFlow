# DocFlow Local Admin Management System

## Overview
The Local Admin System provides a secure, comprehensive mechanism for managing administrative users directly within the DocFlow application. This system allows district managers and system administrators to create, manage, and control local admin accounts with role-based access control.

## Key Features

### 1. User Management
- Create new local admin users with username and password
- Edit existing admin user information
- Assign and manage roles for admin users
- View comprehensive list of current admin users
- Delete non-admin users from the system

### 2. Security Implementations
- Secure password hashing using bcrypt
- Prevention of self-deletion for admin accounts
- Role-based access control for admin user management
- Comprehensive input validation and error handling

## Components

### LocalAdminService (`src/lib/auth/local-admin.ts`)
- Handles all admin user operations
- Implements secure password management
- Manages user role assignments
- Provides methods for user creation, update, and deletion

### Database Schema (`src/db/schema.ts`)
Additions to user schema:
- `password`: Securely hashed admin password
- `isLocalAdmin`: Boolean flag to identify local admin users

### API Endpoints
- `POST /api/admin/users`: Create new admin user
- `PUT /api/admin/users/:id`: Update existing user
- `DELETE /api/admin/users/:id`: Delete user
- `GET /api/admin/users`: List all users

### CLI Script (`scripts/create-admin.ts`)
Interactive command-line tool for:
- Creating initial admin users
- Generating admin accounts with secure, random passwords
- Handling role assignments during user creation

## Security Considerations
- Passwords are never stored in plain text
- Bcrypt used for one-way password hashing
- Strict role-based access control
- Comprehensive input validation
- Error handling prevents information disclosure

## Usage Instructions

### Creating an Admin User via CLI
```bash
pnpm run create-admin
# Interactive prompts will guide you through admin user creation
```

### API Usage
```typescript
// Creating a new admin user
const newAdmin = await localAdminService.createUser({
  username: 'adminuser',
  password: 'securePassword123',
  roles: ['admin', 'district_manager']
});

// Updating an existing user
await localAdminService.updateUser(userId, {
  roles: ['admin']
});
```

## Access Control
- Only users with `admin` or `district_manager` roles can access admin user management
- Strict permission checks prevent unauthorized user modifications

## Error Handling
- Descriptive error messages for validation failures
- Secure error responses that don't reveal sensitive system information

## Future Enhancements
- Two-factor authentication for admin accounts
- IP-based access restrictions
- Comprehensive audit logging for admin actions