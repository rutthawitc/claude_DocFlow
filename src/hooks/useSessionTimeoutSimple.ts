'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { signOut } from 'next-auth/react';
import { getDefaultSessionTimeoutOptions } from '@/lib/config/session-config-client';

interface SessionTimeoutHook {
  timeLeft: number;
  showWarning: boolean;
  extendSession: () => void;
}

interface SessionTimeoutOptions {
  warningTime?: number; // Seconds before expiration to show warning (default: 300 = 5 minutes)
  checkInterval?: number; // How often to check session in milliseconds (default: 30000 = 30 seconds)
  enableActivityTracking?: boolean; // Enable automatic activity tracking (default: false)
  activityUpdateThrottle?: number; // Throttle activity updates in milliseconds (default: 300000 = 5 minutes)
}

/**
 * Unified session timeout hook
 * Consolidates useSessionTimeout and useSessionTimeoutSimple with configurable options
 */
export function useSessionTimeout(options: SessionTimeoutOptions = {}): SessionTimeoutHook {
  // Get default options from centralized configuration
  const defaultOptions = getDefaultSessionTimeoutOptions();
  
  const {
    warningTime = defaultOptions.warningTime,
    checkInterval = defaultOptions.checkInterval,
    enableActivityTracking = defaultOptions.enableActivityTracking,
    activityUpdateThrottle = defaultOptions.activityUpdateThrottle
  } = options;

  const { data: session, update } = useSession();
  const [timeLeft, setTimeLeft] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout>();
  const warningShownRef = useRef(false);
  const lastUpdateRef = useRef<number>(0);

  // Two-pass rendering strategy to prevent hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  const extendSession = useCallback(async () => {
    try {
      await update(); // This will update the lastActivity time
      setShowWarning(false);
      warningShownRef.current = false;
      console.log('Session extended successfully');
    } catch (error) {
      console.error('Failed to extend session:', error);
    }
  }, [update]);

  // Activity tracking setup (only if enabled)
  useEffect(() => {
    if (!enableActivityTracking || !session || !isClient) {
      return;
    }

    const updateActivity = () => {
      if (session) {
        const now = Date.now();
        // Only update session if enough time has passed since last update
        if (now - lastUpdateRef.current > activityUpdateThrottle) {
          lastUpdateRef.current = now;
          update(); // Update lastActivity time
        }
      }
    };

    // Add event listeners for user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
    };
  }, [session, update, enableActivityTracking, activityUpdateThrottle, isClient]);

  // Main session timeout checking
  useEffect(() => {
    if (!session || !isClient) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      return;
    }

    // Reset warning when session changes
    warningShownRef.current = false;
    setShowWarning(false);

    // Set up timeout checking interval
    intervalRef.current = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const sessionExp = session.expires ? Math.floor(new Date(session.expires).getTime() / 1000) : null;
      
      if (sessionExp) {
        const remaining = sessionExp - now;
        setTimeLeft(remaining);
        
        // Show warning before expiration
        if (remaining <= warningTime && remaining > 0 && !warningShownRef.current) {
          setShowWarning(true);
          warningShownRef.current = true;
        }
        
        // Auto logout when session expires
        if (remaining <= 0) {
          console.log('Session expired, signing out');
          signOut({ callbackUrl: '/login?expired=1' });
        }
      }
    }, checkInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [session?.expires, isClient, warningTime, checkInterval]);

  return {
    timeLeft,
    showWarning,
    extendSession
  };
}

/**
 * Simple session timeout hook (optimized for performance)
 * This is the recommended version for most use cases
 */
export function useSessionTimeoutSimple(): SessionTimeoutHook {
  // Get default options from centralized configuration
  const defaultOptions = getDefaultSessionTimeoutOptions();
  
  return useSessionTimeout({
    warningTime: defaultOptions.warningTime,
    checkInterval: defaultOptions.checkInterval,
    enableActivityTracking: false // No automatic activity tracking
  });
}

/**
 * Legacy hook with activity tracking for compatibility
 * Use this if you need the old useSessionTimeout behavior
 */
export function useSessionTimeoutWithActivity(): SessionTimeoutHook {
  // Get default options from centralized configuration
  const defaultOptions = getDefaultSessionTimeoutOptions();
  
  return useSessionTimeout({
    warningTime: defaultOptions.warningTime,
    checkInterval: 1000, // Check every second (like the old hook)
    enableActivityTracking: true, // Enable activity tracking
    activityUpdateThrottle: defaultOptions.activityUpdateThrottle
  });
}

// Export the main hook as default
export default useSessionTimeout;