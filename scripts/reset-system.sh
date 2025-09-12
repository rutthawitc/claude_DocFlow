#!/bin/bash

# ==============================================================================
# DocFlow System Reset Script
# ==============================================================================
# 
# This script resets the DocFlow system to a clean state by:
# 1. Preserving local admin users (is_local_admin = true)
# 2. Clearing all other data (documents, users, activities, etc.)
# 3. Deleting all uploaded files
# 4. Reinitializing system with default branches, roles, and permissions
# 
# WARNING: This will permanently delete all data except local admins!
# ==============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_ROOT/tmp/reset-system-$(date +%Y%m%d_%H%M%S).log"

# Database configuration (from environment or defaults)
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-docflow_db}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${PGPASSWORD:-postgres}"

# File paths to clean
UPLOAD_DIRS=(
    "$PROJECT_ROOT/uploads"
    "$PROJECT_ROOT/tmp"
)

# Function to log messages
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}$message${NC}"
    log "INFO" "$message"
}

# Function to print header
print_header() {
    echo -e "${PURPLE}================================================${NC}"
    echo -e "${PURPLE}           DocFlow System Reset${NC}"
    echo -e "${PURPLE}================================================${NC}"
    log "INFO" "DocFlow System Reset Started"
}

# Function to check if database is accessible
check_database() {
    print_status $BLUE "🔍 Checking database connection..."
    
    if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
        print_status $RED "❌ Cannot connect to database!"
        echo "Please ensure:"
        echo "  - Database is running"
        echo "  - Connection parameters are correct"
        echo "  - Environment variables are set (PGPASSWORD, DB_HOST, etc.)"
        exit 1
    fi
    
    print_status $GREEN "✅ Database connection successful"
}

# Function to backup local admins
backup_local_admins() {
    print_status $BLUE "💾 Backing up local admin users..."
    
    local backup_file="$PROJECT_ROOT/tmp/local_admins_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --data-only --table=users \
        --where="is_local_admin = true" \
        -f "$backup_file"
    
    if [ $? -eq 0 ]; then
        print_status $GREEN "✅ Local admins backed up to: $backup_file"
        echo "$backup_file"
    else
        print_status $RED "❌ Failed to backup local admins!"
        exit 1
    fi
}

# Function to get local admin data
get_local_admin_data() {
    print_status $BLUE "📋 Retrieving local admin data..."
    
    local temp_file=$(mktemp)
    
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT id, username, first_name, last_name, email, password, cost_center, ba, part, area, job_name, level, div_name, dep_name, org_name, position, created_at, updated_at 
         FROM users 
         WHERE is_local_admin = true;" > "$temp_file"
    
    if [ -s "$temp_file" ]; then
        print_status $GREEN "✅ Found $(wc -l < "$temp_file") local admin(s)"
        echo "$temp_file"
    else
        print_status $YELLOW "⚠️  No local admins found - will create clean system"
        rm -f "$temp_file"
        echo ""
    fi
}

# Function to clean uploaded files
clean_uploaded_files() {
    print_status $BLUE "🗑️  Cleaning uploaded files..."
    
    local total_deleted=0
    local total_size=0
    
    for dir in "${UPLOAD_DIRS[@]}"; do
        if [ -d "$dir" ]; then
            print_status $YELLOW "   Cleaning directory: $dir"
            
            # Calculate size before deletion
            if [ -d "$dir" ] && [ "$(ls -A "$dir" 2>/dev/null)" ]; then
                local dir_size=$(du -sb "$dir" 2>/dev/null | cut -f1 || echo 0)
                local file_count=$(find "$dir" -type f 2>/dev/null | wc -l || echo 0)
                
                total_size=$((total_size + dir_size))
                total_deleted=$((total_deleted + file_count))
                
                # Keep directory structure but remove contents
                find "$dir" -type f -delete 2>/dev/null || true
                find "$dir" -type d -empty -delete 2>/dev/null || true
                
                # Recreate main directory
                mkdir -p "$dir"
                print_status $GREEN "   ✅ Cleaned $file_count files ($(numfmt --to=iec $dir_size))"
            else
                print_status $YELLOW "   📁 Directory is empty or doesn't exist"
            fi
        else
            print_status $YELLOW "   📁 Directory doesn't exist: $dir"
        fi
    done
    
    # Clean telegram settings files
    if [ -f "$PROJECT_ROOT/tmp/telegram-settings.json" ]; then
        rm -f "$PROJECT_ROOT/tmp/telegram-settings.json"
        print_status $GREEN "   ✅ Removed telegram-settings.json"
    fi
    
    if [ -f "$PROJECT_ROOT/tmp/admin-telegram-settings.json" ]; then
        rm -f "$PROJECT_ROOT/tmp/admin-telegram-settings.json" 
        print_status $GREEN "   ✅ Removed admin-telegram-settings.json"
    fi
    
    print_status $GREEN "✅ File cleanup complete: $total_deleted files ($(numfmt --to=iec $total_size)) deleted"
}

# Function to reset database
reset_database() {
    print_status $BLUE "🗄️  Resetting database..."
    
    local admin_data_file="$1"
    
    # SQL commands to reset database while preserving structure
    local reset_sql=$(cat << 'EOF'
-- Disable triggers temporarily to avoid constraint issues
SET session_replication_role = replica;

-- Clear all data in correct order (respecting foreign keys)
DELETE FROM activity_logs;
DELETE FROM document_status_history;
DELETE FROM additional_document_files;
DELETE FROM comments;
DELETE FROM documents;
DELETE FROM role_permissions;
DELETE FROM user_roles;
DELETE FROM system_settings;

-- Clear non-admin users (preserve local admins)
DELETE FROM users WHERE is_local_admin = false OR is_local_admin IS NULL;

-- Clear all roles and permissions (will be recreated)
DELETE FROM permissions;
DELETE FROM roles;

-- Clear all branches (will be recreated) 
DELETE FROM branches;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- Reset sequences to start fresh
SELECT setval(pg_get_serial_sequence('documents', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('comments', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('additional_document_files', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('activity_logs', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('document_status_history', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('branches', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('roles', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('permissions', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('user_roles', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('role_permissions', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('system_settings', 'id'), 1, false);
EOF
)
    
    # Execute reset SQL
    echo "$reset_sql" | PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"
    
    if [ $? -eq 0 ]; then
        print_status $GREEN "✅ Database reset completed"
        
        # Show remaining admin users
        local admin_count=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM users WHERE is_local_admin = true;")
        print_status $GREEN "✅ Preserved $admin_count local admin user(s)"
    else
        print_status $RED "❌ Database reset failed!"
        exit 1
    fi
}

# Function to reinitialize system
reinitialize_system() {
    print_status $BLUE "🔄 Reinitializing DocFlow system..."
    
    # Run DocFlow initialization script
    if [ -f "$SCRIPT_DIR/init-docflow.ts" ]; then
        print_status $BLUE "   Running DocFlow initialization..."
        cd "$PROJECT_ROOT"
        
        if npx tsx scripts/init-docflow.ts >> "$LOG_FILE" 2>&1; then
            print_status $GREEN "   ✅ DocFlow initialization completed"
        else
            print_status $RED "   ❌ DocFlow initialization failed!"
            print_status $YELLOW "   Check log file: $LOG_FILE"
            exit 1
        fi
    else
        print_status $YELLOW "   ⚠️  DocFlow init script not found - skipping"
    fi
}

# Function to show system status
show_system_status() {
    print_status $BLUE "📊 System Status After Reset:"
    
    # Count records in each table
    local tables=("users" "roles" "permissions" "branches" "documents" "comments" "activity_logs")
    
    printf "${BLUE}%-25s %s${NC}\n" "Table" "Records"
    printf "${BLUE}%-25s %s${NC}\n" "-----" "-------"
    
    for table in "${tables[@]}"; do
        local count=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | xargs)
        printf "%-25s %s\n" "$table" "$count"
    done
    
    echo ""
    print_status $GREEN "✅ System reset completed successfully!"
    print_status $BLUE "📝 Log file: $LOG_FILE"
}

# Function to confirm reset action
confirm_reset() {
    echo ""
    print_status $RED "⚠️  WARNING: This will permanently delete ALL data except local admins!"
    echo ""
    echo "This action will:"
    echo "  🗑️  Delete all documents and uploaded files"  
    echo "  👥 Delete all non-admin users"
    echo "  📊 Delete all activities and logs"
    echo "  💬 Delete all comments"
    echo "  🏢 Reset branches (will be recreated)"
    echo "  🔐 Reset roles and permissions (will be recreated)"
    echo "  ⚙️  Delete all system settings"
    echo "  💾 Preserve only local admin users"
    echo ""
    
    read -p "Are you absolutely sure you want to continue? (type 'yes' to confirm): " confirm
    
    if [ "$confirm" != "yes" ]; then
        print_status $YELLOW "❌ Reset cancelled by user"
        exit 0
    fi
    
    echo ""
    read -p "Last chance! Type 'RESET' to proceed: " final_confirm
    
    if [ "$final_confirm" != "RESET" ]; then
        print_status $YELLOW "❌ Reset cancelled by user"
        exit 0
    fi
    
    print_status $GREEN "✅ Reset confirmed - proceeding..."
}

# Main function
main() {
    print_header
    
    # Create tmp directory and log file
    mkdir -p "$PROJECT_ROOT/tmp"
    touch "$LOG_FILE"
    
    # Check for --force flag to skip confirmation
    if [[ "$1" != "--force" ]]; then
        confirm_reset
    else
        print_status $YELLOW "🚀 Running in force mode - skipping confirmation"
    fi
    
    echo ""
    print_status $BLUE "🏁 Starting system reset process..."
    
    # Step 1: Check database connection
    check_database
    
    # Step 2: Get local admin data for reference
    local admin_data_file=$(get_local_admin_data)
    
    # Step 3: Clean uploaded files
    clean_uploaded_files
    
    # Step 4: Reset database
    reset_database "$admin_data_file"
    
    # Step 5: Reinitialize system
    reinitialize_system
    
    # Step 6: Show final status
    show_system_status
    
    # Cleanup temp files
    [ -n "$admin_data_file" ] && [ -f "$admin_data_file" ] && rm -f "$admin_data_file"
    
    echo ""
    print_status $GREEN "🎉 System reset completed successfully!"
    print_status $BLUE "💡 You can now use the system as if it were newly installed"
    print_status $BLUE "🔑 Your local admin accounts are preserved and ready to use"
}

# Script usage
show_usage() {
    echo "Usage: $0 [--force]"
    echo ""
    echo "Options:"
    echo "  --force    Skip confirmation prompts (use with caution!)"
    echo ""
    echo "Environment Variables:"
    echo "  DB_HOST     Database host (default: localhost)"
    echo "  DB_PORT     Database port (default: 5432)" 
    echo "  DB_NAME     Database name (default: docflow_db)"
    echo "  DB_USER     Database user (default: postgres)"
    echo "  PGPASSWORD  Database password (default: postgres)"
    echo ""
}

# Handle script arguments
case "${1:-}" in
    -h|--help)
        show_usage
        exit 0
        ;;
    --force)
        main --force
        ;;
    "")
        main
        ;;
    *)
        echo "Unknown option: $1"
        show_usage
        exit 1
        ;;
esac