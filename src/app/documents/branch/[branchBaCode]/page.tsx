import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { DocumentsList } from '@/components/docflow/documents-list';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';

interface BranchDocumentsPageProps {
  params: Promise<{
    branchBaCode: string;
  }>;
}

async function getBranchName(branchBaCode: number) {
  // Map of branch codes to names
  const branchMap: Record<number, string> = {
    // Regular R6 branches
    1060: "กปภ.สาขาขอนแก่น(ชั้นพิเศษ)",
    1061: "กปภ.สาขาบ้านไผ่",
    1062: "กปภ.สาขาชุมแพ",
    1063: "กปภ.สาขาน้ำพอง",
    1064: "กปภ.สาขาชนบท",
    1065: "กปภ.สาขากระนวน",
    1066: "กปภ.สาขาหนองเรือ",
    1067: "กปภ.สาขาเมืองพล",
    1068: "กปภ.สาขากาฬสินธุ์",
    1069: "กปภ.สาขากุฉินารายณ์",
    1070: "กปภ.สาขาสมเด็จ",
    1071: "กปภ.สาขามหาสารคาม",
    1072: "กปภ.สาขาพยัคฆภูมิพิสัย",
    1073: "กปภ.สาขาชัยภูมิ",
    1074: "กปภ.สาขาแก้งคร้อ",
    1075: "กปภ.สาขาจัตุรัส",
    1076: "กปภ.สาขาหนองบัวแดง",
    1077: "กปภ.สาขาภูเขียว",
    1133: "กปภ.สาขาร้อยเอ็ด",
    1134: "กปภ.สาขาโพนทอง",
    1135: "กปภ.สาขาสุวรรณภูมิ",
    1245: "กปภ.สาขาบำเหน็จณรงค์",

    // BA1059 Department branches
    105901: "กปภ.เขต 6 - งานพัสดุ",
    105902: "กปภ.เขต 6 - งานธุรการ",
    105903: "กปภ.เขต 6 - งานบัญชีเจ้าหนี้",
    105904: "กปภ.เขต 6 - งานการเงิน",
    105905: "กปภ.เขต 6 - งานบุคคล",
  };

  return branchMap[branchBaCode] || `สาขา BA: ${branchBaCode}`;
}

export default async function BranchDocumentsPage({ 
  params: paramsPromise 
}: BranchDocumentsPageProps) {
  const params = await paramsPromise;
  const session = await auth();
  
  if (!session?.user) {
    redirect('/login');
  }

  const branchBaCode = parseInt(params.branchBaCode);
  
  if (isNaN(branchBaCode)) {
    redirect('/documents');
  }

  // Check user access to this branch
  const userRoles = session.user.pwa?.roles || [];
  const userBranchBaCode = session.user.pwa?.ba ? parseInt(session.user.pwa.ba) : undefined;

  // Allow admin and branch_manager to access all branches
  // Regular users can only access their own branch
  const canAccessBranch = userRoles.includes('admin') || 
                         userRoles.includes('branch_manager') ||
                         (userRoles.includes('branch_user') && userBranchBaCode === branchBaCode) ||
                         userRoles.includes('uploader'); // Uploaders can view any branch

  if (!canAccessBranch) {
    redirect('/documents');
  }

  const branchName = await getBranchName(branchBaCode);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Documents list */}
        <DocumentsList 
          branchBaCode={branchBaCode}
          title={branchName}
          showBranchFilter={false}
        />
      </div>
    </DashboardLayout>
  );
}