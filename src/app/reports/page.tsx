import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { ReportsClient } from './reports-client';

export default async function ReportsPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/login');
  }

  // Check if user has permission to access reports
  const userRoles = session.user.pwa?.roles || [];
  const canAccessReports = userRoles.includes('admin') || userRoles.includes('district_manager');

  if (!canAccessReports) {
    redirect('/unauthorized');
  }

  return (
    <DashboardLayout>
      <ReportsClient />
    </DashboardLayout>
  );
}