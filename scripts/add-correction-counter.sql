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

-- Step 5: Create correction tracking table for persistence across delete/re-upload cycles
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

-- Step 6: Initialize tracking table with existing correction counts
INSERT INTO additional_document_correction_tracking (document_id, item_index, item_name, correction_count)
SELECT document_id, item_index, item_name, correction_count
FROM additional_document_files
WHERE correction_count > 0
ON CONFLICT (document_id, item_index) DO UPDATE SET
    correction_count = EXCLUDED.correction_count,
    updated_at = NOW();

-- Step 7: Add performance indexes
CREATE INDEX IF NOT EXISTS idx_correction_tracking_document ON additional_document_correction_tracking(document_id, item_index);
CREATE INDEX IF NOT EXISTS idx_correction_tracking_updated ON additional_document_correction_tracking(last_updated DESC);
CREATE INDEX IF NOT EXISTS idx_additional_files_correction_count ON additional_document_files(document_id, correction_count);
CREATE INDEX IF NOT EXISTS idx_additional_files_verification ON additional_document_files(document_id, is_verified);

-- Step 8: Show tracking table structure
SELECT 'CORRECTION TRACKING TABLE - Structure:' as info;
\d additional_document_correction_tracking;

-- Step 9: Show sample data with new correction_count field
SELECT 'SAMPLE DATA - Files with correction counts:' as info;
SELECT id, document_id, item_index, item_name, is_verified, correction_count, original_filename
FROM additional_document_files
ORDER BY document_id, item_index
LIMIT 10;

-- Step 10: Show tracking table data
SELECT 'TRACKING TABLE DATA - Preserved correction counts:' as info;
SELECT id, document_id, item_index, item_name, correction_count, last_updated
FROM additional_document_correction_tracking
ORDER BY document_id, item_index;