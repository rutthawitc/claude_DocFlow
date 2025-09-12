# DocFlow System Reset Guide

## Overview

The `reset-system.sh` script provides a complete system reset functionality for DocFlow, bringing the system back to a fresh installation state while preserving local admin accounts.

## What the Script Does

### ✅ **Preserves**
- **Local Admin Users**: All users with `is_local_admin = true`
- **Database Structure**: All tables and indexes remain intact
- **Application Code**: No code changes

### 🗑️ **Deletes**
- **All Documents**: Document records and uploaded PDF files
- **All Non-Admin Users**: Regular users, branch users, etc.
- **All Activities**: Activity logs and status history
- **All Comments**: Document comments and discussions
- **All Additional Files**: Uploaded additional document files
- **System Settings**: Telegram settings, system configurations
- **Uploaded Files**: Everything in `uploads/` and `tmp/` directories

### 🔄 **Recreates**
- **Branches**: All R6 region branches (22 branches)
- **Roles & Permissions**: DocFlow role system
- **Default Settings**: System defaults

## Usage

### Basic Usage (Interactive)
```bash
./scripts/reset-system.sh
```
- Shows warnings and confirmations
- Requires typing "yes" and "RESET" to confirm
- Safe for production use

### Force Mode (No Prompts)
```bash
./scripts/reset-system.sh --force
```
- **⚠️ DANGEROUS**: Skips all confirmations
- Use only in automated scripts or development
- **DO NOT use in production without extreme caution**

### Help
```bash
./scripts/reset-system.sh --help
```

## Configuration

### Environment Variables
```bash
export DB_HOST=localhost        # Database host
export DB_PORT=5432            # Database port  
export DB_NAME=docflow_db      # Database name
export DB_USER=postgres        # Database user
export PGPASSWORD=postgres     # Database password
```

### Docker Environment
```bash
# For Docker setup
export DB_HOST=localhost
export DB_PORT=5432
export PGPASSWORD=postgres
```

## Before Running

### 1. **Backup Important Data**
```bash
# Backup database
pg_dump -h localhost -p 5432 -U postgres docflow_db > backup.sql

# Backup uploaded files (if needed)
tar -czf uploads_backup.tar.gz uploads/
```

### 2. **Stop Application**
```bash
# Stop the application to prevent conflicts
docker-compose down
# or
pnpm dev # Stop if running
```

### 3. **Verify Local Admins**
```bash
# Check existing local admins
PGPASSWORD=postgres psql -h localhost -p 5432 -U postgres -d docflow_db -c \
  "SELECT username, email, created_at FROM users WHERE is_local_admin = true;"
```

## Example Run

```bash
$ ./scripts/reset-system.sh

================================================
           DocFlow System Reset
================================================

⚠️  WARNING: This will permanently delete ALL data except local admins!

This action will:
  🗑️  Delete all documents and uploaded files  
  👥 Delete all non-admin users
  📊 Delete all activities and logs
  💬 Delete all comments
  🏢 Reset branches (will be recreated)
  🔐 Reset roles and permissions (will be recreated)
  ⚙️  Delete all system settings
  💾 Preserve only local admin users

Are you absolutely sure you want to continue? (type 'yes' to confirm): yes

Last chance! Type 'RESET' to proceed: RESET

✅ Reset confirmed - proceeding...

🏁 Starting system reset process...
🔍 Checking database connection...
✅ Database connection successful
📋 Retrieving local admin data...
✅ Found 1 local admin(s)
🗑️  Cleaning uploaded files...
✅ File cleanup complete: 45 files (2.3MB) deleted
🗄️  Resetting database...
✅ Database reset completed
✅ Preserved 1 local admin user(s)
🔄 Reinitializing DocFlow system...
✅ DocFlow initialization completed

📊 System Status After Reset:
Table                     Records
-----                     -------
users                     1
roles                     4
permissions              12
branches                 22
documents                 0
comments                  0
activity_logs             0

✅ System reset completed successfully!
💡 You can now use the system as if it were newly installed
🔑 Your local admin accounts are preserved and ready to use
```

## Logging

- **Log Location**: `tmp/reset-system-YYYYMMDD_HHMMSS.log`
- **Log Content**: All operations with timestamps
- **Retention**: Logs are kept for troubleshooting

## Safety Features

### 1. **Multiple Confirmations**
- Warning message with full impact list
- Requires typing "yes" to proceed
- Requires typing "RESET" for final confirmation

### 2. **Database Connection Check**
- Verifies database accessibility before starting
- Fails safely if database is unavailable

### 3. **Error Handling**
- Script stops on any error (`set -e`)
- Detailed error messages with context
- All operations logged

### 4. **Backup Creation**
- Local admin data is backed up before reset
- Backup file location logged

## Common Use Cases

### 1. **Development Reset**
```bash
# Quick reset for development
./scripts/reset-system.sh --force
```

### 2. **Demo Preparation**
```bash
# Clean system for demos
./scripts/reset-system.sh
# Then add demo data manually
```

### 3. **Testing Environment**
```bash
# Reset test environment
export DB_NAME=docflow_test_db
./scripts/reset-system.sh --force
```

### 4. **Migration Recovery**
```bash
# After failed migration
./scripts/reset-system.sh
# Then run proper migration
```

## Troubleshooting

### Issue: Database Connection Failed
**Solution**: 
- Check if database is running
- Verify connection parameters
- Ensure PGPASSWORD is set

### Issue: Permission Denied
**Solution**:
```bash
chmod +x scripts/reset-system.sh
```

### Issue: Script Fails During Reset  
**Solution**:
- Check log file in `tmp/reset-system-*.log`
- Verify database user has proper permissions
- Ensure no other processes are accessing database

### Issue: Local Admins Lost
**Prevention**:
- Always verify local admins exist before running
- Use backup files created by the script
- Test in development environment first

## Security Considerations

### 1. **Production Use**
- **NEVER** use `--force` in production
- Always backup before running
- Test in staging environment first
- Inform team members before reset

### 2. **Access Control**
- Only system administrators should run this script
- Store script in secure location
- Monitor script execution logs

### 3. **Data Privacy**
- Ensure compliance with data retention policies
- Notify users of data deletion where required
- Document reset operations for auditing

## Recovery

If you need to recover after a reset:

### 1. **From Database Backup**
```bash
# Restore full database backup
psql -h localhost -p 5432 -U postgres -d docflow_db < backup.sql
```

### 2. **From Local Admin Backup**
```bash
# The script creates backups automatically in tmp/
# Restore specific local admin backup if needed
```

### 3. **Partial Recovery**
- Local admins are never deleted
- System structure is preserved
- Only data content is removed

## Best Practices

1. **Always backup before reset**
2. **Test in development first**
3. **Verify local admins exist**
4. **Stop application during reset**
5. **Monitor logs for errors**
6. **Document reset operations**
7. **Inform team members**
8. **Verify system works after reset**

---

**⚠️ Remember: This script permanently deletes data. Use with extreme caution!**