/**
 * Client-side CSRF Utilities
 * Provides CSRF token management for React components
 */

"use client";

import { toast } from "sonner";

interface CSRFTokenResponse {
  success: boolean;
  data?: {
    csrfToken: string;
  };
  error?: string;
  message?: string;
}

class CSRFManager {
  private token: string | null = null;
  private tokenExpiry: number | null = null;
  private isRefreshing: boolean = false;

  constructor() {
    // Initialize token from cookie if available
    this.initializeFromCookie();
  }

  /**
   * Initialize token from existing cookie
   */
  private initializeFromCookie(): void {
    if (typeof document !== 'undefined') {
      const cookies = document.cookie.split(';');
      const csrfCookie = cookies.find(cookie => 
        cookie.trim().startsWith('_csrf_token=')
      );
      
      if (csrfCookie) {
        this.token = csrfCookie.split('=')[1];
        // Set expiry to 23 hours from now (token is valid for 24 hours)
        this.tokenExpiry = Date.now() + (23 * 60 * 60 * 1000);
      }
    }
  }

  /**
   * Check if current token is expired or about to expire
   */
  private isTokenExpired(): boolean {
    if (!this.token || !this.tokenExpiry) {
      return true;
    }
    // Consider token expired if less than 1 hour remaining
    return Date.now() > (this.tokenExpiry - (60 * 60 * 1000));
  }

  /**
   * Fetch a new CSRF token from the server
   */
  private async fetchNewToken(): Promise<string | null> {
    try {
      const response = await fetch('/api/csrf', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Failed to fetch CSRF token:', response.status);
        return null;
      }

      const result: CSRFTokenResponse = await response.json();
      
      if (result.success && result.data?.csrfToken) {
        this.token = result.data.csrfToken;
        this.tokenExpiry = Date.now() + (23 * 60 * 60 * 1000);
        return this.token;
      }

      console.error('Invalid CSRF token response:', result);
      return null;
    } catch (error) {
      console.error('Error fetching CSRF token:', error);
      return null;
    }
  }

  /**
   * Get current CSRF token, refreshing if necessary
   */
  async getToken(): Promise<string | null> {
    // If we're already refreshing, wait for it to complete
    if (this.isRefreshing) {
      // Wait up to 5 seconds for refresh to complete
      for (let i = 0; i < 50; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        if (!this.isRefreshing) {
          break;
        }
      }
    }

    // Check if we need a new token
    if (this.isTokenExpired()) {
      this.isRefreshing = true;
      try {
        const newToken = await this.fetchNewToken();
        this.isRefreshing = false;
        return newToken;
      } catch (error) {
        this.isRefreshing = false;
        console.error('Failed to refresh CSRF token:', error);
        return null;
      }
    }

    return this.token;
  }

  /**
   * Add CSRF token to request headers
   */
  async addTokenToHeaders(headers: Record<string, string> = {}): Promise<Record<string, string>> {
    const token = await this.getToken();
    
    if (token) {
      headers['x-csrf-token'] = token;
    }

    return headers;
  }

  /**
   * Create a secure fetch wrapper with CSRF protection
   */
  async secureFetch(
    url: string, 
    options: RequestInit = {}
  ): Promise<Response> {
    // Only add CSRF token for state-changing requests
    const methodsRequiringCSRF = ['POST', 'PUT', 'PATCH', 'DELETE'];
    const method = (options.method || 'GET').toUpperCase();
    
    if (methodsRequiringCSRF.includes(method)) {
      const token = await this.getToken();
      
      if (!token) {
        throw new Error('Unable to obtain CSRF token');
      }

      // Add CSRF token to headers
      options.headers = {
        ...options.headers,
        'x-csrf-token': token,
      };
    }

    // Ensure credentials are included for cookies
    options.credentials = options.credentials || 'include';

    return fetch(url, options);
  }

  /**
   * Clear stored token (useful for logout)
   */
  clearToken(): void {
    this.token = null;
    this.tokenExpiry = null;
  }
}

// Create singleton instance
export const csrfManager = new CSRFManager();

/**
 * React hook for CSRF token management
 */
export function useCSRF() {
  const getToken = async (): Promise<string | null> => {
    return csrfManager.getToken();
  };

  const addTokenToHeaders = async (headers: Record<string, string> = {}): Promise<Record<string, string>> => {
    return csrfManager.addTokenToHeaders(headers);
  };

  const secureFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    try {
      return await csrfManager.secureFetch(url, options);
    } catch (error) {
      console.error('Secure fetch error:', error);
      toast.error('Security error: Unable to complete request');
      throw error;
    }
  };

  const clearToken = (): void => {
    csrfManager.clearToken();
  };

  return {
    getToken,
    addTokenToHeaders,
    secureFetch,
    clearToken,
  };
}

/**
 * Higher-order function to wrap existing fetch calls with CSRF protection
 */
export function withCSRF<T extends any[]>(
  fetchFunction: (...args: T) => Promise<Response>
) {
  return async (...args: T): Promise<Response> => {
    // This assumes the first argument is URL and second is options
    const [url, options = {}] = args as [string, RequestInit, ...any[]];
    
    return csrfManager.secureFetch(url, options);
  };
}

/**
 * Utility function to create secure API calls
 */
export async function secureApiCall(
  endpoint: string,
  method = 'GET',
  data?: any,
  additionalHeaders?: Record<string, string>
): Promise<Response> {
  const options: RequestInit = {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...additionalHeaders,
    },
  };

  if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
    options.body = JSON.stringify(data);
  }

  return csrfManager.secureFetch(endpoint, options);
}