// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
 
// สร้าง middleware แบบพื้นฐานเพื่อทดสอบการทำงาน
export function middleware(request: NextRequest) {
  console.log('Basic middleware running for:', request.nextUrl.pathname);
  return NextResponse.next();
}
 
// กำหนดเส้นทางที่ต้องการให้ middleware ทำงาน
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/reports/:path*',
    '/users/:path*',
  ],
};
