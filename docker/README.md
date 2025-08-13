# Docker Development Environment

This directory contains configuration files for the DocFlow development environment.

## Services Available

### Core Services
- **PostgreSQL** (port 5432) - Main database
- **Redis** (port 6379) - Caching and sessions
- **pgAdmin** (port 5050) - Database management UI

### Development Tools
- **Redis Commander** (port 8081) - Redis management UI

## Quick Start

```bash
# Start all services
docker-compose up -d

# Start only core services
docker-compose up -d db redis pgadmin

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Reset all data (DESTRUCTIVE)
docker-compose down -v
```

## Service Access URLs

- **pgAdmin**: http://localhost:5050 (admin@example.com / admin123)
- **Redis Commander**: http://localhost:8081 (admin / admin123)

## Configuration Files

- `redis/redis-dev.conf` - Redis configuration for development
- `pgadmin/servers.json` - Pre-configured database connections
- `postgres/init/` - Database initialization scripts

## Environment Variables

Key environment variables for your `.env.development`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/docflow_db
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis123

# File uploads (local filesystem)
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
```

## Useful Commands

```bash
# Database operations
docker-compose exec db psql -U postgres -d docflow_db

# Redis operations
docker-compose exec redis redis-cli -a redis123

# View container status
docker-compose ps

# Check logs for specific service
docker-compose logs -f db

# Restart a service
docker-compose restart redis

# Scale a service (if needed)
docker-compose up -d --scale redis=2
```

## Troubleshooting

### Port Conflicts
If you get port conflicts, modify the ports in `docker-compose.override.yml`:

```yaml
services:
  db:
    ports:
      - "5433:5432"
```

### Performance Issues
- Increase Docker Desktop memory allocation
- Adjust Redis maxmemory in `redis-dev.conf`
- Monitor container resource usage: `docker stats`

### Data Persistence
All data is stored in named Docker volumes. To backup:

```bash
# Backup database
docker-compose exec db pg_dump -U postgres docflow_db > backup.sql

# Backup redis
docker-compose exec redis redis-cli -a redis123 --rdb /data/backup.rdb
```