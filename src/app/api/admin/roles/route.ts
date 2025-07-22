// src/app/api/admin/roles/route.ts
import { NextResponse } from 'next/server';
import { getDb } from "@/db";

export async function GET() {
  try {
    // เข้าถึงฐานข้อมูล
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้' }, { status: 500 });
    }
    
    // ดึงข้อมูลบทบาททั้งหมดจากฐานข้อมูล
    const roles = await db.query.roles.findMany({
      orderBy: (roles) => roles.name,
    });
    
    return NextResponse.json(roles);
  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูลบทบาท' },
      { status: 500 }
    );
  }
}
