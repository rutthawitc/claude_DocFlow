# District Manager Document Counts Display Issue

## Issue Summary
District manager users with BA 1059 could not see any document counts on the documents overview page, despite having proper permissions and roles assigned. The page displayed all zeros for document counts across all branches.

## Symptoms
- User has `district_manager`, `uploader`, and `user` roles
- User can access the documents page without authentication errors
- All branch cards show 0 documents in all categories (draft, sent_to_branch, acknowledged, sent_back_to_district)
- Summary statistics show "0 สาขา • 0 เอกสาร" at the top
- Backend logs show successful API calls and correct permissions

## Root Cause Analysis

### Investigation Steps
1. **Authentication & Permissions**: ✅ Working correctly
   - User has proper `district_manager` role with BA 1059
   - Backend permissions are correctly assigned and validated
   - API authentication passes all checks

2. **Backend Document Count Logic**: ✅ Working correctly
   - `getUserAccessibleBranches()` correctly returns all R6 branches for district managers
   - `getBranchDocumentCounts()` correctly queries and aggregates document counts
   - Database contains 12 documents across 8 branches with proper status values

3. **API Data Transfer**: ✅ Working correctly
   - `/api/branches?includeCounts=true` returns correct document counts
   - Frontend receives proper data structure with non-zero counts
   - Browser console showed: `documentCounts: { total: 1, acknowledged: 1, ... }`

4. **Frontend Filtering Logic**: ❌ **ROOT CAUSE IDENTIFIED**
   - `BranchOverview` component filters branches based on user roles
   - Filtering logic only checked for `admin` and `branch_manager` roles
   - **Missing `district_manager` role in the condition**
   - This caused ALL branches to be filtered out for district managers

### Root Cause
```typescript
// PROBLEMATIC CODE (line 91 in branch-overview.tsx)
if (!userRoles.includes('admin') && !userRoles.includes('branch_manager')) {
  // This filtered out ALL branches for district_manager users
  filtered = branches.filter(branch => 
    userBranchBaCode ? branch.baCode === userBranchBaCode : true
  );
}
```

## Solution

### Fix Applied
Updated the frontend filtering logic to include `district_manager` role:

```typescript
// FIXED CODE
if (!userRoles.includes('admin') && !userRoles.includes('branch_manager') && !userRoles.includes('district_manager')) {
  // Now district managers can see all branches like admins
  filtered = branches.filter(branch => 
    userBranchBaCode ? branch.baCode === userBranchBaCode : true
  );
}
```

### Files Modified
- `src/components/docflow/branch-overview.tsx` - Added `district_manager` role check

### Git Commits
- `607a13c` - Added district_manager branch access in document service
- `3b4bfa1` - Fixed document count query to include all statuses  
- `f06e032` - Fixed frontend branch filtering for district_manager role

## Expected Behavior After Fix
District manager users should now see:
- ✅ All 22 R6 region branches displayed
- ✅ Correct document counts for each branch
- ✅ Summary statistics showing total documents across all branches
- ✅ Individual branch cards showing non-zero counts where documents exist

### Sample Expected Data
Based on current database state:
- **BA 1060**: 1 document (acknowledged)
- **BA 1064**: 1 document (sent_to_branch)
- **BA 1065**: 4 documents (2 draft, 2 sent_back_to_district)
- **BA 1066**: 2 documents (1 sent_to_branch, 1 acknowledged)
- **BA 1067**: 1 document (draft)
- **BA 1074**: 1 document (sent_to_branch)
- **BA 1076**: 1 document (sent_back_to_district)
- **BA 1133**: 1 document (acknowledged)

## Prevention
To prevent similar issues in the future:

1. **Role-Based Access Patterns**: When adding new roles, ensure all frontend components that filter by roles include the new role in their conditions

2. **Test Coverage**: Add integration tests that verify role-based filtering for all user types:
   ```typescript
   // Example test cases needed
   describe('Branch Access by Role', () => {
     it('should show all branches for district_manager')
     it('should show all branches for admin') 
     it('should show user branch only for regular users')
   })
   ```

3. **Code Review Checklist**: When modifying role-based access:
   - [ ] Backend permission checks updated
   - [ ] Frontend filtering logic updated
   - [ ] All role types included in conditions
   - [ ] API access control reviewed

## Related Documentation
- [DocFlow Authentication & Authorization](../auth/docflow-auth.md)
- [Role-Based Access Control](../auth/rbac.md)
- [Branch Management System](../features/branch-management.md)

## Date Resolved
2025-08-01

## Resolved By
Claude Code Assistant

---
*This issue demonstrates the importance of maintaining consistency between backend role definitions and frontend role-based filtering logic.*