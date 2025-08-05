# Local Admin Setup and Troubleshooting Guide

## Overview
This document summarizes the issues encountered during local admin setup on AWS EC2 deployment and provides solutions for future reference.

## Issues Encountered and Solutions

### Issue 1: PWA API JSONP Response Format
**Problem**: PWA API returns JSONP format instead of pure JSON
```
Response: ({"status":"notsuccess","status_desc":"invalid username or password"});
Error: SyntaxError: Unexpected token '(', "({"status""... is not valid JSON
```

**Root Cause**: PWA API returns JSONP (JSON with Padding) format with parentheses wrapper, but authentication code expects pure JSON.

**Solution**: Temporarily disable PWA API to force local admin fallback authentication.

### Issue 2: Local Admin User Creation
**Problem**: Manual database insertion of admin user failed silently.

**Root Cause**: Missing required fields or incorrect field names in INSERT statement.

**Solution**: Use complete INSERT statement with all required fields:
```sql
-- Create local admin user
INSERT INTO users (username, first_name, last_name, email, password, is_local_admin, ba, cost_center, created_at, updated_at) 
VALUES (
  'admin', 
  'System', 
  'Administrator', 
  'admin@docflow.local', 
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 
  true, 
  'R6001', 
  'ADM001',
  NOW(),
  NOW()
);
```

### Issue 3: Missing Admin Role
**Problem**: Admin role didn't exist in the database after DocFlow initialization.

**Solution**: Create admin role manually:
```sql
-- Insert admin role
INSERT INTO roles (name, description) 
VALUES ('admin', 'ผู้ดูแลระบบ')
ON CONFLICT (name) DO NOTHING;
```

### Issue 4: Admin Role Without Permissions
**Problem**: Admin role existed but had zero permissions, causing "Permission denied. Admin access required" errors.

**Root Cause**: Role was created but no permissions were assigned to it.

**Solution**: Assign all permissions to admin role:
```sql
-- Add all permissions to admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;
```

### Issue 5: Session Cache Not Refreshing
**Problem**: Even after database updates, user session still showed old permissions.

**Solution**: Force session refresh by:
1. Restarting application container
2. User logout and login again
3. Clear browser cache if necessary

## Complete Setup Process

### Step 1: Verify Database Schema
```bash
# Check users table structure
docker exec pwa-next15-authjs-db psql -U postgres -d pwausers_db -c "\d users"

# Check roles table
docker exec pwa-next15-authjs-db psql -U postgres -d pwausers_db -c "SELECT * FROM roles;"

# Check permissions table
docker exec pwa-next15-authjs-db psql -U postgres -d pwausers_db -c "SELECT * FROM permissions;"
```

### Step 2: Create Admin Role (if not exists)
```bash
docker exec pwa-next15-authjs-db psql -U postgres -d pwausers_db -c "
-- Insert admin role
INSERT INTO roles (name, description) 
VALUES ('admin', 'ผู้ดูแลระบบ')
ON CONFLICT (name) DO NOTHING;
"
```

### Step 3: Create Local Admin User
```bash
docker exec pwa-next15-authjs-db psql -U postgres -d pwausers_db -c "
-- Create admin user with bcrypt hashed password ('password')
INSERT INTO users (username, first_name, last_name, email, password, is_local_admin, ba, cost_center, created_at, updated_at) 
VALUES (
  'admin', 
  'System', 
  'Administrator', 
  'admin@docflow.local', 
  '\$2a\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 
  true, 
  'R6001', 
  'ADM001',
  NOW(),
  NOW()
)
ON CONFLICT (username) DO UPDATE SET 
  password = '\$2a\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  is_local_admin = true;
"
```

### Step 4: Assign Admin Role to User
```bash
docker exec pwa-next15-authjs-db psql -U postgres -d pwausers_db -c "
-- Assign admin role to admin user
INSERT INTO user_roles (user_id, role_id) 
SELECT u.id, r.id
FROM users u, roles r
WHERE u.username = 'admin' AND r.name = 'admin'
ON CONFLICT (user_id, role_id) DO NOTHING;
"
```

### Step 5: Assign Permissions to Admin Role
```bash
docker exec pwa-next15-authjs-db psql -U postgres -d pwausers_db -c "
-- Add all permissions to admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;
"
```

### Step 6: Restart Application and Clear Cache
```bash
# Restart application container
docker compose restart app

# Wait for application to start, then force session refresh
# User should logout and login again
```

## Adding Admin Rights to Existing PWA User

### Example: Adding admin rights to user "11008"
```bash
# Step 1: Ensure admin role exists
docker exec pwa-next15-authjs-db psql -U postgres -d pwausers_db -c "
INSERT INTO roles (name, description) 
VALUES ('admin', 'ผู้ดูแลระบบ')
ON CONFLICT (name) DO NOTHING;
"

# Step 2: Add admin permissions to admin role
docker exec pwa-next15-authjs-db psql -U postgres -d pwausers_db -c "
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;
"

# Step 3: Assign admin role to PWA user
docker exec pwa-next15-authjs-db psql -U postgres -d pwausers_db -c "
INSERT INTO user_roles (user_id, role_id) 
SELECT u.id, r.id
FROM users u, roles r
WHERE u.username = '11008' AND r.name = 'admin'
ON CONFLICT (user_id, role_id) DO NOTHING;
"

# Step 4: Restart and refresh session
docker compose restart app
# User must logout and login again
```

## Verification Commands

### Check User Roles
```bash
docker exec pwa-next15-authjs-db psql -U postgres -d pwausers_db -c "
SELECT u.username, u.first_name, u.last_name, r.name as role_name 
FROM users u 
JOIN user_roles ur ON u.id = ur.user_id 
JOIN roles r ON ur.role_id = r.id 
WHERE u.username IN ('admin', '11008')
ORDER BY u.username, r.name;
"
```

### Check Role Permissions
```bash
docker exec pwa-next15-authjs-db psql -U postgres -d pwausers_db -c "
SELECT r.name as role_name, p.name as permission_name 
FROM roles r 
JOIN role_permissions rp ON r.id = rp.role_id 
JOIN permissions p ON rp.permission_id = p.id 
WHERE r.name = 'admin'
ORDER BY p.name;
"
```

### Test Admin API Access
```bash
# Should return user list (not 403 Forbidden)
curl -H "Cookie: YOUR_SESSION_COOKIE" http://YOUR_IP:3000/api/admin/users
```

## Login Credentials

### Local Admin User
- **Username**: `admin`
- **Password**: `password`
- **Type**: Local admin (bypasses PWA API when it fails)

### PWA User with Admin Rights
- **Username**: `11008` (รัฐวิทย์ ชื่นเนาวพันธ์)
- **Password**: PWA credentials
- **Type**: PWA user with admin, district_manager, and uploader roles

## Troubleshooting Tips

1. **Always check logs** after making changes:
   ```bash
   docker logs pwa-next15-authjs --tail 50
   ```

2. **Verify database changes** before testing:
   ```bash
   # Check if user exists
   docker exec pwa-next15-authjs-db psql -U postgres -d pwausers_db -c "SELECT * FROM users WHERE username = 'admin';"
   
   # Check roles
   docker exec pwa-next15-authjs-db psql -U postgres -d pwausers_db -c "SELECT * FROM user_roles WHERE user_id = (SELECT id FROM users WHERE username = 'admin');"
   ```

3. **Force session refresh** after role changes:
   - Restart application container
   - User logout and login
   - Clear browser cache if necessary

4. **Test API endpoints directly** to isolate permission issues:
   ```bash
   # Test in browser or curl
   http://YOUR_IP:3000/api/admin/users
   ```

## Security Notes

- Default admin password is `password` - **CHANGE THIS IN PRODUCTION**
- Local admin accounts bypass PWA API authentication
- Admin role has full system permissions
- Always use HTTPS in production
- Regularly audit admin user access

## Production Recommendations

1. **Change default passwords** immediately
2. **Enable HTTPS** with proper SSL certificates  
3. **Implement 2FA** for admin accounts
4. **Regular security audits** of user permissions
5. **Monitor admin activities** through audit logs
6. **Backup user database** regularly

---

**Created**: August 4, 2025  
**Last Updated**: August 4, 2025  
**Environment**: AWS EC2 Deployment  
**Database**: PostgreSQL 17.5 with Docker