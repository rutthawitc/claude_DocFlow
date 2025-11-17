#!/bin/bash

# ==============================================================================
# DocFlow System Reset Script
# ==============================================================================
#
# This script completely resets the DocFlow system to a clean state by:
# 1. Dropping and recreating the entire database
# 2. Deleting all uploaded files
# 3. Running database initialization (pnpm init:db)
# 4. Optionally creating a fresh admin user (pnpm admin:create)
#
# WARNING: THIS IS A DESTRUCTIVE OPERATION - ALL DATA WILL BE LOST!
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

# Function to drop and recreate database
drop_and_recreate_database() {
    print_status $BLUE "🗄️  Dropping and recreating database..."

    # Terminate all connections to the database
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "postgres" -c \
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" 2>/dev/null || true

    # Drop the database
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "postgres" -c \
        "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null

    if [ $? -eq 0 ]; then
        print_status $GREEN "✅ Database dropped successfully"
    else
        print_status $RED "❌ Failed to drop database"
        exit 1
    fi

    # Create new database
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "postgres" -c \
        "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null

    if [ $? -eq 0 ]; then
        print_status $GREEN "✅ Database created successfully"
    else
        print_status $RED "❌ Failed to create database"
        exit 1
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

# Function to initialize database
initialize_database() {
    print_status $BLUE "🔄 Initializing DocFlow database..."

    cd "$PROJECT_ROOT"

    # Set DATABASE_URL environment variable
    export DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"

    print_status $BLUE "   Running pnpm init:db..."

    if pnpm init:db >> "$LOG_FILE" 2>&1; then
        print_status $GREEN "   ✅ Database initialization completed"
    else
        print_status $RED "   ❌ Database initialization failed!"
        print_status $YELLOW "   Check log file: $LOG_FILE"
        exit 1
    fi
}

# Function to create admin user
create_admin_user() {
    print_status $BLUE "👤 Creating new admin user..."

    cd "$PROJECT_ROOT"

    # Set DATABASE_URL environment variable
    export DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"

    echo ""
    read -p "Do you want to create a new admin user now? (y/n): " create_admin

    if [[ "$create_admin" =~ ^[Yy]$ ]]; then
        print_status $BLUE "   Running pnpm admin:create..."
        echo ""

        if pnpm admin:create >> "$LOG_FILE" 2>&1; then
            print_status $GREEN "   ✅ Admin user created successfully"
        else
            print_status $RED "   ❌ Admin user creation failed!"
            print_status $YELLOW "   Check log file: $LOG_FILE"
            print_status $YELLOW "   You can create an admin user later with: pnpm admin:create"
        fi
    else
        print_status $YELLOW "   Skipped admin user creation"
        print_status $BLUE "   You can create an admin user later with: pnpm admin:create"
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
    print_status $RED "⚠️  WARNING: THIS IS A DESTRUCTIVE OPERATION!"
    echo ""
    print_status $RED "This will completely reset the DocFlow system:"
    echo ""
    echo "  - DROP the entire database and recreate it"
    echo "  - DELETE all documents and uploaded files"
    echo "  - DELETE all users (no data is preserved)"
    echo "  - DELETE all activities and logs"
    echo "  - DELETE all comments and roles/permissions"
    echo "  - REINITIALIZE all branches, roles, and permissions"
    echo ""
    print_status $YELLOW "ALL DATA WILL BE PERMANENTLY LOST!"
    echo ""

    read -p "Type 'yes' to continue with full reset: " confirm

    if [ "$confirm" != "yes" ]; then
        print_status $YELLOW "Reset cancelled by user"
        exit 0
    fi

    echo ""
    read -p "Final confirmation - Type 'RESET' to irreversibly reset the system: " final_confirm

    if [ "$final_confirm" != "RESET" ]; then
        print_status $YELLOW "Reset cancelled by user"
        exit 0
    fi

    print_status $GREEN "✅ Reset confirmed - proceeding with full system reset..."
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
    echo ""

    # Step 1: Check database connection
    check_database

    # Step 2: Clean uploaded files
    clean_uploaded_files

    # Step 3: Drop and recreate database
    drop_and_recreate_database

    # Step 4: Initialize database with schema and seed data
    initialize_database

    # Step 5: Create admin user (optional)
    create_admin_user

    # Step 6: Show final status
    show_system_status

    echo ""
    print_status $GREEN "🎉 System reset completed successfully!"
    print_status $BLUE "💡 The DocFlow system has been completely reset"
    print_status $BLUE "📝 Log file: $LOG_FILE"
    echo ""
    print_status $YELLOW "Next steps:"
    echo "  1. Start the development server: pnpm dev"
    echo "  2. Log in with your admin credentials"
    echo "  3. Begin using the freshly initialized system"
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