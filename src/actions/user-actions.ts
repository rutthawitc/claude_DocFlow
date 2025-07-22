'use server';

import { revalidatePath } from 'next/cache';
import { getDb } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// Validation schema
const userSchema = z.object({
  username: z.string().min(1, 'กรุณาระบุชื่อผู้ใช้งาน'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email('รูปแบบอีเมลไม่ถูกต้อง').optional().or(z.literal('')),
  roles: z.array(z.number()).optional(),
});

// Define the state type
export type State = {
  errors?: {
    username?: string[];
    firstName?: string[];
    lastName?: string[];
    email?: string[];
    roles?: string[];
    [key: string]: string[] | undefined;
  };
  message?: string;
  success?: boolean;
};

// Create a new user
export async function createUser(prevState: State, formData: FormData) {
  try {
    // เข้าถึงฐานข้อมูล
    const db = await getDb();
    if (!db) {
      return { message: 'Database connection failed', errors: {} };
    }
    
    // Extract and validate form data
    const username = formData.get('username') as string;
    const firstName = formData.get('firstName') as string || null;
    const lastName = formData.get('lastName') as string || null;
    const email = formData.get('email') as string || null;
    const roleIds = formData.getAll('roles')
      .map(id => parseInt(id as string))
      .filter(id => !isNaN(id));

    // Validate input
    const validatedFields = userSchema.safeParse({
      username,
      firstName,
      lastName,
      email,
      roles: roleIds,
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'ข้อมูลไม่ถูกต้อง',
        success: false,
      };
    }

    // Check if username already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.username, username),
    });

    if (existingUser) {
      return {
        message: 'ชื่อผู้ใช้งานนี้มีอยู่แล้วในระบบ',
        success: false,
      };
    }

    // Create user
    const [newUser] = await db.insert(schema.users).values({
      username,
      firstName,
      lastName,
      email,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    // Assign roles if provided
    if (roleIds.length > 0) {
      await db.insert(schema.userRoles).values(
        roleIds.map(roleId => ({
          userId: newUser.id,
          roleId,
        }))
      );
    }

    revalidatePath('/admin/users');
    return { message: 'เพิ่มผู้ใช้งานเรียบร้อยแล้ว', success: true };
  } catch (error) {
    console.error('Error creating user:', error);
    return {
      message: 'เกิดข้อผิดพลาดในการเพิ่มผู้ใช้งาน',
      success: false,
    };
  }
}

// Update user
export async function updateUser(id: number, formData: FormData) {
  try {
    // เข้าถึงฐานข้อมูล
    const db = await getDb();
    if (!db) {
      return { message: 'Database connection failed', errors: {} };
    }
    
    // Extract and validate form data
    const username = formData.get('username') as string;
    const firstName = formData.get('firstName') as string || null;
    const lastName = formData.get('lastName') as string || null;
    const email = formData.get('email') as string || null;

    // Validate input
    const validatedFields = userSchema.safeParse({
      username,
      firstName,
      lastName,
      email,
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'ข้อมูลไม่ถูกต้อง',
        success: false,
      };
    }

    // Update user
    await db.update(schema.users)
      .set({
        username,
        firstName,
        lastName,
        email,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, id));

    revalidatePath(`/admin/users/${id}`);
    revalidatePath('/admin/users');
    
    return { message: 'อัปเดตข้อมูลผู้ใช้งานเรียบร้อยแล้ว', success: true };
  } catch (error) {
    console.error('Error updating user:', error);
    return {
      message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูลผู้ใช้งาน',
      success: false,
    };
  }
}

// Delete user
export async function deleteUser(userId: number) {
  try {
    // เข้าถึงฐานข้อมูล
    const db = await getDb();
    if (!db) {
      return { success: false, message: 'Database connection failed' };
    }
    
    // Delete user
    await db.delete(schema.users).where(eq(schema.users.id, userId));
    
    revalidatePath('/admin/users');
    return { success: true, message: 'ลบผู้ใช้งานเรียบร้อยแล้ว' };
  } catch (error) {
    console.error('Error deleting user:', error);
    return {
      message: 'เกิดข้อผิดพลาดในการลบผู้ใช้งาน',
      success: false,
    };
  }
}
