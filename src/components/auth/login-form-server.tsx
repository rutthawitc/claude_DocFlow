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
import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";

// ไม่ต้องใช้ csrfToken อีกต่อไปเพราะเราจะไม่ใช้การตรวจสอบ CSRF ในการล็อกอิน

export function LoginFormServer() {
  // initialState สำหรับ loginAction
  const initialState = { errors: {}, message: "" };
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialState
  );

  // ใช้สถานะสำหรับแสดงข้อความข้อผิดพลาดของ signIn
  const [signInError, setSignInError] = useState("");

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
        callbackUrl: "/documents",
        redirect: true, // Use automatic redirect
      })
        .then((result) => {
          if (result?.error) {
            console.log("Login error from client signIn:", result.error);
            setSignInError("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
          } else {
            console.log("Login successful from client signIn");
            // การ redirect จะถูกจัดการโดย login/page.tsx ใน useEffect ที่ตรวจสอบ session
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
