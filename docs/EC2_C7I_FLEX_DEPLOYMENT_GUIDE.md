# DocFlow Production Deployment Guide - AWS EC2 c7i-flex.large

## Executive Summary

This guide provides production-ready deployment instructions for DocFlow Next.js PWA on AWS EC2 c7i-flex.large instance, optimized for 8GB RAM and 2 vCPUs with cost-effective multi-container architecture.

**Instance Details:**
- **Instance ID:** i-0c719a82783b5ca43
- **Type:** c7i-flex.large (2 vCPU, 8GB RAM, up to 10 Gbps network)
- **Public IP:** 43.209.177.163  
- **Region:** ap-southeast-7 (Jakarta)
- **Estimated Monthly Cost:** $72-108 + data transfer

---

## 1. Initial Server Setup and Security Hardening

### Step 1: Connect to Your EC2 Instance

```bash
# Connect to your instance
ssh -i ~/.ssh/your-key.pem ec2-user@43.209.177.163

# Update system packages
sudo dnf update -y
sudo dnf upgrade -y
```

### Step 2: Install Essential Tools

```bash
# Install Docker and Docker Compose
sudo dnf install -y docker
sudo systemctl enable docker
sudo systemctl start docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
sudo usermod -a -G docker ec2-user

# Install additional tools
sudo dnf install -y git htop curl wget unzip certbot nginx-utils

# Install AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
rm -rf awscliv2.zip aws/

# Install Node.js (for utilities)
sudo dnf install -y nodejs npm
sudo npm install -g pnpm@10.14.0
```

### Step 3: Security Hardening

```bash
# Configure firewall (UFW)
sudo dnf install -y ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

# Secure SSH configuration
sudo sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/#PubkeyAuthentication yes/PubkeyAuthentication yes/' /etc/ssh/sshd_config
sudo systemctl restart sshd

# Install fail2ban for intrusion prevention
sudo dnf install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Create fail2ban configuration
sudo tee /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/secure
maxretry = 3
bantime = 24h
EOF

sudo systemctl restart fail2ban
```

### Step 4: Create Application User and Directories

```bash
# Create application user
sudo useradd -m -s /bin/bash docflow
sudo usermod -a -G docker docflow

# Create application directory
sudo mkdir -p /opt/docflow
sudo chown -R docflow:docflow /opt/docflow

# Create data directories
sudo mkdir -p /data/{postgres,redis,uploads,backups,ssl,logs}
sudo chown -R docflow:docflow /data
```

---

## 2. AWS Security Group Configuration

### Configure Security Groups via AWS CLI or Console

```bash
# Get your security group ID
aws ec2 describe-instances \
  --instance-ids i-0c719a82783b5ca43 \
  --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' \
  --output text

# Add security rules (replace sg-xxxxxxxxx with actual group ID)
SECURITY_GROUP_ID="sg-xxxxxxxxx"

# SSH (restrict to your IP)
YOUR_IP=$(curl -s https://ipinfo.io/ip)
aws ec2 authorize-security-group-ingress \
  --group-id $SECURITY_GROUP_ID \
  --protocol tcp \
  --port 22 \
  --cidr ${YOUR_IP}/32

# HTTP and HTTPS
aws ec2 authorize-security-group-ingress \
  --group-id $SECURITY_GROUP_ID \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id $SECURITY_GROUP_ID \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# Custom application port (optional, for direct app access during setup)
aws ec2 authorize-security-group-ingress \
  --group-id $SECURITY_GROUP_ID \
  --protocol tcp \
  --port 3000 \
  --cidr ${YOUR_IP}/32
```

---

## 3. Application Deployment

### Step 1: Clone Repository and Setup

```bash
# Switch to docflow user
sudo su - docflow

# Clone repository
cd /opt/docflow
git clone https://github.com/your-username/docflow.git .

# Create environment file for production
cat > .env.production << 'EOF'
# Application Environment
NODE_ENV=production
NEXTAUTH_URL=https://docflow.yourdomain.com
AUTH_TRUST_HOST=true
AUTH_SECRET=your-super-secure-secret-key-min-32-chars

# Database Configuration
POSTGRES_USER=docflow_user
POSTGRES_PASSWORD=your-secure-db-password-123!
POSTGRES_DB=pwausers_db
DATABASE_URL=postgresql://docflow_user:your-secure-db-password-123!@db:5432/pwausers_db

# External PWA Authentication
PWA_AUTH_URL=https://your-pwa-auth-endpoint.com/api/login

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your-secure-redis-password-123!
REDIS_DB=0
REDIS_KEY_PREFIX=docflow:

# Telegram Configuration (optional)
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_CHAT_ID=your-chat-id

# File Upload Configuration
NEXT_PUBLIC_MONTH_YEAR_FUTURE_YEARS=1
NEXT_PUBLIC_MONTH_YEAR_PAST_YEARS=1

# AWS Configuration (if using S3)
AWS_REGION=ap-southeast-7
AWS_S3_BUCKET=docflow-uploads-bucket
# AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY should be set via IAM role

# Docker Configuration
DOCKER_IMAGE=docflow:latest
COMPOSE_PROJECT_NAME=docflow
EOF

# Secure the environment file
chmod 600 .env.production
```

### Step 2: Build and Deploy

```bash
# Build the Docker image
docker build -f Dockerfile.production -t docflow:latest .

# Start the services
docker-compose -f docker-compose.c7i-flex.yml --env-file .env.production up -d

# Initialize the database
sleep 30  # Wait for services to start
docker-compose -f docker-compose.c7i-flex.yml exec app pnpm db:push
docker-compose -f docker-compose.c7i-flex.yml exec app pnpm docflow:init

# Check deployment status
docker-compose -f docker-compose.c7i-flex.yml ps
```

---

## 4. SSL Configuration with Let's Encrypt

### Step 1: Prepare SSL Setup

```bash
# Create SSL directories
mkdir -p /data/ssl/{certbot,www}
chown -R docflow:docflow /data/ssl

# Create initial Nginx configuration (without SSL)
cp nginx/nginx.conf /data/nginx.conf
```

### Step 2: Obtain SSL Certificate

```bash
# Stop Nginx temporarily
docker-compose -f docker-compose.c7i-flex.yml stop nginx

# Run Certbot in standalone mode
docker run --rm \
  -p 80:80 \
  -v /data/ssl/certbot:/etc/letsencrypt \
  -v /data/ssl/www:/var/www/certbot \
  certbot/certbot certonly \
  --standalone \
  --email admin@yourdomain.com \
  --agree-tos \
  --no-eff-email \
  -d docflow.yourdomain.com

# Update Nginx configuration for SSL
cp nginx/nginx.production.conf /data/nginx.conf
sed -i 's/your-domain.com/docflow.yourdomain.com/g' /data/nginx.conf

# Restart Nginx with SSL
docker-compose -f docker-compose.c7i-flex.yml start nginx
```

### Step 3: Setup SSL Auto-renewal

```bash
# Create renewal script
cat > /opt/docflow/scripts/renew-ssl.sh << 'EOF'
#!/bin/bash
docker run --rm \
  -v /data/ssl/certbot:/etc/letsencrypt \
  -v /data/ssl/www:/var/www/certbot \
  certbot/certbot renew --webroot --webroot-path=/var/www/certbot

# Reload Nginx if renewal successful
if [ $? -eq 0 ]; then
  docker-compose -f /opt/docflow/docker-compose.c7i-flex.yml exec nginx nginx -s reload
fi
EOF

chmod +x /opt/docflow/scripts/renew-ssl.sh

# Add to crontab
echo "0 2 * * 0 /opt/docflow/scripts/renew-ssl.sh >> /var/log/ssl-renewal.log 2>&1" | crontab -
```

---

## 5. Monitoring and Health Checks

### Step 1: System Monitoring Script

```bash
# Create monitoring script
cat > /opt/docflow/scripts/monitor-system.sh << 'EOF'
#!/bin/bash

LOG_FILE="/var/log/docflow-monitoring.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] System Monitoring Check" >> $LOG_FILE

# Check system resources
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.2f", $3/$2 * 100}')
DISK_USAGE=$(df -h / | awk 'NR==2{printf "%s", $5}')

echo "[$DATE] CPU: ${CPU_USAGE}%, Memory: ${MEMORY_USAGE}%, Disk: ${DISK_USAGE}" >> $LOG_FILE

# Check Docker containers
CONTAINERS_RUNNING=$(docker ps --format "table {{.Names}}\t{{.Status}}" | grep -c "Up")
CONTAINERS_EXPECTED=4  # app, db, redis, nginx

if [ $CONTAINERS_RUNNING -lt $CONTAINERS_EXPECTED ]; then
  echo "[$DATE] WARNING: Only $CONTAINERS_RUNNING out of $CONTAINERS_EXPECTED containers running" >> $LOG_FILE
fi

# Check application health
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health)
if [ $HTTP_STATUS -ne 200 ]; then
  echo "[$DATE] ERROR: Application health check failed (HTTP $HTTP_STATUS)" >> $LOG_FILE
fi

# Check database connectivity
DB_STATUS=$(docker-compose -f /opt/docflow/docker-compose.c7i-flex.yml exec -T db pg_isready -U docflow_user 2>/dev/null)
if [ $? -ne 0 ]; then
  echo "[$DATE] ERROR: Database connectivity check failed" >> $LOG_FILE
fi

echo "[$DATE] Monitoring check completed" >> $LOG_FILE
EOF

chmod +x /opt/docflow/scripts/monitor-system.sh

# Schedule monitoring
echo "*/5 * * * * /opt/docflow/scripts/monitor-system.sh" | crontab -
```

### Step 2: Application Health Dashboard

```bash
# Create simple health dashboard
cat > /opt/docflow/scripts/health-dashboard.sh << 'EOF'
#!/bin/bash

clear
echo "==================================="
echo "   DocFlow Health Dashboard"
echo "==================================="
echo ""

# System Information
echo "System Information:"
echo "- Instance: c7i-flex.large (2 vCPU, 8GB RAM)"
echo "- Uptime: $(uptime -p)"
echo "- Load: $(uptime | awk -F'load average:' '{print $2}')"
echo ""

# Resource Usage
echo "Resource Usage:"
echo "- CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')%"
echo "- Memory: $(free -h | awk 'NR==2{printf "Used: %s/%s (%.2f%%)", $3, $2, $3*100/$2 }')"
echo "- Disk: $(df -h / | awk 'NR==2{printf "Used: %s/%s (%s)", $3, $2, $5}')"
echo ""

# Docker Status
echo "Docker Services:"
docker-compose -f /opt/docflow/docker-compose.c7i-flex.yml ps --format "table {{.Name}}\t{{.State}}\t{{.Ports}}"
echo ""

# Application Status
echo "Application Health:"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health)
if [ $HTTP_STATUS -eq 200 ]; then
  echo "✅ Application: Healthy (HTTP $HTTP_STATUS)"
else
  echo "❌ Application: Unhealthy (HTTP $HTTP_STATUS)"
fi

# SSL Certificate Status
if [ -f /data/ssl/certbot/live/docflow.yourdomain.com/fullchain.pem ]; then
  CERT_EXPIRY=$(openssl x509 -enddate -noout -in /data/ssl/certbot/live/docflow.yourdomain.com/fullchain.pem | cut -d= -f2)
  echo "🔒 SSL Certificate: Valid until $CERT_EXPIRY"
else
  echo "⚠️  SSL Certificate: Not found"
fi

echo ""
echo "Last updated: $(date)"
EOF

chmod +x /opt/docflow/scripts/health-dashboard.sh

# Create alias for easy access
echo "alias health='/opt/docflow/scripts/health-dashboard.sh'" >> ~/.bashrc
```

---

## 6. Backup and Recovery

### Step 1: Automated Backup System

```bash
# Create comprehensive backup script
cat > /opt/docflow/scripts/backup-production.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/data/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="docflow_backup_$DATE"
LOG_FILE="/var/log/backup.log"

echo "[$(date)] Starting backup: $BACKUP_NAME" >> $LOG_FILE

# Create backup directory
mkdir -p "$BACKUP_DIR/$BACKUP_NAME"

# Database backup
echo "[$(date)] Backing up database..." >> $LOG_FILE
docker-compose -f /opt/docflow/docker-compose.c7i-flex.yml exec -T db pg_dump -U docflow_user -d pwausers_db | gzip > "$BACKUP_DIR/$BACKUP_NAME/database.sql.gz"

# Application files backup
echo "[$(date)] Backing up application files..." >> $LOG_FILE
tar -czf "$BACKUP_DIR/$BACKUP_NAME/uploads.tar.gz" -C /data uploads/
tar -czf "$BACKUP_DIR/$BACKUP_NAME/logs.tar.gz" -C /data logs/

# Configuration backup
echo "[$(date)] Backing up configuration..." >> $LOG_FILE
cp /opt/docflow/.env.production "$BACKUP_DIR/$BACKUP_NAME/"
cp -r /data/ssl "$BACKUP_DIR/$BACKUP_NAME/"

# Docker volumes backup
echo "[$(date)] Backing up Docker volumes..." >> $LOG_FILE
docker run --rm -v docflow_postgres_data:/data -v "$BACKUP_DIR/$BACKUP_NAME":/backup alpine tar czf /backup/postgres_volume.tar.gz /data
docker run --rm -v docflow_redis_data:/data -v "$BACKUP_DIR/$BACKUP_NAME":/backup alpine tar czf /backup/redis_volume.tar.gz /data

# Create manifest
cat > "$BACKUP_DIR/$BACKUP_NAME/manifest.txt" << MANIFEST
Backup Name: $BACKUP_NAME
Date: $(date)
Instance: i-0c719a82783b5ca43 (c7i-flex.large)
Application Version: $(cd /opt/docflow && git rev-parse HEAD)
Files:
- database.sql.gz: PostgreSQL database dump
- uploads.tar.gz: User uploaded files
- logs.tar.gz: Application logs
- .env.production: Environment configuration
- ssl/: SSL certificates and configuration
- postgres_volume.tar.gz: PostgreSQL data volume
- redis_volume.tar.gz: Redis data volume
MANIFEST

# Calculate backup size
BACKUP_SIZE=$(du -sh "$BACKUP_DIR/$BACKUP_NAME" | cut -f1)
echo "[$(date)] Backup completed: $BACKUP_NAME ($BACKUP_SIZE)" >> $LOG_FILE

# Cleanup old backups (keep last 7 days)
find $BACKUP_DIR -name "docflow_backup_*" -type d -mtime +7 -exec rm -rf {} \;
echo "[$(date)] Cleanup completed" >> $LOG_FILE
EOF

chmod +x /opt/docflow/scripts/backup-production.sh

# Schedule daily backups at 2 AM
echo "0 2 * * * /opt/docflow/scripts/backup-production.sh" | crontab -
```

### Step 2: Recovery Procedures

```bash
# Create recovery script
cat > /opt/docflow/scripts/restore-backup.sh << 'EOF'
#!/bin/bash

if [ $# -eq 0 ]; then
    echo "Usage: $0 <backup_name>"
    echo "Available backups:"
    ls -1 /data/backups/ | grep docflow_backup_
    exit 1
fi

BACKUP_NAME=$1
BACKUP_PATH="/data/backups/$BACKUP_NAME"

if [ ! -d "$BACKUP_PATH" ]; then
    echo "Error: Backup $BACKUP_NAME not found"
    exit 1
fi

echo "WARNING: This will restore from backup $BACKUP_NAME"
echo "This will overwrite current data. Are you sure? (yes/no)"
read -r response

if [ "$response" != "yes" ]; then
    echo "Restore cancelled"
    exit 1
fi

echo "Starting restore from backup: $BACKUP_NAME"

# Stop services
docker-compose -f /opt/docflow/docker-compose.c7i-flex.yml down

# Restore database
echo "Restoring database..."
docker-compose -f /opt/docflow/docker-compose.c7i-flex.yml up -d db
sleep 10
gunzip -c "$BACKUP_PATH/database.sql.gz" | docker-compose -f /opt/docflow/docker-compose.c7i-flex.yml exec -T db psql -U docflow_user -d pwausers_db

# Restore files
echo "Restoring files..."
cd /data
tar -xzf "$BACKUP_PATH/uploads.tar.gz"
tar -xzf "$BACKUP_PATH/logs.tar.gz"

# Restore Docker volumes
echo "Restoring Docker volumes..."
docker volume rm docflow_postgres_data docflow_redis_data 2>/dev/null || true
docker volume create docflow_postgres_data
docker volume create docflow_redis_data
docker run --rm -v docflow_postgres_data:/data -v "$BACKUP_PATH":/backup alpine tar xzf /backup/postgres_volume.tar.gz -C /
docker run --rm -v docflow_redis_data:/data -v "$BACKUP_PATH":/backup alpine tar xzf /backup/redis_volume.tar.gz -C /

# Start all services
echo "Starting services..."
docker-compose -f /opt/docflow/docker-compose.c7i-flex.yml up -d

echo "Restore completed successfully"
echo "Please verify application functionality"
EOF

chmod +x /opt/docflow/scripts/restore-backup.sh
```

---

## 7. Performance Optimization for 8GB RAM

### Memory Allocation Strategy

**Optimized Resource Distribution:**
- **Application (Next.js):** 2.5GB (31% of total)
- **PostgreSQL:** 2GB (25% of total)  
- **Redis:** 512MB (6% of total)
- **Nginx:** 256MB (3% of total)
- **System:** 2.5GB (31% of total)
- **Buffer:** 256MB (3% of total)

### PostgreSQL Optimization

```bash
# Create optimized PostgreSQL configuration
cat > /opt/docflow/postgresql.conf << 'EOF'
# Memory Configuration (optimized for 8GB total, 2GB allocated to PostgreSQL)
shared_buffers = 512MB
effective_cache_size = 1536MB
work_mem = 8MB
maintenance_work_mem = 128MB
max_connections = 100

# Performance Tuning
wal_buffers = 16MB
checkpoint_completion_target = 0.7
default_statistics_target = 100
random_page_cost = 1.1
seq_page_cost = 1.0

# Logging Configuration
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on
log_temp_files = 10MB

# Autovacuum Tuning
autovacuum_vacuum_scale_factor = 0.1
autovacuum_analyze_scale_factor = 0.05
autovacuum_naptime = 30s
EOF
```

### Application Performance Tuning

```bash
# Create performance monitoring script
cat > /opt/docflow/scripts/performance-monitor.sh << 'EOF'
#!/bin/bash

echo "==================================="
echo "   Performance Monitoring"
echo "==================================="
echo ""

# Memory Usage by Container
echo "Container Memory Usage:"
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}"
echo ""

# Application Response Times
echo "Application Performance:"
for endpoint in "/api/health" "/api/user/info" "/api/documents"; do
  RESPONSE_TIME=$(curl -o /dev/null -s -w "%{time_total}" http://localhost:3000$endpoint 2>/dev/null || echo "N/A")
  echo "- $endpoint: ${RESPONSE_TIME}s"
done
echo ""

# Database Performance
echo "Database Performance:"
DB_CONNECTIONS=$(docker-compose -f /opt/docflow/docker-compose.c7i-flex.yml exec -T db psql -U docflow_user -d pwausers_db -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | tail -n +3 | head -n 1 | xargs)
echo "- Active Connections: $DB_CONNECTIONS"

CACHE_HIT_RATIO=$(docker-compose -f /opt/docflow/docker-compose.c7i-flex.yml exec -T db psql -U docflow_user -d pwausers_db -c "SELECT round(sum(blks_hit)*100.0/sum(blks_hit+blks_read), 2) AS cache_hit_ratio FROM pg_stat_database WHERE datname = 'pwausers_db';" 2>/dev/null | tail -n +3 | head -n 1 | xargs)
echo "- Cache Hit Ratio: ${CACHE_HIT_RATIO}%"
echo ""

# Redis Performance
echo "Redis Performance:"
REDIS_INFO=$(docker-compose -f /opt/docflow/docker-compose.c7i-flex.yml exec -T redis redis-cli --no-auth-warning -a $(grep REDIS_PASSWORD /opt/docflow/.env.production | cut -d'=' -f2) info memory 2>/dev/null)
REDIS_MEMORY=$(echo "$REDIS_INFO" | grep used_memory_human | cut -d':' -f2 | tr -d '\r')
echo "- Memory Used: $REDIS_MEMORY"
echo ""

# System Load
echo "System Load:"
uptime
echo ""
EOF

chmod +x /opt/docflow/scripts/performance-monitor.sh
```

---

## 8. Cost Optimization

### Monthly Cost Breakdown

**EC2 Instance (c7i-flex.large):**
- On-Demand: ~$108/month (0.10 USD/hour × 24 × 30)
- Reserved Instance (1-year): ~$72/month (33% savings)

**Additional AWS Costs:**
- EBS Storage (100GB gp3): ~$8/month
- Data Transfer Out: ~$0.09/GB (first 100GB free)
- CloudWatch Logs: ~$0.50/GB ingested

**Total Estimated Monthly Cost:** $80-120

### Cost Optimization Script

```bash
# Create cost monitoring script
cat > /opt/docflow/scripts/cost-monitor.sh << 'EOF'
#!/bin/bash

echo "==================================="
echo "   AWS Cost Monitoring"
echo "==================================="
echo ""

# EBS Volume Usage
echo "Storage Usage:"
df -h | grep -E "/$|/data"
echo ""

# Docker Volume Usage
echo "Docker Volume Usage:"
docker system df
echo ""

# Cleanup Recommendations
echo "Cleanup Recommendations:"

# Check for large log files
LARGE_LOGS=$(find /var/log /data/logs -name "*.log" -size +100M 2>/dev/null)
if [ ! -z "$LARGE_LOGS" ]; then
  echo "- Large log files found (>100MB):"
  echo "$LARGE_LOGS" | while read -r file; do
    echo "  $(ls -lh "$file" | awk '{print $5, $9}')"
  done
fi

# Check Docker image usage
UNUSED_IMAGES=$(docker images -f "dangling=true" -q)
if [ ! -z "$UNUSED_IMAGES" ]; then
  echo "- Unused Docker images: $(echo $UNUSED_IMAGES | wc -w) found"
  echo "  Run: docker image prune -a"
fi

# Check old backups
OLD_BACKUPS=$(find /data/backups -name "docflow_backup_*" -type d -mtime +30 2>/dev/null)
if [ ! -z "$OLD_BACKUPS" ]; then
  echo "- Old backups (>30 days): $(echo $OLD_BACKUPS | wc -w) found"
fi

echo ""
echo "Instance Type Optimization:"
echo "Current: c7i-flex.large (2 vCPU, 8GB RAM) - $108/month"
echo "Consider Reserved Instance for 33% savings - $72/month"
EOF

chmod +x /opt/docflow/scripts/cost-monitor.sh

# Schedule weekly cost monitoring
echo "0 9 * * 1 /opt/docflow/scripts/cost-monitor.sh | mail -s 'DocFlow Weekly Cost Report' admin@yourdomain.com" | crontab -
```

---

## 9. Troubleshooting Guide

### Common Issues and Solutions

#### Issue 1: Out of Memory Errors

```bash
# Check memory usage
free -h
docker stats --no-stream

# Solution: Restart memory-intensive containers
docker-compose -f docker-compose.c7i-flex.yml restart app

# Enable swap if needed (emergency only)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

#### Issue 2: Database Connection Issues

```bash
# Check database container
docker-compose -f docker-compose.c7i-flex.yml logs db

# Test connection
docker-compose -f docker-compose.c7i-flex.yml exec db pg_isready -U docflow_user

# Reset connections if needed
docker-compose -f docker-compose.c7i-flex.yml exec db psql -U docflow_user -d pwausers_db -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'pwausers_db' AND pid <> pg_backend_pid();"
```

#### Issue 3: SSL Certificate Issues

```bash
# Check certificate status
openssl x509 -in /data/ssl/certbot/live/docflow.yourdomain.com/fullchain.pem -text -noout

# Manual certificate renewal
docker run --rm \
  -v /data/ssl/certbot:/etc/letsencrypt \
  -v /data/ssl/www:/var/www/certbot \
  certbot/certbot renew --force-renewal

# Restart Nginx
docker-compose -f docker-compose.c7i-flex.yml restart nginx
```

#### Issue 4: High CPU Usage

```bash
# Check processes
htop

# Check application performance
/opt/docflow/scripts/performance-monitor.sh

# Restart specific container if needed
docker-compose -f docker-compose.c7i-flex.yml restart app
```

---

## 10. Maintenance Procedures

### Daily Maintenance (Automated)

```bash
# Create daily maintenance script
cat > /opt/docflow/scripts/daily-maintenance.sh << 'EOF'
#!/bin/bash

LOG_FILE="/var/log/daily-maintenance.log"
echo "[$(date)] Starting daily maintenance" >> $LOG_FILE

# Clean up Docker
docker system prune -f --volumes >> $LOG_FILE 2>&1

# Rotate logs
find /data/logs -name "*.log" -size +100M -exec gzip {} \; >> $LOG_FILE 2>&1
find /data/logs -name "*.log.gz" -mtime +7 -delete >> $LOG_FILE 2>&1

# Clean up old backups
find /data/backups -name "docflow_backup_*" -type d -mtime +7 -exec rm -rf {} \; >> $LOG_FILE 2>&1

# Update system (security updates only)
sudo dnf update --security -y >> $LOG_FILE 2>&1

echo "[$(date)] Daily maintenance completed" >> $LOG_FILE
EOF

chmod +x /opt/docflow/scripts/daily-maintenance.sh

# Schedule daily maintenance at 3 AM
echo "0 3 * * * /opt/docflow/scripts/daily-maintenance.sh" | crontab -
```

### Weekly Maintenance

```bash
# Create weekly maintenance checklist
cat > /opt/docflow/scripts/weekly-checklist.sh << 'EOF'
#!/bin/bash

echo "==================================="
echo "   Weekly Maintenance Checklist"
echo "==================================="
echo ""

echo "□ Check system resource usage"
echo "□ Review application logs"
echo "□ Verify backup integrity"
echo "□ Check SSL certificate expiry"
echo "□ Review security group rules"
echo "□ Monitor cost usage"
echo "□ Update documentation"
echo ""

echo "Performance Metrics (Last 7 Days):"
# Add performance metrics here
echo ""

echo "Cost Summary (Current Month):"
/opt/docflow/scripts/cost-monitor.sh
echo ""

echo "Security Status:"
echo "- Fail2ban status: $(sudo systemctl is-active fail2ban)"
echo "- UFW status: $(sudo ufw status | head -1)"
echo "- Last security update: $(sudo dnf history | head -2 | tail -1 | awk '{print $4}')"
EOF

chmod +x /opt/docflow/scripts/weekly-checklist.sh
```

---

## 11. Emergency Procedures

### Complete System Recovery

```bash
# Create emergency recovery script
cat > /opt/docflow/scripts/emergency-recovery.sh << 'EOF'
#!/bin/bash

echo "EMERGENCY RECOVERY PROCEDURE"
echo "============================"
echo ""

# Stop all services
echo "1. Stopping all services..."
docker-compose -f /opt/docflow/docker-compose.c7i-flex.yml down

# System diagnostics
echo "2. System diagnostics..."
echo "- Memory: $(free -h | grep Mem | awk '{print $3"/"$2}')"
echo "- Disk: $(df -h / | tail -1 | awk '{print $5}')"
echo "- Load: $(uptime | awk -F'load average:' '{print $2}')"

# Clean up resources
echo "3. Cleaning up resources..."
docker system prune -f --volumes
sudo systemctl restart docker

# Restore from latest backup
echo "4. Checking for latest backup..."
LATEST_BACKUP=$(ls -1t /data/backups/ | head -1)
echo "Latest backup: $LATEST_BACKUP"

if [ ! -z "$LATEST_BACKUP" ]; then
    echo "Would you like to restore from $LATEST_BACKUP? (yes/no)"
    read -r response
    if [ "$response" = "yes" ]; then
        /opt/docflow/scripts/restore-backup.sh $LATEST_BACKUP
    fi
fi

# Start services
echo "5. Starting services..."
docker-compose -f /opt/docflow/docker-compose.c7i-flex.yml up -d

# Verify functionality
echo "6. Verifying functionality..."
sleep 30
curl -f http://localhost:3000/api/health && echo "✅ Application healthy" || echo "❌ Application unhealthy"

echo ""
echo "Emergency recovery completed"
echo "Please monitor the application closely"
EOF

chmod +x /opt/docflow/scripts/emergency-recovery.sh
```

---

## 12. Next Steps and Recommendations

### Immediate Actions After Deployment

1. **Test All Functionality**
   - User authentication
   - Document upload/download
   - PDF viewing
   - Comment system
   - Telegram notifications

2. **Configure Monitoring Alerts**
   - Set up email notifications for critical errors
   - Configure Telegram alerts for system issues
   - Monitor resource usage trends

3. **Security Hardening**
   - Review and update passwords
   - Configure regular security scans
   - Set up intrusion detection

### Future Enhancements

1. **Auto Scaling** (if traffic grows)
   - Application Load Balancer
   - Auto Scaling Group
   - Multi-AZ deployment

2. **Managed Services Migration**
   - Amazon RDS for PostgreSQL
   - Amazon ElastiCache for Redis
   - Amazon S3 for file storage

3. **Advanced Monitoring**
   - CloudWatch custom metrics
   - Application performance monitoring
   - Cost optimization alerts

---

This deployment guide provides a production-ready setup optimized for your specific AWS EC2 c7i-flex.large instance. The configuration balances performance, cost-effectiveness, and security while providing comprehensive monitoring and backup capabilities.

**Support Contact:** For issues with this deployment, refer to the troubleshooting section or create an issue in the project repository.