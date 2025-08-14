/**
 * Centralized session timeout configuration
 * 
 * This module provides a single source of truth for all session timeout values
 * used throughout the application, including NextAuth.js configuration,
 * JWT callbacks, and client-side session management hooks.
 */

export interface SessionTimeoutConfig {
  /** Absolute session timeout in seconds - maximum session duration regardless of activity */
  absoluteTimeoutSeconds: number;
  /** Idle timeout in seconds - session expires after this period of inactivity */
  idleTimeoutSeconds: number;
  /** Warning time before expiration in seconds - when to show warning to user */
  warningTimeSeconds: number;
  /** Client check interval in milliseconds - how often to check session status on client */
  checkIntervalMs: number;
  /** Activity update throttle in milliseconds - minimum time between activity updates */
  activityUpdateThrottleMs: number;
}

/**
 * Default session configuration values
 * These values provide a secure and user-friendly session experience:
 * - 4 hour absolute maximum
 * - 30 minute idle timeout
 * - 5 minute warning before expiration
 */
export const DEFAULT_SESSION_CONFIG: SessionTimeoutConfig = {
  absoluteTimeoutSeconds: 4 * 60 * 60, // 4 hours
  idleTimeoutSeconds: 30 * 60, // 30 minutes
  warningTimeSeconds: 5 * 60, // 5 minutes
  checkIntervalMs: 30 * 1000, // 30 seconds
  activityUpdateThrottleMs: 5 * 60 * 1000, // 5 minutes
};

/**
 * Get session configuration with environment variable overrides
 * 
 * Environment variables (optional):
 * - SESSION_ABSOLUTE_TIMEOUT_SECONDS: Override absolute timeout (default: 14400 = 4 hours)
 * - SESSION_IDLE_TIMEOUT_SECONDS: Override idle timeout (default: 1800 = 30 minutes)
 * - SESSION_WARNING_TIME_SECONDS: Override warning time (default: 300 = 5 minutes)
 * 
 * @returns SessionTimeoutConfig with environment overrides applied
 */
export function getSessionConfig(): SessionTimeoutConfig {
  return {
    absoluteTimeoutSeconds: process.env.SESSION_ABSOLUTE_TIMEOUT_SECONDS 
      ? parseInt(process.env.SESSION_ABSOLUTE_TIMEOUT_SECONDS, 10)
      : DEFAULT_SESSION_CONFIG.absoluteTimeoutSeconds,
    idleTimeoutSeconds: process.env.SESSION_IDLE_TIMEOUT_SECONDS
      ? parseInt(process.env.SESSION_IDLE_TIMEOUT_SECONDS, 10)
      : DEFAULT_SESSION_CONFIG.idleTimeoutSeconds,
    warningTimeSeconds: process.env.SESSION_WARNING_TIME_SECONDS
      ? parseInt(process.env.SESSION_WARNING_TIME_SECONDS, 10)
      : DEFAULT_SESSION_CONFIG.warningTimeSeconds,
    checkIntervalMs: DEFAULT_SESSION_CONFIG.checkIntervalMs,
    activityUpdateThrottleMs: DEFAULT_SESSION_CONFIG.activityUpdateThrottleMs,
  };
}

/**
 * Validate session configuration values
 * Ensures configuration values are reasonable and secure
 * 
 * @param config - Session configuration to validate
 * @throws Error if configuration is invalid
 */
export function validateSessionConfig(config: SessionTimeoutConfig): void {
  if (config.absoluteTimeoutSeconds <= 0) {
    throw new Error('Absolute timeout must be greater than 0 seconds');
  }
  
  if (config.idleTimeoutSeconds <= 0) {
    throw new Error('Idle timeout must be greater than 0 seconds');
  }
  
  if (config.idleTimeoutSeconds > config.absoluteTimeoutSeconds) {
    throw new Error('Idle timeout cannot be greater than absolute timeout');
  }
  
  if (config.warningTimeSeconds <= 0) {
    throw new Error('Warning time must be greater than 0 seconds');
  }
  
  if (config.warningTimeSeconds >= config.idleTimeoutSeconds) {
    throw new Error('Warning time must be less than idle timeout');
  }
  
  if (config.checkIntervalMs <= 0) {
    throw new Error('Check interval must be greater than 0 milliseconds');
  }
  
  if (config.activityUpdateThrottleMs <= 0) {
    throw new Error('Activity update throttle must be greater than 0 milliseconds');
  }
}

/**
 * Get validated session configuration
 * Returns configuration with validation checks applied
 * 
 * @returns Validated SessionTimeoutConfig
 */
export function getValidatedSessionConfig(): SessionTimeoutConfig {
  const config = getSessionConfig();
  validateSessionConfig(config);
  return config;
}

/**
 * Helper function to convert seconds to milliseconds
 * @param seconds - Number of seconds
 * @returns Number of milliseconds
 */
export function secondsToMs(seconds: number): number {
  return seconds * 1000;
}

/**
 * Helper function to convert milliseconds to seconds
 * @param milliseconds - Number of milliseconds
 * @returns Number of seconds
 */
export function msToSeconds(milliseconds: number): number {
  return Math.floor(milliseconds / 1000);
}