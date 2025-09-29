# Correction Counter Test Plan

## Feature Overview
The correction counter tracks how many times each additional file has been marked as "เอกสารไม่ถูกต้อง" (incorrect document) and displays "แก้ไขครั้งที่ x" in the UI.

## Test Scenarios

### Database Verification ✅
**Current State**:
- File ID 26 (Docs#1): `is_verified = true`, `correction_count = 0` - No corrections
- File ID 27 (Docs#2): `is_verified = false`, `correction_count = 1` - One correction from migration

### Frontend Testing Plan

1. **Initial Display Test**:
   - Visit document #12 additional files section
   - Verify Docs#1 shows NO correction counter (count = 0)
   - Verify Docs#2 shows "แก้ไขครั้งที่ 1" badge (count = 1)

2. **Increment Counter Test**:
   - Mark Docs#1 as "เอกสารไม่ถูกต้อง"
   - Expected: correction_count should increment from 0 to 1
   - UI should show "แก้ไขครั้งที่ 1" badge

3. **Multiple Corrections Test**:
   - Mark Docs#1 as "เอกสารถูกต้อง" then back to "เอกสารไม่ถูกต้อง"
   - Expected: correction_count should increment to 2
   - UI should show "แก้ไขครั้งที่2" badge

4. **No Double Increment Test**:
   - Mark already incorrect document as "เอกสารไม่ถูกต้อง" again
   - Expected: correction_count should NOT increment
   - Counter should remain the same

## Implementation Details

### Database Changes ✅
- Added `correction_count` column with default 0
- Existing incorrect files initialized with count = 1

### API Changes ✅
- Modified PATCH endpoint to increment counter only on transition to incorrect status
- Logic: `currentFile.isVerified !== false ? count + 1 : count`

### Frontend Changes ✅
- Added `correctionCount` field to TypeScript interface
- Added amber badge display: "แก้ไขครั้งที่ x"
- Badge shown in two locations:
  1. Main file status area (next to "มีไฟล์แล้ว")
  2. Detailed verification status section

### UI Design ✅
- **Color**: Amber/Orange warning style (`bg-amber-100 text-amber-800`)
- **Format**: "แก้ไขครั้งที่ {count}"
- **Visibility**: Only shown when `correctionCount > 0`
- **Position**: Near verification status indicators

## Manual Testing Required
- [ ] Test initial display of existing corrections
- [ ] Test counter increment on marking as incorrect
- [ ] Test counter doesn't increment when already incorrect
- [ ] Test UI display in both locations
- [ ] Test badge styling and visibility