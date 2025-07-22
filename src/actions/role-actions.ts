'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getDb } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// Validation schemas
const roleSchema = z.object({
  name: z.string().min(1, 'กรุณาระบุชื่อบทบาท'),
  description: z.string().optional(),
  permissions: z.array(z.number()).optional(),
});

const userRoleSchema = z.object({
  userId: z.number(),
  roles: z.array(z.number()),
});

// Define state type
export type State = {
  errors?: {
    [key: string]: string[];
  };
  message?: string;
  success?: boolean;
};

// Create a new role
export async function createRole(prevState: State, formData: FormData) {
  try {
    // เข้าถึงฐานข้อมูล
    const db = await getDb();
    if (!db) {
      return { message: 'การเชื่อมต่อฐานข้อมูลล้มเหลว', errors: {}, success: false };
    }
    
    // Get form data
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const permissionIds = formData.getAll('permissions')
      .map(id => parseInt(id as string))
      .filter(id => !isNaN(id));

    // Validate data
    const validatedFields = roleSchema.safeParse({
      name,
      description,
      permissions: permissionIds,
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'กรุณากรอกข้อมูลให้ถูกต้อง',
        success: false,
      };
    }
  
    // Check if role name already exists
    const existingRole = await db.query.roles.findFirst({
      where: eq(schema.roles.name, name),
    });

    if (existingRole) {
      return {
        message: 'ชื่อบทบาทนี้มีอยู่แล้ว',
      };
    }

    // Create new role
    const [newRole] = await db.insert(schema.roles).values({
      name,
      description,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    // Assign permissions to the role
    if (permissionIds && permissionIds.length > 0) {
      // Insert role permissions
      const rolePermissions = permissionIds.map(permissionId => ({
        roleId: newRole.id,
        permissionId,
      }));
      await db.insert(schema.rolePermissions).values(rolePermissions);
    }
    
    revalidatePath('/admin/roles');
    return { message: 'บทบาทถูกสร้างเรียบร้อยแล้ว', success: true };
  } catch (error: unknown) {
    console.error('Error creating role:', error);
    return {
      message: 'เกิดข้อผิดพลาดในการสร้างบทบาท',
      success: false,
    };
  }
}

// Update an existing role
export async function updateRole(roleId: number, prevState: State, formData: FormData) {
  try {
    // เข้าถึงฐานข้อมูล
    const db = await getDb();
    if (!db) {
      return { message: 'การเชื่อมต่อฐานข้อมูลล้มเหลว', errors: {}, success: false };
    }
    
    // Get form data
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const permissionIds = formData.getAll('permissions')
      .map(id => parseInt(id as string))
      .filter(id => !isNaN(id));

    // Validate data
    const validatedFields = roleSchema.safeParse({
      name,
      description,
      permissions: permissionIds,
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'กรุณากรอกข้อมูลให้ถูกต้อง',
        success: false,
      };
    }
  
    // Check if role exists
    const existingRole = await db.query.roles.findFirst({
      where: eq(schema.roles.id, roleId),
    });

    if (!existingRole) {
      return {
        message: 'ไม่พบบทบาทที่ต้องการแก้ไข',
      };
    }

    // Check if name is taken by another role
    const nameExists = await db.query.roles.findFirst({
      where: (roles, { eq, and, ne }) =>
        and(
          eq(roles.name, name),
          ne(roles.id, roleId)
        )
    });

    if (nameExists) {
      return {
        message: 'ชื่อบทบาทนี้มีอยู่แล้ว',
      };
    }

    // Update role
    await db.update(schema.roles)
      .set({
        name,
        description,
        updatedAt: new Date(),
      })
      .where(eq(schema.roles.id, roleId));

    // Delete existing role permissions
    await db.delete(schema.rolePermissions)
      .where(eq(schema.rolePermissions.roleId, roleId));

    // Insert new role permissions
    if (permissionIds && permissionIds.length > 0) {
      const rolePermissionsToInsert = permissionIds.map(permissionId => ({
        roleId,
        permissionId,
      }));

      await db.insert(schema.rolePermissions).values(rolePermissionsToInsert);
    }

    // Revalidate roles page
    revalidatePath('/admin/roles');
    revalidatePath(`/admin/roles/${roleId}`);
    
    return {
      message: 'บทบาทถูกอัปเดตเรียบร้อยแล้ว',
      success: true,
    };
  } catch (error: unknown) {
    console.error('Error updating role:', error);
    return {
      message: 'การอัปเดตบทบาทล้มเหลว กรุณาลองอีกครั้ง',
      success: false,
    };
  }
}

// Delete a role
export async function deleteRole(roleId: number) {
  try {
    // เข้าถึงฐานข้อมูล
    const db = await getDb();
    if (!db) {
      return { message: 'การเชื่อมต่อฐานข้อมูลล้มเหลว', success: false };
    }
    
    // Check if role exists
    const existingRole = await db.query.roles.findFirst({
      where: eq(schema.roles.id, roleId),
    });

    if (!existingRole) {
      return {
        message: 'ไม่พบบทบาทที่ต้องการลบ',
      };
    }

    // Don't allow deleting built-in roles
    if (['admin', 'user', 'guest'].includes(existingRole.name)) {
      return {
        message: 'ไม่สามารถลบบทบาทพื้นฐานของระบบได้',
      };
    }

    // Delete role permissions
    await db.delete(schema.rolePermissions)
      .where(eq(schema.rolePermissions.roleId, roleId));

    // Delete user roles
    await db.delete(schema.userRoles)
      .where(eq(schema.userRoles.roleId, roleId));

    // Delete role
    await db.delete(schema.roles)
      .where(eq(schema.roles.id, roleId));

    // Revalidate roles page
    revalidatePath('/admin/roles');
    
    // Redirect to roles page
    redirect('/admin/roles');
  } catch (error: unknown) {
    console.error('Error deleting role:', error);
    return {
      message: 'เกิดข้อผิดพลาดในการลบบทบาท',
      success: false
    };
  }
}

// Assign roles to a user
export async function updateUserRoles(prevState: State, formData: FormData) {
  try {
    // เข้าถึงฐานข้อมูล
    const db = await getDb();
    if (!db) {
      return { message: 'การเชื่อมต่อฐานข้อมูลล้มเหลว', errors: {}, success: false };
    }
    
    // Get form data
    const userId = parseInt(formData.get('userId') as string);
    const roleIds = formData.getAll('roles')
      .map(id => parseInt(id as string))
      .filter(id => !isNaN(id));

    // Validate data
    const validatedFields = userRoleSchema.safeParse({
      userId,
      roles: roleIds,
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'กรุณากรอกข้อมูลให้ถูกต้อง',
        success: false,
      };
    }
  
    // Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });

    if (!existingUser) {
      return {
        message: 'ไม่พบผู้ใช้งานที่ต้องการกำหนดบทบาท',
      };
    }

    // Delete existing user roles
    await db.delete(schema.userRoles)
      .where(eq(schema.userRoles.userId, userId));

    // Insert new user roles
    if (roleIds.length > 0) {
      const userRolesToInsert = roleIds.map(roleId => ({
        userId,
        roleId,
      }));

      await db.insert(schema.userRoles).values(userRolesToInsert);
    } else {
      // Ensure every user has at least the 'user' role
      const userRole = await db.query.roles.findFirst({
        where: eq(schema.roles.name, 'user'),
      });

      if (userRole) {
        await db.insert(schema.userRoles).values({
          userId,
          roleId: userRole.id,
        });
      }
    }

    // Revalidate users page
    revalidatePath('/admin/users');
    revalidatePath(`/admin/users/${userId}`);
    
    return {
      message: 'อัปเดตบทบาทผู้ใช้งานเรียบร้อยแล้ว',
      success: true,
    };
  } catch (error: unknown) {
    console.error('Error updating user roles:', error);
    return {
      message: 'เกิดข้อผิดพลาดในการอัปเดตบทบาทผู้ใช้งาน',
      success: false,
    };
  }
}