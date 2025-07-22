# PRD: DocFlow - ระบบจัดการเอกสารส่งกลับสาขา

## 1. Product Overview

### 1.1 Product Vision
ระบบจัดการเอกสารส่งกลับสาขาเพื่อการติดตามและจัดการเอกสารการเบิกจ่ายที่มีประสิทธิภาพ พร้อมระบบแจ้งเตือนและการติดตามสถานะแบบ real-time โดยใช้ระบบ PWA Authentication ที่มีอยู่แล้ว

### 1.2 Business Objectives
- เพิ่มประสิทธิภาพในการจัดการเอกสารระหว่างเขตและสาขา
- ลดเวลาในการติดตามสถานะเอกสาร
- สร้างความโปร่งใสในกระบวนการดำเนินงาน
- มีระบบ audit trail ที่ครบถ้วน
- ใช้ประโยชน์จากระบบ Role-Based Access Control ที่มีอยู่

## 2. User Personas & Roles (Based on Existing PWA Auth System)

### 2.1 Uploader (ผู้อัปโหลดเอกสาร)
- **Role in System**: `uploader` role
- **บทบาท**: อัปโหลดและส่งเอกสารให้สาขา
- **ความต้องการ**: อัปโหลดเอกสารง่าย รวดเร็ว พร้อมระบบแจ้งเตือน
- **Permissions**: `documents:create`, `documents:upload`, `notifications:send`

### 2.2 Branch User (สาขา)
- **Role in System**: `branch_user` role  
- **บทบาท**: รับและตรวจสอบเอกสารของสาขาตนเอง
- **ความต้องการ**: ดูเอกสาร เพิ่มความคิดเห็น และอัปเดทสถานะ
- **Permissions**: `documents:read_branch`, `documents:update_status`, `comments:create`

### 2.3 Branch Manager (หัวหน้าสาขา)
- **Role in System**: `branch_manager` role
- **บทบาท**: ดูเอกสารทุกสาขาในเขต และอนุมัติ
- **ความต้องการ**: ดูภาพรวมสาขาในเขต และตัดสินใจ
- **Permissions**: `documents:read_all_branches`, `documents:approve`, `reports:branch`

### 2.4 Admin/Manager
- **Role in System**: `admin` role (existing)
- **บทบาท**: ดูภาพรวมและสถิติทั้งระบบ
- **ความต้องการ**: Dashboard สำหรับติดตามและรายงาน
- **Permissions**: `dashboard:access`, `reports:read`, `users:read` (existing)

## 3. Core Features & Requirements

### 3.1 Document Upload System

#### 3.1.1 File Upload
- **รองรับไฟล์**: PDF เท่านั้น
- **วิธีอัปโหลด**: Browse files หรือ Drag & Drop
- **ขนาดไฟล์**: สูงสุด 10MB ต่อไฟล์
- **Validation**: ตรวจสอบประเภทไฟล์และขนาด

#### 3.1.2 Document Information Form
```typescript
interface DocumentInfo {
  branchId: string          // Dropdown เลือกสาขา
  uploadDate: Date          // Auto-generated
  mtNumber: string          // เลขที่ มท
  mtDate: Date             // วันที่ลงเลขที่ มท
  subject: string          // เรื่องเบิกจ่าย
  monthYear: string        // ประจำเดือน (ไทย/พ.ศ.)
}
```

#### 3.1.3 Actions
- **บันทึก**: Save draft
- **ส่ง**: Submit และส่ง Telegram notification
- **สถานะ**: เปลี่ยนเป็น "ส่งกลับสาขา"

### 3.2 Document Management for Recipients

#### 3.2.1 Documents List Page
- **URL**: `/documents`
- **Content**: รายชื่อสาขาที่มีเอกสาร
- **Features**:
  - Badge สีแดงแสดงจำนวนเอกสาร
  - คลิกเข้าสู่รายละเอียดสาขา

#### 3.2.2 Branch Documents Page
- **URL**: `/documents/branch/:branchId`
- **Content**: รายการเอกสารของสาขา
- **Features**:
  - เรียงตามวันที่ส่ง (ล่าสุดก่อน)
  - Badge สถานะเอกสาร
  - คลิกเข้าดูรายละเอียด

#### 3.2.3 Document Detail Page
- **URL**: `/documents/:documentId`
- **Features**:
  - PDF Viewer
  - Comment system
  - Actions: "รับทราบ", "ส่งกลับเขต"
  - Document metadata display

### 3.3 Status Management

#### 3.3.1 Document Status Flow
```typescript
enum DocumentStatus {
  DRAFT = "draft",
  SENT_TO_BRANCH = "sent_to_branch",
  ACKNOWLEDGED = "acknowledged", 
  SENT_BACK_TO_DISTRICT = "sent_back_to_district"
}
```

#### 3.3.2 Status Colors
- **Draft**: เทา
- **ส่งกลับสาขา**: ส้ม
- **รับทราบ**: เขียว
- **ส่งกลับเขต**: น้ำเงิน

### 3.4 Notification System

#### 3.4.1 Telegram Integration
- **Group notification** เมื่อมีเอกสารใหม่
- **Message format**:
  ```
  📄 เอกสารใหม่
  สาขา: [ชื่อสาขา]
  เรื่อง: [เรื่องเบิกจ่าย]
  เลขที่ มท: [เลขที่]
  ประจำเดือน: [เดือน/ปี]
  ```

### 3.5 Activity Logging

#### 3.5.1 Log Events
```typescript
interface ActivityLog {
  id: string
  userId: string
  action: LogAction
  documentId?: string
  timestamp: Date
  details: Record<string, any>
  ipAddress: string
  userAgent: string
}

enum LogAction {
  LOGIN = "login",
  LOGOUT = "logout", 
  CREATE_DOCUMENT = "create_document",
  NOTIFY_SENT = "notify_sent",
  STATUS_UPDATE = "status_update",
  ADD_COMMENT = "add_comment"
}
```

### 3.6 Dashboard & Analytics

#### 3.6.1 Key Metrics
- จำนวนเอกสารทั้งหมด
- เอกสารตามสถานะ
- เอกสารต่อสาขา
- เวลาเฉลี่ยในการประมวลผล

#### 3.6.2 Charts & Visualizations
- Bar chart: เอกสารต่อสาขา
- Pie chart: สัดส่วนสถานะ
- Line chart: แนวโน้มรายวัน/เดือน
- Table: รายงานรายละเอียด

## 4. Technical Architecture (Updated to match existing system)

### 4.1 Technology Stack (Already in place)
- **Frontend**: Next.js 15 with TypeScript ✅
- **Backend**: Next.js API Routes ✅ 
- **Database**: PostgreSQL with Drizzle ORM ✅
- **Authentication**: NextAuth.js v5 with PWA integration ✅
- **File Storage**: Local storage หรือ cloud storage (TBD)
- **Styling**: Tailwind CSS v4 ✅
- **UI Components**: Radix UI components ✅

### 4.2 Existing Database Schema (Extended)

#### 4.2.1 Current Tables (Already exists)
```sql
-- Users table ✅ (ใช้ข้อมูลจาก PWA Auth)
users (id, username, firstName, lastName, email, costCenter, ba, part, area, jobName, level, divName, depName, orgName, position)

-- Roles & Permissions ✅ (ใช้ระบบที่มีอยู่)
roles (id, name, description)
permissions (id, name, description) 
user_roles (userId, roleId)
role_permissions (roleId, permissionId)
```

#### 4.2.2 New Tables (ต้องเพิ่ม - Based on actual branch data)
```sql
-- Branches table (ข้อมูลจาก CSV R6 branches - 22 สาขา)
CREATE TABLE branches (
  id serial PRIMARY KEY,
  ba_code integer NOT NULL UNIQUE,           -- รหัส BA (1060-1245)
  branch_code bigint NOT NULL UNIQUE,        -- รหัสสาขา (5521011-5521032)  
  name varchar(255) NOT NULL,                -- ชื่อสาขา เช่น "กปภ.สาขาขอนแก่น(ชั้นพิเศษ)"
  region_id integer NOT NULL DEFAULT 6,      -- เขต 6
  region_code varchar(10) NOT NULL DEFAULT 'R6',  -- รหัสเขต R6
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Documents table (เชื่อมโยงกับ branches ด้วย ba_code)
CREATE TABLE documents (
  id serial PRIMARY KEY,
  file_path varchar(500) NOT NULL,
  original_filename varchar(255) NOT NULL,
  file_size integer,
  branch_ba_code integer NOT NULL REFERENCES branches(ba_code), -- ใช้ ba_code แทน id
  upload_date date NOT NULL DEFAULT CURRENT_DATE,
  mt_number varchar(100) NOT NULL,
  mt_date date NOT NULL,
  subject text NOT NULL,
  month_year varchar(20) NOT NULL, -- รูปแบบ "มกราคม 2568"
  status varchar(50) DEFAULT 'sent_to_branch',
  uploader_id integer NOT NULL REFERENCES users(id),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Comments table
CREATE TABLE comments (
  id serial PRIMARY KEY,
  document_id integer NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id integer NOT NULL REFERENCES users(id),
  content text NOT NULL,
  created_at timestamp DEFAULT now()
);

-- Activity logs table (Extended from existing session tracking)
CREATE TABLE activity_logs (
  id serial PRIMARY KEY,
  user_id integer REFERENCES users(id),
  action varchar(100) NOT NULL,
  document_id integer REFERENCES documents(id),
  branch_ba_code integer REFERENCES branches(ba_code),
  details jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp DEFAULT now()
);

-- Document status history สำหรับ audit trail
CREATE TABLE document_status_history (
  id serial PRIMARY KEY,
  document_id integer NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  from_status varchar(50),
  to_status varchar(50) NOT NULL,
  changed_by integer NOT NULL REFERENCES users(id),
  comment text,
  created_at timestamp DEFAULT now()
);
```

### 4.3 Integration with Existing PWA Auth System

#### 4.3.1 User Role Mapping
```typescript
// เพิ่ม roles ใหม่สำหรับระบบ DocFlow
const newRoles = [
  { name: 'uploader', description: 'ผู้อัปโหลดเอกสาร' },
  { name: 'branch_user', description: 'ผู้ใช้สาขา' },
  { name: 'branch_manager', description: 'หัวหน้าสาขา' }
];

// เพิ่ม permissions ใหม่
const newPermissions = [
  { name: 'documents:create', description: 'สร้างเอกสารใหม่' },
  { name: 'documents:upload', description: 'อัปโหลดไฟล์เอกสาร' },
  { name: 'documents:read_branch', description: 'อ่านเอกสารของสาขาตนเอง' },
  { name: 'documents:read_all_branches', description: 'อ่านเอกสารทุกสาขา' },
  { name: 'documents:update_status', description: 'อัปเดทสถานะเอกสาร' },
  { name: 'documents:approve', description: 'อนุมัติเอกสาร' },
  { name: 'comments:create', description: 'เพิ่มความคิดเห็น' },
  { name: 'notifications:send', description: 'ส่งการแจ้งเตือน' },
  { name: 'reports:branch', description: 'ดูรายงานระดับสาขา' }
];
```

#### 4.3.2 Branch Detection & User Mapping Strategy (Updated with real data)
```typescript
// ใช้ข้อมูลจาก CSV branches + PWA auth เพื่อกำหนดสาขา
interface BranchData {
  ba_code: number;        // 1060-1245
  branch_code: number;    // 5521011-5521032
  name: string;          // "กปภ.สาขาขอนแก่น(ชั้นพิเศษ)"
  region_id: number;     // 6 (เขต 6)
  region_code: string;   // "R6"
}

// รายการสาขาทั้งหมด 22 สาขาในเขต R6
const R6_BRANCHES: BranchData[] = [
  { ba_code: 1060, branch_code: 5521011, name: "กปภ.สาขาขอนแก่น(ชั้นพิเศษ)", region_id: 6, region_code: "R6" },
  { ba_code: 1061, branch_code: 5521012, name: "กปภ.สาขาบ้านไผ่", region_id: 6, region_code: "R6" },
  { ba_code: 1062, branch_code: 5521013, name: "กปภ.สาขาชุมแพ", region_id: 6, region_code: "R6" },
  { ba_code: 1063, branch_code: 5521014, name: "กปภ.สาขาน้ำพอง", region_id: 6, region_code: "R6" },
  { ba_code: 1064, branch_code: 5521015, name: "กปภ.สาขาชนบท", region_id: 6, region_code: "R6" },
  { ba_code: 1065, branch_code: 5521016, name: "กปภ.สาขากระนวน", region_id: 6, region_code: "R6" },
  { ba_code: 1066, branch_code: 5521017, name: "กปภ.สาขาหนองเรือ", region_id: 6, region_code: "R6" },
  { ba_code: 1067, branch_code: 5521018, name: "กปภ.สาขาเมืองพล", region_id: 6, region_code: "R6" },
  { ba_code: 1068, branch_code: 5521019, name: "กปภ.สาขากาฬสินธุ์", region_id: 6, region_code: "R6" },
  { ba_code: 1069, branch_code: 5521020, name: "กปภ.สาขากุฉินารายณ์", region_id: 6, region_code: "R6" },
  { ba_code: 1070, branch_code: 5521021, name: "กปภ.สาขาสมเด็จ", region_id: 6, region_code: "R6" },
  { ba_code: 1071, branch_code: 5521022, name: "กปภ.สาขามหาสารคาม", region_id: 6, region_code: "R6" },
  { ba_code: 1072, branch_code: 5521023, name: "กปภ.สาขาพยัคฆภูมิพิสัย", region_id: 6, region_code: "R6" },
  { ba_code: 1073, branch_code: 5521024, name: "กปภ.สาขาชัยภูมิ", region_id: 6, region_code: "R6" },
  { ba_code: 1074, branch_code: 5521025, name: "กปภ.สาขาแก้งคร้อ", region_id: 6, region_code: "R6" },
  { ba_code: 1075, branch_code: 5521026, name: "กปภ.สาขาจัตุรัส", region_id: 6, region_code: "R6" },
  { ba_code: 1076, branch_code: 5521027, name: "กปภ.สาขาหนองบัวแดง", region_id: 6, region_code: "R6" },
  { ba_code: 1077, branch_code: 5521028, name: "กปภ.สาขาภูเขียว", region_id: 6, region_code: "R6" },
  { ba_code: 1133, branch_code: 5521029, name: "กปภ.สาขาร้อยเอ็ด", region_id: 6, region_code: "R6" },
  { ba_code: 1134, branch_code: 5521030, name: "กปภ.สาขาโพนทอง", region_id: 6, region_code: "R6" },
  { ba_code: 1135, branch_code: 5521031, name: "กปภ.สาขาสุวรรณภูมิ", region_id: 6, region_code: "R6" },
  { ba_code: 1245, branch_code: 5521032, name: "กปภ.สาขาบำเหน็จณรงค์", region_id: 6, region_code: "R6" }
];

// User-Branch mapping strategy
function getUserBranch(user: PWAUserData): BranchData | null {
  // Method 1: ใช้ user.ba field ถ้ามี (แนะนำ)
  if (user.ba) {
    const baCode = parseInt(user.ba);
    return R6_BRANCHES.find(branch => branch.ba_code === baCode) || null;
  }
  
  // Method 2: ใช้ user.costCenter ถ้ามี pattern ที่ตรงกับ ba_code
  if (user.costCenter) {
    const costCenterNum = parseInt(user.costCenter);
    return R6_BRANCHES.find(branch => branch.ba_code === costCenterNum) || null;
  }
  
  // Method 3: ใช้ user.orgName หรือ depName สำหรับ fuzzy matching
  if (user.orgName || user.depName) {
    // Implement fuzzy name matching if needed
  }
  
  return null;
}
```

### 4.4 API Endpoints (Based on existing structure)

#### 4.4.1 Document Management
```typescript
// Upload document
POST /api/documents
Body: FormData (file + metadata)

// Get documents by branch
GET /api/documents/branch/:branchId
Query: ?page=1&limit=10&status=all

// Get document detail
GET /api/documents/:id

// Update document status
PATCH /api/documents/:id/status
Body: { status: DocumentStatus }

// Add comment
POST /api/documents/:id/comments
Body: { content: string }
```

#### 4.4.2 Dashboard & Analytics (Extends existing admin dashboard)
```typescript
// Get dashboard metrics
GET /api/dashboard/metrics

// Get documents summary
GET /api/dashboard/documents-summary
Query: ?period=month&branch=all
```

## 5. User Experience Design

### 5.1 Page Layout
- **Header**: Logo, Navigation, User menu
- **Sidebar**: Main navigation (Dashboard, Documents, Branches)
- **Main Content**: Page-specific content
- **Footer**: Copyright, version info

### 5.2 Responsive Design
- **Desktop**: Full layout with sidebar
- **Tablet**: Collapsible sidebar
- **Mobile**: Bottom navigation, stacked layout

### 5.3 Key User Flows

#### 5.3.1 Upload Document Flow
1. Login → Dashboard
2. Navigate to "อัปโหลดเอกสาร"
3. Select file (PDF)
4. Fill document information
5. Preview and validate
6. Submit → Success notification

#### 5.3.2 Process Document Flow
1. Login → Documents List
2. Select branch with pending documents
3. View document list
4. Click document to view detail
5. Review PDF, add comments
6. Update status (รับทราบ/ส่งกลับเขต)

## 6. Security & Compliance (Leveraging existing PWA Auth)

### 6.1 Authentication & Authorization (Already implemented)
- **PWA Authentication integration** ✅
- **Role-based access control (RBAC)** ✅ 
- **JWT session management** ✅
- **Permission-based authorization** ✅

### 6.2 Data Security (Enhanced)
- **File upload validation** (เพิ่มการตรวจสอบ PDF)
- **SQL injection prevention** ✅ (Drizzle ORM)
- **XSS protection** ✅ 
- **HTTPS enforcement** ✅
- **Branch-level data isolation** (ใหม่)

### 6.3 Audit Trail (Extended from existing logging)
- **Complete activity logging** (ขยายจาก session tracking)
- **Document access tracking** (ใหม่)
- **Status change history** (ใหม่)
- **Export capabilities** (ใหม่)

## 7. Performance Requirements

### 7.1 Response Time
- **Page load**: < 2 seconds
- **File upload**: < 5 seconds for 10MB
- **API response**: < 500ms

### 7.2 Scalability
- **Support 100+ concurrent users**
- **Handle 1000+ documents per month**
- **Database optimization for reports**

## 8. Deployment & Infrastructure

### 8.1 Environment Setup
- **Development**: Local development server
- **Staging**: Testing environment
- **Production**: Production server

### 8.2 Monitoring
- **Application performance monitoring**
- **Error tracking**
- **Database performance monitoring**
- **User activity analytics**

## 9. Success Metrics

### 9.1 Adoption Metrics
- **User registration rate**
- **Document upload frequency**
- **Average time to process documents**

### 9.2 Performance Metrics
- **System uptime > 99.5%**
- **Page load speed < 2s**
- **User satisfaction score > 4.0/5.0**

## 10. Implementation Roadmap (Updated)

### Phase 1 (Weeks 1-2): Database Schema Extension
- ขยาย schema ปัจจุบันด้วย tables ใหม่ (branches, documents, comments, activity_logs)
- เพิ่ม roles และ permissions ใหม่ลงในระบบ
- สร้าง migration scripts
- สร้าง branches อัตโนมัติจากข้อมูล users ที่มีอยู่

### Phase 2 (Weeks 3-4): Core Document Management
- Document upload และ storage system
- File validation และ PDF processing  
- Basic document CRUD operations
- Integration กับ PWA auth system

### Phase 3 (Weeks 5-6): User Interface & Workflow
- Document listing และ detail views (ใช้ UI components ที่มีอยู่)
- Status management workflow
- Comment system
- Branch-based access control

### Phase 4 (Weeks 7-8): Notifications & Advanced Features
- Telegram integration
- Activity logging system
- PDF viewer integration
- Search และ filtering

### Phase 5 (Weeks 9-10): Dashboard & Reporting
- Analytics dashboard (ขยายจาก admin dashboard ที่มี)
- Report generation
- Performance optimization
- Mobile responsiveness

### Phase 6 (Weeks 11-12): Testing & Deployment
- Comprehensive testing
- Performance optimization
- Production deployment
- User training และ documentation

## 11. Integration Benefits

### 11.1 Leveraging Existing Infrastructure
- **PWA Authentication**: ไม่ต้องสร้างระบบ login ใหม่
- **Role & Permission System**: ใช้ RBAC ที่มีอยู่แล้ว
- **Database & ORM**: ใช้ PostgreSQL + Drizzle ที่ setup แล้ว
- **UI Framework**: ใช้ Tailwind + Radix UI ที่มีอยู่

### 11.2 Cost & Time Savings
- **ลดเวลาพัฒนา**: ประมาณ 30-40% จากการใช้ boilerplate
- **ลดความเสี่ยง**: ระบบ auth ที่ stable แล้ว
- **Faster deployment**: Infrastructure พร้อมใช้งาน

### 11.3 Scalability
- **User management**: ใช้ระบบ PWA auth ที่รองรับ enterprise
- **Permission scaling**: เพิ่ม roles/permissions ได้ง่าย  
- **Database optimization**: Drizzle ORM พร้อม query optimization