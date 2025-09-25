import { NextResponse } from 'next/server';
import { withAuthHandler } from '@/lib/middleware/api-auth';
import { DepartmentManagementService } from '@/lib/services/department-management-service';
import { ApiResponse } from '@/lib/types';
import {
  departmentCreateSchema,
  departmentSearchSchema
} from '@/lib/validation/schemas';

// GET - List all departments with filtering
const getHandler = withAuthHandler(async (request, { user, validatedData }) => {
  const { search, region, isActive, departmentName, limit, offset } = validatedData.query;

  const result = await DepartmentManagementService.getAllDepartments({
    search,
    region,
    isActive,
    departmentName,
    limit,
    offset
  });

  const response: ApiResponse<typeof result> = {
    success: true,
    data: result
  };

  return NextResponse.json(response);
}, {
  requireAuth: true,
  requiredRoles: ['admin', 'district_manager'],
  rateLimit: 'api',
  validation: {
    query: departmentSearchSchema
  }
});

// POST - Create new department
const postHandler = withAuthHandler(async (request, { user, validatedData }) => {
  const departmentData = validatedData.body;

  const newDepartment = await DepartmentManagementService.createDepartment({
    ...departmentData,
    createdBy: user.databaseId
  });

  const response: ApiResponse<typeof newDepartment> = {
    success: true,
    data: newDepartment,
    message: 'Department created successfully'
  };

  return NextResponse.json(response, { status: 201 });
}, {
  requireAuth: true,
  requiredRoles: ['admin'],
  rateLimit: 'api',
  validation: {
    body: departmentCreateSchema
  }
});

export const GET = getHandler;
export const POST = postHandler;