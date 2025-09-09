import { withAuthHandler } from '@/lib/middleware/api-auth';
import { ApiResponseHandler } from '@/lib/middleware/api-responses';
import { DOCFLOW_PERMISSIONS, DocFlowAuth } from '@/lib/auth/docflow-auth';
import { DocumentService } from '@/lib/services/document-service';
import { ActivityLogger } from '@/lib/services/activity-logger';
import { NotificationService } from '@/lib/services/notification-service';
import { z } from 'zod';

const bulkSendSchema = z.object({
  documentIds: z.array(z.number().int().positive())
    .min(1, 'At least one document ID is required')
    .max(50, 'Cannot send more than 50 documents at once')
});

export const POST = withAuthHandler(
  async (request, { user }) => {
    // Parse and validate request body manually
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (error) {
      return ApiResponseHandler.badRequest('Invalid JSON in request body');
    }

    // Validate with Zod schema
    const validation = bulkSendSchema.safeParse(requestBody);
    if (!validation.success) {
      return ApiResponseHandler.badRequest(
        'Validation failed: ' + validation.error.errors.map(e => e.message).join(', ')
      );
    }

    const { documentIds } = validation.data;

    try {
      console.log('Bulk send - Document IDs:', documentIds);
      console.log('Bulk send - User ID:', user.databaseId);

      // Get user roles for access control
      const { roles: userRoles } = await DocFlowAuth.getUserRolesAndPermissions(user.databaseId);

      // Track successful sends
      let sentCount = 0;
      const results = [];

      // Process each document
      for (const documentId of documentIds) {
        try {
          // Get document details first
          const document = await DocumentService.getDocumentById(documentId);
          if (!document) {
            console.warn(`Document ${documentId} not found, skipping`);
            continue;
          }

          // Check if document is in draft status
          if (document.status !== 'draft') {
            console.warn(`Document ${documentId} is not in draft status (${document.status}), skipping`);
            continue;
          }

          // Check if user can access this document
          const canAccess = await DocumentService.canUserAccessDocument(
            user.databaseId, 
            documentId, 
            userRoles
          );
          if (!canAccess) {
            console.warn(`User ${user.databaseId} cannot access document ${documentId}, skipping`);
            continue;
          }

          // Update document status to sent_to_branch
          const updatedDocument = await DocumentService.updateDocumentStatus(
            documentId,
            'sent_to_branch',
            user.databaseId,
            'Bulk send to branch'
          );

          if (updatedDocument) {
            sentCount++;
            results.push({
              documentId,
              mtNumber: document.mtNumber,
              success: true
            });

            // Log activity
            const { ipAddress, userAgent } = ActivityLogger.extractRequestMetadata(request);
            await ActivityLogger.logActivity({
              userId: user.databaseId,
              action: 'bulk_send_document',
              documentId,
              branchBaCode: document.branchBaCode,
              details: {
                originalFilename: document.originalFilename,
                mtNumber: document.mtNumber,
                subject: document.subject,
                sentVia: 'bulk_operation'
              },
              ipAddress,
              userAgent
            });

            // Send notification
            try {
              await NotificationService.sendDocumentNotification({
                type: 'document_sent',
                documentId,
                mtNumber: document.mtNumber,
                branchName: document.branch?.name || `BA ${document.branchBaCode}`,
                uploaderName: `${user.firstName || ''} ${user.lastName || ''}`.trim()
              });
            } catch (notificationError) {
              console.warn(`Failed to send notification for document ${documentId}:`, notificationError);
              // Don't fail the entire operation for notification errors
            }
          }
        } catch (docError) {
          console.error(`Error processing document ${documentId}:`, docError);
          results.push({
            documentId,
            success: false,
            error: docError instanceof Error ? docError.message : 'Unknown error'
          });
        }
      }

      // Log bulk operation
      const { ipAddress, userAgent } = ActivityLogger.extractRequestMetadata(request);
      await ActivityLogger.logActivity({
        userId: user.databaseId,
        action: 'bulk_send_operation',
        details: {
          requestedDocuments: documentIds.length,
          successfulSends: sentCount,
          results
        },
        ipAddress,
        userAgent
      });

      if (sentCount === 0) {
        return ApiResponseHandler.error('No documents were sent. Please check if documents exist and are in draft status.');
      }

      return ApiResponseHandler.success({
        sentCount,
        totalRequested: documentIds.length,
        results
      }, `Successfully sent ${sentCount} document${sentCount > 1 ? 's' : ''}`);

    } catch (error) {
      console.error('Bulk send error:', error);
      return ApiResponseHandler.internalError('Failed to process bulk send operation');
    }
  },
  {
    requiredPermissions: [
      DOCFLOW_PERMISSIONS.DOCUMENTS_UPLOAD,
      DOCFLOW_PERMISSIONS.DOCUMENTS_CREATE
    ]
  }
);