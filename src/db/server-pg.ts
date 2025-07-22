// src/db/server-pg.ts
// ไม่สามารถใช้ 'use server' directive ในไฟล์ที่ export objects ได้
// แทนที่จะใช้ 'use server' เราจะใช้การตรวจสอบ typeof window ในฟังก์ชัน getDb

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

// สร้าง connection client สำหรับการเชื่อมต่อกับ PostgreSQL
// postgres.js เป็น JavaScript pure และไม่มีปัญหากับ Next.js
const client = postgres(process.env.DATABASE_URL || '');

// สร้าง drizzle instance สำหรับ ORM
export const db = drizzle(client, { schema });

// export client สำหรับใช้ทำ direct SQL queries ถ้าจำเป็น
export { client };
