#!/bin/bash
# Load Testing Script for DocFlow

set -e

echo "⚡ DocFlow Load Testing Script"
echo "============================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Configuration
BASE_URL="http://localhost:3000"
CONCURRENT_USERS=10
TEST_DURATION=60
RAMP_UP_TIME=30

# Check if application is running
print_status "Checking if DocFlow is running..."
if ! curl -s "$BASE_URL/api/health" > /dev/null; then
    print_error "DocFlow is not running at $BASE_URL"
    echo "Please start the application first:"
    echo "  docker-compose up -d"
    exit 1
fi
print_success "DocFlow is running"

# Check if required tools are installed
print_status "Checking required tools..."

# Check for curl
if ! command -v curl &> /dev/null; then
    print_error "curl is required but not installed"
    exit 1
fi

# Check for ab (Apache Bench)
if ! command -v ab &> /dev/null; then
    print_warning "Apache Bench (ab) not found. Installing..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install httpd
        else
            print_error "Please install Apache Bench: brew install httpd"
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        sudo apt-get update && sudo apt-get install -y apache2-utils
    fi
fi

# Create results directory
mkdir -p ./load-test-results
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RESULT_DIR="./load-test-results/$TIMESTAMP"
mkdir -p "$RESULT_DIR"

print_status "Load test results will be saved to: $RESULT_DIR"

# Test 1: Health Check Endpoint
print_status "Test 1: Health Check Load Test"
print_status "Running $CONCURRENT_USERS concurrent requests for ${TEST_DURATION}s..."

ab -n 1000 -c $CONCURRENT_USERS -t $TEST_DURATION \
   -g "$RESULT_DIR/health_check.tsv" \
   "$BASE_URL/api/health" > "$RESULT_DIR/health_check.txt" 2>&1

if [ $? -eq 0 ]; then
    print_success "Health check load test completed"
    # Extract key metrics
    REQUESTS_PER_SEC=$(grep "Requests per second" "$RESULT_DIR/health_check.txt" | awk '{print $4}')
    MEAN_TIME=$(grep "Time per request" "$RESULT_DIR/health_check.txt" | head -1 | awk '{print $4}')
    print_status "Health Check Results: $REQUESTS_PER_SEC req/sec, ${MEAN_TIME}ms avg response time"
else
    print_error "Health check load test failed"
fi

# Test 2: Login Page Load Test
print_status "Test 2: Login Page Load Test"

ab -n 500 -c 5 \
   -g "$RESULT_DIR/login_page.tsv" \
   "$BASE_URL/login" > "$RESULT_DIR/login_page.txt" 2>&1

if [ $? -eq 0 ]; then
    print_success "Login page load test completed"
    REQUESTS_PER_SEC=$(grep "Requests per second" "$RESULT_DIR/login_page.txt" | awk '{print $4}')
    print_status "Login Page Results: $REQUESTS_PER_SEC req/sec"
else
    print_warning "Login page load test had issues (check authentication)"
fi

# Test 3: API Endpoints Stress Test
print_status "Test 3: API Endpoints Stress Test"

# Test branches endpoint
ab -n 200 -c 5 \
   "$BASE_URL/api/branches" > "$RESULT_DIR/api_branches.txt" 2>&1

# Test 4: Memory and CPU monitoring during load
print_status "Test 4: Resource Monitoring During Load"

# Start monitoring in background
(
    echo "timestamp,cpu_percent,memory_usage,memory_limit" > "$RESULT_DIR/resource_usage.csv"
    for i in {1..60}; do
        STATS=$(docker stats --no-stream --format "{{.CPUPerc}},{{.MemUsage}}" 2>/dev/null | head -1)
        if [ -n "$STATS" ]; then
            echo "$(date +%s),$STATS" >> "$RESULT_DIR/resource_usage.csv"
        fi
        sleep 1
    done
) &
MONITOR_PID=$!

# Run concurrent load test
print_status "Running concurrent load test..."
ab -n 500 -c 20 -t 30 "$BASE_URL/api/health" > "$RESULT_DIR/concurrent_load.txt" 2>&1

# Stop monitoring
kill $MONITOR_PID 2>/dev/null || true
wait $MONITOR_PID 2>/dev/null || true

# Test 5: File Upload Simulation (if test file exists)
if [ -f "test-document.pdf" ]; then
    print_status "Test 5: File Upload Load Test"
    
    # Create a simple test script for file upload
    cat > "$RESULT_DIR/upload_test.sh" << 'EOF'
#!/bin/bash
for i in {1..5}; do
    curl -s -X POST "$1/api/documents" \
         -F "file=@test-document.pdf" \
         -F "mtNumber=TEST-$i" \
         -F "subject=Load Test $i" \
         -F "branchBaCode=1060" \
         -F "mtDate=2024-01-01" \
         -F "monthYear=มกราคม 2567" > /dev/null
    echo "Upload test $i completed"
done
EOF
    chmod +x "$RESULT_DIR/upload_test.sh"
    print_status "File upload test script created (manual execution required with authentication)"
else
    print_warning "No test-document.pdf found, skipping upload load test"
fi

# Test 6: Database Connection Pool Test
print_status "Test 6: Database Connection Stress Test"

# Rapid API calls to test connection pooling
for i in {1..50}; do
    curl -s "$BASE_URL/api/health" > /dev/null &
done
wait

print_success "Database connection stress test completed"

# Generate Report
print_status "Generating load test report..."

cat > "$RESULT_DIR/load_test_report.md" << EOF
# DocFlow Load Test Report

**Test Date:** $(date)
**Test Duration:** ${TEST_DURATION} seconds
**Concurrent Users:** ${CONCURRENT_USERS}
**Base URL:** ${BASE_URL}

## Test Results Summary

### 1. Health Check Endpoint
- **Requests per second:** $(grep "Requests per second" "$RESULT_DIR/health_check.txt" 2>/dev/null | awk '{print $4}' || echo "N/A")
- **Average response time:** $(grep "Time per request" "$RESULT_DIR/health_check.txt" 2>/dev/null | head -1 | awk '{print $4}' || echo "N/A")ms
- **Failed requests:** $(grep "Failed requests" "$RESULT_DIR/health_check.txt" 2>/dev/null | awk '{print $3}' || echo "N/A")

### 2. Login Page
- **Requests per second:** $(grep "Requests per second" "$RESULT_DIR/login_page.txt" 2>/dev/null | awk '{print $4}' || echo "N/A")
- **Average response time:** $(grep "Time per request" "$RESULT_DIR/login_page.txt" 2>/dev/null | head -1 | awk '{print $4}' || echo "N/A")ms

### 3. Resource Usage
- **Peak CPU:** $(tail -n +2 "$RESULT_DIR/resource_usage.csv" 2>/dev/null | cut -d',' -f2 | sort -n | tail -1 || echo "N/A")
- **Peak Memory:** $(tail -n +2 "$RESULT_DIR/resource_usage.csv" 2>/dev/null | cut -d',' -f3 | tail -1 || echo "N/A")

## Files Generated
- \`health_check.txt\` - Detailed health check results
- \`login_page.txt\` - Login page load test results
- \`resource_usage.csv\` - CPU and memory usage during tests
- \`concurrent_load.txt\` - Concurrent load test results

## Recommendations
1. Monitor failed requests - should be 0
2. Response time should be < 100ms for health checks
3. Memory usage should remain stable
4. No error logs should appear during testing

## Next Steps
1. Review detailed results in individual files
2. Run tests with higher load if performance is good
3. Test with real user scenarios
4. Monitor production metrics

EOF

print_success "Load test completed!"
echo ""
echo "📊 Results saved to: $RESULT_DIR"
echo "📋 Report available at: $RESULT_DIR/load_test_report.md"
echo ""
echo "Quick Summary:"
if [ -f "$RESULT_DIR/health_check.txt" ]; then
    echo "- Health Check: $(grep "Requests per second" "$RESULT_DIR/health_check.txt" | awk '{print $4}') req/sec"
    echo "- Response Time: $(grep "Time per request" "$RESULT_DIR/health_check.txt" | head -1 | awk '{print $4}')ms"
    echo "- Failed Requests: $(grep "Failed requests" "$RESULT_DIR/health_check.txt" | awk '{print $3}')"
fi
echo ""
echo "View detailed report:"
echo "  cat $RESULT_DIR/load_test_report.md"
echo ""
echo "Check resource usage:"
echo "  cat $RESULT_DIR/resource_usage.csv"