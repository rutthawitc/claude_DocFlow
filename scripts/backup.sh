#!/bin/bash

# DocFlow Backup Script
# Automated backup solution for PostgreSQL database and uploaded files

set -e

# Configuration
BACKUP_DIR="/opt/docflow/backups"
DB_CONTAINER="docflow_postgres"
APP_CONTAINER="docflow_app"
RETENTION_DAYS=7
S3_BUCKET="${S3_BACKUP_BUCKET:-}"
DATE=$(date +"%Y%m%d_%H%M%S")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Create backup directory if it doesn't exist
create_backup_dir() {
    mkdir -p "$BACKUP_DIR"
    chmod 755 "$BACKUP_DIR"
}

# Check if containers are running
check_containers() {
    if ! docker ps | grep -q "$DB_CONTAINER"; then
        error "Database container $DB_CONTAINER is not running"
        exit 1
    fi
    
    if ! docker ps | grep -q "$APP_CONTAINER"; then
        warning "Application container $APP_CONTAINER is not running"
    fi
}

# Backup PostgreSQL database
backup_database() {
    log "Starting database backup..."
    
    local backup_file="$BACKUP_DIR/database_backup_$DATE.sql"
    local backup_file_gz="$backup_file.gz"
    
    # Create database backup
    docker exec $DB_CONTAINER pg_dump -U postgres -d pwausers_db > "$backup_file"
    
    if [ $? -eq 0 ]; then
        # Compress backup
        gzip "$backup_file"
        
        # Verify compressed backup exists
        if [ -f "$backup_file_gz" ]; then
            log "Database backup completed: $(basename "$backup_file_gz")"
            echo "$backup_file_gz"
        else
            error "Failed to create compressed database backup"
            exit 1
        fi
    else
        error "Database backup failed"
        exit 1
    fi
}

# Backup uploaded files
backup_files() {
    log "Starting files backup..."
    
    local files_backup="$BACKUP_DIR/files_backup_$DATE.tar.gz"
    
    # Check if uploads directory exists in container
    if docker exec $APP_CONTAINER [ -d "/app/uploads" ]; then
        # Create tar backup of uploads directory
        docker exec $APP_CONTAINER tar -czf "/tmp/files_backup_$DATE.tar.gz" -C /app uploads
        
        # Copy backup from container to host
        docker cp "$APP_CONTAINER:/tmp/files_backup_$DATE.tar.gz" "$files_backup"
        
        # Remove temporary file from container
        docker exec $APP_CONTAINER rm "/tmp/files_backup_$DATE.tar.gz"
        
        if [ -f "$files_backup" ]; then
            log "Files backup completed: $(basename "$files_backup")"
            echo "$files_backup"
        else
            warning "Files backup failed - uploads directory may be empty"
            echo ""
        fi
    else
        warning "Uploads directory not found in container"
        echo ""
    fi
}

# Backup Docker volumes
backup_volumes() {
    log "Starting Docker volumes backup..."
    
    local volumes_backup="$BACKUP_DIR/volumes_backup_$DATE.tar.gz"
    
    # Backup Docker volumes
    docker run --rm \
        -v docflow_postgres_data:/postgres_data:ro \
        -v docflow_uploads:/uploads:ro \
        -v docflow_app_tmp:/app_tmp:ro \
        -v "$BACKUP_DIR:/backup" \
        alpine:latest \
        tar -czf "/backup/volumes_backup_$DATE.tar.gz" -C / postgres_data uploads app_tmp 2>/dev/null || true
    
    if [ -f "$volumes_backup" ]; then
        log "Volumes backup completed: $(basename "$volumes_backup")"
        echo "$volumes_backup"
    else
        warning "Volumes backup failed or volumes are empty"
        echo ""
    fi
}

# Upload to S3 if configured
upload_to_s3() {
    local file="$1"
    
    if [ -n "$S3_BUCKET" ] && [ -f "$file" ]; then
        log "Uploading $(basename "$file") to S3..."
        
        if command -v aws >/dev/null 2>&1; then
            aws s3 cp "$file" "s3://$S3_BUCKET/docflow-backups/" --no-progress
            
            if [ $? -eq 0 ]; then
                log "Successfully uploaded to S3: s3://$S3_BUCKET/docflow-backups/$(basename "$file")"
            else
                error "Failed to upload to S3"
            fi
        else
            warning "AWS CLI not installed, skipping S3 upload"
        fi
    fi
}

# Clean old backups
cleanup_old_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days..."
    
    # Local cleanup
    find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    
    # S3 cleanup if configured
    if [ -n "$S3_BUCKET" ] && command -v aws >/dev/null 2>&1; then
        log "Cleaning up old S3 backups..."
        
        # List and delete files older than retention period
        aws s3 ls "s3://$S3_BUCKET/docflow-backups/" --recursive | \
        while read -r line; do
            # Extract date and filename
            file_date=$(echo "$line" | awk '{print $1}')
            file_name=$(echo "$line" | awk '{print $4}')
            
            # Calculate age in days
            if [ "$(uname)" = "Darwin" ]; then
                # macOS date command
                file_timestamp=$(date -j -f "%Y-%m-%d" "$file_date" +%s 2>/dev/null || echo "0")
            else
                # Linux date command
                file_timestamp=$(date -d "$file_date" +%s 2>/dev/null || echo "0")
            fi
            
            current_timestamp=$(date +%s)
            age_days=$(( (current_timestamp - file_timestamp) / 86400 ))
            
            if [ "$age_days" -gt "$RETENTION_DAYS" ]; then
                log "Deleting old S3 backup: $file_name (${age_days} days old)"
                aws s3 rm "s3://$S3_BUCKET/$file_name"
            fi
        done
    fi
    
    log "Cleanup completed"
}

# Generate backup report
generate_report() {
    local db_backup="$1"
    local files_backup="$2"
    local volumes_backup="$3"
    
    log "Generating backup report..."
    
    local report_file="$BACKUP_DIR/backup_report_$DATE.txt"
    
    cat > "$report_file" <<EOF
DocFlow Backup Report
Date: $(date)
Hostname: $(hostname)

=== Backup Files ===
EOF

    if [ -n "$db_backup" ] && [ -f "$db_backup" ]; then
        echo "Database: $(basename "$db_backup") ($(du -h "$db_backup" | cut -f1))" >> "$report_file"
    else
        echo "Database: FAILED" >> "$report_file"
    fi
    
    if [ -n "$files_backup" ] && [ -f "$files_backup" ]; then
        echo "Files: $(basename "$files_backup") ($(du -h "$files_backup" | cut -f1))" >> "$report_file"
    else
        echo "Files: SKIPPED (no uploads)" >> "$report_file"
    fi
    
    if [ -n "$volumes_backup" ] && [ -f "$volumes_backup" ]; then
        echo "Volumes: $(basename "$volumes_backup") ($(du -h "$volumes_backup" | cut -f1))" >> "$report_file"
    else
        echo "Volumes: FAILED" >> "$report_file"
    fi

    cat >> "$report_file" <<EOF

=== Storage Usage ===
Backup Directory: $(du -sh "$BACKUP_DIR" | cut -f1)
Available Space: $(df -h "$BACKUP_DIR" | tail -n1 | awk '{print $4}')

=== Container Status ===
EOF
    
    docker ps --format "table {{.Names}}\t{{.Status}}" | grep docflow >> "$report_file" 2>/dev/null || echo "No DocFlow containers running" >> "$report_file"
    
    log "Backup report generated: $(basename "$report_file")"
}

# Send notification
send_notification() {
    local status="$1"
    local report_file="$2"
    
    if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
        local emoji="✅"
        if [ "$status" != "success" ]; then
            emoji="❌"
        fi
        
        local message="$emoji *DocFlow Backup Report*
        
Date: $(date '+%Y-%m-%d %H:%M:%S')
Status: $status
Hostname: $(hostname)

$(cat "$report_file" | grep -E "(Database:|Files:|Volumes:)" | head -3)"
        
        curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
            -d "chat_id=${TELEGRAM_CHAT_ID}" \
            -d "text=${message}" \
            -d "parse_mode=Markdown" > /dev/null
    fi
}

# Main backup function
main() {
    log "Starting DocFlow backup process..."
    
    create_backup_dir
    check_containers
    
    # Perform backups
    db_backup=$(backup_database)
    files_backup=$(backup_files)
    volumes_backup=$(backup_volumes)
    
    # Upload to S3 if configured
    if [ -n "$db_backup" ]; then
        upload_to_s3 "$db_backup"
    fi
    
    if [ -n "$files_backup" ]; then
        upload_to_s3 "$files_backup"
    fi
    
    if [ -n "$volumes_backup" ]; then
        upload_to_s3 "$volumes_backup"
    fi
    
    # Cleanup old backups
    cleanup_old_backups
    
    # Generate report
    generate_report "$db_backup" "$files_backup" "$volumes_backup"
    
    # Send notification
    send_notification "success" "$BACKUP_DIR/backup_report_$DATE.txt"
    
    log "Backup process completed successfully!"
    
    # Print summary
    info "Backup Summary:"
    if [ -n "$db_backup" ]; then
        info "- Database: $(basename "$db_backup")"
    fi
    if [ -n "$files_backup" ]; then
        info "- Files: $(basename "$files_backup")"
    fi
    if [ -n "$volumes_backup" ]; then
        info "- Volumes: $(basename "$volumes_backup")"
    fi
    info "- Location: $BACKUP_DIR"
}

# Handle errors
trap 'error "Backup process failed at line $LINENO"; send_notification "failed" "/dev/null"; exit 1' ERR

# Run main function if script is executed directly
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    main "$@"
fi