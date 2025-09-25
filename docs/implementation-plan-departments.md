# Department Implementation Plan - BA1059 Subdivisions

## Overview

Add department-level access control within district BA1059, allowing multiple departments to share the same BA code while maintaining separate document spaces based on user's `job_name`.

## User Context

- **BA Code**: 1059 (District Level)
- **Sample User**: username 11008
- **Job Name**: "งานประมาณซ่อมูล"
- **Current Access**: District Manager + All branches under R6

## Target Architecture

Each department within BA1059 will have:

- Unique branch_code (105901, 105902, etc.)
- Same ba_code (1059)
- Department-specific document access
- URL: `/documents/branch/{department_branch_code}`

---

## Implementation Tasks

### Phase 1: Database Schema Changes ✅ **COMPLETED**

#### Task 1.1: Extend Branches Table ✅ **COMPLETED**

```sql
-- Add department_name column
ALTER TABLE branches ADD COLUMN department_name VARCHAR(255);

-- Add unique constraint for ba_code + department combination
ALTER TABLE branches ADD CONSTRAINT branches_ba_dept_unique
UNIQUE (ba_code, department_name);
```

**Status**: ✅ Completed - Column added successfully with unique constraint

#### Task 1.2: Insert Department Records ✅ **COMPLETED**

```sql
-- Insert departments with unique ba_codes (adjusted approach)
INSERT INTO branches (ba_code, branch_code, name, department_name, region_id, region_code, is_active) VALUES
(105901, 105901, 'กปภ.เขต 6 - งานพัสดุ', 'งานพัสดุ', 6, 'R6', true),
(105902, 105902, 'กปภ.เขต 6 - งานธุรการ', 'งานธุรการ', 6, 'R6', true),
(105903, 105903, 'กปภ.เขต 6 - งานบัญชีเจ้าหนี้', 'งานบัญชีเจ้าหนี้', 6, 'R6', true),
(105904, 105904, 'กปภ.เขต 6 - งานการเงิน', 'งานการเงิน', 6, 'R6', true),
(105905, 105905, 'กปภ.เขต 6 - งานบุคคล', 'งานบุคคล', 6, 'R6', true);
```

**Status**: ✅ Completed - 5 department records inserted successfully
**Note**: Used unique ba_codes (105901-105905) instead of shared 1059 due to existing foreign key constraints

### Phase 2: Authentication & Authorization Updates ✅ **COMPLETED**

#### Task 2.1: Update DocFlow Auth Logic ✅ **COMPLETED**

**File**: `src/lib/auth/docflow-auth.ts`

- ✅ Extended BA1059 handling logic to include department mapping
- ✅ Added job_name to department branch mapping integration
- ✅ Added getUserDepartmentBranch() helper method for department access
- ✅ Enhanced user assignment with department-specific logging

**Status**: ✅ Completed - BA1059 users now automatically mapped to departments based on job_name

#### Task 2.2: Create Department Mapping Service ✅ **COMPLETED**

**File**: `src/lib/services/department-mapping-service.ts`

```typescript
interface DepartmentMapping {
  jobName: string;
  departmentName: string;
  branchCode: number;
  baCode: number;
}

// Map job_name to department branches - 5 core departments
const BA1059_DEPARTMENT_MAPPING: DepartmentMapping[] = [
  {
    jobName: "งานพัสดุ",
    departmentName: "งานพัสดุ",
    branchCode: 105901,
    baCode: 105901,
  },
  // ... 4 other department mappings
];
```

**Status**: ✅ Completed - Full department mapping service with utility functions created

### Phase 3: UI Component Updates ✅ **COMPLETED**

#### Task 3.1: Update Branch Documents Page ✅ **COMPLETED**

**File**: `src/app/documents/branch/[branchBaCode]/page.tsx`

- ✅ Added department branch codes (105901-105905) to `branchMap`
- ✅ Updated `getBranchName()` function to handle department names

**Status**: ✅ Completed - Department URLs like `/documents/branch/105901` now work properly

#### Task 3.2: Update Document Upload Form ✅ **COMPLETED**

**File**: `src/app/documents/upload/page.tsx`

- ✅ Added department branches to the `getBranches()` function
- ✅ Department branches now appear in branch selection dropdown

**Status**: ✅ Completed - Users can now upload documents to department branches

#### Task 3.3: Update Documents Overview ✅ **COMPLETED**

**Files**: `src/app/reports/reports-client.tsx`

- ✅ Added department branches to branch statistics in reports
- ✅ Department branches included in UI displays with sample document counts

**Status**: ✅ Completed - Department branches appear in reports and statistics

### Phase 4: Database Migration Scripts ✅ **COMPLETED**

#### Task 4.1: Create Migration Script ✅ **COMPLETED**

**File**: `scripts/add-departments-ba1059.sql`

- ✅ Comprehensive migration script with transaction management
- ✅ Rollback capability and error handling
- ✅ Data validation and duplicate checking
- ✅ Performance indexes creation
- ✅ Step-by-step logging and verification

**Status**: ✅ Completed - Production-ready migration script with comprehensive error handling

#### Task 4.2: Update DocFlow Init Script ✅ **COMPLETED**

**File**: `scripts/init-docflow.ts`

- ✅ Added `initializeBA1059Departments()` function
- ✅ Integrated department creation into initialization workflow
- ✅ Added department-specific database indexes
- ✅ Enhanced summary output with department URLs
- ✅ Handles existing vs new installations gracefully

**Status**: ✅ Completed - DocFlow init now includes department setup automatically

### Phase 5: Testing & Validation

#### Task 5.1: Database Testing

- Verify unique constraints work properly
- Test department branch creation
- Validate existing functionality unchanged

#### Task 5.2: Authentication Testing

- Test user assignment to correct departments
- Verify access control works per department
- Test district manager can still access all departments

#### Task 5.3: UI/UX Testing

- Test department-specific document access
- Verify URLs work correctly (/documents/branch/105901)
- Test document upload to correct department

---

## Implementation Order & Dependencies

### Step 1: Database Schema (Tasks 1.1, 1.2)

- **Dependencies**: None
- **Risk**: Low
- **Rollback**: Simple ALTER TABLE DROP COLUMN

### Step 2: Department Mapping Service (Task 2.2)

- **Dependencies**: Step 1 complete
- **Risk**: Low
- **Testing**: Unit tests for mapping logic

### Step 3: Authentication Updates (Task 2.1)

- **Dependencies**: Step 2 complete
- **Risk**: Medium - affects user access
- **Testing**: Thorough testing with multiple job_name values

### Step 4: UI Updates (Tasks 3.1, 3.2, 3.3)

- **Dependencies**: Steps 1-3 complete
- **Risk**: Low - UI changes only
- **Testing**: Frontend testing with real data

### Step 5: Migration Scripts & Testing (Tasks 4.1, 4.2, 5.1-5.3)

- **Dependencies**: All previous steps
- **Risk**: Low
- **Testing**: Full end-to-end testing

---

## Risk Assessment

### High Risk Items

- Authentication logic changes could break existing access
- Database constraints could conflict with existing data

### Mitigation Strategies

- Implement in development environment first
- Create comprehensive rollback scripts
- Test with multiple user profiles
- Backup production data before migration

### Testing Requirements

- Test with users having different job_name values
- Verify existing branch access unchanged
- Test document upload/access permissions
- Validate district manager access to all departments

---

## Success Criteria

1. **User Access**: User with job_name "งานประมาณซ่อมูล" can access `/documents/branch/105901`
2. **Document Isolation**: Documents uploaded to 105901 only visible to users in that department
3. **District Manager Access**: District managers can access all department branches (105901-105905)
4. **Existing Functionality**: All existing branch access patterns continue to work
5. **URL Structure**: Clean URLs for each department branch
6. **Authentication**: Automatic assignment to correct department based on job_name

---

## Future Enhancements

### Phase 6: Advanced Features (Optional)

- Department-level reporting and analytics
- Cross-department document sharing workflows
- Department-specific notification channels
- Bulk department management tools

---

**Created**: 2025-09-25
**Author**: Claude Code Assistant
**Status**: Planning Phase
