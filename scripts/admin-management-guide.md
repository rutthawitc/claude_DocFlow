# Admin Management Scripts Guide

This guide explains how to use the SQL scripts for managing administrators in the DocFlow system.

## Available Scripts

### 1. `create-local-admin.sql`

Creates a new local administrator account with full system privileges.

### 2. `promote-user-to-admin.sql`

Promotes an existing PWA user to administrator role.

## Usage Instructions

### Creating a Local Admin Account

```bash
# Method 1: Use default settings (edit script first)
docker exec docflow-db psql -U postgres -d docflow_db -f /scripts/create-local-admin.sql

# Method 2: With custom parameters
docker exec docflow-db psql -U postgres -d docflow_db \
  -v admin_username='myadmin' \
  -v admin_password='SecurePass123!' \
  -v admin_email='admin@company.com' \
  -v admin_first_name='System' \
  -v admin_last_name='Admin' \
  -f /scripts/create-local-admin.sql
```

### Promoting PWA User to Admin

```bash
# Method 1: Edit the script to set target_username
# Edit scripts/promote-user-to-admin.sql and change 'CHANGE_ME' to actual username
docker exec docflow-db psql -U postgres -d docflow_db -f /scripts/promote-user-to-admin.sql

# Method 2: Pass username as parameter (recommended)
docker exec docflow-db psql -U postgres -d docflow_db \
  -v target_username='john.doe' \
  -f /scripts/promote-user-to-admin.sql
```

## Security Considerations

### 🔐 Password Security

- **Change default passwords immediately**
- **Use strong passwords** (minimum 12 characters, mixed case, numbers, symbols)
- **Consider using environment variables** for sensitive data
- **Enable proper password hashing** in the application

### 🛡️ Access Control

- **Review admin access regularly**
- **Implement the principle of least privilege**
- **Monitor admin activities through audit logs**
- **Use separate admin accounts for different purposes**

## Examples

### Creating Multiple Admin Users

```bash
# Create IT Admin
docker exec docflow-db psql -U postgres -d docflow_db \
  -v admin_username='it.admin' \
  -v admin_password='ITSecure2024!' \
  -v admin_email='it-admin@company.com' \
  -v admin_first_name='IT' \
  -v admin_last_name='Administrator' \
  -f /scripts/create-local-admin.sql

# Create System Admin
docker exec docflow-db psql -U postgres -d docflow_db \
  -v admin_username='sys.admin' \
  -v admin_password='SysAdmin2024!' \
  -v admin_email='sys-admin@company.com' \
  -v admin_first_name='System' \
  -v admin_last_name='Administrator' \
  -f /scripts/create-local-admin.sql
```

### Promoting Specific PWA Users

```bash
# Promote department head to admin
docker exec docflow-db psql -U postgres -d docflow_db \
  -v target_username='dept.head' \
  -f /scripts/promote-user-to-admin.sql

# Promote IT manager to admin
docker exec docflow-db psql -U postgres -d docflow_db \
  -v target_username='it.manager' \
  -f /scripts/promote-user-to-admin.sql
```

## Verification

### Check Admin Users

```sql
-- View all admin users
SELECT
    u.username,
    u.first_name,
    u.last_name,
    u.is_local_admin,
    u.ba,
    STRING_AGG(r.name, ', ') as roles
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE u.is_local_admin = true
   OR r.name = 'admin'
GROUP BY u.id, u.username, u.first_name, u.last_name, u.is_local_admin, u.ba
ORDER BY u.username;
```

### Check User Permissions

```sql
-- Check specific user permissions
SELECT DISTINCT
    p.name as permission,
    p.description
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE u.username = 'TARGET_USERNAME'
ORDER BY p.name;
```

## Troubleshooting

### Common Issues

1. **User not found error**

   - Ensure the PWA user has logged in at least once
   - Check username spelling (case-sensitive)

2. **Role assignment fails**

   - Verify roles exist in the database
   - Check for database constraint violations

3. **Password authentication issues**
   - Ensure proper password hashing in production
   - Update application auth logic for local admin accounts

### Recovery Commands

```bash
# Reset user roles (remove admin access)
docker exec docflow-db psql -U postgres -d docflow_db -c "
DELETE FROM user_roles
WHERE user_id = (SELECT id FROM users WHERE username = 'USERNAME');
"

# Reassign basic user role
docker exec docflow-db psql -U postgres -d docflow_db -c "
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.username = 'USERNAME' AND r.name = 'user';
"
```

## Production Deployment Notes

1. **Environment Variables**: Use environment variables for sensitive data
2. **Audit Logging**: All admin promotions are logged in `activity_logs`
3. **Backup**: Always backup database before making changes
4. **Testing**: Test admin access in staging environment first

## Security Audit Checklist

- [ ] All default passwords changed
- [ ] Admin accounts use strong passwords
- [ ] Regular review of admin access
- [ ] Audit logs monitored
- [ ] Separate admin accounts for different purposes
- [ ] Local admin accounts properly secured
- [ ] PWA integration maintains security standards
