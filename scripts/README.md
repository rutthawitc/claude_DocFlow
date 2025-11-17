# DocFlow Scripts Documentation

Complete guide for all DocFlow database and system management scripts.

## 📋 Table of Contents

- [Database Initialization](#database-initialization)
- [Admin Management](#admin-management)
- [System Operations](#system-operations)
- [Production Deployment](#production-deployment)
- [Script Reference](#script-reference)

---

## Database Initialization

### Primary Initialization Script

**`init-db.ts`** - Complete database initialization (RECOMMENDED)

Initializes the entire DocFlow system including:
- All database columns (with schema sync)
- 22 R6 branches
- 5 BA1059 departments
- 6 roles with 24 permissions
- 35+ performance indexes
- System settings

```bash
# Development (uses .env.development)
pnpm init:db

# Production (uses DATABASE_URL from .env)
DATABASE_URL="postgresql://user:pass@host:5432/db" pnpm init:db
```

**What it does:**
1. ✅ Ensures all document table columns exist (including recently added columns)
2. ✅ Creates emendation_documents table
3. ✅ Initializes 22 R6 branches
4. ✅ Initializes 5 BA1059 departments
5. ✅ Creates roles and permissions
6. ✅ Creates 35+ performance indexes
7. ✅ Initializes system settings

### Legacy Initialization Script

**`init-docflow.ts`** - Legacy initialization (BACKUP)

Older initialization script kept for backward compatibility.

```bash
pnpm init:db:legacy
```

**When to use:**
- Only if `init-db.ts` has issues
- Generally use `init-db.ts` instead

---

## Admin Management

### Create Admin User (Interactive)

**`create-admin.ts`** - Interactive admin user creation

Creates a local admin user with full permissions via interactive prompts.

```bash
pnpm admin:create
```

**Interactive prompts:**
- Username
- Email
- First Name
- Last Name
- Password (hidden input)
- Password confirmation

**Output:**
```
✅ Local admin user created successfully!
==========================================
👤 Username: admin
📧 Email: admin@example.com
🏷️  Name: John Doe
🔑 Roles: admin, district_manager
⚡ Permissions: 24 permissions assigned
```

### Create Admin User (SQL)

**`create-local-admin.sql`** - SQL-based admin creation

Creates admin user directly via SQL (for production/scripted deployments).

```bash
# Using Docker
docker exec docflow-db psql -U postgres -d docflow_db \
  -v admin_username='admin' \
  -v admin_email='admin@example.com' \
  -v admin_first_name='Admin' \
  -v admin_last_name='User' \
  -v admin_password='SecurePassword123!' \
  -f /scripts/create-local-admin.sql

# Using psql directly
psql -U postgres -d docflow_db \
  -v admin_username='admin' \
  -v admin_email='admin@example.com' \
  -v admin_first_name='Admin' \
  -v admin_last_name='User' \
  -v admin_password='SecurePassword123!' \
  -f scripts/create-local-admin.sql
```

---

## System Operations

### System Reset

**`reset-system.sh`** - Complete system reset

Resets the entire DocFlow system (⚠️ DESTRUCTIVE - Development only).

```bash
./scripts/reset-system.sh
```

**What it does:**
1. Drops all tables
2. Deletes all uploaded files
3. Re-initializes database
4. Creates fresh admin user

**⚠️ WARNING:** This is destructive and should NEVER be used in production.

### Backup

**`backup.sh`** - Database and file backup

Creates timestamped backups of database and uploaded files.

```bash
./scripts/backup.sh
```

**Output:**
- Database dump: `backups/docflow_YYYYMMDD_HHMMSS.sql`
- Files archive: `backups/files_YYYYMMDD_HHMMSS.tar.gz`

### Monitor

**`monitor.sh`** - System monitoring

Monitors system health and performance.

```bash
./scripts/monitor.sh
```

**Monitors:**
- Database connections
- Disk usage
- Application health
- Error logs

---

## Production Deployment

### Deployment Updates

**`deploy-update.sh`** - Production deployment script

Deploys new version to production with zero-downtime updates.

```bash
./scripts/deploy-update.sh v1.0.1 production
```

**Parameters:**
- `version`: Docker image tag (e.g., v1.0.1)
- `environment`: production | staging

**What it does:**
1. Builds Docker image with version tag
2. Pushes to Docker Hub
3. Pulls on production server
4. Performs rolling update (zero-downtime)
5. Verifies health checks

---

## Script Reference

### All Available Scripts

| Script | Purpose | Usage | Environment |
|--------|---------|-------|-------------|
| `init-db.ts` | Complete DB initialization | `pnpm init:db` | Dev/Prod |
| `init-docflow.ts` | Legacy DB initialization | `pnpm init:db:legacy` | Dev/Prod |
| `create-admin.ts` | Interactive admin creation | `pnpm admin:create` | Dev/Prod |
| `create-local-admin.sql` | SQL admin creation | `psql -f scripts/create-local-admin.sql` | Prod |
| `reset-system.sh` | System reset | `./scripts/reset-system.sh` | Dev only |
| `backup.sh` | Backup database and files | `./scripts/backup.sh` | Prod |
| `monitor.sh` | System monitoring | `./scripts/monitor.sh` | Prod |
| `deploy-update.sh` | Production deployment | `./scripts/deploy-update.sh v1.0.1` | Prod |
| `run-ts.sh` | Run TypeScript scripts | `./scripts/run-ts.sh <script>` | Dev/Prod |

### Helper Scripts

**`run-ts.sh`** - TypeScript script runner

Runs TypeScript scripts using `tsx`.

```bash
./scripts/run-ts.sh scripts/create-admin.ts
```

---

## Common Workflows

### Initial Setup (Development)

```bash
# 1. Start Docker services
docker-compose up -d db redis

# 2. Initialize database
pnpm init:db

# 3. Create admin user
pnpm admin:create

# 4. Start development server
pnpm dev
```

### Initial Setup (Production)

```bash
# 1. Pull Docker images
docker-compose pull

# 2. Start all services
docker-compose up -d

# 3. Initialize database (in container)
docker exec docflow-app pnpm init:db

# 4. Create admin user via SQL
docker exec docflow-db psql -U postgres -d docflow_db \
  -v admin_username='admin' \
  -f /scripts/create-local-admin.sql

# 5. Verify health
curl http://localhost:3000/api/health
```

### Production Deployment Workflow

```bash
# 1. Build and push new version
./scripts/deploy-update.sh v1.0.2 production

# 2. Verify deployment
curl http://your-domain.com/api/health

# 3. Create backup (optional but recommended)
./scripts/backup.sh

# 4. Monitor logs
docker-compose logs -f app
```

### Database Refresh (Development)

```bash
# CAUTION: This will delete all data
./scripts/reset-system.sh
```

---

## Troubleshooting

### Script Execution Issues

**Problem:** Permission denied when running `.sh` scripts

```bash
# Solution: Make scripts executable
chmod +x scripts/*.sh
```

**Problem:** TypeScript scripts fail to run

```bash
# Solution: Use run-ts.sh helper
./scripts/run-ts.sh scripts/init-db.ts
```

**Problem:** Database connection fails

```bash
# Solution: Check environment variables
echo $DATABASE_URL

# For development, ensure .env.development exists
cat .env.development | grep DATABASE_URL

# For production, check .env
cat .env | grep DATABASE_URL
```

### Common Errors

**Error:** `relation "documents" does not exist`

```bash
# Solution: Run database initialization
pnpm init:db
```

**Error:** `column "additional_docs_due_dates" does not exist`

```bash
# Solution: Use init-db.ts (not legacy script)
pnpm init:db
```

**Error:** `role "admin" already exists`

```bash
# This is normal if database is already initialized
# Skip initialization or use reset-system.sh
```

---

## Best Practices

### Development

1. **Always use `init:db`** for fresh database setup
2. **Use `admin:create`** for interactive admin creation
3. **Never run `reset-system.sh`** on production databases
4. **Backup before major changes** using `backup.sh`

### Production

1. **Use SQL scripts** (`create-local-admin.sql`) for automation
2. **Always backup** before deployment
3. **Monitor** after deployment with `monitor.sh`
4. **Use versioned deployments** with `deploy-update.sh`
5. **Never manually delete** production data

---

## Removed Scripts (Archive)

The following scripts were removed during cleanup as they are obsolete:

### Removed Scripts:
- `init-docflow-complete.sql` - Outdated, missing columns, replaced by `init-db.ts`
- `add-correction-counter.sql` - One-time migration, already applied
- `add-departments-ba1059.sql` - Redundant, included in `init-db.ts`
- `migrate-additional-docs-indexing.sql` - One-time migration, already applied
- `create-pwa-user.sql` - Redundant with `create-admin.ts`
- `promote-user-to-admin.sql` - Redundant with `create-admin.ts`
- `apply-indexes.sh` - Included in `init-db.ts`
- `load-test.sh` - Testing script, not needed
- `test-production.sh` - Testing script, not needed
- `test-reset-simple.sh` - Redundant with `reset-system.sh`

**Why removed:**
- ❌ Outdated schema (missing new columns)
- ❌ One-time migrations already applied
- ❌ Duplicate functionality
- ❌ Testing scripts not used in production

**Migration path:**
- Use `init-db.ts` for all database initialization
- Use `create-admin.ts` or `create-local-admin.sql` for admin creation

---

## Support

For issues or questions:
- Check CLAUDE.md for project documentation
- Review error logs in console output
- Ensure environment variables are correctly set
- Verify Docker services are running (for production)

---

**Last Updated:** 2025-11-17
**DocFlow Version:** 0.1.0
