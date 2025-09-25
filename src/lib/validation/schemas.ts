import { z } from 'zod';
import { DocumentStatus } from '@/lib/types';

// Document validation schemas
export const documentUploadSchema = z.object({
  // File validation (handled separately by FileValidationService)
  file: z.any().optional(),
  
  // Document metadata
  branchBaCode: z.coerce.number()
    .int('Branch BA code must be an integer')
    .min(1000, 'Branch BA code must be at least 1000')
    .max(999999, 'Branch BA code must be at most 999999'),
  
  mtNumber: z.string()
    .min(1, 'MT number is required')
    .max(100, 'MT number must be less than 100 characters')
    .regex(/^[A-Za-z0-9\-._\s/]+$/, 'MT number contains invalid characters')
    .trim(),
  
  mtDate: z.string()
    .min(1, 'MT date is required')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'MT date must be in YYYY-MM-DD format'),
  
  subject: z.string()
    .min(1, 'Subject is required')
    .max(500, 'Subject must be less than 500 characters')
    .trim(),
  
  monthYear: z.string()
    .min(1, 'Month/Year is required')
    .max(50, 'Month/Year must be less than 50 characters')
    .regex(/^[\u0E00-\u0E7F\s\d]+$/, 'Month/Year must contain only Thai characters, numbers and spaces')
    .trim(),

  docReceivedDate: z.string()
    .optional()
    .refine((val) => !val || /^\d{4}-\d{2}-\d{2}$/.test(val), 'Document received date must be in YYYY-MM-DD format'),

  hasAdditionalDocs: z.boolean()
    .optional()
    .default(false),

  additionalDocsCount: z.coerce.number()
    .int('Additional docs count must be an integer')
    .min(0, 'Additional docs count must be at least 0')
    .max(10, 'Additional docs count must be at most 10')
    .optional()
    .default(0),

  additionalDocs: z.array(z.string().trim())
    .max(10, 'Cannot have more than 10 additional documents')
    .optional()
    .default([]),

  sendBackOriginalDocument: z.union([z.boolean(), z.string()])
    .transform((val) => {
      if (typeof val === 'string') {
        return val === 'true';
      }
      return Boolean(val);
    })
    .optional()
    .default(false),

  sendBackDate: z.string()
    .optional()
    .refine((val) => !val || /^\d{4}-\d{2}-\d{2}$/.test(val), 'Send back date must be in YYYY-MM-DD format'),

  deadlineDate: z.string()
    .optional()
    .refine((val) => !val || /^\d{4}-\d{2}-\d{2}$/.test(val), 'Deadline date must be in YYYY-MM-DD format'),

  action: z.enum(['save', 'send'])
    .optional()
    .default('save')
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
  message: 'All additional document descriptions must be provided',
  path: ['additionalDocs']
}).refine((data) => {
  // If sendBackOriginalDocument is true, validate dates
  if (data.sendBackOriginalDocument) {
    // Both dates should be provided
    if (!data.sendBackDate || !data.deadlineDate) {
      return false;
    }
    // Deadline date should be after send back date
    const sendBackDate = new Date(data.sendBackDate);
    const deadlineDate = new Date(data.deadlineDate);
    if (deadlineDate <= sendBackDate) {
      return false;
    }
  }
  return true;
}, {
  message: 'When sending original document back, both dates are required and deadline must be after send back date',
  path: ['deadlineDate']
});

export const documentUpdateSchema = z.object({
  mtNumber: z.string()
    .min(1, 'MT number is required')
    .max(100, 'MT number must be less than 100 characters')
    .regex(/^[A-Za-z0-9\-._\s/]+$/, 'MT number contains invalid characters')
    .trim()
    .optional(),
  
  mtDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'MT date must be in YYYY-MM-DD format')
    .optional(),
  
  subject: z.string()
    .min(1, 'Subject is required')
    .max(500, 'Subject must be less than 500 characters')
    .trim()
    .optional(),
  
  monthYear: z.string()
    .min(1, 'Month/Year is required')
    .max(50, 'Month/Year must be less than 50 characters')
    .regex(/^[\u0E00-\u0E7F\s\d]+$/, 'Month/Year must contain only Thai characters, numbers and spaces')
    .trim()
    .optional(),
  
  branchBaCode: z.coerce.number()
    .int('Branch BA code must be an integer')
    .min(1000, 'Branch BA code must be at least 1000')
    .max(999999, 'Branch BA code must be at most 999999')
    .optional(),

  docReceivedDate: z.string()
    .optional()
    .refine((val) => !val || /^\d{4}-\d{2}-\d{2}$/.test(val), 'Document received date must be in YYYY-MM-DD format'),

  hasAdditionalDocs: z.boolean()
    .optional(),

  additionalDocsCount: z.coerce.number()
    .int('Additional docs count must be an integer')
    .min(0, 'Additional docs count must be at least 0')
    .max(10, 'Additional docs count must be at most 10')
    .optional(),

  additionalDocs: z.array(z.string().trim())
    .max(10, 'Cannot have more than 10 additional documents')
    .optional(),

  sendBackOriginalDocument: z.boolean()
    .optional(),

  sendBackDate: z.string()
    .optional()
    .refine((val) => !val || /^\d{4}-\d{2}-\d{2}$/.test(val), 'Send back date must be in YYYY-MM-DD format'),

  deadlineDate: z.string()
    .optional()
    .refine((val) => !val || /^\d{4}-\d{2}-\d{2}$/.test(val), 'Deadline date must be in YYYY-MM-DD format')
}).refine(data => Object.values(data).some(value => value !== undefined), {
  message: 'At least one field must be provided for update'
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
  message: 'All additional document descriptions must be provided',
  path: ['additionalDocs']
}).refine((data) => {
  // If sendBackOriginalDocument is true, validate dates
  if (data.sendBackOriginalDocument) {
    // Both dates should be provided
    if (!data.sendBackDate || !data.deadlineDate) {
      return false;
    }
    // Deadline date should be after send back date
    const sendBackDate = new Date(data.sendBackDate);
    const deadlineDate = new Date(data.deadlineDate);
    if (deadlineDate <= sendBackDate) {
      return false;
    }
  }
  return true;
}, {
  message: 'When sending original document back, both dates are required and deadline must be after send back date',
  path: ['deadlineDate']
});

export const documentStatusUpdateSchema = z.object({
  status: z.enum([
    DocumentStatus.DRAFT,
    DocumentStatus.SENT_TO_BRANCH, 
    DocumentStatus.ACKNOWLEDGED,
    DocumentStatus.SENT_BACK_TO_DISTRICT,
    DocumentStatus.COMPLETE
  ], {
    errorMap: () => ({ message: 'Invalid document status' })
  }),
  
  comment: z.string()
    .max(1000, 'Comment must be less than 1000 characters')
    .trim()
    .optional()
});

// Comment validation schemas
export const commentCreateSchema = z.object({
  content: z.string()
    .min(1, 'Comment content is required')
    .max(2000, 'Comment must be less than 2000 characters')
    .trim()
});

export const commentUpdateSchema = z.object({
  content: z.string()
    .min(1, 'Comment content is required')
    .max(2000, 'Comment must be less than 2000 characters')
    .trim()
});

// Query parameter validation schemas
export const paginationSchema = z.object({
  page: z.coerce.number()
    .int('Page must be an integer')
    .min(1, 'Page must be at least 1')
    .default(1),
  
  limit: z.coerce.number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit must be at most 100')
    .default(20)
});

export const documentSearchSchema = paginationSchema.extend({
  search: z.string()
    .max(200, 'Search term must be less than 200 characters')
    .trim()
    .optional(),
  
  status: z.enum([
    'all',
    DocumentStatus.DRAFT,
    DocumentStatus.SENT_TO_BRANCH,
    DocumentStatus.ACKNOWLEDGED,
    DocumentStatus.SENT_BACK_TO_DISTRICT,
    DocumentStatus.COMPLETE
  ]).default('all'),
  
  dateFrom: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date from must be in YYYY-MM-DD format')
    .optional(),
  
  dateTo: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date to must be in YYYY-MM-DD format')
    .optional(),
  
  sortBy: z.enum(['uploadDate', 'mtDate', 'subject', 'status'])
    .default('uploadDate'),
  
  sortOrder: z.enum(['asc', 'desc'])
    .default('desc')
}).refine(data => {
  if (data.dateFrom && data.dateTo) {
    return new Date(data.dateFrom) <= new Date(data.dateTo);
  }
  return true;
}, {
  message: 'Date from must be before or equal to date to',
  path: ['dateFrom']
});

// Branch validation schemas
export const branchQuerySchema = z.object({
  includeCounts: z.coerce.boolean().default(false),
  includeInactive: z.coerce.boolean().default(false)
});

// Path parameter validation schemas
export const documentIdSchema = z.object({
  id: z.coerce.number()
    .int('Document ID must be an integer')
    .min(1, 'Document ID must be positive')
});

export const commentIdSchema = z.object({
  commentId: z.coerce.number()
    .int('Comment ID must be an integer')
    .min(1, 'Comment ID must be positive')
});

export const branchBaCodeSchema = z.object({
  branchBaCode: z.coerce.number()
    .int('Branch BA code must be an integer')
    .min(1000, 'Branch BA code must be at least 1000')
    .max(999999, 'Branch BA code must be at most 999999')
});

// Security validation schemas
export const sanitizedStringSchema = z.string()
  .transform(val => val.replace(/<[^>]*>/g, '')) // Remove HTML tags
  .transform(val => val.replace(/[<>'"]/g, '')) // Remove dangerous characters
  .transform(val => val.trim());

export const safeHtmlSchema = z.string()
  .refine(val => !/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(val), {
    message: 'Script tags are not allowed'
  })
  .refine(val => !/javascript:/gi.test(val), {
    message: 'JavaScript URLs are not allowed'
  })
  .refine(val => !/on\w+\s*=/gi.test(val), {
    message: 'Event handlers are not allowed'
  });

// Department management validation schemas
export const departmentCreateSchema = z.object({
  baCode: z.coerce.number()
    .int('BA code must be an integer')
    .min(1000, 'BA code must be at least 1000')
    .max(999999, 'BA code must be at most 999999'),

  branchCode: z.coerce.number()
    .int('Branch code must be an integer')
    .min(1000, 'Branch code must be at least 1000')
    .max(999999, 'Branch code must be at most 999999')
    .optional(),

  name: z.string()
    .min(3, 'Department name must be at least 3 characters')
    .max(255, 'Department name must be less than 255 characters')
    .trim(),

  departmentName: z.string()
    .max(255, 'Department type name must be less than 255 characters')
    .trim()
    .optional()
    .nullable(),

  regionId: z.coerce.number()
    .int('Region ID must be an integer')
    .min(1, 'Region ID must be at least 1')
    .max(20, 'Region ID must be at most 20'),

  regionCode: z.string()
    .regex(/^R\d+$/, 'Region code must be in format R{number}')
    .max(10, 'Region code must be less than 10 characters'),

  isActive: z.boolean()
    .optional()
    .default(true)
});

export const departmentUpdateSchema = z.object({
  name: z.string()
    .min(3, 'Department name must be at least 3 characters')
    .max(255, 'Department name must be less than 255 characters')
    .trim()
    .optional(),

  departmentName: z.string()
    .max(255, 'Department type name must be less than 255 characters')
    .trim()
    .optional()
    .nullable(),

  regionId: z.coerce.number()
    .int('Region ID must be an integer')
    .min(1, 'Region ID must be at least 1')
    .max(20, 'Region ID must be at most 20')
    .optional(),

  regionCode: z.string()
    .regex(/^R\d+$/, 'Region code must be in format R{number}')
    .max(10, 'Region code must be less than 10 characters')
    .optional(),

  isActive: z.boolean().optional()
}).refine(data => Object.values(data).some(value => value !== undefined), {
  message: 'At least one field must be provided for update'
});

export const departmentSearchSchema = z.object({
  search: z.string()
    .max(100, 'Search term must be less than 100 characters')
    .optional(),

  region: z.string()
    .regex(/^R\d+$/, 'Region code must be in format R{number}')
    .optional(),

  isActive: z.coerce.boolean().optional(),

  departmentName: z.string()
    .max(100, 'Department name filter must be less than 100 characters')
    .optional(),

  limit: z.coerce.number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit must be at most 100')
    .optional()
    .default(50),

  offset: z.coerce.number()
    .int('Offset must be an integer')
    .min(0, 'Offset must be non-negative')
    .optional()
    .default(0)
});

// File metadata validation
export const fileMetadataSchema = z.object({
  originalFilename: z.string()
    .min(1, 'Filename is required')
    .max(255, 'Filename must be less than 255 characters')
    .regex(/^[^<>:"/\\|?*]+$/, 'Filename contains invalid characters'),
  
  fileSize: z.number()
    .int('File size must be an integer')
    .min(1, 'File size must be positive')
    .max(10 * 1024 * 1024, 'File size must be less than 10MB'),
  
  mimeType: z.literal('application/pdf', {
    errorMap: () => ({ message: 'Only PDF files are allowed' })
  })
});

// Type exports for TypeScript
export type DocumentUploadInput = z.infer<typeof documentUploadSchema>;
export type DocumentUpdateInput = z.infer<typeof documentUpdateSchema>;
export type DocumentStatusUpdateInput = z.infer<typeof documentStatusUpdateSchema>;
export type CommentCreateInput = z.infer<typeof commentCreateSchema>;
export type CommentUpdateInput = z.infer<typeof commentUpdateSchema>;
export type DocumentSearchQuery = z.infer<typeof documentSearchSchema>;
export type PaginationQuery = z.infer<typeof paginationSchema>;
export type BranchQuery = z.infer<typeof branchQuerySchema>;