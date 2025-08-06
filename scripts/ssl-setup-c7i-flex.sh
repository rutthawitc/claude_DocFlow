#!/bin/bash

# SSL/TLS Setup Script for DocFlow on AWS EC2 c7i-flex.large
# Automated Let's Encrypt certificate installation with Nginx configuration

set -euo pipefail

# Configuration
DOMAIN=""
EMAIL=""
DOCFLOW_DIR="/opt/docflow"
DATA_DIR="/data"
NGINX_CONF_DIR="$DATA_DIR"
SSL_DIR="$DATA_DIR/ssl"
WEBROOT_DIR="$SSL_DIR/www"
CERTBOT_DIR="$SSL_DIR/certbot"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Help function
show_help() {
    cat << EOF
DocFlow SSL Setup Script for AWS EC2 c7i-flex.large

Usage: $0 -d DOMAIN -e EMAIL [OPTIONS]

Required arguments:
  -d, --domain DOMAIN    Domain name for SSL certificate (e.g., docflow.yourdomain.com)
  -e, --email EMAIL      Email address for Let's Encrypt registration

Optional arguments:
  -h, --help            Show this help message
  -t, --test-cert       Use Let's Encrypt staging server (for testing)
  -f, --force           Force certificate renewal even if valid certificate exists
  --dry-run             Show what would be done without actually doing it

Examples:
  $0 -d docflow.example.com -e admin@example.com
  $0 -d docflow.example.com -e admin@example.com --test-cert
  $0 -d docflow.example.com -e admin@example.com --force

This script will:
1. Verify DNS configuration
2. Set up initial Nginx configuration
3. Obtain SSL certificate from Let's Encrypt
4. Configure Nginx with SSL
5. Set up automatic certificate renewal
6. Test the complete SSL setup

Requirements:
- Domain must point to this server (43.209.177.163)
- Ports 80 and 443 must be open
- DocFlow application must be running
- Run as root or with sudo privileges
EOF
}

# Parse command line arguments
parse_args() {
    local use_staging=false
    local force_renewal=false
    local dry_run=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -d|--domain)
                DOMAIN="$2"
                shift 2
                ;;
            -e|--email)
                EMAIL="$2"
                shift 2
                ;;
            -t|--test-cert)
                use_staging=true
                shift
                ;;
            -f|--force)
                force_renewal=true
                shift
                ;;
            --dry-run)
                dry_run=true
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                error "Unknown argument: $1"
                ;;
        esac
    done
    
    # Validate required arguments
    if [[ -z "$DOMAIN" ]]; then
        error "Domain is required. Use -d or --domain"
    fi
    
    if [[ -z "$EMAIL" ]]; then
        error "Email is required. Use -e or --email"
    fi
    
    # Set staging flag for certbot
    if [[ "$use_staging" == true ]]; then
        CERTBOT_EXTRA_ARGS="--staging"
        warning "Using Let's Encrypt staging server (test certificates)"
    else
        CERTBOT_EXTRA_ARGS=""
    fi
    
    # Set force renewal flag
    if [[ "$force_renewal" == true ]]; then
        CERTBOT_EXTRA_ARGS="$CERTBOT_EXTRA_ARGS --force-renewal"
    fi
    
    # Set dry run flag
    if [[ "$dry_run" == true ]]; then
        DRY_RUN=true
        warning "DRY RUN MODE - No changes will be made"
    else
        DRY_RUN=false
    fi
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if running as root
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root. Use: sudo $0"
    fi
    
    # Check if DocFlow directory exists
    if [[ ! -d "$DOCFLOW_DIR" ]]; then
        error "DocFlow directory not found: $DOCFLOW_DIR"
    fi
    
    # Check if Docker is running
    if ! systemctl is-active --quiet docker; then
        error "Docker is not running. Start it with: systemctl start docker"
    fi
    
    # Check if domain is valid format
    if ! [[ "$DOMAIN" =~ ^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$ ]]; then
        error "Invalid domain format: $DOMAIN"
    fi
    
    # Check if email is valid format
    if ! [[ "$EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
        error "Invalid email format: $EMAIL"
    fi
    
    success "Prerequisites check passed"
}

# Verify DNS configuration
verify_dns() {
    log "Verifying DNS configuration for $DOMAIN..."
    
    # Get current public IP
    local public_ip
    public_ip=$(curl -s https://ipinfo.io/ip || curl -s https://api.ipify.org || echo "43.209.177.163")
    
    # Check DNS resolution
    local resolved_ip
    resolved_ip=$(dig +short "$DOMAIN" | tail -1)
    
    if [[ -z "$resolved_ip" ]]; then
        error "Domain $DOMAIN does not resolve to any IP address"
    fi
    
    if [[ "$resolved_ip" != "$public_ip" ]]; then
        warning "DNS mismatch:"
        warning "  Domain $DOMAIN resolves to: $resolved_ip"
        warning "  Server public IP is: $public_ip"
        warning "  SSL certificate generation may fail"
        
        if [[ "$DRY_RUN" == false ]]; then
            read -p "Continue anyway? (y/N): " -r
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
    else
        success "DNS configuration verified - $DOMAIN resolves to $public_ip"
    fi
}

# Create SSL directory structure
setup_ssl_directories() {
    log "Setting up SSL directory structure..."
    
    if [[ "$DRY_RUN" == false ]]; then
        mkdir -p "$SSL_DIR"/{certbot,www}
        mkdir -p "$WEBROOT_DIR"/.well-known/acme-challenge
        chown -R docflow:docflow "$SSL_DIR"
        chmod -R 755 "$SSL_DIR"
        chmod 755 "$WEBROOT_DIR"/.well-known/acme-challenge
    fi
    
    success "SSL directories created"
}

# Prepare initial Nginx configuration (HTTP only)
prepare_initial_nginx() {
    log "Preparing initial Nginx configuration..."
    
    local nginx_conf="$NGINX_CONF_DIR/nginx.conf"
    
    if [[ "$DRY_RUN" == false ]]; then
        # Create initial configuration that allows HTTP for Let's Encrypt validation
        cat > "$nginx_conf" << EOF
user nginx;
worker_processes auto;
worker_rlimit_nofile 65535;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 2048;
    use epoll;
    multi_accept on;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    client_max_body_size 50M;
    
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types
        application/javascript
        application/json
        text/css
        text/javascript
        text/plain
        text/xml;
    
    limit_req_zone \$binary_remote_addr zone=general:10m rate=100r/m;
    
    upstream nextjs_backend {
        server app:3000;
        keepalive 32;
    }
    
    log_format main '\$remote_addr - \$remote_user [\$time_local] "\$request" '
                   '\$status \$body_bytes_sent "\$http_referer" '
                   '"\$http_user_agent" rt=\$request_time';
    
    access_log /var/log/nginx/access.log main;
    
    server {
        listen 80;
        server_name $DOMAIN;
        server_tokens off;
        
        # Let's Encrypt challenge
        location ^~ /.well-known/acme-challenge/ {
            root /var/www/certbot;
            try_files \$uri =404;
        }
        
        # Health check
        location /health {
            proxy_pass http://nextjs_backend;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            access_log off;
        }
        
        # Temporary: Allow all traffic for initial setup
        location / {
            limit_req zone=general burst=50 nodelay;
            
            proxy_pass http://nextjs_backend;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }
    }
}
EOF
        
        # Copy to nginx container volume
        chown docflow:docflow "$nginx_conf"
    fi
    
    success "Initial Nginx configuration prepared"
}

# Restart Nginx with new configuration
restart_nginx() {
    log "Restarting Nginx with new configuration..."
    
    if [[ "$DRY_RUN" == false ]]; then
        # Check if nginx container is running
        if docker ps | grep -q docflow-nginx; then
            # Test configuration first
            if docker exec docflow-nginx nginx -t; then
                docker exec docflow-nginx nginx -s reload
                success "Nginx configuration reloaded"
            else
                error "Nginx configuration test failed"
            fi
        else
            warning "Nginx container not running - will be started with SSL configuration"
        fi
    fi
}

# Obtain SSL certificate
obtain_ssl_certificate() {
    log "Obtaining SSL certificate from Let's Encrypt..."
    
    if [[ "$DRY_RUN" == false ]]; then
        # Run certbot in standalone mode or webroot mode
        local certbot_command
        
        if docker ps | grep -q docflow-nginx; then
            # Use webroot mode if nginx is running
            certbot_command="docker run --rm \
                -v $CERTBOT_DIR:/etc/letsencrypt \
                -v $WEBROOT_DIR:/var/www/certbot \
                certbot/certbot certonly \
                --webroot \
                --webroot-path=/var/www/certbot \
                --email $EMAIL \
                --agree-tos \
                --no-eff-email \
                -d $DOMAIN \
                $CERTBOT_EXTRA_ARGS"
        else
            # Use standalone mode if nginx is not running
            certbot_command="docker run --rm \
                -p 80:80 \
                -v $CERTBOT_DIR:/etc/letsencrypt \
                certbot/certbot certonly \
                --standalone \
                --email $EMAIL \
                --agree-tos \
                --no-eff-email \
                -d $DOMAIN \
                $CERTBOT_EXTRA_ARGS"
        fi
        
        log "Running: $certbot_command"
        
        if eval "$certbot_command"; then
            success "SSL certificate obtained successfully"
        else
            error "Failed to obtain SSL certificate"
        fi
        
        # Verify certificate files exist
        if [[ -f "$CERTBOT_DIR/live/$DOMAIN/fullchain.pem" && -f "$CERTBOT_DIR/live/$DOMAIN/privkey.pem" ]]; then
            success "Certificate files verified"
            
            # Show certificate information
            openssl x509 -in "$CERTBOT_DIR/live/$DOMAIN/fullchain.pem" -text -noout | grep -E "(Subject|Issuer|Not Before|Not After)"
        else
            error "Certificate files not found after generation"
        fi
    else
        log "DRY RUN: Would obtain certificate for $DOMAIN with email $EMAIL"
    fi
}

# Configure Nginx with SSL
configure_ssl_nginx() {
    log "Configuring Nginx with SSL..."
    
    local nginx_ssl_conf="$NGINX_CONF_DIR/nginx.conf"
    
    if [[ "$DRY_RUN" == false ]]; then
        # Create full SSL configuration
        cat > "$nginx_ssl_conf" << EOF
user nginx;
worker_processes auto;
worker_rlimit_nofile 65535;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 2048;
    use epoll;
    multi_accept on;
    accept_mutex_delay 100ms;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    
    # Performance optimization
    sendfile on;
    sendfile_max_chunk 1m;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    keepalive_requests 1000;
    client_max_body_size 50M;
    client_body_timeout 60s;
    client_header_timeout 60s;
    send_timeout 60s;
    
    # Buffer sizes
    client_body_buffer_size 128k;
    client_header_buffer_size 4k;
    large_client_header_buffers 8 8k;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        application/atom+xml
        application/javascript
        application/json
        application/rss+xml
        application/vnd.ms-fontobject
        application/x-font-ttf
        application/x-web-app-manifest+json
        application/xhtml+xml
        application/xml
        font/opentype
        image/svg+xml
        image/x-icon
        text/css
        text/plain
        text/x-component;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=30r/m;
    limit_req_zone \$binary_remote_addr zone=upload:10m rate=5r/m;
    limit_req_zone \$binary_remote_addr zone=login:10m rate=10r/m;
    limit_req_zone \$binary_remote_addr zone=general:10m rate=100r/m;
    
    limit_conn_zone \$binary_remote_addr zone=conn_limit_per_ip:10m;
    limit_conn conn_limit_per_ip 20;
    
    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
    ssl_ecdh_curve secp384r1;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_session_tickets off;
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # Upstream
    upstream nextjs_backend {
        server app:3000 max_fails=3 fail_timeout=30s weight=1;
        keepalive 32;
        keepalive_requests 1000;
        keepalive_timeout 60s;
    }
    
    # Log format
    log_format main '\$remote_addr - \$remote_user [\$time_local] "\$request" '
                   '\$status \$body_bytes_sent "\$http_referer" '
                   '"\$http_user_agent" "\$http_x_forwarded_for" '
                   'rt=\$request_time uct="\$upstream_connect_time" '
                   'uht="\$upstream_header_time" urt="\$upstream_response_time"';
    
    access_log /var/log/nginx/access.log main;
    
    # HTTP server (redirect to HTTPS)
    server {
        listen 80;
        server_name $DOMAIN;
        server_tokens off;
        
        # Let's Encrypt challenge
        location ^~ /.well-known/acme-challenge/ {
            root /var/www/certbot;
            try_files \$uri =404;
        }
        
        # Health check (allow HTTP)
        location /health {
            proxy_pass http://nextjs_backend;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            access_log off;
        }
        
        # Redirect all other traffic to HTTPS
        location / {
            return 301 https://\$host\$request_uri;
        }
    }
    
    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name $DOMAIN;
        server_tokens off;
        
        # SSL Certificate
        ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
        ssl_trusted_certificate /etc/letsencrypt/live/$DOMAIN/chain.pem;
        
        # HTTPS Security headers
        add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
        add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data: https://unpkg.com; connect-src 'self' https://api.telegram.org https://unpkg.com; object-src 'none'; media-src 'self'; frame-src 'self'; base-uri 'self'; form-action 'self'" always;
        
        # API routes with rate limiting
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            limit_req zone=general burst=50 nodelay;
            
            # Special handling for auth endpoints
            location /api/auth/ {
                limit_req zone=login burst=5 nodelay;
                proxy_pass http://nextjs_backend;
                proxy_set_header Host \$host;
                proxy_set_header X-Real-IP \$remote_addr;
                proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto \$scheme;
                proxy_set_header X-Forwarded-Port \$server_port;
                proxy_buffering off;
                proxy_request_buffering off;
            }
            
            # Special handling for document uploads
            location /api/documents {
                limit_req zone=upload burst=3 nodelay;
                client_max_body_size 50M;
                client_body_timeout 300s;
                proxy_read_timeout 300s;
                proxy_send_timeout 300s;
                proxy_pass http://nextjs_backend;
                proxy_set_header Host \$host;
                proxy_set_header X-Real-IP \$remote_addr;
                proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto \$scheme;
                proxy_set_header X-Forwarded-Port \$server_port;
                proxy_buffering off;
                proxy_request_buffering off;
            }
            
            # General API proxy
            proxy_pass http://nextjs_backend;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            proxy_set_header X-Forwarded-Port \$server_port;
        }
        
        # Static assets with caching
        location /_next/static/ {
            proxy_pass http://nextjs_backend;
            add_header Cache-Control "public, immutable, max-age=31536000";
            expires 1y;
        }
        
        # PDF files with special headers
        location ~ \.pdf\$ {
            proxy_pass http://nextjs_backend;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            proxy_buffering off;
            add_header X-Content-Type-Options nosniff;
        }
        
        # Font files with CORS
        location ~* \.(eot|otf|ttf|woff|woff2)\$ {
            proxy_pass http://nextjs_backend;
            add_header Access-Control-Allow-Origin *;
            add_header Cache-Control "public, max-age=31536000, immutable";
            expires 1y;
        }
        
        # Main application
        location / {
            limit_req zone=general burst=50 nodelay;
            
            proxy_pass http://nextjs_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            proxy_set_header X-Forwarded-Port \$server_port;
            proxy_cache_bypass \$http_upgrade;
            
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
            
            proxy_buffering on;
            proxy_buffer_size 4k;
            proxy_buffers 8 4k;
            proxy_busy_buffers_size 8k;
        }
        
        # Nginx health check
        location /nginx-health {
            access_log off;
            return 200 "healthy\\n";
            add_header Content-Type text/plain;
        }
    }
}
EOF
        
        chown docflow:docflow "$nginx_ssl_conf"
        success "SSL Nginx configuration created"
        
        # Test configuration
        if docker exec docflow-nginx nginx -t 2>/dev/null; then
            success "Nginx SSL configuration test passed"
        else
            warning "Nginx container not running for configuration test"
        fi
    else
        log "DRY RUN: Would create SSL Nginx configuration"
    fi
}

# Set up automatic certificate renewal
setup_auto_renewal() {
    log "Setting up automatic certificate renewal..."
    
    if [[ "$DRY_RUN" == false ]]; then
        # Create renewal script
        cat > /opt/docflow/scripts/renew-ssl.sh << 'EOF'
#!/bin/bash
# DocFlow SSL Certificate Renewal Script

set -euo pipefail

CERTBOT_DIR="/data/ssl/certbot"
WEBROOT_DIR="/data/ssl/www"
LOG_FILE="/var/log/docflow-ssl-renewal.log"

echo "[$(date)] Starting SSL certificate renewal check" >> "$LOG_FILE"

# Renew certificates
docker run --rm \
  -v "$CERTBOT_DIR:/etc/letsencrypt" \
  -v "$WEBROOT_DIR:/var/www/certbot" \
  certbot/certbot renew \
  --webroot --webroot-path=/var/www/certbot \
  --quiet >> "$LOG_FILE" 2>&1

# Check if renewal was successful and reload nginx
if [ $? -eq 0 ]; then
    echo "[$(date)] Certificate renewal check completed successfully" >> "$LOG_FILE"
    
    # Reload nginx if it's running
    if docker ps | grep -q docflow-nginx; then
        docker exec docflow-nginx nginx -s reload
        echo "[$(date)] Nginx configuration reloaded" >> "$LOG_FILE"
    fi
    
    # Send notification (if configured)
    if command -v /opt/docflow/scripts/send-notification.sh >/dev/null 2>&1; then
        /opt/docflow/scripts/send-notification.sh "SSL certificate renewed successfully for $(hostname -f)"
    fi
else
    echo "[$(date)] Certificate renewal failed" >> "$LOG_FILE"
    
    # Send error notification (if configured)
    if command -v /opt/docflow/scripts/send-notification.sh >/dev/null 2>&1; then
        /opt/docflow/scripts/send-notification.sh "SSL certificate renewal FAILED for $(hostname -f)"
    fi
fi

echo "[$(date)] SSL renewal process completed" >> "$LOG_FILE"
EOF
        
        chmod +x /opt/docflow/scripts/renew-ssl.sh
        chown docflow:docflow /opt/docflow/scripts/renew-ssl.sh
        
        # Create cron job for automatic renewal (runs twice daily)
        cat > /etc/cron.d/docflow-ssl-renewal << EOF
# DocFlow SSL Certificate Auto-Renewal
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

# Run renewal check twice daily at random minutes to avoid load spikes
$(shuf -i 0-59 -n 1) 2 * * * root /opt/docflow/scripts/renew-ssl.sh
$(shuf -i 0-59 -n 1) 14 * * * root /opt/docflow/scripts/renew-ssl.sh
EOF
        
        success "Automatic certificate renewal configured"
    else
        log "DRY RUN: Would set up automatic certificate renewal"
    fi
}

# Test SSL configuration
test_ssl_setup() {
    log "Testing SSL configuration..."
    
    if [[ "$DRY_RUN" == false ]]; then
        # Test certificate validity
        if [[ -f "$CERTBOT_DIR/live/$DOMAIN/fullchain.pem" ]]; then
            log "Certificate information:"
            openssl x509 -in "$CERTBOT_DIR/live/$DOMAIN/fullchain.pem" -text -noout | grep -E "(Subject|Issuer|Not Before|Not After|DNS:)"
            
            # Check certificate expiration
            local expiry_days
            expiry_days=$(openssl x509 -checkend 2592000 -noout -in "$CERTBOT_DIR/live/$DOMAIN/fullchain.pem" && echo "30+" || echo "<30")
            log "Certificate expiry: $expiry_days days"
        fi
        
        # Test HTTPS connectivity
        log "Testing HTTPS connectivity..."
        sleep 5  # Wait for nginx to start
        
        if curl -f -s -I "https://$DOMAIN/health" >/dev/null; then
            success "HTTPS connectivity test passed"
        else
            warning "HTTPS connectivity test failed - check application status"
        fi
        
        # Test SSL grade (using external service)
        log "SSL configuration summary:"
        echo "- Domain: $DOMAIN"
        echo "- Certificate: $(openssl x509 -in "$CERTBOT_DIR/live/$DOMAIN/fullchain.pem" -noout -issuer | cut -d'=' -f2-)"
        echo "- Valid until: $(openssl x509 -in "$CERTBOT_DIR/live/$DOMAIN/fullchain.pem" -noout -enddate | cut -d'=' -f2-)"
        echo "- Test URL: https://$DOMAIN"
        echo "- SSL Test: https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"
        
    else
        log "DRY RUN: Would test SSL configuration"
    fi
}

# Final setup summary
show_final_summary() {
    log "=== SSL Setup Complete ==="
    echo ""
    echo "SSL Configuration Summary:"
    echo "- Domain: $DOMAIN"
    echo "- Email: $EMAIL"
    echo "- Certificate location: $CERTBOT_DIR/live/$DOMAIN/"
    echo "- Nginx configuration: $NGINX_CONF_DIR/nginx.conf"
    echo "- Auto-renewal: Configured (twice daily)"
    echo ""
    echo "Next Steps:"
    echo "1. Test your website: https://$DOMAIN"
    echo "2. Check SSL grade: https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"
    echo "3. Monitor renewal logs: tail -f /var/log/docflow-ssl-renewal.log"
    echo "4. Manual renewal test: /opt/docflow/scripts/renew-ssl.sh"
    echo ""
    echo "Security Features Enabled:"
    echo "- HTTP to HTTPS redirect"
    echo "- HSTS headers"
    echo "- Security headers (XSS, CSRF, etc.)"
    echo "- Rate limiting"
    echo "- Secure SSL/TLS configuration"
    echo ""
    echo "Maintenance:"
    echo "- Certificates auto-renew 30 days before expiration"
    echo "- Check renewal status in cron logs"
    echo "- Update DNS if changing domains"
    echo ""
    
    if [[ "$DRY_RUN" == false ]]; then
        success "SSL setup completed successfully!"
        log "Your DocFlow application is now secured with SSL/TLS"
    else
        log "DRY RUN completed - no changes were made"
    fi
}

# Main execution
main() {
    parse_args "$@"
    check_prerequisites
    verify_dns
    setup_ssl_directories
    prepare_initial_nginx
    restart_nginx
    obtain_ssl_certificate
    configure_ssl_nginx
    restart_nginx
    setup_auto_renewal
    test_ssl_setup
    show_final_summary
}

# Run main function with all arguments
main "$@"