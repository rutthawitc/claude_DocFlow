# DocFlow Implementation Guide

## 🎯 Overview

DocFlow is a comprehensive document management system implemented on top of the existing PWA authentication infrastructure. It provides role-based document workflow management for 22 branches in region R6, featuring PDF upload, status tracking, commenting, and Telegram notifications.

## 🏗️ Architecture

### Core Components

1. **Database Layer** (`src/db/schema.ts`)
   - Extended existing schema with 5 new tables
   - Maintains referential integrity with existing user system
   - Optimized indexes for performance

2. **Service Layer** (`src/lib/services/`)
   - `BranchService`: Branch management and user-branch mapping
   - `DocumentService`: Document CRUD operations and access control
   - `FileService`: PDF validation, encryption, and storage
   - `ActivityLogger`: Comprehensive audit trail system

3. **Authentication Layer** (`src/lib/auth/docflow-auth.ts`)
   - Extends existing RBAC with DocFlow-specific roles
   - Branch-level access control
   - Permission-based authorization

4. **API Layer** (`src/app/api/`)
   - RESTful endpoints for document management
   - File upload with streaming support
   - Branch-specific document retrieval

## 📊 Database Schema

### New Tables

```sql
-- Branches (22 R6 branches)
branches (id, ba_code, branch_code, name, region_id, region_code, is_active, created_at, updated_at)

-- Documents
documents (id, file_path, original_filename, file_size, branch_ba_code, upload_date, mt_number, mt_date, subject, month_year, status, uploader_id, created_at, updated_at)

-- Comments
comments (id, document_id, user_id, content, created_at)

-- Activity Logs
activity_logs (id, user_id, action, document_id, branch_ba_code, details, ip_address, user_agent, created_at)

-- Document Status History
document_status_history (id, document_id, from_status, to_status, changed_by, comment, created_at)
```

### Key Relationships

- `documents.branch_ba_code` → `branches.ba_code`
- `documents.uploader_id` → `users.id`
- `comments.document_id` → `documents.id`
- `activity_logs.document_id` → `documents.id`

## 👥 Role-Based Access Control

### DocFlow Roles

1. **Uploader** (`uploader`)
   - Upload documents
   - Send notifications
   - Access dashboard

2. **Branch User** (`branch_user`)
   - View branch documents
   - Update document status
   - Add comments

3. **Branch Manager** (`branch_manager`)
   - View all R6 branch documents
   - Approve documents
   - Generate reports

4. **Admin** (`admin`)
   - Full system access
   - User management
   - System configuration

### Permissions Matrix

| Permission | Uploader | Branch User | Branch Manager | Admin |
|------------|----------|-------------|----------------|-------|
| documents:create | ✅ | ❌ | ❌ | ✅ |
| documents:upload | ✅ | ❌ | ❌ | ✅ |
| documents:read_branch | ❌ | ✅ | ✅ | ✅ |
| documents:read_all_branches | ❌ | ❌ | ✅ | ✅ |
| documents:update_status | ❌ | ✅ | ✅ | ✅ |
| documents:approve | ❌ | ❌ | ✅ | ✅ |
| comments:create | ❌ | ✅ | ✅ | ✅ |
| notifications:send | ✅ | ❌ | ❌ | ✅ |
| reports:branch | ❌ | ❌ | ✅ | ✅ |

## 🔄 Document Workflow

### Status Flow

```
DRAFT → SENT_TO_BRANCH → ACKNOWLEDGED
                      → SENT_BACK_TO_DISTRICT
```

### Status Descriptions

- **DRAFT**: Document saved but not sent
- **SENT_TO_BRANCH**: Document sent to branch (triggers notification)
- **ACKNOWLEDGED**: Branch has received and processed document
- **SENT_BACK_TO_DISTRICT**: Branch sends document back for review

## 🔐 Security Features

### File Security
- PDF-only uploads with signature validation
- File encryption at rest
- Secure filename sanitization
- 10MB size limit

### Access Control
- Branch-level data isolation
- Role-based permissions
- User-branch mapping via PWA data
- Comprehensive audit logging

### Data Protection
- SQL injection prevention (Drizzle ORM)
- XSS protection
- CSRF tokens
- Input validation and sanitization

## 📁 File Structure

```
src/
├── lib/
│   ├── types.ts                    # TypeScript interfaces and enums
│   ├── auth/
│   │   └── docflow-auth.ts         # DocFlow authentication utilities
│   └── services/
│       ├── branch-service.ts       # Branch management
│       ├── document-service.ts     # Document operations
│       ├── file-service.ts         # File handling
│       └── activity-logger.ts      # Audit logging
├── app/api/
│   ├── documents/
│   │   ├── route.ts                # Document CRUD
│   │   ├── [id]/route.ts           # Document details
│   │   ├── [id]/status/route.ts    # Status updates
│   │   ├── [id]/comments/route.ts  # Comments
│   │   ├── [id]/download/route.ts  # File download
│   │   └── branch/[branchBaCode]/route.ts # Branch documents
│   └── branches/route.ts           # Branch management
└── db/schema.ts                    # Extended database schema
```

## 🚀 Getting Started

### 1. Prerequisites

Ensure your environment has:
- PostgreSQL database running
- PWA_AUTH_URL configured
- Upload directory permissions

### 2. Initialize DocFlow

```bash
# Install dependencies (if not already done)
pnpm install

# Initialize DocFlow system
pnpm docflow:init

# Or run initialization and start dev server
pnpm docflow:dev
```

### 3. Environment Variables

Add to your `.env` file:

```env
# Existing variables...
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pwausers_db
PWA_AUTH_URL=https://your-pwa-auth-endpoint.com/api/login

# DocFlow specific
UPLOAD_DIR=./uploads
FILE_ENCRYPTION_KEY=your-secure-encryption-key-change-in-production
```

### 4. Database Setup

```bash
# Generate and push schema changes
pnpm db:generate
pnpm db:push

# Initialize DocFlow data
pnpm docflow:init
```

## 📋 API Endpoints

### Documents

- `POST /api/documents` - Upload document
- `GET /api/documents` - Search all accessible documents
- `GET /api/documents/[id]` - Get document details
- `DELETE /api/documents/[id]` - Delete document
- `PATCH /api/documents/[id]/status` - Update status
- `POST /api/documents/[id]/comments` - Add comment
- `GET /api/documents/[id]/comments` - Get comments
- `GET /api/documents/[id]/download` - Download file

### Branches

- `GET /api/branches` - List branches
- `GET /api/documents/branch/[branchBaCode]` - Branch documents

### Request Examples

#### Upload Document

```bash
curl -X POST /api/documents \
  -H "Authorization: Bearer <token>" \
  -F "file=@document.pdf" \
  -F "branchBaCode=1060" \
  -F "mtNumber=MT001" \
  -F "mtDate=2024-01-15" \
  -F "subject=ขอเบิกค่าใช้จ่าย" \
  -F "monthYear=มกราคม 2567"
```

#### Update Status

```bash
curl -X PATCH /api/documents/123/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"status": "acknowledged", "comment": "ได้รับเอกสารเรียบร้อย"}'
```

## 🔍 Monitoring & Logging

### Activity Logging

All user actions are logged with:
- User ID and action type
- Document and branch context
- IP address and user agent
- Detailed action metadata
- Timestamp

### Log Actions Tracked

- `login` / `logout`
- `create_document`
- `notify_sent`
- `status_update`
- `add_comment`
- `view_document`
- `download_document`

### Audit Trail Queries

```sql
-- Recent activity
SELECT * FROM activity_logs 
ORDER BY created_at DESC 
LIMIT 50;

-- User activity summary
SELECT action, COUNT(*) 
FROM activity_logs 
WHERE user_id = ? 
GROUP BY action;

-- Document access history
SELECT u.username, al.action, al.created_at
FROM activity_logs al
JOIN users u ON al.user_id = u.id
WHERE al.document_id = ?
ORDER BY al.created_at DESC;
```

## 🏥 Health Checks

### System Health Endpoints

Create monitoring endpoints to check:

1. **Database Connection**
   ```typescript
   GET /api/health/database
   ```

2. **File Storage**
   ```typescript
   GET /api/health/storage
   ```

3. **Authentication**
   ```typescript
   GET /api/health/auth
   ```

## 🔧 Troubleshooting

### Common Issues

1. **File Upload Fails**
   - Check file size (max 10MB)
   - Verify PDF format
   - Ensure upload directory permissions

2. **Branch Access Denied**
   - Verify user's PWA data includes `ba` field
   - Check user roles assignment
   - Validate branch exists in system

3. **Database Connection Issues**
   - Verify DATABASE_URL format
   - Check PostgreSQL service status
   - Test connection with `pnpm db:studio`

### Debug Mode

Enable detailed logging by setting:
```env
NODE_ENV=development
```

## 🚀 Production Deployment

### Pre-deployment Checklist

- [ ] Database migrations applied
- [ ] File encryption key configured
- [ ] Upload directory secured
- [ ] Indexes created for performance
- [ ] User roles properly assigned
- [ ] Telegram bot configured (if using notifications)

### Performance Optimization

1. **Database Indexes** - All critical indexes are created by init script
2. **File Caching** - Consider CDN for file downloads
3. **Query Optimization** - Use pagination for large datasets
4. **Memory Management** - Streaming file uploads prevent memory issues

## 📊 Analytics & Reporting

### Available Metrics

- Documents per branch
- Processing times by status
- User activity patterns
- File storage usage
- System performance metrics

### Dashboard Queries

The system tracks comprehensive metrics for:
- Document volume trends
- Branch performance
- User activity patterns
- System health indicators

## 🤝 Contributing

When extending DocFlow:

1. Follow existing patterns in service layer
2. Add proper TypeScript interfaces
3. Include comprehensive error handling
4. Add activity logging for new actions
5. Write tests for new functionality
6. Update this documentation

## 📄 License

This implementation follows the same license as the base PWA authentication system.

---

**Next Steps**: After completing this backend implementation, you can proceed with:
1. Frontend UI components
2. PDF viewer integration  
3. Telegram notification service
4. Dashboard and analytics
5. Mobile responsive design

For questions or issues, refer to the task planning document in `docs/tasks.md`.