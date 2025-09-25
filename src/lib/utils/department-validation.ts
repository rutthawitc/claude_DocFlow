// Department validation utilities and error handling

import { z } from 'zod';

// Client-side validation schemas (matching server-side)
export const clientDepartmentCreateSchema = z.object({
  baCode: z.number()
    .int('BA code must be a whole number')
    .min(1000, 'BA code must be at least 1000')
    .max(999999, 'BA code must be at most 999999'),

  name: z.string()
    .min(3, 'Department name must be at least 3 characters')
    .max(255, 'Department name must be less than 255 characters')
    .trim(),

  departmentName: z.string()
    .max(255, 'Department type must be less than 255 characters')
    .trim(),

  regionId: z.number()
    .int('Region ID must be a whole number')
    .min(1, 'Region ID must be at least 1')
    .max(20, 'Region ID must be at most 20'),

  regionCode: z.string()
    .regex(/^R\d+$/, 'Region code must be in format R{number} (e.g., R6)')
    .max(10, 'Region code must be less than 10 characters'),

  isActive: z.boolean()
});

export const clientDepartmentUpdateSchema = z.object({
  name: z.string()
    .min(3, 'Department name must be at least 3 characters')
    .max(255, 'Department name must be less than 255 characters')
    .trim()
    .optional(),

  departmentName: z.string()
    .max(255, 'Department type must be less than 255 characters')
    .trim()
    .optional(),

  regionId: z.number()
    .int('Region ID must be a whole number')
    .min(1, 'Region ID must be at least 1')
    .max(20, 'Region ID must be at most 20')
    .optional(),

  regionCode: z.string()
    .regex(/^R\d+$/, 'Region code must be in format R{number} (e.g., R6)')
    .max(10, 'Region code must be less than 10 characters')
    .optional(),

  isActive: z.boolean().optional()
});

// Error types for better error handling
export interface DepartmentValidationError {
  field: string;
  message: string;
}

export interface DepartmentOperationResult {
  success: boolean;
  data?: any;
  errors?: DepartmentValidationError[];
  message?: string;
}

// Validation functions
export function validateDepartmentCreate(data: any): DepartmentOperationResult {
  try {
    const validatedData = clientDepartmentCreateSchema.parse(data);
    return {
      success: true,
      data: validatedData
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: DepartmentValidationError[] = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      return {
        success: false,
        errors,
        message: 'Please correct the validation errors'
      };
    }
    return {
      success: false,
      errors: [{ field: 'general', message: 'Validation failed' }],
      message: 'Unknown validation error'
    };
  }
}

export function validateDepartmentUpdate(data: any): DepartmentOperationResult {
  try {
    const validatedData = clientDepartmentUpdateSchema.parse(data);

    // Check if at least one field is provided
    const hasUpdates = Object.values(validatedData).some(value => value !== undefined);
    if (!hasUpdates) {
      return {
        success: false,
        errors: [{ field: 'general', message: 'At least one field must be provided for update' }],
        message: 'No updates provided'
      };
    }

    return {
      success: true,
      data: validatedData
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: DepartmentValidationError[] = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      return {
        success: false,
        errors,
        message: 'Please correct the validation errors'
      };
    }
    return {
      success: false,
      errors: [{ field: 'general', message: 'Validation failed' }],
      message: 'Unknown validation error'
    };
  }
}

// Business logic validation
export function validateBaCodeUniqueness(baCode: number, existingBaCodes: number[]): boolean {
  return !existingBaCodes.includes(baCode);
}

export function validateDepartmentName(name: string): DepartmentValidationError[] {
  const errors: DepartmentValidationError[] = [];

  // Check for Thai characters (optional)
  const hasThaiChars = /[\u0E00-\u0E7F]/.test(name);
  if (!hasThaiChars) {
    // This is just a warning, not a blocking error
    console.warn('Department name does not contain Thai characters');
  }

  // Check for special characters that might cause issues
  const hasSpecialChars = /[<>\"'&]/.test(name);
  if (hasSpecialChars) {
    errors.push({
      field: 'name',
      message: 'Department name contains invalid characters'
    });
  }

  // Check for SQL injection patterns
  const sqlPatterns = /(\bDROP\b|\bDELETE\b|\bINSERT\b|\bUPDATE\b|\bSELECT\b|\bUNION\b)/gi;
  if (sqlPatterns.test(name)) {
    errors.push({
      field: 'name',
      message: 'Department name contains prohibited keywords'
    });
  }

  return errors;
}

// Format BA code for display
export function formatBaCode(baCode: number): string {
  return baCode.toString().padStart(6, '0');
}

// Parse BA code from string input
export function parseBaCode(input: string): number | null {
  const cleaned = input.replace(/\D/g, ''); // Remove non-digits
  const number = parseInt(cleaned, 10);

  if (isNaN(number) || number < 1000 || number > 999999) {
    return null;
  }

  return number;
}

// Generate next available BA code
export function generateNextBaCode(existingBaCodes: number[], baseCode: number = 105900): number {
  let nextCode = baseCode + 1;
  while (existingBaCodes.includes(nextCode)) {
    nextCode++;
  }
  return nextCode;
}

// Department name suggestions based on existing patterns
export function suggestDepartmentNames(departmentType?: string): string[] {
  const baseName = 'กปภ.เขต 6';

  if (!departmentType) {
    return [
      `${baseName} - งานใหม่`,
      `${baseName} - หน่วยงานใหม่`,
      `${baseName} - ฝ่ายใหม่`
    ];
  }

  return [
    `${baseName} - ${departmentType}`,
    `กรุณาตรวจสอบชื่อแผนก - ${departmentType}`,
    `หน่วยงาน${departmentType}`
  ];
}

// Region validation helper
export function validateRegionCode(regionCode: string): boolean {
  const validRegions = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'R10'];
  return validRegions.includes(regionCode.toUpperCase());
}

export function getRegionIdFromCode(regionCode: string): number | null {
  const match = regionCode.match(/^R(\d+)$/i);
  return match ? parseInt(match[1], 10) : null;
}

export function getRegionCodeFromId(regionId: number): string {
  return `R${regionId}`;
}

// Error message formatting
export function formatValidationErrors(errors: DepartmentValidationError[]): string {
  return errors.map(err => err.message).join('; ');
}

export function groupValidationErrorsByField(errors: DepartmentValidationError[]): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};

  errors.forEach(error => {
    if (!grouped[error.field]) {
      grouped[error.field] = [];
    }
    grouped[error.field].push(error.message);
  });

  return grouped;
}