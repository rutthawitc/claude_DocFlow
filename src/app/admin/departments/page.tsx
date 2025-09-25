import { DepartmentManagement } from '@/components/admin/department-management';

export default function DepartmentsAdminPage() {
  // Authentication and authorization is already handled by the admin layout
  return (
    <div className="container mx-auto px-4 py-6">
      <DepartmentManagement />
    </div>
  );
}