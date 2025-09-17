# 🚀 Deploy DocFlow from GitHub Source

## Complete step-by-step guide for deploying DocFlow by cloning from GitHub

This guide covers deploying DocFlow directly from source code, including building the Docker image and setting up the complete production environment.

---

## 📋 **Prerequisites**

### **System Requirements:**
- Linux server (Ubuntu 20.04+ recommended)
- Docker and Docker Compose installed
- Git installed
- Minimum 4GB RAM, 2 CPU cores
- 50GB+ disk space

### **Install Dependencies:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Git
sudo apt install git -y

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

---

## 🎯 **Step-by-Step Deployment**

### **Step 1: Create Deployment Directory**
```bash
# Create deployment directory
sudo mkdir -p /opt/docflow
cd /opt/docflow

# Set ownership
sudo chown $USER:$USER /opt/docflow
```

### **Step 2: Clone Repository**
```bash
# Clone DocFlow repository
git clone https://github.com/YOUR_USERNAME/docflow.git .

# Or clone from your specific repository
git clone https://github.com/rutthawit/claude_DocFlow.git .

# Check cloned files
ls -la
```

### **Step 3: Build Docker Image**
```bash
# Build production Docker image
docker build -t docflow:local .

# Verify image was built
docker images | grep docflow
```

### **Step 4: Update Docker Compose Configuration**
```bash
# Edit docker-compose.yml to use local image
nano docker-compose.yml
```

**Update the app service image:**
```yaml
services:
  app:
    image: docflow:local  # Change from rutthawitc/docflow:latest
    container_name: docflow-app
    # ... rest of configuration stays the same
```

### **Step 5: Create Production Environment File**
```bash
# Create production environment file
nano .env
```

**Example `.env` configuration:**
```env
# Database Configuration
POSTGRES_PASSWORD=your_super_secure_db_password

# DocFlow Configuration
PWA_AUTH_URL=https://your-pwa-auth-endpoint.com/api/login
NEXTAUTH_SECRET=your_super_secure_secret_key_here
NEXTAUTH_URL=https://your-production-domain.com
AUTH_SECRET=your_super_secure_secret_key_here
AUTH_TRUST_HOST=true

# Redis Configuration
REDIS_PASSWORD=your_secure_redis_password

# Telegram Configuration (Optional)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_default_chat_id

# Session Configuration (Optional)
SESSION_ABSOLUTE_TIMEOUT_SECONDS=14400  # 4 hours
SESSION_IDLE_TIMEOUT_SECONDS=1800       # 30 minutes
SESSION_WARNING_TIME_SECONDS=300        # 5 minutes

# Document Upload Configuration (Optional)
NEXT_PUBLIC_MONTH_YEAR_FUTURE_YEARS=1
NEXT_PUBLIC_MONTH_YEAR_PAST_YEARS=1
```

### **Step 6: Generate Secure Secrets**
```bash
# Generate secure secrets
echo "NEXTAUTH_SECRET=$(openssl rand -base64 32)"
echo "POSTGRES_PASSWORD=$(openssl rand -base64 16)"
echo "REDIS_PASSWORD=$(openssl rand -base64 16)"

# Copy these values to your .env file
```

### **Step 7: Setup Nginx Configuration**
```bash
# Check if nginx directory exists
ls -la nginx/

# If nginx directory doesn't exist, create basic configuration
mkdir -p nginx/conf.d

# Create basic nginx configuration
cat > nginx/nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream docflow_app {
        server app:3000;
    }

    server {
        listen 80;
        server_name _;

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

### **Step 8: Set File Permissions**
```bash
# Set proper permissions
chmod 600 .env
chmod 644 docker-compose.yml
chmod -R 755 nginx/

# Create data directories
mkdir -p {uploads,tmp,backups,logs}
chmod 755 {uploads,tmp,backups,logs}
```

### **Step 9: Deploy DocFlow**
```bash
# Start all services
docker-compose up -d

# Check if all services are running
docker-compose ps
```

### **Step 10: Initialize Database** ⚠️ **REQUIRED**
```bash
# Wait for services to start (30 seconds)
sleep 30

# Push database schema
docker-compose exec app pnpm db:push

# Initialize DocFlow data (branches, roles, permissions)
docker-compose exec app pnpm docflow:init
```

### **Step 11: Verify Deployment**
```bash
# Check application health
curl http://localhost/api/health

# Check if login page is accessible
curl -I http://localhost/login

# Check container logs
docker-compose logs app

# Check all services status
docker-compose ps
```

---

## 🔧 **Alternative: Using Specific Branch or Tag**

### **Deploy Specific Version:**
```bash
# Clone specific branch
git clone -b main https://github.com/rutthawit/claude_DocFlow.git .

# Or checkout specific tag
git checkout v1.0.0

# Then follow the same build and deploy steps
docker build -t docflow:v1.0.0 .
```

### **Update docker-compose.yml for versioned image:**
```yaml
services:
  app:
    image: docflow:v1.0.0
    # ... rest of configuration
```

---

## 🔄 **Update and Maintenance**

### **Update to Latest Version:**
```bash
# Pull latest changes
git pull origin main

# Rebuild image
docker build -t docflow:latest .

# Update docker-compose.yml if needed
nano docker-compose.yml

# Restart services
docker-compose down
docker-compose up -d

# Run any necessary migrations
docker-compose exec app pnpm db:push
```

### **Backup Before Updates:**
```bash
# Backup database
docker-compose exec db pg_dump -U postgres docflow_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup uploads
tar -czf uploads_backup_$(date +%Y%m%d_%H%M%S).tar.gz uploads/
```

---

## 🛠️ **Development Build (Optional)**

### **For Development/Testing:**
```bash
# Build development image
docker build -f Dockerfile.dev -t docflow:dev .

# Or use development docker-compose
cp docker-compose.yml docker-compose.dev.yml
# Edit docker-compose.dev.yml for development settings

# Deploy development version
docker-compose -f docker-compose.dev.yml up -d
```

---

## 🔐 **Security Hardening**

### **Secure File Permissions:**
```bash
# Secure environment file
chmod 600 .env
chattr +i .env  # Make immutable (optional)

# Secure docker-compose
chmod 644 docker-compose.yml

# Secure directories
find /opt/docflow -type d -exec chmod 755 {} \;
find /opt/docflow -type f -exec chmod 644 {} \;
chmod +x scripts/*.sh
```

### **Firewall Configuration:**
```bash
# Configure UFW firewall
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw enable

# Block direct access to application port
sudo ufw deny 3000/tcp     # Block direct app access
```

### **SSL Certificate Setup:**
```bash
# Install Certbot for Let's Encrypt
sudo apt install certbot python3-certbot-nginx -y

# Generate SSL certificate
sudo certbot --nginx -d your-domain.com

# Verify auto-renewal
sudo certbot renew --dry-run
```

---

## 📊 **Monitoring and Health Checks**

### **Setup Monitoring Script:**
```bash
# Create monitoring script
cat > /opt/docflow/monitor.sh << 'EOF'
#!/bin/bash
echo "=== DocFlow Health Monitor ==="
echo "Time: $(date)"

# Check containers
echo "Container Status:"
docker-compose ps

# Check application health
echo "Application Health:"
if curl -s http://localhost/api/health | grep -q "healthy"; then
    echo "✓ Application: Healthy"
else
    echo "✗ Application: Unhealthy"
fi

# Check disk space
echo "Disk Usage:"
df -h /opt/docflow

# Check memory usage
echo "Memory Usage:"
free -h

echo "======================="
EOF

chmod +x /opt/docflow/monitor.sh
```

### **Setup Cron Job for Monitoring:**
```bash
# Add to crontab
crontab -e

# Add these lines:
# Health check every 5 minutes
*/5 * * * * /opt/docflow/monitor.sh >> /var/log/docflow-monitor.log 2>&1

# Daily backup at 2 AM
0 2 * * * cd /opt/docflow && docker-compose exec db pg_dump -U postgres docflow_db > backups/backup_$(date +\%Y\%m\%d).sql
```

---

## 🚨 **Troubleshooting**

### **Common Issues and Solutions:**

#### **Build Fails:**
```bash
# Clear Docker cache
docker builder prune -a

# Rebuild without cache
docker build --no-cache -t docflow:local .

# Check Docker daemon
sudo systemctl status docker
```

#### **Database Connection Issues:**
```bash
# Check database logs
docker-compose logs db

# Test database connection
docker-compose exec db psql -U postgres -d docflow_db -c "SELECT 1;"

# Reset database (CAUTION: loses data)
docker-compose down -v
docker-compose up -d
```

#### **Application Won't Start:**
```bash
# Check application logs
docker-compose logs app

# Check environment variables
docker-compose exec app env | grep -E "(DATABASE_URL|NEXTAUTH)"

# Restart specific service
docker-compose restart app
```

#### **Nginx Issues:**
```bash
# Check nginx logs
docker-compose logs nginx

# Test nginx configuration
docker-compose exec nginx nginx -t

# Reload nginx configuration
docker-compose exec nginx nginx -s reload
```

### **Log Locations:**
```bash
# Application logs
docker-compose logs app

# Database logs
docker-compose logs db

# Nginx logs
docker-compose logs nginx

# System logs
sudo journalctl -u docker
```

---

## 📋 **Complete Deployment Checklist**

### **Pre-Deployment:**
- [ ] Server meets minimum requirements
- [ ] Docker and Docker Compose installed
- [ ] Git installed and configured
- [ ] Firewall configured
- [ ] Domain name configured (for production)

### **Deployment:**
- [ ] Repository cloned to `/opt/docflow`
- [ ] Docker image built successfully
- [ ] Environment file created and secured
- [ ] Nginx configuration set up
- [ ] Services deployed with `docker-compose up -d`
- [ ] Database schema initialized with `pnpm db:push`
- [ ] DocFlow data initialized with `pnpm docflow:init`

### **Post-Deployment:**
- [ ] Health check endpoint responding
- [ ] Login page accessible
- [ ] File upload functionality tested
- [ ] SSL certificate installed (production)
- [ ] Monitoring scripts configured
- [ ] Backup procedures set up
- [ ] Documentation updated

---

## 📞 **Support and Next Steps**

### **Additional Configuration:**
- **SSL/HTTPS Setup**: Follow SSL certificate installation guide
- **Domain Configuration**: Point your domain to the server IP
- **Backup Strategy**: Implement automated backup procedures
- **Monitoring**: Set up application monitoring and alerting

### **Performance Optimization:**
- **Resource Limits**: Configure Docker resource limits
- **Caching**: Enable Redis caching for better performance
- **Database Tuning**: Optimize PostgreSQL configuration
- **Load Balancing**: Set up load balancing for high availability

### **Support Resources:**
- **GitHub Issues**: Report issues in the DocFlow repository
- **Documentation**: Check `docs/` directory for additional guides
- **Community**: Join DocFlow community discussions

---

*Deploy from Source Guide - Updated: September 2025*