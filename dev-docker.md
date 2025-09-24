# Docker Development Commands

## Recommended Development Setup

### 1. Start Database Services Only (Recommended)
```bash
# Start PostgreSQL and Redis in containers
docker-compose up -d db redis

# Run the Next.js app locally with hot reload
pnpm dev
```

**Benefits:**
- Fast startup (no app build time)
- Hot reload for instant code changes
- Easy debugging with dev tools
- Database consistency across team

### 2. Check Service Status
```bash
# Check which containers are running
docker-compose ps

# Check container logs
docker-compose logs db
docker-compose logs redis
```

### 3. Stop Services
```bash
# Stop all services
docker-compose down

# Stop specific services
docker-compose stop db redis
```

## Alternative Development Commands

### Full Docker Stack (Slower)
```bash
# Everything in Docker (3-5 minute build time)
docker-compose up -d --build

# View app logs
docker-compose logs -f app
```

### Development with Logs Visible
```bash
# Start with logs in foreground
docker-compose up db redis

# In another terminal
pnpm dev
```

### Rebuild After Changes
```bash
# Rebuild only the app container
docker-compose up -d --build app

# Rebuild everything
docker-compose up -d --build
```

## Database Management

### Initialize DocFlow Data
```bash
# After database is running
pnpm docflow:init
```

### Database Operations
```bash
# Generate migrations
pnpm db:generate

# Push schema changes
pnpm db:push

# Open database studio
pnpm db:studio
```

## Troubleshooting

### Clean Start
```bash
# Stop everything and clean up
docker-compose down --remove-orphans

# Remove volumes (WARNING: deletes data)
docker-compose down -v

# Start fresh
docker-compose up -d db redis
pnpm dev
```

### Port Conflicts
```bash
# Check what's using port 5432
lsof -i :5432

# Kill process if needed
kill -9 <PID>
```

### Build Issues
```bash
# Clear Docker cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache app
```

## Adding Features Workflow

### Method 1: Hybrid Development (Recommended)
```bash
# Keep databases running, develop locally
docker-compose up -d db redis nginx
docker-compose stop app  # Stop app container
pnpm dev                 # Run locally with hot reload
```

### Method 2: Rebuild After Changes
```bash
# 1. Make code changes
# 2. Rebuild image
docker build -f Dockerfile.prod.simple -t docflow-app .
# 3. Restart app container
docker-compose up -d app
```

### Method 3: Switch to Build Mode
```bash
# Edit docker-compose.yml:
# Comment out: image: docflow-app:latest
# Uncomment: build section
# Then run:
docker-compose up -d --build
```

## Quick Reference

| Command | Purpose |
|---------|---------|
| `docker-compose up -d db redis` | Start dev environment |
| `pnpm dev` | Run Next.js with hot reload |
| `docker build -f Dockerfile.prod.simple -t docflow-app .` | Rebuild app image |
| `docker-compose up -d app` | Restart app container |
| `docker-compose ps` | Check container status |
| `docker-compose logs <service>` | View service logs |
| `docker-compose down` | Stop all services |
| `pnpm docflow:init` | Initialize DocFlow data |