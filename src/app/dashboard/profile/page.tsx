// src/app/dashboard/profile/page.tsx

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { UserProfile } from "@/components/user-profile";

export default async function ProfilePage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">ข้อมูลผู้ใช้</h1>

      <UserProfile />
    </div>
  );
}
