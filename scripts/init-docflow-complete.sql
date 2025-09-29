-- DocFlow Complete Database Initialization Script
-- This script creates all tables, roles, permissions, and R6 branches data
-- Based on Drizzle schema and existing initialization scripts

-- =====================================================
-- 1. Create Tables (based on Drizzle schema)
-- =====================================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    email VARCHAR(255),
    password TEXT,
    is_local_admin BOOLEAN DEFAULT false,
    cost_center VARCHAR(255),
    ba VARCHAR(255),
    part VARCHAR(255),
    area VARCHAR(255),
    job_name VARCHAR(255),
    level VARCHAR(255),
    div_name VARCHAR(255),
    dep_name VARCHAR(255),
    org_name VARCHAR(255),
    position VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- User Roles junction table
CREATE TABLE IF NOT EXISTS user_roles (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- Role Permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    refresh_token TEXT NOT NULL,
    expires TIMESTAMP NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Branches table (R6 specific)
CREATE TABLE IF NOT EXISTS branches (
    id SERIAL PRIMARY KEY,
    ba_code INTEGER NOT NULL UNIQUE,
    branch_code BIGINT NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    department_name VARCHAR(255),
    region_id INTEGER NOT NULL DEFAULT 6,
    region_code VARCHAR(10) NOT NULL DEFAULT 'R6',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    file_path VARCHAR(500) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_size INTEGER,
    branch_ba_code INTEGER NOT NULL REFERENCES branches(ba_code),
    upload_date DATE NOT NULL,
    mt_number VARCHAR(100) NOT NULL,
    mt_date DATE NOT NULL,
    subject TEXT NOT NULL,
    month_year VARCHAR(20) NOT NULL,
    doc_received_date DATE,
    has_additional_docs BOOLEAN DEFAULT false,
    additional_docs_count INTEGER DEFAULT 0,
    additional_docs TEXT[],
    status VARCHAR(50) NOT NULL DEFAULT 'sent_to_branch',
    uploader_id INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Additional document files table
CREATE TABLE IF NOT EXISTS additional_document_files (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    item_index INTEGER NOT NULL,
    item_name TEXT NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    uploader_id INTEGER NOT NULL REFERENCES users(id),
    is_verified BOOLEAN,
    verified_by INTEGER REFERENCES users(id),
    verified_at TIMESTAMP,
    verification_comment TEXT,
    correction_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    document_id INTEGER REFERENCES documents(id),
    branch_ba_code INTEGER REFERENCES branches(ba_code),
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Document status history table
CREATE TABLE IF NOT EXISTS document_status_history (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    from_status VARCHAR(50),
    to_status VARCHAR(50) NOT NULL,
    changed_by INTEGER NOT NULL REFERENCES users(id),
    comment TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- System Settings table
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    setting_type VARCHAR(20) NOT NULL DEFAULT 'string',
    description TEXT,
    updated_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Additional Document Correction Tracking table
-- This table preserves correction counts across delete/re-upload cycles
CREATE TABLE IF NOT EXISTS additional_document_correction_tracking (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    item_index INTEGER NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    correction_count INTEGER NOT NULL DEFAULT 0,
    last_updated TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(document_id, item_index)
);

-- =====================================================
-- 2. Insert Default Roles
-- =====================================================

INSERT INTO roles (name, description, created_at, updated_at) VALUES
-- Basic system roles
('admin', 'System Administrator with full access', NOW(), NOW()),
('user', 'Regular user with limited access', NOW(), NOW()),
-- DocFlow specific roles
('uploader', 'ผู้อัปโหลดเอกสาร', NOW(), NOW()),
('branch_user', 'ผู้ใช้สาขา', NOW(), NOW()),
('branch_manager', 'หัวหน้าสาขา', NOW(), NOW()),
('district_manager', 'ผู้จัดการเขต', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 3. Insert Permissions
-- =====================================================

INSERT INTO permissions (name, description, created_at, updated_at) VALUES
-- Basic system permissions
('dashboard:access', 'เข้าถึงแดชบอร์ด', NOW(), NOW()),
('reports:read', 'อ่านรายงาน', NOW(), NOW()),
('users:read', 'อ่านข้อมูลผู้ใช้', NOW(), NOW()),

-- Document permissions
('documents:create', 'สร้างเอกสารใหม่', NOW(), NOW()),
('documents:upload', 'อัปโหลดไฟล์เอกสาร', NOW(), NOW()),
('documents:read_branch', 'อ่านเอกสารของสาขาตนเอง', NOW(), NOW()),
('documents:read_all_branches', 'อ่านเอกสารทุกสาขา', NOW(), NOW()),
('documents:update_status', 'อัปเดทสถานะเอกสาร', NOW(), NOW()),
('documents:approve', 'อนุมัติเอกสาร', NOW(), NOW()),
('documents:delete', 'ลบเอกสาร', NOW(), NOW()),

-- Comment permissions
('comments:create', 'เพิ่มความคิดเห็น', NOW(), NOW()),
('comments:read', 'อ่านความคิดเห็น', NOW(), NOW()),
('comments:update', 'แก้ไขความคิดเห็น', NOW(), NOW()),
('comments:delete', 'ลบความคิดเห็น', NOW(), NOW()),

-- Notification permissions
('notifications:send', 'ส่งการแจ้งเตือน', NOW(), NOW()),
('notifications:manage', 'จัดการการแจ้งเตือน', NOW(), NOW()),

-- Report permissions
('reports:branch', 'ดูรายงานระดับสาขา', NOW(), NOW()),
('reports:region', 'ดูรายงานระดับเขต', NOW(), NOW()),
('reports:system', 'ดูรายงานระดับระบบ', NOW(), NOW()),

-- Admin permissions
('admin:users', 'จัดการผู้ใช้งาน', NOW(), NOW()),
('admin:roles', 'จัดการบทบาท', NOW(), NOW()),
('admin:system', 'จัดการระบบ', NOW(), NOW()),
('admin:full_access', 'เข้าถึงระบบแอดมินทั้งหมด', NOW(), NOW()),

-- Settings permissions
('settings:manage', 'จัดการการตั้งค่าระบบ', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 4. Assign Permissions to Roles
-- =====================================================

-- Admin gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Uploader permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'uploader'
AND p.name IN (
    'documents:create',
    'documents:upload',
    'notifications:send',
    'dashboard:access',
    'reports:read'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Branch User permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'branch_user'
AND p.name IN (
    'documents:read_branch',
    'documents:update_status',
    'comments:create',
    'comments:read',
    'dashboard:access',
    'reports:read'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Branch Manager permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'branch_manager'
AND p.name IN (
    'documents:read_all_branches',
    'documents:update_status',
    'documents:approve',
    'comments:create',
    'comments:read',
    'reports:branch',
    'reports:region',
    'dashboard:access',
    'reports:read'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- District Manager permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'district_manager'
AND p.name IN (
    'documents:create',
    'documents:upload',
    'documents:read_all_branches',
    'documents:update_status',
    'documents:approve',
    'comments:create',
    'comments:read',
    'notifications:send',
    'reports:branch',
    'reports:region',
    'reports:system',
    'dashboard:access',
    'reports:read',
    'settings:manage'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Regular User permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'user'
AND p.name IN (
    'documents:read_branch',
    'comments:create',
    'comments:read',
    'dashboard:access',
    'reports:read'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- =====================================================
-- 5. Insert R6 Branches Data (from CSV)
-- =====================================================

INSERT INTO branches (ba_code, branch_code, name, department_name, region_id, region_code, is_active, created_at, updated_at) VALUES
(1060, 5521011, 'กปภ.สาขาขอนแก่น(ชั้นพิเศษ)', NULL, 6, 'R6', true, NOW(), NOW()),
(1061, 5521012, 'กปภ.สาขาบ้านไผ่', NULL, 6, 'R6', true, NOW(), NOW()),
(1062, 5521013, 'กปภ.สาขาชุมแพ', NULL, 6, 'R6', true, NOW(), NOW()),
(1063, 5521014, 'กปภ.สาขาน้ำพอง', NULL, 6, 'R6', true, NOW(), NOW()),
(1064, 5521015, 'กปภ.สาขาชนบท', NULL, 6, 'R6', true, NOW(), NOW()),
(1065, 5521016, 'กปภ.สาขากระนวน', NULL, 6, 'R6', true, NOW(), NOW()),
(1066, 5521017, 'กปภ.สาขาหนองเรือ', NULL, 6, 'R6', true, NOW(), NOW()),
(1067, 5521018, 'กปภ.สาขาเมืองพล', NULL, 6, 'R6', true, NOW(), NOW()),
(1068, 5521019, 'กปภ.สาขากาฬสินธุ์', NULL, 6, 'R6', true, NOW(), NOW()),
(1069, 5521020, 'กปภ.สาขากุฉินารายณ์', NULL, 6, 'R6', true, NOW(), NOW()),
(1070, 5521021, 'กปภ.สาขาสมเด็จ', NULL, 6, 'R6', true, NOW(), NOW()),
(1071, 5521022, 'กปภ.สาขามหาสารคาม', NULL, 6, 'R6', true, NOW(), NOW()),
(1072, 5521023, 'กปภ.สาขาพยัคฆภูมิพิสัย', NULL, 6, 'R6', true, NOW(), NOW()),
(1073, 5521024, 'กปภ.สาขาชัยภูมิ', NULL, 6, 'R6', true, NOW(), NOW()),
(1074, 5521025, 'กปภ.สาขาแก้งคร้อ', NULL, 6, 'R6', true, NOW(), NOW()),
(1075, 5521026, 'กปภ.สาขาจัตุรัส', NULL, 6, 'R6', true, NOW(), NOW()),
(1076, 5521027, 'กปภ.สาขาหนองบัวแดง', NULL, 6, 'R6', true, NOW(), NOW()),
(1077, 5521028, 'กปภ.สาขาภูเขียว', NULL, 6, 'R6', true, NOW(), NOW()),
(1133, 5521029, 'กปภ.สาขาร้อยเอ็ด', NULL, 6, 'R6', true, NOW(), NOW()),
(1134, 5521030, 'กปภ.สาขาโพนทอง', NULL, 6, 'R6', true, NOW(), NOW()),
(1135, 5521031, 'กปภ.สาขาสุวรรณภูมิ', NULL, 6, 'R6', true, NOW(), NOW()),
(1245, 5521032, 'กปภ.สาขาบำเหน็จณรงค์', NULL, 6, 'R6', true, NOW(), NOW())
ON CONFLICT (ba_code) DO NOTHING;

-- Insert BA1059 Department branches
INSERT INTO branches (ba_code, branch_code, name, department_name, region_id, region_code, is_active, created_at, updated_at) VALUES
(105901, 105901, 'กปภ.เขต 6 - งานพัสดุ', 'งานพัสดุ', 6, 'R6', true, NOW(), NOW()),
(105902, 105902, 'กปภ.เขต 6 - งานธุรการ', 'งานธุรการ', 6, 'R6', true, NOW(), NOW()),
(105903, 105903, 'กปภ.เขต 6 - งานบัญชีเจ้าหนี้', 'งานบัญชีเจ้าหนี้', 6, 'R6', true, NOW(), NOW()),
(105904, 105904, 'กปภ.เขต 6 - งานการเงิน', 'งานการเงิน', 6, 'R6', true, NOW(), NOW()),
(105905, 105905, 'กปภ.เขต 6 - งานบุคคล', 'งานบุคคล', 6, 'R6', true, NOW(), NOW())
ON CONFLICT (ba_code) DO NOTHING;

-- =====================================================
-- 6. Create Performance Indexes
-- =====================================================

-- Documents table indexes
CREATE INDEX IF NOT EXISTS idx_documents_branch_status ON documents(branch_ba_code, status);
CREATE INDEX IF NOT EXISTS idx_documents_upload_date ON documents(upload_date DESC);
CREATE INDEX IF NOT EXISTS idx_documents_uploader ON documents(uploader_id);
CREATE INDEX IF NOT EXISTS idx_documents_mt_number ON documents(mt_number);

-- Activity logs indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_action ON activity_logs(user_id, action, created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_document ON activity_logs(document_id, created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_branch ON activity_logs(branch_ba_code, created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- Comments indexes
CREATE INDEX IF NOT EXISTS idx_comments_document ON comments(document_id, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id, created_at);

-- Document status history indexes
CREATE INDEX IF NOT EXISTS idx_doc_status_history_document ON document_status_history(document_id, created_at);
CREATE INDEX IF NOT EXISTS idx_doc_status_history_user ON document_status_history(changed_by, created_at);

-- Branches indexes
CREATE INDEX IF NOT EXISTS idx_branches_ba_code ON branches(ba_code);
CREATE INDEX IF NOT EXISTS idx_branches_region ON branches(region_code, is_active);

-- Department-specific indexes
CREATE INDEX IF NOT EXISTS idx_branches_department_name ON branches(department_name);
CREATE INDEX IF NOT EXISTS idx_branches_ba_dept_composite ON branches(ba_code, department_name);

-- Add unique constraint for ba_code + department_name
ALTER TABLE branches ADD CONSTRAINT IF NOT EXISTS branches_ba_dept_unique
UNIQUE (ba_code, department_name);

-- User roles and permissions indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);

-- Users table additional indexes for DocFlow
CREATE INDEX IF NOT EXISTS idx_users_ba ON users(ba);
CREATE INDEX IF NOT EXISTS idx_users_cost_center ON users(cost_center);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- System settings indexes
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_system_settings_type ON system_settings(setting_type);

-- Additional document correction tracking indexes
CREATE INDEX IF NOT EXISTS idx_correction_tracking_document ON additional_document_correction_tracking(document_id, item_index);
CREATE INDEX IF NOT EXISTS idx_correction_tracking_updated ON additional_document_correction_tracking(last_updated DESC);

-- Additional document files indexes for correction count
CREATE INDEX IF NOT EXISTS idx_additional_files_correction_count ON additional_document_files(document_id, correction_count);
CREATE INDEX IF NOT EXISTS idx_additional_files_verification ON additional_document_files(document_id, is_verified);

-- =====================================================
-- 7. Insert Default System Settings
-- =====================================================

INSERT INTO system_settings (setting_key, setting_value, setting_type, description, created_at, updated_at) VALUES
('maintenance_mode', 'false', 'boolean', 'Enable/disable system maintenance mode', NOW(), NOW()),
('telegram_notifications_enabled', 'false', 'boolean', 'Enable/disable Telegram notifications', NOW(), NOW()),
('file_cleanup_retention_days', '365', 'number', 'Number of days to retain old files before cleanup', NOW(), NOW()),
('document_upload_max_size_mb', '50', 'number', 'Maximum file size for document uploads in MB', NOW(), NOW()),
('session_timeout_minutes', '30', 'number', 'Session idle timeout in minutes', NOW(), NOW()),
('max_login_attempts', '5', 'number', 'Maximum login attempts before lockout', NOW(), NOW())
ON CONFLICT (setting_key) DO NOTHING;

-- =====================================================
-- 8. Display Summary
-- =====================================================

\echo '========================================';
\echo 'DocFlow Database Initialization Complete';
\echo '========================================';

SELECT 'Tables Created' as status, count(*) as count 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';

SELECT 'Roles Created' as status, count(*) as count FROM roles;
SELECT 'Permissions Created' as status, count(*) as count FROM permissions;
SELECT 'Total Branches Created' as status, count(*) as count FROM branches;
SELECT 'R6 Regular Branches' as status, count(*) as count FROM branches WHERE department_name IS NULL;
SELECT 'BA1059 Departments' as status, count(*) as count FROM branches WHERE department_name IS NOT NULL;
SELECT 'System Settings Created' as status, count(*) as count FROM system_settings;

\echo '';
\echo 'R6 Regular Branches Summary:';
SELECT ba_code, name FROM branches WHERE department_name IS NULL ORDER BY ba_code;

\echo '';
\echo 'BA1059 Department Branches Summary:';
SELECT ba_code, name, department_name FROM branches WHERE department_name IS NOT NULL ORDER BY ba_code;

\echo '';
\echo 'Role-Permission Summary:';
SELECT r.name as role, count(rp.permission_id) as permissions_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY r.name
ORDER BY r.name;

\echo '';
\echo 'Department URLs Available:';
\echo '  - /documents/branch/105901 (งานพัสดุ)';
\echo '  - /documents/branch/105902 (งานธุรการ)';
\echo '  - /documents/branch/105903 (งานบัญชีเจ้าหนี้)';
\echo '  - /documents/branch/105904 (งานการเงิน)';
\echo '  - /documents/branch/105905 (งานบุคคล)';
\echo '';
\echo 'Recent Updates:';
\echo '  - Added correction_count column to additional_document_files';
\echo '  - Added additional_document_correction_tracking table for persistence';
\echo '  - Added performance indexes for correction count features';
\echo '';
\echo 'DocFlow Database Initialization Complete!';
\echo 'Ready to start the application with: pnpm dev';