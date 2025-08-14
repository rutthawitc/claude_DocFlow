import { LoginFormWrapper } from "@/components/auth/login-form-wrapper";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogDescription,
} from "@/components/ui/dialog";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Image from "next/image";

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
          <DialogTitle className="flex items-center gap-2">
            <Image 
              src="/document-icon.svg" 
              alt="Document icon" 
              width={24} 
              height={24}
            />
            Docflow
          </DialogTitle>
          <DialogDescription>
            เข้าสู่ระบบด้วยบัญชี PWA Intranet ของคุณ
          </DialogDescription>
        </DialogHeader>
        <LoginFormWrapper />
      </DialogContent>
    </Dialog>
  );
}
