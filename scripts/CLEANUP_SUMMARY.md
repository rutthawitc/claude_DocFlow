# Scripts Directory Cleanup Summary

## Files Removed (Obsolete)

### ❌ **Deleted Files:**

1. **`seed-roles.ts`** - Superseded by `init-docflow-complete.sql`

   - Only handled basic roles (admin, manager, user, guest)
   - Missing DocFlow-specific roles and permissions
   - **Replaced by:** Complete SQL initialization

2. **`seed-roles.cjs`** - Duplicate of TypeScript version

   - CommonJS version of above script
   - Same limited functionality
   - **Replaced by:** Complete SQL initialization

3. **`seed-roles.sql`** - Basic SQL version

   - Only 11 permissions vs 24 in complete version
   - Missing DocFlow roles (uploader, branch_user, etc.)
   - **Replaced by:** `init-docflow-complete.sql`

4. **`init-docflow-simple.js`** - Partial initialization
   - JavaScript version with limited scope
   - **Replaced by:** `init-docflow-complete.sql`

## Files Retained

### ✅ **Active Production Scripts:**

1. **`init-docflow-complete.sql`** ⭐ **MAIN SCRIPT**

   - Complete database initialization
   - All 12 tables, 6 roles, 24 permissions
   - 22 R6 branches with Thai names
   - Performance indexes
   - System settings

2. **`create-local-admin.sql`** ⭐ **ADMIN MANAGEMENT**

   - Create local administrator accounts
   - Parameter-based for security
   - Includes verification and audit

3. **`promote-user-to-admin.sql`** ⭐ **USER PROMOTION**

   - Promote PWA users to admin roles
   - Before/after comparison
   - Audit logging

4. **`admin-management-guide.md`** ⭐ **DOCUMENTATION**
   - Usage instructions
   - Security best practices
   - Production deployment guide

### ⚠️ **Conditional Keep (Application-Dependent):**

1. **`create-admin.ts`** - Interactive admin creation

   - **Pros:** User-friendly CLI interface
   - **Cons:** Requires application services to be built
   - **Status:** Keep for development use

2. **`init-docflow.ts`** - TypeScript initialization
   - **Pros:** Uses application services
   - **Cons:** More complex than SQL version
   - **Status:** Keep as alternative to SQL script

## Cleanup Results

### **Before Cleanup:**

```
10 files total
- 3 duplicate/obsolete seed scripts
- 1 obsolete simple init script
- 6 current/useful scripts
```

### **After Cleanup:**

```
6 files total (40% reduction)
- 4 production-ready SQL scripts + documentation
- 2 TypeScript development scripts
- 0 obsolete/duplicate files
```

## Migration Guide

### **For Database Initialization:**

**OLD:** Multiple scripts (`seed-roles.*`, `init-docflow-simple.js`)

```bash
# Old way - multiple steps
psql -f scripts/seed-roles.sql
node scripts/init-docflow-simple.js
```

**NEW:** Single comprehensive script

```bash
# New way - one command
docker exec docflow-db psql -U postgres -d docflow_db -f /scripts/init-docflow-complete.sql
```

### **For Admin Management:**

**OLD:** TypeScript-dependent scripts only
**NEW:** Direct SQL scripts + TypeScript alternatives

```bash
# SQL way (production)
docker exec docflow-db psql -U postgres -d docflow_db \
  -v admin_username='admin' -f /scripts/create-local-admin.sql

# TypeScript way (development)
npx tsx scripts/create-admin.ts
```

## Benefits of Cleanup

1. **🎯 Single Source of Truth**

   - One complete initialization script
   - No confusion about which script to use

2. **🚀 Production Ready**

   - SQL scripts work without application build
   - No Node.js dependencies in production

3. **📦 Reduced Complexity**

   - 40% fewer files to maintain
   - Clear separation between SQL and TypeScript approaches

4. **🔒 Better Security**

   - Parameter-based SQL scripts
   - Audit logging built-in
   - Production security practices

5. **📚 Better Documentation**
   - Comprehensive usage guide
   - Security best practices
   - Troubleshooting information
