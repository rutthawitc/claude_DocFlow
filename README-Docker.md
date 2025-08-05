# Docker Deployment Guide

## Quick Start

1. **Copy environment variables**:
   ```bash
   cp .env.example .env
   ```

2. **Update `.env` file** with your secure values:
   - Generate strong passwords for all services
   - Set your domain in `NEXTAUTH_URL`
   - Configure PWA authentication URL

3. **Start services**:
   ```bash
   # Development
   docker-compose up -d

   # Production
   docker-compose -f docker-compose.prod.yml up -d
   ```

## Security Improvements Made

### 🔒 Environment Variables
- All secrets now use environment variables
- No hardcoded passwords in configuration files
- Separate `.env.example` template provided

### 🛡️ Network Security
- Removed external database port exposure (5432)
- Removed external Redis port exposure (6379)
- Services communicate only through internal network

### 🔐 Authentication & Authorization
- PostgreSQL uses SCRAM-SHA-256 authentication
- Redis requires password authentication
- pgAdmin has enhanced security settings

### ⚡ Performance & Reliability
- Health checks for all critical services
- Proper service dependencies with health conditions
- Log rotation configured (10MB max, 3 files)
- Resource limits in production

### 📊 Monitoring
- Structured logging with rotation
- Health check endpoints
- Redis latency monitoring

## File Structure

```
claude_DocFlow/
├── docker-compose.yml          # Development configuration
├── docker-compose.prod.yml     # Production configuration
├── Dockerfile                  # Development Dockerfile
├── Dockerfile.prod            # Optimized production Dockerfile
├── .env.example               # Environment template
├── nginx/
│   ├── nginx.conf            # Main nginx configuration
│   └── conf.d/
│       └── default.conf      # Site configuration
└── redis/
    └── redis.conf            # Redis configuration
```

## Production Deployment

### Prerequisites
- Docker & Docker Compose installed
- SSL certificates (for HTTPS)
- Domain name configured

### Steps

1. **Prepare environment**:
   ```bash
   cp .env.example .env
   # Edit .env with production values
   ```

2. **SSL Certificates** (for production):
   ```bash
   mkdir certs
   # Copy your SSL certificates to ./certs/
   ```

3. **Deploy**:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

4. **Initialize database**:
   ```bash
   docker-compose -f docker-compose.prod.yml exec app pnpm docflow:init
   ```

### Backup Strategy

- **Database**: Regular PostgreSQL dumps
- **Files**: Volume backups of `postgres_data` and `redis_data`
- **Application**: Docker image versioning

### Monitoring

- Application health: `http://your-domain/api/health`
- nginx health: `http://your-domain/health`
- Container logs: `docker-compose logs -f [service]`

## Development vs Production

| Feature | Development | Production |
|---------|-------------|------------|
| Build | Standard Dockerfile | Multi-stage optimized |
| Networking | Exposed ports | Internal only |
| SSL | HTTP only | HTTPS with nginx |
| Caching | Basic | nginx + Redis optimized |
| Resources | Unlimited | Limited & monitored |
| pgAdmin | Enabled | Disabled by default |

## Troubleshooting

### Health Check Failures
```bash
# Check application health
docker-compose exec app curl -f http://localhost:3000/api/health

# Check service logs
docker-compose logs app
```

### Database Connection Issues
```bash
# Test database connection
docker-compose exec app psql $DATABASE_URL -c "SELECT 1;"

# Check database logs
docker-compose logs db
```

### Redis Connection Issues
```bash
# Test Redis connection
docker-compose exec redis redis-cli -a $REDIS_PASSWORD ping
```

## Security Checklist

- [ ] All default passwords changed
- [ ] Environment variables properly secured
- [ ] SSL certificates configured (production)
- [ ] External ports reviewed and minimized
- [ ] Log rotation configured
- [ ] Backup strategy implemented
- [ ] Monitoring alerts configured