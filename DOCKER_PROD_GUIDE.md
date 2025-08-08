# Docker Production Deployment Guide

Complete guide for deploying Claude DocFlow in production using Docker containers.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Production Architecture](#production-architecture)
- [Environment Setup](#environment-setup)
- [Docker Configuration](#docker-configuration)
- [Deployment Steps](#deployment-steps)
- [Monitoring & Health Checks](#monitoring--health-checks)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)
- [Maintenance](#maintenance)

## Prerequisites

### System Requirements
- **OS**: Linux (Ubuntu 20.04+, CentOS 8+, RHEL 8+)
- **RAM**: Minimum 4GB, Recommended 8GB+
- **Storage**: Minimum 50GB SSD
- **CPU**: 2+ cores recommended
- **Network**: Open ports 80, 443 (and optionally 5432 for DB access)

### Required Software
```bash
# Docker & Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Docker Compose (if not included)
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

## Production Architecture

```
┌─────────────────────────────────────────┐
│                Internet                 │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│            Nginx (Port 80/443)         │
│         - Reverse Proxy                │
│         - SSL Termination              │
│         - Rate Limiting                │
│         - Security Headers             │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│        DocFlow App (Port 3000)         │
│         - Next.js Application          │
│         - JWT Authentication           │
│         - API Endpoints                │
└─────────────────┬───────────────────────┘
                  │
      ┌───────────┼───────────┐
      │           │           │
┌─────▼─────┐ ┌───▼───┐ ┌─────▼─────┐
│PostgreSQL │ │ Redis │ │  Volumes  │
│  (5432)   │ │(6379) │ │- uploads  │
│- Database │ │- Cache│ │- logs     │
│- Backups  │ │- Sess │ │- backups  │
└───────────┘ └───────┘ └───────────┘
```

## Environment Setup

### 1. Create Production Environment File
```bash
# Create production environment
cp .env.example .env.production
```

### 2. Configure Production Variables
```env
# Database Configuration
DATABASE_URL=postgresql://postgres:SECURE_DB_PASSWORD@db:5432/pwausers_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=SECURE_DB_PASSWORD
POSTGRES_DB=pwausers_db

# NextAuth Configuration
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=VERY_SECURE_SECRET_KEY_32_CHARS_MIN
AUTH_TRUST_HOST=true

# External PWA Authentication
PWA_AUTH_URL=https://intranet.pwa.co.th/login/webservice_login6.php

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=SECURE_REDIS_PASSWORD
REDIS_DB=0
REDIS_KEY_PREFIX=docflow:

# Security Configuration
NODE_ENV=production
PORT=3000

# Optional: Telegram Notifications
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

### 3. SSL Certificate Setup
```bash
# Create certificates directory
mkdir -p certs

# Option 1: Let's Encrypt (Recommended)
sudo apt install certbot
sudo certbot certonly --standalone -d your-domain.com
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem certs/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem certs/

# Option 2: Self-signed (Development only)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certs/privkey.pem -out certs/fullchain.pem
```

## Docker Configuration

### Production Docker Compose
The system uses `docker-compose.prod.yml` with the following services:

#### 1. **Nginx Reverse Proxy**
```yaml
nginx:
  image: nginx:1.25-alpine
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    - ./nginx/conf.d:/etc/nginx/conf.d:ro
    - ./certs:/etc/nginx/certs:ro
```

#### 2. **DocFlow Application**
```yaml
app:
  build:
    dockerfile: Dockerfile.prod.simple
  expose:
    - "3000"
  environment:
    - NODE_ENV=production
  deploy:
    resources:
      limits:
        memory: 1G
        cpus: '1.0'
```

#### 3. **PostgreSQL Database**
```yaml
db:
  image: postgres:17.5-alpine3.20
  volumes:
    - postgres_data:/var/lib/postgresql/data
    - ./backups:/backups
  deploy:
    resources:
      limits:
        memory: 512M
```

#### 4. **Redis Cache**
```yaml
redis:
  image: redis:7.4-alpine
  volumes:
    - redis_data:/data
    - ./redis/redis.conf:/usr/local/etc/redis/redis.conf:ro
```

## Deployment Steps

### 1. Initial Deployment
```bash
# Clone the repository
git clone <repository-url> docflow-production
cd docflow-production

# Checkout production branch
git checkout production

# Set up environment
cp .env.example .env.production
# Edit .env.production with your values

# Create required directories
mkdir -p logs backups certs uploads tmp

# Set proper permissions
sudo chown -R 1001:1001 uploads tmp
sudo chown -R 999:999 logs backups
```

### 2. Build and Start Services
```bash
# Build and start all services
docker-compose -f docker-compose.prod.yml up -d --build

# Check service status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### 3. Database Initialization
```bash
# Wait for database to be ready
docker-compose -f docker-compose.prod.yml logs db | grep "ready to accept connections"

# Initialize database schema and data
docker exec docflow-db psql -U postgres -d pwausers_db -f /scripts/init-docflow-complete.sql

# Create admin user
docker exec docflow-db psql -U postgres -d pwausers_db \
  -v admin_username='admin' \
  -v admin_password='SecureAdmin2024!' \
  -v admin_email='admin@your-domain.com' \
  -f /scripts/create-local-admin.sql
```

### 4. Verify Deployment
```bash
# Check container health
docker-compose -f docker-compose.prod.yml ps

# Test HTTP access
curl -I http://localhost
curl -I https://localhost # If SSL configured

# Test application health
curl http://localhost/api/health

# Check database connectivity
docker exec docflow-db psql -U postgres -d pwausers_db -c "\dt"
```

## Monitoring & Health Checks

### Container Health Checks
```bash
# Built-in health checks
docker-compose -f docker-compose.prod.yml ps

# Manual health verification
docker exec docflow-app curl -f http://localhost:3000/api/health
docker exec docflow-db pg_isready -U postgres -d pwausers_db
docker exec docflow-redis redis-cli --no-auth-warning ping
```

### Log Monitoring
```bash
# Application logs
docker-compose -f docker-compose.prod.yml logs -f app

# Database logs
docker-compose -f docker-compose.prod.yml logs -f db

# Nginx access logs
docker-compose -f docker-compose.prod.yml logs -f nginx

# All services logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Resource Monitoring
```bash
# Container resource usage
docker stats

# Disk usage
df -h
docker system df

# Memory usage
free -h
```

## Security Considerations

### 1. Network Security
- **Firewall Configuration**:
```bash
# UFW Example
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. Container Security
- Run containers as non-root users
- Use specific image versions (no `latest` tags)
- Implement resource limits
- Regular security updates

### 3. Database Security
- Strong passwords for PostgreSQL and Redis
- No exposed database ports in production
- Regular backups with encryption
- Database user permissions

### 4. Application Security
- Strong JWT secrets (32+ characters)
- HTTPS-only in production
- Security headers via Nginx
- Rate limiting enabled

## Troubleshooting

### Common Issues

#### 1. **Container Won't Start**
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs <service-name>

# Check configuration
docker-compose -f docker-compose.prod.yml config

# Restart specific service
docker-compose -f docker-compose.prod.yml restart <service-name>
```

#### 2. **Database Connection Issues**
```bash
# Verify database is running
docker-compose -f docker-compose.prod.yml ps db

# Test connection
docker exec docflow-db psql -U postgres -d pwausers_db -c "SELECT version();"

# Check environment variables
docker-compose -f docker-compose.prod.yml exec app env | grep DATABASE
```

#### 3. **Application Not Accessible**
```bash
# Check nginx status
docker-compose -f docker-compose.prod.yml ps nginx

# Test nginx configuration
docker-compose -f docker-compose.prod.yml exec nginx nginx -t

# Check port binding
netstat -tlnp | grep :80
```

#### 4. **Performance Issues**
```bash
# Check resource usage
docker stats

# Increase resource limits in docker-compose.prod.yml
deploy:
  resources:
    limits:
      memory: 2G
      cpus: '2.0'
```

### Recovery Procedures

#### Database Recovery
```bash
# Stop application
docker-compose -f docker-compose.prod.yml stop app

# Restore from backup
docker exec docflow-db psql -U postgres -d pwausers_db < backups/backup-YYYY-MM-DD.sql

# Restart application
docker-compose -f docker-compose.prod.yml start app
```

#### Complete System Recovery
```bash
# Stop all services
docker-compose -f docker-compose.prod.yml down

# Remove containers (keeps volumes)
docker-compose -f docker-compose.prod.yml rm -f

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build
```

## Maintenance

### Regular Maintenance Tasks

#### 1. **Daily Backups**
```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker exec docflow-db pg_dump -U postgres pwausers_db > "backups/docflow_${DATE}.sql"
# Keep only 30 days of backups
find backups/ -name "docflow_*.sql" -mtime +30 -delete
EOF

chmod +x backup.sh

# Add to crontab
echo "0 2 * * * /path/to/docflow-production/backup.sh" | crontab -
```

#### 2. **Log Rotation**
```bash
# Configure logrotate
sudo tee /etc/logrotate.d/docker << 'EOF'
/var/lib/docker/containers/*/*-json.log {
    rotate 7
    daily
    compress
    size 10M
    missingok
    delaycompress
}
EOF
```

#### 3. **Security Updates**
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Docker images
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Clean up unused images
docker image prune -f
```

#### 4. **Certificate Renewal** (Let's Encrypt)
```bash
# Add to crontab
echo "0 1 1 * * certbot renew --quiet && docker-compose -f /path/to/docflow-production/docker-compose.prod.yml restart nginx" | crontab -
```

### Scaling Considerations

#### Horizontal Scaling
```yaml
# Multiple app instances
app:
  deploy:
    replicas: 3
  
# Load balancer configuration in nginx
upstream app_servers {
    server app_1:3000;
    server app_2:3000;
    server app_3:3000;
}
```

#### Resource Optimization
```yaml
# Production resource limits
app:
  deploy:
    resources:
      limits:
        memory: 1G
        cpus: '1.0'
      reservations:
        memory: 512M
        cpus: '0.5'
```

## Production Checklist

### Pre-Deployment
- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Firewall configured
- [ ] Backup procedures in place
- [ ] Monitoring set up

### Post-Deployment
- [ ] All services healthy
- [ ] Database initialized
- [ ] Admin user created
- [ ] HTTPS working
- [ ] Backups tested
- [ ] Logs configured
- [ ] Performance verified

### Security Audit
- [ ] Strong passwords used
- [ ] No default credentials
- [ ] Minimal exposed ports
- [ ] Security headers enabled
- [ ] Regular updates scheduled

This guide provides a comprehensive approach to deploying DocFlow in a production Docker environment with security, monitoring, and maintenance best practices.