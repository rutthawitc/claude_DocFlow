# Document Sharing Workflows Plan - Cross-Department Collaboration

## Overview

This document outlines the design and implementation plan for cross-department document sharing workflows within the BA1059 department system. This feature will enable controlled collaboration between departments while maintaining security and audit trails.

## Current Architecture Context

### Existing Department Structure
- **BA1059 Departments**: 5 isolated departments (105901-105905)
- **Document Isolation**: Each department has separate document spaces
- **Access Control**: Users only see documents from their assigned department
- **Authentication**: Automatic department assignment based on job_name

### Prerequisite: Phase 1-5 Implementation
This feature requires the completion of the BA1059 department implementation (Phases 1-5).

---

## Business Requirements

### Primary Use Cases

1. **Multi-Department Projects**
   - Procurement documents (งานพัสดุ) requiring Finance review (งานการเงิน)
   - Budget proposals needing input from multiple departments
   - Policy documents requiring cross-departmental approval

2. **Approval Workflows**
   - HR policies (งานบุคคล) needing administrative approval (งานธุรการ)
   - Financial procedures requiring multi-level departmental sign-off
   - Procurement processes involving budget verification

3. **Reference and Training Materials**
   - Standard operating procedures shared across departments
   - Training materials accessible to multiple departments
   - Regulatory documents requiring organization-wide visibility

4. **Collaborative Reviews**
   - Draft documents requiring input from subject matter experts in other departments
   - Quality assurance reviews spanning departmental expertise
   - Compliance documents needing multi-departmental validation

### User Roles and Permissions

- **Document Owner**: Original uploader, can share with other departments
- **Department Managers**: Can share documents from their department
- **District Manager**: Can facilitate cross-department sharing
- **Shared Recipients**: Can view/comment based on sharing permissions
- **Admin**: Full oversight of all sharing activities

---

## Technical Architecture

### Database Schema Extensions

#### 1. Document Sharing Table
```sql
CREATE TABLE document_shares (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    from_department_code INTEGER NOT NULL,
    to_department_code INTEGER NOT NULL,
    share_type VARCHAR(20) NOT NULL CHECK (share_type IN ('view', 'comment', 'edit')),
    shared_by INTEGER NOT NULL REFERENCES users(id),
    shared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT true,
    sharing_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(document_id, from_department_code, to_department_code),
    INDEX idx_document_shares_document_id (document_id),
    INDEX idx_document_shares_to_dept (to_department_code),
    INDEX idx_document_shares_from_dept (from_department_code)
);
```

#### 2. Cross-Department Activity Log
```sql
CREATE TABLE cross_department_activities (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id),
    document_share_id INTEGER NOT NULL REFERENCES document_shares(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    activity_type VARCHAR(50) NOT NULL,
    activity_details JSONB,
    department_code INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_cross_dept_activities_document (document_id),
    INDEX idx_cross_dept_activities_user (user_id),
    INDEX idx_cross_dept_activities_dept (department_code)
);
```

#### 3. Enhanced Document Status
```sql
-- Extend existing document status enum
ALTER TYPE document_status ADD VALUE 'shared_cross_department';
ALTER TYPE document_status ADD VALUE 'cross_department_review';
```

### TypeScript Interfaces

#### Core Sharing Types
```typescript
interface DocumentShare {
    id: number;
    documentId: number;
    fromDepartmentCode: number;
    toDepartmentCode: number;
    shareType: ShareType;
    sharedBy: number;
    sharedAt: Date;
    expiresAt: Date | null;
    isActive: boolean;
    sharingMessage: string | null;

    // Relationships
    document?: Document;
    fromDepartment?: Branch;
    toDepartment?: Branch;
    sharer?: User;
}

enum ShareType {
    VIEW = 'view',
    COMMENT = 'comment',
    EDIT = 'edit'
}

interface CrossDepartmentActivity {
    id: number;
    documentId: number;
    documentShareId: number;
    userId: number;
    activityType: CrossDeptActivityType;
    activityDetails: Record<string, any>;
    departmentCode: number;
    createdAt: Date;
}

enum CrossDeptActivityType {
    DOCUMENT_SHARED = 'document_shared',
    DOCUMENT_ACCESSED = 'document_accessed',
    COMMENT_ADDED = 'comment_added',
    DOCUMENT_EDITED = 'document_edited',
    SHARE_EXPIRED = 'share_expired',
    SHARE_REVOKED = 'share_revoked'
}
```

#### Sharing Request Types
```typescript
interface CreateDocumentShareRequest {
    documentId: number;
    toDepartmentCodes: number[];
    shareType: ShareType;
    sharingMessage?: string;
    expiresAt?: Date;
}

interface UpdateDocumentShareRequest {
    shareType?: ShareType;
    expiresAt?: Date;
    isActive?: boolean;
}
```

---

## Implementation Plan

### Phase 6A: Core Sharing Infrastructure

#### Task 6A.1: Database Schema Implementation
- **Priority**: High
- **Estimate**: 2 days
- **Files**:
  - `scripts/add-document-sharing-schema.sql`
  - Database migration scripts
- **Tasks**:
  - Create document_shares table
  - Create cross_department_activities table
  - Add new document status values
  - Create necessary indexes for performance

#### Task 6A.2: Backend Services
- **Priority**: High
- **Estimate**: 3 days
- **Files**:
  - `src/lib/services/document-sharing-service.ts`
  - `src/lib/services/cross-department-activity-logger.ts`
- **Functions**:
  ```typescript
  class DocumentSharingService {
    static async shareDocument(shareRequest: CreateDocumentShareRequest): Promise<DocumentShare[]>
    static async getSharedDocuments(departmentCode: number): Promise<Document[]>
    static async getUserSharedDocuments(userId: number): Promise<Document[]>
    static async revokeDocumentShare(shareId: number): Promise<boolean>
    static async updateDocumentShare(shareId: number, updates: UpdateDocumentShareRequest): Promise<DocumentShare>
    static async getDocumentShares(documentId: number): Promise<DocumentShare[]>
    static async validateSharePermissions(userId: number, documentId: number): Promise<SharePermission>
  }
  ```

#### Task 6A.3: API Endpoints
- **Priority**: High
- **Estimate**: 2 days
- **Files**:
  - `src/app/api/documents/[id]/share/route.ts`
  - `src/app/api/documents/shared/route.ts`
  - `src/app/api/documents/shares/[shareId]/route.ts`
- **Endpoints**:
  - `POST /api/documents/{id}/share` - Share document with departments
  - `GET /api/documents/shared` - Get documents shared with user's department
  - `DELETE /api/documents/shares/{shareId}` - Revoke document share
  - `PATCH /api/documents/shares/{shareId}` - Update share permissions

### Phase 6B: User Interface Implementation

#### Task 6B.1: Document Sharing Modal
- **Priority**: High
- **Estimate**: 2 days
- **Files**:
  - `src/components/docflow/document-sharing-modal.tsx`
  - `src/components/docflow/department-selector.tsx`
- **Features**:
  - Multi-select department picker
  - Share type selection (view/comment/edit)
  - Expiration date picker
  - Sharing message input
  - Permission preview

#### Task 6B.2: Shared Documents View
- **Priority**: High
- **Estimate**: 2 days
- **Files**:
  - `src/app/documents/shared/page.tsx`
  - `src/components/docflow/shared-documents-list.tsx`
- **Features**:
  - List documents shared with user's department
  - Filter by sharing department
  - Share type indicators
  - Expiration warnings
  - Quick access actions

#### Task 6B.3: Document Detail Enhancements
- **Priority**: Medium
- **Estimate**: 1 day
- **Files**:
  - `src/components/docflow/document-sharing-panel.tsx`
  - Updates to existing document detail page
- **Features**:
  - "Share with Departments" button
  - List of departments document is shared with
  - Share management for document owners
  - Cross-department activity timeline

### Phase 6C: Advanced Features

#### Task 6C.1: Notification System Integration
- **Priority**: Medium
- **Estimate**: 2 days
- **Files**:
  - Updates to `src/lib/services/notification-service.ts`
  - `src/lib/services/cross-department-notifications.ts`
- **Features**:
  - Email notifications when documents are shared
  - Telegram notifications for urgent shares
  - In-app notification badges
  - Daily digest of shared documents

#### Task 6C.2: Advanced Permissions & Workflow
- **Priority**: Medium
- **Estimate**: 3 days
- **Files**:
  - `src/lib/services/document-workflow-service.ts`
  - `src/components/docflow/approval-workflow.tsx`
- **Features**:
  - Sequential approval workflows
  - Conditional sharing based on document status
  - Department-specific approval chains
  - Workflow templates

#### Task 6C.3: Analytics and Reporting
- **Priority**: Low
- **Estimate**: 2 days
- **Files**:
  - `src/app/reports/cross-department/page.tsx`
  - `src/lib/services/sharing-analytics-service.ts`
- **Features**:
  - Cross-department collaboration metrics
  - Most shared documents reports
  - Department interaction statistics
  - Sharing trend analysis

---

## Security Considerations

### Access Control
- **Principle of Least Privilege**: Users can only share documents they own or manage
- **Department Isolation**: Sharing must be explicitly granted, no implicit access
- **Role-based Restrictions**: Different sharing capabilities based on user roles
- **Audit Trail**: All sharing activities logged for compliance

### Data Protection
- **Encryption**: Shared document metadata encrypted in transit and at rest
- **Expiration**: Automatic expiration of shares to limit long-term access
- **Revocation**: Immediate revocation capabilities for security incidents
- **Compliance**: GDPR/privacy compliance for shared document data

### Validation and Sanitization
```typescript
// Example validation schemas
const documentShareSchema = z.object({
  documentId: z.number().positive(),
  toDepartmentCodes: z.array(z.number().positive()).min(1).max(5),
  shareType: z.enum(['view', 'comment', 'edit']),
  sharingMessage: z.string().max(500).optional(),
  expiresAt: z.date().min(new Date()).optional()
});
```

---

## Performance Considerations

### Database Optimization
- **Indexes**: Optimized indexes on sharing tables for fast queries
- **Caching**: Redis caching for frequently accessed shared documents
- **Pagination**: Efficient pagination for large shared document lists
- **Query Optimization**: Optimized JOIN queries for shared document retrieval

### Frontend Performance
- **Lazy Loading**: Lazy load shared documents lists
- **Virtual Scrolling**: For large lists of shared documents
- **Optimistic Updates**: Immediate UI updates with fallback handling
- **Debounced Search**: Efficient search across shared documents

---

## Testing Strategy

### Unit Tests
- Document sharing service functions
- Permission validation logic
- Share expiration handling
- Cross-department activity logging

### Integration Tests
- API endpoint functionality
- Database transaction integrity
- Email/notification integration
- Authentication and authorization

### E2E Tests
```typescript
// Example test scenarios
describe('Cross-Department Document Sharing', () => {
  it('should allow department manager to share document with other departments')
  it('should prevent unauthorized users from accessing shared documents')
  it('should automatically expire shared documents')
  it('should send notifications when documents are shared')
  it('should maintain audit trail of all sharing activities')
})
```

### Performance Tests
- Load testing with multiple concurrent sharing operations
- Database performance under heavy sharing activity
- UI responsiveness with large shared document lists

---

## Migration Strategy

### Development Phase
1. **Schema Migration**: Apply database changes in development
2. **Service Implementation**: Build and test sharing services
3. **UI Development**: Create sharing interfaces
4. **Integration Testing**: Test with existing department system

### Production Deployment
1. **Database Migration**: Apply schema changes during maintenance window
2. **Feature Flag**: Deploy with sharing feature disabled initially
3. **Gradual Rollout**: Enable for specific departments first
4. **Full Release**: Enable for all departments after validation

### Rollback Plan
- **Database Rollback**: Scripts to remove sharing tables if needed
- **Feature Toggle**: Immediate disable capability via configuration
- **Data Preservation**: Maintain sharing data for potential re-enable

---

## Monitoring and Analytics

### Key Metrics
- **Sharing Activity**: Number of documents shared per department
- **User Engagement**: Active users of sharing features
- **Performance**: API response times for sharing operations
- **Errors**: Failed sharing attempts and reasons

### Alerts
- **Security**: Unusual sharing patterns or potential security issues
- **Performance**: Slow sharing operations or database issues
- **Business**: High-value documents being shared extensively

---

## Future Enhancements (Phase 7+)

### Advanced Workflow Features
- **Approval Chains**: Multi-step approval processes across departments
- **Conditional Sharing**: Auto-sharing based on document content or metadata
- **External Sharing**: Share with external organizations (with enhanced security)

### AI/ML Integration
- **Smart Recommendations**: Suggest departments to share with based on document content
- **Anomaly Detection**: Identify unusual sharing patterns
- **Content Analysis**: Auto-categorize documents for appropriate sharing

### Mobile Optimization
- **Mobile App**: Native mobile app support for sharing workflows
- **Push Notifications**: Mobile push notifications for sharing activities
- **Offline Access**: Limited offline access to frequently shared documents

---

## Success Criteria

### Functional Requirements
1. ✅ Department managers can share documents with other departments
2. ✅ Shared documents appear in recipient department's shared documents list
3. ✅ Share permissions (view/comment/edit) are enforced correctly
4. ✅ District managers can see all cross-department sharing activity
5. ✅ Audit trail captures all sharing and access activities

### Performance Requirements
1. ✅ Document sharing completes within 2 seconds
2. ✅ Shared documents list loads within 3 seconds
3. ✅ Search across shared documents completes within 1 second
4. ✅ System supports 100+ concurrent sharing operations

### Security Requirements
1. ✅ Only authorized users can share documents from their department
2. ✅ Shared documents cannot be accessed after permission revocation
3. ✅ All sharing activities are logged for audit purposes
4. ✅ Expired shares are automatically cleaned up

### User Experience Requirements
1. ✅ Intuitive sharing interface with clear permission controls
2. ✅ Clear visual indicators for shared documents
3. ✅ Easy management of outgoing and incoming shares
4. ✅ Helpful notifications for sharing activities

---

## Risk Assessment

### High Risk Items
- **Data Security**: Inadvertent over-sharing of sensitive documents
- **Performance Impact**: Sharing queries affecting overall system performance
- **Complex Permissions**: Confusion over overlapping permissions and access rights

### Medium Risk Items
- **User Adoption**: Departments not utilizing sharing features effectively
- **Integration Issues**: Conflicts with existing document workflow
- **Notification Overload**: Too many notifications reducing user engagement

### Mitigation Strategies
- **Security Training**: User education on appropriate sharing practices
- **Performance Monitoring**: Continuous monitoring and optimization
- **Phased Rollout**: Gradual introduction with user feedback incorporation
- **Clear Documentation**: Comprehensive user guides and best practices

---

**Document Created**: 2025-01-15
**Author**: Claude Code Assistant
**Status**: Planning Phase - Ready for Implementation
**Prerequisites**: BA1059 Department Implementation (Phases 1-5) Complete
**Estimated Total Effort**: 15-20 development days
**Target Completion**: Q2 2025