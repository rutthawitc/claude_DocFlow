-- Migration Script: Add BA1059 Departments
-- Description: Add department-level branches within BA1059 district
-- Created: 2025-09-25
-- Author: Claude Code Assistant

-- =============================================================================
-- MIGRATION: Add BA1059 Department Branches
-- =============================================================================

\echo 'Starting BA1059 Departments Migration...'

-- Start transaction
BEGIN;

-- Check if migration has already been applied
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM branches
        WHERE ba_code = 105901 AND department_name = 'งานพัสดุ'
    ) THEN
        RAISE NOTICE 'Migration already applied - departments exist';
        ROLLBACK;
        RETURN;
    END IF;
END $$;

-- =============================================================================
-- Step 1: Add department_name column (if not exists)
-- =============================================================================

\echo 'Step 1: Adding department_name column to branches table...'

-- Add department_name column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'branches' AND column_name = 'department_name'
    ) THEN
        ALTER TABLE branches ADD COLUMN department_name VARCHAR(255);
        RAISE NOTICE 'Added department_name column to branches table';
    ELSE
        RAISE NOTICE 'department_name column already exists';
    END IF;
END $$;

-- Add unique constraint for ba_code + department_name (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'branches'
        AND constraint_name = 'branches_ba_dept_unique'
    ) THEN
        ALTER TABLE branches ADD CONSTRAINT branches_ba_dept_unique
        UNIQUE (ba_code, department_name);
        RAISE NOTICE 'Added unique constraint branches_ba_dept_unique';
    ELSE
        RAISE NOTICE 'Unique constraint branches_ba_dept_unique already exists';
    END IF;
END $$;

-- =============================================================================
-- Step 2: Insert Department Records
-- =============================================================================

\echo 'Step 2: Inserting BA1059 department records...'

-- Insert department branches with validation
INSERT INTO branches (ba_code, branch_code, name, department_name, region_id, region_code, is_active, created_at, updated_at)
VALUES
(105901, 105901, 'กปภ.เขต 6 - งานพัสดุ', 'งานพัสดุ', 6, 'R6', true, NOW(), NOW()),
(105902, 105902, 'กปภ.เขต 6 - งานธุรการ', 'งานธุรการ', 6, 'R6', true, NOW(), NOW()),
(105903, 105903, 'กปภ.เขต 6 - งานบัญชีเจ้าหนี้', 'งานบัญชีเจ้าหนี้', 6, 'R6', true, NOW(), NOW()),
(105904, 105904, 'กปภ.เขต 6 - งานการเงิน', 'งานการเงิน', 6, 'R6', true, NOW(), NOW()),
(105905, 105905, 'กปภ.เขต 6 - งานบุคคล', 'งานบุคคล', 6, 'R6', true, NOW(), NOW())
ON CONFLICT (ba_code) DO NOTHING;

-- Get row count to verify insertion
\set dept_count (SELECT COUNT(*) FROM branches WHERE ba_code BETWEEN 105901 AND 105905)

-- =============================================================================
-- Step 3: Validation
-- =============================================================================

\echo 'Step 3: Validating migration...'

-- Verify all departments were created
DO $$
DECLARE
    dept_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO dept_count
    FROM branches
    WHERE ba_code BETWEEN 105901 AND 105905
    AND department_name IS NOT NULL;

    IF dept_count = 5 THEN
        RAISE NOTICE 'SUCCESS: All 5 department branches created';
    ELSE
        RAISE EXCEPTION 'FAILED: Expected 5 departments, found %', dept_count;
    END IF;
END $$;

-- Verify unique constraints work
DO $$
BEGIN
    -- Try to insert duplicate - should fail gracefully
    BEGIN
        INSERT INTO branches (ba_code, branch_code, name, department_name, region_id, region_code, is_active)
        VALUES (105901, 105906, 'Test Duplicate', 'งานพัสดุ', 6, 'R6', true);

        RAISE EXCEPTION 'FAILED: Unique constraint not working - duplicate inserted';
    EXCEPTION
        WHEN unique_violation THEN
            RAISE NOTICE 'SUCCESS: Unique constraint working properly';
        WHEN OTHERS THEN
            RAISE EXCEPTION 'FAILED: Unexpected error testing unique constraint: %', SQLERRM;
    END;
END $$;

-- =============================================================================
-- Step 4: Create indexes for performance
-- =============================================================================

\echo 'Step 4: Creating performance indexes...'

-- Create index on department_name if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'branches' AND indexname = 'idx_branches_department_name'
    ) THEN
        CREATE INDEX idx_branches_department_name ON branches(department_name);
        RAISE NOTICE 'Created index idx_branches_department_name';
    ELSE
        RAISE NOTICE 'Index idx_branches_department_name already exists';
    END IF;
END $$;

-- Create composite index for ba_code + department_name queries
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'branches' AND indexname = 'idx_branches_ba_dept_composite'
    ) THEN
        CREATE INDEX idx_branches_ba_dept_composite ON branches(ba_code, department_name);
        RAISE NOTICE 'Created index idx_branches_ba_dept_composite';
    ELSE
        RAISE NOTICE 'Index idx_branches_ba_dept_composite already exists';
    END IF;
END $$;

-- =============================================================================
-- Final Verification & Summary
-- =============================================================================

\echo 'Final verification and summary...'

-- Display created departments
\echo 'Created department branches:'
SELECT
    ba_code,
    name,
    department_name,
    is_active,
    created_at
FROM branches
WHERE ba_code BETWEEN 105901 AND 105905
ORDER BY ba_code;

-- Display summary statistics
SELECT
    'Total branches' as metric,
    COUNT(*) as value
FROM branches
UNION ALL
SELECT
    'Department branches' as metric,
    COUNT(*) as value
FROM branches
WHERE department_name IS NOT NULL
UNION ALL
SELECT
    'BA1059 departments' as metric,
    COUNT(*) as value
FROM branches
WHERE ba_code BETWEEN 105901 AND 105905;

-- Commit transaction
COMMIT;

\echo 'BA1059 Departments Migration completed successfully!'
\echo ''
\echo 'Department URLs now available:'
\echo '  - /documents/branch/105901 (งานพัสดุ)'
\echo '  - /documents/branch/105902 (งานธุรการ)'
\echo '  - /documents/branch/105903 (งานบัญชีเจ้าหนี้)'
\echo '  - /documents/branch/105904 (งานการเงิน)'
\echo '  - /documents/branch/105905 (งานบุคคล)'
\echo ''

-- =============================================================================
-- ROLLBACK SCRIPT (for reference)
-- =============================================================================
/*
-- To rollback this migration:

BEGIN;

-- Remove department branches
DELETE FROM branches WHERE ba_code BETWEEN 105901 AND 105905;

-- Remove indexes
DROP INDEX IF EXISTS idx_branches_department_name;
DROP INDEX IF EXISTS idx_branches_ba_dept_composite;

-- Remove unique constraint
ALTER TABLE branches DROP CONSTRAINT IF EXISTS branches_ba_dept_unique;

-- Remove column (optional - may want to keep for future use)
-- ALTER TABLE branches DROP COLUMN IF EXISTS department_name;

COMMIT;

-- Verify rollback
SELECT COUNT(*) as remaining_departments
FROM branches
WHERE ba_code BETWEEN 105901 AND 105905;
*/