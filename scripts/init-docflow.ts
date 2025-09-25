/**
 * DocFlow Initialization Script
 * 
 * This script initializes the DocFlow system by:
 * 1. Creating branches from R6 data
 * 2. Setting up DocFlow roles and permissions
 * 3. Creating indexes for better performance
 */

import { getDb } from '../src/db/index.js';
import { BranchService } from '../src/lib/services/branch-service.js';
import { DocFlowAuth } from '../src/lib/auth/docflow-auth.js';

/**
 * Initialize BA1059 departments
 */
async function initializeBA1059Departments(db: any) {
  const { sql } = await import('drizzle-orm');

  // Check if departments already exist
  const existingDepts = await db.execute(sql`
    SELECT COUNT(*) as count FROM branches
    WHERE ba_code BETWEEN 105901 AND 105905
  `);

  if (existingDepts[0]?.count > 0) {
    console.log('  → BA1059 departments already exist, skipping...');
    return;
  }

  // Add department_name column if not exists
  await db.execute(sql`
    ALTER TABLE branches ADD COLUMN IF NOT EXISTS department_name VARCHAR(255)
  `);

  // Add unique constraint if not exists
  try {
    await db.execute(sql`
      ALTER TABLE branches ADD CONSTRAINT branches_ba_dept_unique
      UNIQUE (ba_code, department_name)
    `);
  } catch (error) {
    // Constraint might already exist, ignore
  }

  // Insert department records
  await db.execute(sql`
    INSERT INTO branches (ba_code, branch_code, name, department_name, region_id, region_code, is_active, created_at, updated_at)
    VALUES
    (105901, 105901, 'กปภ.เขต 6 - งานพัสดุ', 'งานพัสดุ', 6, 'R6', true, NOW(), NOW()),
    (105902, 105902, 'กปภ.เขต 6 - งานธุรการ', 'งานธุรการ', 6, 'R6', true, NOW(), NOW()),
    (105903, 105903, 'กปภ.เขต 6 - งานบัญชีเจ้าหนี้', 'งานบัญชีเจ้าหนี้', 6, 'R6', true, NOW(), NOW()),
    (105904, 105904, 'กปภ.เขต 6 - งานการเงิน', 'งานการเงิน', 6, 'R6', true, NOW(), NOW()),
    (105905, 105905, 'กปภ.เขต 6 - งานบุคคล', 'งานบุคคル', 6, 'R6', true, NOW(), NOW())
  `);

  console.log('  → 5 BA1059 departments created successfully');
}

async function main() {
  console.log('🚀 Starting DocFlow initialization...');

  try {
    // Test database connection
    console.log('📡 Testing database connection...');
    const db = await getDb();
    
    if (!db) {
      throw new Error('Failed to connect to database');
    }
    console.log('✅ Database connection successful');

    // Initialize branches
    console.log('🏢 Initializing R6 branches...');
    await BranchService.initializeBranchesFromData();
    console.log('✅ Branches initialized successfully');

    // Initialize BA1059 departments
    console.log('🏛️ Initializing BA1059 departments...');
    await initializeBA1059Departments(db);
    console.log('✅ BA1059 departments initialized successfully');

    // Initialize DocFlow roles and permissions
    console.log('👥 Setting up DocFlow roles and permissions...');
    await DocFlowAuth.initializeDocFlowRoles();
    console.log('✅ Roles and permissions setup complete');

    // Create database indexes for better performance
    console.log('⚡ Creating database indexes...');
    await createIndexes(db);
    console.log('✅ Database indexes created');

    console.log('🎉 DocFlow initialization completed successfully!');
    console.log('\n📋 Summary:');
    console.log('  - 22 R6 branches initialized');
    console.log('  - 5 BA1059 departments initialized');
    console.log('  - DocFlow roles and permissions created');
    console.log('  - Database indexes optimized');
    console.log('\n🏛️ Department URLs available:');
    console.log('  - /documents/branch/105901 (งานพัสดุ)');
    console.log('  - /documents/branch/105902 (งานธุรการ)');
    console.log('  - /documents/branch/105903 (งานบัญชีเจ้าหนี้)');
    console.log('  - /documents/branch/105904 (งานการเงิน)');
    console.log('  - /documents/branch/105905 (งานบุคคล)');
    console.log('\n🔗 Next steps:');
    console.log('  - Start the application: pnpm dev');
    console.log('  - Access the admin panel to assign user roles');
    console.log('  - Begin uploading documents');

  } catch (error) {
    console.error('❌ DocFlow initialization failed:', error);
    process.exit(1);
  }
}

async function createIndexes(db: any) {
  const indexes = [
    // Documents table indexes
    'CREATE INDEX IF NOT EXISTS idx_documents_branch_status ON documents(branch_ba_code, status)',
    'CREATE INDEX IF NOT EXISTS idx_documents_upload_date ON documents(upload_date DESC)',
    'CREATE INDEX IF NOT EXISTS idx_documents_uploader ON documents(uploader_id)',
    'CREATE INDEX IF NOT EXISTS idx_documents_mt_number ON documents(mt_number)',
    'CREATE INDEX IF NOT EXISTS idx_documents_subject ON documents USING gin(to_tsvector(\'english\', subject))',
    
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
    'CREATE INDEX IF NOT EXISTS idx_branches_name ON branches USING gin(to_tsvector(\'english\', name))',

    // Department-specific indexes
    'CREATE INDEX IF NOT EXISTS idx_branches_department_name ON branches(department_name)',
    'CREATE INDEX IF NOT EXISTS idx_branches_ba_dept_composite ON branches(ba_code, department_name)',
    
    // User roles and permissions indexes (for better RBAC performance)
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
      await db.execute(indexSQL);
      console.log(`  ✓ Created index: ${indexSQL.split(' ')[5]}`);
    } catch (error) {
      console.warn(`  ⚠ Index creation warning: ${error}`);
      // Continue with other indexes even if one fails
    }
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}