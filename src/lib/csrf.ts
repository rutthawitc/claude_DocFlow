// src/lib/csrf.ts
'use server';

import { randomBytes } from 'crypto';

/**
 * Generates a CSRF token and sets it as a cookie
 * This must be called from a Server Action or Route Handler
 */
export async function generateCsrfToken() {
  const token = randomBytes(32).toString('hex');
  
  // In Next.js 15, we need to create a hidden input with the token
  // instead of trying to set a cookie directly
  return token;
}

/**
 * Validates a CSRF token against the stored token in cookies
 * This must be called from a Server Action or Route Handler
 */
export async function validateCsrfToken(token: string, formToken: string) {
  // Simply compare the tokens directly
  if (!token || !formToken || token !== formToken) {
    return false;
  }
  
  return true;
}