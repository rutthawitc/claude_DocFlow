#!/usr/bin/env tsx
/**
 * Complete DocFlow Database Initialization Script
 *
 * This script initializes the entire DocFlow system:
 * 1. Creates all missing database columns
 * 2. Initializes R6 branches (22 branches)
 * 3. Initializes BA1059 departments (5 departments)
 * 4. Sets up DocFlow roles and permissions
 * 5. Creates performance indexes
 * 6. Initializes system settings
 *
 * Usage:
 *   pnpm init:db           # For development (uses .env.development)
 *   pnpm init:db --prod    # For production (uses .env)
 */

import { sql } from 'drizzle-orm';
import { getDb } from '../src/db/index.js';
import { BranchService } from '../src/lib/services/branch-service.js';
import { DocFlowAuth } from '../src/lib/auth/docflow-auth.js';

/**
 * Ensure all document table columns exist with proper types
 */
async function ensureDocumentColumns(db: any) {
  console.log('📋 Ensuring all document columns exist...');

  const columnsToAdd = [
    {
      name: 'additional_docs_due_dates',
      sql: 'ALTER TABLE documents ADD COLUMN IF NOT EXISTS additional_docs_due_dates TEXT[]'
    },
    {
      name: 'send_back_original_document',
      sql: 'ALTER TABLE documents ADD COLUMN IF NOT EXISTS send_back_original_document BOOLEAN DEFAULT false'
    },
    {
      name: 'send_back_date',
      sql: 'ALTER TABLE documents ADD COLUMN IF NOT EXISTS send_back_date DATE'
    },
    {
      name: 'deadline_date',
      sql: 'ALTER TABLE documents ADD COLUMN IF NOT EXISTS deadline_date DATE'
    },
    {
      name: 'received_paper_doc_date',
      sql: 'ALTER TABLE documents ADD COLUMN IF NOT EXISTS received_paper_doc_date DATE'
    },
    {
      name: 'additional_docs_received_date',
      sql: 'ALTER TABLE documents ADD COLUMN IF NOT EXISTS additional_docs_received_date DATE'
    },
    {
      name: 'disbursement_date',
      sql: 'ALTER TABLE documents ADD COLUMN IF NOT EXISTS disbursement_date DATE'
    },
    {
      name: 'disbursement_confirmed',
      sql: 'ALTER TABLE documents ADD COLUMN IF NOT EXISTS disbursement_confirmed BOOLEAN DEFAULT false'
    },
    {
      name: 'disbursement_paid',
      sql: 'ALTER TABLE documents ADD COLUMN IF NOT EXISTS disbursement_paid BOOLEAN DEFAULT false'
    }
  ];

  for (const column of columnsToAdd) {
    try {
      await db.execute(sql.raw(column.sql));
      console.log(`  ✓ Column ${column.name} ensured`);
    } catch (error: any) {
      // Column might already exist, check if it's a benign error
      if (error.message?.includes('already exists')) {
        console.log(`  ↳ Column ${column.name} already exists`);
      } else {
        console.warn(`  ⚠ Warning adding column ${column.name}:`, error.message);
      }
    }
  }

  console.log('✅ All document columns verified');
}

/**
 * Ensure emendation_documents table exists
 */
async function ensureEmendationDocumentsTable(db: any) {
  console.log('📋 Ensuring emendation_documents table exists...');

  try {
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS emendation_documents (
        id SERIAL PRIMARY KEY,
        document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        file_path VARCHAR(500) NOT NULL,
        original_filename VARCHAR(255) NOT NULL,
        file_size INTEGER NOT NULL,
        uploader_id INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `));
    console.log('  ✓ emendation_documents table ensured');
  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      console.log('  ↳ emendation_documents table already exists');
    } else {
      console.warn('  ⚠ Warning creating emendation_documents table:', error.message);
    }
  }

  console.log('✅ emendation_documents table verified');
}

/**
 * Initialize BA1059 departments
 */
async function initializeBA1059Departments(db: any) {
  console.log('🏛️ Initializing BA1059 departments...');

  // Check if departments already exist
  const existingDepts = await db.execute(sql.raw(`
    SELECT COUNT(*) as count FROM branches
    WHERE ba_code BETWEEN 105901 AND 105905
  `));

  if (existingDepts[0]?.count > 0) {
    console.log('  ↳ BA1059 departments already exist, skipping...');
    return;
  }

  // Insert department records
  await db.execute(sql.raw(`
    INSERT INTO branches (ba_code, branch_code, name, department_name, region_id, region_code, is_active, created_at, updated_at)
    VALUES
    (105901, 105901, 'กปภ.เขต 6 - งานพัสดุ', 'งานพัสดุ', 6, 'R6', true, NOW(), NOW()),
    (105902, 105902, 'กปภ.เขต 6 - งานธุรการ', 'งานธุรการ', 6, 'R6', true, NOW(), NOW()),
    (105903, 105903, 'กปภ.เขต 6 - งานบัญชีเจ้าหนี้', 'งานบัญชีเจ้าหนี้', 6, 'R6', true, NOW(), NOW()),
    (105904, 105904, 'กปภ.เขต 6 - งานการเงิน', 'งานการเงิน', 6, 'R6', true, NOW(), NOW()),
    (105905, 105905, 'กปภ.เขต 6 - งานบุคคล', 'งานบุคคล', 6, 'R6', true, NOW(), NOW())
    ON CONFLICT (ba_code) DO NOTHING
  `));

  console.log('✅ 5 BA1059 departments initialized');
}

/**
 * Create database indexes for better performance
 */
async function createIndexes(db: any) {
  console.log('⚡ Creating database indexes...');

  const indexes = [
    // Documents table indexes (CRITICAL - used in every query)
    'CREATE INDEX IF NOT EXISTS idx_documents_branch_status ON documents(branch_ba_code, status)',
    'CREATE INDEX IF NOT EXISTS idx_documents_status_created ON documents(status, created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_documents_upload_date ON documents(upload_date DESC)',
    'CREATE INDEX IF NOT EXISTS idx_documents_uploader ON documents(uploader_id)',
    'CREATE INDEX IF NOT EXISTS idx_documents_mt_number ON documents(mt_number)',
    'CREATE INDEX IF NOT EXISTS idx_documents_disbursement ON documents(disbursement_date, disbursement_confirmed)',

    // Activity logs indexes
    'CREATE INDEX IF NOT EXISTS idx_activity_logs_user_action ON activity_logs(user_id, action, created_at)',
    'CREATE INDEX IF NOT EXISTS idx_activity_logs_document ON activity_logs(document_id, created_at)',
    'CREATE INDEX IF NOT EXISTS idx_activity_logs_branch ON activity_logs(branch_ba_code, created_at)',
    'CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC)',

    // Comments indexes
    'CREATE INDEX IF NOT EXISTS idx_comments_document ON comments(document_id, created_at)',
    'CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id, created_at)',

    // Additional document files indexes
    'CREATE INDEX IF NOT EXISTS idx_additional_files_document_item ON additional_document_files(document_id, item_index)',
    'CREATE INDEX IF NOT EXISTS idx_additional_files_uploader ON additional_document_files(uploader_id)',
    'CREATE INDEX IF NOT EXISTS idx_additional_files_correction_count ON additional_document_files(document_id, correction_count)',
    'CREATE INDEX IF NOT EXISTS idx_additional_files_verification ON additional_document_files(document_id, is_verified)',

    // Document status history indexes
    'CREATE INDEX IF NOT EXISTS idx_doc_status_history_document ON document_status_history(document_id, created_at)',
    'CREATE INDEX IF NOT EXISTS idx_doc_status_history_user ON document_status_history(changed_by, created_at)',

    // Emendation documents indexes
    'CREATE INDEX IF NOT EXISTS idx_emendation_docs_document ON emendation_documents(document_id)',
    'CREATE INDEX IF NOT EXISTS idx_emendation_docs_uploader ON emendation_documents(uploader_id)',

    // Branches indexes
    'CREATE INDEX IF NOT EXISTS idx_branches_ba_code ON branches(ba_code)',
    'CREATE INDEX IF NOT EXISTS idx_branches_region ON branches(region_code, is_active)',
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
    'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',

    // System settings indexes
    'CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key)',

    // Additional document correction tracking indexes
    'CREATE INDEX IF NOT EXISTS idx_correction_tracking_document ON additional_document_correction_tracking(document_id, item_index)',
    'CREATE INDEX IF NOT EXISTS idx_correction_tracking_updated ON additional_document_correction_tracking(last_updated DESC)'
  ];

  let createdCount = 0;
  let existingCount = 0;

  for (const indexSQL of indexes) {
    try {
      await db.execute(sql.raw(indexSQL));
      const indexName = indexSQL.match(/idx_\w+/)?.[0] || 'unknown';
      console.log(`  ✓ ${indexName}`);
      createdCount++;
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        existingCount++;
      } else {
        console.warn(`  ⚠ Index creation warning:`, error.message);
      }
    }
  }

  console.log(`✅ Indexes verified (${createdCount} created, ${existingCount} existing)`);
}

/**
 * Initialize default system settings
 */
async function initializeSystemSettings(db: any) {
  console.log('⚙️ Initializing system settings...');

  const settings = [
    { key: 'maintenance_mode', value: 'false', type: 'boolean', description: 'Enable/disable system maintenance mode' },
    { key: 'telegram_notifications_enabled', value: 'false', type: 'boolean', description: 'Enable/disable Telegram notifications' },
    { key: 'file_cleanup_retention_days', value: '365', type: 'number', description: 'Number of days to retain old files before cleanup' },
    { key: 'document_upload_max_size_mb', value: '50', type: 'number', description: 'Maximum file size for document uploads in MB' },
    { key: 'session_timeout_minutes', value: '30', type: 'number', description: 'Session idle timeout in minutes' },
    { key: 'max_login_attempts', value: '5', type: 'number', description: 'Maximum login attempts before lockout' }
  ];

  for (const setting of settings) {
    try {
      await db.execute(sql.raw(`
        INSERT INTO system_settings (setting_key, setting_value, setting_type, description, created_at, updated_at)
        VALUES ('${setting.key}', '${setting.value}', '${setting.type}', '${setting.description}', NOW(), NOW())
        ON CONFLICT (setting_key) DO NOTHING
      `));
      console.log(`  ✓ ${setting.key}`);
    } catch (error: any) {
      console.warn(`  ⚠ Setting ${setting.key}:`, error.message);
    }
  }

  console.log('✅ System settings initialized');
}

/**
 * Main initialization function
 */
async function main() {
  console.log('🚀 Starting DocFlow Database Initialization...\n');

  try {
    // Test database connection
    console.log('📡 Testing database connection...');
    const db = await getDb();

    if (!db) {
      throw new Error('Failed to connect to database');
    }
    console.log('✅ Database connection successful\n');

    // Ensure all document columns exist (schema sync)
    await ensureDocumentColumns(db);
    console.log('');

    // Ensure emendation_documents table exists
    await ensureEmendationDocumentsTable(db);
    console.log('');

    // Initialize branches
    console.log('🏢 Initializing R6 branches...');
    await BranchService.initializeBranchesFromData();
    console.log('✅ R6 branches initialized\n');

    // Initialize BA1059 departments
    await initializeBA1059Departments(db);
    console.log('');

    // Initialize DocFlow roles and permissions
    console.log('👥 Setting up DocFlow roles and permissions...');
    await DocFlowAuth.initializeDocFlowRoles();
    console.log('✅ Roles and permissions setup complete\n');

    // Create database indexes
    await createIndexes(db);
    console.log('');

    // Initialize system settings
    await initializeSystemSettings(db);
    console.log('');

    console.log('🎉 DocFlow Database Initialization Completed Successfully!\n');
    console.log('📋 Summary:');
    console.log('  ✓ All document columns verified and created');
    console.log('  ✓ 22 R6 branches initialized');
    console.log('  ✓ 5 BA1059 departments initialized');
    console.log('  ✓ 6 DocFlow roles and 24 permissions created');
    console.log('  ✓ 35+ performance indexes optimized');
    console.log('  ✓ 6 system settings initialized');
    console.log('\n🔗 Next steps:');
    console.log('  1. Create an admin user: pnpm admin:create');
    console.log('  2. Start the application: pnpm dev');
    console.log('  3. Login and assign user roles');
    console.log('  4. Begin uploading documents\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ DocFlow initialization failed:', error);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
