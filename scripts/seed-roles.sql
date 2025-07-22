-- scripts/seed-roles.sql
-- Seed default roles and permissions for the PWA authentication system

-- Insert default roles
INSERT INTO roles (name, description, created_at, updated_at) VALUES
('admin', 'Administrator with full access', NOW(), NOW()),
('manager', 'Manager with administrative access', NOW(), NOW()),
('user', 'Regular user with limited access', NOW(), NOW()),
('guest', 'Guest user with minimal access', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Insert default permissions
INSERT INTO permissions (name, description, created_at, updated_at) VALUES
('users:read', 'Can view users', NOW(), NOW()),
('users:create', 'Can create users', NOW(), NOW()),
('users:update', 'Can update users', NOW(), NOW()),
('users:delete', 'Can delete users', NOW(), NOW()),
('roles:read', 'Can view roles', NOW(), NOW()),
('roles:create', 'Can create roles', NOW(), NOW()),
('roles:update', 'Can update roles', NOW(), NOW()),
('roles:delete', 'Can delete roles', NOW(), NOW()),
('dashboard:access', 'Can access dashboard', NOW(), NOW()),
('reports:read', 'Can view reports', NOW(), NOW()),
('reports:create', 'Can create reports', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Assign permissions to roles
-- Admin gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Manager gets most permissions except user deletion
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'manager' 
AND p.name IN (
    'users:read', 'users:create', 'users:update',
    'roles:read', 'dashboard:access', 'reports:read', 'reports:create'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- User gets basic permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'user' 
AND p.name IN ('dashboard:access', 'reports:read')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Guest gets minimal permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'guest' 
AND p.name IN ('dashboard:access')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Display results
SELECT 'Roles created:' as message;
SELECT name, description FROM roles ORDER BY name;

SELECT 'Permissions created:' as message;
SELECT name, description FROM permissions ORDER BY name;

SELECT 'Role-Permission assignments:' as message;
SELECT r.name as role, p.name as permission
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON p.id = rp.permission_id
ORDER BY r.name, p.name;