# Bulk Department Management System Plan

## Overview

The Bulk Department Management System is an administrative enhancement that enables efficient management of multiple BA1059 departments simultaneously. This system provides tools for batch operations, centralized configuration, and streamlined administration across all department entities (105901-105905).

## Current Management State (Post Phase 1-5)

### Individual Department Management
- Each department (105901-105905) managed separately
- User assignments handled one by one
- Document operations performed per department
- Settings and permissions configured individually
- Manual processes for cross-department operations

### Administrative Pain Points
- **Time-consuming**: Repetitive tasks across 5 departments
- **Error-prone**: Manual operations increase mistake likelihood
- **Inconsistent**: Settings may drift across departments
- **Limited Oversight**: Difficult to maintain organization-wide policies
- **Poor Scalability**: Manual processes don't scale with growth

---

## Business Requirements

### Primary Administrative Use Cases

1. **Organizational Restructuring**
   - Department mergers and splits
   - User reassignments during reorganization
   - Document migrations between departments
   - Permission realignment after structural changes

2. **Policy Implementation**
   - Organization-wide policy rollouts
   - Compliance requirement implementation
   - Security setting standardization
   - Workflow rule synchronization

3. **Operational Maintenance**
   - Bulk document archiving and cleanup
   - Mass user onboarding and offboarding
   - Scheduled maintenance operations
   - System-wide configuration updates

4. **Reporting and Analytics**
   - Cross-department performance reports
   - Compliance auditing across all departments
   - Resource utilization analysis
   - Comparative department analytics

### Target User Roles
- **System Administrators**: Full bulk management capabilities
- **District Managers**: Department-level bulk operations
- **HR Administrators**: User-focused bulk operations
- **Compliance Officers**: Audit and reporting bulk functions

---

## Technical Architecture

### Core System Components

#### 1. Bulk Operations Engine
```typescript
interface BulkOperation {
    id: string;
    type: BulkOperationType;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    targetDepartments: number[];
    targetCount: number;
    processedCount: number;
    successCount: number;
    failureCount: number;
    errors: BulkOperationError[];
    initiatedBy: number;
    startedAt: Date;
    completedAt?: Date;
    metadata: Record<string, any>;
}

enum BulkOperationType {
    USER_ASSIGNMENT = 'user_assignment',
    USER_TRANSFER = 'user_transfer',
    DOCUMENT_TRANSFER = 'document_transfer',
    DOCUMENT_SHARING = 'document_sharing',
    DOCUMENT_ARCHIVE = 'document_archive',
    SETTINGS_UPDATE = 'settings_update',
    PERMISSION_UPDATE = 'permission_update',
    REPORT_GENERATION = 'report_generation'
}

interface BulkOperationError {
    itemId: string;
    error: string;
    details?: Record<string, any>;
}
```

#### 2. Database Schema Extensions

##### Bulk Operations Tracking
```sql
CREATE TABLE bulk_operations (
    id VARCHAR(36) PRIMARY KEY,
    operation_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    target_departments INTEGER[] NOT NULL,
    target_count INTEGER NOT NULL DEFAULT 0,
    processed_count INTEGER NOT NULL DEFAULT 0,
    success_count INTEGER NOT NULL DEFAULT 0,
    failure_count INTEGER NOT NULL DEFAULT 0,
    errors JSONB DEFAULT '[]',
    initiated_by INTEGER NOT NULL REFERENCES users(id),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_bulk_ops_status (status),
    INDEX idx_bulk_ops_type (operation_type),
    INDEX idx_bulk_ops_initiated_by (initiated_by),
    INDEX idx_bulk_ops_started_at (started_at)
);
```

##### Operation Log Details
```sql
CREATE TABLE bulk_operation_items (
    id SERIAL PRIMARY KEY,
    bulk_operation_id VARCHAR(36) NOT NULL REFERENCES bulk_operations(id),
    item_type VARCHAR(50) NOT NULL,
    item_id VARCHAR(100) NOT NULL,
    department_code INTEGER,
    status VARCHAR(20) NOT NULL,
    error_message TEXT NULL,
    processed_at TIMESTAMP NULL,
    metadata JSONB DEFAULT '{}',

    INDEX idx_bulk_items_operation (bulk_operation_id),
    INDEX idx_bulk_items_status (status),
    INDEX idx_bulk_items_dept (department_code)
);
```

#### 3. TypeScript Service Interfaces

##### Bulk User Management
```typescript
interface BulkUserAssignment {
    userIds: number[];
    targetDepartments: number[];
    operation: 'assign' | 'transfer' | 'remove';
    effectiveDate?: Date;
    reason?: string;
}

interface BulkUserResult {
    userId: number;
    success: boolean;
    previousDepartments?: number[];
    newDepartments?: number[];
    error?: string;
}
```

##### Bulk Document Operations
```typescript
interface BulkDocumentOperation {
    documentIds: number[];
    operation: 'transfer' | 'copy' | 'share' | 'archive' | 'delete';
    targetDepartments?: number[];
    sharePermissions?: ShareType[];
    archiveReason?: string;
    metadata?: {
        reason: string;
        effectiveDate: Date;
        expirationDate?: Date;
        notifyUsers: boolean;
    };
}

interface BulkDocumentResult {
    documentId: number;
    success: boolean;
    previousDepartment?: number;
    newDepartments?: number[];
    error?: string;
    affectedUsers?: number[];
}
```

##### Bulk Settings Management
```typescript
interface DepartmentSettingsTemplate {
    name: string;
    description: string;
    category: 'security' | 'workflow' | 'notifications' | 'compliance';
    settings: {
        documentRetentionDays?: number;
        autoArchiveEnabled?: boolean;
        requireApproval?: boolean;
        notificationSettings?: NotificationConfig;
        workflowRules?: WorkflowRule[];
        accessPermissions?: Permission[];
        customFields?: Record<string, any>;
    };
    version: string;
    createdBy: number;
    createdAt: Date;
}

interface BulkSettingsApplication {
    templateId: string;
    targetDepartments: number[];
    overrideExisting: boolean;
    backupCurrent: boolean;
    validateBefore: boolean;
}
```

---

## Implementation Plan

### Phase 7A: Core Bulk Operations Infrastructure

#### Task 7A.1: Database Schema and Models
- **Priority**: High
- **Estimate**: 2 days
- **Files**:
  - `scripts/add-bulk-management-schema.sql`
  - `src/lib/types/bulk-operations.ts`
  - `src/db/schema-bulk-operations.ts`

**Tasks**:
- Create bulk_operations and bulk_operation_items tables
- Define TypeScript interfaces and enums
- Create database indexes for performance
- Add foreign key constraints and validations

#### Task 7A.2: Bulk Operations Engine
- **Priority**: High
- **Estimate**: 4 days
- **Files**:
  - `src/lib/services/bulk-operations-engine.ts`
  - `src/lib/services/bulk-queue-manager.ts`
  - `src/lib/utils/bulk-operation-processor.ts`

**Core Service Functions**:
```typescript
class BulkOperationsEngine {
    // Core engine methods
    static async createBulkOperation(type: BulkOperationType, params: any): Promise<BulkOperation>
    static async executeBulkOperation(operationId: string): Promise<BulkOperation>
    static async cancelBulkOperation(operationId: string): Promise<boolean>
    static async getBulkOperationStatus(operationId: string): Promise<BulkOperation>
    static async getBulkOperationHistory(filters: BulkOperationFilters): Promise<BulkOperation[]>

    // Operation-specific methods
    static async bulkAssignUsers(assignment: BulkUserAssignment): Promise<string>
    static async bulkTransferDocuments(operation: BulkDocumentOperation): Promise<string>
    static async bulkUpdateSettings(application: BulkSettingsApplication): Promise<string>
    static async bulkGenerateReports(request: BulkReportRequest): Promise<string>

    // Utility methods
    static async validateBulkOperation(type: BulkOperationType, params: any): Promise<ValidationResult>
    static async estimateBulkOperation(type: BulkOperationType, params: any): Promise<BulkEstimate>
}
```

#### Task 7A.3: API Endpoints
- **Priority**: High
- **Estimate**: 3 days
- **Files**:
  - `src/app/api/admin/bulk-operations/route.ts`
  - `src/app/api/admin/bulk-operations/[id]/route.ts`
  - `src/app/api/admin/bulk-operations/templates/route.ts`

**API Endpoints**:
- `POST /api/admin/bulk-operations` - Create new bulk operation
- `GET /api/admin/bulk-operations` - List bulk operations with filters
- `GET /api/admin/bulk-operations/{id}` - Get specific operation status
- `POST /api/admin/bulk-operations/{id}/cancel` - Cancel running operation
- `GET /api/admin/bulk-operations/templates` - Get settings templates
- `POST /api/admin/bulk-operations/templates` - Create settings template

### Phase 7B: User Interface Implementation

#### Task 7B.1: Bulk Operations Dashboard
- **Priority**: High
- **Estimate**: 3 days
- **Files**:
  - `src/app/admin/bulk-operations/page.tsx`
  - `src/components/admin/bulk-operations-dashboard.tsx`
  - `src/components/admin/operation-status-card.tsx`

**Features**:
- Real-time operation status monitoring
- Operation history and logs
- Quick action buttons for common operations
- Progress indicators and estimated completion times

#### Task 7B.2: Department Multi-Select Interface
- **Priority**: High
- **Estimate**: 2 days
- **Files**:
  - `src/components/admin/department-multi-selector.tsx`
  - `src/components/admin/department-grid-view.tsx`
  - `src/components/admin/department-tree-view.tsx`

**UI Components**:
```tsx
const BulkDepartmentSelector = () => {
  const [selectedDepts, setSelectedDepts] = useState<number[]>([]);
  const [selectionMode, setSelectionMode] = useState<'grid' | 'tree'>('grid');

  return (
    <div className="bulk-department-selector">
      <div className="selection-controls">
        <Button onClick={() => selectAllDepartments()}>
          <CheckSquare className="h-4 w-4 mr-2" />
          Select All Departments ({TOTAL_DEPARTMENTS})
        </Button>
        <Button onClick={() => clearSelection()}>
          <Square className="h-4 w-4 mr-2" />
          Clear Selection
        </Button>
        <Button onClick={() => selectByRegion('R6')}>
          <Map className="h-4 w-4 mr-2" />
          Select R6 Departments
        </Button>
      </div>

      <div className="view-toggle">
        <ToggleGroup value={selectionMode} onValueChange={setSelectionMode}>
          <ToggleGroupItem value="grid">Grid View</ToggleGroupItem>
          <ToggleGroupItem value="tree">Tree View</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="department-selection">
        {selectionMode === 'grid' ? (
          <DepartmentGridView
            departments={departments}
            selectedDepts={selectedDepts}
            onSelectionChange={setSelectedDepts}
          />
        ) : (
          <DepartmentTreeView
            departments={departments}
            selectedDepts={selectedDepts}
            onSelectionChange={setSelectedDepts}
          />
        )}
      </div>

      <div className="selection-summary">
        <Badge variant="outline">
          {selectedDepts.length} departments selected
        </Badge>
        <div className="selected-departments-list">
          {selectedDepts.map(deptCode => (
            <Chip
              key={deptCode}
              onRemove={() => removeDepartment(deptCode)}
            >
              {getDepartmentName(deptCode)}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  );
};
```

#### Task 7B.3: Bulk Operations Modals
- **Priority**: High
- **Estimate**: 3 days
- **Files**:
  - `src/components/admin/bulk-user-management-modal.tsx`
  - `src/components/admin/bulk-document-operations-modal.tsx`
  - `src/components/admin/bulk-settings-modal.tsx`

**Modal Features**:
- Step-by-step wizards for complex operations
- Preview and confirmation screens
- Validation and error handling
- Progress tracking during execution

#### Task 7B.4: Operations History and Monitoring
- **Priority**: Medium
- **Estimate**: 2 days
- **Files**:
  - `src/components/admin/operations-history.tsx`
  - `src/components/admin/operation-detail-view.tsx`
  - `src/components/admin/operation-logs-viewer.tsx`

**Monitoring Features**:
- Filterable operations history
- Detailed operation logs and error reporting
- Success/failure statistics
- Re-run failed operations capability

### Phase 7C: Advanced Features

#### Task 7C.1: Settings Templates System
- **Priority**: Medium
- **Estimate**: 3 days
- **Files**:
  - `src/lib/services/settings-template-service.ts`
  - `src/components/admin/template-manager.tsx`
  - `src/components/admin/template-editor.tsx`

**Template Features**:
- Create and manage settings templates
- Version control for templates
- Template validation and testing
- Import/export template functionality

#### Task 7C.2: Scheduled Bulk Operations
- **Priority**: Medium
- **Estimate**: 3 days
- **Files**:
  - `src/lib/services/bulk-scheduler.ts`
  - `src/components/admin/operation-scheduler.tsx`
  - `src/lib/utils/cron-parser.ts`

**Scheduling Features**:
- Cron-based scheduling system
- Recurring operation definitions
- Dependency management between operations
- Notification system for scheduled operations

#### Task 7C.3: Bulk Reporting and Analytics
- **Priority**: Medium
- **Estimate**: 4 days
- **Files**:
  - `src/lib/services/bulk-reporting-service.ts`
  - `src/components/admin/bulk-analytics-dashboard.tsx`
  - `src/components/admin/cross-department-reports.tsx`

**Reporting Features**:
```typescript
interface BulkReportRequest {
    reportType: 'cross_department_activity' | 'user_distribution' | 'document_statistics' | 'compliance_summary';
    departments: number[];
    dateRange: { from: Date; to: Date };
    groupBy: 'department' | 'user' | 'document_type' | 'activity_type';
    filters: {
        userRoles?: string[];
        documentStatuses?: string[];
        activityTypes?: string[];
        customFilters?: Record<string, any>;
    };
    outputFormat: 'json' | 'csv' | 'xlsx' | 'pdf';
    deliveryMethod: 'download' | 'email' | 'save_to_system';
    scheduleRecurring?: {
        frequency: 'daily' | 'weekly' | 'monthly';
        cronExpression?: string;
        recipients: string[];
    };
}
```

---

## Use Case Scenarios

### Scenario 1: Major Organizational Restructuring

**Situation**: BA1059 undergoes restructuring - merging งานธุรการ (105902) and งานบุคคล (105905)

**Required Operations**:
1. **User Consolidation**:
   ```typescript
   const userTransfer: BulkUserAssignment = {
     userIds: [101, 102, 103, 104, 105], // Users from งานธุรการ
     targetDepartments: [105905], // Move to งานบุคคล
     operation: 'transfer',
     reason: 'Department merger - Q1 2025 restructuring'
   };
   ```

2. **Document Migration**:
   ```typescript
   const documentTransfer: BulkDocumentOperation = {
     documentIds: getAllDocumentsByDepartment(105902),
     operation: 'transfer',
     targetDepartments: [105905],
     metadata: {
       reason: 'Department consolidation',
       effectiveDate: new Date('2025-04-01'),
       notifyUsers: true
     }
   };
   ```

3. **Settings Harmonization**:
   ```typescript
   const settingsUpdate: BulkSettingsApplication = {
     templateId: 'hr_department_standard',
     targetDepartments: [105905],
     overrideExisting: true,
     backupCurrent: true
   };
   ```

### Scenario 2: Annual Compliance Review

**Situation**: Year-end compliance requires standardization across all departments

**Required Operations**:
1. **Document Audit and Archive**:
   - Bulk archive documents older than retention policy
   - Generate compliance reports for all departments
   - Update document metadata for audit trail

2. **Settings Standardization**:
   - Apply new data retention policies
   - Update security settings across departments
   - Synchronize workflow approval requirements

3. **User Certification**:
   - Generate user access reports
   - Update user permissions based on current roles
   - Schedule compliance training assignments

### Scenario 3: System Migration/Upgrade

**Situation**: DocFlow system upgrade requires data migration and reconfiguration

**Required Operations**:
1. **Data Migration**:
   - Export all department data in bulk
   - Transform data for new system format
   - Import and validate migrated data

2. **Configuration Migration**:
   - Export current department settings
   - Apply settings to new system structure
   - Test and validate configuration consistency

3. **User Migration**:
   - Migrate user accounts and permissions
   - Update authentication integrations
   - Validate access patterns post-migration

---

## Technical Benefits

### Administrative Efficiency
- **Time Reduction**: Operations that took hours now complete in minutes
- **Error Reduction**: Automated processes reduce manual mistakes
- **Consistency**: Ensure uniform application of policies and settings
- **Scalability**: Handle organizational growth efficiently

### Operational Benefits
- **Centralized Control**: Single interface for multi-department management
- **Audit Compliance**: Comprehensive logging of all bulk operations
- **Risk Mitigation**: Validation and rollback capabilities
- **Resource Optimization**: Efficient use of administrative time and effort

### System Benefits
- **Data Integrity**: Transactional operations ensure consistency
- **Performance**: Optimized bulk operations reduce system load
- **Monitoring**: Real-time visibility into operation progress and status
- **Recovery**: Built-in error handling and recovery mechanisms

---

## Security Considerations

### Access Control
```typescript
interface BulkOperationPermission {
    operation: BulkOperationType;
    requiredRoles: UserRole[];
    departmentRestrictions?: number[];
    additionalChecks?: PermissionCheck[];
}

const BULK_PERMISSIONS: BulkOperationPermission[] = [
    {
        operation: BulkOperationType.USER_ASSIGNMENT,
        requiredRoles: ['admin', 'district_manager'],
        additionalChecks: ['can_manage_users']
    },
    {
        operation: BulkOperationType.SETTINGS_UPDATE,
        requiredRoles: ['admin'],
        additionalChecks: ['can_modify_system_settings']
    }
];
```

### Audit and Compliance
- **Complete Audit Trail**: All bulk operations logged with full details
- **Approval Workflows**: Multi-step approval for sensitive operations
- **Data Protection**: Compliance with privacy regulations
- **Change Management**: Documented change processes for bulk operations

### Risk Mitigation
- **Validation Gates**: Pre-execution validation and confirmation
- **Rollback Capability**: Ability to undo bulk operations when possible
- **Backup Integration**: Automatic backups before major operations
- **Progressive Execution**: Gradual rollout with monitoring and pause capability

---

## Performance Considerations

### Database Optimization
```sql
-- Optimized indexes for bulk operations
CREATE INDEX CONCURRENTLY idx_documents_dept_status ON documents(branch_ba_code, status);
CREATE INDEX CONCURRENTLY idx_users_dept_active ON users(department_codes, is_active) WHERE is_active = true;
CREATE INDEX CONCURRENTLY idx_bulk_ops_status_type ON bulk_operations(status, operation_type);
```

### Queue Management
```typescript
interface BulkOperationQueue {
    maxConcurrentOps: number;
    batchSize: number;
    retryPolicy: {
        maxRetries: number;
        backoffStrategy: 'exponential' | 'linear';
        retryDelayMs: number;
    };
    priorityLevels: QueuePriority[];
}
```

### Resource Management
- **Memory Optimization**: Stream processing for large datasets
- **CPU Throttling**: Configurable processing limits to prevent system overload
- **I/O Management**: Batch database operations for efficiency
- **Monitoring**: Real-time resource usage tracking and alerting

---

## Testing Strategy

### Unit Tests
```typescript
describe('BulkOperationsEngine', () => {
    describe('bulkAssignUsers', () => {
        it('should successfully assign users to multiple departments');
        it('should handle partial failures gracefully');
        it('should validate user permissions before assignment');
        it('should create proper audit trail entries');
    });

    describe('bulkTransferDocuments', () => {
        it('should transfer documents between departments');
        it('should maintain document metadata integrity');
        it('should update access permissions correctly');
        it('should handle document conflicts appropriately');
    });
});
```

### Integration Tests
- **Database Transaction Tests**: Verify data consistency during bulk operations
- **Permission Integration**: Test role-based access controls for bulk operations
- **External System Integration**: Test notifications and audit logging
- **Error Recovery**: Test rollback and recovery mechanisms

### Performance Tests
- **Load Testing**: Test system behavior under heavy bulk operation loads
- **Memory Testing**: Verify memory usage patterns for large operations
- **Concurrent Operations**: Test multiple simultaneous bulk operations
- **Database Performance**: Monitor query performance during bulk operations

### User Acceptance Testing
- **Administrative Workflows**: Test common administrative scenarios
- **Error Handling**: Test user experience during operation failures
- **UI Responsiveness**: Test interface performance during long operations
- **Report Generation**: Test bulk reporting functionality and accuracy

---

## Migration and Deployment Strategy

### Development Phase
1. **Infrastructure Setup**: Deploy bulk operations infrastructure in development
2. **Service Development**: Build and test bulk operation services
3. **UI Development**: Create administrative interfaces
4. **Integration Testing**: Test with existing department system

### Staging Deployment
1. **Feature Flag**: Deploy with bulk operations disabled initially
2. **Limited Testing**: Enable for administrative users only
3. **Performance Validation**: Test with production-like data volumes
4. **Security Review**: Comprehensive security and permission testing

### Production Rollout
1. **Gradual Enablement**: Enable bulk operations for limited user groups
2. **Monitoring Phase**: Close monitoring of operation performance and errors
3. **Full Release**: Enable for all authorized administrative users
4. **Training Rollout**: Provide training and documentation for administrators

### Rollback Plan
- **Feature Toggle**: Immediate disable capability via configuration
- **Data Consistency**: Verify data integrity before and after operations
- **Backup Recovery**: Database backup recovery procedures
- **Service Isolation**: Ability to isolate bulk operations from core system

---

## Success Criteria

### Functional Requirements
1. ✅ Administrators can perform bulk operations across multiple departments
2. ✅ Operations complete successfully with proper error handling and reporting
3. ✅ All bulk operations create comprehensive audit trails
4. ✅ Settings templates can be applied consistently across departments
5. ✅ Bulk reports generate accurate cross-department analytics

### Performance Requirements
1. ✅ Bulk user assignment (100 users) completes within 5 minutes
2. ✅ Bulk document operations (500 documents) complete within 15 minutes
3. ✅ Settings template application (5 departments) completes within 2 minutes
4. ✅ Bulk report generation (all departments) completes within 10 minutes
5. ✅ System remains responsive during bulk operations

### User Experience Requirements
1. ✅ Intuitive interface for selecting departments and configuring operations
2. ✅ Real-time progress feedback during operation execution
3. ✅ Clear error reporting and resolution guidance
4. ✅ Comprehensive operation history and audit log access

### Security Requirements
1. ✅ Role-based access control properly restricts bulk operation access
2. ✅ All operations require appropriate permissions and validations
3. ✅ Complete audit trail for compliance and security review
4. ✅ Data protection measures prevent unauthorized bulk access

---

## Risk Assessment

### High Risk Items
- **Data Integrity**: Bulk operations could corrupt data if not properly implemented
- **Performance Impact**: Large operations could degrade system performance
- **Security Vulnerabilities**: Bulk access could create new security vectors
- **User Error**: Administrators could accidentally perform destructive operations

### Medium Risk Items
- **User Adoption**: Administrators might resist using new bulk tools
- **Training Requirements**: Complex interface may require significant training
- **Integration Complexity**: Integration with existing systems may create issues
- **Maintenance Overhead**: Bulk system requires ongoing maintenance and monitoring

### Mitigation Strategies
- **Comprehensive Testing**: Extensive testing in staging environments
- **Gradual Rollout**: Phased implementation with careful monitoring
- **Training Program**: Comprehensive administrator training and documentation
- **Monitoring and Alerts**: Real-time monitoring with automated alerting
- **Backup and Recovery**: Robust backup procedures before major operations

---

## Future Enhancements (Phase 8+)

### AI-Powered Operations
- **Smart Recommendations**: AI-suggested bulk operations based on patterns
- **Anomaly Detection**: Automatic detection of unusual operation patterns
- **Predictive Analytics**: Forecast department resource needs and optimization

### Advanced Workflow Integration
- **Complex Approval Chains**: Multi-step approval processes for sensitive operations
- **Conditional Operations**: Operations that execute based on specific conditions
- **External System Integration**: Bulk operations affecting external systems

### Mobile Administration
- **Mobile Dashboard**: Mobile interface for monitoring bulk operations
- **Push Notifications**: Real-time mobile notifications for operation status
- **Remote Management**: Secure mobile access for critical administrative functions

---

**Document Created**: 2025-01-15
**Author**: Claude Code Assistant
**Status**: Planning Phase - Ready for Implementation
**Prerequisites**: BA1059 Department Implementation (Phases 1-5) Complete
**Estimated Total Effort**: 20-25 development days
**Target Completion**: Q3 2025