# DocFlow AWS EC2 Deployment Guide

Complete production deployment guide for DocFlow Next.js PWA on AWS EC2 c7i-flex.large instance.

## 🚀 Overview

**Instance Details:**
- **Instance ID:** i-0c719a82783b5ca43
- **Instance Type:** c7i-flex.large (2 vCPU, 8GB RAM)
- **Public IP:** 43.208.239.166
- **Public DNS:** ec2-43-208-239-166.ap-southeast-7.compute.amazonaws.com
- **Region:** ap-southeast-7 (Asia Pacific - Jakarta)

## 📋 Prerequisites

1. **AWS Account** with EC2 access
2. **GitHub repository** with DocFlow source code
3. **Domain/SSL requirements** for HTTPS access
4. **SSH key pair** for EC2 access

## 🔧 Step 1: Server Setup

### 1.1 Connect to EC2 Instance

```bash
# Connect via SSH (replace with your key file)
ssh -i your-key.pem ubuntu@43.208.239.166
```

### 1.2 Run Server Setup Script

```bash
# Download and run the setup script
curl -sSL https://raw.githubusercontent.com/your-repo/claude_DocFlow/main/scripts/server-setup.sh -o setup.sh
chmod +x setup.sh
./setup.sh
```

**What this script does:**
- Updates system packages
- Installs Docker and Docker Compose
- Configures UFW firewall
- Sets up Fail2ban security
- Installs Let's Encrypt Certbot
- Creates application directories
- Configures system limits

### 1.3 Configure Security Groups

Ensure your EC2 security group allows:
- **SSH (22):** Your IP address only
- **HTTP (80):** 0.0.0.0/0 (for SSL certificate validation)
- **HTTPS (443):** 0.0.0.0/0 (for public access)

## 🔐 Step 2: SSL Certificate Setup

### 2.1 Install SSL Certificate

```bash
# Install SSL certificate for your domain
sudo certbot --nginx -d ec2-43-208-239-166.ap-southeast-7.compute.amazonaws.com

# Set up automatic renewal (already configured by setup script)
sudo crontab -l | grep certbot
```

## 📁 Step 3: Application Deployment

### 3.1 Clone Repository

```bash
# Navigate to application directory
cd /opt/docflow

# Clone your repository
git clone https://github.com/your-username/claude_DocFlow.git .

# Or if already cloned, update
git pull origin main
```

### 3.2 Configure Environment Variables

```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

**Required Environment Variables:**

```env
# Database Configuration
DB_PASSWORD=your_secure_db_password_here
DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@postgres:5432/pwausers_db

# Authentication
PWA_AUTH_URL=https://your-pwa-auth-endpoint.com/api/login
AUTH_SECRET=your_secure_secret_key_here
NEXTAUTH_URL=https://ec2-43-208-239-166.ap-southeast-7.compute.amazonaws.com
AUTH_TRUST_HOST=true

# Telegram Integration (Optional)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_CHAT_ID=your_default_chat_id_here

# Redis Configuration (Optional)
REDIS_PASSWORD=your_redis_password_here
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_DB=0
REDIS_KEY_PREFIX=docflow:

# Monitoring (Optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your/webhook/url

# Backup (Optional)
S3_BACKUP_BUCKET=your-backup-bucket-name
```

### 3.3 Deploy Application

```bash
# Start all services
docker-compose -f docker-compose.production.yml up -d

# Check service status
docker-compose -f docker-compose.production.yml ps

# View logs
docker-compose -f docker-compose.production.yml logs -f app
```

### 3.4 Initialize Database

```bash
# Initialize DocFlow data (branches, roles, permissions)
docker-compose -f docker-compose.production.yml exec app pnpm docflow:init
```

## 🔄 Step 4: GitHub Actions CI/CD Setup

### 4.1 Configure GitHub Secrets

Add these secrets to your GitHub repository:

```
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
EC2_SSH_PRIVATE_KEY=your_ec2_private_key_content
TELEGRAM_BOT_TOKEN=your_telegram_token (optional)
TELEGRAM_CHAT_ID=your_chat_id (optional)
SLACK_WEBHOOK_URL=your_slack_webhook (optional)
```

### 4.2 Enable GitHub Actions

The deployment workflow (`.github/workflows/deploy.yml`) will automatically:
- Run tests and security scans
- Build Docker image
- Deploy to EC2
- Run health checks
- Send notifications

### 4.3 Manual Deployment Trigger

```bash
# Push to main branch to trigger deployment
git push origin main

# Or trigger manually from GitHub Actions tab
```

## 📊 Step 5: Monitoring and Backup

### 5.1 Set Up Monitoring

```bash
# Start monitoring service
docker-compose -f docker-compose.production.yml up -d monitoring

# Check monitoring status
docker-compose -f docker-compose.production.yml logs monitoring

# Manual health check
/opt/docflow/scripts/monitor.sh --check
```

### 5.2 Configure Backups

```bash
# Test backup script
/opt/docflow/scripts/backup.sh

# Set up automated backups (daily at 2 AM)
echo "0 2 * * * /opt/docflow/scripts/backup.sh" | crontab -

# Verify cron job
crontab -l
```

### 5.3 Monitor System Resources

```bash
# System resources
htop

# Docker resources
docker stats

# Application logs
docker-compose -f docker-compose.production.yml logs app

# Nginx access logs
docker-compose -f docker-compose.production.yml exec nginx tail -f /var/log/nginx/access.log
```

## 🚨 Step 6: Health Checks and Troubleshooting

### 6.1 Health Check Endpoints

```bash
# Application health
curl https://ec2-43-209-177-163.ap-southeast-7.compute.amazonaws.com/health

# Nginx health
curl http://localhost/health

# Database health
docker-compose -f docker-compose.production.yml exec postgres pg_isready -U postgres
```

### 6.2 Common Issues

**Container won't start:**
```bash
# Check logs
docker-compose -f docker-compose.production.yml logs [service-name]

# Check resources
docker system df
free -h
```

**SSL certificate issues:**
```bash
# Renew certificate
sudo certbot renew --dry-run

# Check certificate status
sudo certbot certificates
```

**Database connection issues:**
```bash
# Check database logs
docker-compose -f docker-compose.production.yml logs postgres

# Connect to database
docker-compose -f docker-compose.production.yml exec postgres psql -U postgres -d pwausers_db
```

## 🔧 Step 7: Performance Optimization

### 7.1 Resource Optimization for c7i-flex.large

The docker-compose file is pre-configured for optimal resource allocation:
- **App:** 4GB memory limit, 1 CPU
- **PostgreSQL:** 2GB memory limit, 0.5 CPU
- **Redis:** 512MB memory limit, 0.25 CPU
- **Nginx:** 512MB memory limit, 0.25 CPU

### 7.2 Enable Caching

```bash
# Redis is automatically configured for caching
# Check Redis status
docker-compose -f docker-compose.production.yml exec redis redis-cli ping
```

## 🔒 Step 8: Security Hardening

### 8.1 Firewall Status

```bash
# Check UFW status
sudo ufw status verbose

# Check fail2ban status
sudo systemctl status fail2ban
sudo fail2ban-client status
```

### 8.2 SSL Configuration

The Nginx configuration includes:
- TLS 1.2 and 1.3 only
- Strong cipher suites
- HSTS headers
- Security headers (CSRF, XSS protection)

### 8.3 Container Security

- Non-root user execution
- Resource limits
- Health checks
- Security scanning in CI/CD

## 💰 Step 9: Cost Monitoring

### 9.1 Expected Costs (ap-southeast-7)

- **c7i-flex.large:** ~$0.10-0.15/hour (~$72-108/month)
- **EBS Storage (30GB):** ~$3-4/month
- **Data Transfer:** Variable based on usage

### 9.2 Cost Optimization

- Use Reserved Instances for production (save 30-60%)
- Monitor with AWS Cost Explorer
- Set up billing alerts

## 📚 Additional Commands

### Useful Docker Commands

```bash
# Update application
docker-compose -f docker-compose.production.yml pull app
docker-compose -f docker-compose.production.yml up -d app

# Scale services (if needed)
docker-compose -f docker-compose.production.yml up -d --scale app=2

# View resource usage
docker-compose -f docker-compose.production.yml top

# Clean up unused resources
docker system prune -f
```

### Backup and Restore

```bash
# Manual backup
/opt/docflow/scripts/backup.sh

# Restore database from backup
docker-compose -f docker-compose.production.yml exec postgres psql -U postgres -d pwausers_db < backup.sql

# Restore files
docker-compose -f docker-compose.production.yml exec app tar -xzf /backups/files_backup.tar.gz -C /app/
```

## 🆘 Emergency Procedures

### Application Recovery

```bash
# Stop all services
docker-compose -f docker-compose.production.yml down

# Start services one by one
docker-compose -f docker-compose.production.yml up -d postgres
docker-compose -f docker-compose.production.yml up -d redis
docker-compose -f docker-compose.production.yml up -d app
docker-compose -f docker-compose.production.yml up -d nginx
```

### Database Recovery

```bash
# If database is corrupted, restore from backup
docker-compose -f docker-compose.production.yml down postgres
docker volume rm docflow_postgres_data
docker-compose -f docker-compose.production.yml up -d postgres
# Wait for initialization, then restore from backup
```

## 📞 Support

For issues related to:
- **Infrastructure:** Check CloudWatch logs and EC2 console
- **Application:** Check container logs and health endpoints
- **Deployment:** Check GitHub Actions logs
- **Database:** Check PostgreSQL logs and connection status

## 🎯 Success Checklist

- [ ] Server setup completed successfully
- [ ] SSL certificate installed and valid
- [ ] All containers running and healthy
- [ ] Application accessible via HTTPS
- [ ] Database initialized with DocFlow data
- [ ] CI/CD pipeline working
- [ ] Monitoring service active
- [ ] Backup system configured
- [ ] Security measures in place
- [ ] Performance optimized for c7i-flex.large

Your DocFlow application should now be fully deployed and production-ready! 🚀