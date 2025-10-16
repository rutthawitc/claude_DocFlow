-- Migration: Add essential performance indexes
-- For 30-50 users/day workload
-- Created: 2025-01-16

-- ============================================
-- DOCUMENTS TABLE (Most Critical)
-- ============================================

-- Index for branch + status queries (used in every document list page)
CREATE INDEX idx_documents_branch_status
  ON documents(branch_ba_code, status);

-- Index for status filtering and sorting
CREATE INDEX idx_documents_status_created
  ON documents(status, created_at DESC);

-- Index for uploader relationship
CREATE INDEX idx_documents_uploader
  ON documents(uploader_id);

-- Index for MT number searches
CREATE INDEX idx_documents_mt_number
  ON documents(mt_number);

-- ============================================
-- COMMENTS TABLE
-- ============================================

-- Index for fetching comments by document (ordered by time)
CREATE INDEX idx_comments_document_created
  ON comments(document_id, created_at DESC);

-- Index for user's comments
CREATE INDEX idx_comments_user
  ON comments(user_id);

-- ============================================
-- ADDITIONAL DOCUMENT FILES
-- ============================================

-- Composite index for document + item lookup
CREATE INDEX idx_additional_files_document_item
  ON additional_document_files(document_id, item_index);

-- Index for uploader relationship
CREATE INDEX idx_additional_files_uploader
  ON additional_document_files(uploader_id);

-- ============================================
-- ACTIVITY LOGS
-- ============================================

-- Index for document activity history
CREATE INDEX idx_activity_logs_document
  ON activity_logs(document_id, created_at DESC);

-- Index for user activity tracking
CREATE INDEX idx_activity_logs_user
  ON activity_logs(user_id);

-- Index for branch activity
CREATE INDEX idx_activity_logs_branch
  ON activity_logs(branch_ba_code);

-- ============================================
-- DOCUMENT STATUS HISTORY
-- ============================================

-- Index for document status timeline
CREATE INDEX idx_status_history_document_created
  ON document_status_history(document_id, created_at DESC);

-- Index for tracking who changed statuses
CREATE INDEX idx_status_history_changed_by
  ON document_status_history(changed_by);

-- ============================================
-- EMENDATION DOCUMENTS
-- ============================================

-- Index for document relationship
CREATE INDEX idx_emendation_docs_document
  ON emendation_documents(document_id);

-- Index for uploader
CREATE INDEX idx_emendation_docs_uploader
  ON emendation_documents(uploader_id);

-- ============================================
-- USER ROLES (if not auto-created)
-- ============================================

-- These may already exist due to composite PK, but create if missing
CREATE INDEX IF NOT EXISTS idx_user_roles_user
  ON user_roles(user_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_role
  ON user_roles(role_id);

-- ============================================
-- END OF MIGRATION
-- ============================================

-- Verify indexes were created
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
