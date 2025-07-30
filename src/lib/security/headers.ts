/**
 * Security Headers Utility
 * Provides comprehensive security headers for Next.js application
 */

import { NextResponse } from 'next/server';

export interface SecurityHeadersConfig {
  contentSecurityPolicy?: {
    default?: string[];
    script?: string[];
    style?: string[];
    img?: string[];
    connect?: string[];
    font?: string[];
    object?: string[];
    media?: string[];
    frame?: string[];
    worker?: string[];
  };
  strictTransportSecurity?: {
    maxAge?: number;
    includeSubDomains?: boolean;
    preload?: boolean;
  };
  frameOptions?: 'DENY' | 'SAMEORIGIN' | 'ALLOW-FROM';
  contentTypeOptions?: boolean;
  referrerPolicy?: 'no-referrer' | 'no-referrer-when-downgrade' | 'origin' | 'origin-when-cross-origin' | 'same-origin' | 'strict-origin' | 'strict-origin-when-cross-origin' | 'unsafe-url';
  xssProtection?: boolean;
  permissionsPolicy?: Record<string, string>;
}

const DEFAULT_CONFIG: SecurityHeadersConfig = {
  contentSecurityPolicy: {
    default: ["'self'"],
    script: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "blob:"],
    style: ["'self'", "'unsafe-inline'"],
    img: ["'self'", "data:", "https:"],
    connect: ["'self'", "https://*.vercel-postgres.com", "https://api.telegram.org"],
    font: ["'self'", "data:", "https://unpkg.com"],
    object: ["'none'"],
    media: ["'self'"],
    frame: ["'self'"],
    worker: ["'self'", "blob:"]
  },
  strictTransportSecurity: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  frameOptions: 'SAMEORIGIN',
  contentTypeOptions: true,
  referrerPolicy: 'strict-origin-when-cross-origin',
  xssProtection: true,
  permissionsPolicy: {
    camera: '()',
    microphone: '()',
    geolocation: '()',
    interest_cohort: '()', // Disable FLoC
    payment: '()',
    usb: '()',
    bluetooth: '()',
    autoplay: '()',
    fullscreen: '(self)'
  }
};

/**
 * Generate Content Security Policy string
 */
function generateCSP(config: SecurityHeadersConfig['contentSecurityPolicy']): string {
  if (!config) return '';
  
  const directives: string[] = [];
  
  if (config.default) directives.push(`default-src ${config.default.join(' ')}`);
  if (config.script) directives.push(`script-src ${config.script.join(' ')}`);
  if (config.style) directives.push(`style-src ${config.style.join(' ')}`);
  if (config.img) directives.push(`img-src ${config.img.join(' ')}`);
  if (config.connect) directives.push(`connect-src ${config.connect.join(' ')}`);
  if (config.font) directives.push(`font-src ${config.font.join(' ')}`);
  if (config.object) directives.push(`object-src ${config.object.join(' ')}`);
  if (config.media) directives.push(`media-src ${config.media.join(' ')}`);
  if (config.frame) directives.push(`frame-src ${config.frame.join(' ')}`);
  if (config.worker) directives.push(`worker-src ${config.worker.join(' ')}`);
  
  return directives.join('; ');
}

/**
 * Generate Strict Transport Security header
 */
function generateHSTS(config: SecurityHeadersConfig['strictTransportSecurity']): string {
  if (!config) return '';
  
  let hsts = `max-age=${config.maxAge || 31536000}`;
  if (config.includeSubDomains) hsts += '; includeSubDomains';
  if (config.preload) hsts += '; preload';
  
  return hsts;
}

/**
 * Generate Permissions Policy header
 */
function generatePermissionsPolicy(config: Record<string, string>): string {
  return Object.entries(config)
    .map(([directive, allowlist]) => `${directive}=${allowlist}`)
    .join(', ');
}

/**
 * Apply security headers to a NextResponse
 */
export function applySecurityHeaders(
  response: NextResponse, 
  config: SecurityHeadersConfig = DEFAULT_CONFIG
): NextResponse {
  // Content Security Policy
  if (config.contentSecurityPolicy) {
    const csp = generateCSP(config.contentSecurityPolicy);
    if (csp) {
      response.headers.set('Content-Security-Policy', csp);
    }
  }

  // Strict Transport Security (HTTPS only)
  if (config.strictTransportSecurity && process.env.NODE_ENV === 'production') {
    const hsts = generateHSTS(config.strictTransportSecurity);
    if (hsts) {
      response.headers.set('Strict-Transport-Security', hsts);
    }
  }

  // X-Frame-Options
  if (config.frameOptions) {
    response.headers.set('X-Frame-Options', config.frameOptions);
  }

  // X-Content-Type-Options
  if (config.contentTypeOptions) {
    response.headers.set('X-Content-Type-Options', 'nosniff');
  }

  // Referrer Policy
  if (config.referrerPolicy) {
    response.headers.set('Referrer-Policy', config.referrerPolicy);
  }

  // X-XSS-Protection (legacy but still useful)
  if (config.xssProtection) {
    response.headers.set('X-XSS-Protection', '1; mode=block');
  }

  // Permissions Policy
  if (config.permissionsPolicy) {
    const permissionsPolicy = generatePermissionsPolicy(config.permissionsPolicy);
    if (permissionsPolicy) {
      response.headers.set('Permissions-Policy', permissionsPolicy);
    }
  }

  // Additional security headers
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  response.headers.set('X-Download-Options', 'noopen');
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  response.headers.set('X-Powered-By', ''); // Remove server identification

  return response;
}

/**
 * Security headers for API routes
 */
export function applyAPISecurityHeaders(response: NextResponse): NextResponse {
  const apiConfig: SecurityHeadersConfig = {
    contentSecurityPolicy: {
      default: ['none'] // API routes should have minimal CSP
    },
    frameOptions: 'DENY', // API routes should never be framed
    contentTypeOptions: true,
    referrerPolicy: 'no-referrer',
    xssProtection: true
  };

  applySecurityHeaders(response, apiConfig);
  
  // API-specific headers
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  
  return response;
}

/**
 * Create a secure response with headers
 */
export function createSecureResponse(
  body?: BodyInit | null, 
  init?: ResponseInit,
  config?: SecurityHeadersConfig
): NextResponse {
  const response = new NextResponse(body, init);
  return applySecurityHeaders(response, config);
}

/**
 * Create a secure API response with headers
 */
export function createSecureAPIResponse(
  data: any,
  status: number = 200,
  headers?: Record<string, string>
): NextResponse {
  const response = NextResponse.json(data, { 
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  });
  
  return applyAPISecurityHeaders(response);
}