import { LoginFormWrapper } from "@/components/auth/login-form-wrapper";
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription } from "@/components/ui/dialog";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function LoginModal() {
  const session = await auth();

  // If already authenticated, redirect to dashboard
  if (session) {
    redirect("/dashboard");
  }

  return (
    <Dialog open>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>เข้าสู่ระบบ</DialogTitle>
          <DialogDescription>
            เข้าสู่ระบบด้วยบัญชี PWA ของคุณ
          </DialogDescription>
        </DialogHeader>
        <LoginFormWrapper />
      </DialogContent>
    </Dialog>
  );
}
