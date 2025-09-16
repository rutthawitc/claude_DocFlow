#!/bin/bash
# Production Testing Script for DocFlow

set -e

echo "🧪 DocFlow Production Testing Script"
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Step 1: Clean up existing DocFlow containers only
print_status "Step 1: Cleaning up existing DocFlow containers..."
docker-compose down -v 2>/dev/null || true

# Clean up only DocFlow test containers and images (safer approach)
print_status "Removing previous DocFlow test containers and images..."
docker rm -f docflow_test_app docflow_test_db docflow_test_redis 2>/dev/null || true
docker rmi docflow:test-prod 2>/dev/null || true
docker network rm docflow_test_default 2>/dev/null || true

# Step 2: Build production image
print_status "Step 2: Building production Docker image..."
docker build -t docflow:test-prod .
if [ $? -eq 0 ]; then
    print_success "Production image built successfully"
else
    print_error "Failed to build production image"
    exit 1
fi

# Step 3: Check image size
print_status "Step 3: Checking image size..."
IMAGE_SIZE=$(docker images docflow:test-prod --format "table {{.Size}}" | tail -n 1)
print_status "Production image size: $IMAGE_SIZE"

# Step 4: Start production environment
print_status "Step 4: Starting production environment..."
cp .env.example .env.test
echo "NODE_ENV=production" >> .env.test

# Create temporary docker-compose for testing
cat > docker-compose.test.yml << EOF
version: '3.8'
services:
  app:
    image: docflow:test-prod
    container_name: docflow_test_app
    ports:
      - "3001:3000"
    env_file:
      - .env.test
    depends_on:
      - db
      - redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 30s

  db:
    image: postgres:17.5-alpine
    container_name: docflow_test_db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: test_password
      POSTGRES_DB: docflow_test_db
    ports:
      - "5433:5432"
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "postgres"]
      interval: 5s
      timeout: 3s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: docflow_test_redis
    command: redis-server --requirepass test_redis_password
    ports:
      - "6380:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 3
EOF

docker-compose -f docker-compose.test.yml up -d

# Step 5: Wait for services to be healthy
print_status "Step 5: Waiting for services to be healthy..."
sleep 10

# Check database health
print_status "Checking database health..."
for i in {1..30}; do
    if docker-compose -f docker-compose.test.yml exec -T db pg_isready -U postgres > /dev/null 2>&1; then
        print_success "Database is healthy"
        break
    fi
    echo -n "."
    sleep 2
done

# Check Redis health
print_status "Checking Redis health..."
if docker-compose -f docker-compose.test.yml exec -T redis redis-cli ping > /dev/null 2>&1; then
    print_success "Redis is healthy"
else
    print_warning "Redis connection failed (non-critical)"
fi

# Step 6: Wait for application to start
print_status "Step 6: Waiting for application to start..."
for i in {1..60}; do
    if curl -s http://localhost:3001/api/health > /dev/null; then
        print_success "Application is responding"
        break
    fi
    echo -n "."
    sleep 2
done

# Step 7: Run health checks
print_status "Step 7: Running comprehensive health checks..."

# Health endpoint test
print_status "Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:3001/api/health)
if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
    print_success "Health check passed"
    echo "$HEALTH_RESPONSE" | jq '.' 2>/dev/null || echo "$HEALTH_RESPONSE"
else
    print_error "Health check failed"
    echo "$HEALTH_RESPONSE"
fi

# Step 8: Test main pages
print_status "Step 8: Testing main application pages..."

# Test login page
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/login | grep -q "200"; then
    print_success "Login page accessible"
else
    print_error "Login page failed"
fi

# Test API endpoints
print_status "Testing API endpoints..."
API_ENDPOINTS=(
    "/api/health"
    "/api/branches"
)

for endpoint in "${API_ENDPOINTS[@]}"; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001$endpoint)
    if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "401" ]]; then
        print_success "Endpoint $endpoint: $HTTP_CODE"
    else
        print_error "Endpoint $endpoint failed: $HTTP_CODE"
    fi
done

# Step 9: Performance test
print_status "Step 9: Basic performance test..."
print_status "Testing response times..."

for i in {1..5}; do
    RESPONSE_TIME=$(curl -s -w "%{time_total}" -o /dev/null http://localhost:3001/api/health)
    print_status "Response time $i: ${RESPONSE_TIME}s"
done

# Step 10: Memory and resource usage
print_status "Step 10: Checking resource usage..."
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" docflow_test_app

# Step 11: Check logs for errors
print_status "Step 11: Checking application logs for errors..."
LOG_ERRORS=$(docker-compose -f docker-compose.test.yml logs app 2>&1 | grep -i error | wc -l)
if [ "$LOG_ERRORS" -eq 0 ]; then
    print_success "No errors found in logs"
else
    print_warning "Found $LOG_ERRORS error(s) in logs"
    docker-compose -f docker-compose.test.yml logs app | grep -i error | tail -5
fi

# Step 12: Security headers test
print_status "Step 12: Testing security headers..."
SECURITY_HEADERS=$(curl -s -I http://localhost:3001/ | grep -E "(X-Frame-Options|X-XSS-Protection|X-Content-Type-Options|Content-Security-Policy)")
if [ -n "$SECURITY_HEADERS" ]; then
    print_success "Security headers present:"
    echo "$SECURITY_HEADERS"
else
    print_warning "Some security headers might be missing"
fi

# Cleanup
print_status "Cleaning up test environment..."
docker-compose -f docker-compose.test.yml down -v
rm -f docker-compose.test.yml .env.test

print_success "Production testing completed!"
echo ""
echo "Summary:"
echo "- Docker image: docflow:test-prod"
echo "- Image size: $IMAGE_SIZE"
echo "- All tests completed"
echo ""
echo "Next steps:"
echo "1. Review any warnings or errors above"
echo "2. Test with real data in staging environment"
echo "3. Run load tests if needed"
echo "4. Deploy to production when ready"