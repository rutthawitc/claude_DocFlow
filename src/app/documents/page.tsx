import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { BranchOverview } from '@/components/docflow/branch-overview';

export default async function DocumentsPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/login');
  }

  // Get user roles from session
  const userRoles = session.user.pwa?.roles || [];
  const userBranchBaCode = session.user.pwa?.ba ? parseInt(session.user.pwa.ba) : undefined;

  return (
    <div className="container mx-auto px-4 py-6">
      <BranchOverview 
        userRoles={userRoles}
        userBranchBaCode={userBranchBaCode}
      />
    </div>
  );
}