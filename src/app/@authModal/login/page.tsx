import { LoginFormWrapper } from "@/components/auth/login-form-wrapper";
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog";
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
        </DialogHeader>
        <LoginFormWrapper />
      </DialogContent>
    </Dialog>
  );
}
