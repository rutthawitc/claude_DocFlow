'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';
import { signOut } from 'next-auth/react';

interface SessionTimeoutHook {
  timeLeft: number;
  showWarning: boolean;
  extendSession: () => void;
}

export function useSessionTimeoutSimple(): SessionTimeoutHook {
  const { data: session, update } = useSession();
  const [timeLeft, setTimeLeft] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout>();
  const warningShownRef = useRef(false);

  const extendSession = async () => {
    try {
      await update(); // This will update the lastActivity time
      setShowWarning(false);
      warningShownRef.current = false;
      console.log('Session extended successfully');
    } catch (error) {
      console.error('Failed to extend session:', error);
    }
  };

  useEffect(() => {
    if (!session) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      return;
    }

    // Only check session expiration, don't track activity automatically
    intervalRef.current = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const sessionExp = session.expires ? Math.floor(new Date(session.expires).getTime() / 1000) : null;
      
      if (sessionExp) {
        const remaining = sessionExp - now;
        setTimeLeft(remaining);
        
        // Show warning 5 minutes before expiration
        if (remaining <= 300 && remaining > 0 && !warningShownRef.current) {
          setShowWarning(true);
          warningShownRef.current = true;
        }
        
        // Auto logout when session expires
        if (remaining <= 0) {
          console.log('Session expired, signing out');
          signOut({ callbackUrl: '/login?expired=1' });
        }
      }
    }, 30000); // Check every 30 seconds instead of every second

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [session, update]);

  return {
    timeLeft,
    showWarning,
    extendSession
  };
}