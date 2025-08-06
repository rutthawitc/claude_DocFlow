#!/bin/bash

# DocFlow Production Server Setup Script
# For AWS EC2 c7i-flex.large (ap-southeast-7)
# Instance: i-0c719a82783b5ca43 (43.209.177.163)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Check if script is run as root
check_root() {
    if [ "$EUID" -eq 0 ]; then
        error "This script should not be run as root. Please run as a regular user with sudo privileges."
        exit 1
    fi
}

# Update system packages
update_system() {
    log "Updating system packages..."
    sudo apt-get update -y
    sudo apt-get upgrade -y
    sudo apt-get install -y curl wget unzip git htop nano vim ufw fail2ban
}

# Install Docker
install_docker() {
    log "Installing Docker..."
    
    # Remove old Docker versions if they exist
    sudo apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
    
    # Install Docker's official GPG key
    sudo apt-get update
    sudo apt-get install -y ca-certificates curl gnupg lsb-release
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    # Add Docker repository
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker Engine
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # Add current user to docker group
    sudo usermod -aG docker $USER
    
    # Start and enable Docker
    sudo systemctl start docker
    sudo systemctl enable docker
    
    info "Docker installed successfully. You may need to log out and back in for group changes to take effect."
}

# Install Docker Compose
install_docker_compose() {
    log "Installing Docker Compose..."
    
    # Download and install Docker Compose
    DOCKER_COMPOSE_VERSION="v2.24.5"
    sudo curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    
    # Create symlink for backwards compatibility
    sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    
    # Verify installation
    docker-compose --version
}

# Configure firewall
configure_firewall() {
    log "Configuring UFW firewall..."
    
    # Reset UFW to default settings
    sudo ufw --force reset
    
    # Default policies
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    
    # Allow SSH (port 22)
    sudo ufw allow ssh
    
    # Allow HTTP and HTTPS
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    
    # Allow custom application ports if needed
    # sudo ufw allow 3000/tcp  # Next.js (only if needed for testing)
    # sudo ufw allow 5432/tcp  # PostgreSQL (only if external access needed)
    
    # Enable UFW
    sudo ufw --force enable
    
    # Show status
    sudo ufw status verbose
}

# Configure fail2ban
configure_fail2ban() {
    log "Configuring fail2ban..."
    
    # Create custom jail configuration
    sudo tee /etc/fail2ban/jail.local > /dev/null <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3
backend = systemd

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
EOF

    # Start and enable fail2ban
    sudo systemctl start fail2ban
    sudo systemctl enable fail2ban
    
    info "Fail2ban configured and started"
}

# Install SSL certificates
install_ssl() {
    log "Installing Let's Encrypt SSL certificates..."
    
    # Install certbot
    sudo apt-get install -y certbot python3-certbot-nginx
    
    # Get SSL certificate (this will be run interactively)
    info "SSL certificate installation requires manual intervention."
    info "After the script completes, run the following command:"
    info "sudo certbot --nginx -d ec2-43-209-177-163.ap-southeast-7.compute.amazonaws.com"
    
    # Set up automatic renewal
    (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
}

# Create application directories
create_directories() {
    log "Creating application directories..."
    
    # Create application directory
    sudo mkdir -p /opt/docflow
    sudo chown $USER:$USER /opt/docflow
    
    # Create required subdirectories
    mkdir -p /opt/docflow/{uploads,backups,logs,ssl,nginx/sites-enabled}
    
    # Set proper permissions
    chmod 755 /opt/docflow
    chmod 755 /opt/docflow/uploads
    chmod 755 /opt/docflow/backups
    chmod 755 /opt/docflow/logs
}

# Configure system limits for Docker
configure_system_limits() {
    log "Configuring system limits..."
    
    # Increase file descriptor limits
    echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
    echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf
    
    # Configure Docker daemon
    sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "5"
  },
  "max-concurrent-downloads": 10,
  "max-concurrent-uploads": 5,
  "storage-driver": "overlay2"
}
EOF
    
    # Restart Docker to apply changes
    sudo systemctl restart docker
}

# Install monitoring tools
install_monitoring() {
    log "Installing monitoring tools..."
    
    # Install system monitoring tools
    sudo apt-get install -y htop iotop nethogs ncdu tree
    
    # Install Docker monitoring tools
    docker pull portainer/portainer-ce:latest
    
    info "Monitoring tools installed. Portainer can be deployed later if needed."
}

# Create environment file template
create_env_template() {
    log "Creating environment file template..."
    
    cat > /opt/docflow/.env.example <<EOF
# Database Configuration
DB_PASSWORD=your_secure_db_password_here
DATABASE_URL=postgresql://postgres:\${DB_PASSWORD}@postgres:5432/pwausers_db

# Authentication
PWA_AUTH_URL=https://your-pwa-auth-endpoint.com/api/login
AUTH_SECRET=your_secure_secret_key_here
NEXTAUTH_URL=https://ec2-43-209-177-163.ap-southeast-7.compute.amazonaws.com
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
EOF

    chmod 600 /opt/docflow/.env.example
    
    warning "Please copy .env.example to .env and configure with your actual values:"
    warning "cp /opt/docflow/.env.example /opt/docflow/.env"
    warning "nano /opt/docflow/.env"
}

# Print summary
print_summary() {
    log "Server setup completed successfully!"
    echo
    info "Summary of installed components:"
    info "- Docker and Docker Compose"
    info "- UFW Firewall (configured)"
    info "- Fail2ban (configured)"
    info "- Let's Encrypt Certbot"
    info "- Monitoring tools"
    info "- Application directories in /opt/docflow"
    echo
    warning "Next steps:"
    warning "1. Configure SSL certificate: sudo certbot --nginx -d ec2-43-209-177-163.ap-southeast-7.compute.amazonaws.com"
    warning "2. Create and configure .env file: cp /opt/docflow/.env.example /opt/docflow/.env"
    warning "3. Clone your repository to /opt/docflow"
    warning "4. Deploy using docker-compose: docker-compose -f docker-compose.production.yml up -d"
    echo
    info "System information:"
    info "- Instance Type: c7i-flex.large (2 vCPU, 8GB RAM)"
    info "- Public IP: 43.208.239.166"
    info "- Region: ap-southeast-7"
    info "- Application Directory: /opt/docflow"
    echo
    warning "Please log out and back in for Docker group changes to take effect."
}

# Main execution
main() {
    log "Starting DocFlow server setup..."
    
    check_root
    update_system
    install_docker
    install_docker_compose
    configure_firewall
    configure_fail2ban
    install_ssl
    create_directories
    configure_system_limits
    install_monitoring
    create_env_template
    print_summary
    
    log "Setup script completed successfully!"
}

# Run main function
main "$@"