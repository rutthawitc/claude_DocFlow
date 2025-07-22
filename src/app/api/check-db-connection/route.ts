// src/app/api/check-db-connection/route.ts
import { NextResponse } from 'next/server';
import { getDb } from '@/db';

export async function GET() {
  try {
    // เข้าถึงฐานข้อมูล
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ 
        success: false, 
        message: 'ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้',
        timestamp: new Date().toISOString() 
      }, { status: 500 });
    }
    
    // Execute a simple query to check the connection
    // We'll use a SQL query that doesn't affect data but confirms connection
    await db.execute('SELECT 1 as connection_test');
    
    return NextResponse.json({ 
      success: true, 
      message: 'เชื่อมต่อฐานข้อมูล PostgreSQL สำเร็จ',
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    console.error('Database connection error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
