# AWS EC2 Deployment Guide for Claude DocFlow

This guide provides step-by-step instructions for deploying the Claude DocFlow application on Amazon EC2.

## Prerequisites

- AWS Account with EC2 access
- SSH key pair for EC2 access
- Domain name (optional, for production)

## Step 1: Launch EC2 Instance

### 1.1 Create EC2 Instance

1. Go to AWS Console → EC2 → Launch Instance
2. **Name**: `claude-docflow-server`
3. **AMI**: Ubuntu Server 22.04 LTS (Free tier eligible)
4. **Instance Type**:
   - Development: `t3.medium` (2 vCPU, 4GB RAM)
   - Production: `t3.large` or higher
5. **Key Pair**: Select or create a new key pair
6. **Storage**: 20GB gp3 EBS volume (minimum)

### 1.2 Configure Security Group

Create security group with these inbound rules:

```
Type        Protocol    Port Range    Source          Description
SSH         TCP         22            Your IP         SSH access
HTTP        TCP         80            0.0.0.0/0       HTTP traffic
HTTPS       TCP         443           0.0.0.0/0       HTTPS traffic
Custom      TCP         3000          0.0.0.0/0       DocFlow App
Custom      TCP         5432          Your IP         PostgreSQL (optional)
Custom      TCP         6379          Your IP         Redis (optional)
```

### 1.3 Launch Instance

- Review and launch the instance
- Note down the **Public IPv4 address**

## Step 2: Connect to EC2 Instance

```bash
# Connect via SSH (replace with your key and IP)
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP

# Update system packages
sudo apt update && sudo apt upgrade -y
```

## Step 3: Install Docker and Dependencies

```bash
# Install Docker
sudo apt install apt-transport-https ca-certificates curl software-properties-common -y
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io -y

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add ubuntu user to docker group
sudo usermod -aG docker ubuntu

# Logout and login again, or run:
newgrp docker

# Verify installation
docker --version
docker-compose --version
```

## Step 4: Deploy DocFlow Application

### 4.1 Clone Repository

```bash
# Clone your repository (replace with your repo URL)
git clone https://github.com/rutthawitc/claude_DocFlow.git
cd claude_DocFlow

# Or upload files via SCP
# scp -i your-key.pem -r ./claude_DocFlow ubuntu@YOUR_EC2_PUBLIC_IP:~/
```

### 4.2 Configure Environment Variables

```bash
# Update docker-compose.yml with EC2 public IP
sed -i "s/NEXTAUTH_URL=http:\/\/localhost:3000/NEXTAUTH_URL=http:\/\/YOUR_EC2_PUBLIC_IP:3000/" docker-compose.yml

# Update PWA_AUTH_URL if you have a public endpoint
# sed -i "s|PWA_AUTH_URL=.*|PWA_AUTH_URL=https://your-public-pwa-api.com/api/login|" docker-compose.yml
```

### 4.3 Create Required Directories

```bash
# Create directories for persistent data
sudo mkdir -p /var/lib/postgresql/data
sudo mkdir -p /var/lib/redis/data
sudo mkdir -p ./tmp

# Set permissions
sudo chown -R 999:999 /var/lib/postgresql/data
sudo chown -R 999:999 /var/lib/redis/data
chmod 755 ./tmp
```

## Step 5: Build and Start Application

```bash
# Build and start all services
docker-compose up -d --build

# Check if containers are running
docker-compose ps

# View logs
docker-compose logs -f app
```

## Step 6: Initialize Database

```bash
# Install dev dependencies (for drizzle-kit)
docker-compose exec app pnpm install --dev
docker-compose exec app pnpm approve-builds

# Copy necessary files if not already present
docker-compose cp ./drizzle.config.ts app:/app/
docker-compose cp ./src app:/app/
docker-compose cp ./scripts app:/app/

# Push database schema
docker-compose exec app pnpm db:push

# Initialize DocFlow data
docker-compose exec app pnpm docflow:init
```

## Step 7: Configure Firewall (Ubuntu UFW)

```bash
# Enable firewall
sudo ufw enable

# Allow SSH, HTTP, HTTPS, and DocFlow app
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3000

# Check firewall status
sudo ufw status
```

## Step 8: Access Your Application

Your DocFlow application will be available at:

- **HTTP**: `http://YOUR_EC2_PUBLIC_IP:3000`
- **Admin Panel**: `http://YOUR_EC2_PUBLIC_IP:3000/admin`
- **pgAdmin**: `http://YOUR_EC2_PUBLIC_IP:5050` (admin@admin.com / admin)

## Step 9: Production Optimizations (Optional)

### 9.1 Set up Nginx Reverse Proxy

```bash
# Install Nginx
sudo apt install nginx -y

# Create Nginx configuration
sudo tee /etc/nginx/sites-available/docflow << 'EOF'
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

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
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/docflow /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 9.2 SSL Certificate with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 9.3 Set up Auto-start on Boot

```bash
# Create systemd service
sudo tee /etc/systemd/system/docflow.service << 'EOF'
[Unit]
Description=DocFlow Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/ubuntu/claude_DocFlow
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

# Enable service
sudo systemctl enable docflow.service
```

## Step 10: Monitoring and Maintenance

### 10.1 Monitor Application

```bash
# Check container status
docker-compose ps

# View application logs
docker-compose logs -f app

# Monitor system resources
htop
df -h
```

### 10.2 Backup Database

```bash
# Create backup script
cat > backup-db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec -T pwa-next15-authjs-db pg_dump -U postgres pwausers_db > backup_${DATE}.sql
echo "Backup created: backup_${DATE}.sql"
EOF

chmod +x backup-db.sh

# Run backup
./backup-db.sh

# Schedule daily backups
crontab -e
# Add: 0 2 * * * /home/ubuntu/claude_DocFlow/backup-db.sh
```

### 10.3 Update Application

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up -d --build

# Check if database migration needed
docker-compose exec app pnpm db:push
```

## Troubleshooting

### Common Issues

1. **Port 3000 not accessible**

   - Check AWS Security Group allows port 3000
   - Verify UFW firewall: `sudo ufw status`

2. **Docker permission denied**

   - Add user to docker group: `sudo usermod -aG docker $USER`
   - Logout and login again

3. **Database connection errors**

   - Check if PostgreSQL container is running: `docker-compose ps`
   - Verify environment variables in docker-compose.yml

4. **Out of disk space**

   - Clean Docker images: `docker system prune -a`
   - Increase EBS volume size in AWS Console

5. **Memory issues**
   - Upgrade to larger instance type (t3.large or higher)
   - Monitor with: `free -h` and `docker stats`

### Log Locations

- Application logs: `docker-compose logs app`
- Nginx logs: `/var/log/nginx/`
- System logs: `journalctl -u docflow.service`

## Security Considerations

1. **Regular Updates**

   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Change Default Passwords**

   - Update database passwords in docker-compose.yml
   - Change pgAdmin default credentials

3. **Firewall Rules**

   - Only open necessary ports
   - Restrict database ports to specific IPs

4. **Backup Strategy**

   - Regular database backups
   - Store backups in S3 or external storage

5. **Monitoring**
   - Set up CloudWatch logs
   - Monitor disk usage and memory

## Cost Optimization

1. **Instance Sizing**

   - Start with t3.medium, scale up if needed
   - Use Reserved Instances for production

2. **Storage**

   - Use gp3 volumes for better price/performance
   - Set up lifecycle policies for backups

3. **Networking**
   - Use VPC endpoints to reduce data transfer costs
   - Consider CloudFront for static assets

---

## Next Steps

1. Set up domain name and SSL certificate
2. Configure automated backups to S3
3. Set up CloudWatch monitoring
4. Consider using RDS for managed PostgreSQL
5. Implement CI/CD pipeline with AWS CodePipeline

For production deployments, consider using AWS services like:

- **RDS** for managed PostgreSQL
- **ElastiCache** for managed Redis
- **ALB** for load balancing
- **ECS/EKS** for container orchestration
- **S3** for file storage and backups
