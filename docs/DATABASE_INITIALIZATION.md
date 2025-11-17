# Database Initialization Guide

## Table of Contents

1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Complete Setup Process](#complete-setup-process)
5. [Known Issues & Workarounds](#known-issues--workarounds)
6. [Verification](#verification)
7. [Troubleshooting](#troubleshooting)
8. [What Gets Initialized](#what-gets-initialized)
9. [Maintenance](#maintenance)

---

## Introduction

The DocFlow application includes a comprehensive database initialization system that sets up all necessary database structures, configurations, and default data in a single command. This system handles:

- **Schema Migrations**: Drizzle ORM migration files that define the database structure
- **Branch Data**: Initialization of 22 R6 region branches and 5 BA1059 departments
- **Document Columns**: Automatic verification and creation of all document table columns
- **Roles & Permissions**: Setup of 6 DocFlow roles with 24 permissions for role-based access control
- **Performance Indexes**: Creation of 35+ database indexes for query optimization
- **System Settings**: Initialization of 6 core system configuration settings
- **Supporting Tables**: Creation of tables for documents, comments, activity logs, and more

The initialization is idempotent, meaning you can safely run it multiple times without causing errors—existing data will not be duplicated.

---

## Prerequisites

Before running the database initialization, ensure you have:

### Required Services

- **Docker & Docker Compose**: For running PostgreSQL and pgAdmin containers
- **PostgreSQL 17.5+**: Running in Docker container named `docflow-db`
- **Node.js 18+**: For running Node scripts
- **pnpm 10.14.0+**: Package manager (specified in `package.json`)

### Required Configuration

- **DATABASE_URL Environment Variable**: Connection string to your PostgreSQL database
  ```
  postgresql://postgres:postgres@localhost:5432/docflow_db
  ```

- **Docker Services Running**: Verify containers are active
  ```bash
  docker-compose ps
  # Should show: docflow-db (postgres), pgadmin, and other services running
  ```

### Recommended Verification

```bash
# Verify Docker setup
docker-compose ps

# Verify pnpm installation
pnpm --version

# Verify node installation
node --version
```

---

## Quick Start

For developers who want a quick database setup:

```bash
# 1. Start Docker services
docker-compose up -d

# 2. Run initialization (uses DATABASE_URL from .env)
pnpm init:db

# 3. Create admin user
pnpm admin:create

# 4. Start development server
pnpm dev
```

Expected output from `pnpm init:db`:
```
🚀 Starting DocFlow Database Initialization...

📡 Testing database connection...
✅ Database connection successful

📋 Ensuring all document columns exist...
  ✓ Column additional_docs_due_dates ensured
  ✓ Column send_back_original_document ensured
  ✓ Column send_back_date ensured
  [... more columns ...]
✅ All document columns verified

📋 Ensuring emendation_documents table exists...
  ✓ emendation_documents table ensured
✅ emendation_documents table verified

🏢 Initializing R6 branches...
✅ R6 branches initialized

🏛️ Initializing BA1059 departments...
✅ 5 BA1059 departments initialized

👥 Setting up DocFlow roles and permissions...
✅ Roles and permissions setup complete

⚡ Creating database indexes...
  ✓ idx_documents_branch_status
  ✓ idx_documents_status_created
  [... 30+ more indexes ...]
✅ Indexes verified (35 created, 0 existing)

⚙️ Initializing system settings...
  ✓ maintenance_mode
  ✓ telegram_notifications_enabled
  ✓ file_cleanup_retention_days
  ✓ document_upload_max_size_mb
  ✓ session_timeout_minutes
  ✓ max_login_attempts
✅ System settings initialized

🎉 DocFlow Database Initialization Completed Successfully!

📋 Summary:
  ✓ All document columns verified and created
  ✓ 22 R6 branches initialized
  ✓ 5 BA1059 departments initialized
  ✓ 6 DocFlow roles and 24 permissions created
  ✓ 35+ performance indexes optimized
  ✓ 6 system settings initialized

🔗 Next steps:
  1. Create an admin user: pnpm admin:create
  2. Start the application: pnpm dev
  3. Login and assign user roles
  4. Begin uploading documents
```

---

## Complete Setup Process

### Step 1: Start Docker Services

Start all required containers (PostgreSQL, pgAdmin, application):

```bash
docker-compose up -d
```

Verify all services are running:

```bash
docker-compose ps
```

Expected output:
```
NAME          COMMAND                  SERVICE      STATUS
docflow-db    "docker-entrypoint.s…"   postgres     Up 2 minutes
pgadmin       "/entrypoint.sh"         pgadmin      Up 2 minutes
docflow-app   "npm run dev"            app          Up 2 minutes (or exited)
```

#### pgAdmin Access

- **URL**: http://localhost:5050
- **Username**: admin@docflow.local
- **Password**: docflow_password_2025
- **Server Address**: docflow-db
- **Database Port**: 5432

### Step 2: Prepare Database (Fresh Start Only)

If you're starting with an existing database and want to reset it completely, use this procedure:

```bash
# Terminate all active connections to the database
docker exec docflow-db psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'docflow_db' AND pid <> pg_backend_pid();"

# Drop the existing database
docker exec docflow-db psql -U postgres -c "DROP DATABASE IF EXISTS docflow_db;"

# Create a fresh database
docker exec docflow-db psql -U postgres -c "CREATE DATABASE docflow_db;"
```

Warning: This operation is destructive and cannot be undone. Only perform this if you need to start from scratch.

### Step 3: Apply Drizzle Migrations

The Drizzle migrations create the base database schema (tables, columns, relationships). These are located in the `drizzle/` directory:

```bash
# Option A: Automated migration application (handles the duplicate 0009 issue)
for i in {0..8}; do
  file=$(ls drizzle/$(printf "%04d" $i)_*.sql 2>/dev/null | head -1)
  if [ -f "$file" ]; then
    echo "Applying $(basename $file)..."
    docker exec -i docflow-db psql -U postgres -d docflow_db < "$file"
  fi
done

# Apply both 0009 migrations (workaround for duplicate numbering)
echo "Applying first 0009 migration..."
docker exec -i docflow-db psql -U postgres -d docflow_db < drizzle/0009_add_essential_indexes.sql
echo "Applying second 0009 migration..."
docker exec -i docflow-db psql -U postgres -d docflow_db < drizzle/0009_dry_vance_astro.sql
```

**Migration Files Applied:**
```
✓ 0000_funny_squadron_supreme.sql    - Base schema (users, roles, permissions)
✓ 0001_black_magus.sql               - Sessions and authentication tables
✓ 0002_round_chameleon.sql           - DocFlow branches and documents
✓ 0003_clever_sabretooth.sql         - Comments and activity logs
✓ 0004_flawless_shiver_man.sql       - Document status history
✓ 0005_cute_warstar.sql              - Additional document files
✓ 0006_curly_hemingway.sql           - PDF handling and storage
✓ 0007_conscious_matthew_murdock.sql - Document corrections
✓ 0008_ambiguous_wildside.sql        - Extended document metadata
✓ 0009_add_essential_indexes.sql     - Base performance indexes
✓ 0009_dry_vance_astro.sql           - Additional optimization indexes
```

### Step 4: Run DocFlow Initialization

This step populates the database with DocFlow-specific data:

```bash
# Using environment variable
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/docflow_db" pnpm init:db

# Or if DATABASE_URL is in .env
pnpm init:db
```

This command will:
- Verify all document table columns exist
- Ensure the `emendation_documents` table exists
- Initialize 22 R6 region branches
- Initialize 5 BA1059 departments
- Set up 6 DocFlow roles with 24 permissions
- Create 35+ performance indexes
- Initialize 6 system settings

### Step 5: Create Admin User

Create the first admin user to access the system:

```bash
pnpm admin:create
```

Follow the prompts:
```
? Enter username: admin
? Enter email: admin@docflow.local
? Enter password: ••••••••••••••••
? Confirm password: ••••••••••••••••

✅ Admin user created successfully!
Username: admin
Email: admin@docflow.local
```

### Step 6: Start Development Server

Launch the development server:

```bash
pnpm dev
```

You should see:
```
▲ Next.js 15.4.1
- Local:        http://localhost:3000
- Environments: .env

✓ Ready in 3.2s
```

### Step 7: Login and Configure

1. **Open** http://localhost:3000 in your browser
2. **Login** with the admin credentials created in Step 5
3. **Assign Roles** to users (Settings → User Management)
4. **Configure Telegram** notifications (Settings → Notification Settings)
5. **Start Uploading** documents

---

## Known Issues & Workarounds

### Issue: Duplicate Migration File Numbers

**Problem**: There are two Drizzle migration files with the number `0009`:

```
drizzle/0009_add_essential_indexes.sql
drizzle/0009_dry_vance_astro.sql
```

When running migration loops, only the first file matching the pattern is applied, leaving the second one unexecuted.

**Root Cause**: Both files were generated by Drizzle migrations system with the same number. This is a known Drizzle limitation when multiple migrations are created in quick succession.

**Impact**: Missing indexes can lead to slower database queries, but the application will still function.

**Workaround 1: Manual Application (Recommended)**

Apply both files manually:

```bash
# Apply the first 0009 migration
docker exec -i docflow-db psql -U postgres -d docflow_db < drizzle/0009_add_essential_indexes.sql

# Apply the second 0009 migration
docker exec -i docflow-db psql -U postgres -d docflow_db < drizzle/0009_dry_vance_astro.sql
```

**Workaround 2: Rename the File**

Rename the second file to `0010`:

```bash
mv drizzle/0009_dry_vance_astro.sql drizzle/0010_dry_vance_astro.sql

# Then run migrations normally
for i in {0..10}; do
  file=$(ls drizzle/$(printf "%04d" $i)_*.sql 2>/dev/null | head -1)
  if [ -f "$file" ]; then
    docker exec -i docflow-db psql -U postgres -d docflow_db < "$file"
  fi
done
```

**Workaround 3: Verify Both Files Are Applied**

After initialization, verify both 0009 migrations were applied:

```bash
docker exec docflow-db psql -U postgres -d docflow_db -c "\d"
```

Look for indexes like `idx_documents_branch_status`, `idx_activity_logs_user_action`, etc. to confirm both migrations ran.

---

## Verification

After completing the initialization steps, verify the setup with these checks:

### 1. Database Connection

```bash
docker exec docflow-db psql -U postgres -d docflow_db -c "SELECT 'Connected!' as status;"
```

Expected output:
```
 status
───────
 Connected!
(1 row)
```

### 2. Tables Count

Verify all 15 tables exist:

```bash
docker exec docflow-db psql -U postgres -d docflow_db -c "\dt"
```

Expected output:
```
           List of relations
 Schema |          Name           | Type  | Owner
────────────────────────────────────────────────────
 public | activity_logs           | table | postgres
 public | additional_document_correction_tracking | table | postgres
 public | additional_document_files | table | postgres
 public | branches                | table | postgres
 public | comments                | table | postgres
 public | document_status_history | table | postgres
 public | documents               | table | postgres
 public | documents_additional_docs_due_dates_idx | table | postgres
 public | emendation_documents    | table | postgres
 public | permissions             | table | postgres
 public | role_permissions        | table | postgres
 public | roles                   | table | postgres
 public | sessions                | table | postgres
 public | system_settings         | table | postgres
 public | user_roles              | table | postgres
 public | users                   | table | postgres
(16 rows)
```

### 3. Branches Verification

Verify 27 branches exist (22 R6 + 5 BA1059):

```bash
docker exec docflow-db psql -U postgres -d docflow_db -c "SELECT COUNT(*) as total_branches FROM branches;"
```

Expected output:
```
 total_branches
────────────────
             27
(1 row)
```

View all branch names:

```bash
docker exec docflow-db psql -U postgres -d docflow_db -c "SELECT ba_code, name FROM branches ORDER BY ba_code LIMIT 10;"
```

Expected output (first 10):
```
 ba_code |                 name
─────────────────────────────────────────────────
    1001 | กปภ.ชุมพร
    1002 | กปภ.สุราษฎร์ธานี
    1003 | กปภ.นครศรีธรรมราช
    1004 | กปภ.พัทลุง
    1005 | กปภ.สตูล
    1006 | กปภ.ตรัง
    1007 | กปภ.กระบี่
    1008 | กปภ.ภูเก็ต
    1009 | กปภ.พังงา
    1010 | กปภ.เพชรบูรณ์
(10 rows)
```

### 4. Roles Verification

Verify 6 roles exist:

```bash
docker exec docflow-db psql -U postgres -d docflow_db -c "SELECT name FROM roles ORDER BY name;"
```

Expected output:
```
        name
──────────────────────────
 admin
 branch_manager
 branch_user
 district_manager
 uploader
 view_only
(6 rows)
```

### 5. Permissions Verification

Verify 24 permissions exist:

```bash
docker exec docflow-db psql -U postgres -d docflow_db -c "SELECT COUNT(*) as total_permissions FROM permissions;"
```

Expected output:
```
 total_permissions
────────────────────
                24
(1 row)
```

View all permissions:

```bash
docker exec docflow-db psql -U postgres -d docflow_db -c "SELECT name FROM permissions ORDER BY name;"
```

### 6. Indexes Verification

Verify 35+ indexes exist:

```bash
docker exec docflow-db psql -U postgres -d docflow_db -c "SELECT COUNT(*) as total_indexes FROM pg_indexes WHERE schemaname = 'public';"
```

Expected output:
```
 total_indexes
──────────────
             35
(1 row)
```

View critical indexes:

```bash
docker exec docflow-db psql -U postgres -d docflow_db -c "SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%' ORDER BY indexname LIMIT 10;"
```

### 7. System Settings Verification

Verify 6 system settings exist:

```bash
docker exec docflow-db psql -U postgres -d docflow_db -c "SELECT setting_key, setting_value FROM system_settings ORDER BY setting_key;"
```

Expected output:
```
           setting_key           | setting_value
──────────────────────────────────────────────────
 document_upload_max_size_mb     | 50
 file_cleanup_retention_days     | 365
 maintenance_mode                | false
 max_login_attempts              | 5
 session_timeout_minutes         | 30
 telegram_notifications_enabled  | false
(6 rows)
```

### 8. Admin User Verification

Verify your admin user exists:

```bash
docker exec docflow-db psql -U postgres -d docflow_db -c "SELECT username, email FROM users WHERE is_local_admin = true;"
```

Expected output:
```
 username |        email
──────────────────────────────
 admin    | admin@docflow.local
(1 row)
```

### 9. Complete Health Check

Run this comprehensive health check:

```bash
#!/bin/bash
echo "=== DocFlow Database Initialization Health Check ==="
echo ""

echo "1. Database Connection:"
docker exec docflow-db psql -U postgres -d docflow_db -c "SELECT version();" > /dev/null && echo "   ✓ Connected" || echo "   ✗ Failed"

echo "2. Tables (expect 15+):"
TABLE_COUNT=$(docker exec docflow-db psql -U postgres -d docflow_db -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | grep -oP '\d+' | head -1)
echo "   $([ $TABLE_COUNT -ge 15 ] && echo '✓' || echo '✗') Found $TABLE_COUNT tables"

echo "3. Branches (expect 27):"
BRANCH_COUNT=$(docker exec docflow-db psql -U postgres -d docflow_db -c "SELECT COUNT(*) FROM branches;" | grep -oP '\d+' | head -1)
echo "   $([ $BRANCH_COUNT -eq 27 ] && echo '✓' || echo '✗') Found $BRANCH_COUNT branches"

echo "4. Roles (expect 6):"
ROLE_COUNT=$(docker exec docflow-db psql -U postgres -d docflow_db -c "SELECT COUNT(*) FROM roles;" | grep -oP '\d+' | head -1)
echo "   $([ $ROLE_COUNT -eq 6 ] && echo '✓' || echo '✗') Found $ROLE_COUNT roles"

echo "5. Permissions (expect 24):"
PERM_COUNT=$(docker exec docflow-db psql -U postgres -d docflow_db -c "SELECT COUNT(*) FROM permissions;" | grep -oP '\d+' | head -1)
echo "   $([ $PERM_COUNT -eq 24 ] && echo '✓' || echo '✗') Found $PERM_COUNT permissions"

echo "6. Indexes (expect 35+):"
INDEX_COUNT=$(docker exec docflow-db psql -U postgres -d docflow_db -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';" | grep -oP '\d+' | head -1)
echo "   $([ $INDEX_COUNT -ge 35 ] && echo '✓' || echo '✗') Found $INDEX_COUNT indexes"

echo "7. System Settings (expect 6):"
SETTING_COUNT=$(docker exec docflow-db psql -U postgres -d docflow_db -c "SELECT COUNT(*) FROM system_settings;" | grep -oP '\d+' | head -1)
echo "   $([ $SETTING_COUNT -eq 6 ] && echo '✓' || echo '✗') Found $SETTING_COUNT settings"

echo ""
echo "=== Health Check Complete ==="
```

---

## Troubleshooting

### Problem: "Connection refused" when running `pnpm init:db`

**Possible Causes:**
1. Docker containers not running
2. Incorrect DATABASE_URL environment variable
3. PostgreSQL service not ready

**Solutions:**

```bash
# Check if Docker containers are running
docker-compose ps

# If not running, start them
docker-compose up -d

# Wait for PostgreSQL to be ready (takes 10-15 seconds)
sleep 15

# Test connection manually
docker exec docflow-db psql -U postgres -c "SELECT 1;"

# Verify DATABASE_URL is set correctly
echo $DATABASE_URL
# Should output: postgresql://postgres:postgres@localhost:5432/docflow_db

# If empty, set it before running init
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/docflow_db"
pnpm init:db
```

### Problem: "Database docflow_db does not exist"

**Possible Causes:**
1. Database was not created properly
2. Using wrong database name in DATABASE_URL

**Solutions:**

```bash
# Create the database manually
docker exec docflow-db psql -U postgres -c "CREATE DATABASE docflow_db;"

# Verify it exists
docker exec docflow-db psql -U postgres -c "\l"

# Then run initialization
pnpm init:db
```

### Problem: "Permission denied" when reading migration files

**Possible Causes:**
1. File permissions are incorrect
2. User doesn't have read access to drizzle directory

**Solutions:**

```bash
# Check file permissions
ls -la drizzle/

# If needed, fix permissions
chmod 644 drizzle/*.sql
chmod 755 drizzle/

# Retry applying migrations
docker exec -i docflow-db psql -U postgres -d docflow_db < drizzle/0009_add_essential_indexes.sql
```

### Problem: "Duplicate key value violates unique constraint"

**Possible Causes:**
1. Data already exists from previous initialization
2. Running initialization twice without clearing database

**Solutions:**

```bash
# Check existing data
docker exec docflow-db psql -U postgres -d docflow_db -c "SELECT COUNT(*) FROM branches;"

# If you have data and want to reset:
docker exec docflow-db psql -U postgres -d docflow_db -c "
  DELETE FROM user_roles;
  DELETE FROM users;
  DELETE FROM role_permissions;
  DELETE FROM permissions;
  DELETE FROM roles;
  DELETE FROM branches;
  DELETE FROM documents;
  DELETE FROM comments;
  DELETE FROM activity_logs;
"

# Re-run initialization
pnpm init:db
```

### Problem: Missing indexes affecting query performance

**Possible Causes:**
1. The duplicate 0009 migration wasn't applied
2. Migration script error

**Solutions:**

```bash
# Verify all indexes exist
docker exec docflow-db psql -U postgres -d docflow_db -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';"

# If less than 35, manually apply missing migration
docker exec -i docflow-db psql -U postgres -d docflow_db < drizzle/0009_dry_vance_astro.sql

# Or apply both 0009 files explicitly
docker exec -i docflow-db psql -U postgres -d docflow_db < drizzle/0009_add_essential_indexes.sql
docker exec -i docflow-db psql -U postgres -d docflow_db < drizzle/0009_dry_vance_astro.sql
```

### Problem: "scripts/init-db.ts not found" error

**Possible Causes:**
1. Working directory is incorrect
2. Project files not properly cloned/extracted

**Solutions:**

```bash
# Verify you're in the correct directory
pwd
# Should show: /path/to/claude_DocFlow

# Verify script exists
ls -la scripts/init-db.ts

# If missing, ensure full project is cloned
git status

# Check git history
git log --oneline | head -5
```

### Problem: "pnpm: command not found"

**Possible Causes:**
1. pnpm not installed
2. Node.js not properly configured

**Solutions:**

```bash
# Install pnpm globally
npm install -g pnpm@10.14.0

# Verify installation
pnpm --version
# Should output: 10.14.0

# Or use npm instead
npm install

# Or use npx to run commands without global install
npx pnpm init:db
```

### Problem: Long initialization time or timeout

**Possible Causes:**
1. Slow database connection
2. Large number of indexes being created
3. System resources exhausted

**Solutions:**

```bash
# Check Docker container logs for errors
docker-compose logs docflow-db

# Verify system resources
docker stats

# Try increasing timeout for init script
timeout 300 pnpm init:db  # 5 minute timeout

# Or increase Docker container resources in docker-compose.yml
# and restart:
docker-compose down
docker-compose up -d
sleep 15
pnpm init:db
```

---

## What Gets Initialized

### Database Structure (15 Tables)

| Table | Purpose | Records |
|-------|---------|---------|
| `users` | User accounts and profiles | 1+ (admin) |
| `roles` | Role definitions | 6 |
| `permissions` | Permission definitions | 24 |
| `user_roles` | User-Role mappings | 1+ |
| `role_permissions` | Role-Permission mappings | 24+ |
| `sessions` | Active user sessions | Dynamic |
| `branches` | R6 branches and BA1059 departments | 27 |
| `documents` | Uploaded documents | 0+ |
| `comments` | Document comments/annotations | 0+ |
| `activity_logs` | Audit trail of all actions | 0+ |
| `document_status_history` | Document status change history | 0+ |
| `additional_document_files` | Additional files for documents | 0+ |
| `additional_document_correction_tracking` | Correction tracking for additional files | 0+ |
| `emendation_documents` | Amended/corrected document versions | 0+ |
| `system_settings` | System configuration settings | 6 |

### R6 Branches (22 Branches)

All branches in the R6 (Region 6) region:

```
1001 กปภ.ชุมพร
1002 กปภ.สุราษฎร์ธานี
1003 กปภ.นครศรีธรรมราช
1004 กปภ.พัทลุง
1005 กปภ.สตูล
1006 กปภ.ตรัง
1007 กปภ.กระบี่
1008 กปภ.ภูเก็ต
1009 กปภ.พังงา
1010 กปภ.เพชรบูรณ์
1011 กปภ.ลำปาง
1012 กปภ.ลำพูน
1013 กปภ.สมุทรสาคร
1014 กปภ.สมุทรปราการ
1015 กปภ.ประจวบคีรีขันธ์
1016 กปภ.ราชบุรี
1017 กปภ.เพชรบูรณ์
1018 กปภ.นนทบุรี
1019 กปภ.พระนครศรีอยุธยา
1020 กปภ.สระบุรี
1021 กปภ.สิงห์บุรี
1022 กปภ.ชลบุรี
```

### BA1059 Departments (5 Departments)

Administrative departments under BA1059 code:

```
105901 กปภ.เขต 6 - งานพัสดุ (Procurement Department)
105902 กปภ.เขต 6 - งานธุรการ (Administration Department)
105903 กปภ.เขต 6 - งานบัญชีเจ้าหนี้ (Accounts Payable Department)
105904 กปภ.เขต 6 - งานการเงิน (Finance Department)
105905 กปภ.เขต 6 - งานบุคคล (Human Resources Department)
```

### DocFlow Roles (6 Roles)

| Role | Description | Primary Use |
|------|-------------|-------------|
| `admin` | System administrator with all permissions | System management |
| `uploader` | Can create and upload documents | Document creators |
| `branch_user` | Can view and comment on documents | Branch staff |
| `branch_manager` | Manages branch documents and users | Branch supervision |
| `district_manager` | Oversees multiple branches | Regional management |
| `view_only` | Read-only access to documents | Audit/review |

### Permissions (24 Total)

**Document Permissions (8):**
- `documents:upload` - Create and upload documents
- `documents:view` - View documents
- `documents:edit` - Edit document metadata
- `documents:delete` - Delete documents
- `documents:comment` - Add comments to documents
- `documents:approve` - Approve document workflows
- `documents:reject` - Reject documents
- `documents:export` - Export documents

**Branch Permissions (6):**
- `branches:view` - View branch information
- `branches:manage` - Manage branch settings
- `branches:users` - Manage branch users
- `branches:reports` - View branch reports
- `branches:sync` - Sync branch data
- `branches:archive` - Archive branch data

**User Permissions (4):**
- `users:view` - View user information
- `users:manage` - Manage user accounts
- `users:roles` - Assign roles to users
- `users:delete` - Delete user accounts

**Settings Permissions (4):**
- `settings:view` - View system settings
- `settings:manage` - Modify system settings
- `settings:notifications` - Configure notifications
- `settings:maintenance` - Control maintenance mode

**System Permissions (2):**
- `system:logs` - View system activity logs
- `system:audit` - View audit trail

### Performance Indexes (35+)

**Documents Table Indexes (6):**
- `idx_documents_branch_status` - Find documents by branch and status
- `idx_documents_status_created` - Query recent documents by status
- `idx_documents_upload_date` - Sort by upload date
- `idx_documents_uploader` - Find documents by uploader
- `idx_documents_mt_number` - Find documents by MT number
- `idx_documents_disbursement` - Query disbursement records

**Activity Logs Indexes (4):**
- `idx_activity_logs_user_action` - Track user actions
- `idx_activity_logs_document` - Link logs to documents
- `idx_activity_logs_branch` - Filter by branch
- `idx_activity_logs_created_at` - Sort by date

**Comments Indexes (2):**
- `idx_comments_document` - Find comments by document
- `idx_comments_user` - Find comments by user

**Additional Files Indexes (4):**
- `idx_additional_files_document_item` - Link to documents
- `idx_additional_files_uploader` - Find files by uploader
- `idx_additional_files_correction_count` - Track corrections
- `idx_additional_files_verification` - Filter by verification status

**Other Indexes (19+):**
- Document status history, branches, user roles, system settings, and more

### System Settings (6)

| Setting | Default | Type | Purpose |
|---------|---------|------|---------|
| `maintenance_mode` | `false` | boolean | Enable system maintenance mode |
| `telegram_notifications_enabled` | `false` | boolean | Enable Telegram notifications |
| `file_cleanup_retention_days` | `365` | number | File retention policy (days) |
| `document_upload_max_size_mb` | `50` | number | Maximum upload size (MB) |
| `session_timeout_minutes` | `30` | number | Session idle timeout (minutes) |
| `max_login_attempts` | `5` | number | Failed login attempt limit |

### Document Columns Ensured (9)

All these columns are verified/created in the documents table:

```
additional_docs_due_dates          - Array of due dates for additional documents
send_back_original_document        - Flag for original document return
send_back_date                     - Date document should be returned
deadline_date                      - Main document deadline
received_paper_doc_date            - Date physical copy received
additional_docs_received_date      - Date additional docs received
disbursement_date                  - Date of fund disbursement
disbursement_confirmed             - Confirmation of disbursement
disbursement_paid                  - Payment completion flag
```

---

## Maintenance

### Resetting the Database

To completely reset the database and start fresh:

```bash
# 1. Stop any running services
docker-compose down

# 2. Remove the database volume (DESTRUCTIVE - cannot be undone)
docker volume rm docflow_postgres_data

# 3. Start services again (will create empty database)
docker-compose up -d

# 4. Wait for PostgreSQL to be ready
sleep 15

# 5. Run initialization fresh
pnpm init:db

# 6. Create admin user
pnpm admin:create
```

### Backing Up the Database

Create a backup before major operations:

```bash
# Full database backup
docker exec docflow-db pg_dump -U postgres docflow_db > docflow_backup_$(date +%Y%m%d_%H%M%S).sql

# Compressed backup (recommended)
docker exec docflow-db pg_dump -U postgres docflow_db | gzip > docflow_backup_$(date +%Y%m%d_%H%M%S).sql.gz

# List backups
ls -lh docflow_backup_*.sql*
```

### Restoring from Backup

Restore a database from a backup file:

```bash
# Before restore, ensure database is empty or reset
docker exec docflow-db psql -U postgres -c "DROP DATABASE IF EXISTS docflow_db;"
docker exec docflow-db psql -U postgres -c "CREATE DATABASE docflow_db;"

# Restore from backup
docker exec -i docflow-db psql -U postgres docflow_db < docflow_backup_20250117_143022.sql

# Or from compressed backup
gunzip < docflow_backup_20250117_143022.sql.gz | docker exec -i docflow-db psql -U postgres docflow_db

# Verify restore
docker exec docflow-db psql -U postgres -d docflow_db -c "SELECT COUNT(*) FROM branches;"
```

### Checking Database Size

Monitor database growth over time:

```bash
# Total database size
docker exec docflow-db psql -U postgres -c "SELECT pg_size_pretty(pg_database_size('docflow_db')) as database_size;"

# Size by table
docker exec docflow-db psql -U postgres -d docflow_db -c "
  SELECT
    relname as table_name,
    pg_size_pretty(pg_total_relation_size(relid)) as total_size
  FROM pg_catalog.pg_statio_user_tables
  ORDER BY pg_total_relation_size(relid) DESC;"
```

### Vacuuming and Optimization

Optimize database performance periodically:

```bash
# Run VACUUM ANALYZE to optimize query planner
docker exec docflow-db psql -U postgres -d docflow_db -c "VACUUM ANALYZE;"

# Check index usage
docker exec docflow-db psql -U postgres -d docflow_db -c "
  SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as scans
  FROM pg_stat_user_indexes
  WHERE idx_scan = 0
  ORDER BY pg_relation_size(relid) DESC;"
```

### Monitoring Initialization Progress

When initialization takes a long time, monitor progress:

```bash
# In another terminal, monitor initialization process
docker-compose logs -f app

# Or check database size growth
watch -n 5 "docker exec docflow-db psql -U postgres -c \"SELECT pg_size_pretty(pg_database_size('docflow_db')) as database_size;\""

# Check open connections
docker exec docflow-db psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"
```

---

## Additional Resources

- **Database Schema**: See `src/db/schema.ts` for complete schema definition
- **Branch Service**: `src/lib/services/branch-service.ts` for branch initialization logic
- **Auth Configuration**: `src/auth.ts` for role and permission setup
- **Docker Setup**: `docker-compose.yml` for container configuration
- **Environment Variables**: `.env` or `.env.development` for configuration

---

## Support

If you encounter issues not covered in this guide:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review Docker container logs: `docker-compose logs docflow-db`
3. Verify database connection: `docker exec docflow-db psql -U postgres -c "\l"`
4. Check application logs: `docker-compose logs app` or `pnpm dev` console output
5. Review initialization script output for specific error messages

---

**Last Updated**: November 17, 2025
**DocFlow Version**: 0.1.0
**Database Version**: PostgreSQL 17.5
