# DocFlow Production Deployment Guide

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [AWS Infrastructure Setup](#aws-infrastructure-setup)
4. [Application Deployment](#application-deployment)
5. [CI/CD Pipeline Configuration](#cicd-pipeline-configuration)
6. [SSL/TLS Configuration](#ssltls-configuration)
7. [Monitoring and Alerting](#monitoring-and-alerting)
8. [Backup and Recovery](#backup-and-recovery)
9. [Security Best Practices](#security-best-practices)
10. [Troubleshooting](#troubleshooting)
11. [Cost Optimization](#cost-optimization)

## Architecture Overview

DocFlow is deployed as a containerized application on AWS EC2 with the following components:

```
┌─────────────────────────────────────────────────────────┐
│                     Internet                             │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│           Application Load Balancer (ALB)               │
│              - SSL Termination                          │
│              - Health Checks                            │
│              - Auto Scaling Integration                 │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│               Auto Scaling Group                        │
│         ┌─────────────────┬─────────────────┐          │
│         │   EC2 Instance  │   EC2 Instance  │          │
│         │                 │    (Optional)   │          │
│         └─────────────────┴─────────────────┘          │
└─────────────────────────────────────────────────────────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
┌───▼───┐    ┌────▼────┐   ┌────▼────┐
│  RDS  │    │ElastiCache│  │   S3    │
│PostgreSQL│  │  Redis    │  │ Storage │
└───────┘    └─────────┘   └─────────┘
```

### Application Stack

- **Frontend**: Next.js 15 PWA with React 19
- **Backend**: Node.js API routes with TypeScript
- **Database**: PostgreSQL 17.5 (RDS or self-hosted)
- **Cache**: Redis 7.4 (ElastiCache or self-hosted)
- **Web Server**: Nginx (reverse proxy)
- **Container Runtime**: Docker with Docker Compose
- **File Storage**: Local storage or AWS S3

## Prerequisites

### Local Development Machine

```bash
# Required tools
- AWS CLI v2
- Docker & Docker Compose
- Git
- Node.js 20+ (for local development)
- pnpm 10.14.0+

# Install AWS CLI
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /

# Install Docker Desktop
# Download from https://www.docker.com/products/docker-desktop

# Configure AWS credentials
aws configure
```

### AWS Account Setup

```bash
# Create IAM user with necessary permissions:
- AmazonEC2FullAccess
- AmazonRDSFullAccess
- AmazonElastiCacheFullAccess
- AmazonS3FullAccess
- AmazonVPCFullAccess
- CloudWatchFullAccess
- IAMFullAccess (for creating roles)

# Create EC2 Key Pair
aws ec2 create-key-pair \
  --key-name docflow-production \
  --query 'KeyMaterial' \
  --output text > ~/.ssh/docflow-production.pem

chmod 600 ~/.ssh/docflow-production.pem
```

### Domain and SSL

```bash
# Domain requirements:
- Registered domain name (e.g., docflow.yourdomain.com)
- DNS access to configure A records
- Optional: AWS Certificate Manager for SSL
```

## AWS Infrastructure Setup

### Option 1: Automated Setup (Recommended)

```bash
# Clone the repository
git clone https://github.com/your-username/docflow.git
cd docflow

# Run the automated deployment script
./aws/deploy.sh
```

The script will:
1. Validate prerequisites
2. Deploy CloudFormation infrastructure
3. Configure Auto Scaling Group
4. Set up Load Balancer and health checks
5. Create RDS database and ElastiCache
6. Configure security groups and networking

### Option 2: Manual Setup

```bash
# Deploy infrastructure stack
aws cloudformation deploy \
  --template-file aws/cloudformation/docflow-infrastructure.yaml \
  --stack-name docflow-infrastructure-production \
  --parameter-overrides \
    Environment=production \
    InstanceType=t3.medium \
    KeyPairName=docflow-production \
    DatabasePassword=YourSecurePassword123! \
    DomainName=docflow.yourdomain.com \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1

# Deploy monitoring stack
aws cloudformation deploy \
  --template-file aws/cloudformation/monitoring.yaml \
  --stack-name docflow-monitoring-production \
  --parameter-overrides \
    Environment=production \
    LoadBalancerFullName="$(aws elbv2 describe-load-balancers \
      --names production-docflow-alb \
      --query 'LoadBalancers[0].LoadBalancerArn' \
      --output text | cut -d'/' -f2-)" \
    EmailAddress=alerts@yourdomain.com \
  --region us-east-1
```

### Infrastructure Components

#### VPC and Networking
- **VPC**: 10.0.0.0/16 CIDR block
- **Public Subnets**: 10.0.1.0/24, 10.0.2.0/24 (Multi-AZ)
- **Private Subnets**: 10.0.3.0/24, 10.0.4.0/24 (Database/Cache)
- **Internet Gateway**: Public internet access
- **Security Groups**: Layered security model

#### Compute Resources
- **Auto Scaling Group**: 1-3 instances based on demand
- **Launch Template**: Standardized EC2 configuration
- **Instance Type**: t3.medium (production), t3.small (development)
- **AMI**: Amazon Linux 2023

#### Database and Cache
- **RDS PostgreSQL**: 15.4 engine, Multi-AZ (production)
- **ElastiCache Redis**: Single node cluster
- **Backup**: 7-day retention (production)
- **Encryption**: At rest and in transit

## Application Deployment

### Manual Deployment

```bash
# Connect to EC2 instance
ssh -i ~/.ssh/docflow-production.pem ec2-user@YOUR_INSTANCE_IP

# Clone repository
git clone https://github.com/your-username/docflow.git
cd docflow

# Create environment variables
cat > .env.production << EOF
NODE_ENV=production
DATABASE_URL=postgresql://postgres:PASSWORD@RDS_ENDPOINT:5432/pwausers_db
PWA_AUTH_URL=https://your-pwa-api.com/api/login
AUTH_SECRET=your-secure-secret-key-here
NEXTAUTH_URL=https://docflow.yourdomain.com
AUTH_TRUST_HOST=true
REDIS_HOST=ELASTICACHE_ENDPOINT
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_CHAT_ID=your-chat-id
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-s3-bucket-name
EOF

# Deploy with Docker Compose
docker-compose -f docker-compose.production.yml up -d

# Initialize database
docker-compose -f docker-compose.production.yml exec app pnpm db:push
docker-compose -f docker-compose.production.yml exec app pnpm docflow:init

# Check deployment
curl https://docflow.yourdomain.com/api/health
```

### Automated Deployment via GitHub Actions

1. **Configure Repository Secrets**:

```bash
# Required secrets in GitHub repository settings:
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_REGION=us-east-1
EC2_HOST=your-ec2-instance-ip
EC2_USER=ec2-user
EC2_SSH_KEY="-----BEGIN RSA PRIVATE KEY----- ... -----END RSA PRIVATE KEY-----"
DATABASE_URL=postgresql://postgres:password@rds-endpoint:5432/pwausers_db
PWA_AUTH_URL=https://your-pwa-api.com/api/login
AUTH_SECRET=your-secure-secret-key
NEXTAUTH_URL=https://docflow.yourdomain.com
REDIS_PASSWORD=your-redis-password
TELEGRAM_BOT_TOKEN=your-telegram-token
TELEGRAM_CHAT_ID=your-chat-id
DOMAIN_NAME=docflow.yourdomain.com
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx (optional)
```

2. **Deploy Process**:

```bash
# Push to main branch triggers deployment
git add .
git commit -m "Deploy to production"
git push origin main
```

The CI/CD pipeline will:
- Run security scans
- Execute tests
- Build Docker image
- Deploy to EC2
- Run health checks
- Send notifications

## SSL/TLS Configuration

### Automated SSL Setup

```bash
# Run SSL setup script
./scripts/ssl-setup.sh
```

The script will:
1. Validate domain DNS configuration
2. Start services without SSL
3. Obtain Let's Encrypt certificate
4. Configure Nginx with SSL
5. Set up auto-renewal

### Manual SSL Configuration

```bash
# Install Certbot
sudo dnf install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email admin@yourdomain.com \
  --agree-tos \
  --no-eff-email \
  -d docflow.yourdomain.com

# Configure Nginx
cp nginx/nginx.production.conf nginx/nginx.conf
# Edit domain name in configuration

# Reload Nginx
docker-compose -f docker-compose.production.yml exec nginx nginx -s reload

# Set up auto-renewal
echo "0 2 * * * /home/ec2-user/docflow/scripts/renew-certificates.sh" | crontab -
```

## Monitoring and Alerting

### CloudWatch Integration

The monitoring stack provides:

- **Application Load Balancer**: Response times, error rates, healthy targets
- **EC2 Instances**: CPU, memory, disk utilization
- **RDS Database**: CPU, connections, storage, latency
- **Custom Metrics**: Application errors, business metrics
- **Log Aggregation**: Application, Nginx, system logs

### Dashboard Access

```bash
# CloudWatch Dashboard URL
https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=production-docflow-monitoring
```

### Custom Application Monitoring

```bash
# Run monitoring script
./scripts/monitoring.sh

# Continuous monitoring
./scripts/monitoring.sh --continuous

# Generate report
./scripts/monitoring.sh --report
```

### Alert Configuration

```bash
# Configure alert thresholds
cat > monitoring/alert-thresholds.conf << EOF
CPU_THRESHOLD=80
MEMORY_THRESHOLD=85
DISK_THRESHOLD=90
RESPONSE_TIME_THRESHOLD=5000
ERROR_RATE_THRESHOLD=5
EOF
```

## Backup and Recovery

### Automated Backup Setup

```bash
# Configure backup environment
export AWS_S3_BACKUP_BUCKET=docflow-backups-your-account-id
export POSTGRES_PASSWORD=your-database-password

# Run backup manually
./scripts/backup.sh

# Schedule daily backups
echo "0 2 * * * /home/ec2-user/docflow/scripts/backup.sh" | crontab -
```

### Backup Components

The backup script creates:

1. **Database Backup**: PostgreSQL dump (compressed)
2. **File Backup**: Application files, uploads, configuration
3. **Volume Backup**: Docker volumes
4. **Manifest**: Backup metadata and verification

### Recovery Procedures

```bash
# List available backups
ls -la /backups/

# Restore database from backup
gunzip -c /backups/20241201_120000/database_20241201_120000.sql.gz | \
docker exec -i docflow-db psql -U postgres -d pwausers_db

# Restore files
tar -xzf /backups/20241201_120000/files_20241201_120000.tar.gz -C /

# Restart services
docker-compose -f docker-compose.production.yml restart
```

### S3 Backup Configuration

```bash
# Create S3 bucket for backups
aws s3 mb s3://docflow-backups-your-account-id --region us-east-1

# Configure lifecycle policy
aws s3api put-bucket-lifecycle-configuration \
  --bucket docflow-backups-your-account-id \
  --lifecycle-configuration file://aws/s3-lifecycle-policy.json
```

## Security Best Practices

### Network Security

```bash
# Security Groups (CloudFormation configured)
- ALB: Ports 80, 443 from 0.0.0.0/0
- EC2: Port 22 from your IP, ports 80/3000 from ALB only
- RDS: Port 5432 from EC2 security group only
- ElastiCache: Port 6379 from EC2 security group only
```

### Application Security

```bash
# Environment variables security
- Store secrets in AWS Systems Manager Parameter Store
- Use IAM roles instead of hardcoded credentials
- Rotate secrets regularly

# Container security
- Run as non-root user
- Use minimal base images
- Regular security updates
- Vulnerability scanning
```

### SSL/TLS Security

```bash
# Nginx SSL configuration includes:
- TLS 1.2 and 1.3 only
- Strong cipher suites
- HSTS headers
- Security headers (XSS, CSRF, etc.)
- OCSP stapling
```

## Troubleshooting

### Common Issues

#### 1. Application Not Accessible

```bash
# Check ALB target health
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:account:targetgroup/production-docflow-targets/xxx

# Check EC2 instance status
aws ec2 describe-instance-status --instance-ids i-xxxxxxxxx

# Check Docker services
docker-compose -f docker-compose.production.yml ps
docker-compose -f docker-compose.production.yml logs app
```

#### 2. Database Connection Issues

```bash
# Test database connectivity
docker exec docflow-db pg_isready -U postgres

# Check RDS status
aws rds describe-db-instances \
  --db-instance-identifier production-docflow-postgres

# Verify security group rules
aws ec2 describe-security-groups \
  --group-names production-docflow-rds-sg
```

#### 3. SSL Certificate Issues

```bash
# Check certificate status
openssl x509 -in ssl/certbot/live/docflow.yourdomain.com/fullchain.pem -text -noout

# Test SSL configuration
curl -vI https://docflow.yourdomain.com

# Renew certificate manually
docker-compose -f docker-compose.production.yml run --rm certbot renew
```

#### 4. Performance Issues

```bash
# Check system resources
./scripts/monitoring.sh --check-resources

# Analyze logs
docker-compose -f docker-compose.production.yml logs --tail=100 app

# Review CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name TargetResponseTime \
  --dimensions Name=LoadBalancer,Value=production-docflow-alb \
  --statistics Average \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300
```

### Log Locations

```bash
# Application logs
docker-compose -f docker-compose.production.yml logs app

# Nginx logs
docker-compose -f docker-compose.production.yml logs nginx

# System logs
journalctl -u docker

# Monitoring logs
tail -f /var/log/docflow-monitoring.log
```

### Health Check Endpoints

```bash
# Application health
curl https://docflow.yourdomain.com/api/health

# Nginx health
curl http://localhost:8080/nginx-health

# Database health
docker exec docflow-db pg_isready -U postgres
```

## Cost Optimization

### Instance Sizing

```bash
# Development: t3.small (~$15/month)
# Staging: t3.medium (~$30/month)  
# Production: t3.large (~$60/month)

# Use Reserved Instances for 40-60% savings
aws ec2 describe-reserved-instances-offerings \
  --instance-type t3.medium \
  --product-description "Linux/UNIX"
```

### Storage Optimization

```bash
# EBS Volume Types:
- gp3: Better price/performance than gp2
- Lifecycle policies for backups
- S3 Intelligent Tiering for long-term backups

# Clean up old Docker images
docker system prune -a --volumes
```

### Network Costs

```bash
# Use VPC endpoints to reduce data transfer costs
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-xxxxxxxx \
  --service-name com.amazonaws.us-east-1.s3 \
  --vpc-endpoint-type Gateway
```

### Monitoring Costs

```bash
# AWS Cost Explorer
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=DIMENSION,Key=SERVICE

# Set up billing alerts
aws cloudwatch put-metric-alarm \
  --alarm-name docflow-billing-alert \
  --alarm-description "Billing alert for DocFlow" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 86400 \
  --threshold 100 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=Currency,Value=USD
```

## Maintenance

### Regular Tasks

```bash
# Weekly:
- Review CloudWatch metrics and alerts
- Check backup integrity
- Update security patches
- Review application logs

# Monthly:
- Rotate secrets and passwords
- Review AWS costs
- Update dependencies
- Performance optimization review

# Quarterly:
- Security audit
- Disaster recovery testing
- Capacity planning review
- Infrastructure cost optimization
```

### Update Procedures

```bash
# Application updates (via CI/CD)
git push origin main

# System updates
sudo dnf update -y
sudo reboot

# Docker updates
sudo dnf update docker docker-compose -y
sudo systemctl restart docker

# SSL certificate renewal (automatic)
# Check: /var/log/certbot-renewal.log
```

## Support and Documentation

### Additional Resources

- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)

### Emergency Contacts

```bash
# Production Issues:
1. Check monitoring dashboard
2. Review application logs
3. Verify infrastructure status
4. Contact system administrator
5. Execute disaster recovery plan if needed
```

---

This production deployment guide provides comprehensive instructions for deploying DocFlow in a scalable, secure, and maintainable way. Follow the procedures step-by-step and customize as needed for your specific environment.