# 🚀 DocFlow Deployment Guide

## คู่มือการติดตั้งและ Deploy ระบบ DocFlow

คู่มือนี้ครอบคลุมการติดตั้งระบบ DocFlow ทั้งแบบ Development และ Production

---

## 📋 System Requirements

### Hardware Requirements

#### Minimum (Development):
- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 20GB
- **Network**: 100 Mbps

#### Recommended (Production):
- **CPU**: 4+ cores
- **RAM**: 8GB+
- **Storage**: 100GB+ SSD
- **Network**: 1 Gbps
- **Load Balancer**: สำหรับ High Availability

### Software Requirements

#### Required:
- **Docker**: 20.10+ และ Docker Compose V2
- **Node.js**: 18+ (สำหรับ Local Development)
- **PostgreSQL**: 17.5+ (หรือใช้ Docker)
- **Redis**: 6+ (Optional, จะใช้ In-memory ถ้าไม่มี)

#### Optional:
- **Nginx**: สำหรับ Reverse Proxy
- **SSL Certificate**: สำหรับ HTTPS
- **Monitoring Tools**: Prometheus, Grafana

---

## 🐳 Docker Deployment (แนะนำ)

### Quick Start - Production

#### 1. Clone Repository
```bash
git clone https://github.com/your-org/docflow.git
cd docflow
```

#### 2. Environment Setup
```bash
# Copy environment file
cp .env.example .env

# Edit environment variables
nano .env
```

#### 3. Required Environment Variables
```env
# Database
DATABASE_URL=postgresql://postgres:your_secure_password@db:5432/docflow_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=docflow_db

# Authentication
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your_super_secure_secret_key_here
AUTH_SECRET=your_super_secure_secret_key_here
AUTH_TRUST_HOST=true
PWA_AUTH_URL=https://your-pwa-auth-endpoint.com/api/login

# Redis (Optional but recommended for production)
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0
REDIS_KEY_PREFIX=docflow:

# Session Configuration (Optional)
SESSION_ABSOLUTE_TIMEOUT_SECONDS=14400  # 4 hours
SESSION_IDLE_TIMEOUT_SECONDS=1800       # 30 minutes
SESSION_WARNING_TIME_SECONDS=300        # 5 minutes

# Telegram (Optional)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_default_chat_id

# Production Settings
NODE_ENV=production
```

#### 4. Generate Secrets
```bash
# Generate AUTH_SECRET
openssl rand -base64 32

# Generate strong passwords
openssl rand -base64 16
```

#### 5. Deploy with Docker Compose
```bash
# Build and start services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f app
```

#### 6. Database Initialization
```bash
# Push database schema
docker-compose exec app pnpm db:push

# Initialize DocFlow data (branches, roles, permissions)
docker-compose exec app pnpm docflow:init

# Verify initialization
docker-compose exec db psql -U postgres -d docflow_db -c "SELECT name FROM roles;"
```

#### 7. Verify Deployment
```bash
# Health check
curl http://localhost:3000/api/health

# Test login page
curl http://localhost:3000/login
```

### Docker Compose Production Configuration

#### `docker-compose.prod.yml`
```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.prod.simple
    container_name: docflow_app
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    depends_on:
      - db
      - redis
    restart: unless-stopped
    mem_limit: 2g
    cpus: '1.0'
    volumes:
      - ./uploads:/app/uploads
      - ./tmp:/app/tmp
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  db:
    image: postgres:17.5-alpine
    container_name: docflow_db
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts:/scripts
    ports:
      - "5432:5432"
    restart: unless-stopped
    mem_limit: 1g
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: docflow_redis
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped
    mem_limit: 512m
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3

  nginx:
    image: nginx:alpine
    container_name: docflow_nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

---

## 🏗️ Manual Installation

### For Ubuntu 22.04 LTS

#### 1. System Update
```bash
sudo apt update && sudo apt upgrade -y
```

#### 2. Install Node.js 18+
```bash
# Install Node.js via NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm
npm install -g pnpm@latest
```

#### 3. Install PostgreSQL
```bash
# Install PostgreSQL 17
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql
CREATE DATABASE docflow_db;
CREATE USER docflow_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE docflow_db TO docflow_user;
\q
```

#### 4. Install Redis (Optional)
```bash
sudo apt install -y redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf
# Set: requirepass your_redis_password

sudo systemctl restart redis-server
sudo systemctl enable redis-server
```

#### 5. Application Setup
```bash
# Clone repository
git clone https://github.com/your-org/docflow.git
cd docflow

# Install dependencies
pnpm install

# Setup environment
cp .env.example .env
nano .env

# Build application
pnpm build

# Setup database
pnpm db:push
pnpm docflow:init
```

#### 6. Process Manager (PM2)
```bash
# Install PM2
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'docflow',
    script: 'pnpm',
    args: 'start',
    cwd: '/path/to/docflow',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 'max',
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '2G'
  }]
}
EOF

# Start application
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 🌐 Nginx Configuration

### Reverse Proxy Setup

#### `/etc/nginx/sites-available/docflow`
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL Configuration
    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Client upload size
    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_redirect off;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files caching
    location /_next/static/ {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Health check
    location /api/health {
        proxy_pass http://localhost:3000;
        access_log off;
    }
}
```

#### Enable site
```bash
sudo ln -s /etc/nginx/sites-available/docflow /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔒 SSL Certificate Setup

### Using Let's Encrypt (Certbot)

#### Install Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

#### Generate Certificate
```bash
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Using Custom Certificate
```bash
# Create SSL directory
sudo mkdir -p /etc/nginx/ssl

# Copy your certificates
sudo cp your-cert.pem /etc/nginx/ssl/
sudo cp your-private-key.key /etc/nginx/ssl/

# Set permissions
sudo chmod 600 /etc/nginx/ssl/*
sudo chown root:root /etc/nginx/ssl/*
```

---

## 📊 Monitoring Setup

### Health Checks

#### System Health Script
```bash
#!/bin/bash
# health-check.sh

echo "=== DocFlow Health Check ==="
echo "Time: $(date)"

# Application health
echo "1. Application Health:"
if curl -s http://localhost:3000/api/health | grep -q "healthy"; then
    echo "   ✓ Application: Healthy"
else
    echo "   ✗ Application: Unhealthy"
fi

# Database health
echo "2. Database Health:"
if docker-compose exec -T db pg_isready -U postgres > /dev/null; then
    echo "   ✓ Database: Connected"
else
    echo "   ✗ Database: Connection failed"
fi

# Redis health
echo "3. Redis Health:"
if docker-compose exec -T redis redis-cli ping | grep -q "PONG"; then
    echo "   ✓ Redis: Connected"
else
    echo "   ✗ Redis: Connection failed"
fi

# Disk usage
echo "4. Disk Usage:"
df -h / | tail -1 | awk '{print "   Storage: " $5 " used"}'

# Memory usage
echo "5. Memory Usage:"
free -h | grep Mem | awk '{print "   Memory: " $3 "/" $2 " used"}'

echo "=========================="
```

#### Cron Job for Monitoring
```bash
# Add to crontab
*/5 * * * * /path/to/health-check.sh >> /var/log/docflow-health.log 2>&1
```

### Log Management

#### Logrotate Configuration
```bash
# /etc/logrotate.d/docflow
/var/log/docflow/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
}
```

---

## 🔄 Backup and Recovery

### Automated Backup Script

#### `backup.sh`
```bash
#!/bin/bash
set -e

BACKUP_DIR="/backup/docflow"
DATE=$(date +%Y%m%d_%H%M%S)
DB_BACKUP="$BACKUP_DIR/db_backup_$DATE.sql"
FILES_BACKUP="$BACKUP_DIR/files_backup_$DATE.tar.gz"

# Create backup directory
mkdir -p $BACKUP_DIR

echo "Starting backup at $(date)"

# Database backup
echo "Backing up database..."
docker-compose exec -T db pg_dump -U postgres docflow_db > $DB_BACKUP

# Files backup
echo "Backing up files..."
tar -czf $FILES_BACKUP ./uploads ./tmp

# Cleanup old backups (keep last 7 days)
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed at $(date)"
echo "Database: $DB_BACKUP"
echo "Files: $FILES_BACKUP"
```

#### Schedule Backup
```bash
# Add to crontab
0 2 * * * /path/to/backup.sh >> /var/log/docflow-backup.log 2>&1
```

### Recovery Process

#### Database Recovery
```bash
# Stop application
docker-compose stop app

# Restore database
docker-compose exec -T db psql -U postgres -d docflow_db < backup_20250116_020000.sql

# Start application
docker-compose start app
```

#### Files Recovery
```bash
# Extract files
tar -xzf files_backup_20250116_020000.tar.gz

# Verify file integrity
ls -la uploads/
ls -la tmp/
```

---

## 🚀 High Availability Setup

### Load Balancer Configuration

#### HAProxy Setup
```haproxy
# /etc/haproxy/haproxy.cfg
global
    daemon
    chroot /var/lib/haproxy
    user haproxy
    group haproxy

defaults
    mode http
    timeout connect 5s
    timeout client 30s
    timeout server 30s
    option httplog

frontend docflow_frontend
    bind *:80
    bind *:443 ssl crt /etc/ssl/certs/docflow.pem
    redirect scheme https if !{ ssl_fc }
    default_backend docflow_backend

backend docflow_backend
    balance roundrobin
    option httpchk GET /api/health
    server app1 10.0.1.10:3000 check
    server app2 10.0.1.11:3000 check
```

### Database Clustering

#### PostgreSQL Master-Slave
```bash
# Master configuration (postgresql.conf)
wal_level = replica
max_wal_senders = 3
wal_keep_segments = 8

# Slave setup
pg_basebackup -h master_ip -D /var/lib/postgresql/data -U replication -v -P -R
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Find process using port 3000
sudo lsof -i :3000

# Kill process
sudo kill -9 PID
```

#### 2. Database Connection Failed
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check database logs
sudo tail -f /var/log/postgresql/postgresql-17-main.log

# Test connection
psql -h localhost -U postgres -d docflow_db
```

#### 3. Out of Disk Space
```bash
# Check disk usage
df -h

# Clean Docker images
docker image prune -a

# Clean logs
sudo journalctl --vacuum-time=7d
```

#### 4. Memory Issues
```bash
# Check memory usage
free -h

# Restart services
docker-compose restart

# Add swap if needed
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Log Locations

```bash
# Application logs
docker-compose logs app

# Database logs
docker-compose logs db

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# System logs
sudo journalctl -u docflow
```

---

## 📋 Post-Deployment Checklist

### Immediate Verification
- [ ] Application starts successfully
- [ ] Health check endpoint responds
- [ ] Database connection works
- [ ] Login functionality works
- [ ] File upload works
- [ ] PDF viewer displays correctly

### Security Verification
- [ ] HTTPS certificate valid
- [ ] Security headers present
- [ ] Rate limiting functional
- [ ] Access controls working
- [ ] Sensitive data not exposed

### Performance Testing
- [ ] Load testing completed
- [ ] Response times acceptable
- [ ] Memory usage stable
- [ ] Database performance optimized
- [ ] Cache hit rates good

### Monitoring Setup
- [ ] Health checks configured
- [ ] Log monitoring active
- [ ] Backup scripts running
- [ ] Alert notifications working
- [ ] Performance metrics collected

---

## 📞 Support and Maintenance

### Regular Maintenance Tasks

#### Daily
- Check application health
- Monitor error logs
- Verify backup completion

#### Weekly
- Review security logs
- Update dependencies
- Performance optimization

#### Monthly
- Security audit
- Capacity planning
- Disaster recovery testing

### Support Contacts
- **Technical Support**: tech-support@docflow.example.com
- **Emergency**: +66-2-XXX-XXXX
- **Documentation**: https://docs.docflow.example.com

---

*คู่มือการ Deploy ฉบับนี้อัปเดตล่าสุด: มกราคม 2025*