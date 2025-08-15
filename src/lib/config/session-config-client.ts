/**
 * Client-side session configuration
 * 
 * This module provides session timeout configuration for client-side components.
 * Since client components cannot access environment variables directly,
 * this provides compile-time constants based on the default configuration.
 */

import { DEFAULT_SESSION_CONFIG, type SessionTimeoutConfig } from './session-config';

/**
 * Client-side session configuration with compile-time values
 * 
 * Note: Environment variable overrides are not available on the client side.
 * These values are compiled into the bundle at build time.
 */
export const CLIENT_SESSION_CONFIG: Readonly<SessionTimeoutConfig> = {
  absoluteTimeoutSeconds: DEFAULT_SESSION_CONFIG.absoluteTimeoutSeconds,
  idleTimeoutSeconds: DEFAULT_SESSION_CONFIG.idleTimeoutSeconds,
  warningTimeSeconds: DEFAULT_SESSION_CONFIG.warningTimeSeconds,
  checkIntervalMs: DEFAULT_SESSION_CONFIG.checkIntervalMs,
  activityUpdateThrottleMs: DEFAULT_SESSION_CONFIG.activityUpdateThrottleMs,
} as const;

/**
 * Get client-side session configuration
 * This function provides a consistent API with the server-side configuration
 * but returns compile-time constants for client-side use.
 * 
 * @returns SessionTimeoutConfig for client-side use
 */
export function getClientSessionConfig(): SessionTimeoutConfig {
  return CLIENT_SESSION_CONFIG;
}

/**
 * Helper to get default options for session timeout hooks
 * Provides commonly used default options based on centralized configuration
 * 
 * @returns Default SessionTimeoutOptions
 */
export function getDefaultSessionTimeoutOptions(): {
  warningTime: number;
  checkInterval: number;
  enableActivityTracking: boolean;
  activityUpdateThrottle: number;
} {
  const config = getClientSessionConfig();
  
  return {
    warningTime: config.warningTimeSeconds,
    checkInterval: config.checkIntervalMs,
    enableActivityTracking: false,
    activityUpdateThrottle: config.activityUpdateThrottleMs,
  };
}