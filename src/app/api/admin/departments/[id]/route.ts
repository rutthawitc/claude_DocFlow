import { NextResponse } from 'next/server';
import { withAuthHandler } from '@/lib/middleware/api-auth';
import { DepartmentManagementService } from '@/lib/services/department-management-service';
import { ApiResponse } from '@/lib/types';
import {
  departmentUpdateSchema,
  idSchema
} from '@/lib/validation/schemas';

// GET - Get specific department by ID
const getHandler = withAuthHandler(async (request, { user, validatedData }) => {
  const { id } = validatedData.params;

  const department = await DepartmentManagementService.getDepartmentById(id);

  if (!department) {
    return NextResponse.json(
      { success: false, error: 'Department not found' },
      { status: 404 }
    );
  }

  const response: ApiResponse<typeof department> = {
    success: true,
    data: department
  };

  return NextResponse.json(response);
}, {
  requireAuth: true,
  requiredRoles: ['admin', 'district_manager'],
  rateLimit: 'api',
  validation: {
    params: idSchema
  }
});

// PUT - Update department
const putHandler = withAuthHandler(async (request, { user, validatedData }) => {
  const { id } = validatedData.params;
  const updateData = validatedData.body;

  const updatedDepartment = await DepartmentManagementService.updateDepartment(id, {
    ...updateData,
    updatedBy: user.databaseId
  });

  if (!updatedDepartment) {
    return NextResponse.json(
      { success: false, error: 'Department not found' },
      { status: 404 }
    );
  }

  const response: ApiResponse<typeof updatedDepartment> = {
    success: true,
    data: updatedDepartment,
    message: 'Department updated successfully'
  };

  return NextResponse.json(response);
}, {
  requireAuth: true,
  requiredRoles: ['admin'],
  rateLimit: 'api',
  validation: {
    params: idSchema,
    body: departmentUpdateSchema
  }
});

// DELETE - Delete department (soft delete)
const deleteHandler = withAuthHandler(async (request, { user, validatedData }) => {
  const { id } = validatedData.params;

  const result = await DepartmentManagementService.deleteDepartment(id, user.databaseId);

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: result.statusCode || 400 }
    );
  }

  const response: ApiResponse<typeof result.data> = {
    success: true,
    data: result.data,
    message: result.message || 'Department deleted successfully'
  };

  return NextResponse.json(response);
}, {
  requireAuth: true,
  requiredRoles: ['admin'],
  rateLimit: 'api',
  validation: {
    params: idSchema
  }
});

export const GET = getHandler;
export const PUT = putHandler;
export const DELETE = deleteHandler;