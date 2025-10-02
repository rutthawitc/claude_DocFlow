import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { BranchDisbursementList } from "@/components/disbursement/BranchDisbursementList";

export default async function BranchDisbursementRoundsPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  // Check if user has branch_user or branch_manager role
  const userRoles = session?.user?.pwa?.roles || [];
  const isBranchUser = userRoles.includes("branch_user");
  const isBranchManager = userRoles.includes("branch_manager");
  const isAdmin = userRoles.includes("admin");
  const isDistrictManager = userRoles.includes("district_manager");

  // Redirect admins and district managers to the main disbursement page
  if (isAdmin || isDistrictManager) {
    redirect("/disbursement-rounds");
  }

  if (!isBranchUser && !isBranchManager) {
    redirect("/unauthorized");
  }

  // Get user's branch BA code
  const userBaCode = session?.user?.pwa?.ba;

  if (!userBaCode) {
    redirect("/unauthorized");
  }

  return <BranchDisbursementList userBaCode={userBaCode} />;
}
