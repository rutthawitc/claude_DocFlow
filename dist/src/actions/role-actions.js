"use strict";
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use server';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRole = createRole;
exports.updateRole = updateRole;
exports.deleteRole = deleteRole;
exports.updateUserRoles = updateUserRoles;
const cache_1 = require("next/cache");
const navigation_1 = require("next/navigation");
const db_1 = require("@/db");
const schema = __importStar(require("@/db/schema"));
const drizzle_orm_1 = require("drizzle-orm");
const zod_1 = require("zod");
// Validation schemas
const roleSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'กรุณาระบุชื่อบทบาท'),
    description: zod_1.z.string().optional(),
    permissions: zod_1.z.array(zod_1.z.number()).optional(),
});
const userRoleSchema = zod_1.z.object({
    userId: zod_1.z.number(),
    roles: zod_1.z.array(zod_1.z.number()),
});
// Create a new role
async function createRole(prevState, formData) {
    // Extract and validate form data
    const name = formData.get('name');
    const description = formData.get('description');
    const permissionIds = formData.getAll('permissions')
        .map(id => parseInt(id))
        .filter(id => !isNaN(id));
    // Validate input
    const validatedFields = roleSchema.safeParse({
        name,
        description,
        permissions: permissionIds,
    });
    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'ข้อมูลไม่ถูกต้อง',
        };
    }
    try {
        // Check if role name already exists
        const existingRole = await db_1.db.query.roles.findFirst({
            where: (0, drizzle_orm_1.eq)(schema.roles.name, name),
        });
        if (existingRole) {
            return {
                message: 'ชื่อบทบาทนี้มีอยู่แล้ว',
            };
        }
        // Create new role
        const [newRole] = await db_1.db.insert(schema.roles).values({
            name,
            description,
            createdAt: new Date(),
            updatedAt: new Date(),
        }).returning();
        // Assign permissions to the role
        if (permissionIds.length > 0) {
            const rolePermissionsToInsert = permissionIds.map(permissionId => ({
                roleId: newRole.id,
                permissionId,
            }));
            await db_1.db.insert(schema.rolePermissions).values(rolePermissionsToInsert);
        }
        // Revalidate roles page
        (0, cache_1.revalidatePath)('/admin/roles');
        // Redirect to roles page
        (0, navigation_1.redirect)('/admin/roles');
    }
    catch (error) {
        return {
            message: 'เกิดข้อผิดพลาดในการสร้างบทบาท',
        };
    }
}
// Update an existing role
async function updateRole(roleId, prevState, formData) {
    // Extract and validate form data
    const name = formData.get('name');
    const description = formData.get('description');
    const permissionIds = formData.getAll('permissions')
        .map(id => parseInt(id))
        .filter(id => !isNaN(id));
    // Validate input
    const validatedFields = roleSchema.safeParse({
        name,
        description,
        permissions: permissionIds,
    });
    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'ข้อมูลไม่ถูกต้อง',
        };
    }
    try {
        // Check if role exists
        const existingRole = await db_1.db.query.roles.findFirst({
            where: (0, drizzle_orm_1.eq)(schema.roles.id, roleId),
        });
        if (!existingRole) {
            return {
                message: 'ไม่พบบทบาทที่ต้องการแก้ไข',
            };
        }
        // Check if name is taken by another role
        const nameExists = await db_1.db.query.roles.findFirst({
            where: (roles) => (0, drizzle_orm_1.eq)(roles.name, name) &&
                roles.id !== roleId
        });
        if (nameExists) {
            return {
                message: 'ชื่อบทบาทนี้มีอยู่แล้ว',
            };
        }
        // Update role
        await db_1.db.update(schema.roles)
            .set({
            name,
            description,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema.roles.id, roleId));
        // Delete existing role permissions
        await db_1.db.delete(schema.rolePermissions)
            .where((0, drizzle_orm_1.eq)(schema.rolePermissions.roleId, roleId));
        // Insert new role permissions
        if (permissionIds.length > 0) {
            const rolePermissionsToInsert = permissionIds.map(permissionId => ({
                roleId,
                permissionId,
            }));
            await db_1.db.insert(schema.rolePermissions).values(rolePermissionsToInsert);
        }
        // Revalidate roles page
        (0, cache_1.revalidatePath)('/admin/roles');
        (0, cache_1.revalidatePath)(`/admin/roles/${roleId}`);
        return {
            message: 'อัปเดตบทบาทเรียบร้อยแล้ว',
            success: true,
        };
    }
    catch (error) {
        return {
            message: 'เกิดข้อผิดพลาดในการอัปเดตบทบาท',
        };
    }
}
// Delete a role
async function deleteRole(roleId) {
    try {
        // Check if role exists
        const existingRole = await db_1.db.query.roles.findFirst({
            where: (0, drizzle_orm_1.eq)(schema.roles.id, roleId),
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
        await db_1.db.delete(schema.rolePermissions)
            .where((0, drizzle_orm_1.eq)(schema.rolePermissions.roleId, roleId));
        // Delete user roles
        await db_1.db.delete(schema.userRoles)
            .where((0, drizzle_orm_1.eq)(schema.userRoles.roleId, roleId));
        // Delete role
        await db_1.db.delete(schema.roles)
            .where((0, drizzle_orm_1.eq)(schema.roles.id, roleId));
        // Revalidate roles page
        (0, cache_1.revalidatePath)('/admin/roles');
        // Redirect to roles page
        (0, navigation_1.redirect)('/admin/roles');
    }
    catch (error) {
        return {
            message: 'เกิดข้อผิดพลาดในการลบบทบาท',
        };
    }
}
// Assign roles to a user
async function updateUserRoles(prevState, formData) {
    // Extract and validate form data
    const userId = parseInt(formData.get('userId'));
    const roleIds = formData.getAll('roles')
        .map(id => parseInt(id))
        .filter(id => !isNaN(id));
    // Validate input
    const validatedFields = userRoleSchema.safeParse({
        userId,
        roles: roleIds,
    });
    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'ข้อมูลไม่ถูกต้อง',
        };
    }
    try {
        // Check if user exists
        const existingUser = await db_1.db.query.users.findFirst({
            where: (0, drizzle_orm_1.eq)(schema.users.id, userId),
        });
        if (!existingUser) {
            return {
                message: 'ไม่พบผู้ใช้งานที่ต้องการกำหนดบทบาท',
            };
        }
        // Delete existing user roles
        await db_1.db.delete(schema.userRoles)
            .where((0, drizzle_orm_1.eq)(schema.userRoles.userId, userId));
        // Insert new user roles
        if (roleIds.length > 0) {
            const userRolesToInsert = roleIds.map(roleId => ({
                userId,
                roleId,
            }));
            await db_1.db.insert(schema.userRoles).values(userRolesToInsert);
        }
        else {
            // Ensure every user has at least the 'user' role
            const userRole = await db_1.db.query.roles.findFirst({
                where: (0, drizzle_orm_1.eq)(schema.roles.name, 'user'),
            });
            if (userRole) {
                await db_1.db.insert(schema.userRoles).values({
                    userId,
                    roleId: userRole.id,
                });
            }
        }
        // Revalidate users page
        (0, cache_1.revalidatePath)('/admin/users');
        (0, cache_1.revalidatePath)(`/admin/users/${userId}`);
        return {
            message: 'อัปเดตบทบาทผู้ใช้งานเรียบร้อยแล้ว',
            success: true,
        };
    }
    catch (error) {
        return {
            message: 'เกิดข้อผิดพลาดในการอัปเดตบทบาทผู้ใช้งาน',
        };
    }
}
