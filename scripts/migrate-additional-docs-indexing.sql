-- Migration Script: Optimize Additional Document Indexing
-- This script migrates additional documents from 1-based indexing to 0-based indexing
-- to eliminate the need for +1/-1 transformations after emendation document separation

-- Step 1: Verify current state
SELECT 'BEFORE MIGRATION - Current additional document files:' as info;
SELECT id, document_id, item_index, item_name, original_filename
FROM additional_document_files
WHERE item_index > 0  -- Only additional docs, not emendation (though emendation is now in separate table)
ORDER BY document_id, item_index;

-- Step 2: Update all additional document itemIndex values
-- Shift itemIndex from 1-based to 0-based (subtract 1 from all itemIndex > 0)
UPDATE additional_document_files
SET item_index = item_index - 1
WHERE item_index > 0;

-- Step 3: Verify migration results
SELECT 'AFTER MIGRATION - Updated additional document files:' as info;
SELECT id, document_id, item_index, item_name, original_filename
FROM additional_document_files
ORDER BY document_id, item_index;

-- Step 4: Verify no conflicts with itemIndex 0 (should be empty now that emendation docs are separate)
SELECT 'CHECK: Files with itemIndex 0 (should be empty):' as info;
SELECT COUNT(*) as count_at_index_0
FROM additional_document_files
WHERE item_index = 0;