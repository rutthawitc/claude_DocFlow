# 🐳 DocFlow Docker Hub Deployment

## Quick deployment guide using pre-built Docker images from Docker Hub

This is the fastest way to deploy DocFlow using pre-built images. Perfect for production deployments without needing to build from source.

---

## 🚀 **Quick Start (5 Minutes)**

### **Step 1: Create Deployment Directory**
```bash
# Create deployment directory (recommended: /opt/docflow)
sudo mkdir -p /opt/docflow
cd /opt/docflow
sudo chown $USER:$USER /opt/docflow
```

### **Step 2: Create Docker Compose Configuration**
```bash
# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: "3.8"

services:
  app:
    image: rutthawitc/docflow:latest
    container_name: docflow-app
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
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_PASSWORD=${REDIS_PASSWORD}
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
    container_name: docflow-db
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
    container_name: docflow-redis
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
EOF
```

### **Step 3: Create Environment Configuration**
```bash
# Create .env file
cat > .env << 'EOF'
# Database Configuration
POSTGRES_PASSWORD=your_secure_db_password

# DocFlow Configuration
PWA_AUTH_URL=https://your-pwa-auth-endpoint.com/api/login
NEXTAUTH_SECRET=your_super_secure_secret_key_here
NEXTAUTH_URL=https://your-production-domain.com

# Redis Configuration
REDIS_PASSWORD=your_secure_redis_password

# Optional: Telegram Notifications
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_default_chat_id

# Optional: Session Configuration
SESSION_ABSOLUTE_TIMEOUT_SECONDS=14400  # 4 hours
SESSION_IDLE_TIMEOUT_SECONDS=1800       # 30 minutes
SESSION_WARNING_TIME_SECONDS=300        # 5 minutes
EOF

# Secure the environment file
chmod 600 .env
```

### **Step 4: Generate Secure Secrets**
```bash
# Generate secure passwords and secrets
echo "Generated secrets (copy to your .env file):"
echo "POSTGRES_PASSWORD=$(openssl rand -base64 16)"
echo "NEXTAUTH_SECRET=$(openssl rand -base64 32)"
echo "REDIS_PASSWORD=$(openssl rand -base64 16)"
```

### **Step 5: Deploy DocFlow**
```bash
# Create data directories
mkdir -p {uploads,tmp,backups}

# Start all services
docker-compose up -d

# Wait for services to start
sleep 30

# Check if all services are running
docker-compose ps
```

### **Step 6: Initialize Database** ⚠️ **REQUIRED**

**Method 1: Using SQL Script (Recommended)**
```bash
# Initialize complete database with SQL script (bypasses pnpm issues)
docker-compose exec -T db psql -U postgres -d docflow_db < scripts/init-docflow-complete.sql
```

**Method 2: Using pnpm Commands (Alternative)**
```bash
# Push database schema (creates all tables)
docker-compose exec app pnpm db:push

# Initialize DocFlow data (branches, roles, permissions)
docker-compose exec app pnpm docflow:init
```

**Note**: If you encounter `pnpm: executable file not found` error, use Method 1 with the SQL script.

### **Step 7: Verify Deployment**
```bash
# Check if all tables were created (should show 13 tables)
docker-compose exec db psql -U postgres -d docflow_db -c "\dt"

# Check if R6 branches were inserted (should show 22 branches)
docker-compose exec db psql -U postgres -d docflow_db -c "SELECT COUNT(*) FROM branches;"

# Check if roles were created (should show 6 roles)
docker-compose exec db psql -U postgres -d docflow_db -c "SELECT name FROM roles ORDER BY name;"

# Check application health
curl http://localhost:3000/api/health

# Check login page
curl -I http://localhost:3000/login

# Expected: HTTP 200 responses and proper data counts
```

### **Step 8: Create Local Admin User (Optional)**
```bash
# Create local admin for testing (if PWA auth is not working)
docker-compose exec db psql -U postgres -d docflow_db -c "
INSERT INTO users (username, first_name, last_name, email, password, is_local_admin) 
VALUES ('admin', 'Admin', 'User', 'admin@docflow.local', '\$2a\$12\$LQv3c1yqBwEHXVqpsrjONOKOQSFdqK/LWz4o4kWGgKzJhF/0NU5G2', true)
ON CONFLICT (username) DO NOTHING;
"

# Assign admin role
docker-compose exec db psql -U postgres -d docflow_db -c "
INSERT INTO user_roles (user_id, role_id) 
SELECT u.id, r.id FROM users u, roles r 
WHERE u.username = 'admin' AND r.name = 'admin'
ON CONFLICT (user_id, role_id) DO NOTHING;
"
```

**Login credentials**: `admin` / `password`

🎉 **Your DocFlow is now running at `http://localhost:3000`**

---

## 🔧 **Production Setup with Nginx**

### **Add Nginx Reverse Proxy:**
```bash
# Add nginx service to docker-compose.yml
cat >> docker-compose.yml << 'EOF'

  nginx:
    image: nginx:alpine
    container_name: docflow-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/ssl/certs:ro
    depends_on:
      - app
    restart: unless-stopped
EOF
```

### **Create Nginx Configuration:**
```bash
# Create nginx.conf
cat > nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream docflow_app {
        server app:3000;
    }

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS Configuration
    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        # SSL Configuration (update paths as needed)
        ssl_certificate /etc/ssl/certs/your-cert.pem;
        ssl_certificate_key /etc/ssl/certs/your-key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;

        # Security Headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;

        # File upload size limit
        client_max_body_size 50M;

        location / {
            proxy_pass http://docflow_app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /api/health {
            proxy_pass http://docflow_app;
            access_log off;
        }
    }
}
EOF
```

---

## ⚡ **Automated Deployment Script**

### **Create One-Click Deployment Script:**
```bash
# Create deploy.sh
cat > deploy.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 DocFlow Automated Deployment"
echo "==============================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

print_status "Creating deployment directory..."
sudo mkdir -p /opt/docflow
cd /opt/docflow
sudo chown $USER:$USER /opt/docflow

print_status "Downloading configuration files..."
# Download docker-compose.yml and .env template from this script
# (Files are embedded above)

print_status "Generating secure secrets..."
POSTGRES_PASSWORD=$(openssl rand -base64 16)
NEXTAUTH_SECRET=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 16)

print_status "Please configure your .env file with the following generated secrets:"
echo "POSTGRES_PASSWORD=$POSTGRES_PASSWORD"
echo "NEXTAUTH_SECRET=$NEXTAUTH_SECRET"
echo "REDIS_PASSWORD=$REDIS_PASSWORD"
echo ""
echo "Update PWA_AUTH_URL and NEXTAUTH_URL in .env file before continuing."
read -p "Press Enter after updating .env file..."

print_status "Creating data directories..."
mkdir -p {uploads,tmp,backups}

print_status "Starting DocFlow services..."
docker-compose up -d

print_status "Waiting for services to start..."
sleep 30

print_status "Initializing database..."
docker-compose exec app pnpm db:push

print_status "Initializing DocFlow data..."
docker-compose exec app pnpm docflow:init

print_status "Testing deployment..."
if curl -s http://localhost:3000/api/health > /dev/null; then
    print_success "DocFlow deployed successfully!"
    echo ""
    echo "🎉 Access your DocFlow at: http://localhost:3000"
    echo "📚 Check logs with: docker-compose logs -f"
    echo "🔧 Manage with: docker-compose [up|down|restart]"
else
    print_error "Deployment test failed. Check logs with: docker-compose logs"
    exit 1
fi
EOF

# Make executable
chmod +x deploy.sh
```

### **Run Automated Deployment:**
```bash
# Run the deployment script
./deploy.sh
```

---

## 🔄 **Image Update Workflow**

### **For Development (Build & Push)**

```bash
# Navigate to project directory
cd /path/to/claude_DocFlow

# Build new image with version tag
docker build -t rutthawitc/docflow:v1.0.1 -f Dockerfile.prod.simple .
docker tag rutthawitc/docflow:v1.0.1 rutthawitc/docflow:latest

# Push to Docker Hub
docker push rutthawitc/docflow:v1.0.1
docker push rutthawitc/docflow:latest
```

### **For Production (Pull & Update)**

#### **Method 1: Zero-Downtime Rolling Update (Recommended)**
```bash
cd /opt/docflow

# Pull latest image
docker-compose pull app

# Update with zero downtime
docker-compose up -d --no-deps app

# Verify deployment
docker-compose ps
curl http://localhost:3004/api/health
```

#### **Method 2: Complete Service Restart**
```bash
cd /opt/docflow

# Stop services
docker-compose down

# Pull latest images
docker-compose pull

# Start services with new images
docker-compose up -d

# Verify deployment
docker-compose ps
```

### **Automated Update Script**

Use the provided automated script for streamlined updates:

```bash
# On development machine (build and push)
./scripts/deploy-update.sh v1.0.1 build

# On production machine (update deployment)
./scripts/deploy-update.sh v1.0.1 production

# Update to latest image
./scripts/deploy-update.sh latest production
```

### **Version Tagging Best Practices**

```bash
# Semantic versioning
docker tag rutthawitc/docflow:latest rutthawitc/docflow:v1.0.1
docker tag rutthawitc/docflow:latest rutthawitc/docflow:v1.0
docker tag rutthawitc/docflow:latest rutthawitc/docflow:v1

# Feature-based tagging
docker tag rutthawitc/docflow:latest rutthawitc/docflow:fix-status-update
docker tag rutthawitc/docflow:latest rutthawitc/docflow:2025-09-17

# Environment-specific tagging
docker tag rutthawitc/docflow:latest rutthawitc/docflow:production-stable
docker tag rutthawitc/docflow:latest rutthawitc/docflow:staging
```

---

## 🔄 **Management Commands**

### **Daily Operations:**
```bash
# Check status
docker-compose ps

# View logs
docker-compose logs -f app

# Restart services
docker-compose restart

# Stop services
docker-compose down

# Update to latest version
docker-compose pull
docker-compose up -d
```

### **Backup and Restore:**
```bash
# Create backup
docker-compose exec db pg_dump -U postgres docflow_db > backups/backup_$(date +%Y%m%d_%H%M%S).sql
tar -czf backups/uploads_$(date +%Y%m%d_%H%M%S).tar.gz uploads/

# Restore from backup
docker-compose exec -T db psql -U postgres -d docflow_db < backups/backup_20250916_120000.sql
```

### **Health Monitoring:**
```bash
# Check application health
curl http://localhost:3000/api/health | jq '.'

# Monitor resource usage
docker stats --no-stream

# Check container health
docker-compose ps
```

---

## 🔐 **Security Best Practices**

### **Environment Security:**
```bash
# Secure environment file
chmod 600 .env
chattr +i .env  # Make immutable

# Regular security updates
docker-compose pull  # Update images
sudo apt update && sudo apt upgrade -y  # Update system
```

### **Firewall Configuration:**
```bash
# Configure UFW firewall
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw deny 3000/tcp     # Block direct access to app
sudo ufw enable
```

### **SSL Certificate (Let's Encrypt):**
```bash
# Install Certbot
sudo apt install certbot -y

# Generate certificate
sudo certbot certonly --standalone -d your-domain.com

# Update nginx.conf with certificate paths
# Then restart nginx: docker-compose restart nginx
```

---

## 🚨 **Troubleshooting**

### **Common Issues & Solutions:**

#### **🔥 Issue 1: PostgreSQL Port Conflict (Port 5432 in use)**
**Error**: `bind: address already in use`
```bash
# Solution 1: Stop local PostgreSQL (if running)
sudo systemctl stop postgresql
sudo systemctl disable postgresql

# Solution 2: Use different port mapping
# Edit docker-compose.yml and change:
# ports: - "5433:5432"  # Use 5433 instead of 5432

# Solution 3: Remove external port (Production Recommended)
# Comment out or remove the ports section for db service
```

#### **🔥 Issue 2: Docker Image Not Found**
**Error**: `rutthawitc/docflow:latest: not found`
```bash
# Solution: Use specific version tag
# Edit docker-compose.yml and change:
# image: rutthawitc/docflow:v1.0.0  # Use specific version

# Or build locally:
# image: docflow:local
# Then run: docker build -t docflow:local .
```

#### **🔥 Issue 3: pnpm Command Not Found in Container**
**Error**: `exec: "pnpm": executable file not found`
```bash
# Solution: Use SQL initialization script instead
docker-compose exec -T db psql -U postgres -d docflow_db < scripts/init-docflow-complete.sql

# Alternative: Enable pnpm in container
docker-compose exec app corepack enable
docker-compose exec app corepack prepare pnpm@latest --activate
```

#### **🔥 Issue 4: PWA Authentication JSON Parse Error**
**Error**: `PWA API returned invalid JSON, falling back to local admin`
```bash
# Solution 1: Check PWA_AUTH_URL for typos
docker-compose exec app env | grep PWA_AUTH_URL

# Solution 2: Create local admin user for testing
docker-compose exec db psql -U postgres -d docflow_db -c "
INSERT INTO users (username, first_name, last_name, email, password, is_local_admin) 
VALUES ('admin', 'Admin', 'User', 'admin@docflow.local', '\$2a\$12\$LQv3c1yqBwEHXVqpsrjONOKOQSFdqK/LWz4o4kWGgKzJhF/0NU5G2', true);
"

# Assign admin role
docker-compose exec db psql -U postgres -d docflow_db -c "
INSERT INTO user_roles (user_id, role_id) 
SELECT u.id, r.id FROM users u, roles r 
WHERE u.username = 'admin' AND r.name = 'admin';
"

# Login: admin/password
```

#### **🔥 Issue 5: Container Shows Unhealthy Status**
**Error**: Container status shows "unhealthy"
```bash
# Solution 1: Check health check logs
docker inspect docflow-app | grep -A 10 "Health"

# Solution 2: Restart container
docker-compose restart app

# Solution 3: Check if health endpoint is responding
curl http://localhost:3004/api/health
```

#### **🔥 Issue 6: Services Won't Start**
```bash
# Check logs
docker-compose logs

# Check available ports
sudo netstat -tulpn | grep :3000
sudo netstat -tulpn | grep :5432

# Free up ports if needed
sudo systemctl stop postgresql  # If PostgreSQL is running locally
```

#### **🔥 Issue 7: Database Connection Failed**
```bash
# Check database logs
docker-compose logs db

# Test database connection
docker-compose exec db psql -U postgres -d docflow_db -c "SELECT 1;"

# Reset database (CAUTION: loses all data)
docker-compose down -v
docker-compose up -d
sleep 30
# Use SQL script to reinitialize
docker-compose exec -T db psql -U postgres -d docflow_db < scripts/init-docflow-complete.sql
```

#### **🔥 Issue 8: Image Pull Failed**
```bash
# Check Docker Hub connectivity
docker pull rutthawitc/docflow:latest

# Try alternative image registry
# Update docker-compose.yml to use different image source
```

#### **🔥 Issue 9: Environment Variable Issues**
```bash
# Check environment variables
docker-compose exec app env | grep -E "(DATABASE_URL|PWA_AUTH_URL|NEXTAUTH)"

# Verify .env file is properly loaded
cat .env

# Restart services after .env changes
docker-compose restart app
```

### **Quick Diagnostic Commands:**
```bash
# Check all container status
docker-compose ps

# Check application logs
docker-compose logs -f app

# Check database status
docker-compose exec db psql -U postgres -d docflow_db -c "\dt"

# Test application health
curl http://localhost:3004/api/health

# Check if database has data
docker-compose exec db psql -U postgres -d docflow_db -c "SELECT COUNT(*) FROM branches;"
```

---

## 📊 **Monitoring Setup**

### **Simple Health Check Script:**
```bash
# Create health-check.sh
cat > health-check.sh << 'EOF'
#!/bin/bash
echo "=== DocFlow Health Check $(date) ==="

# Check containers
echo "Containers:"
docker-compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

# Check application health
echo -e "\nApplication Health:"
if curl -s http://localhost:3000/api/health | grep -q "healthy"; then
    echo "✓ Application: Healthy"
else
    echo "✗ Application: Unhealthy"
fi

# Check disk space
echo -e "\nDisk Usage:"
df -h /opt/docflow

echo "=================================="
EOF

chmod +x health-check.sh
```

### **Setup Automated Monitoring:**
```bash
# Add to crontab
crontab -e

# Add this line for health checks every 5 minutes:
*/5 * * * * /opt/docflow/health-check.sh >> /var/log/docflow-health.log 2>&1

# Add this line for daily backups at 2 AM:
0 2 * * * cd /opt/docflow && docker-compose exec db pg_dump -U postgres docflow_db > backups/daily_backup_$(date +\%Y\%m\%d).sql
```

---

## 📋 **Production Deployment Checklist**

### **Pre-Deployment:**
- [ ] Server meets minimum requirements (4GB RAM, 2 CPU cores, 50GB disk)
- [ ] Docker and Docker Compose installed and working
- [ ] Domain name configured and pointing to server (for production)
- [ ] Firewall configured properly
- [ ] SSL certificates obtained (for HTTPS)
- [ ] PostgreSQL port 5432 not in use (or use alternative port)

### **Deployment:**
- [ ] Deployment directory created at `/opt/docflow`
- [ ] `docker-compose.yml` configured with correct image version
- [ ] `.env` file created with secure passwords (no typos in PWA_AUTH_URL)
- [ ] Services started with `docker-compose up -d`
- [ ] **Database initialized with SQL script**: `docker-compose exec -T db psql -U postgres -d docflow_db < scripts/init-docflow-complete.sql`
- [ ] **Alternative**: Database initialized with pnpm commands (if available)

### **Post-Deployment Verification:**
- [ ] **13 tables created**: `docker-compose exec db psql -U postgres -d docflow_db -c "\dt"`
- [ ] **22 R6 branches inserted**: `docker-compose exec db psql -U postgres -d docflow_db -c "SELECT COUNT(*) FROM branches;"`
- [ ] **6 roles created**: `docker-compose exec db psql -U postgres -d docflow_db -c "SELECT name FROM roles ORDER BY name;"`
- [ ] Health check endpoint responding: `curl http://localhost:3000/api/health`
- [ ] Login page accessible: `curl http://localhost:3000/login`
- [ ] Local admin user created (if PWA auth fails): `admin`/`password`
- [ ] PWA authentication working (fix typos in PWA_AUTH_URL if needed)
- [ ] File upload functionality tested
- [ ] Document workflow tested (upload → status changes)
- [ ] Nginx reverse proxy configured (if using)
- [ ] SSL/HTTPS working (for production)
- [ ] Backup procedures configured
- [ ] Monitoring scripts set up

### **Production Verification:**
- [ ] Application accessible from internet (if public)
- [ ] All environment variables properly set (no typos)
- [ ] Database connections working
- [ ] Redis caching functional: check logs for "✅ Redis connected successfully"
- [ ] File uploads working correctly
- [ ] Role-based permissions working (test different user roles)
- [ ] Additional documents feature working
- [ ] Comment system functional
- [ ] Telegram notifications working (if configured)
- [ ] Performance acceptable under load
- [ ] Security headers present
- [ ] Logs being generated and accessible
- [ ] Container health checks passing (not showing "unhealthy")

---

## 🎯 **Next Steps**

### **For Basic Usage:**
Your DocFlow is ready! Access it at `http://localhost:3000` and start uploading documents.

### **For Production:**
1. **Setup Domain**: Configure your domain to point to the server
2. **Enable HTTPS**: Install SSL certificates for secure access
3. **Configure Monitoring**: Set up comprehensive monitoring and alerting
4. **Setup Backups**: Implement automated backup procedures
5. **Performance Tuning**: Optimize for your expected load

### **For High Availability:**
Consider setting up:
- Load balancing with multiple app instances
- Database replication for redundancy
- Redis clustering for cache reliability
- Container orchestration with Kubernetes

---

*DocFlow Docker Hub Deployment Guide - Updated: September 2025*