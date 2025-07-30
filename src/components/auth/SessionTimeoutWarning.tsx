'use client';

import { useSessionTimeoutSimple } from '@/hooks/useSessionTimeoutSimple';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Clock, AlertTriangle } from 'lucide-react';
import { signOut } from 'next-auth/react';

export function SessionTimeoutWarning() {
  const { timeLeft, showWarning, extendSession } = useSessionTimeoutSimple();

  const formatTimeLeft = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleExtendSession = () => {
    extendSession();
  };

  const handleLogout = () => {
    signOut({ callbackUrl: '/login?expired=1' });
  };

  if (!showWarning) return null;

  return (
    <Dialog open={showWarning} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <DialogTitle>เซสชันกำลังจะหมดอายุ</DialogTitle>
          </div>
          <DialogDescription className="text-center py-4">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-lg font-mono">
                {formatTimeLeft(timeLeft)}
              </span>
            </div>
            <p>
              เซสชันของคุณจะหมดอายุในอีก <span className="font-semibold">{formatTimeLeft(timeLeft)}</span><br />
              คุณต้องการต่ออายุเซสชันหรือออกจากระบบ?
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full sm:w-auto"
          >
            ออกจากระบบ
          </Button>
          <Button
            onClick={handleExtendSession}
            className="w-full sm:w-auto"
          >
            ต่ออายุเซสชัน
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}