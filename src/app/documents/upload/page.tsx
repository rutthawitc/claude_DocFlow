import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { DocumentUpload } from '@/components/docflow/document-upload';

async function getBranches() {
  // In a real application, you would fetch this from your API
  // For now, we'll return the R6 branches
  const R6_BRANCHES = [
    { id: 1, baCode: 1060, name: "กปภ.สาขาขอนแก่น(ชั้นพิเศษ)" },
    { id: 2, baCode: 1061, name: "กปภ.สาขาบ้านไผ่" },
    { id: 3, baCode: 1062, name: "กปภ.สาขาชุมแพ" },
    { id: 4, baCode: 1063, name: "กปภ.สาขาน้ำพอง" },
    { id: 5, baCode: 1064, name: "กปภ.สาขาชนบท" },
    { id: 6, baCode: 1065, name: "กปภ.สาขากระนวน" },
    { id: 7, baCode: 1066, name: "กปภ.สาขาหนองเรือ" },
    { id: 8, baCode: 1067, name: "กปภ.สาขาเมืองพล" },
    { id: 9, baCode: 1068, name: "กปภ.สาขากาฬสินธุ์" },
    { id: 10, baCode: 1069, name: "กปภ.สาขากุฉินารายณ์" },
    { id: 11, baCode: 1070, name: "กปภ.สาขาสมเด็จ" },
    { id: 12, baCode: 1071, name: "กปภ.สาขามหาสารคาม" },
    { id: 13, baCode: 1072, name: "กปภ.สาขาพยัคฆภูมิพิสัย" },
    { id: 14, baCode: 1073, name: "กปภ.สาขาชัยภูมิ" },
    { id: 15, baCode: 1074, name: "กปภ.สาขาแก้งคร้อ" },
    { id: 16, baCode: 1075, name: "กปภ.สาขาจัตุรัส" },
    { id: 17, baCode: 1076, name: "กปภ.สาขาหนองบัวแดง" },
    { id: 18, baCode: 1077, name: "กปภ.สาขาภูเขียว" },
    { id: 19, baCode: 1133, name: "กปภ.สาขาร้อยเอ็ด" },
    { id: 20, baCode: 1134, name: "กปภ.สาขาโพนทอง" },
    { id: 21, baCode: 1135, name: "กปภ.สาขาสุวรรณภูมิ" },
    { id: 22, baCode: 1245, name: "กปภ.สาขาบำเหน็จณรงค์" }
  ];

  return R6_BRANCHES;
}

export default async function DocumentUploadPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/login');
  }

  // Check if user has upload permission
  const userRoles = session.user.pwa?.roles || [];
  const canUpload = userRoles.includes('uploader') || 
                   userRoles.includes('admin') ||
                   userRoles.includes('user'); // Allow regular users to upload

  if (!canUpload) {
    redirect('/documents');
  }

  const branches = await getBranches();

  return (
    <div className="container mx-auto px-4 py-6">
      <DocumentUpload 
        branches={branches}
      />
    </div>
  );
}