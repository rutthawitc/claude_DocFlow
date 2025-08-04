# DocFlow RBAC (Role-Based Access Control) Matrix

## Overview
This document defines the role-based access control system for DocFlow, including roles, permissions, and access patterns.

## Role Definitions

### 1. User (ผู้ใช้พื้นฐาน)
**Description**: Basic authenticated user with minimal permissions  
**Typical Assignment**: All authenticated users get this as default  
**Access Level**: Read-only dashboard access

### 2. Uploader (เจ้าหน้าที่อัปโหลด)
**Description**: District staff responsible for document upload and distribution  
**Typical Assignment**: Regional office staff, document coordinators  
**Access Level**: Can create, upload, and manage documents

### 3. Branch User (ผู้ใช้สาขา)
**Description**: Branch staff who receive and respond to documents  
**Typical Assignment**: Branch-level employees  
**Access Level**: Can view assigned documents and provide responses

### 4. Branch Manager (ผู้จัดการสาขา)
**Description**: Branch management with oversight capabilities  
**Typical Assignment**: Branch managers, supervisors  
**Access Level**: Full branch document management + team oversight

### 5. District Manager (ผู้จัดการเขต)
**Description**: Regional management with cross-branch oversight  
**Typical Assignment**: Regional managers, district heads  
**Access Level**: Cross-branch visibility + advanced reporting

### 6. Admin (ผู้ดูแลระบบ)
**Description**: System administrator with full system access  
**Typical Assignment**: IT staff, system administrators  
**Access Level**: Complete system control + user management

---

## Permission Definitions

### Document Permissions
- `documents:create` - Create new documents
- `documents:read_branch` - Read documents assigned to user's branch
- `documents:read_all_branches` - Read documents from all branches
- `documents:upload` - Upload PDF files
- `documents:update_status` - Change document status
- `documents:delete` - Delete documents
- `documents:approve` - Approve document workflows

### Comment Permissions  
- `comments:create` - Add comments to documents
- `comments:read` - View comments
- `comments:update` - Edit own comments
- `comments:delete` - Delete comments

### Administrative Permissions
- `admin:users` - Manage user accounts
- `admin:roles` - Manage roles and permissions
- `admin:system` - System configuration and settings
- `admin:full_access` - Complete administrative access

### Reporting Permissions
- `reports:read` - View basic reports
- `reports:branch` - Branch-specific reports
- `reports:region` - Regional reports
- `reports:system` - System-wide reports

### Notification Permissions
- `notifications:send` - Send notifications
- `notifications:manage` - Configure notification settings

### Settings Permissions
- `settings:manage` - Configure system settings

### Dashboard Permissions
- `dashboard:access` - Access to dashboard

---

## RBAC Matrix

| Permission | User | Uploader | Branch User | Branch Manager | District Manager | Admin |
|------------|------|----------|-------------|----------------|------------------|-------|
| **Dashboard & Basic Access** |
| `dashboard:access` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Document Management** |
| `documents:create` | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |
| `documents:read_branch` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `documents:read_all_branches` | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| `documents:upload` | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |
| `documents:update_status` | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `documents:delete` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `documents:approve` | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Comments** |
| `comments:create` | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `comments:read` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `comments:update` | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `comments:delete` | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Reporting** |
| `reports:read` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `reports:branch` | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| `reports:region` | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| `reports:system` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Notifications** |
| `notifications:send` | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `notifications:manage` | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Administration** |
| `admin:users` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `admin:roles` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `admin:system` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `admin:full_access` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Settings** |
| `settings:manage` | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |

---

## Document Status Workflow Permissions

### Status: Draft
| Action | Allowed Roles | Required Permission |
|--------|---------------|-------------------|
| Edit Document | Uploader, District Manager, Admin | `documents:create` |
| Send to Branch | Uploader, District Manager, Admin | `documents:update_status` |
| Delete Document | Admin | `documents:delete` |

### Status: Sent to Branch  
| Action | Allowed Roles | Required Permission |
|--------|---------------|-------------------|
| View Document | Branch User, Branch Manager, District Manager, Admin | `documents:read_branch` |
| Acknowledge | Branch User, Branch Manager, District Manager, Admin | `documents:update_status` |
| Send Back to District | Branch User, Branch Manager, District Manager, Admin | `documents:update_status` |
| Add Comment | Branch User, Branch Manager, Uploader, District Manager, Admin | `comments:create` |

### Status: Acknowledged
| Action | Allowed Roles | Required Permission |
|--------|---------------|-------------------|
| View Document | Branch User, Branch Manager, District Manager, Admin | `documents:read_branch` |
| Send Back to District | Branch User, Branch Manager, District Manager, Admin | `documents:update_status` |
| Add Comment | Branch User, Branch Manager, Uploader, District Manager, Admin | `comments:create` |

### Status: Sent Back to District
| Action | Allowed Roles | Required Permission |
|--------|---------------|-------------------|
| View Document | Uploader, District Manager, Admin | `documents:read_branch` |
| Re-send to Branch | Uploader, District Manager, Admin | `documents:update_status` |
| Add Comment | Uploader, District Manager, Admin | `comments:create` |

---

## Access Control Patterns

### Branch-Based Access Control
- **Branch Users** can only access documents assigned to their branch (determined by BA code)
- **Branch Managers** have additional oversight within their branch
- **District Managers** and **Admins** can access all branches

### Hierarchical Access
```
Admin (Full System)
  ↓
District Manager (All Branches)
  ↓
Branch Manager (Single Branch)
  ↓
Branch User (Single Branch)
  ↓
Uploader (Document Creation)
  ↓
User (Read-only)
```

### Data Filtering Rules
1. **User Role**: Can see dashboard and basic reports
2. **Branch User/Manager**: Documents filtered by branch assignment (BA code matching)
3. **Uploader**: Can see documents they created + branch responses
4. **District Manager**: Can see all documents across all branches
5. **Admin**: Can see all data + administrative functions

---

## API Endpoint Access Control

### Document Endpoints
```
GET /api/documents
- User: Basic access to assigned documents
- Branch User: Branch-specific documents only
- District Manager/Admin: All documents

POST /api/documents  
- Uploader, District Manager, Admin: Can upload
- Others: 403 Forbidden

PATCH /api/documents/[id]/status
- Depends on current status and user role
- Validates workflow transitions

GET /api/documents/[id]/download
- All roles with document access
- Logs download activity
```

### Administrative Endpoints
```
/api/admin/*
- Admin only
- Returns 403 for all other roles

/api/system-settings
- Admin, District Manager: Full access
- Others: 403 Forbidden
```

### Branch Endpoints
```
GET /api/branches
- All authenticated users
- Data filtered by role permissions

GET /api/documents/branch/[branchBaCode]
- Branch User: Only if BA code matches assignment
- District Manager/Admin: All branches
```

---

## Security Implementation

### Authentication Flow
1. External PWA API authentication
2. Local user account creation/update
3. DocFlow role assignment based on user data
4. Session creation with role/permission data

### Authorization Middleware
- All protected routes check authentication
- Role-specific routes validate required roles
- API endpoints validate permissions for each action
- Branch-based filtering applied to data queries

### Session Security
- JWT-based sessions with 30-minute idle timeout
- 4-hour absolute session timeout
- Session data includes roles and permissions
- Real-time permission checking on sensitive operations

---

## Role Assignment Logic

### Automatic Role Assignment
Based on user's PWA data:
- **BA Code matching branch**: Assigned `branch_user`
- **Management level indicators**: Assigned `branch_manager`
- **Regional/district indicators**: Assigned `district_manager`
- **IT/Admin indicators**: Assigned `admin`
- **Document management role**: Assigned `uploader`

### Manual Role Override
- Admins can manually assign any role
- Role changes take effect on next login
- Role history is logged

### Default Assignments
- All users get `user` role by default
- Additional roles assigned based on PWA profile data
- Roles can be combined (e.g., user + uploader + district_manager)

---

## Audit and Compliance

### Activity Logging
- All document actions logged with user ID
- Role changes logged
- Failed authorization attempts logged
- Regular audit reports available

### Data Access Tracking
- Document views logged
- Download activity tracked
- Comment creation/modification logged
- Administrative actions fully audited

### Compliance Features
- Role separation for sensitive operations
- Audit trail for all document workflows
- User activity monitoring
- Regular access reviews through admin interface

---

## Future Enhancements

### Planned RBAC Features
1. **Time-based Access**: Roles with expiration dates
2. **Conditional Permissions**: Context-aware access control
3. **Resource-level Permissions**: Document-specific access rights
4. **Delegation**: Temporary role assignment
5. **External Role Sync**: Real-time role updates from PWA system

### Advanced Security
1. **Multi-factor Authentication**: Additional security layer
2. **IP-based Restrictions**: Location-based access control
3. **Device Management**: Trusted device registration
4. **Advanced Audit**: ML-based anomaly detection