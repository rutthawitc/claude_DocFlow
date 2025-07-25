import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { DocumentDetail } from '@/components/docflow/document-detail';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';

interface DocumentDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function DocumentDetailPage({ 
  params: paramsPromise 
}: DocumentDetailPageProps) {
  const params = await paramsPromise;
  const session = await auth();
  
  if (!session?.user) {
    redirect('/login');
  }

  const documentId = parseInt(params.id);
  
  if (isNaN(documentId)) {
    redirect('/documents');
  }

  const userRoles = session.user.pwa?.roles || [];
  const userId = session.user.id ? parseInt(session.user.id) : undefined;

  return (
    <DashboardLayout>
      <DocumentDetail 
        documentId={documentId}
        userRoles={userRoles}
        userId={userId}
      />
    </DashboardLayout>
  );
}