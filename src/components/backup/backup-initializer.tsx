"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, RefreshCw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useLoadingState } from '@/hooks/useLoadingState';

interface BackupStatus {
  initialized: boolean;
  running?: boolean;
  config?: {
    enabled: boolean;
    time: string;
    retentionDays: number;
  };
  nextBackupTime?: string;
  error?: string;
}

export function BackupInitializer() {
  const { data: session } = useSession();
  const [status, setStatus] = useState<BackupStatus>({ initialized: false });
  const statusLoading = useLoadingState();
  const initializeLoading = useLoadingState();

  // Check if user has admin or district_manager role
  const userRoles = session?.user?.pwa?.roles || [];
  const hasPermission = userRoles.includes('admin') || userRoles.includes('district_manager');

  // Check backup scheduler status
  const checkStatus = async () => {
    if (!hasPermission) return;
    
    try {
      const response = await statusLoading.execute(fetch('/api/backup/init'));
      const result = await response.json();
      
      if (result.success) {
        setStatus({
          initialized: result.data.initialized,
          running: result.data.running,
          config: result.data.config,
          nextBackupTime: result.data.nextBackupTime
        });
      } else {
        setStatus({
          initialized: false,
          running: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error checking backup status:', error);
      setStatus({
        initialized: false,
        running: false,
        error: 'Failed to check backup status'
      });
    }
  };

  // Initialize backup scheduler
  const initializeScheduler = async () => {
    // Using centralized loading hook
    try {
      const response = await initializeLoading.execute(
        fetch('/api/backup/init', {
          method: 'POST'
        })
      );
      const result = await response.json();

      if (result.success) {
        toast.success('🚀 Backup scheduler initialized successfully!');
        await checkStatus(); // Refresh status
      } else {
        toast.error(`❌ Failed to initialize backup scheduler: ${result.error}`);
      }
    } catch (error) {
      console.error('Error initializing backup scheduler:', error);
      toast.error('❌ Failed to initialize backup scheduler');
    }
  };

  // Check status on component mount
  useEffect(() => {
    checkStatus();
  }, [hasPermission]);

  // Don't render if user doesn't have permission
  if (!hasPermission) {
    return null;
  }

  const formatNextBackupTime = (isoString?: string) => {
    if (!isoString) return 'N/A';
    return new Date(isoString).toLocaleString('th-TH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5" />
          Backup Scheduler Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Scheduler Status</p>
            <p className="text-xs text-muted-foreground">
              Current status of the automatic backup scheduler
            </p>
          </div>
          <div className="flex items-center gap-2">
            {statusLoading.loading ? (
              <Badge variant="secondary">
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                Checking...
              </Badge>
            ) : status.running ? (
              <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                Running
              </Badge>
            ) : status.initialized && status.config && !status.config.enabled ? (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 border-yellow-200">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Disabled
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-red-100 text-red-700 border-red-200">
                <XCircle className="h-3 w-3 mr-1" />
                Stopped
              </Badge>
            )}
          </div>
        </div>

        {status.config && (
          <div className="bg-gray-50 p-3 rounded-lg space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Enabled:</span> {status.config.enabled ? 'Yes' : 'No'}
              </div>
              <div>
                <span className="font-medium">Time:</span> {status.config.time}
              </div>
              <div>
                <span className="font-medium">Retention:</span> {status.config.retentionDays} days
              </div>
              <div>
                <span className="font-medium">Next Run:</span> {formatNextBackupTime(status.nextBackupTime)}
              </div>
            </div>
          </div>
        )}

        {status.error && (
          <div className="bg-red-50 p-3 rounded-lg flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
            <div className="text-sm text-red-700">
              <strong>Error:</strong> {status.error}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={checkStatus}
            disabled={statusLoading.loading}
          >
            {statusLoading.loading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh Status
          </Button>

          {(!status.running && status.config?.enabled) && (
            <Button
              size="sm"
              onClick={initializeScheduler}
              disabled={initializeLoading.loading}
            >
              {initializeLoading.loading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {status.initialized ? 'Start Scheduler' : 'Initialize Scheduler'}
            </Button>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          <strong>Note:</strong> The backup scheduler runs server-side and needs to be initialized 
          when the application starts. If it&apos;s not running, use the &quot;Initialize Scheduler&quot; button.
        </div>
      </CardContent>
    </Card>
  );
}