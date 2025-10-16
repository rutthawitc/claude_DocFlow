#!/bin/bash

# Script to apply essential database indexes
# Usage: ./scripts/apply-indexes.sh

set -e

echo "================================================"
echo "Applying Essential Database Indexes"
echo "================================================"
echo ""

# Database connection details
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-docflow_db}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-postgres}

echo "Database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo "User: $DB_USER"
echo ""

# Check if migration file exists
MIGRATION_FILE="drizzle/0009_add_essential_indexes.sql"
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Error: Migration file not found: $MIGRATION_FILE"
    exit 1
fi

echo "📄 Migration file: $MIGRATION_FILE"
echo ""

# Confirm before proceeding
read -p "⚠️  This will create indexes on the database. Continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Aborted"
    exit 1
fi

echo ""
echo "🚀 Applying indexes..."
echo ""

# Apply migration
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $MIGRATION_FILE

echo ""
echo "✅ Indexes applied successfully!"
echo ""
echo "📊 Checking created indexes..."
echo ""

# Show created indexes
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_indexes
JOIN pg_class ON pg_class.relname = indexname
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
"

echo ""
echo "✅ Done!"
echo ""
