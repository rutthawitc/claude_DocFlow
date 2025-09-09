# DocFlow: Additional Documents Bug Report

## Date: 2025-09-09
## Branch: add-features
## Issue: Additional Documents Not Saving to Database

### 🐛 Problem Description

The additional documents feature UI is working correctly on the upload form, but the data is not being saved to the database when documents are uploaded.

### ✅ What's Working

1. **Frontend Upload Form**:
   - Checkbox "เอกสารที่ต้องส่งเพิ่มเติม/แก้ไข" displays and functions correctly
   - Number input for document count works
   - Dynamic numbered text inputs appear when checkbox is checked
   - User can enter additional document text (e.g., "เอกสารเพิ่มเติม #3")

2. **Document Upload Process**:
   - Document uploads successfully and saves to draft
   - Basic document information (MT number, subject, dates) saves correctly
   - No upload errors or form validation issues

3. **Document Detail Page**:
   - Basic document information displays correctly
   - Page loads without errors

### ❌ What's Not Working

**Additional Documents Data Not Persisted**: When checking the database after upload, additional documents fields are all default values:

```sql
-- Query Result for document MT number: 55210-5/932
SELECT id, mt_number, has_additional_docs, additional_docs_count, additional_docs 
FROM documents WHERE mt_number = '55210-5/932';

-- Result:
| id | mt_number   | has_additional_docs | additional_docs_count | additional_docs |
|----|-------------|--------------------|-----------------------|-----------------|
| 17 | 55210-5/932 | f                  | 0                     | {}              |

-- Expected Result Should Be:
| id | mt_number   | has_additional_docs | additional_docs_count | additional_docs          |
|----|-------------|--------------------|-----------------------|--------------------------|
| 17 | 55210-5/932 | t                  | 1                     | {"เอกสารเพิ่มเติม #3"} |
```

### 🔍 Root Cause Analysis

The issue is in the **data transmission pipeline** from frontend form submission to database storage:

**Data Flow Path**:
```
Frontend Form → FormData/JSON → Upload API → Validation → DocumentService → Database
     ✅              ❓           ❓          ❓           ❓            ❌
```

**Likely Issue Points**:
1. Frontend form not including additional docs in submission payload
2. API validation middleware not parsing additional docs fields
3. Document upload handler not extracting additional docs from validated data
4. DocumentService.createDocument not receiving additional docs parameters

### 🔧 Debug Steps for Next Session

#### 1. Frontend Data Submission Check
**File**: `src/components/docflow/document-upload.tsx`
- [ ] Verify `formData` includes additional documents fields before submission
- [ ] Check if FormData object contains: `hasAdditionalDocs`, `additionalDocsCount`, `additionalDocs`
- [ ] Add console.log to inspect form submission payload

#### 2. API Validation Layer Check  
**File**: `src/lib/middleware/document-upload-handler.ts`
- [ ] Verify `validatedData` includes additional documents after validation
- [ ] Check if Zod schema validation is parsing additional docs fields correctly
- [ ] Add logging to see what data reaches the handler

#### 3. Service Layer Check
**File**: `src/lib/services/document-service.ts`
- [ ] Verify `metadata` parameter includes additional documents in createDocument()
- [ ] Check if documentData object includes additional docs fields before database insert
- [ ] Add logging to confirm data reaches service layer

#### 4. Database Schema Verification
- [x] ✅ Database columns exist and are correct
- [x] ✅ Migration applied successfully
- [ ] Test direct database insert with additional docs data

### 📁 Files Involved in Bug Fix

**Frontend**:
- `src/components/docflow/document-upload.tsx` - Form submission logic

**Backend Processing**:
- `src/lib/middleware/document-upload-handler.ts` - Upload processing
- `src/lib/validation/schemas.ts` - Server-side validation
- `src/lib/services/document-service.ts` - Database operations

**Types & Validation**:
- `src/lib/types.ts` - DocumentUploadData interface
- `src/lib/validation/client.ts` - Client-side validation

### 🧪 Test Case for Verification

**Upload Document with Additional Docs**:
1. Select file: Any PDF
2. Fill basic info: Branch, MT number, dates, subject  
3. ✅ Check "เอกสารที่ต้องส่งเพิ่มเติม/แก้ไข"
4. Set count: 1
5. Enter text: "เอกสารเพิ่มเติม #3"
6. Submit form
7. Check database for saved values

**Expected Database Result**:
```sql
has_additional_docs = true
additional_docs_count = 1  
additional_docs = ['เอกสารเพิ่มเติม #3']
```

### 🔄 Next Steps Priority

1. **HIGH PRIORITY**: Add debugging logs to trace data flow
2. **HIGH PRIORITY**: Verify form submission payload includes additional docs
3. **MEDIUM PRIORITY**: Check validation layer processing
4. **MEDIUM PRIORITY**: Verify service layer data handling
5. **LOW PRIORITY**: Test direct database operations

### 📊 Current Status

- **UI Implementation**: ✅ Complete and working
- **Database Schema**: ✅ Complete and working  
- **Data Pipeline**: ❌ Broken (data not flowing through)
- **Display Logic**: ⚠️ Ready but no data to display

### 💡 Quick Debug Commands

```bash
# Check recent documents in database
PGPASSWORD=postgres psql -h localhost -p 5432 -U postgres -d docflow_db -c "SELECT id, mt_number, has_additional_docs, additional_docs_count, additional_docs FROM documents ORDER BY id DESC LIMIT 3;"

# Test direct insert (for debugging)
PGPASSWORD=postgres psql -h localhost -p 5432 -U postgres -d docflow_db -c "UPDATE documents SET has_additional_docs = true, additional_docs_count = 1, additional_docs = ARRAY['Test Document'] WHERE id = 17;"
```

---

**Generated by Claude Code on 2025-09-09**  
**Bug Priority**: High (Core feature not functioning)  
**Estimated Fix Time**: 30-60 minutes of debugging  
**Impact**: Additional documents feature completely non-functional despite UI working