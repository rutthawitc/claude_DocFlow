# 🧪 Production Testing Guide

## คู่มือการทดสอบระบบ Production สำหรับ DocFlow

คู่มือนี้ครอบคลุมการทดสอบระบบ DocFlow ก่อนและหลังการ deploy ไปยัง production

**Status**: ✅ Updated for current Docker deployment (September 2025)
**Deployment Method**: Docker Hub images with automated testing scripts

---

## 🎯 **Testing Strategy Overview**

### **1. 🏠 Local Production Testing**
- ทดสอบ production build ในเครื่องตัวเอง
- ตรวจสอบ Docker image และ performance
- ทดสอบ security headers และ health checks

### **2. 🎭 Staging Environment Testing**
- ทดสอบใน environment ที่เหมือน production
- ทดสอบ integration กับ external services
- ทดสอบ backup และ recovery

### **3. ⚡ Load Testing**
- ทดสอบภาระงาน (load testing)
- ทดสอบประสิทธิภาพ (performance testing)
- ทดสอบความเสถียร (stress testing)

### **4. 🔒 Security Testing**
- ทดสอบ authentication และ authorization
- ทดสอบ security headers
- ทดสอบ vulnerability scanning

---

## 🏠 **1. Local Production Testing**

### **Quick Start - Automated Testing**

#### Run Comprehensive Production Test
```bash
# Run complete production test suite
./scripts/test-production.sh
```

**What it tests:**
- ✅ Docker image building
- ✅ Container startup and health
- ✅ Database connectivity
- ✅ Redis connectivity
- ✅ API endpoints
- ✅ Security headers
- ✅ Performance metrics
- ✅ Resource usage
- ✅ Error logs

#### Expected Results:
```bash
🧪 DocFlow Production Testing Script
====================================
[SUCCESS] Production image built successfully
[INFO] Production image size: 156MB
[SUCCESS] Database is healthy
[SUCCESS] Redis is healthy
[SUCCESS] Application is responding
[SUCCESS] Health check passed
[SUCCESS] Login page accessible
[SUCCESS] Endpoint /api/health: 200
[SUCCESS] No errors found in logs
[SUCCESS] Security headers present
[SUCCESS] Production testing completed!
```

### **Manual Step-by-Step Testing**

#### **Step 1: Build Production Image**
```bash
# Build production Docker image
docker build -t docflow:prod-test .

# Check image size (should be < 200MB)
docker images docflow:prod-test

# Inspect image layers
docker history docflow:prod-test
```

#### **Step 2: Run Production Container**
```bash
# Start production environment
docker-compose -f docker-compose.prod.yml up -d

# Check container health
docker-compose ps
docker-compose logs app

# Verify all services are healthy
docker inspect docflow_app | grep -A 10 '"Health"'
```

#### **Step 3: Test Core Functionality**
```bash
# Health check
curl http://localhost:3000/api/health | jq '.'

# Login page
curl -I http://localhost:3000/login

# API endpoints
curl http://localhost:3000/api/branches

# Security headers
curl -I http://localhost:3000/ | grep -E "(X-Frame|X-XSS|Content-Security)"
```

#### **Step 4: Performance Testing**
```bash
# Run load tests
./scripts/load-test.sh

# Monitor resource usage
docker stats docflow_app

# Check response times
time curl http://localhost:3000/api/health
```

---

## ⚡ **2. Load Testing**

### **Automated Load Testing**
```bash
# Run comprehensive load test
./scripts/load-test.sh
```

### **Manual Load Testing**

#### **A. Health Check Load Test**
```bash
# Test with Apache Bench (10 concurrent, 1000 requests)
ab -n 1000 -c 10 http://localhost:3000/api/health

# Expected results:
# - Requests per second: > 100
# - Time per request: < 100ms
# - Failed requests: 0
```

#### **B. API Endpoints Load Test**
```bash
# Test branches API
ab -n 500 -c 5 http://localhost:3000/api/branches

# Test login page
ab -n 200 -c 5 http://localhost:3000/login
```

#### **C. Stress Testing**
```bash
# High concurrency test (careful with this!)
ab -n 2000 -c 50 -t 60 http://localhost:3000/api/health

# Monitor during stress test
watch -n 1 'docker stats --no-stream docflow_app'
```

### **Load Testing with curl**
```bash
# Simple concurrent testing
for i in {1..100}; do
  curl -s http://localhost:3000/api/health > /dev/null &
done
wait

# File upload load test (with authentication)
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/documents \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -F "file=@test.pdf" \
    -F "mtNumber=TEST-$i" \
    -F "subject=Load Test $i" \
    -F "branchBaCode=1060" &
done
wait
```

---

## 🎭 **3. Staging Environment Testing**

### **Staging Environment Setup**

#### **A. Create Staging Docker Compose**
```yaml
# docker-compose.staging.yml
version: '3.8'
services:
  app:
    image: docflow:staging
    container_name: docflow_staging
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:staging_pass@staging_db:5432/docflow_staging
    ports:
      - "3000:3000"
    volumes:
      - staging_uploads:/app/uploads
      - staging_tmp:/app/tmp

  staging_db:
    image: postgres:17.5-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: staging_pass
      POSTGRES_DB: docflow_staging
    volumes:
      - staging_db_data:/var/lib/postgresql/data

volumes:
  staging_uploads:
  staging_tmp:
  staging_db_data:
```

#### **B. Deploy to Staging**
```bash
# Build staging image
docker build -t docflow:staging .

# Start staging environment
docker-compose -f docker-compose.staging.yml up -d

# Initialize database
docker-compose -f docker-compose.staging.yml exec app pnpm db:push
docker-compose -f docker-compose.staging.yml exec app pnpm docflow:init
```

### **Staging Test Scenarios**

#### **1. End-to-End User Workflows**
```bash
# Test complete document workflow
# 1. Login → 2. Upload → 3. View → 4. Comment → 5. Status Update

# Login test
curl -X POST http://staging.docflow.local/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"username":"test_user","password":"test_pass"}'

# Upload document
curl -X POST http://staging.docflow.local/api/documents \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@test.pdf" \
  -F "mtNumber=STAGING-001" \
  -F "subject=Staging Test Document"

# View document
curl http://staging.docflow.local/api/documents/1

# Add comment
curl -X POST http://staging.docflow.local/api/documents/1/comments \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Staging test comment"}'
```

#### **2. External Integration Testing**
```bash
# Test PWA authentication
curl -X POST "$PWA_AUTH_URL" \
  -H "Content-Type: application/json" \
  -d '{"username":"real_user","password":"real_pass"}'

# Test Telegram notifications
curl -X POST http://staging.docflow.local/api/telegram/test-message \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"Staging test notification"}'
```

#### **3. Database Migration Testing**
```bash
# Test database migration from backup
docker-compose -f docker-compose.staging.yml exec staging_db \
  pg_dump -U postgres docflow_staging > staging_backup.sql

# Test restore
docker-compose -f docker-compose.staging.yml exec -T staging_db \
  psql -U postgres docflow_staging < staging_backup.sql
```

---

## 🔒 **4. Security Testing**

### **Authentication Testing**
```bash
# Test without authentication
curl -I http://localhost:3000/api/documents
# Expected: 401 Unauthorized

# Test with invalid token
curl -H "Authorization: Bearer invalid_token" \
  http://localhost:3000/api/documents
# Expected: 401 Unauthorized

# Test rate limiting
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/auth/signin \
    -H "Content-Type: application/json" \
    -d '{"username":"wrong","password":"wrong"}'
done
# Expected: 429 Too Many Requests after 5 attempts
```

### **Security Headers Testing**
```bash
# Check all security headers
curl -I http://localhost:3000/ | grep -E "(X-|Content-Security|Strict-Transport)"

# Expected headers:
# X-Frame-Options: SAMEORIGIN
# X-XSS-Protection: 1; mode=block
# X-Content-Type-Options: nosniff
# Content-Security-Policy: default-src 'self'...
```

### **File Upload Security Testing**
```bash
# Test file type validation
curl -X POST http://localhost:3000/api/documents \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@malicious.exe" \
  -F "mtNumber=TEST-SECURITY"
# Expected: 400 Bad Request (invalid file type)

# Test file size limit
# Create large file (>10MB)
dd if=/dev/zero of=large.pdf bs=1M count=15
curl -X POST http://localhost:3000/api/documents \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@large.pdf" \
  -F "mtNumber=TEST-SIZE"
# Expected: 413 Payload Too Large
```

---

## 📊 **5. Performance Monitoring**

### **Real-time Monitoring During Tests**

#### **Resource Monitoring**
```bash
# Monitor Docker container resources
watch -n 1 'docker stats --no-stream'

# Monitor system resources
htop
# or
top

# Monitor disk usage
watch -n 5 'df -h'

# Monitor network
nethogs
# or
iftop
```

#### **Application Monitoring**
```bash
# Monitor API response times
while true; do
  time curl -s http://localhost:3000/api/health > /dev/null
  sleep 1
done

# Monitor error logs
docker-compose logs -f app | grep -i error

# Monitor database connections
docker-compose exec db psql -U postgres -d docflow_db \
  -c "SELECT count(*) FROM pg_stat_activity;"
```

### **Performance Benchmarks**

#### **Expected Performance Metrics:**

| Metric | Target | Good | Needs Attention |
|--------|--------|------|-----------------|
| **Health Check Response** | < 50ms | < 100ms | > 200ms |
| **API Response Time** | < 200ms | < 500ms | > 1000ms |
| **File Upload (5MB)** | < 5s | < 10s | > 15s |
| **PDF Render Time** | < 2s | < 5s | > 10s |
| **Memory Usage** | < 512MB | < 1GB | > 2GB |
| **CPU Usage (idle)** | < 10% | < 20% | > 50% |

#### **Load Test Targets:**

| Test | Concurrent Users | Duration | Success Rate |
|------|------------------|----------|--------------|
| **Light Load** | 10 users | 5 minutes | 99.9% |
| **Normal Load** | 50 users | 15 minutes | 99.5% |
| **Peak Load** | 100 users | 10 minutes | 99% |
| **Stress Test** | 200 users | 5 minutes | 95% |

---

## 🚀 **6. Pre-Production Checklist**

### **Before Deploying to Production:**

#### **✅ Technical Checklist**
- [ ] Production Docker image builds successfully
- [ ] All automated tests pass
- [ ] Load tests meet performance targets
- [ ] Security headers are configured
- [ ] Database migrations work correctly
- [ ] Backup and recovery tested
- [ ] Health checks are working
- [ ] External integrations tested (PWA auth, Telegram)
- [ ] SSL certificates are valid
- [ ] Environment variables are configured
- [ ] Logging is properly configured

#### **✅ Operational Checklist**
- [ ] Monitoring dashboards ready
- [ ] Alert notifications configured
- [ ] Backup schedule configured
- [ ] Disaster recovery plan tested
- [ ] Team is trained on production procedures
- [ ] Documentation is up to date
- [ ] Rollback plan is prepared
- [ ] Maintenance window scheduled
- [ ] Stakeholders notified

#### **✅ Security Checklist**
- [ ] Authentication is working properly
- [ ] Authorization rules are enforced
- [ ] Rate limiting is configured
- [ ] File upload restrictions work
- [ ] Security headers are present
- [ ] HTTPS is enforced
- [ ] Secrets are properly managed
- [ ] Database access is restricted

---

## 🛠️ **7. Testing Tools and Scripts**

### **Available Scripts**
```bash
# Comprehensive production testing
./scripts/test-production.sh

# Load testing
./scripts/load-test.sh

# Security testing
./scripts/security-test.sh

# Database testing
./scripts/db-test.sh
```

### **External Testing Tools**

#### **Load Testing Tools:**
- **Apache Bench (ab)**: Built-in HTTP benchmarking
- **wrk**: Modern HTTP benchmarking tool
- **Artillery**: Advanced load testing toolkit
- **k6**: Developer-focused load testing

#### **Security Testing Tools:**
- **OWASP ZAP**: Web application security scanner
- **Nmap**: Network security scanner
- **SSL Labs**: SSL/TLS configuration testing

#### **Monitoring Tools:**
- **htop**: Process monitoring
- **iotop**: I/O monitoring
- **nethogs**: Network monitoring
- **docker stats**: Container resource monitoring

---

## 📋 **8. Test Results Documentation**

### **Test Report Template**
```markdown
# DocFlow Production Test Report

**Date:** [Test Date]
**Version:** [App Version]
**Tester:** [Your Name]

## Test Summary
- ✅ Docker Build: PASS
- ✅ Health Checks: PASS
- ✅ Load Test: PASS (150 req/sec)
- ✅ Security: PASS
- ⚠️ Performance: WARNING (high memory usage)

## Issues Found
1. Memory usage higher than expected (1.2GB)
2. Some API responses > 500ms under load

## Recommendations
1. Optimize database queries
2. Implement response caching
3. Monitor memory usage in production

## Next Steps
1. Address performance issues
2. Re-test with optimizations
3. Schedule production deployment
```

---

## 🔄 **9. Continuous Testing Strategy**

### **Automated Testing Pipeline**
```yaml
# .github/workflows/production-test.yml
name: Production Testing
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  production-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build production image
        run: docker build -t docflow:test .
      - name: Run production tests
        run: ./scripts/test-production.sh
      - name: Run load tests
        run: ./scripts/load-test.sh
```

### **Monitoring in Production**
```bash
# Set up continuous monitoring
curl -X POST http://your-monitoring-service.com/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://docflow.example.com/api/health",
    "interval": "1m",
    "timeout": "10s",
    "alert_threshold": "5m"
  }'
```

---

*คู่มือการทดสอบ Production ฉบับนี้อัปเดตล่าสุด: กันยายน 2025*