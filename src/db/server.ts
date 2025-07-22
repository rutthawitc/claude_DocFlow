// src/db/server.ts
'use server';  // บังคับให้โค้ดทั้งหมดในไฟล์นี้ทำงานเฉพาะบน server เท่านั้น

import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import { Pool } from 'pg';

// สร้าง connection pool สำหรับการเชื่อมต่อกับ PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // เพิ่ม ssl config ถ้าจำเป็น
  // ssl: { rejectUnauthorized: false }
});

// สร้าง drizzle instance สำหรับ ORM
export const db = drizzle(pool, { schema });

// export pool สำหรับใช้ทำ direct SQL queries ถ้าจำเป็น
export { pool };
