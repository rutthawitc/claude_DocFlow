/**
 * Database Error Handler Utility
 *
 * Provides robust error handling for database operations, particularly for
 * issues that might arise from data inconsistencies or missing relationships.
 */

export type SafeQueryResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
  details?: any;
}

export class DatabaseErrorHandler {
  /**
   * Safely execute a database query with comprehensive error handling
   */
  static async safeQuery<T>(
    operation: () => Promise<T>,
    operationName: string,
    fallbackValue?: T
  ): Promise<SafeQueryResult<T>> {
    try {
      const result = await operation();

      // Check if result is null/undefined when not expected
      if (result === null || result === undefined) {
        console.warn(`${operationName}: Query returned null/undefined result`);
        if (fallbackValue !== undefined) {
          return { success: true, data: fallbackValue };
        }
        return {
          success: false,
          error: `${operationName}: No data found`,
          details: { result }
        };
      }

      return { success: true, data: result };
    } catch (error: any) {
      console.error(`${operationName} failed:`, error);

      // Handle specific database error types
      if (error.message?.includes('Cannot convert undefined or null to object')) {
        return {
          success: false,
          error: `${operationName}: Data structure error - null/undefined object`,
          details: { originalError: error.message }
        };
      }

      if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        return {
          success: false,
          error: `${operationName}: Database table/relation missing`,
          details: { originalError: error.message }
        };
      }

      if (error.message?.includes('foreign key')) {
        return {
          success: false,
          error: `${operationName}: Foreign key constraint violation`,
          details: { originalError: error.message }
        };
      }

      return {
        success: false,
        error: `${operationName}: ${error.message || 'Unknown database error'}`,
        details: { originalError: error }
      };
    }
  }

  /**
   * Validate query result for null/undefined values in nested objects
   */
  static validateQueryResult(result: any, requiredFields: string[]): boolean {
    if (!result) return false;

    for (const field of requiredFields) {
      const fieldParts = field.split('.');
      let current = result;

      for (const part of fieldParts) {
        if (!current || current[part] === undefined || current[part] === null) {
          console.warn(`Missing required field: ${field} (${part} is null/undefined)`);
          return false;
        }
        current = current[part];
      }
    }

    return true;
  }

  /**
   * Safely access nested object properties
   */
  static safeAccess<T>(obj: any, path: string, defaultValue: T): T {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        console.warn(`Safe access failed at path: ${path} (part: ${part})`);
        return defaultValue;
      }
    }

    return current !== undefined && current !== null ? current : defaultValue;
  }

  /**
   * Log detailed error information for debugging
   */
  static logDetailedError(context: string, error: any, additionalData?: any) {
    console.error(`🚨 ${context} - Detailed Error:`, {
      message: error?.message,
      stack: error?.stack,
      code: error?.code,
      detail: error?.detail,
      constraint: error?.constraint,
      table: error?.table,
      column: error?.column,
      additionalData
    });
  }

  /**
   * Check if an array result is valid and non-empty
   */
  static isValidArrayResult<T>(result: T[]): result is NonEmptyArray<T> {
    return Array.isArray(result) && result.length > 0;
  }

  /**
   * Safely extract first element from array with fallback
   */
  static safeFirst<T>(arr: T[], context: string): T | null {
    if (!this.isValidArrayResult(arr)) {
      console.warn(`${context}: Empty or invalid array result`);
      return null;
    }
    return arr[0];
  }
}

type NonEmptyArray<T> = [T, ...T[]];

/**
 * Decorator for adding automatic error handling to methods
 */
export function withDatabaseErrorHandling(operationName: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        return await method.apply(this, args);
      } catch (error) {
        DatabaseErrorHandler.logDetailedError(
          `${target.constructor.name}.${propertyName}`,
          error,
          { operationName, args }
        );
        throw error;
      }
    };

    return descriptor;
  };
}