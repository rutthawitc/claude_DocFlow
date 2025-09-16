# 🛠️ DocFlow Admin Guide

## คู่มือการจัดการระบบสำหรับผู้ดูแลระบบ

คู่มือนี้สำหรับผู้ดูแลระบบ (Admin) และผู้จัดการเขต (District Manager) ในการจัดการและบำรุงรักษาระบบ DocFlow

---

## 🔑 การจัดการผู้ใช้งาน

### การดูรายการผู้ใช้
**Path**: `/admin/users`

#### ฟีเจอร์หลัก:
- **รายการผู้ใช้ทั้งหมด**: แสดงข้อมูลผู้ใช้จาก PWA และ Local Admin
- **ค้นหาผู้ใช้**: ค้นหาจาก Username, ชื่อ, นามสกุล, อีเมล
- **กรองตามบทบาท**: Admin, District Manager, Uploader, etc.
- **สถานะการเข้าสู่ระบบ**: ล่าสุด, ออนไลน์

#### การจัดการ:
1. **ดูรายละเอียด**: คลิกที่ชื่อผู้ใช้
2. **แก้ไขบทบาท**: คลิก "Edit" → เลือกบทบาท → Save
3. **เพิ่มผู้ใช้ใหม่**: คลิก "Add User" (Local Admin เท่านั้น)

### การเพิ่มผู้ใช้ Local Admin
**Path**: `/admin/users/add`

#### ข้อมูลที่ต้องกรอก:
- **Username**: ชื่อผู้ใช้ (ห้ามซ้ำ)
- **First Name / Last Name**: ชื่อ-นามสกุล
- **Email**: อีเมล (ถ้ามี)
- **Password**: รหัสผ่าน (เข้ารหัสด้วย bcrypt)
- **Roles**: เลือกบทบาท (หลายบทบาทได้)

#### หมายเหตุ:
- Local Admin ไม่ต้องผ่าน PWA Authentication
- ใช้สำหรับการจัดการระบบและทดสอบ
- รหัสผ่านจะถูกเข้ารหัสอัตโนมัติ

---

## 👥 การจัดการบทบาท (Roles)

### การดูบทบาททั้งหมด
**Path**: `/admin/roles`

#### บทบาทพื้นฐานในระบบ:

| บทบาท | คำอธิบาย | สิทธิ์หลัก |
|--------|----------|-----------|
| **admin** | ผู้ดูแลระบบ | จัดการทุกอย่าง |
| **district_manager** | ผู้จัดการเขต | จัดการเอกสารเขต, รายงาน |
| **uploader** | ผู้อัปโหลด | อัปโหลด/แก้ไขเอกสาร |
| **branch_manager** | ผู้จัดการสาขา | จัดการเอกสารสาขา |
| **branch_user** | ผู้ใช้สาขา | ดูเอกสาร, แสดงความคิดเห็น |

### การเพิ่มบทบาทใหม่
**Path**: `/admin/roles/add`

#### ขั้นตอน:
1. กรอก **ชื่อบทบาท** (เช่น special_reviewer)
2. กรอก **คำอธิบาย** (เช่น ผู้ตรวจสอบพิเศษ)
3. **เลือกสิทธิ์** จากรายการ Permissions
4. คลิก **"Create Role"**

### การแก้ไขบทบาท
**Path**: `/admin/roles/[roleId]`

#### การจัดการ:
- **เพิ่ม/ลบ Permissions**: เลือก/ยกเลิกสิทธิ์
- **แก้ไขคำอธิบาย**: อัปเดตรายละเอียด
- **ดูสมาชิก**: ผู้ใช้ที่มีบทบาทนี้

---

## 🔐 การจัดการสิทธิ์ (Permissions)

### รายการสิทธิ์ในระบบ
**Path**: `/admin/permissions`

#### กลุ่มสิทธิ์หลัก:

**📄 Document Management**
- `documents:upload` - อัปโหลดเอกสาร
- `documents:view` - ดูเอกสาร
- `documents:edit` - แก้ไขเอกสาร
- `documents:delete` - ลบเอกสาร
- `documents:status_update` - เปลี่ยนสถานะ

**🏢 Branch Management**
- `branches:view` - ดูข้อมูลสาขา
- `branches:manage` - จัดการสาขา
- `branches:assign_users` - กำหนดผู้ใช้ให้สาขา

**💬 Comments**
- `comments:create` - เพิ่มความคิดเห็น
- `comments:read` - อ่านความคิดเห็น
- `comments:update` - แก้ไขความคิดเห็น
- `comments:delete` - ลบความคิดเห็น

**👥 User Management** (Admin เท่านั้น)
- `users:view` - ดูรายการผู้ใช้
- `users:create` - สร้างผู้ใช้
- `users:update` - แก้ไขผู้ใช้
- `users:delete` - ลบผู้ใช้
- `users:assign_roles` - กำหนดบทบาท

**⚙️ System Management** (Admin เท่านั้น)
- `admin:full_access` - เข้าถึงทุกอย่าง
- `system:settings` - ตั้งค่าระบบ
- `system:maintenance` - บำรุงรักษาระบบ
- `system:reports` - ดูรายงานระบบ

---

## ⚙️ การตั้งค่าระบบ

### หน้าตั้งค่าหลัก
**Path**: `/settings`

#### 📱 การตั้งค่า Telegram
1. **Bot Configuration**:
   - **Bot Token**: ได้จาก @BotFather
   - **Default Chat ID**: Chat/Group/Channel ID
   - **Test Connection**: ทดสอบการเชื่อมต่อ

2. **Notification Settings**:
   - ☑️ **Document Upload**: แจ้งเตือนเมื่อมีการอัปโหลด
   - ☑️ **Status Changes**: แจ้งเตือนเมื่อสถานะเปลี่ยน
   - ☑️ **System Alerts**: แจ้งเตือนระบบ
   - ☑️ **Daily Reports**: รายงานประจำวัน

3. **Message Formatting**:
   - **Include User Names**: แสดงชื่อผู้ใช้
   - **Include Branch Info**: แสดงข้อมูลสาขา
   - **Include Timestamps**: แสดงเวลา
   - **Use Emojis**: ใช้อีโมจิในข้อความ

#### 🛠️ โหมดบำรุงรักษา
1. **Enable Maintenance Mode**: เปิด/ปิดโหมดบำรุงรักษา
2. **Maintenance Message**: ข้อความแจ้งผู้ใช้
3. **Admin Override**: Admin สามารถเข้าใช้ได้ด้วย `?admin=1`

#### 📁 การจัดการไฟล์
1. **File Statistics**: ดูขนาดและจำนวนไฟล์
2. **Cleanup Files**: ลบไฟล์ที่ไม่ใช้
3. **Backup Files**: สำรองข้อมูลไฟล์
4. **Storage Settings**: ตั้งค่าการเก็บไฟล์

### การตั้งค่าขั้นสูง (Database)

#### System Settings Table
ตั้งค่าเพิ่มเติมเก็บใน `system_settings` table:

```sql
-- ดูการตั้งค่าทั้งหมด
SELECT * FROM system_settings;

-- อัปเดตการตั้งค่า
UPDATE system_settings 
SET value = 'true' 
WHERE key = 'maintenance_mode_enabled';
```

---

## 📊 การมอนิเตอร์และรายงาน

### การดู Cache Statistics
**Endpoint**: `/api/cache/stats`

#### ข้อมูลที่ได้:
- **Hit Rate**: อัตราการ Cache Hit
- **Total Operations**: จำนวนการทำงานทั้งหมด
- **Memory Usage**: การใช้หน่วยความจำ
- **Redis Status**: สถานะ Redis (ถ้าใช้)

### Health Check Monitoring
**Endpoint**: `/api/health`

#### การตรวจสอบ:
- **Database Connectivity**: การเชื่อมต่อฐานข้อมูล
- **Cache System**: ระบบ Cache (Redis/Memory)
- **Response Time**: เวลาตอบสนอง
- **System Uptime**: เวลาทำงานระบบ

#### ตัวอย่าง Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-16T10:30:00.000Z",
  "service": "DocFlow API",
  "checks": {
    "database": {
      "status": "up",
      "responseTime": 15
    },
    "cache": {
      "status": "up",
      "type": "redis",
      "stats": { "hitRate": 0.94 }
    }
  },
  "uptime": 3600.5
}
```

### Activity Logging

#### ตารางสำคัญ:
- **`activity_logs`**: บันทึกกิจกรรมทั้งหมด
- **`document_status_history`**: ประวัติการเปลี่ยนสถานะ

#### การดู Log:
```sql
-- กิจกรรมล่าสุด
SELECT al.*, u.username, u.firstName, u.lastName
FROM activity_logs al
LEFT JOIN users u ON al.userId = u.id
ORDER BY al.createdAt DESC
LIMIT 50;

-- กิจกรรมตามผู้ใช้
SELECT * FROM activity_logs 
WHERE userId = 123 
ORDER BY createdAt DESC;
```

---

## 🔧 การแก้ไขปัญหาและบำรุงรักษา

### การรีสตาร์ทระบบ

#### ด้วย Docker:
```bash
# รีสตาร์ททั้งระบบ
docker-compose restart

# รีสตาร์ทเฉพาะ App
docker-compose restart app

# ดู Logs
docker-compose logs -f app
```

#### ด้วย PM2 (Production):
```bash
# รีสตาร์ท
pm2 restart docflow

# ดู Logs
pm2 logs docflow

# ดู Status
pm2 status
```

### การล้าง Cache

#### ผ่าน API:
```bash
# ล้าง Cache ทั้งหมด
curl -X POST http://localhost:3000/api/cache/clear \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# ล้าง Cache เฉพาะ Documents
curl -X POST http://localhost:3000/api/cache/clear/documents
```

#### ผ่าน Database:
```sql
-- ล้าง Session หมดอายุ
DELETE FROM sessions 
WHERE expires < NOW();

-- Reset Auto-increment (ถ้าต้องการ)
SELECT setval('documents_id_seq', COALESCE(MAX(id), 0) + 1, false) 
FROM documents;
```

### การสำรองข้อมูล

#### Database Backup:
```bash
# สำรองฐานข้อมูล
docker-compose exec db pg_dump -U postgres docflow_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore ฐานข้อมูล
docker-compose exec -T db psql -U postgres docflow_db < backup_20250116_103000.sql
```

#### File Backup:
```bash
# สำรองไฟล์เอกสาร
tar -czf documents_backup_$(date +%Y%m%d).tar.gz ./uploads/documents/

# สำรองการตั้งค่า
cp .env .env.backup.$(date +%Y%m%d)
cp ./tmp/telegram-settings.json ./tmp/telegram-settings.backup.$(date +%Y%m%d).json
```

---

## 🚨 การแก้ไขปัญหาเร่งด่วน

### ปัญหาที่พบบ่อย

#### 1. Database Connection Error
```bash
# ตรวจสอบ Database
docker-compose ps db
docker-compose logs db

# รีสตาร์ท Database
docker-compose restart db
```

#### 2. Out of Memory
```bash
# ตรวจสอบการใช้หน่วยความจำ
docker stats

# เพิ่ม Memory Limit
# ใน docker-compose.yml
services:
  app:
    mem_limit: 2g
```

#### 3. Rate Limit ถูกบล็อก
```bash
# ล้าง Rate Limit Cache
curl -X POST http://localhost:3000/api/cache/clear/ratelimit
```

#### 4. Telegram Bot ไม่ทำงาน
1. ตรวจสอบ Bot Token ใน Settings
2. ทดสอบการเชื่อมต่อ
3. ตรวจสอบว่า Bot อยู่ใน Chat/Group
4. ตรวจสอบ Chat ID ถูกต้อง

### Emergency Admin Access

#### กรณีลืมรหัสผ่าน Admin:
```sql
-- สร้าง Local Admin ใหม่
INSERT INTO users (username, firstName, lastName, password, isLocalAdmin) 
VALUES ('emergency_admin', 'Emergency', 'Admin', '$2b$10$hash_password_here', true);

-- เพิ่มบทบาท Admin
INSERT INTO user_roles (userId, roleId) 
SELECT u.id, r.id 
FROM users u, roles r 
WHERE u.username = 'emergency_admin' AND r.name = 'admin';
```

#### กรณีระบบล่ม:
1. **เปิด Maintenance Mode**:
   ```sql
   UPDATE system_settings 
   SET value = 'true' 
   WHERE key = 'maintenance_mode_enabled';
   ```

2. **Emergency Access**: ใช้ `?admin=1` ใน URL

3. **Rollback**: กลับไปเวอร์ชันก่อนหน้า
   ```bash
   git checkout HEAD~1
   docker-compose up -d --build
   ```

---

## 📋 Maintenance Checklist

### รายการตรวจสอบประจำวัน
- [ ] ตรวจสอบ Health Check Status
- [ ] ดู Error Logs ในระบบ
- [ ] ตรวจสอบ Disk Space
- [ ] ทดสอบ Telegram Notifications
- [ ] ตรวจสอบ Cache Hit Rate

### รายการตรวจสอบประจำสัปดาห์
- [ ] สำรองฐานข้อมูล
- [ ] ล้าง Log เก่า (>30 วัน)
- [ ] ตรวจสอบ User Activity
- [ ] อัปเดต Security Patches
- [ ] ทดสอบ Recovery Process

### รายการตรวจสอบประจำเดือน
- [ ] Review Access Permissions
- [ ] ล้างไฟล์ไม่ใช้ (File Cleanup)
- [ ] Performance Optimization
- [ ] Security Audit
- [ ] Backup Verification

---

## 📞 การติดต่อและ Escalation

### การรายงานปัญหาร้าแรง
1. **Severity 1 (Critical)**: ระบบล่ม, Data Loss
   - ติดต่อ: โทรฉุกเฉิน
   - Response Time: 15 นาที

2. **Severity 2 (High)**: ฟีเจอร์สำคัญไม่ทำงาน
   - ติดต่อ: Telegram, อีเมล
   - Response Time: 2 ชั่วโมง

3. **Severity 3 (Medium)**: ปัญหาทั่วไป
   - ติดต่อ: Ticket System
   - Response Time: 1 วันทำการ

### ข้อมูลการติดต่อ
- **Tech Lead**: emergency@docflow.example.com
- **DevOps**: devops@docflow.example.com
- **Emergency Hotline**: 02-XXX-XXXX
- **Telegram Alert**: @docflow-admin-alerts

---

*คู่มือผู้ดูแลระบบฉบับนี้อัปเดตล่าสุด: มกราคม 2025*