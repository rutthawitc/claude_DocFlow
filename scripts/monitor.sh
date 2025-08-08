#!/bin/bash

# DocFlow Monitoring Script
# System health monitoring for Docker deployment

set -e

# Configuration
ALERT_CPU_THRESHOLD=80
ALERT_MEMORY_THRESHOLD=85
ALERT_DISK_THRESHOLD=85
CHECK_INTERVAL=300  # 5 minutes
LOG_FILE="/opt/docflow/logs/monitor.log"
METRICS_FILE="/opt/docflow/logs/metrics.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging functions
log() {
    local message="[$(date +'%Y-%m-%d %H:%M:%S')] $1"
    echo -e "${GREEN}${message}${NC}"
    echo "$message" >> "$LOG_FILE"
}

error() {
    local message="[ERROR] $1"
    echo -e "${RED}${message}${NC}" >&2
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $message" >> "$LOG_FILE"
}

warning() {
    local message="[WARNING] $1"
    echo -e "${YELLOW}${message}${NC}"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $message" >> "$LOG_FILE"
}

info() {
    local message="[INFO] $1"
    echo -e "${BLUE}${message}${NC}"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $message" >> "$LOG_FILE"
}

# Create log directory
create_log_dir() {
    mkdir -p "$(dirname "$LOG_FILE")"
    mkdir -p "$(dirname "$METRICS_FILE")"
}

# Get system metrics
get_cpu_usage() {
    # Get CPU usage percentage
    top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}'
}

get_memory_usage() {
    # Get memory usage percentage
    free | grep Mem | awk '{printf "%.1f", ($3/$2) * 100.0}'
}

get_disk_usage() {
    # Get disk usage percentage for root partition
    df / | grep / | awk '{print $(NF-1)}' | sed 's/%//'
}

get_load_average() {
    # Get 1, 5, 15 minute load averages
    uptime | awk -F'load average:' '{print $2}' | tr -d ' '
}

# Check Docker containers
check_docker_containers() {
    local containers=("docflow_app" "docflow_postgres" "docflow_nginx" "docflow_redis")
    local failed_containers=()
    
    for container in "${containers[@]}"; do
        if ! docker ps | grep -q "$container"; then
            failed_containers+=("$container")
        fi
    done
    
    if [ ${#failed_containers[@]} -gt 0 ]; then
        error "Failed containers: ${failed_containers[*]}"
        return 1
    fi
    
    return 0
}

# Check application health
check_app_health() {
    local health_url="http://localhost:3000/api/health"
    
    if curl -f -s "$health_url" >/dev/null 2>&1; then
        return 0
    else
        error "Application health check failed"
        return 1
    fi
}

# Check database connectivity
check_database() {
    if docker exec docflow_postgres pg_isready -U postgres -d docflow_db >/dev/null 2>&1; then
        return 0
    else
        error "Database connectivity check failed"
        return 1
    fi
}

# Check SSL certificate expiry
check_ssl_expiry() {
    local domain="${SSL_DOMAIN:-localhost}"
    local cert_file="/etc/letsencrypt/live/$domain/fullchain.pem"
    
    if [ -f "$cert_file" ]; then
        local expiry_date=$(openssl x509 -enddate -noout -in "$cert_file" | cut -d= -f2)
        local expiry_timestamp=$(date -d "$expiry_date" +%s 2>/dev/null || echo "0")
        local current_timestamp=$(date +%s)
        local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
        
        if [ "$days_until_expiry" -lt 30 ]; then
            warning "SSL certificate expires in $days_until_expiry days"
            return 1
        fi
    else
        warning "SSL certificate file not found"
        return 1
    fi
    
    return 0
}

# Collect metrics
collect_metrics() {
    local timestamp=$(date +%s)
    local cpu=$(get_cpu_usage)
    local memory=$(get_memory_usage)
    local disk=$(get_disk_usage)
    local load=$(get_load_average)
    
    # Get Docker container stats
    local container_stats=""
    if command -v docker >/dev/null 2>&1; then
        container_stats=$(docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" 2>/dev/null || echo "")
    fi
    
    # Create metrics JSON
    cat > "$METRICS_FILE" <<EOF
{
  "timestamp": $timestamp,
  "datetime": "$(date)",
  "system": {
    "cpu_usage": $cpu,
    "memory_usage": $memory,
    "disk_usage": $disk,
    "load_average": "$load"
  },
  "containers": {
    "app_running": $(docker ps | grep -q docflow_app && echo "true" || echo "false"),
    "db_running": $(docker ps | grep -q docflow_postgres && echo "true" || echo "false"),
    "nginx_running": $(docker ps | grep -q docflow_nginx && echo "true" || echo "false"),
    "redis_running": $(docker ps | grep -q docflow_redis && echo "true" || echo "false")
  },
  "health_checks": {
    "app_healthy": $(check_app_health >/dev/null 2>&1 && echo "true" || echo "false"),
    "db_healthy": $(check_database >/dev/null 2>&1 && echo "true" || echo "false"),
    "ssl_valid": $(check_ssl_expiry >/dev/null 2>&1 && echo "true" || echo "false")
  }
}
EOF

    log "Metrics collected - CPU: ${cpu}%, Memory: ${memory}%, Disk: ${disk}%"
}

# Send alert notification
send_alert() {
    local alert_type="$1"
    local message="$2"
    local severity="${3:-warning}"
    
    local emoji="⚠️"
    if [ "$severity" = "critical" ]; then
        emoji="🚨"
    elif [ "$severity" = "info" ]; then
        emoji="ℹ️"
    fi
    
    # Send Telegram notification if configured
    if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
        local full_message="$emoji *DocFlow Alert*
        
Type: $alert_type
Severity: $severity
Hostname: $(hostname)
Time: $(date)

$message"
        
        curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
            -d "chat_id=${TELEGRAM_CHAT_ID}" \
            -d "text=${full_message}" \
            -d "parse_mode=Markdown" >/dev/null 2>&1 || true
    fi
    
    # Send Slack notification if configured
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        local color="warning"
        if [ "$severity" = "critical" ]; then
            color="danger"
        elif [ "$severity" = "info" ]; then
            color="good"
        fi
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"DocFlow Alert: $alert_type\",
                    \"text\": \"$message\",
                    \"fields\": [
                        {\"title\": \"Severity\", \"value\": \"$severity\", \"short\": true},
                        {\"title\": \"Instance\", \"value\": \"$(curl -s http://169.254.169.254/latest/meta-data/instance-id 2>/dev/null || hostname)\", \"short\": true},
                        {\"title\": \"Time\", \"value\": \"$(date)\", \"short\": true}
                    ]
                }]
            }" \
            "$SLACK_WEBHOOK_URL" >/dev/null 2>&1 || true
    fi
}

# Check system thresholds
check_thresholds() {
    local cpu=$(get_cpu_usage)
    local memory=$(get_memory_usage)
    local disk=$(get_disk_usage)
    
    # Check CPU usage
    if (( $(echo "$cpu > $ALERT_CPU_THRESHOLD" | bc -l) )); then
        send_alert "High CPU Usage" "CPU usage is ${cpu}% (threshold: ${ALERT_CPU_THRESHOLD}%)" "warning"
    fi
    
    # Check memory usage
    if (( $(echo "$memory > $ALERT_MEMORY_THRESHOLD" | bc -l) )); then
        send_alert "High Memory Usage" "Memory usage is ${memory}% (threshold: ${ALERT_MEMORY_THRESHOLD}%)" "warning"
    fi
    
    # Check disk usage
    if [ "$disk" -gt "$ALERT_DISK_THRESHOLD" ]; then
        send_alert "High Disk Usage" "Disk usage is ${disk}% (threshold: ${ALERT_DISK_THRESHOLD}%)" "critical"
    fi
    
    # Check containers
    if ! check_docker_containers; then
        send_alert "Container Failure" "One or more Docker containers are not running" "critical"
    fi
    
    # Check application health
    if ! check_app_health; then
        send_alert "Application Health" "Application health check failed" "critical"
    fi
    
    # Check database
    if ! check_database; then
        send_alert "Database Health" "Database connectivity check failed" "critical"
    fi
    
    # Check SSL certificate
    if ! check_ssl_expiry; then
        send_alert "SSL Certificate" "SSL certificate is expiring soon or invalid" "warning"
    fi
}

# Generate daily report
generate_daily_report() {
    local report_file="/opt/docflow/logs/daily_report_$(date +%Y%m%d).txt"
    
    cat > "$report_file" <<EOF
DocFlow Daily System Report
Date: $(date)
Hostname: $(hostname)
Uptime: $(uptime)

=== System Resources ===
CPU Usage: $(get_cpu_usage)%
Memory Usage: $(get_memory_usage)%
Disk Usage: $(get_disk_usage)%
Load Average: $(get_load_average)

=== Container Status ===
EOF
    
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.RunningFor}}" | grep docflow >> "$report_file" 2>/dev/null || echo "No DocFlow containers running" >> "$report_file"
    
    cat >> "$report_file" <<EOF

=== Health Checks ===
Application: $(check_app_health >/dev/null 2>&1 && echo "HEALTHY" || echo "FAILED")
Database: $(check_database >/dev/null 2>&1 && echo "HEALTHY" || echo "FAILED")
SSL Certificate: $(check_ssl_expiry >/dev/null 2>&1 && echo "VALID" || echo "EXPIRING/INVALID")

=== Recent Logs (Last 10 entries) ===
EOF
    
    tail -n 10 "$LOG_FILE" >> "$report_file" 2>/dev/null || echo "No recent logs" >> "$report_file"
    
    # Send daily report
    if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
        local summary=$(grep -E "(CPU Usage|Memory Usage|Disk Usage|HEALTHY|FAILED)" "$report_file" | head -6)
        
        local message="📊 *DocFlow Daily Report*
        
Date: $(date '+%Y-%m-%d')
Hostname: $(hostname)

$summary"
        
        curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
            -d "chat_id=${TELEGRAM_CHAT_ID}" \
            -d "text=${message}" \
            -d "parse_mode=Markdown" >/dev/null 2>&1 || true
    fi
    
    log "Daily report generated: $report_file"
}

# Cleanup old logs
cleanup_logs() {
    # Keep logs for 30 days
    find "$(dirname "$LOG_FILE")" -name "*.log" -mtime +30 -delete 2>/dev/null || true
    find "$(dirname "$LOG_FILE")" -name "daily_report_*.txt" -mtime +30 -delete 2>/dev/null || true
    
    # Rotate log file if it's too large (> 100MB)
    if [ -f "$LOG_FILE" ] && [ $(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE" 2>/dev/null || echo 0) -gt 104857600 ]; then
        mv "$LOG_FILE" "${LOG_FILE}.old"
        touch "$LOG_FILE"
        log "Log file rotated due to size limit"
    fi
}

# Main monitoring loop
main_loop() {
    log "Starting DocFlow monitoring service..."
    
    # Generate daily report at startup if it's a new day
    if [ ! -f "/opt/docflow/logs/daily_report_$(date +%Y%m%d).txt" ]; then
        generate_daily_report
    fi
    
    while true; do
        collect_metrics
        check_thresholds
        cleanup_logs
        
        # Generate daily report at midnight
        if [ "$(date +%H%M)" = "0000" ]; then
            generate_daily_report
        fi
        
        sleep "$CHECK_INTERVAL"
    done
}

# Handle script termination
cleanup() {
    log "Monitoring service stopped"
    exit 0
}

trap cleanup SIGTERM SIGINT

# Single check mode (for manual execution)
if [ "$1" = "--check" ]; then
    create_log_dir
    collect_metrics
    check_thresholds
    cat "$METRICS_FILE"
    exit 0
elif [ "$1" = "--report" ]; then
    create_log_dir
    generate_daily_report
    exit 0
fi

# Main execution
create_log_dir
main_loop