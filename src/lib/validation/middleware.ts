import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Custom validation error class
export class ValidationError extends Error {
  public readonly errors: z.ZodError;
  public readonly statusCode: number = 400;

  constructor(errors: z.ZodError) {
    super('Validation failed');
    this.errors = errors;
    this.name = 'ValidationError';
  }
}

// Format Zod errors for API response
export function formatValidationErrors(error: z.ZodError) {
  return {
    message: 'Validation failed',
    errors: error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
      received: 'received' in err ? err.received : undefined
    }))
  };
}

// Generic validation middleware
export function withValidation<T>(
  schema: z.ZodSchema<T>,
  handler: (data: T, request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      let data: any;

      // Handle different content types
      const contentType = request.headers.get('content-type');

      if (contentType?.includes('application/json')) {
        // JSON request body
        const body = await request.json();
        data = schema.parse(body);
      } else if (contentType?.includes('multipart/form-data')) {
        // FormData request body
        const formData = await request.formData();
        const formObj: Record<string, any> = {};
        
        for (const [key, value] of formData.entries()) {
          if (value instanceof File) {
            formObj[key] = value;
          } else {
            // Handle multiple values for same key
            if (formObj[key]) {
              if (Array.isArray(formObj[key])) {
                formObj[key].push(value);
              } else {
                formObj[key] = [formObj[key], value];
              }
            } else {
              formObj[key] = value;
            }
          }
        }
        
        data = schema.parse(formObj);
      } else {
        // Query parameters or URL search params
        const searchParams = request.nextUrl.searchParams;
        const queryObj: Record<string, any> = {};
        
        for (const [key, value] of searchParams.entries()) {
          queryObj[key] = value;
        }
        
        data = schema.parse(queryObj);
      }

      return await handler(data, request);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = formatValidationErrors(error);
        return NextResponse.json(
          {
            success: false,
            error: 'Validation failed',
            ...formattedErrors
          },
          { status: 400 }
        );
      }

      // Re-throw non-validation errors
      throw error;
    }
  };
}

// Validate query parameters
export function validateQuery<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): T {
  const queryObj: Record<string, any> = {};
  
  for (const [key, value] of searchParams.entries()) {
    queryObj[key] = value;
  }
  
  try {
    return schema.parse(queryObj);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(error);
    }
    throw error;
  }
}

// Validate FormData helper
export function validateFormData<T>(
  formData: FormData,
  schema: z.ZodSchema<T>
): T {
  const data: Record<string, any> = {};
  
  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      // Don't validate file here - it's handled by FileValidationService
      data[key] = value;
    } else {
      // Handle multiple values for same key
      if (data[key]) {
        if (Array.isArray(data[key])) {
          data[key].push(value);
        } else {
          data[key] = [data[key], value];
        }
      } else {
        data[key] = value;
      }
    }
  }
  
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(error);
    }
    throw error;
  }
}

// Validate path parameters
export function validateParams<T>(
  params: Record<string, string | string[]>,
  schema: z.ZodSchema<T>
): T {
  try {
    return schema.parse(params);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(error);
    }
    throw error;
  }
}

// Validate JSON body
export async function validateBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<T> {
  try {
    const body = await request.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(error);
    }
    if (error instanceof SyntaxError) {
      throw new ValidationError(
        new z.ZodError([
          {
            code: 'invalid_type',
            expected: 'object',
            received: 'unknown',
            path: [],
            message: 'Invalid JSON format'
          }
        ])
      );
    }
    throw error;
  }
}


// Error handler for API routes
export function handleValidationError(error: unknown): NextResponse {
  if (error instanceof ValidationError) {
    const formattedErrors = formatValidationErrors(error.errors);
    return NextResponse.json(
      {
        success: false,
        error: 'Validation failed',
        ...formattedErrors
      },
      { status: 400 }
    );
  }

  // Handle other types of errors
  if (error instanceof Error) {
    console.error('API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: process.env.NODE_ENV === 'development' 
          ? error.message 
          : 'Internal server error'
      },
      { status: 500 }
    );
  }

  // Unknown error
  console.error('Unknown API Error:', error);
  return NextResponse.json(
    {
      success: false,
      error: 'Internal server error'
    },
    { status: 500 }
  );
}

// Sanitization helpers
export function sanitizeString(input: string): string {
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>'"]/g, '') // Remove dangerous characters
    .trim();
}

export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj };
  
  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeString(item) : item
      );
    }
  }
  
  return sanitized;
}

// Rate limiting helpers (for future use)
export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: Date;
}

export function checkRateLimit(
  identifier: string,
  windowMs: number,
  maxRequests: number
): RateLimitResult {
  // Placeholder for rate limiting implementation
  // This would typically use Redis or in-memory store
  return {
    success: true,
    remaining: maxRequests - 1,
    reset: new Date(Date.now() + windowMs)
  };
}

// Security headers helper
export function addSecurityHeaders(response: NextResponse): void {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Add cache control for sensitive endpoints
  if (response.url?.includes('/api/')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
  }
}