-- Create PWA User Script
-- This script manually creates a PWA user in the database
-- Usage: psql -U postgres -d pwausers_db -v username='11008' -f scripts/create-pwa-user.sql

\echo '============================================';
\echo 'Creating PWA User Account';
\echo '============================================';

-- Set user data (modify these as needed)
\set target_username '11008'  -- Replace with actual PWA username
\set user_first_name 'กองเทคโนโลยีสารสนเทศ'  -- From PWA data
\set user_last_name ''
\set user_email 'RutthawiaC@pwa.co.th'  -- From PWA data
\set user_ba '1059'  -- District BA code
\set user_cost_center ''
\set user_part '2'
\set user_area ''
\set user_job_name 'นักวิชาการคอมพิวเตอร์'
\set user_level ''
\set user_div_name ''
\set user_dep_name ''
\set user_org_name 'การประปาส่วนภูมิภาคเขต 6'
\set user_position 'สายงานสายงานรองผู้จัดการ (ปฏิบัติการ 2)'

-- Create the PWA user
INSERT INTO users (
    username, 
    first_name, 
    last_name, 
    email,
    password,  -- NULL for PWA users (external auth)
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
    :'target_username',
    :'user_first_name',
    :'user_last_name',
    :'user_email',
    NULL,  -- PWA users don't have local passwords
    false,  -- Not a local admin initially
    :'user_cost_center',
    :'user_ba',
    :'user_part',
    :'user_area',
    :'user_job_name',
    :'user_level',
    :'user_div_name',
    :'user_dep_name',
    :'user_org_name',
    :'user_position',
    NOW(),
    NOW()
) ON CONFLICT (username) DO UPDATE SET
    first_name = :'user_first_name',
    last_name = :'user_last_name',
    email = :'user_email',
    ba = :'user_ba',
    part = :'user_part',
    job_name = :'user_job_name',
    org_name = :'user_org_name',
    position = :'user_position',
    updated_at = NOW();

-- Assign basic user role
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.username = :'target_username'
AND r.name = 'user'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Auto-assign roles based on BA code
-- BA 1059 is district level, so assign district_manager role
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.username = :'target_username'
AND u.ba = '1059'
AND r.name = 'district_manager'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Also assign uploader role for district managers
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.username = :'target_username'
AND u.ba = '1059'
AND r.name = 'uploader'
ON CONFLICT (user_id, role_id) DO NOTHING;

\echo '';
\echo 'PWA User Created Successfully!';
\echo '=============================';

-- Show created user details
SELECT 
    'User Details' as section,
    username,
    first_name,
    last_name,
    email,
    is_local_admin,
    ba,
    part,
    org_name,
    position,
    created_at::date as created_date
FROM users 
WHERE username = :'target_username';

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
WHERE u.username = :'target_username'
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
WHERE u.username = :'target_username'
GROUP BY u.username;

\echo '';
\echo '============================================';
\echo 'PWA User Creation Notes:';
\echo '1. User created based on PWA organizational data';
\echo '2. Auto-assigned roles based on BA code (1059 = district)';
\echo '3. User can now login via PWA authentication';
\echo '4. User can be promoted to admin using promote script';
\echo '============================================';