'use client';

import { z } from 'zod';

// Client-side validation schemas (without server-only features)
export const clientDocumentUploadSchema = z.object({
  branchBaCode: z.coerce.number()
    .int('กรุณาเลือกสาขา')
    .min(1000, 'รหัสสาขาไม่ถูกต้อง')
    .max(9999, 'รหัสสาขาไม่ถูกต้อง'),
  
  mtNumber: z.string()
    .min(1, 'กรุณาระบุเลขที่ มท.')
    .max(100, 'เลขที่ มท. ต้องมีความยาวไม่เกิน 100 ตัวอักษร')
    .regex(/^[A-Za-z0-9\-._\s/]+$/, 'เลขที่ มท. มีตัวอักษรที่ไม่ถูกต้อง')
    .trim(),
  
  mtDate: z.string()
    .min(1, 'กรุณาเลือกวันที่ลงเลขที่ มท.')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'รูปแบบวันที่ไม่ถูกต้อง'),
  
  subject: z.string()
    .min(1, 'กรุณาระบุเรื่อง')
    .max(500, 'เรื่องต้องมีความยาวไม่เกิน 500 ตัวอักษร')
    .trim(),
  
  monthYear: z.string()
    .min(1, 'กรุณาระบุประจำเดือน/ปี')
    .max(50, 'ประจำเดือน/ปีต้องมีความยาวไม่เกิน 50 ตัวอักษร')
    .regex(/^[\u0E00-\u0E7F\s\d]+$/, 'ประจำเดือน/ปีต้องเป็นภาษาไทย ตัวเลข และช่องว่างเท่านั้น')
    .trim(),

  docReceivedDate: z.string()
    .optional()
    .refine((val) => !val || /^\d{4}-\d{2}-\d{2}$/.test(val), 'รูปแบบวันที่ไม่ถูกต้อง'),

  hasAdditionalDocs: z.boolean()
    .optional()
    .default(false),

  additionalDocsCount: z.coerce.number()
    .int('จำนวนเอกสารเพิ่มเติมต้องเป็นตัวเลขจำนวนเต็ม')
    .min(0, 'จำนวนเอกสารเพิ่มเติมต้องไม่น้อยกว่า 0')
    .max(10, 'จำนวนเอกสารเพิ่มเติมต้องไม่เกิน 10')
    .optional()
    .default(0),

  additionalDocs: z.array(z.string().trim())
    .max(10, 'ไม่สามารถมีเอกสารเพิ่มเติมมากกว่า 10 รายการ')
    .optional()
    .default([])
}).refine((data) => {
  // If hasAdditionalDocs is true, require enough non-empty additional document descriptions
  if (data.hasAdditionalDocs) {
    const nonEmptyDocs = data.additionalDocs?.filter(doc => doc && doc.trim() !== '') || [];
    const requiredCount = data.additionalDocsCount || 1;
    if (nonEmptyDocs.length < requiredCount) {
      return false;
    }
  }
  return true;
}, {
  message: 'กรุณาระบุรายละเอียดเอกสารที่ต้องส่งเพิ่มเติมให้ครบทุกรายการ',
  path: ['additionalDocs']
});

export const clientCommentCreateSchema = z.object({
  content: z.string()
    .min(1, 'กรุณาระบุเนื้อหาความคิดเห็น')
    .max(2000, 'ความคิดเห็นต้องมีความยาวไม่เกิน 2000 ตัวอักษร')
    .trim()
});

export const clientDocumentStatusUpdateSchema = z.object({
  status: z.enum([
    'draft',
    'sent_to_branch', 
    'acknowledged',
    'sent_back_to_district'
  ], {
    errorMap: () => ({ message: 'สถานะเอกสารไม่ถูกต้อง' })
  }),
  
  comment: z.string()
    .max(1000, 'ความคิดเห็นต้องมีความยาวไม่เกิน 1000 ตัวอักษร')
    .trim()
    .optional()
});

// File validation helpers
export const validatePDFFile = (file: File): { isValid: boolean; error?: string } => {
  // Check file size (10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `ขนาดไฟล์เกิน ${maxSize / (1024 * 1024)} MB`
    };
  }

  // Check file type
  if (file.type !== 'application/pdf') {
    return {
      isValid: false,
      error: 'กรุณาเลือกไฟล์ PDF เท่านั้น'
    };
  }

  // Check file extension
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return {
      isValid: false,
      error: 'กรุณาเลือกไฟล์ที่มีนามสกุล .pdf'
    };
  }

  return { isValid: true };
};

// Form validation result type
export interface ValidationResult<T = any> {
  success: boolean;
  data?: T;
  errors?: Record<string, string[]>;
  message?: string;
}

// Generic form validation helper
export function validateForm<T>(
  data: any, 
  schema: z.ZodSchema<T>
): ValidationResult<T> {
  try {
    const validData = schema.parse(data);
    return {
      success: true,
      data: validData
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string[]> = {};
      
      error.errors.forEach(err => {
        const field = err.path.join('.');
        if (!errors[field]) {
          errors[field] = [];
        }
        errors[field].push(err.message);
      });

      return {
        success: false,
        errors,
        message: 'กรุณาตรวจสอบข้อมูลที่กรอก'
      };
    }
    
    return {
      success: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูล'
    };
  }
}

// Field validation helper (for real-time validation)
export function validateField<T>(
  value: any,
  schema: z.ZodSchema<T>,
  fieldName: string
): { isValid: boolean; error?: string } {
  try {
    schema.parse(value);
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fieldError = error.errors.find(err => 
        err.path.length === 0 || err.path.includes(fieldName)
      );
      return {
        isValid: false,
        error: fieldError?.message || 'ข้อมูลไม่ถูกต้อง'
      };
    }
    return {
      isValid: false,
      error: 'ข้อมูลไม่ถูกต้อง'
    };
  }
}

// Input sanitization helpers
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>'"]/g, '') // Remove dangerous characters
    .trim();
};

export const sanitizeFormData = (data: Record<string, any>): Record<string, any> => {
  const sanitized = { ...data };
  
  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    }
  }
  
  return sanitized;
};

// Type exports
export type ClientDocumentUploadInput = z.infer<typeof clientDocumentUploadSchema>;
export type ClientCommentCreateInput = z.infer<typeof clientCommentCreateSchema>;
export type ClientDocumentStatusUpdateInput = z.infer<typeof clientDocumentStatusUpdateSchema>;