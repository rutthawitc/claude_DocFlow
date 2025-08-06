// src/app/login/page.tsx
"use client";

import dynamic from 'next/dynamic';

// Complete client-side only login page to avoid hydration issues
const ClientOnlyLoginPage = dynamic(() => import('@/components/auth/client-only-login-page'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 text-center">
        <p>กำลังโหลดหน้าเข้าสู่ระบบ...</p>
      </div>
    </div>
  )
});

export default function LoginPage() {
  return <ClientOnlyLoginPage />;
}