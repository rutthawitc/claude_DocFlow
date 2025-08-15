"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useLoadingState } from '@/hooks/useLoadingState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { History, RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

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

interface BackupHistoryProps {
  limit?: number;
  showTitle?: boolean;
}

export function BackupHistory({ limit = 10, showTitle = true }: BackupHistoryProps) {
  const { data: session } = useSession();
  const [history, setHistory] = useState<BackupJobResult[]>([]);
  const { loading, error, execute } = useLoadingState();

  // Check if user has admin or district_manager role
  const userRoles = session?.user?.pwa?.roles || [];
  const hasPermission = userRoles.includes('admin') || userRoles.includes('district_manager');

  const loadHistory = async () => {
    if (!hasPermission) return;
    
    try {
      const response = await execute(fetch(`/api/backup/history?limit=${limit}`));
      const result = await response.json();
      
      if (result.success) {
        // Parse timestamp strings back to Date objects
        const parsedHistory = result.data.history.map((job: BackupJobResult) => ({
          ...job,
          timestamp: new Date(job.timestamp)
        }));
        setHistory(parsedHistory);
      } else {
        throw new Error(result.error || 'Failed to load backup history');
      }
    } catch (error) {
      console.error('Error loading backup history:', error);
      toast.error(`❌ Failed to load backup history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [hasPermission, limit]);

  if (!hasPermission) {
    return null;
  }

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

  const getStatusBadge = (success: boolean) => {
    if (success) {
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Success
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary" className="bg-red-100 text-red-700 border-red-200">
          <XCircle className="h-3 w-3 mr-1" />
          Failed
        </Badge>
      );
    }
  };

  return (
    <Card>
      {showTitle && (
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Backup History
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadHistory}
              disabled={loading}
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
      )}
      <CardContent>
        {loading && history.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            <span className="text-muted-foreground">Loading backup history...</span>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No backup history available</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(job.success)}
                    <div className="text-sm">
                      <div className="font-medium">
                        {job.timestamp.toLocaleString('th-TH')}
                      </div>
                      {job.error && (
                        <div className="text-red-600 text-xs mt-1">
                          <AlertTriangle className="h-3 w-3 inline mr-1" />
                          {job.error}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {job.fileCount && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs">📄</span>
                      <span>{job.fileCount.toLocaleString()}</span>
                    </div>
                  )}
                  {job.totalSize && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs">💾</span>
                      <span>{formatBytes(job.totalSize)}</span>
                    </div>
                  )}
                  {job.duration && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatDuration(job.duration)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}