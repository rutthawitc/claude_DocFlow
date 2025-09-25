import { db } from '@/db';
import { branches, users } from '@/db/schema';
import { eq, and, or, like, desc, asc, sql, count, inArray } from 'drizzle-orm';
import { ActivityLogger } from './activity-logger';

// Types for department management
export interface Department {
  id: number;
  baCode: number;
  branchCode: number;
  name: string;
  departmentName: string | null;
  regionId: number;
  regionCode: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Additional computed fields
  userCount?: number;
  documentCount?: number;
  lastActivity?: Date;
}

export interface CreateDepartmentData {
  baCode: number;
  branchCode: number;
  name: string;
  departmentName?: string;
  regionId: number;
  regionCode: string;
  isActive?: boolean;
  createdBy: number;
}

export interface UpdateDepartmentData {
  name?: string;
  departmentName?: string;
  regionId?: number;
  regionCode?: string;
  isActive?: boolean;
  updatedBy: number;
}

export interface DepartmentFilters {
  search?: string;
  region?: string;
  isActive?: boolean;
  departmentName?: string;
  limit?: number;
  offset?: number;
}

export interface DeleteDepartmentResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
  statusCode?: number;
}

export class DepartmentManagementService {
  /**
   * Get all departments with filtering and pagination
   */
  static async getAllDepartments(filters: DepartmentFilters = {}) {
    const {
      search,
      region,
      isActive,
      departmentName,
      limit = 50,
      offset = 0
    } = filters;

    // Build where conditions
    const conditions = [];

    if (search) {
      conditions.push(
        or(
          like(branches.name, `%${search}%`),
          like(branches.departmentName, `%${search}%`),
          sql`${branches.baCode}::text LIKE ${'%' + search + '%'}`
        )
      );
    }

    if (region) {
      conditions.push(eq(branches.regionCode, region));
    }

    if (isActive !== undefined) {
      conditions.push(eq(branches.isActive, isActive));
    }

    if (departmentName) {
      conditions.push(like(branches.departmentName, `%${departmentName}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get departments (simplified without user count for now)
    const departmentsQuery = db
      .select({
        id: branches.id,
        baCode: branches.baCode,
        branchCode: branches.branchCode,
        name: branches.name,
        departmentName: branches.departmentName,
        regionId: branches.regionId,
        regionCode: branches.regionCode,
        isActive: branches.isActive,
        createdAt: branches.createdAt,
        updatedAt: branches.updatedAt
      })
      .from(branches)
      .where(whereClause)
      .orderBy(asc(branches.baCode))
      .limit(limit)
      .offset(offset);

    const departments = await departmentsQuery;

    // Get total count for pagination
    const totalCountResult = await db
      .select({ count: count() })
      .from(branches)
      .where(whereClause);

    const totalCount = totalCountResult[0]?.count || 0;

    return {
      departments,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    };
  }

  /**
   * Get department by ID with additional details
   */
  static async getDepartmentById(id: number): Promise<Department | null> {
    const result = await db
      .select({
        id: branches.id,
        baCode: branches.baCode,
        branchCode: branches.branchCode,
        name: branches.name,
        departmentName: branches.departmentName,
        regionId: branches.regionId,
        regionCode: branches.regionCode,
        isActive: branches.isActive,
        createdAt: branches.createdAt,
        updatedAt: branches.updatedAt
      })
      .from(branches)
      .where(eq(branches.id, id))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Get department by BA code
   */
  static async getDepartmentByBaCode(baCode: number): Promise<Department | null> {
    const result = await db
      .select({
        id: branches.id,
        baCode: branches.baCode,
        branchCode: branches.branchCode,
        name: branches.name,
        departmentName: branches.departmentName,
        regionId: branches.regionId,
        regionCode: branches.regionCode,
        isActive: branches.isActive,
        createdAt: branches.createdAt,
        updatedAt: branches.updatedAt
      })
      .from(branches)
      .where(eq(branches.baCode, baCode))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Create new department
   */
  static async createDepartment(data: CreateDepartmentData): Promise<Department> {
    // Check if BA code already exists
    const existingDepartment = await this.getDepartmentByBaCode(data.baCode);
    if (existingDepartment) {
      throw new Error(`Department with BA code ${data.baCode} already exists`);
    }

    // Validate branch code matches BA code for departments
    if (data.branchCode !== data.baCode) {
      console.warn(`Branch code ${data.branchCode} doesn't match BA code ${data.baCode}. Using BA code for consistency.`);
    }

    const newDepartmentData = {
      baCode: data.baCode,
      branchCode: data.baCode, // Ensure consistency
      name: data.name,
      departmentName: data.departmentName || null,
      regionId: data.regionId,
      regionCode: data.regionCode,
      isActive: data.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db
      .insert(branches)
      .values(newDepartmentData)
      .returning({
        id: branches.id,
        baCode: branches.baCode,
        branchCode: branches.branchCode,
        name: branches.name,
        departmentName: branches.departmentName,
        regionId: branches.regionId,
        regionCode: branches.regionCode,
        isActive: branches.isActive,
        createdAt: branches.createdAt,
        updatedAt: branches.updatedAt
      });

    const createdDepartment = result[0];

    // Log the activity
    await ActivityLogger.logActivity({
      userId: data.createdBy,
      action: 'department_created',
      entityType: 'department',
      entityId: createdDepartment.id.toString(),
      details: {
        departmentName: createdDepartment.name,
        baCode: createdDepartment.baCode,
        departmentType: createdDepartment.departmentName
      },
      metadata: {
        createdBy: data.createdBy,
        regionCode: createdDepartment.regionCode
      }
    });

    return createdDepartment;
  }

  /**
   * Update department
   */
  static async updateDepartment(id: number, data: UpdateDepartmentData): Promise<Department | null> {
    const updateData = {
      ...(data.name && { name: data.name }),
      ...(data.departmentName !== undefined && { departmentName: data.departmentName }),
      ...(data.regionId && { regionId: data.regionId }),
      ...(data.regionCode && { regionCode: data.regionCode }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      updatedAt: new Date()
    };

    const result = await db
      .update(branches)
      .set(updateData)
      .where(eq(branches.id, id))
      .returning({
        id: branches.id,
        baCode: branches.baCode,
        branchCode: branches.branchCode,
        name: branches.name,
        departmentName: branches.departmentName,
        regionId: branches.regionId,
        regionCode: branches.regionCode,
        isActive: branches.isActive,
        createdAt: branches.createdAt,
        updatedAt: branches.updatedAt
      });

    const updatedDepartment = result[0];

    if (updatedDepartment) {
      // Log the activity
      await ActivityLogger.logActivity({
        userId: data.updatedBy,
        action: 'department_updated',
        entityType: 'department',
        entityId: updatedDepartment.id.toString(),
        details: {
          departmentName: updatedDepartment.name,
          baCode: updatedDepartment.baCode,
          changes: Object.keys(updateData).filter(key => key !== 'updatedAt')
        },
        metadata: {
          updatedBy: data.updatedBy,
          previousValues: updateData
        }
      });
    }

    return updatedDepartment || null;
  }

  /**
   * Delete department (soft delete by marking inactive)
   */
  static async deleteDepartment(id: number, deletedBy: number): Promise<DeleteDepartmentResult> {
    try {
      // Check if department exists and get details
      const department = await this.getDepartmentById(id);
      if (!department) {
        return {
          success: false,
          error: 'Department not found',
          statusCode: 404
        };
      }

      // Check if department has associated users
      const userCount = await db
        .select({ count: count() })
        .from(users)
        .where(sql`${department.baCode} = ANY(${users.departmentCodes})`);

      if (userCount[0]?.count > 0) {
        return {
          success: false,
          error: `Cannot delete department. ${userCount[0].count} users are still assigned to this department.`,
          statusCode: 400
        };
      }

      // Check if department has documents (would need to add this check based on your document table structure)
      // For now, we'll just proceed with soft delete

      // Soft delete by marking as inactive
      const result = await db
        .update(branches)
        .set({
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(branches.id, id))
        .returning({
          id: branches.id,
          baCode: branches.baCode,
          name: branches.name,
          departmentName: branches.departmentName,
          isActive: branches.isActive
        });

      const deletedDepartment = result[0];

      if (deletedDepartment) {
        // Log the activity
        await ActivityLogger.logActivity({
          userId: deletedBy,
          action: 'department_deleted',
          entityType: 'department',
          entityId: deletedDepartment.id.toString(),
          details: {
            departmentName: deletedDepartment.name,
            baCode: deletedDepartment.baCode,
            departmentType: deletedDepartment.departmentName,
            deletionType: 'soft_delete'
          },
          metadata: {
            deletedBy,
            originallyActive: department.isActive
          }
        });

        return {
          success: true,
          data: deletedDepartment,
          message: 'Department deactivated successfully'
        };
      }

      return {
        success: false,
        error: 'Failed to delete department',
        statusCode: 500
      };

    } catch (error) {
      console.error('Error deleting department:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        statusCode: 500
      };
    }
  }

  /**
   * Activate/Reactivate department
   */
  static async activateDepartment(id: number, activatedBy: number): Promise<Department | null> {
    const result = await db
      .update(branches)
      .set({
        isActive: true,
        updatedAt: new Date()
      })
      .where(eq(branches.id, id))
      .returning({
        id: branches.id,
        baCode: branches.baCode,
        branchCode: branches.branchCode,
        name: branches.name,
        departmentName: branches.departmentName,
        regionId: branches.regionId,
        regionCode: branches.regionCode,
        isActive: branches.isActive,
        createdAt: branches.createdAt,
        updatedAt: branches.updatedAt
      });

    const activatedDepartment = result[0];

    if (activatedDepartment) {
      // Log the activity
      await ActivityLogger.logActivity({
        userId: activatedBy,
        action: 'department_activated',
        entityType: 'department',
        entityId: activatedDepartment.id.toString(),
        details: {
          departmentName: activatedDepartment.name,
          baCode: activatedDepartment.baCode,
          departmentType: activatedDepartment.departmentName
        },
        metadata: {
          activatedBy
        }
      });
    }

    return activatedDepartment || null;
  }

  /**
   * Get department statistics
   */
  static async getDepartmentStatistics() {
    const stats = await db
      .select({
        total: count(),
        active: count(sql`CASE WHEN ${branches.isActive} = true THEN 1 END`),
        inactive: count(sql`CASE WHEN ${branches.isActive} = false THEN 1 END`),
        withDepartmentName: count(sql`CASE WHEN ${branches.departmentName} IS NOT NULL THEN 1 END`)
      })
      .from(branches);

    const regionStats = await db
      .select({
        regionCode: branches.regionCode,
        count: count()
      })
      .from(branches)
      .where(eq(branches.isActive, true))
      .groupBy(branches.regionCode)
      .orderBy(asc(branches.regionCode));

    return {
      overview: stats[0],
      byRegion: regionStats
    };
  }

  /**
   * Validate department data before creation/update
   */
  static validateDepartmentData(data: Partial<CreateDepartmentData | UpdateDepartmentData>) {
    const errors: string[] = [];

    // Validate BA code format (should be 4-6 digits)
    if (data.baCode && (data.baCode < 1000 || data.baCode > 999999)) {
      errors.push('BA code must be between 1000 and 999999');
    }

    // Validate region code format
    if (data.regionCode && !/^R\d+$/.test(data.regionCode)) {
      errors.push('Region code must be in format R{number} (e.g., R6)');
    }

    // Validate region ID
    if (data.regionId && (data.regionId < 1 || data.regionId > 20)) {
      errors.push('Region ID must be between 1 and 20');
    }

    // Validate name length
    if (data.name && (data.name.length < 3 || data.name.length > 255)) {
      errors.push('Department name must be between 3 and 255 characters');
    }

    // Validate department name length if provided
    if (data.departmentName && data.departmentName.length > 255) {
      errors.push('Department type name must be less than 255 characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}