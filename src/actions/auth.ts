/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// src/actions/auth.ts
'use server';

import { redirect } from 'next/navigation';
import { AuthError } from 'next-auth';
import { z } from 'zod';

// กำหนด type สำหรับผลลัพธ์ของ safeParse เพื่อให้ TypeScript เข้าใจโครงสร้างข้อมูลได้ดีขึ้น
// กำหนด interface สำหรับการล็อกอินที่สำเร็จและไม่สำเร็จ
// ไม่ export types เพื่อป้องกันปัญหากับ 'use server' directive
const _ValidationSuccess = { success: true } as const;
const _ValidationError = { success: false } as const;
// ประกาศแบบนี้แทน export types

const loginSchema = z.object({
  username: z.string().min(1, 'กรุณาระบุชื่อผู้ใช้'),
  pwd: z.string().min(1, 'กรุณาระบุรหัสผ่าน'),
});

export async function loginAction(prevState: any, formData: FormData) {
  // ไม่จำเป็นต้องตรวจสอบ CSRF เนื่องจากเราใช้ next-auth ซึ่งจัดการเรื่องความปลอดภัยให้อยู่แล้ว

  // Validate input
  // ใช้ safeParse โดยไม่ต้องใช้ type assertion เพื่อป้องกันปัญหากับ 'use server'
  const validatedFields = loginSchema.safeParse({
    username: formData.get('username'),
    pwd: formData.get('pwd'),
  });

  if (!validatedFields.success) {
    // ใช้ z.ZodError จาก zod โดยตรง
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'ข้อมูลไม่ถูกต้อง',
    };
  }

  try {
    console.log('Attempting to sign in with credentials from server action');
    
    // เนื่องจากเราอยู่ใน server action ไม่สามารถใช้ signIn จาก 'next-auth/react' ได้โดยตรง
    // เราจะส่งข้อมูลกลับไปยัง client แทนเพื่อให้เรียกใช้ signIn ในฝั่ง client
    
    // ส่งข้อมูลกลับไปยัง client component เพื่อให้ทำการเรียกใช้ signIn ที่ฝั่ง client
    // สามารถเข้าถึง data ได้โดยตรงเพราะเราตรวจสอบ success แล้วข้างบน
    return { 
      success: true, 
      credentials: {
        username: validatedFields.data.username,
        pwd: validatedFields.data.pwd
      }
    };
  } catch (error) {
    return {
      message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ',
    };
  }
}