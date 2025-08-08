-- Promote PWA User to Admin Role Script
-- This script changes a specific PWA user to have admin privileges
-- Usage: psql -U postgres -d docflow_db -v target_username='username' -f scripts/promote-user-to-admin.sql
-- Alternative: Edit the script to set the username directly

\echo '============================================';
\echo 'Promoting PWA User to Administrator';
\echo '============================================';

-- Set target username here or pass via -v parameter
-- Example: psql -U postgres -d docflow_db -v target_username='john.doe' -f scripts/promote-user-to-admin.sql
-- \set target_username 'CHANGE_ME'  -- Uncomment and replace with actual PWA username if not using -v parameter

-- Verify the user exists first (will be handled by the queries below)

-- Show current user details before promotion
\echo 'Current User Details BEFORE Promotion:';
\echo '=====================================';
SELECT 
    username,
    first_name,
    last_name,
    email,
    is_local_admin,
    ba,
    cost_center,
    position,
    created_at::date as created_date
FROM users 
WHERE username = :'target_username';

-- Show current roles before promotion
\echo '';
\echo 'Current Roles BEFORE Promotion:';
SELECT 
    r.name as role_name,
    r.description as role_description
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE u.username = :'target_username'
ORDER BY r.name;

-- Promote user to local admin (optional - for local admin privileges)
UPDATE users 
SET 
    is_local_admin = true,
    updated_at = NOW()
WHERE username = :'target_username';

-- Remove existing roles (except basic 'user' role if needed)
DELETE FROM user_roles 
WHERE user_id = (SELECT id FROM users WHERE username = :'target_username')
AND role_id NOT IN (SELECT id FROM roles WHERE name = 'user');

-- Assign admin role
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.username = :'target_username'
AND r.name = 'admin'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Also assign district_manager role for full DocFlow access
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.username = :'target_username'
AND r.name = 'district_manager'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Optionally assign uploader role for document management
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.username = :'target_username'
AND r.name = 'uploader'
ON CONFLICT (user_id, role_id) DO NOTHING;

\echo '';
\echo '============================================';
\echo 'User Promotion Completed Successfully!';
\echo '============================================';

-- Show user details after promotion
\echo '';
\echo 'User Details AFTER Promotion:';
\echo '=============================';
SELECT 
    username,
    first_name,
    last_name,
    email,
    is_local_admin,
    ba,
    cost_center,
    position,
    updated_at::timestamp as last_updated
FROM users 
WHERE username = :'target_username';

-- Show new roles after promotion
\echo '';
\echo 'New Roles AFTER Promotion:';
\echo '==========================';
SELECT 
    r.name as role_name,
    r.description as role_description
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE u.username = :'target_username'
ORDER BY r.name;

-- Show total permissions available
\echo '';
\echo 'Total Permissions Available:';
\echo '===========================';
SELECT 
    COUNT(DISTINCT p.name) as total_permissions,
    STRING_AGG(DISTINCT r.name, ', ') as roles_assigned
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE u.username = :'target_username';

-- Show specific admin permissions
\echo '';
\echo 'Key Admin Permissions:';
\echo '=====================';
SELECT DISTINCT
    p.name as permission,
    p.description
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE u.username = :'target_username'
AND p.name LIKE 'admin:%'
ORDER BY p.name;

\echo '';
\echo '============================================';
\echo 'IMPORTANT NOTES:';
\echo '1. User now has full administrative access';
\echo '2. Can manage all users, roles, and system settings';
\echo '3. Can access all DocFlow documents across branches';
\echo '4. Review admin access regularly for security';
\echo '5. Consider implementing admin activity logging';
\echo '============================================';

-- Create audit log entry for this promotion
INSERT INTO activity_logs (
    user_id,
    action,
    details,
    ip_address,
    created_at
) SELECT 
    id,
    'USER_PROMOTED_TO_ADMIN',
    jsonb_build_object(
        'promoted_user', :'target_username',
        'promoted_to_roles', ARRAY['admin', 'district_manager', 'uploader'],
        'promoted_by', 'SQL_SCRIPT',
        'timestamp', NOW()
    ),
    '127.0.0.1'::inet,
    NOW()
FROM users 
WHERE username = :'target_username';

\echo '';
\echo 'Audit log entry created for this promotion.';