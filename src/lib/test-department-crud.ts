/**
 * Manual testing utilities for Department CRUD functionality
 * This file provides testing utilities to verify the department management system
 */

import { validateDepartmentCreate, validateDepartmentUpdate } from './utils/department-validation';

// Test data
const testCreateData = {
  baCode: 105906,
  name: 'กปภ.เขต 6 - งานทดสอบ',
  departmentName: 'งานทดสอบ',
  regionId: 6,
  regionCode: 'R6',
  isActive: true
};

const testUpdateData = {
  name: 'กปภ.เขต 6 - งานทดสอบแก้ไข',
  departmentName: 'งานทดสอบแก้ไข',
  regionId: 6,
  regionCode: 'R6',
  isActive: false
};

const invalidCreateData = {
  baCode: 999, // Too small
  name: 'AB', // Too short
  departmentName: '',
  regionId: 25, // Too large
  regionCode: 'INVALID', // Wrong format
  isActive: true
};

/**
 * Test client-side validation
 */
export function testDepartmentValidation() {
  console.log('🧪 Testing Department Validation');
  console.log('=================================');

  // Test valid create data
  console.log('\n1. Testing valid create data:');
  const validResult = validateDepartmentCreate(testCreateData);
  console.log('✅ Valid data result:', validResult);

  // Test invalid create data
  console.log('\n2. Testing invalid create data:');
  const invalidResult = validateDepartmentCreate(invalidCreateData);
  console.log('❌ Invalid data result:', invalidResult);

  // Test valid update data
  console.log('\n3. Testing valid update data:');
  const validUpdateResult = validateDepartmentUpdate(testUpdateData);
  console.log('✅ Valid update result:', validUpdateResult);

  // Test empty update data
  console.log('\n4. Testing empty update data:');
  const emptyUpdateResult = validateDepartmentUpdate({});
  console.log('❌ Empty update result:', emptyUpdateResult);

  return {
    validCreate: validResult.success,
    invalidCreate: !invalidResult.success,
    validUpdate: validUpdateResult.success,
    emptyUpdate: !emptyUpdateResult.success
  };
}

/**
 * Test API endpoints (requires running server)
 */
export async function testDepartmentAPI() {
  console.log('🧪 Testing Department API');
  console.log('========================');

  try {
    // Test GET departments
    console.log('\n1. Testing GET /api/admin/departments');
    const getResponse = await fetch('/api/admin/departments?limit=5', {
      credentials: 'include'
    });
    const getResult = await getResponse.json();
    console.log(`✅ GET departments: ${getResponse.status}`, getResult);

    // Test POST create department (commented out to prevent test data creation)
    /*
    console.log('\n2. Testing POST /api/admin/departments');
    const postResponse = await fetch('/api/admin/departments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(testCreateData)
    });
    const postResult = await postResponse.json();
    console.log(`✅ POST department: ${postResponse.status}`, postResult);
    */

    return {
      getDepartments: getResponse.ok,
      // createDepartment: postResponse.ok
    };

  } catch (error) {
    console.error('❌ API test error:', error);
    return {
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Manual test checklist
 */
export const departmentTestChecklist = {
  validation: [
    '✓ Valid BA codes (1000-999999) are accepted',
    '✓ Invalid BA codes are rejected',
    '✓ Department names with proper length are accepted',
    '✓ Short department names are rejected',
    '✓ Valid region codes (R1-R20) are accepted',
    '✓ Invalid region codes are rejected',
    '✓ Update validation requires at least one field'
  ],

  api: [
    '✓ GET /api/admin/departments returns department list',
    '✓ GET /api/admin/departments/{id} returns specific department',
    '✓ POST /api/admin/departments creates new department',
    '✓ PUT /api/admin/departments/{id} updates department',
    '✓ DELETE /api/admin/departments/{id} deactivates department',
    '✓ Proper authentication and authorization checks',
    '✓ Input validation and sanitization',
    '✓ Error handling and meaningful error messages'
  ],

  ui: [
    '✓ Department list loads and displays correctly',
    '✓ Create department modal works',
    '✓ Edit department modal works',
    '✓ Delete confirmation works',
    '✓ Search and filtering work',
    '✓ Pagination works',
    '✓ Form validation displays errors',
    '✓ Loading states are shown',
    '✓ Success/error messages are displayed'
  ],

  permissions: [
    '✓ Only admins can access department management',
    '✓ District managers can view departments',
    '✓ Only admins can create/edit/delete departments',
    '✓ Unauthorized users get proper error messages'
  ]
};

/**
 * Print test checklist
 */
export function printTestChecklist() {
  console.log('📋 Department CRUD Test Checklist');
  console.log('=================================');

  Object.entries(departmentTestChecklist).forEach(([category, items]) => {
    console.log(`\n${category.toUpperCase()}:`);
    items.forEach(item => console.log(`  ${item}`));
  });

  console.log('\n📝 Manual Testing Steps:');
  console.log('1. Start development server: pnpm dev');
  console.log('2. Login as admin user');
  console.log('3. Navigate to /admin/departments');
  console.log('4. Test each CRUD operation');
  console.log('5. Test error conditions');
  console.log('6. Test with different user roles');
  console.log('7. Verify all validations work');
}

// Export for browser console testing
if (typeof window !== 'undefined') {
  (window as any).testDepartmentValidation = testDepartmentValidation;
  (window as any).testDepartmentAPI = testDepartmentAPI;
  (window as any).printTestChecklist = printTestChecklist;
}