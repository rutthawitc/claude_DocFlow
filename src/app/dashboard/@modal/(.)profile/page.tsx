import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { UserProfile } from "@/components/user-profile";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export default async function ProfileModal() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <Dialog open>
      <DialogContent className="sm:max-w-2xl">
        <h2 className="text-xl font-semibold mb-4">ข้อมูลผู้ใช้</h2>
        <UserProfile />
      </DialogContent>
    </Dialog>
  );
}
