# 🐳 DocFlow Docker Deployment Guide

## Complete guide for deploying DocFlow using Docker Hub

This guide covers the complete workflow for deploying DocFlow from Docker Hub, including all necessary initialization steps.

---

## 🚀 **Quick Start Deployment**

### **Step 1: Pull and Run Container**

```bash
# Pull the latest DocFlow image
docker pull rutthawitc/docflow:latest

# Run with basic configuration
docker run -d \
  --name docflow_app \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://postgres:password@your_db:5432/docflow_db" \
  -e PWA_AUTH_URL="https://your-pwa-auth.com/api/login" \
  -e NEXTAUTH_SECRET="your-secret-key" \
  -e NEXTAUTH_URL="https://your-domain.com" \
  rutthawitc/docflow:latest
```

### **Step 2: Database Schema Setup** ⚠️ **REQUIRED**

```bash
# Push database schema (creates all tables)
docker exec -it docflow_app pnpm db:push

# Expected output:
# ✓ Database schema pushed successfully
```

### **Step 3: Initialize DocFlow Data** ⚠️ **REQUIRED**

```bash
# Initialize branches, roles, and permissions
docker exec -it docflow_app pnpm docflow:init

# Expected output:
# ✓ Created 22 R6 region branches
# ✓ Created DocFlow roles (uploader, branch_user, etc.)
# ✓ Created permissions system
```

### **Step 4: Verify Deployment**

```bash
# Check application health
curl http://localhost:3000/api/health

# Test login page
curl http://localhost:3000/login

# Expected: HTTP 200 responses
```

---

## 📋 **Production Checklist**

- [ ] Pull Docker image: `docker pull rutthawitc/docflow:latest`
- [ ] Run container with proper environment variables
- [ ] **Run `pnpm db:push`** (creates database tables)
- [ ] **Run `pnpm docflow:init`** (creates branches, roles, permissions)
- [ ] Test health endpoint: `curl http://localhost:3000/api/health`
- [ ] Test login functionality
- [ ] Verify file uploads work

---

## 🐳 **Production Docker Compose Deployment**

### **docker-compose.yml**

```yaml
version: "3.8"

services:
  app:
    image: rutthawitc/docflow:latest
    container_name: docflow_app
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@db:5432/docflow_db
      - PWA_AUTH_URL=${PWA_AUTH_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
      - AUTH_SECRET=${NEXTAUTH_SECRET}
      - AUTH_TRUST_HOST=true
      # Optional: Redis configuration
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_PASSWORD=${REDIS_PASSWORD}
      # Optional: Telegram notifications
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - TELEGRAM_CHAT_ID=${TELEGRAM_CHAT_ID}
    depends_on:
      - db
      - redis
    volumes:
      - ./uploads:/app/uploads
      - ./tmp:/app/tmp
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  db:
    image: postgres:17.5-alpine
    container_name: docflow_db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: docflow_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "postgres"]
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
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3

volumes:
  postgres_data:
  redis_data:
```

### **Environment File (.env)**

```env
# Database Configuration
POSTGRES_PASSWORD=your_secure_db_password

# DocFlow Configuration
PWA_AUTH_URL=https://your-pwa-auth-endpoint.com/api/login
NEXTAUTH_SECRET=your_super_secure_secret_key_here
NEXTAUTH_URL=https://your-domain.com

# Redis Configuration (Optional)
REDIS_PASSWORD=your_redis_password

# Telegram Configuration (Optional)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_default_chat_id

# Session Configuration (Optional)
SESSION_ABSOLUTE_TIMEOUT_SECONDS=14400  # 4 hours
SESSION_IDLE_TIMEOUT_SECONDS=1800       # 30 minutes
SESSION_WARNING_TIME_SECONDS=300        # 5 minutes
```

### **Deploy with Docker Compose**

```bash
# 1. Create environment file
cp .env.example .env
nano .env  # Edit with your values

# 2. Start all services
docker-compose up -d

# 3. Wait for services to start
sleep 30

# 4. Initialize database schema
docker-compose exec app pnpm db:push

# 5. Initialize DocFlow data
docker-compose exec app pnpm docflow:init

# 6. Verify deployment
curl http://localhost:3000/api/health
```

---

## ⚡ **Automated Initialization Script**

### **init-docflow.sh**

```bash
#!/bin/bash
set -e

echo "🚀 DocFlow Deployment Initialization"
echo "===================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if container is running
print_status "Checking if DocFlow container is running..."
if ! docker ps | grep -q docflow_app; then
    print_error "DocFlow container is not running!"
    echo "Please start the container first:"
    echo "  docker-compose up -d"
    echo "  # or"
    echo "  docker run -d --name docflow_app -p 3000:3000 rutthawitc/docflow:latest"
    exit 1
fi

print_success "DocFlow container is running"

# Initialize database schema
print_status "Setting up database schema..."
if docker exec docflow_app pnpm db:push; then
    print_success "Database schema created successfully"
else
    print_error "Failed to create database schema"
    exit 1
fi

# Initialize DocFlow data
print_status "Initializing DocFlow data (branches, roles, permissions)..."
if docker exec docflow_app pnpm docflow:init; then
    print_success "DocFlow data initialized successfully"
else
    print_error "Failed to initialize DocFlow data"
    exit 1
fi

# Test health endpoint
print_status "Testing application health..."
sleep 5
if curl -s http://localhost:3000/api/health > /dev/null; then
    print_success "Health check passed"
    echo ""
    echo "🎉 DocFlow initialization complete!"
    echo ""
    echo "Access your DocFlow application at:"
    echo "  http://localhost:3000"
    echo ""
    echo "Next steps:"
    echo "  1. Configure your PWA authentication endpoint"
    echo "  2. Set up Telegram notifications (optional)"
    echo "  3. Configure SSL certificate for production"
    echo "  4. Set up backup schedules"
else
    print_error "Health check failed"
    echo "Please check container logs:"
    echo "  docker logs docflow_app"
    exit 1
fi
```

### **Make script executable and run:**

```bash
# Make executable
chmod +x init-docflow.sh

# Run initialization
./init-docflow.sh
```

---

## 🔐 **Security Considerations**

### **Environment Variables**

- **Never commit `.env` files** to version control
- **Use strong passwords** for database and Redis
- **Generate secure secrets**: `openssl rand -base64 32`
- **Use HTTPS** in production with valid SSL certificates

### **Network Security**

```bash
# Create isolated network for production
docker network create docflow_network

# Run containers on isolated network
docker-compose up -d --network docflow_network
```

### **File Permissions**

```bash
# Set proper permissions for upload directories
mkdir -p uploads tmp
chmod 755 uploads tmp
chown -R 1001:1001 uploads tmp  # nextjs user in container
```

---

## 📊 **Monitoring and Health Checks**

### **Health Check Script**

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

# Container status
echo "2. Container Status:"
if docker ps | grep -q docflow_app; then
    echo "   ✓ Container: Running"
else
    echo "   ✗ Container: Not running"
fi

# Database connectivity
echo "3. Database Health:"
if docker exec docflow_db pg_isready -U postgres > /dev/null 2>&1; then
    echo "   ✓ Database: Connected"
else
    echo "   ✗ Database: Connection failed"
fi

# Redis connectivity (if using)
if docker ps | grep -q docflow_redis; then
    echo "4. Redis Health:"
    if docker exec docflow_redis redis-cli ping | grep -q "PONG"; then
        echo "   ✓ Redis: Connected"
    else
        echo "   ✗ Redis: Connection failed"
    fi
fi

echo "=========================="
```

---

## 🔄 **Updates and Maintenance**

### **Update to New Version**

```bash
# 1. Pull latest image
docker pull rutthawitc/docflow:latest

# 2. Stop current container
docker-compose down

# 3. Start with new image
docker-compose up -d

# 4. Run any necessary migrations
docker-compose exec app pnpm db:push

# Note: docflow:init should only be run once unless you want to reset data
```

### **Backup Database**

```bash
# Create backup
docker exec docflow_db pg_dump -U postgres docflow_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
docker exec -i docflow_db psql -U postgres -d docflow_db < backup_20250916_150000.sql
```

---

## 🚨 **Troubleshooting**

### **Common Issues**

#### **Database Connection Failed**

```bash
# Check database container
docker logs docflow_db

# Test connection manually
docker exec -it docflow_db psql -U postgres -d docflow_db
```

#### **Application Not Starting**

```bash
# Check application logs
docker logs docflow_app

# Common issues:
# - Missing environment variables
# - Database not ready
# - Port conflicts
```

#### **Health Check Failing**

```bash
# Check if port is accessible
curl -v http://localhost:3000/api/health

# Check container resource usage
docker stats docflow_app
```

### **Log Locations**

```bash
# Application logs
docker logs docflow_app

# Database logs
docker logs docflow_db

# Redis logs (if using)
docker logs docflow_redis

# System resource usage
docker stats --no-stream
```

---

## 📞 **Support**

For issues and support:

- **GitHub Issues**: Create issues in the DocFlow repository
- **Documentation**: Check `docs/` directory for additional guides
- **Production Support**: Ensure you have proper monitoring and backup procedures

---

_DocFlow Docker Deployment Guide - Updated: September 2025_
