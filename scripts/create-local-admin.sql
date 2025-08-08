-- Create Local Admin User Script
-- This script creates a local administrator account for DocFlow system
-- Usage: psql -U postgres -d docflow_db -f scripts/create-local-admin.sql

\echo '============================================';
\echo 'Creating Local Administrator Account';
\echo '============================================';

-- Variables (modify these as needed)
-- Note: In production, these should be passed as environment variables
\set admin_username 'localadmin'
\set admin_password 'Admin123!'  -- Change this to a secure password
\set admin_email 'admin@docflow.local'
\set admin_first_name 'Local'
\set admin_last_name 'Administrator'

-- Create the local admin user
INSERT INTO users (
    username, 
    first_name, 
    last_name, 
    email, 
    password,
    is_local_admin,
    cost_center,
    ba,
    part,
    area,
    job_name,
    level,
    div_name,
    dep_name,
    org_name,
    position,
    created_at, 
    updated_at
) VALUES (
    :'admin_username',
    :'admin_first_name',
    :'admin_last_name',
    :'admin_email',
    -- Password should be hashed using bcrypt in real application
    -- For now, using plain text (THIS IS NOT SECURE FOR PRODUCTION)
    :'admin_password',
    true,  -- is_local_admin flag
    'ADMIN_CENTER',
    '1059',  -- District BA code
    'IT',
    'SYSTEM',
    'System Administrator',
    'ADMIN',
    'Information Technology',
    'System Administration',
    'Provincial Waterworks Authority',
    'System Administrator',
    NOW(),
    NOW()
) ON CONFLICT (username) DO UPDATE SET
    is_local_admin = true,
    first_name = :'admin_first_name',
    last_name = :'admin_last_name',
    email = :'admin_email',
    updated_at = NOW();

-- Get the user ID for role assignment
\set user_id_query 'SELECT id FROM users WHERE username = ' :'admin_username'

-- Assign admin role to the user
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.username = :'admin_username'
AND r.name = 'admin'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Also assign district_manager role for full DocFlow access
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.username = :'admin_username'
AND r.name = 'district_manager'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Verification and summary
\echo '';
\echo 'Local Admin User Created Successfully!';
\echo '====================================';

-- Show created user details
SELECT 
    'User Details' as section,
    username,
    first_name,
    last_name,
    email,
    is_local_admin,
    ba,
    position,
    created_at::date as created_date
FROM users 
WHERE username = :'admin_username';

-- Show assigned roles
\echo '';
\echo 'Assigned Roles:';
SELECT 
    u.username,
    r.name as role_name,
    r.description as role_description
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE u.username = :'admin_username'
ORDER BY r.name;

-- Show permissions count
\echo '';
\echo 'Total Permissions:';
SELECT 
    u.username,
    COUNT(DISTINCT p.name) as total_permissions
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE u.username = :'admin_username'
GROUP BY u.username;

\echo '';
\echo '============================================';
\echo 'IMPORTANT SECURITY NOTES:';
\echo '1. Change the default password immediately';
\echo '2. Enable proper password hashing in production';
\echo '3. Consider using environment variables for credentials';
\echo '4. Review and audit admin access regularly';
\echo '============================================';