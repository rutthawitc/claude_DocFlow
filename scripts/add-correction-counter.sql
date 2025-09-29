-- Migration Script: Add Correction Counter to Additional Document Files
-- This script adds a correction_count field to track how many times
-- each additional file has been marked as incorrect

-- Step 1: Verify current state
SELECT 'BEFORE MIGRATION - Current additional_document_files structure:' as info;
\d additional_document_files;

-- Step 2: Add correction_count column
ALTER TABLE additional_document_files
ADD COLUMN correction_count INTEGER DEFAULT 0 NOT NULL;

-- Step 3: Initialize correction_count for existing records
-- Set correction_count to 1 for files currently marked as incorrect (isVerified = false)
-- This gives existing incorrect files a starting count of 1
UPDATE additional_document_files
SET correction_count = 1
WHERE is_verified = false;

-- Step 4: Verify migration results
SELECT 'AFTER MIGRATION - Updated structure:' as info;
\d additional_document_files;

-- Step 5: Show sample data with new correction_count field
SELECT 'SAMPLE DATA - Files with correction counts:' as info;
SELECT id, document_id, item_index, item_name, is_verified, correction_count, original_filename
FROM additional_document_files
ORDER BY document_id, item_index
LIMIT 10;