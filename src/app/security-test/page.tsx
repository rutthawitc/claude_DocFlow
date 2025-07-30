/**
 * Security Test Page
 * Admin page for testing security implementation
 */

import { Suspense } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { SecurityTest } from '@/components/security/security-test';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function SecurityTestPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Security Implementation Test</h1>
        </div>

        <div className="grid gap-6">
          <Suspense 
            fallback={
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <div className="flex gap-2">
                      <Skeleton className="h-10 w-32" />
                      <Skeleton className="h-10 w-32" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            }
          >
            <SecurityTest />
          </Suspense>

          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">Security Implementation Overview</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium mb-2">🛡️ Security Headers</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Content Security Policy (CSP)</li>
                    <li>• X-Frame-Options</li>
                    <li>• X-Content-Type-Options</li>
                    <li>• X-XSS-Protection</li>
                    <li>• Referrer-Policy</li>
                    <li>• Permissions-Policy</li>
                    <li>• Strict-Transport-Security (HTTPS)</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium mb-2">🔒 CSRF Protection</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Token-based CSRF protection</li>
                    <li>• Automatic token rotation</li>
                    <li>• Secure cookie storage</li>
                    <li>• Client-side token management</li>
                    <li>• State-changing request protection</li>
                    <li>• Bypass attempt detection</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium mb-2">⚡ Rate Limiting</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• API endpoint protection</li>
                    <li>• Login attempt limiting</li>
                    <li>• File upload rate limiting</li>
                    <li>• IP-based restrictions</li>
                    <li>• Configurable limits</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium mb-2">🔐 Additional Security</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Input validation (Zod schemas)</li>
                    <li>• Authentication middleware</li>
                    <li>• Role-based access control</li>
                    <li>• Secure file upload handling</li>
                    <li>• Audit logging</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}