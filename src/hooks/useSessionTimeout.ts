'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';
import { signOut } from 'next-auth/react';

interface SessionTimeoutHook {
  timeLeft: number;
  showWarning: boolean;
  extendSession: () => void;
}

export function useSessionTimeout(): SessionTimeoutHook {
  const { data: session, update } = useSession();
  const [timeLeft, setTimeLeft] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout>();
  const warningShownRef = useRef(false);
  const lastUpdateRef = useRef<number>(0);

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

    // Update session activity on user interaction (throttled to every 5 minutes)
    const updateActivity = () => {
      if (session) {
        const now = Date.now();
        // Only update session if 5 minutes have passed since last update
        if (now - lastUpdateRef.current > 5 * 60 * 1000) {
          lastUpdateRef.current = now;
          update(); // Update lastActivity time
        }
      }
    };

    // Temporarily disable automatic activity tracking to prevent navigation issues
    // Add event listeners for user activity
    // const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    // events.forEach(event => {
    //   document.addEventListener(event, updateActivity, { passive: true });
    // });

    // Set up timeout checking interval
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
    }, 1000); // Check every second

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // events.forEach(event => {
      //   document.removeEventListener(event, updateActivity);
      // });
    };
  }, [session, update]);

  return {
    timeLeft,
    showWarning,
    extendSession
  };
}