// src/app/login/page.tsx
"use client";

import { useState, useEffect } from "react";
import { LoginFormServer } from "@/components/auth/login-form-server";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [redirectAttempted, setRedirectAttempted] = useState(false);

  useEffect(() => {
    // เพิ่ม log เพื่อตรวจสอบสถานะและค่า session
    console.log('Current auth status:', status, 'Path:', pathname);
    console.log('Session data:', JSON.stringify(session));
    
    // เมื่อสถานะการตรวจสอบเสร็จแล้ว ให้กำหนด loading เป็น false
    if (status !== 'loading') {
      setLoading(false);
    }
    
    // ถ้ามี session (ล็อกอินแล้ว) ให้เปลี่ยนเส้นทางไปที่ documents
    if (session && !redirectAttempted) {
      console.log('User is logged in, redirecting to documents');
      setRedirectAttempted(true);
      
      // ใช้ window.location.href เพื่อทำการ full page redirect แทนการใช้ router.push
      // ซึ่งจะเป็นการบังคับให้เปลี่ยนเส้นทางอย่างแน่นอน
      window.location.href = '/documents';
    } else if (status === 'unauthenticated') {
      console.log('User is not authenticated');
    }
  }, [session, status, router, pathname, redirectAttempted]);

  // แสดงข้อความกำลังโหลดในขณะที่กำลังตรวจสอบสถานะ session
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8 text-center">
          <p>กำลังตรวจสอบสถานะการเข้าสู่ระบบ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h1 className="text-center text-3xl font-bold tracking-tight">
            PWA Authentication System
          </h1>
        </div>
        <LoginFormServer />
      </div>
    </div>
  );
}
