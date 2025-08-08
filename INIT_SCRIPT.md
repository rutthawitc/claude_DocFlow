# Database Initialization Script Guide

Comprehensive guide for initializing the DocFlow database with schema, roles, permissions, and R6 branches data.

## Table of Contents
- [Overview](#overview)
- [Available Scripts](#available-scripts)
- [Quick Start](#quick-start)
- [Detailed Usage](#detailed-usage)
- [Script Components](#script-components)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)
- [Advanced Usage](#advanced-usage)

## Overview

The DocFlow system requires proper database initialization with:
- **Database Schema**: 12 tables for users, documents, branches, etc.
- **RBAC System**: 6 roles and 24 permissions
- **R6 Branches**: 22 Thai provincial waterworks branches
- **System Settings**: Default configuration
- **Performance Indexes**: Optimized database performance
- **Admin Users**: Local administrator accounts

## Available Scripts

### 1. **Primary Initialization Script**
- **File**: `scripts/init-docflow-complete.sql`
- **Purpose**: Complete database setup in one command
- **Includes**: Schema + Roles + Permissions + Branches + Indexes + Settings

### 2. **Admin Management Scripts**
- **File**: `scripts/create-local-admin.sql` - Create local admin users
- **File**: `scripts/promote-user-to-admin.sql` - Promote PWA users to admin

### 3. **Development Scripts**
- **File**: `scripts/create-admin.ts` - Interactive admin creation
- **File**: `scripts/init-docflow.ts` - TypeScript-based initialization

## Quick Start

### Docker Environment (Recommended)
```bash
# 1. Start database container
docker-compose -f docker-compose.prod.yml up -d db

# 2. Wait for database to be ready
docker-compose -f docker-compose.prod.yml logs db | grep "ready to accept connections"

# 3. Initialize complete database
docker exec docflow-db psql -U postgres -d pwausers_db -f /scripts/init-docflow-complete.sql

# 4. Create admin user
docker exec docflow-db psql -U postgres -d pwausers_db \
  -v admin_username='admin' \
  -v admin_password='SecureAdmin2024!' \
  -v admin_email='admin@company.com' \
  -f /scripts/create-local-admin.sql
```

### Local Development
```bash
# 1. Start PostgreSQL locally
sudo systemctl start postgresql

# 2. Create database
createdb -U postgres pwausers_db

# 3. Initialize schema
psql -U postgres -d pwausers_db -f scripts/init-docflow-complete.sql

# 4. Create admin (interactive)
npx tsx scripts/create-admin.ts
```

## Detailed Usage

### 1. Complete Database Initialization

#### Using SQL Script (Production)
```bash
# Basic initialization
docker exec docflow-db psql -U postgres -d pwausers_db -f /scripts/init-docflow-complete.sql

# With custom parameters (if script supports)
docker exec docflow-db psql -U postgres -d pwausers_db \
  -v database_name='custom_db' \
  -f /scripts/init-docflow-complete.sql
```

#### Using TypeScript Script (Development)
```bash
# Ensure application is built
pnpm build

# Run TypeScript initialization
npx tsx scripts/init-docflow.ts

# Or with Node.js
node scripts/init-docflow.js
```

### 2. Admin User Management

#### Create Local Admin
```bash
# Method 1: With parameters (recommended)
docker exec docflow-db psql -U postgres -d pwausers_db \
  -v admin_username='localadmin' \
  -v admin_password='StrongPassword123!' \
  -v admin_email='admin@company.com' \
  -v admin_first_name='System' \
  -v admin_last_name='Administrator' \
  -f /scripts/create-local-admin.sql

# Method 2: Edit script defaults
# Edit scripts/create-local-admin.sql and modify:
# \set admin_username 'youradmin'
# Then run:
docker exec docflow-db psql -U postgres -d pwausers_db -f /scripts/create-local-admin.sql
```

#### Promote PWA User to Admin
```bash
# Promote existing PWA user
docker exec docflow-db psql -U postgres -d pwausers_db \
  -v target_username='john.doe' \
  -f /scripts/promote-user-to-admin.sql
```

#### Interactive Admin Creation (Development)
```bash
# Interactive TypeScript script
npx tsx scripts/create-admin.ts

# Follow prompts:
# Username: admin
# Email: admin@company.com
# First Name: System
# Last Name: Administrator
# Password: [hidden input]
# Confirm Password: [hidden input]
```

## Script Components

### Database Schema (`init-docflow-complete.sql`)

#### 1. **Core Tables Created**
```sql
-- User management tables
users                    -- User profiles with PWA integration
roles                    -- System roles (admin, user, etc.)
permissions             -- Granular permissions
user_roles              -- Many-to-many user-role mapping
role_permissions        -- Many-to-many role-permission mapping
sessions                -- JWT session management

-- DocFlow specific tables
branches                -- R6 provincial branches
documents               -- PDF document storage
comments                -- Document annotations
activity_logs           -- Audit trail
document_status_history -- Status change tracking
system_settings         -- Configuration storage
```

#### 2. **Roles and Permissions**
```sql
-- Roles (6 total)
admin                   -- Full system access
district_manager        -- Multi-branch management
branch_manager          -- Branch-level management
branch_user             -- Branch document access
uploader                -- Document upload capability
user                    -- Basic system access

-- Permissions (24 total)
documents:*             -- Document CRUD operations
comments:*              -- Comment management
admin:*                 -- Administrative functions
reports:*               -- Reporting access
settings:*              -- System configuration
notifications:*         -- Notification management
```

#### 3. **R6 Branches Data (22 branches)**
```sql
-- Provincial Waterworks Authority R6 Region
-- BA Codes: 1060-1077, 1133-1135, 1245
-- Examples:
1060 | กปภ.สาขาขอนแก่น(ชั้นพิเศษ)
1061 | กปภ.สาขาบ้านไผ่
1062 | กปภ.สาขาชุมแพ
-- ... (19 more branches)
```

#### 4. **Performance Indexes**
```sql
-- Document indexes
idx_documents_branch_status     -- Branch + status queries
idx_documents_upload_date       -- Date-based sorting
idx_documents_uploader          -- Uploader-based queries

-- Activity log indexes  
idx_activity_logs_user_action   -- User activity tracking
idx_activity_logs_document      -- Document-specific logs

-- User management indexes
idx_user_roles_user            -- User role lookups
idx_role_permissions_role      -- Permission queries
```

#### 5. **System Settings**
```sql
-- Default configuration
maintenance_mode                -- System maintenance toggle
telegram_notifications_enabled -- Notification settings
file_cleanup_retention_days     -- File management
document_upload_max_size_mb     -- Upload limits
session_timeout_minutes         -- Security settings
max_login_attempts              -- Login security
```

## Verification

### 1. **Check Database Structure**
```sql
-- Verify tables created
SELECT 'Tables Created' as status, count(*) as count 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';

-- Check specific tables
\dt
```

### 2. **Verify Roles and Permissions**
```sql
-- Check roles
SELECT name, description FROM roles ORDER BY name;

-- Check permissions
SELECT name, description FROM permissions ORDER BY name;

-- Check role-permission mappings
SELECT r.name as role, count(rp.permission_id) as permissions_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY r.name
ORDER BY r.name;
```

### 3. **Verify Branches Data**
```sql
-- Check R6 branches
SELECT count(*) as total_branches FROM branches WHERE region_code = 'R6';

-- List all branches
SELECT ba_code, name FROM branches ORDER BY ba_code;

-- Verify specific branch ranges
SELECT 
  'Standard Range' as type, count(*) as count 
FROM branches 
WHERE ba_code BETWEEN 1060 AND 1077
UNION
SELECT 
  'Extended Range' as type, count(*) as count 
FROM branches 
WHERE ba_code IN (1133, 1134, 1135, 1245);
```

### 4. **Check System Settings**
```sql
-- Verify default settings
SELECT setting_key, setting_value, setting_type 
FROM system_settings 
ORDER BY setting_key;
```

### 5. **Verify Admin Users**
```sql
-- Check admin users
SELECT 
  u.username,
  u.first_name,
  u.last_name,
  u.is_local_admin,
  STRING_AGG(r.name, ', ') as roles
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE u.is_local_admin = true OR r.name = 'admin'
GROUP BY u.id, u.username, u.first_name, u.last_name, u.is_local_admin;
```

## Troubleshooting

### Common Issues

#### 1. **Database Connection Failed**
```bash
# Check if PostgreSQL is running
docker-compose -f docker-compose.prod.yml ps db

# Check connection parameters
docker exec docflow-db psql -U postgres -c "SELECT version();"

# Check environment variables
docker-compose -f docker-compose.prod.yml exec db env | grep POSTGRES
```

#### 2. **Tables Already Exist**
```sql
-- Drop existing tables (CAUTION: DATA LOSS)
DROP TABLE IF EXISTS 
  document_status_history,
  comments,
  activity_logs,
  documents,
  system_settings,
  sessions,
  role_permissions,
  user_roles,
  permissions,
  roles,
  branches,
  users
CASCADE;

-- Re-run initialization
\i scripts/init-docflow-complete.sql
```

#### 3. **Permission Denied Errors**
```bash
# Check file permissions
ls -la scripts/

# Fix permissions if needed
chmod 644 scripts/*.sql
chmod 755 scripts/*.ts
```

#### 4. **TypeScript Script Errors**
```bash
# Install dependencies
pnpm install

# Build the application
pnpm build

# Check for TypeScript errors
npx tsc --noEmit

# Run with debugging
DEBUG=* npx tsx scripts/init-docflow.ts
```

#### 5. **Duplicate Key Errors**
The scripts use `ON CONFLICT ... DO NOTHING` to handle duplicates safely:
```sql
-- Safe insertion pattern
INSERT INTO roles (name, description) VALUES 
('admin', 'Administrator')
ON CONFLICT (name) DO NOTHING;
```

### Data Recovery

#### Backup Before Initialization
```bash
# Create backup before running scripts
docker exec docflow-db pg_dump -U postgres pwausers_db > backup-before-init.sql

# Restore if needed
docker exec docflow-db psql -U postgres pwausers_db < backup-before-init.sql
```

#### Partial Recovery
```sql
-- Reset only roles and permissions
DELETE FROM role_permissions;
DELETE FROM user_roles WHERE role_id IN (SELECT id FROM roles WHERE name != 'user');
DELETE FROM permissions WHERE name LIKE 'documents:%' OR name LIKE 'admin:%';
DELETE FROM roles WHERE name IN ('uploader', 'branch_user', 'branch_manager', 'district_manager');

-- Re-run specific sections
\i scripts/init-docflow-complete.sql
```

## Advanced Usage

### 1. **Custom Branch Data**
```sql
-- Add additional branches
INSERT INTO branches (ba_code, branch_code, name, region_id, region_code) 
VALUES (9999, 5529999, 'กปภ.สาขาทดสอบ', 6, 'R6');

-- Modify existing branch
UPDATE branches 
SET name = 'Updated Name', is_active = false 
WHERE ba_code = 1060;
```

### 2. **Custom Roles and Permissions**
```sql
-- Add custom role
INSERT INTO roles (name, description) 
VALUES ('custom_role', 'Custom Role Description');

-- Add custom permission
INSERT INTO permissions (name, description) 
VALUES ('custom:action', 'Custom Permission Description');

-- Assign permission to role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'custom_role' AND p.name = 'custom:action';
```

### 3. **Environment-Specific Initialization**
```bash
# Development environment
NODE_ENV=development npx tsx scripts/init-docflow.ts

# Staging environment
NODE_ENV=staging npx tsx scripts/init-docflow.ts

# Production environment (SQL preferred)
docker exec docflow-db psql -U postgres -d pwausers_db -f /scripts/init-docflow-complete.sql
```

### 4. **Automated Initialization**
```bash
#!/bin/bash
# automated-init.sh

# Wait for database
until docker exec docflow-db pg_isready -U postgres; do
  echo "Waiting for database..."
  sleep 2
done

# Initialize database
docker exec docflow-db psql -U postgres -d pwausers_db -f /scripts/init-docflow-complete.sql

# Create admin user
docker exec docflow-db psql -U postgres -d pwausers_db \
  -v admin_username="${ADMIN_USERNAME:-admin}" \
  -v admin_password="${ADMIN_PASSWORD:-DefaultPassword123!}" \
  -v admin_email="${ADMIN_EMAIL:-admin@company.com}" \
  -f /scripts/create-local-admin.sql

echo "Database initialization complete!"
```

### 5. **Health Check Queries**
```sql
-- System health check
SELECT 
  'Database' as component,
  CASE WHEN count(*) > 0 THEN 'OK' ELSE 'FAIL' END as status
FROM information_schema.tables 
WHERE table_name = 'users'

UNION ALL

SELECT 'Branches', count(*)::text FROM branches
UNION ALL
SELECT 'Roles', count(*)::text FROM roles  
UNION ALL
SELECT 'Permissions', count(*)::text FROM permissions
UNION ALL
SELECT 'Admin Users', count(*)::text FROM users WHERE is_local_admin = true;
```

This guide provides comprehensive coverage of database initialization for the DocFlow system, from basic setup to advanced customization and troubleshooting.