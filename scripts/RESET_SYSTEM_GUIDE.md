# DocFlow System Reset Guide

## Overview

The `reset-system.sh` script provides a complete system reset functionality for DocFlow, dropping and recreating the entire database from scratch, bringing the system back to a fresh installation state.

## What the Script Does

### 🗑️ **Deletes Everything**
- **Complete Database Drop**: The entire database is dropped and recreated
- **All Data**: All users, documents, comments, logs, activities, settings
- **All Roles & Permissions**: All role and permission data
- **All Branches**: All branch configuration
- **Uploaded Files**: Everything in `uploads/` and `tmp/` directories
- **Telegram Settings**: Settings stored in `tmp/`

### 🔄 **Recreates Fresh**
- **Empty Database**: Brand new schema created
- **Branches**: All R6 region branches (22 branches)
- **Roles & Permissions**: DocFlow role system with default permissions
- **System Settings**: Default system configuration
- **Optional Admin User**: Script prompts to create a fresh admin user

## Usage

### Basic Usage (Interactive)
```bash
./scripts/reset-system.sh
```
- Shows warnings and confirmations
- Requires typing "yes" for first confirmation
- Requires typing "RESET" for final confirmation
- Prompts for admin user creation
- Logs all operations to `tmp/reset-system-YYYYMMDD_HHMMSS.log`

### Force Mode (No Prompts)
```bash
./scripts/reset-system.sh --force
```
- **EXTREMELY DANGEROUS**: Skips all confirmations
- Does NOT skip admin user creation prompt
- Use only in automated CI/CD scripts or development
- **NEVER use in production**

### Help
```bash
./scripts/reset-system.sh --help
```
- Shows usage information and configuration options

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
# Backup full database
pg_dump -h localhost -p 5432 -U postgres docflow_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup uploaded files
tar -czf uploads_backup_$(date +%Y%m%d_%H%M%S).tar.gz uploads/

# Backup any custom configuration
tar -czf config_backup_$(date +%Y%m%d_%H%M%S).tar.gz tmp/ --exclude='tmp/tsx'
```

### 2. **Stop Application**
```bash
# Stop the development server
Ctrl+C  # If running in terminal

# Or stop Docker containers
docker-compose down

# Verify no applications are using the database
lsof -i :5432  # Check for connections on DB port
```

### 3. **Verify Database Connectivity**
```bash
# Test database connection before running reset
PGPASSWORD=postgres psql -h localhost -p 5432 -U postgres -d docflow_db -c "SELECT 1;"
```

## Example Run

```bash
$ ./scripts/reset-system.sh

================================================
           DocFlow System Reset
================================================

⚠️  WARNING: THIS IS A DESTRUCTIVE OPERATION!

This will completely reset the DocFlow system:

  - DROP the entire database and recreate it
  - DELETE all documents and uploaded files
  - DELETE all users (no data is preserved)
  - DELETE all activities and logs
  - DELETE all comments and roles/permissions
  - REINITIALIZE all branches, roles, and permissions

ALL DATA WILL BE PERMANENTLY LOST!

Type 'yes' to continue with full reset: yes

Final confirmation - Type 'RESET' to irreversibly reset the system: RESET

✅ Reset confirmed - proceeding with full system reset...

🏁 Starting system reset process...

🔍 Checking database connection...
✅ Database connection successful

🗑️  Cleaning uploaded files...
   Cleaning directory: /path/to/uploads
   ✅ Cleaned 0 files (0B)
   ✅ Removed telegram-settings.json

🗄️  Dropping and recreating database...
✅ Database dropped successfully
✅ Database created successfully

🔄 Initializing DocFlow database...
   Running pnpm init:db...
   ✅ Database initialization completed

👤 Creating new admin user...
   Do you want to create a new admin user now? (y/n): y
   Running pnpm admin:create...
   ✅ Admin user created successfully

📊 System Status After Reset:
Table                     Records
-----                     -------
users                     1
roles                     5
permissions              20
branches                 22
documents                 0
comments                  0
activity_logs             0

✅ System reset completed successfully!
💡 The DocFlow system has been completely reset
📝 Log file: /path/to/tmp/reset-system-20231117_160430.log

Next steps:
  1. Start the development server: pnpm dev
  2. Log in with your admin credentials
  3. Begin using the freshly initialized system
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

### Issue: Database Operations Timeout
**Solution**:
```bash
# Increase the connection timeout
export PGCONNECT_TIMEOUT=30
./scripts/reset-system.sh
```

### Issue: Admin User Creation Hangs
**Solution**:
- Press Ctrl+C to cancel
- Check if stdin is properly connected
- Run pnpm admin:create manually after reset completes

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

### 1. **From Full Database Backup**
```bash
# Stop the application first
docker-compose down

# Restore full database backup (WARNING: This overwrites the reset database)
psql -h localhost -p 5432 -U postgres -d docflow_db < backup_20231117_160430.sql

# Restart the application
docker-compose up
```

### 2. **From Uploaded Files Backup**
```bash
# Restore uploaded files from backup
tar -xzf uploads_backup_20231117_160430.tar.gz -C ./
```

### 3. **Selective Recovery**
If you only need specific data:
```bash
# Extract and restore specific documents
pg_restore -h localhost -p 5432 -U postgres -d docflow_db -t documents backup.dump
```

### 4. **Point-in-Time Recovery**
- If running with WAL archiving, use PostgreSQL PITR features
- Requires PostgreSQL backup WAL files
- Contact database administrator for assistance

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