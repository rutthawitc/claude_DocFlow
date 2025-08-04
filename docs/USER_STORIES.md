# DocFlow User Stories

## Overview
This document outlines the user stories for the DocFlow document management system, organized by user roles and workflow stages.

## User Roles

### 1. Uploader (เจ้าหน้าที่อัปโหลด)
**Description**: District-level staff responsible for uploading and managing documents to be sent to branches.

### 2. Branch User (ผู้ใช้สาขา)
**Description**: Branch-level staff who receive, review, and respond to documents from the district.

### 3. Branch Manager (ผู้จัดการสาขา)
**Description**: Branch-level management with additional oversight and approval capabilities.

### 4. District Manager (ผู้จัดการเขต)
**Description**: District-level management with oversight of the entire document workflow across all branches.

### 5. Admin (ผู้ดูแลระบบ)
**Description**: System administrator with full access to all features and administrative functions.

---

## Document Workflow User Stories

### Document Creation & Upload

#### US-001: Upload Document
**As an** Uploader  
**I want to** upload PDF documents with metadata  
**So that** I can distribute important communications to branches

**Acceptance Criteria:**
- Can select PDF files up to 10MB
- Must provide MT number, MT date, subject, and target month/year
- Can select target branch(es) for distribution
- System validates file format and size
- Document automatically enters "draft" status
- Activity is logged with timestamp and user info

#### US-002: Edit Draft Document
**As an** Uploader  
**I want to** modify document metadata before sending  
**So that** I can ensure accuracy before distribution

**Acceptance Criteria:**
- Can only edit documents in "draft" status
- Can update all metadata fields
- Can replace the PDF file
- Changes are logged in activity history

### Document Distribution

#### US-003: Send Document to Branch
**As an** Uploader  
**I want to** send draft documents to designated branches  
**So that** branch staff can review and respond

**Acceptance Criteria:**
- Can only send documents in "draft" status
- Document status changes to "sent_to_branch"
- Telegram notification sent to configured channels (if enabled)
- Branch users can now view the document
- Activity is logged

#### US-004: Bulk Document Management
**As a** District Manager or Admin  
**I want to** view and manage multiple documents across branches  
**So that** I can monitor workflow progress efficiently

**Acceptance Criteria:**
- Can filter documents by status, branch, date range
- Can see document counts per branch
- Can search documents by MT number or subject
- Can access all documents regardless of branch assignment

### Branch Response

#### US-005: View Assigned Documents
**As a** Branch User  
**I want to** see documents sent to my branch  
**So that** I can review and respond appropriately

**Acceptance Criteria:**
- Can only see documents assigned to my branch
- Can view PDF content in embedded viewer
- Can see document metadata and history
- Can filter by status and date

#### US-006: Acknowledge Document
**As a** Branch User  
**I want to** acknowledge receipt of documents  
**So that** the district knows I have reviewed them

**Acceptance Criteria:**
- Can acknowledge documents in "sent_to_branch" status
- Document status changes to "acknowledged"
- Can add optional comment
- Telegram notification sent (if enabled)
- Activity is logged

#### US-007: Send Document Back to District
**As a** Branch User  
**I want to** return documents with questions or issues  
**So that** I can get clarification or raise concerns

**Acceptance Criteria:**
- Can send back documents in "sent_to_branch" or "acknowledged" status
- Must provide comment explaining reason
- Document status changes to "sent_back_to_district"
- Telegram notification sent (if enabled)
- Activity is logged with comment

### Document Review & Re-processing

#### US-008: Handle Returned Documents
**As an** Uploader  
**I want to** review documents returned by branches  
**So that** I can address issues and re-send if needed

**Acceptance Criteria:**
- Can view returned documents with branch comments
- Can add response comments
- Can re-send document to branch (status becomes "sent_to_branch")
- All interactions are logged

### Comments & Collaboration

#### US-009: Add Comments
**As a** Branch User, Uploader, or Manager  
**I want to** add comments to documents  
**So that** I can communicate with other stakeholders

**Acceptance Criteria:**
- Can add comments to any document I have access to
- Comments show timestamp and author
- Comments support multi-line text
- Email/Telegram notifications sent (if configured)

#### US-010: View Document History
**As any** authenticated user  
**I want to** see the complete history of document changes  
**So that** I can track progress and understand context

**Acceptance Criteria:**
- Shows all status changes with timestamps
- Shows all comments in chronological order
- Shows who performed each action
- Shows document metadata changes

### PDF Management

#### US-011: View PDF Documents
**As any** user with document access  
**I want to** view PDF content directly in the browser  
**So that** I don't need to download files to review them

**Acceptance Criteria:**
- PDF renders in embedded viewer
- Supports zoom, page navigation
- Works on desktop and mobile browsers
- Respects CSP security policies

#### US-012: Download Documents
**As any** user with document access  
**I want to** download PDF files  
**So that** I can save copies for offline reference

**Acceptance Criteria:**
- Download preserves original filename with Thai characters
- File download activity is logged
- Supports browsers with different character encoding

### Search & Filtering

#### US-013: Search Documents
**As any** authenticated user  
**I want to** search for documents by various criteria  
**So that** I can quickly find relevant information

**Acceptance Criteria:**
- Can search by MT number, subject, branch
- Can filter by status, date range, uploader
- Search results respect user access permissions
- Results show relevant metadata

#### US-014: Branch-Specific Views
**As a** Branch User  
**I want to** see only documents relevant to my branch  
**So that** I can focus on my responsibilities

**Acceptance Criteria:**
- Default view shows only my branch's documents
- Cannot access other branches' documents
- Document counts and statistics are branch-specific

### Administrative Functions

#### US-015: User Management
**As an** Admin  
**I want to** manage user accounts and roles  
**So that** I can control system access and permissions

**Acceptance Criteria:**
- Can create, edit, disable user accounts
- Can assign and modify user roles
- Can view user activity logs
- Can manage branch assignments

#### US-016: System Settings
**As an** Admin or District Manager  
**I want to** configure system settings  
**So that** I can customize the system behavior

**Acceptance Criteria:**
- Can configure Telegram notifications
- Can set maintenance mode
- Can manage file retention policies
- Can configure backup schedules

#### US-017: Reporting & Analytics
**As a** District Manager or Admin  
**I want to** view system reports and analytics  
**So that** I can monitor system usage and performance

**Acceptance Criteria:**
- Can view document processing statistics
- Can see user activity reports
- Can export data for external analysis
- Can view system health metrics

### Notifications

#### US-018: Telegram Notifications
**As a** system stakeholder  
**I want to** receive notifications about document activities  
**So that** I can stay informed without constantly checking the system

**Acceptance Criteria:**
- Notifications sent for status changes
- Notifications include document details
- Can configure notification preferences
- Supports Thai language messages

### Session Management

#### US-019: Secure Session Handling
**As any** user  
**I want** my session to be secure with appropriate timeouts  
**So that** unauthorized access is prevented

**Acceptance Criteria:**
- Session expires after 30 minutes of inactivity
- Absolute session timeout of 4 hours
- Warning shown 5 minutes before expiration
- Can extend session from warning dialog

### Mobile & Accessibility

#### US-020: Mobile Access
**As any** user  
**I want to** access the system from mobile devices  
**So that** I can work from anywhere

**Acceptance Criteria:**
- Responsive design works on phones and tablets
- PDF viewer functions on mobile browsers
- Navigation adapted for touch interfaces
- All critical functions available on mobile

---

## Technical User Stories

### Performance

#### US-021: Fast Document Loading
**As any** user  
**I want** documents to load quickly  
**So that** I can work efficiently

**Acceptance Criteria:**
- Documents load within 2 seconds
- PDF viewer initializes quickly
- Search results appear within 1 second
- Caching reduces repeated load times

### Security

#### US-022: Secure File Access
**As a** system administrator  
**I want** all file access to be properly authenticated and authorized  
**So that** sensitive documents remain secure

**Acceptance Criteria:**
- All API endpoints require authentication
- File access respects role-based permissions
- Activity logging captures all access attempts
- Rate limiting prevents abuse

### Backup & Recovery

#### US-023: Data Backup
**As an** Admin  
**I want** regular system backups  
**So that** data is protected against loss

**Acceptance Criteria:**
- Automated daily backups
- Manual backup trigger available
- Backup status monitoring
- File cleanup and retention policies

---

## Priority Matrix

### High Priority (Must Have)
- US-001, US-003, US-005, US-006, US-007, US-011, US-019, US-022

### Medium Priority (Should Have)  
- US-002, US-004, US-008, US-009, US-010, US-012, US-013, US-014, US-018, US-020

### Low Priority (Nice to Have)
- US-015, US-016, US-017, US-021, US-023

---

## Workflow Summary

```
[Draft] → [Sent to Branch] → [Acknowledged] → [Complete]
                ↓                 ↓
        [Sent Back to District] ←←←
                ↓
        [Re-sent to Branch]
```

Each status transition represents a user story and involves specific role permissions as defined in the RBAC matrix.