import { eq, and } from 'drizzle-orm';
import { getDb } from '@/db';
import { users, roles, permissions, userRoles, rolePermissions } from '@/db/schema';
import { PWAUserData, Branch } from '@/lib/types';
import { BranchService } from '@/lib/services/branch-service';

// DocFlow roles and permissions
export const DOCFLOW_ROLES = {
  UPLOADER: 'uploader',
  BRANCH_USER: 'branch_user', 
  BRANCH_MANAGER: 'branch_manager',
  DISTRICT_MANAGER: 'district_manager', 
  ADMIN: 'admin',
  USER: 'user'
} as const;

export const DOCFLOW_PERMISSIONS = {
  // Document permissions
  DOCUMENTS_CREATE: 'documents:create',
  DOCUMENTS_UPLOAD: 'documents:upload',
  DOCUMENTS_READ_BRANCH: 'documents:read_branch',
  DOCUMENTS_READ_ALL_BRANCHES: 'documents:read_all_branches',
  DOCUMENTS_UPDATE_STATUS: 'documents:update_status',
  DOCUMENTS_APPROVE: 'documents:approve',
  DOCUMENTS_DELETE: 'documents:delete',
  
  // Comment permissions
  COMMENTS_CREATE: 'comments:create',
  COMMENTS_READ: 'comments:read',
  COMMENTS_UPDATE: 'comments:update',
  COMMENTS_DELETE: 'comments:delete',
  
  // Notification permissions
  NOTIFICATIONS_SEND: 'notifications:send',
  NOTIFICATIONS_MANAGE: 'notifications:manage',
  
  // Report permissions
  REPORTS_BRANCH: 'reports:branch',
  REPORTS_REGION: 'reports:region',
  REPORTS_SYSTEM: 'reports:system',
  
  // Admin permissions
  ADMIN_USERS: 'admin:users',
  ADMIN_ROLES: 'admin:roles',
  ADMIN_SYSTEM: 'admin:system',
  ADMIN_FULL_ACCESS: 'admin:full_access',
  
  // Settings permissions
  SETTINGS_MANAGE: 'settings:manage',
  
  // Legacy permissions (from existing system)
  DASHBOARD_ACCESS: 'dashboard:access',
  REPORTS_READ: 'reports:read',
  USERS_READ: 'users:read'
} as const;

export type DocFlowRole = typeof DOCFLOW_ROLES[keyof typeof DOCFLOW_ROLES];
export type DocFlowPermission = typeof DOCFLOW_PERMISSIONS[keyof typeof DOCFLOW_PERMISSIONS];

export interface UserWithDocFlowData {
  id: number;
  username: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  pwa: PWAUserData;
  roles: string[];
  permissions: string[];
  branch: Branch | null;
}

export class DocFlowAuth {
  /**
   * Initialize DocFlow roles and permissions in database
   */
  static async initializeDocFlowRoles(): Promise<void> {
    const db = await getDb();

    try {
      // Define new roles for DocFlow
      const newRoles = [
        { name: DOCFLOW_ROLES.UPLOADER, description: 'ผู้อัปโหลดเอกสาร' },
        { name: DOCFLOW_ROLES.BRANCH_USER, description: 'ผู้ใช้สาขา' },
        { name: DOCFLOW_ROLES.BRANCH_MANAGER, description: 'หัวหน้าสาขา' },
        { name: DOCFLOW_ROLES.DISTRICT_MANAGER, description: 'ผู้จัดการเขต' }
      ];

      // Define new permissions for DocFlow
      const newPermissions = [
        { name: DOCFLOW_PERMISSIONS.DOCUMENTS_CREATE, description: 'สร้างเอกสารใหม่' },
        { name: DOCFLOW_PERMISSIONS.DOCUMENTS_UPLOAD, description: 'อัปโหลดไฟล์เอกสาร' },
        { name: DOCFLOW_PERMISSIONS.DOCUMENTS_READ_BRANCH, description: 'อ่านเอกสารของสาขาตนเอง' },
        { name: DOCFLOW_PERMISSIONS.DOCUMENTS_READ_ALL_BRANCHES, description: 'อ่านเอกสารทุกสาขา' },
        { name: DOCFLOW_PERMISSIONS.DOCUMENTS_UPDATE_STATUS, description: 'อัปเดทสถานะเอกสาร' },
        { name: DOCFLOW_PERMISSIONS.DOCUMENTS_APPROVE, description: 'อนุมัติเอกสาร' },
        { name: DOCFLOW_PERMISSIONS.DOCUMENTS_DELETE, description: 'ลบเอกสาร' },
        { name: DOCFLOW_PERMISSIONS.COMMENTS_CREATE, description: 'เพิ่มความคิดเห็น' },
        { name: DOCFLOW_PERMISSIONS.COMMENTS_READ, description: 'อ่านความคิดเห็น' },
        { name: DOCFLOW_PERMISSIONS.COMMENTS_UPDATE, description: 'แก้ไขความคิดเห็น' },
        { name: DOCFLOW_PERMISSIONS.COMMENTS_DELETE, description: 'ลบความคิดเห็น' },
        { name: DOCFLOW_PERMISSIONS.NOTIFICATIONS_SEND, description: 'ส่งการแจ้งเตือน' },
        { name: DOCFLOW_PERMISSIONS.NOTIFICATIONS_MANAGE, description: 'จัดการการแจ้งเตือน' },
        { name: DOCFLOW_PERMISSIONS.REPORTS_BRANCH, description: 'ดูรายงานระดับสาขา' },
        { name: DOCFLOW_PERMISSIONS.REPORTS_REGION, description: 'ดูรายงานระดับเขต' },
        { name: DOCFLOW_PERMISSIONS.REPORTS_SYSTEM, description: 'ดูรายงานระดับระบบ' },
        { name: DOCFLOW_PERMISSIONS.ADMIN_USERS, description: 'จัดการผู้ใช้งาน' },
        { name: DOCFLOW_PERMISSIONS.ADMIN_ROLES, description: 'จัดการบทบาท' },
        { name: DOCFLOW_PERMISSIONS.ADMIN_SYSTEM, description: 'จัดการระบบ' },
        { name: DOCFLOW_PERMISSIONS.ADMIN_FULL_ACCESS, description: 'เข้าถึงระบบแอดมินทั้งหมด' },
        { name: DOCFLOW_PERMISSIONS.SETTINGS_MANAGE, description: 'จัดการการตั้งค่าระบบ' },
        { name: DOCFLOW_PERMISSIONS.DASHBOARD_ACCESS, description: 'เข้าถึงแดชบอร์ด' },
        { name: DOCFLOW_PERMISSIONS.REPORTS_READ, description: 'อ่านรายงาน' },
        { name: DOCFLOW_PERMISSIONS.USERS_READ, description: 'อ่านข้อมูลผู้ใช้' }
      ];

      // Insert roles (ignore if already exists)
      for (const roleData of newRoles) {
        try {
          const existingRole = await db.query.roles.findFirst({
            where: eq(roles.name, roleData.name)
          });

          if (!existingRole) {
            await db.insert(roles).values(roleData);
            console.log(`Created role: ${roleData.name}`);
          }
        } catch (error) {
          console.error(`Error creating role ${roleData.name}:`, error);
        }
      }

      // Insert permissions (ignore if already exists)
      for (const permData of newPermissions) {
        try {
          const existingPerm = await db.query.permissions.findFirst({
            where: eq(permissions.name, permData.name)
          });

          if (!existingPerm) {
            await db.insert(permissions).values(permData);
            console.log(`Created permission: ${permData.name}`);
          }
        } catch (error) {
          console.error(`Error creating permission ${permData.name}:`, error);
        }
      }

      // Assign permissions to roles
      await this.assignRolePermissions();

      console.log('DocFlow roles and permissions initialized successfully');
    } catch (error) {
      console.error('Error initializing DocFlow roles:', error);
      throw error;
    }
  }

  /**
   * Assign permissions to roles
   */
  private static async assignRolePermissions(): Promise<void> {
    const db = await getDb();

    const rolePermissionMapping = {
      [DOCFLOW_ROLES.UPLOADER]: [
        DOCFLOW_PERMISSIONS.DOCUMENTS_CREATE,
        DOCFLOW_PERMISSIONS.DOCUMENTS_UPLOAD,
        DOCFLOW_PERMISSIONS.NOTIFICATIONS_SEND,
        DOCFLOW_PERMISSIONS.DASHBOARD_ACCESS,
        DOCFLOW_PERMISSIONS.REPORTS_READ
      ],
      [DOCFLOW_ROLES.BRANCH_USER]: [
        DOCFLOW_PERMISSIONS.DOCUMENTS_READ_BRANCH,
        DOCFLOW_PERMISSIONS.DOCUMENTS_UPDATE_STATUS,
        DOCFLOW_PERMISSIONS.COMMENTS_CREATE,
        DOCFLOW_PERMISSIONS.COMMENTS_READ,
        DOCFLOW_PERMISSIONS.DASHBOARD_ACCESS,
        DOCFLOW_PERMISSIONS.REPORTS_READ
      ],
      [DOCFLOW_ROLES.BRANCH_MANAGER]: [
        DOCFLOW_PERMISSIONS.DOCUMENTS_READ_ALL_BRANCHES,
        DOCFLOW_PERMISSIONS.DOCUMENTS_UPDATE_STATUS,
        DOCFLOW_PERMISSIONS.DOCUMENTS_APPROVE,
        DOCFLOW_PERMISSIONS.COMMENTS_CREATE,
        DOCFLOW_PERMISSIONS.COMMENTS_READ,
        DOCFLOW_PERMISSIONS.REPORTS_BRANCH,
        DOCFLOW_PERMISSIONS.REPORTS_REGION,
        DOCFLOW_PERMISSIONS.DASHBOARD_ACCESS,
        DOCFLOW_PERMISSIONS.REPORTS_READ
      ],
      [DOCFLOW_ROLES.DISTRICT_MANAGER]: [
        DOCFLOW_PERMISSIONS.DOCUMENTS_CREATE,
        DOCFLOW_PERMISSIONS.DOCUMENTS_UPLOAD,
        DOCFLOW_PERMISSIONS.DOCUMENTS_READ_ALL_BRANCHES,
        DOCFLOW_PERMISSIONS.DOCUMENTS_UPDATE_STATUS,
        DOCFLOW_PERMISSIONS.DOCUMENTS_APPROVE,
        DOCFLOW_PERMISSIONS.COMMENTS_CREATE,
        DOCFLOW_PERMISSIONS.COMMENTS_READ,
        DOCFLOW_PERMISSIONS.NOTIFICATIONS_SEND,
        DOCFLOW_PERMISSIONS.REPORTS_BRANCH,
        DOCFLOW_PERMISSIONS.REPORTS_REGION,
        DOCFLOW_PERMISSIONS.REPORTS_SYSTEM,
        DOCFLOW_PERMISSIONS.DASHBOARD_ACCESS,
        DOCFLOW_PERMISSIONS.REPORTS_READ
      ],
      [DOCFLOW_ROLES.ADMIN]: [
        // Admin gets all permissions
        ...Object.values(DOCFLOW_PERMISSIONS)
      ],
      [DOCFLOW_ROLES.USER]: [
        // Basic user permissions
        DOCFLOW_PERMISSIONS.DOCUMENTS_READ_BRANCH,
        DOCFLOW_PERMISSIONS.COMMENTS_CREATE,
        DOCFLOW_PERMISSIONS.COMMENTS_READ,
        DOCFLOW_PERMISSIONS.DASHBOARD_ACCESS,
        DOCFLOW_PERMISSIONS.REPORTS_READ
      ]
    };

    for (const [roleName, permissionNames] of Object.entries(rolePermissionMapping)) {
      try {
        const role = await db.query.roles.findFirst({
          where: eq(roles.name, roleName)
        });

        if (!role) continue;

        for (const permissionName of permissionNames) {
          const permission = await db.query.permissions.findFirst({
            where: eq(permissions.name, permissionName)
          });

          if (!permission) continue;

          // Check if mapping already exists
          const existingMapping = await db.query.rolePermissions.findFirst({
            where: and(
              eq(rolePermissions.roleId, role.id),
              eq(rolePermissions.permissionId, permission.id)
            )
          });

          if (!existingMapping) {
            await db.insert(rolePermissions).values({
              roleId: role.id,
              permissionId: permission.id
            });
          }
        }

        console.log(`Assigned permissions to role: ${roleName}`);
      } catch (error) {
        console.error(`Error assigning permissions to role ${roleName}:`, error);
      }
    }
  }

  /**
   * Get user with DocFlow data including roles, permissions, and branch
   */
  static async getUserWithDocFlowData(userId: number): Promise<UserWithDocFlowData | null> {
    const db = await getDb();

    try {
      // Get user basic data
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId)
      });

      if (!user) return null;

      // Get user roles and permissions
      const { roles: userRolesList, permissions: userPermissions } = await this.getUserRolesAndPermissions(userId);

      // Get user branch based on PWA data
      const pwaData: PWAUserData = {
        username: user.username,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        costCenter: user.costCenter || '',
        ba: user.ba || '',
        part: user.part || '',
        area: user.area || '',
        jobName: user.jobName || '',
        level: user.level || '',
        divName: user.divName || '',
        depName: user.depName || '',
        orgName: user.orgName || '',
        position: user.position || ''
      };

      const userBranch = await BranchService.getUserBranch(pwaData);

      return {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        pwa: pwaData,
        roles: userRolesList,
        permissions: userPermissions,
        branch: userBranch
      };
    } catch (error) {
      console.error('Error getting user with DocFlow data:', error);
      return null;
    }
  }

  /**
   * Get user roles and permissions
   */
  static async getUserRolesAndPermissions(userId: number): Promise<{ roles: string[]; permissions: string[] }> {
    const db = await getDb();

    try {
      console.log('getUserRolesAndPermissions - Looking up for userId:', userId);
      
      // Get user roles
      const userRolesData = await db.query.userRoles.findMany({
        where: eq(userRoles.userId, userId),
        with: {
          role: true
        }
      });

      console.log('getUserRolesAndPermissions - Found user roles:', userRolesData.length);
      const rolesList = userRolesData.map(ur => ur.role.name);
      console.log('getUserRolesAndPermissions - Role names:', rolesList);

      // Get permissions for these roles
      const permissionsList: string[] = [];
      
      for (const userRole of userRolesData) {
        console.log('getUserRolesAndPermissions - Looking up permissions for role:', userRole.role.name, 'roleId:', userRole.roleId);
        const rolePerms = await db.query.rolePermissions.findMany({
          where: eq(rolePermissions.roleId, userRole.roleId),
          with: {
            permission: true
          }
        });
        
        console.log('getUserRolesAndPermissions - Found permissions for role', userRole.role.name, ':', rolePerms.length);
        
        for (const rp of rolePerms) {
          if (rp.permission?.name && !permissionsList.includes(rp.permission.name)) {
            permissionsList.push(rp.permission.name);
          }
        }
      }

      console.log('getUserRolesAndPermissions - Final permissions list:', permissionsList);
      return { roles: rolesList, permissions: permissionsList };
    } catch (error) {
      console.error('Error getting user roles and permissions:', error);
      return { roles: ['user'], permissions: [] };
    }
  }

  /**
   * Check if user has permission
   */
  static async hasPermission(userId: number, permission: string): Promise<boolean> {
    try {
      const { permissions } = await this.getUserRolesAndPermissions(userId);
      return permissions.includes(permission);
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  /**
   * Check if user has role
   */
  static async hasRole(userId: number, role: string): Promise<boolean> {
    try {
      const { roles } = await this.getUserRolesAndPermissions(userId);
      return roles.includes(role);
    } catch (error) {
      console.error('Error checking role:', error);
      return false;
    }
  }

  /**
   * Assign role to user
   */
  static async assignRole(userId: number, roleName: string): Promise<boolean> {
    const db = await getDb();

    try {
      const role = await db.query.roles.findFirst({
        where: eq(roles.name, roleName)
      });

      if (!role) {
        console.error(`Role ${roleName} not found`);
        return false;
      }

      // Check if user already has this role
      const existingUserRole = await db.query.userRoles.findFirst({
        where: and(
          eq(userRoles.userId, userId),
          eq(userRoles.roleId, role.id)
        )
      });

      if (existingUserRole) {
        console.log(`User ${userId} already has role ${roleName}`);
        return true;
      }

      await db.insert(userRoles).values({
        userId,
        roleId: role.id
      });

      console.log(`Assigned role ${roleName} to user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error assigning role:', error);
      return false;
    }
  }

  /**
   * Remove role from user
   */
  static async removeRole(userId: number, roleName: string): Promise<boolean> {
    const db = await getDb();

    try {
      const role = await db.query.roles.findFirst({
        where: eq(roles.name, roleName)
      });

      if (!role) {
        console.error(`Role ${roleName} not found`);
        return false;
      }

      await db.delete(userRoles).where(
        and(
          eq(userRoles.userId, userId),
          eq(userRoles.roleId, role.id)
        )
      );

      console.log(`Removed role ${roleName} from user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error removing role:', error);
      return false;
    }
  }

  /**
   * Auto-assign DocFlow roles based on user data
   */
  static async autoAssignDocFlowRoles(userId: number, pwaData: PWAUserData): Promise<void> {
    try {
      // Auto-assign roles based on user's organizational data
      
      // Everyone gets basic user role if they don't have it
      const hasUserRole = await this.hasRole(userId, DOCFLOW_ROLES.USER);
      if (!hasUserRole) {
        await this.assignRole(userId, DOCFLOW_ROLES.USER);
      }

      // Check for district-level access (BA codes like 1059)
      const userBA = pwaData.ba ? parseInt(pwaData.ba) : null;
      
      if (userBA === 1059) {
        // This is a district code - assign district manager role
        const hasDistrictManagerRole = await this.hasRole(userId, DOCFLOW_ROLES.DISTRICT_MANAGER);
        if (!hasDistrictManagerRole) {
          await this.assignRole(userId, DOCFLOW_ROLES.DISTRICT_MANAGER);
          console.log(`Assigned district manager role to user ${userId} with BA ${userBA}`);
        }
        
        // District managers also get uploader permissions
        const hasUploaderRole = await this.hasRole(userId, DOCFLOW_ROLES.UPLOADER);
        if (!hasUploaderRole) {
          await this.assignRole(userId, DOCFLOW_ROLES.UPLOADER);
        }
      } else {
        // Check if user should have branch_user role based on having a valid branch
        const userBranch = await BranchService.getUserBranch(pwaData);
        if (userBranch) {
          const hasBranchUserRole = await this.hasRole(userId, DOCFLOW_ROLES.BRANCH_USER);
          if (!hasBranchUserRole) {
            await this.assignRole(userId, DOCFLOW_ROLES.BRANCH_USER);
          }
        }

        // Auto-assign based on position or level for branch users
        if (pwaData.position?.toLowerCase().includes('หัวหน้า') || 
            pwaData.position?.toLowerCase().includes('ผู้จัดการ')) {
          const hasBranchManagerRole = await this.hasRole(userId, DOCFLOW_ROLES.BRANCH_MANAGER);
          if (!hasBranchManagerRole) {
            await this.assignRole(userId, DOCFLOW_ROLES.BRANCH_MANAGER);
          }
        }
      }

      // Admin role should be manually assigned
      // For now, check if they already have admin role and keep it
      
      console.log(`Auto-assigned DocFlow roles for user ${userId} (BA: ${userBA})`);
    } catch (error) {
      console.error('Error auto-assigning DocFlow roles:', error);
    }
  }

  /**
   * Validate branch access for user
   */
  static async validateBranchAccess(userId: number, branchBaCode: number): Promise<boolean> {
    try {
      console.log('validateBranchAccess - userId:', userId, 'branchBaCode:', branchBaCode);
      const userWithData = await this.getUserWithDocFlowData(userId);
      if (!userWithData) {
        console.log('validateBranchAccess - User not found');
        return false;
      }

      console.log('validateBranchAccess - User roles:', userWithData.roles);

      // Admin can access all branches
      if (userWithData.roles.includes(DOCFLOW_ROLES.ADMIN)) {
        console.log('validateBranchAccess - Admin access granted');
        return true;
      }

      // District manager can access all R6 branches  
      if (userWithData.roles.includes(DOCFLOW_ROLES.DISTRICT_MANAGER)) {
        const branch = await BranchService.getBranchByBaCode(branchBaCode);
        console.log('validateBranchAccess - Branch data:', branch);
        console.log('validateBranchAccess - Branch regionCode:', branch?.regionCode);
        
        // Allow access if branch exists and is R6, or if branch lookup failed but it's in R6 range
        const isR6Branch = branch?.regionCode === 'R6' || (branchBaCode >= 1060 && branchBaCode <= 1245);
        console.log('validateBranchAccess - District manager access:', isR6Branch);
        return isR6Branch;
      }

      // Branch manager can access all R6 branches
      if (userWithData.roles.includes(DOCFLOW_ROLES.BRANCH_MANAGER)) {
        const branch = await BranchService.getBranchByBaCode(branchBaCode);
        return branch?.regionCode === 'R6';
      }

      // Branch users can only access their own branch
      if (userWithData.roles.includes(DOCFLOW_ROLES.BRANCH_USER)) {
        return userWithData.branch?.baCode === branchBaCode;
      }

      // Uploaders can access any branch for uploading (but not viewing all documents)
      if (userWithData.roles.includes(DOCFLOW_ROLES.UPLOADER)) {
        return true; // For upload purposes
      }

      return false;
    } catch (error) {
      console.error('Error validating branch access:', error);
      return false;
    }
  }
}