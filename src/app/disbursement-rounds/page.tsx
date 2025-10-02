import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { DisbursementList } from "@/components/disbursement/DisbursementList";

export default async function DisbursementRoundsPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  // Check if user has admin or district_manager role
  const userRoles = session?.user?.pwa?.roles || [];
  const isAdmin = userRoles.includes("admin");
  const isDistrictManager = userRoles.includes("district_manager");

  if (!isAdmin && !isDistrictManager) {
    redirect("/unauthorized");
  }

  return <DisbursementList />;
}
