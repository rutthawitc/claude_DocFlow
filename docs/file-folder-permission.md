# File and Folder Permission Issues - DocFlow AWS EC2 Deployment

## Overview
This document summarizes file and folder permission issues encountered during DocFlow deployment on AWS EC2 and provides solutions for persistent file storage.

## Issues Encountered

### Issue 1: Missing Uploads Directory
**Problem**: PDF files couldn't be viewed, showing error "เกิดข้อผิดพลาดในการโหลดเอกสาร (500)"

**Root Cause**: 
- `/app/uploads/` directory didn't exist in the container
- Files uploaded previously were lost after container restarts
- No persistent storage configured

**Error Messages**:
```
Error: ENOENT: no such file or directory, open '/app/uploads/doc_4_1754318650405_e900644f.pdf'
Failed to load resource: the server responded with a status of 500 (Internal Server Error)
```

**Symptoms**:
- Documents listed in database but physical files missing
- PDF viewer showing "เกิดข้อผิดพลาดในการโหลดเอกสาร (500)" error
- Downloads failing with 500 Internal Server Error

### Issue 2: No Persistent Volume Mapping
**Problem**: Uploaded files disappeared after container restarts

**Root Cause**: 
- Docker containers are ephemeral - data inside containers is lost when containers are recreated
- No volume mapping configured between host and container
- File uploads stored only inside container filesystem

**Solution**: Configure persistent volume mapping in docker-compose.yml

### Issue 3: File Upload Permission Errors
**Problem**: Document upload failing with "Failed to store file" error

**Root Cause**:
- Volume mapping created directory with wrong ownership (`node:988`)
- Application running as `nextjs:nodejs` user couldn't write to directory
- Permission mismatch between host and container users

**Error Messages**:
```
Documents API - Document creation error: Error [DatabaseError]: Database operation failed: create_document
originalError: Error: Failed to store file
Upload error: Error: Internal server error
```

## Solutions Implemented

### Solution 1: Create Persistent Volume Mapping

**Step 1: Stop containers and create host directory**
```bash
docker-compose down
mkdir -p ./uploads
chmod 755 ./uploads
```

**Step 2: Add volume mapping to docker-compose.yml**
```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./uploads:/app/uploads  # Add this line
    environment:
      # ... existing environment variables
```

**Step 3: Restart containers**
```bash
docker-compose up -d
```

### Solution 2: Fix Directory Permissions

**Check current ownership and permissions:**
```bash
docker exec pwa-next15-authjs ls -la /app/
docker exec pwa-next15-authjs whoami
```

**Fix ownership and permissions:**
```bash
# Change ownership to nextjs user (application user)
docker exec -u root pwa-next15-authjs chown -R nextjs:nodejs /app/uploads

# Set appropriate permissions
docker exec -u root pwa-next15-authjs chmod 755 /app/uploads
```

**Verification:**
```bash
docker exec pwa-next15-authjs ls -la /app/uploads/
```

Should show:
```
drwxr-xr-x 2 nextjs nodejs 4096 Aug  4 15:48 .
```

### Solution 3: Alternative Permission Fix (if needed)

If the above doesn't work, try more permissive settings:
```bash
# On host system
sudo chmod 777 ./uploads/

# Or in container
docker exec -u root pwa-next15-authjs chmod 777 /app/uploads
```

## Verification Steps

### 1. Check Directory Structure
```bash
# Host directory
ls -la ./uploads/

# Container directory  
docker exec pwa-next15-authjs ls -la /app/uploads/
```

### 2. Test File Upload
1. Navigate to: `http://YOUR_IP:3000/documents/upload`
2. Upload a PDF file
3. Check if file appears in both locations:
   ```bash
   ls -la ./uploads/
   docker exec pwa-next15-authjs ls -la /app/uploads/
   ```

### 3. Test Document Viewing
1. Click on uploaded document
2. Verify PDF viewer loads without errors
3. Test download functionality

### 4. Test Persistence
```bash
# Restart container
docker-compose restart app

# Check files still exist
ls -la ./uploads/
docker exec pwa-next15-authjs ls -la /app/uploads/
```

## Database vs File System Consistency

### Check Database Records
```bash
docker exec pwa-next15-authjs-db psql -U postgres -d pwausers_db -c "
SELECT id, mt_number, file_path, file_size, created_at 
FROM documents 
ORDER BY created_at DESC 
LIMIT 10;
"
```

### Verify File Exists
```bash
# For each file_path from database query
docker exec pwa-next15-authjs ls -la /app/uploads/FILENAME
```

### Clean Up Orphaned Records (if needed)
```bash
# Remove database records for missing files (be careful!)
docker exec pwa-next15-authjs-db psql -U postgres -d pwausers_db -c "
DELETE FROM documents 
WHERE file_path NOT IN (
  SELECT file_path FROM documents 
  WHERE EXISTS (
    SELECT 1 FROM documents d2 
    WHERE d2.file_path = documents.file_path
  )
);
"
```

## Prevention Measures

### 1. Always Use Volume Mapping
Ensure docker-compose.yml includes:
```yaml
volumes:
  - ./uploads:/app/uploads
  - ./backups:/app/backups  # For backup files
```

### 2. Set Correct Permissions During Deployment
```bash
# In deployment script
mkdir -p ./uploads ./backups
chmod 755 ./uploads ./backups
docker-compose up -d
docker exec -u root APP_CONTAINER chown -R nextjs:nodejs /app/uploads /app/backups
```

### 3. Health Check Script
Create a script to verify file system health:
```bash
#!/bin/bash
# check-files.sh

echo "Checking file system consistency..."

# Check uploads directory exists and is writable
docker exec pwa-next15-authjs test -w /app/uploads && echo "✅ Uploads directory writable" || echo "❌ Uploads directory not writable"

# Check host-container sync
HOST_COUNT=$(ls -1 ./uploads/ 2>/dev/null | wc -l)
CONTAINER_COUNT=$(docker exec pwa-next15-authjs ls -1 /app/uploads/ 2>/dev/null | wc -l)

if [ "$HOST_COUNT" -eq "$CONTAINER_COUNT" ]; then
    echo "✅ File sync OK ($HOST_COUNT files)"
else
    echo "❌ File sync mismatch (Host: $HOST_COUNT, Container: $CONTAINER_COUNT)"
fi
```

### 4. Backup Strategy
```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf ./backups/uploads_backup_${DATE}.tar.gz ./uploads/
find ./backups/ -name "uploads_backup_*.tar.gz" -mtime +7 -delete
```

## Common Permission Issues and Solutions

### Issue: "Operation not permitted" when changing permissions
**Solution**: Use root user in container
```bash
docker exec -u root CONTAINER_NAME chown -R user:group /path
```

### Issue: Files created with wrong ownership after volume mapping
**Solution**: Set umask or fix permissions after container start
```bash
# In Dockerfile or startup script
RUN umask 022
# Or post-startup fix
docker exec -u root CONTAINER_NAME chown -R nextjs:nodejs /app/uploads
```

### Issue: SELinux preventing file access (CentOS/RHEL)
**Solution**: Set appropriate SELinux contexts
```bash
sudo setsebool -P container_manage_cgroup true
sudo chcon -Rt svirt_sandbox_file_t ./uploads/
```

## Monitoring and Troubleshooting

### Log Analysis
```bash
# Check application logs for file-related errors
docker logs pwa-next15-authjs | grep -i "file\|upload\|enoent"

# Check system logs
journalctl -u docker --since "1 hour ago" | grep -i permission
```

### Real-time File Monitoring
```bash
# Monitor file creation/deletion
watch -n 5 'ls -la ./uploads/ | tail -10'

# Monitor disk usage
watch -n 30 'df -h | grep -E "(uploads|docker)"'
```

## Production Recommendations

### 1. Security
- Use least-privilege principle (755, not 777)
- Regular security audits of file permissions
- Monitor file access patterns for anomalies

### 2. Performance
- Use separate volume for uploads (not bind mount)
- Consider using object storage (S3) for large deployments
- Implement file cleanup policies

### 3. Reliability
- Regular backup verification
- Automated file system health checks
- Monitor disk space and inode usage

### 4. Scalability
- Plan for multi-container deployments with shared storage
- Consider NFS or distributed file systems
- Implement proper file locking mechanisms

---

## Summary

The file permission issues were resolved by:

1. ✅ **Creating persistent volume mapping** (`./uploads:/app/uploads`)
2. ✅ **Fixing directory ownership** (`nextjs:nodejs`) 
3. ✅ **Setting appropriate permissions** (`755`)
4. ✅ **Verifying file upload/download functionality**

**Key Commands Used:**
```bash
# Setup
mkdir -p ./uploads
docker-compose down && docker-compose up -d

# Fix permissions
docker exec -u root pwa-next15-authjs chown -R nextjs:nodejs /app/uploads
docker exec -u root pwa-next15-authjs chmod 755 /app/uploads

# Verify
docker exec pwa-next15-authjs ls -la /app/uploads/
ls -la ./uploads/
```

**Result**: Document upload, storage, and viewing now work correctly with persistent file storage.

---

**Created**: August 4, 2025  
**Environment**: AWS EC2 Ubuntu 22.04, Docker Compose  
**Application**: DocFlow Next.js 15 PWA  
**Status**: ✅ Resolved