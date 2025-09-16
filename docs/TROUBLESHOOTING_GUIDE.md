# 🔧 DocFlow Troubleshooting Guide

## คู่มือการแก้ไขปัญหาระบบ DocFlow

คู่มือนี้รวบรวมปัญหาที่พบบ่อยและวิธีการแก้ไขสำหรับระบบ DocFlow

---

## 🚨 การแก้ไขปัญหาเร่งด่วน

### 1. ระบบไม่ตอบสนอง (System Unresponsive)

#### อาการ:
- เว็บไซต์ไม่เปิด
- Loading นานมาก
- Error 502/503

#### วิธีแก้ไข:
```bash
# 1. ตรวจสอบสถานะ container
docker-compose ps

# 2. ดู logs
docker-compose logs app
docker-compose logs db
docker-compose logs redis

# 3. รีสตาร์ทระบบ
docker-compose restart

# 4. ถ้ายังไม่ได้ ลองลบและสร้างใหม่
docker-compose down
docker-compose up -d
```

#### การตรวจสอบเพิ่มเติม:
```bash
# ตรวจสอบ disk space
df -h

# ตรวจสอบ memory usage
free -h

# ตรวจสอบ process ที่กิน CPU
top
```

### 2. Database Connection Error

#### อาการ:
- "Database connection failed"
- "Connection refused"
- หน้าจอขาว/error 500

#### วิธีแก้ไข:
```bash
# 1. ตรวจสอบ PostgreSQL container
docker-compose ps db

# 2. ตรวจสอบ PostgreSQL logs
docker-compose logs db

# 3. ทดสอบการเชื่อมต่อ
docker-compose exec db psql -U postgres -d docflow_db -c "SELECT 1;"

# 4. รีสตาร์ท database
docker-compose restart db

# 5. ถ้ายังไม่ได้ ลบ volume และสร้างใหม่ (ข้อมูลจะหาย!)
docker-compose down -v
docker-compose up -d
```

#### การกู้คืนข้อมูล:
```bash
# ถ้ามี backup
docker-compose exec -T db psql -U postgres -d docflow_db < backup.sql
```

### 3. Out of Memory

#### อาการ:
- Container หยุดทำงานเอง
- "killed" ใน logs
- ระบบช้ามาก

#### วิธีแก้ไข:
```bash
# 1. ตรวจสอบ memory usage
docker stats

# 2. เพิ่ม memory limit ใน docker-compose.yml
services:
  app:
    mem_limit: 2g

# 3. เพิ่ม swap ถ้าจำเป็น
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 4. รีสตาร์ทระบบ
docker-compose restart
```

### 4. File Upload Failed

#### อาการ:
- "File upload failed"
- "File too large"
- Upload หยุดกลางคัน

#### วิธีแก้ไข:
```bash
# 1. ตรวจสอบ disk space
df -h

# 2. ตรวจสอบ permissions ใน uploads folder
ls -la uploads/
sudo chmod -R 755 uploads/
sudo chown -R $(whoami):$(whoami) uploads/

# 3. ตรวจสอบ file size limit ใน next.config.js
# 4. ตรวจสอบ nginx client_max_body_size (ถ้าใช้)
```

---

## 🔐 ปัญหาการยืนยันตัตน

### 1. ไม่สามารถ Login ได้

#### อาการ:
- "Invalid credentials"
- "Authentication failed"
- Login loop

#### วิธีแก้ไข:

**A. ตรวจสอบ PWA Authentication:**
```bash
# ทดสอบ PWA API
curl -X POST "YOUR_PWA_AUTH_URL" \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'

# ตรวจสอบ environment variable
echo $PWA_AUTH_URL
```

**B. ตรวจสอบ Local Admin:**
```sql
-- ตรวจสอบ local admin users
SELECT * FROM users WHERE isLocalAdmin = true;

-- สร้าง emergency admin
INSERT INTO users (username, firstName, lastName, password, isLocalAdmin) 
VALUES ('emergency', 'Emergency', 'Admin', '$2b$10$hash_here', true);

-- เพิ่มบทบาท admin
INSERT INTO user_roles (userId, roleId) 
SELECT u.id, r.id FROM users u, roles r 
WHERE u.username = 'emergency' AND r.name = 'admin';
```

**C. ตรวจสอบ JWT Configuration:**
```bash
# ตรวจสอบ environment variables
echo $AUTH_SECRET
echo $NEXTAUTH_URL
echo $AUTH_TRUST_HOST

# Generate new secret ถ้าจำเป็น
openssl rand -base64 32
```

### 2. Session หมดอายุบ่อย

#### อาการ:
- ต้อง login ใหม่บ่อยๆ
- "Session expired"

#### วิธีแก้ไข:
```bash
# 1. ตรวจสอบ session configuration
grep -r "SESSION" .env

# 2. เพิ่มเวลา session ใน environment
SESSION_ABSOLUTE_TIMEOUT_SECONDS=28800  # 8 hours
SESSION_IDLE_TIMEOUT_SECONDS=3600       # 1 hour

# 3. ล้าง sessions เก่า
docker-compose exec db psql -U postgres -d docflow_db -c "DELETE FROM sessions WHERE expires < NOW();"

# 4. รีสตาร์ทแอพ
docker-compose restart app
```

### 3. Permission Denied

#### อาการ:
- "Access denied"
- "Insufficient permissions"
- หน้า 403

#### วิธีแก้ไข:
```sql
-- ตรวจสอบ user roles
SELECT u.username, r.name as role_name 
FROM users u
JOIN user_roles ur ON u.id = ur.userId
JOIN roles r ON ur.roleId = r.id
WHERE u.username = 'problem_user';

-- ตรวจสอบ role permissions
SELECT r.name as role_name, p.name as permission_name
FROM roles r
JOIN role_permissions rp ON r.id = rp.roleId
JOIN permissions p ON rp.permissionId = p.id
WHERE r.name = 'problem_role';

-- เพิ่ม role ให้ user
INSERT INTO user_roles (userId, roleId)
SELECT u.id, r.id FROM users u, roles r
WHERE u.username = 'problem_user' AND r.name = 'needed_role';
```

---

## 📄 ปัญหาการจัดการเอกสาร

### 1. PDF ไม่แสดง

#### อาการ:
- หน้าจอว่าง
- "Failed to load PDF"
- Loading ไม่จบ

#### วิธีแก้ไข:

**A. ตรวจสอบไฟล์:**
```bash
# ตรวจสอบไฟล์ที่ upload
ls -la uploads/documents/
file uploads/documents/123.pdf

# ทดสอบเปิด PDF
curl -I http://localhost:3000/api/documents/123/stream
```

**B. ตรวจสอบ PDF.js Worker:**
```bash
# ตรวจสอบ worker files
ls -la public/pdf.worker.js

# ตรวจสอบ browser console สำหรับ errors
# เปิด Developer Tools → Console
```

**C. Browser Compatibility:**
```javascript
// ใน browser console
console.log('PDF.js version:', window.pdfjsLib?.version);
console.log('Worker support:', typeof Worker !== 'undefined');
```

### 2. Upload ไม่สำเร็จ

#### อาการ:
- "Upload failed"
- Progress bar หยุด
- File ไม่ปรากฏในระบบ

#### วิธีแก้ไข:

**A. ตรวจสอบไฟล์:**
```bash
# File size
ls -lh your-file.pdf

# File type
file your-file.pdf

# PDF integrity
pdf-info your-file.pdf  # ถ้าติดตั้ง poppler-utils
```

**B. ตรวจสอบ server logs:**
```bash
# ดู upload logs
docker-compose logs app | grep -i upload
docker-compose logs app | grep -i error
```

**C. ตรวจสอบ permissions:**
```bash
# Directory permissions
ls -la uploads/
ls -la uploads/documents/

# Fix permissions
chmod -R 755 uploads/
```

### 3. เอกสารหายไป

#### อาการ:
- เอกสารที่เคยมีไม่เห็น
- "Document not found"

#### วิธีแก้ไข:
```sql
-- ตรวจสอบเอกสารในฐานข้อมูล
SELECT id, mtNumber, subject, status, createdAt 
FROM documents 
WHERE mtNumber = 'missing_mt_number';

-- ตรวจสอบ soft delete (ถ้ามี)
SELECT * FROM documents WHERE deletedAt IS NOT NULL;

-- ตรวจสอบ branch access
SELECT d.id, d.mtNumber, d.branchBaCode, b.name
FROM documents d
LEFT JOIN branches b ON d.branchBaCode = b.baCode
WHERE d.id = missing_document_id;
```

---

## 💬 ปัญหาระบบ Comments

### 1. Comments ไม่แสดง

#### อาการ:
- หน้า comments ว่าง
- "Failed to load comments"

#### วิธีแก้ไข:
```sql
-- ตรวจสอบ comments ในฐานข้อมูล
SELECT c.*, u.username 
FROM comments c
LEFT JOIN users u ON c.userId = u.id
WHERE c.documentId = document_id
ORDER BY c.createdAt;

-- ตรวจสอบ foreign key constraints
SELECT * FROM comments WHERE userId NOT IN (SELECT id FROM users);
```

### 2. ไม่สามารถเพิ่ม Comment ได้

#### อาการ:
- ปุ่ม "ส่งความคิดเห็น" ไม่ทำงาน
- "Permission denied"

#### วิธีแก้ไข:
```sql
-- ตรวจสอบ permissions
SELECT p.name FROM permissions p
JOIN role_permissions rp ON p.id = rp.permissionId
JOIN roles r ON rp.roleId = r.id
JOIN user_roles ur ON r.id = ur.roleId
JOIN users u ON ur.userId = u.id
WHERE u.id = user_id AND p.name LIKE 'comments:%';

-- ตรวจสอบ document status
SELECT status FROM documents WHERE id = document_id;
```

---

## 📱 ปัญหา Telegram Notifications

### 1. Bot ไม่ส่งข้อความ

#### อาการ:
- Telegram ไม่มีการแจ้งเตือน
- "Telegram notification failed"

#### วิธีแก้ไข:

**A. ตรวจสอบ Bot Token:**
```bash
# ทดสอบ Bot API
curl "https://api.telegram.org/bot$BOT_TOKEN/getMe"

# ผลลัพธ์ควรได้ข้อมูล bot
```

**B. ตรวจสอบ Chat ID:**
```bash
# ทดสอบส่งข้อความ
curl -X POST "https://api.telegram.org/bot$BOT_TOKEN/sendMessage" \
  -H "Content-Type: application/json" \
  -d "{\"chat_id\":\"$CHAT_ID\",\"text\":\"Test message\"}"
```

**C. ตรวจสอบการตั้งค่า:**
```bash
# ตรวจสอบ settings ใน database
docker-compose exec db psql -U postgres -d docflow_db -c "SELECT * FROM system_settings WHERE key LIKE 'telegram%';"

# ตรวจสอบ file settings
cat tmp/telegram-settings.json
```

### 2. Bot ไม่อยู่ใน Group

#### อาการ:
- "Bot is not a member of the chat"
- "Chat not found"

#### วิธีแก้ไข:
1. เพิ่ม Bot เข้า Group/Channel
2. ให้สิทธิ์ Admin ถ้าเป็น Channel
3. ใช้ Chat ID ที่ถูกต้อง (เริ่มด้วย -100 สำหรับ supergroup)

```bash
# วิธีหา Chat ID
# 1. เพิ่ม bot เข้า group
# 2. ส่งข้อความใน group
# 3. เรียก API
curl "https://api.telegram.org/bot$BOT_TOKEN/getUpdates"
```

---

## 🐳 ปัญหา Docker

### 1. Container ไม่เริ่มต้น

#### อาการ:
- "Container failed to start"
- Exit code 1

#### วิธีแก้ไข:
```bash
# ดู logs ละเอียด
docker-compose logs --timestamps app

# ตรวจสอบ container status
docker-compose ps

# ลองรัน container แบบ interactive
docker-compose exec app /bin/sh

# ตรวจสอบ environment variables
docker-compose exec app env | grep -E "(DATABASE|AUTH|PWA)"
```

### 2. Port Conflict

#### อาการ:
- "Port already in use"
- "bind: address already in use"

#### วิธีแก้ไข:
```bash
# หา process ที่ใช้ port
sudo lsof -i :3000
sudo lsof -i :5432

# ฆ่า process
sudo kill -9 PID

# เปลี่ยน port ใน docker-compose.yml
ports:
  - "3001:3000"  # ใช้ port 3001 แทน
```

### 3. Volume Permission Issues

#### อาการ:
- "Permission denied"
- Files ไม่ save

#### วิธีแก้ไข:
```bash
# ตรวจสอบ ownership
ls -la uploads/
ls -la tmp/

# แก้ไข ownership
sudo chown -R $USER:$USER uploads/
sudo chown -R $USER:$USER tmp/

# แก้ไข permissions
chmod -R 755 uploads/
chmod -R 755 tmp/
```

---

## 🔧 ปัญหาประสิทธิภาพ

### 1. ระบบช้า

#### อาการ:
- Loading นาน
- Response time สูง
- Timeout

#### วิธีแก้ไข:

**A. ตรวจสอบ Database Performance:**
```sql
-- ดู slow queries
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;

-- ตรวจสอบ connections
SELECT count(*) FROM pg_stat_activity;

-- ตรวจสอบ locks
SELECT * FROM pg_locks WHERE NOT GRANTED;
```

**B. ตรวจสอบ Cache:**
```bash
# Cache statistics
curl http://localhost:3000/api/cache/stats

# Redis ถ้าใช้
docker-compose exec redis redis-cli info stats
```

**C. ตรวจสอบ Resource Usage:**
```bash
# Memory และ CPU
docker stats

# Disk I/O
iostat -x 1

# Network
netstat -i
```

### 2. Memory Leak

#### อาการ:
- Memory usage เพิ่มเรื่อยๆ
- Container รีสตาร์ทเอง

#### วิธีแก้ไข:
```bash
# ตรวจสอบ memory usage รายละเอียด
docker-compose exec app ps aux

# Set memory limit
# ใน docker-compose.yml
services:
  app:
    mem_limit: 2g
    oom_kill_disable: false

# Monitor memory usage
watch -n 5 'docker stats --no-stream'
```

---

## 🚦 การแก้ไขปัญหาเฉพาะกิจ

### 1. ข้อมูลผิดพลาดใน Database

#### การแก้ไข MT Number ที่ซ้ำ:
```sql
-- หา MT Number ที่ซ้ำ
SELECT mtNumber, COUNT(*) 
FROM documents 
GROUP BY mtNumber 
HAVING COUNT(*) > 1;

-- แก้ไขด้วยการเพิ่ม suffix
UPDATE documents 
SET mtNumber = mtNumber || '-' || id 
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY mtNumber ORDER BY id) as rn
    FROM documents
  ) t WHERE rn > 1
);
```

#### การแก้ไข Branch Code ผิด:
```sql
-- ตรวจสอบ branch codes ที่ไม่ถูกต้อง
SELECT DISTINCT d.branchBaCode 
FROM documents d 
LEFT JOIN branches b ON d.branchBaCode = b.baCode 
WHERE b.baCode IS NULL;

-- อัปเดต branch code
UPDATE documents 
SET branchBaCode = correct_branch_code 
WHERE branchBaCode = wrong_branch_code;
```

### 2. การกู้คืนข้อมูลที่หายไป

#### กู้คืนจาก Backup:
```bash
# หยุดระบบก่อน
docker-compose stop app

# Restore database
docker-compose exec -T db psql -U postgres -d docflow_db < backup_file.sql

# Restore files
tar -xzf files_backup.tar.gz

# เริ่มระบบใหม่
docker-compose start app
```

#### การ Rebuild ข้อมูล:
```sql
-- Rebuild comment counts
UPDATE documents 
SET commentCount = (
  SELECT COUNT(*) 
  FROM comments 
  WHERE comments.documentId = documents.id
);

-- Rebuild user statistics
-- ตามความเหมาะสม
```

---

## 📋 Diagnostic Commands

### ชุดคำสั่งตรวจสอบระบบ

#### `health-check.sh`
```bash
#!/bin/bash
echo "=== DocFlow System Health Check ==="

# 1. Container Status
echo "1. Container Status:"
docker-compose ps

# 2. Application Health
echo "2. Application Health:"
curl -s http://localhost:3000/api/health | jq '.'

# 3. Database Connection
echo "3. Database:"
docker-compose exec -T db pg_isready -U postgres

# 4. Redis Connection
echo "4. Redis:"
docker-compose exec -T redis redis-cli ping

# 5. Disk Space
echo "5. Disk Usage:"
df -h | grep -E '/$|/var'

# 6. Memory Usage
echo "6. Memory:"
free -h

# 7. Recent Errors
echo "7. Recent Errors:"
docker-compose logs --tail=10 app | grep -i error
```

#### `system-info.sh`
```bash
#!/bin/bash
echo "=== System Information ==="

# System details
echo "OS: $(uname -a)"
echo "Docker: $(docker --version)"
echo "Docker Compose: $(docker-compose --version)"

# Environment
echo "Environment Variables:"
env | grep -E "(DATABASE|AUTH|PWA|NODE_ENV)" | sort

# Database info
echo "Database Info:"
docker-compose exec -T db psql -U postgres -d docflow_db -c "
  SELECT 
    COUNT(*) as total_documents,
    COUNT(*) FILTER (WHERE status = 'draft') as drafts,
    COUNT(*) FILTER (WHERE status = 'sent_to_branch') as sent
  FROM documents;
"

# File statistics
echo "File Statistics:"
find uploads/ -type f | wc -l
du -sh uploads/
```

---

## 📞 Getting Help

### การรายงานปัญหา

#### ข้อมูลที่ต้องการ:
1. **คำอธิบายปัญหา**: อาการที่เกิดขึ้น
2. **Steps to Reproduce**: ขั้นตอนที่ทำให้เกิดปัญหา
3. **Environment Info**: `system-info.sh` output
4. **Logs**: ผลลัพธ์จาก `docker-compose logs app`
5. **Screenshots**: ภาพหน้าจอ (ถ้าเป็นปัญหา UI)

#### ช่องทางติดต่อ:
- **Email**: support@docflow.example.com
- **Emergency**: +66-2-XXX-XXXX
- **Telegram**: @docflow-support
- **GitHub Issues**: https://github.com/your-org/docflow/issues

### การแก้ไขปัญหาเบื้องต้น

#### ก่อนติดต่อ Support:
1. ลอง restart ระบบ
2. ตรวจสอบ logs
3. ดู documentation
4. ค้นหาใน FAQ
5. ทดสอบใน different browser/device

#### ข้อมูลที่ควรเก็บไว้:
- Error messages ทั้งหมด
- ขั้นตอนที่ทำก่อนเกิดปัญหา
- เวลาที่เกิดปัญหา
- ผู้ใช้ที่ได้รับผลกระทบ

---

## 🔄 Maintenance Schedule

### การบำรุงรักษาประจำ

#### รายสัปดาห์:
- ตรวจสอบ logs errors
- ทำความสะอาด cache
- ตรวจสอบ disk space
- Update security patches

#### รายเดือน:
- Database maintenance
- File cleanup
- Performance optimization
- Backup verification

#### รายไตรมาส:
- Full security audit
- Disaster recovery test
- Capacity planning
- Documentation update

---

*คู่มือแก้ไขปัญหาฉบับนี้อัปเดตล่าสุด: มกราคม 2025*