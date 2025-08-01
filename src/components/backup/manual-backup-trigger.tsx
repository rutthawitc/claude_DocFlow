"use client";

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlayCircle, RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { BackupHistory } from './backup-history';

interface BackupJobResult {
  id: string;
  timestamp: Date;
  success: boolean;
  backupPath?: string;
  fileCount?: number;
  totalSize?: number;
  duration?: number;
  error?: string;
}

export function ManualBackupTrigger() {
  const { data: session } = useSession();
  const [triggering, setTriggering] = useState(false);
  const [lastResult, setLastResult] = useState<BackupJobResult | null>(null);

  // Check if user has admin or district_manager role
  const userRoles = session?.user?.pwa?.roles || [];
  const hasPermission = userRoles.includes('admin') || userRoles.includes('district_manager');

  const triggerManualBackup = async () => {
    setTriggering(true);
    setLastResult(null);
    
    try {
      const response = await fetch('/api/backup/schedule', {
        method: 'POST'
      });
      const result = await response.json();
      
      if (result.success) {
        const jobResult = {
          ...result.data,
          timestamp: new Date(result.data.timestamp)
        };
        setLastResult(jobResult);
        
        if (jobResult.success) {
          toast.success(
            `✅ Manual backup completed successfully!\n` +
            `📄 Files: ${jobResult.fileCount?.toLocaleString() || 'N/A'}\n` +
            `💾 Size: ${formatBytes(jobResult.totalSize)}\n` +
            `⏱️ Duration: ${formatDuration(jobResult.duration)}`
          );
        } else {
          toast.error(`❌ Manual backup failed: ${jobResult.error}`);
        }
      } else {
        toast.error(`❌ Failed to trigger manual backup: ${result.error}`);
      }
    } catch (error) {
      console.error('Error triggering manual backup:', error);
      toast.error('❌ Failed to trigger manual backup');
    } finally {
      setTriggering(false);
    }
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  if (!hasPermission) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5" />
            Manual Backup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p>Trigger an immediate backup operation outside of the scheduled time.</p>
            <p className="mt-1">
              <strong>Note:</strong> Manual backups follow the same process as scheduled backups
              and will be included in the backup history.
            </p>
          </div>

          {lastResult && (
            <div className={`p-4 rounded-lg border ${
              lastResult.success 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-start gap-2">
                {lastResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="font-medium text-sm">
                    Last Manual Backup Result
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {lastResult.timestamp.toLocaleString('th-TH')}
                  </div>
                  
                  {lastResult.success ? (
                    <div className="mt-2 space-y-1 text-sm">
                      <div>✅ Backup completed successfully</div>
                      {lastResult.fileCount && (
                        <div>📄 Files backed up: {lastResult.fileCount.toLocaleString()}</div>
                      )}
                      {lastResult.totalSize && (
                        <div>💾 Total size: {formatBytes(lastResult.totalSize)}</div>
                      )}
                      {lastResult.duration && (
                        <div>⏱️ Duration: {formatDuration(lastResult.duration)}</div>
                      )}
                      {lastResult.backupPath && (
                        <div className="text-xs text-muted-foreground mt-1">
                          📂 Path: {lastResult.backupPath}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-2">
                      <div className="text-red-700 text-sm flex items-start gap-1">
                        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>{lastResult.error}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={triggerManualBackup}
              disabled={triggering}
              size="sm"
            >
              {triggering ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Backup in Progress...
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Start Manual Backup
                </>
              )}
            </Button>
          </div>

          {triggering && (
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 text-blue-700">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm font-medium">Backup in progress...</span>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                This may take several minutes depending on the amount of data to backup.
                Please do not close this page.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <BackupHistory limit={5} showTitle={true} />
    </div>
  );
}