/**
 * Simple DocFlow Initialization Script
 */

import { Client } from 'pg';

// R6 Branches data
const R6_BRANCHES = [
  { ba_code: 1060, branch_code: 5521011, name: "กปภ.สาขาขอนแก่น(ชั้นพิเศษ)", region_id: 6, region_code: "R6" },
  { ba_code: 1061, branch_code: 5521012, name: "กปภ.สาขาบ้านไผ่", region_id: 6, region_code: "R6" },
  { ba_code: 1062, branch_code: 5521013, name: "กปภ.สาขาชุมแพ", region_id: 6, region_code: "R6" },
  { ba_code: 1063, branch_code: 5521014, name: "กปภ.สาขาน้ำพอง", region_id: 6, region_code: "R6" },
  { ba_code: 1064, branch_code: 5521015, name: "กปภ.สาขาชนบท", region_id: 6, region_code: "R6" },
  { ba_code: 1065, branch_code: 5521016, name: "กปภ.สาขากระนวน", region_id: 6, region_code: "R6" },
  { ba_code: 1066, branch_code: 5521017, name: "กปภ.สาขาหนองเรือ", region_id: 6, region_code: "R6" },
  { ba_code: 1067, branch_code: 5521018, name: "กปภ.สาขาเมืองพล", region_id: 6, region_code: "R6" },
  { ba_code: 1068, branch_code: 5521019, name: "กปภ.สาขากาฬสินธุ์", region_id: 6, region_code: "R6" },
  { ba_code: 1069, branch_code: 5521020, name: "กปภ.สาขากุฉินารายณ์", region_id: 6, region_code: "R6" },
  { ba_code: 1070, branch_code: 5521021, name: "กปภ.สาขาสมเด็จ", region_id: 6, region_code: "R6" },
  { ba_code: 1071, branch_code: 5521022, name: "กปภ.สาขามหาสารคาม", region_id: 6, region_code: "R6" },
  { ba_code: 1072, branch_code: 5521023, name: "กปภ.สาขาพยัคฆภูมิพิสัย", region_id: 6, region_code: "R6" },
  { ba_code: 1073, branch_code: 5521024, name: "กปภ.สาขาชัยภูมิ", region_id: 6, region_code: "R6" },
  { ba_code: 1074, branch_code: 5521025, name: "กปภ.สาขาแก้งคร้อ", region_id: 6, region_code: "R6" },
  { ba_code: 1075, branch_code: 5521026, name: "กปภ.สาขาจัตุรัส", region_id: 6, region_code: "R6" },
  { ba_code: 1076, branch_code: 5521027, name: "กปภ.สาขาหนองบัวแดง", region_id: 6, region_code: "R6" },
  { ba_code: 1077, branch_code: 5521028, name: "กปภ.สาขาภูเขียว", region_id: 6, region_code: "R6" },
  { ba_code: 1133, branch_code: 5521029, name: "กปภ.สาขาร้อยเอ็ด", region_id: 6, region_code: "R6" },
  { ba_code: 1134, branch_code: 5521030, name: "กปภ.สาขาโพนทอง", region_id: 6, region_code: "R6" },
  { ba_code: 1135, branch_code: 5521031, name: "กปภ.สาขาสุวรรณภูมิ", region_id: 6, region_code: "R6" },
  { ba_code: 1245, branch_code: 5521032, name: "กปภ.สาขาบำเหน็จณรงค์", region_id: 6, region_code: "R6" }
];

// DocFlow roles and permissions
const NEW_ROLES = [
  { name: 'uploader', description: 'ผู้อัปโหลดเอกสาร' },
  { name: 'branch_user', description: 'ผู้ใช้สาขา' },
  { name: 'branch_manager', description: 'หัวหน้าสาขา' },
  { name: 'district_manager', description: 'ผู้จัดการเขต' }
];

const NEW_PERMISSIONS = [
  { name: 'documents:create', description: 'สร้างเอกสารใหม่' },
  { name: 'documents:upload', description: 'อัปโหลดไฟล์เอกสาร' },
  { name: 'documents:read_branch', description: 'อ่านเอกสารของสาขาตนเอง' },
  { name: 'documents:read_all_branches', description: 'อ่านเอกสารทุกสาขา' },
  { name: 'documents:update_status', description: 'อัปเดทสถานะเอกสาร' },
  { name: 'documents:approve', description: 'อนุมัติเอกสาร' },
  { name: 'documents:delete', description: 'ลบเอกสาร' },
  { name: 'comments:create', description: 'เพิ่มความคิดเห็น' },
  { name: 'comments:read', description: 'อ่านความคิดเห็น' },
  { name: 'notifications:send', description: 'ส่งการแจ้งเตือน' },
  { name: 'reports:branch', description: 'ดูรายงานระดับสาขา' },
  { name: 'reports:region', description: 'ดูรายงานระดับเขต' },
  { name: 'admin:users', description: 'จัดการผู้ใช้งาน' },
  { name: 'admin:roles', description: 'จัดการบทบาท' },
  { name: 'admin:system', description: 'จัดการระบบ' }
];

async function main() {
  console.log('🚀 Starting DocFlow initialization...');

  // Use the same connection string from the environment or default
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pwausers_db';
  
  const client = new Client({
    connectionString: connectionString
  });

  try {
    console.log('📡 Connecting to database...');
    await client.connect();
    console.log('✅ Database connection successful');

    // Initialize branches
    console.log('🏢 Initializing R6 branches...');
    await initializeBranches(client);
    console.log('✅ Branches initialized successfully');

    // Initialize roles
    console.log('👥 Setting up DocFlow roles...');
    await initializeRoles(client);
    console.log('✅ Roles setup complete');

    // Initialize permissions
    console.log('🔐 Setting up DocFlow permissions...');
    await initializePermissions(client);
    console.log('✅ Permissions setup complete');

    // Assign permissions to roles
    console.log('🔗 Assigning permissions to roles...');
    await assignRolePermissions(client);
    console.log('✅ Role permissions assigned');

    // Create indexes
    console.log('⚡ Creating database indexes...');
    await createIndexes(client);
    console.log('✅ Database indexes created');

    console.log('🎉 DocFlow initialization completed successfully!');
    console.log('\n📋 Summary:');
    console.log('  - 22 R6 branches initialized');
    console.log('  - DocFlow roles and permissions created');
    console.log('  - Database indexes optimized');

  } catch (error) {
    console.error('❌ DocFlow initialization failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

async function initializeBranches(client) {
  // Check if branches already exist
  const { rows } = await client.query('SELECT COUNT(*) as count FROM branches');
  if (parseInt(rows[0].count) > 0) {
    console.log('  Branches already exist, skipping...');
    return;
  }

  // Insert branches
  for (const branch of R6_BRANCHES) {
    await client.query(`
      INSERT INTO branches (ba_code, branch_code, name, region_id, region_code, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
      ON CONFLICT (ba_code) DO NOTHING
    `, [branch.ba_code, branch.branch_code, branch.name, branch.region_id, branch.region_code]);
  }
  
  console.log(`  Inserted ${R6_BRANCHES.length} branches`);
}

async function initializeRoles(client) {
  for (const role of NEW_ROLES) {
    await client.query(`
      INSERT INTO roles (name, description, created_at, updated_at)
      VALUES ($1, $2, NOW(), NOW())
      ON CONFLICT (name) DO NOTHING
    `, [role.name, role.description]);
  }
  console.log(`  Created ${NEW_ROLES.length} roles`);
}

async function initializePermissions(client) {
  for (const permission of NEW_PERMISSIONS) {
    await client.query(`
      INSERT INTO permissions (name, description, created_at, updated_at)
      VALUES ($1, $2, NOW(), NOW())
      ON CONFLICT (name) DO NOTHING
    `, [permission.name, permission.description]);
  }
  console.log(`  Created ${NEW_PERMISSIONS.length} permissions`);
}

async function assignRolePermissions(client) {
  const rolePermissionMapping = {
    'uploader': [
      'documents:create',
      'documents:upload', 
      'notifications:send',
      'dashboard:access',
      'reports:read'
    ],
    'branch_user': [
      'documents:read_branch',
      'documents:update_status',
      'comments:create',
      'comments:read',
      'dashboard:access',
      'reports:read'
    ],
    'branch_manager': [
      'documents:read_all_branches',
      'documents:update_status',
      'documents:approve',
      'comments:create',
      'comments:read',
      'reports:branch',
      'reports:region',
      'dashboard:access',
      'reports:read'
    ],
    'district_manager': [
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
      'reports:read'
    ],
    'admin': NEW_PERMISSIONS.map(p => p.name), // Admin gets all permissions
    'user': [
      'documents:read_branch',
      'comments:create',
      'comments:read', 
      'dashboard:access',
      'reports:read'
    ]
  };

  for (const [roleName, permissionNames] of Object.entries(rolePermissionMapping)) {
    // Get role ID
    const roleResult = await client.query('SELECT id FROM roles WHERE name = $1', [roleName]);
    if (roleResult.rows.length === 0) continue;
    
    const roleId = roleResult.rows[0].id;

    for (const permissionName of permissionNames) {
      // Get permission ID
      const permResult = await client.query('SELECT id FROM permissions WHERE name = $1', [permissionName]);
      if (permResult.rows.length === 0) continue;
      
      const permissionId = permResult.rows[0].id;

      // Assign permission to role
      await client.query(`
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES ($1, $2)
        ON CONFLICT (role_id, permission_id) DO NOTHING
      `, [roleId, permissionId]);
    }
    
    console.log(`  Assigned permissions to role: ${roleName}`);
  }
}

async function createIndexes(client) {
  const indexes = [
    // Documents table indexes
    'CREATE INDEX IF NOT EXISTS idx_documents_branch_status ON documents(branch_ba_code, status)',
    'CREATE INDEX IF NOT EXISTS idx_documents_upload_date ON documents(upload_date DESC)',
    'CREATE INDEX IF NOT EXISTS idx_documents_uploader ON documents(uploader_id)',
    'CREATE INDEX IF NOT EXISTS idx_documents_mt_number ON documents(mt_number)',
    
    // Activity logs indexes
    'CREATE INDEX IF NOT EXISTS idx_activity_logs_user_action ON activity_logs(user_id, action, created_at)',
    'CREATE INDEX IF NOT EXISTS idx_activity_logs_document ON activity_logs(document_id, created_at)',
    'CREATE INDEX IF NOT EXISTS idx_activity_logs_branch ON activity_logs(branch_ba_code, created_at)',
    'CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC)',
    
    // Comments indexes
    'CREATE INDEX IF NOT EXISTS idx_comments_document ON comments(document_id, created_at)',
    'CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id, created_at)',
    
    // Document status history indexes
    'CREATE INDEX IF NOT EXISTS idx_doc_status_history_document ON document_status_history(document_id, created_at)',
    'CREATE INDEX IF NOT EXISTS idx_doc_status_history_user ON document_status_history(changed_by, created_at)',
    
    // Branches indexes
    'CREATE INDEX IF NOT EXISTS idx_branches_ba_code ON branches(ba_code)',
    'CREATE INDEX IF NOT EXISTS idx_branches_region ON branches(region_code, is_active)',
    
    // User roles and permissions indexes
    'CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id)',
    'CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id)',
    'CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id)',
    
    // Users table additional indexes for DocFlow
    'CREATE INDEX IF NOT EXISTS idx_users_ba ON users(ba)',
    'CREATE INDEX IF NOT EXISTS idx_users_cost_center ON users(cost_center)',
    'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)'
  ];

  for (const indexSQL of indexes) {
    try {
      await client.query(indexSQL);
      const indexName = indexSQL.split(' ')[5];
      console.log(`  ✓ Created index: ${indexName}`);
    } catch (error) {
      console.warn(`  ⚠ Index creation warning: ${error.message}`);
    }
  }
}

// Run the script
main();