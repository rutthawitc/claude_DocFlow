import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/api-auth';
import { ApiResponseHandler } from '@/lib/middleware/api-responses';
import { DOCFLOW_PERMISSIONS } from '@/lib/auth/docflow-auth';
import { rateLimiters, addRateLimitHeaders } from '@/lib/rate-limit';
import { DocumentService } from '@/lib/services/document-service';
import { StreamingFileHandler } from '@/lib/services/file-service';
import { ActivityLogger } from '@/lib/services/activity-logger';
import { NotificationService } from '@/lib/services/notification-service';
import { BranchService } from '@/lib/services/branch-service';
import { validateBranchAccess } from '@/lib/middleware/api-auth';
import { DocumentUploadData, DocumentUploadError } from '@/lib/types';
import { documentUploadSchema } from '@/lib/validation/schemas';
import { 
  ValidationError,
  validateFormData, 
  handleValidationError 
} from '@/lib/validation/middleware';

/**
 * Specialized handler for document upload with rate limiting
 */
export async function handleDocumentUpload(request: NextRequest): Promise<NextResponse> {
  try {
    // Apply upload rate limiting first (before authentication)
    const uploadRateLimit = await rateLimiters.upload.checkLimit(request);
    if (!uploadRateLimit.success) {
      const response = ApiResponseHandler.rateLimited(
        'Upload rate limit exceeded. Please try again later.',
        uploadRateLimit.retryAfter
      );
      addRateLimitHeaders(response, uploadRateLimit);
      return response;
    }

    // Authenticate and authorize user
    const { user } = await withAuth(request, {
      requiredPermissions: [
        DOCFLOW_PERMISSIONS.DOCUMENTS_UPLOAD,
        DOCFLOW_PERMISSIONS.DOCUMENTS_CREATE
      ]
    });

    console.log('Documents API - Username:', user.sessionUserId);
    console.log('Documents API - Actual user DB ID:', user.databaseId);

    // Extract request metadata for logging
    const { ipAddress, userAgent } = ActivityLogger.extractRequestMetadata(request);
    console.log('Documents API - Starting file upload handling...');

    // Handle file upload
    let file, formData;
    try {
      const result = await StreamingFileHandler.handleFileUpload(request);
      file = result.file;
      formData = result.formData;
      console.log('Documents API - File upload handled successfully');
      console.log('Documents API - File name:', file.name, 'Size:', file.size);
    } catch (fileError) {
      console.error('Documents API - File upload error:', fileError);
      throw fileError;
    }

    // Validate form data with Zod schema
    console.log('Documents API - Validating form data...');
    let validatedData;
    try {
      validatedData = validateFormData(formData, documentUploadSchema);
      console.log('Documents API - Form data validated successfully');
    } catch (validationError) {
      console.error('Documents API - Validation error:', validationError);
      if (validationError instanceof ValidationError) {
        return handleValidationError(validationError);
      }
      throw validationError;
    }

    // Validate branch access
    const hasAccessToBranch = await validateBranchAccess(user.databaseId, validatedData.branchBaCode);
    if (!hasAccessToBranch) {
      return ApiResponseHandler.forbidden('Access denied to this branch');
    }

    const metadata: DocumentUploadData = {
      branchBaCode: validatedData.branchBaCode,
      mtNumber: validatedData.mtNumber,
      mtDate: validatedData.mtDate,
      subject: validatedData.subject,
      monthYear: validatedData.monthYear
    };

    // Create document
    console.log('Documents API - Creating document...');
    let document;
    try {
      document = await DocumentService.createDocument(file, metadata, user.databaseId);
      console.log('Documents API - Document created successfully:', document.id);
    } catch (createError) {
      console.error('Documents API - Document creation error:', createError);
      throw createError;
    }

    // Log document creation
    await ActivityLogger.logDocumentCreation(
      user.databaseId,
      document.id,
      validatedData.branchBaCode,
      {
        originalFilename: file.name,
        fileSize: file.size,
        mtNumber: validatedData.mtNumber,
        subject: validatedData.subject
      },
      ipAddress,
      userAgent
    );

    // Send Telegram notification for document upload
    try {
      const branch = await BranchService.getBranchByBaCode(validatedData.branchBaCode);
      const userFullName = `${user.user.firstName || ''} ${user.user.lastName || ''}`.trim() || user.user.username;
      
      await NotificationService.sendDocumentNotification({
        documentId: document.id,
        mtNumber: validatedData.mtNumber,
        subject: validatedData.subject,
        branchBaCode: validatedData.branchBaCode,
        branchName: branch?.name || `BA ${validatedData.branchBaCode}`,
        userName: user.user.username,
        userFullName: userFullName,
        action: 'uploaded',
        timestamp: new Date()
      });
    } catch (notificationError) {
      console.error('Failed to send upload notification:', notificationError);
      // Don't fail the upload if notification fails
    }

    const response = ApiResponseHandler.success(
      document,
      'Document uploaded successfully',
      201
    );
    addRateLimitHeaders(response, uploadRateLimit);
    return response;

  } catch (error) {
    console.error('Document upload error:', error);

    if (error instanceof ValidationError) {
      return handleValidationError(error);
    }

    if (error instanceof DocumentUploadError) {
      return ApiResponseHandler.fileUploadError(
        'File validation failed',
        error.validationErrors.map(e => e.message)
      );
    }

    return ApiResponseHandler.internalError();
  }
}