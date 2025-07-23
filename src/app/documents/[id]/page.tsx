import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { DocumentDetail } from '@/components/docflow/document-detail';

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
    <div className="container mx-auto px-4 py-6">
      <DocumentDetail 
        documentId={documentId}
        userRoles={userRoles}
        userId={userId}
      />
    </div>
  );
}