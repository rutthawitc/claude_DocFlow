// src/components/auth/login-form-server.tsx
"use client";

import { useActionState } from "react";
import { loginAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// ไม่ต้องใช้ csrfToken อีกต่อไปเพราะเราจะไม่ใช้การตรวจสอบ CSRF ในการล็อกอิน

export function LoginFormServer() {
  const router = useRouter();
  
  // initialState สำหรับ loginAction
  const initialState = { errors: {}, message: "" };
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialState
  );

  // ใช้สถานะสำหรับแสดงข้อความข้อผิดพลาดของ signIn
  const [signInError, setSignInError] = useState("");
  
  // Clear errors when user starts typing
  const clearErrors = () => {
    if (signInError) setSignInError("");
  };

  // Function to determine redirect URL based on user data
  const getRedirectUrl = (session: any): string => {
    if (!session?.user?.pwa) {
      return '/documents'; // Default fallback
    }

    const userRoles = session.user.pwa.roles || [];
    const userBA = session.user.pwa.ba;

    console.log('Determining redirect URL - User roles:', userRoles, 'BA:', userBA);

    // Check if user is a branch user and has a valid BA
    if (userRoles.includes('branch_user') && userBA) {
      return `/documents/branch/${userBA}`;
    } else if (userRoles.includes('district_manager')) {
      return '/documents';
    } else if (userRoles.includes('admin')) {
      return '/documents';
    } else {
      // Default for other roles (uploader, branch_manager, etc.)
      return '/documents';
    }
  };

  // ใช้ static ID เพื่อหลีกเลี่ยง hydration mismatch
  const usernameId = "login-username";
  const passwordId = "login-password";

  // ใช้ useEffect เพื่อตรวจสอบและใช้ข้อมูล credentials จาก server action
  useEffect(() => {
    // ถ้ามีข้อมูล credentials จาก server action และการทำงานสำเร็จ
    if (state.success && state.credentials) {
      console.log(
        "Credentials received from server action, signing in from client"
      );
      // เรียกใช้ signIn ในฝั่ง client
      signIn("credentials", {
        username: state.credentials.username,
        pwd: state.credentials.pwd,
        redirect: false, // Don't redirect automatically to handle errors properly
      })
        .then(async (result) => {
          if (result?.error) {
            console.log("🔥 LOGIN FORM - Login error from client signIn:", result.error);
            setSignInError("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบและลองอีกครั้ง");
          } else if (result?.ok && result?.url) {
            console.log("✅ LOGIN FORM - Login successful from client signIn");
            console.log("🔄 LOGIN FORM - Result URL:", result.url);
            
            // Force a page reload to ensure the session is properly updated
            // and the client-only-login-page redirect logic can run
            window.location.reload();
          }
        })
        .catch((error) => {
          console.error("SignIn error:", error);
          setSignInError("เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง");
        });
    }
  }, [state]);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        {/*         <CardTitle className="text-2xl font-bold text-center">
          เข้าสู่ระบบ
        </CardTitle>
        <CardDescription className="text-center">
          เข้าสู่ระบบด้วยบัญชี PWA Intranet
        </CardDescription> */}
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {/* ไม่ใช้ csrf_token อีกต่อไป */}
          {(state.message || signInError) && (
            <Alert variant="destructive">
              <AlertDescription>
                {state.message || signInError}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor={usernameId}>ชื่อผู้ใช้</Label>
            <Input
              id={usernameId}
              name="username"
              placeholder="กรอกชื่อผู้ใช้"
              required
              onChange={clearErrors}
            />
            {state.errors?.username && (
              <p className="text-sm text-red-500">{state.errors.username}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor={passwordId}>รหัสผ่าน</Label>
            <Input
              id={passwordId}
              name="pwd"
              type="password"
              placeholder="กรอกรหัสผ่าน"
              required
              onChange={clearErrors}
            />
            {state.errors?.pwd && (
              <p className="text-sm text-red-500">{state.errors.pwd}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                กำลังเข้าสู่ระบบ...
              </>
            ) : (
              "เข้าสู่ระบบ"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
