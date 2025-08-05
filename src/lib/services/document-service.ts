import { eq, and, desc, gte, lte, count, ilike, or } from 'drizzle-orm';
import { getDb } from '@/db';
import { documents, branches, users, comments, documentStatusHistory, activityLogs } from '@/db/schema';
import { 
  Document, 
  DocumentWithRelations, 
  DocumentUploadData, 
  DocumentFilters, 
  DocumentStatus,
  PaginatedResponse,
  AccessDeniedError,
  DatabaseError
} from '@/lib/types';
import { FileValidationService, FileStorageService } from './file-service';
import { BranchService } from './branch-service';
import { CacheService } from '@/lib/cache/cache-service';

export class DocumentService {
  private static cache = CacheService.getInstance();
  /**
   * Create a new document
   */
  static async createDocument(
    file: File,
    metadata: DocumentUploadData,
    uploaderId: number
  ): Promise<Document> {
    const db = await getDb();

    try {
      // Validate file
      const validation = await FileValidationService.validateFile(file);
      if (!validation.isValid) {
        throw new Error(`File validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      // Verify branch exists
      const branch = await BranchService.getBranchByBaCode(metadata.branchBaCode);
      if (!branch) {
        throw new Error(`Branch with BA code ${metadata.branchBaCode} not found`);
      }

      // Create document record first to get ID
      const documentData = {
        filePath: '', // Will be updated after file storage
        originalFilename: file.name,
        fileSize: file.size,
        branchBaCode: metadata.branchBaCode,
        uploadDate: metadata.mtDate, // Keep as string for date fields
        mtNumber: metadata.mtNumber,
        mtDate: metadata.mtDate, // Keep as string for date fields
        subject: metadata.subject,
        monthYear: metadata.monthYear,
        status: DocumentStatus.DRAFT,
        uploaderId: uploaderId
      };

      const [newDocument] = await db.insert(documents).values(documentData).returning();

      // Store file with document ID
      const { filePath } = await FileStorageService.storeFile(file, newDocument.id);

      // Update document with file path
      const [updatedDocument] = await db
        .update(documents)
        .set({ filePath })
        .where(eq(documents.id, newDocument.id))
        .returning();

      // Invalidate cache for documents in this branch
      await this.cache.invalidateByTag(`branch:${metadata.branchBaCode}`);

      return updatedDocument;
    } catch (error) {
      console.error('Error creating document:', error);
      throw new DatabaseError('create_document', error as Error);
    }
  }

  /**
   * Get document by ID with relations
   */
  static async getDocumentById(id: number): Promise<DocumentWithRelations | null> {
    // Try to get from cache first
    const cacheKey = `document:${id}`;
    const cached = await this.cache.get<DocumentWithRelations>(cacheKey, 'documents');

    if (cached) {
      console.log(`🎯 Cache HIT for document: ${id}`);
      return cached;
    }

    console.log(`❌ Cache MISS for document: ${id}`);
    const db = await getDb();

    try {
      const result = await db
        .select({
          document: documents,
          branch: branches,
          uploader: {
            id: users.id,
            username: users.username,
            firstName: users.firstName,
            lastName: users.lastName
          }
        })
        .from(documents)
        .leftJoin(branches, eq(documents.branchBaCode, branches.baCode))
        .leftJoin(users, eq(documents.uploaderId, users.id))
        .where(eq(documents.id, id))
        .limit(1);

      if (result.length === 0) return null;

      const { document, branch, uploader } = result[0];

      // Get comments
      const documentComments = await db
        .select({
          comment: {
            id: comments.id,
            documentId: comments.documentId,
            userId: comments.userId,
            content: comments.content,
            createdAt: comments.createdAt
          },
          user: {
            id: users.id,
            username: users.username,
            firstName: users.firstName,
            lastName: users.lastName
          }
        })
        .from(comments)
        .leftJoin(users, eq(comments.userId, users.id))
        .where(eq(comments.documentId, id))
        .orderBy(desc(comments.createdAt));

      // Get status history
      const statusHistory = await db
        .select({
          history: documentStatusHistory,
          user: {
            id: users.id,
            username: users.username,
            firstName: users.firstName,
            lastName: users.lastName
          }
        })
        .from(documentStatusHistory)
        .leftJoin(users, eq(documentStatusHistory.changedBy, users.id))
        .where(eq(documentStatusHistory.documentId, id))
        .orderBy(desc(documentStatusHistory.createdAt));

      const documentWithRelations = {
        ...document,
        branch: branch || undefined,
        uploader: uploader || undefined,
        comments: documentComments.map(({ comment, user }) => ({
          ...comment,
          createdAt: comment.createdAt ? 
            (() => {
              try {
                return new Date(comment.createdAt).toISOString();
              } catch (error) {
                console.error('Error formatting existing comment createdAt:', error);
                return new Date().toISOString();
              }
            })() : 
            new Date().toISOString(), // fallback for missing dates
          user: user || undefined
        })) as any,
        statusHistory: statusHistory.map(({ history, user }) => ({
          ...history,
          changedByUser: user || undefined
        }))
      };

      // Cache the document for 10 minutes with appropriate tags
      await this.cache.set(
        cacheKey,
        documentWithRelations,
        {
          ttl: 600, // 10 minutes
          tags: ['documents', `document:${id}`, `branch:${document.branchBaCode}`],
        },
        'documents'
      );

      return documentWithRelations;
    } catch (error) {
      console.error('Error getting document:', error);
      throw new DatabaseError('get_document', error as Error);
    }
  }

  /**
   * Get documents by branch with pagination and filtering
   */
  static async getDocumentsByBranch(
    branchBaCode: number,
    filters: DocumentFilters
  ): Promise<PaginatedResponse<DocumentWithRelations>> {
    // Generate cache key based on branch and filters
    const cacheKey = `branch_docs:${branchBaCode}:${filters.status || 'all'}:${filters.page}:${filters.limit}`;

    // Try to get from cache first
    const cached = await this.cache.get<PaginatedResponse<DocumentWithRelations>>(
      `${cacheKey}_${JSON.stringify({ dateFrom: filters.dateFrom, dateTo: filters.dateTo, search: filters.search })}`,
      'documents'
    );

    if (cached) {
      console.log(`🎯 Cache HIT for documents: ${cacheKey}`);
      return cached;
    }

    console.log(`❌ Cache MISS for documents: ${cacheKey}`);
    const db = await getDb();

    try {
      const conditions = [eq(documents.branchBaCode, branchBaCode)];

      // Add status filter
      if (filters.status && filters.status !== 'all') {
        conditions.push(eq(documents.status, filters.status));
      }

      // Add date range filters
      if (filters.dateFrom) {
        conditions.push(gte(documents.uploadDate, filters.dateFrom));
      }
      if (filters.dateTo) {
        conditions.push(lte(documents.uploadDate, filters.dateTo));
      }

      // Add search filter
      let searchCondition;
      if (filters.search) {
        searchCondition = or(
          ilike(documents.subject, `%${filters.search}%`),
          ilike(documents.mtNumber, `%${filters.search}%`)
        );
      }

      const whereClause = searchCondition 
        ? and(...conditions, searchCondition)
        : and(...conditions);

      // Get total count
      const [{ count: totalCount }] = await db
        .select({ count: count() })
        .from(documents)
        .where(whereClause);

      // Get paginated results
      const offset = (filters.page - 1) * filters.limit;
      const result = await db
        .select({
          document: documents,
          branch: branches,
          uploader: {
            id: users.id,
            username: users.username,
            firstName: users.firstName,
            lastName: users.lastName
          }
        })
        .from(documents)
        .leftJoin(branches, eq(documents.branchBaCode, branches.baCode))
        .leftJoin(users, eq(documents.uploaderId, users.id))
        .where(whereClause)
        .orderBy(desc(documents.uploadDate))
        .limit(filters.limit)
        .offset(offset);

      const documentsWithRelations = result.map(({ document, branch, uploader }) => ({
        ...document,
        branch: branch || undefined,
        uploader: uploader || undefined
      }));

      const response = {
        data: documentsWithRelations,
        total: totalCount,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(totalCount / filters.limit)
      };

      // Cache the result for 5 minutes with appropriate tags
      await this.cache.set(
        `${cacheKey}_${JSON.stringify({ dateFrom: filters.dateFrom, dateTo: filters.dateTo, search: filters.search })}`,
        response,
        {
          ttl: 300, // 5 minutes
          tags: ['documents', `branch:${branchBaCode}`],
        },
        'documents'
      );

      return response;
    } catch (error) {
      console.error('Error getting documents by branch:', error);
      throw new DatabaseError('get_documents_by_branch', error as Error);
    }
  }

  /**
   * Update document status
   */
  static async updateDocumentStatus(
    documentId: number,
    newStatus: DocumentStatus,
    userId: number,
    comment?: string
  ): Promise<Document> {
    const db = await getDb();

    try {
      // Get current document
      const currentDoc = await this.getDocumentById(documentId);
      if (!currentDoc) {
        throw new Error('Document not found');
      }

      // Update document status
      const [updatedDocument] = await db
        .update(documents)
        .set({ 
          status: newStatus,
          updatedAt: new Date()
        })
        .where(eq(documents.id, documentId))
        .returning();

      // Record status history
      await db.insert(documentStatusHistory).values({
        documentId,
        fromStatus: currentDoc.status,
        toStatus: newStatus,
        changedBy: userId,
        comment: comment || null
      });

      // Invalidate cache for this specific document and related data
      await this.cache.delete(`document:${documentId}`, 'documents');
      await this.cache.invalidateByTag('documents');
      console.log(`🗑️ Invalidated cache for document ${documentId} after status update`);

      return updatedDocument;
    } catch (error) {
      console.error('Error updating document status:', error);
      throw new DatabaseError('update_document_status', error as Error);
    }
  }

  /**
   * Add comment to document
   */
  static async addComment(documentId: number, userId: number, content: string): Promise<any> {
    const db = await getDb();

    try {
      const [newComment] = await db
        .insert(comments)
        .values({
          documentId,
          userId,
          content
          // Let database handle createdAt with defaultNow()
        })
        .returning();

      // Get comment with user info
      const result = await db
        .select({
          comment: {
            id: comments.id,
            documentId: comments.documentId,
            userId: comments.userId,
            content: comments.content,
            createdAt: comments.createdAt
          },
          user: {
            id: users.id,
            username: users.username,
            firstName: users.firstName,
            lastName: users.lastName
          }
        })
        .from(comments)
        .leftJoin(users, eq(comments.userId, users.id))
        .where(eq(comments.id, newComment.id))
        .limit(1);

      // Ensure createdAt is properly formatted as ISO string
      const commentResult = result[0];
      
      if (commentResult && commentResult.comment) {
        // Handle potential null/undefined createdAt
        if (commentResult.comment.createdAt) {
          try {
            commentResult.comment.createdAt = new Date(commentResult.comment.createdAt).toISOString();
          } catch (error) {
            console.error('Error formatting comment createdAt:', error);
            commentResult.comment.createdAt = new Date().toISOString(); // fallback to current time
          }
        } else {
          console.warn('Comment created without createdAt, using current time');
          commentResult.comment.createdAt = new Date().toISOString();
        }
      }

      return commentResult;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw new DatabaseError('add_comment', error as Error);
    }
  }

  /**
   * Delete document
   */
  static async deleteDocument(documentId: number): Promise<boolean> {
    const db = await getDb();

    try {
      // Get document to get file path
      const document = await this.getDocumentById(documentId);
      if (!document) {
        return false;
      }

      // Delete related records first to avoid foreign key constraints
      // Delete activity logs
      await db
        .delete(activityLogs)
        .where(eq(activityLogs.documentId, documentId));

      // Delete comments (should cascade from document deletion, but just in case)
      await db
        .delete(comments)
        .where(eq(comments.documentId, documentId));

      // Delete document status history (should cascade from document deletion, but just in case)
      await db
        .delete(documentStatusHistory)
        .where(eq(documentStatusHistory.documentId, documentId));

      // Finally delete the document
      const result = await db
        .delete(documents)
        .where(eq(documents.id, documentId))
        .returning();

      // Delete file from storage
      if (document.filePath) {
        await FileStorageService.deleteFile(document.filePath);
      }

      // Invalidate all related cache entries
      await this.cache.delete(`document:${documentId}`, 'documents');
      await this.cache.invalidateByTag('documents');
      await this.cache.invalidateByTag(`branch:${document.branchBaCode}`);
      
      // Also invalidate the API cache specifically for branch endpoint
      const apiCache = CacheService.getInstance();
      await apiCache.invalidateByTag('documents', 'api');
      console.log(`🗑️ Invalidated all caches for deleted document ${documentId} in branch ${document.branchBaCode}`);

      return result.length > 0;
    } catch (error) {
      console.error('Error deleting document:', error);
      throw new DatabaseError('delete_document', error as Error);
    }
  }

  /**
   * Check if user can access document
   */
  static async canUserAccessDocument(userId: number, documentId: number, userRoles: string[]): Promise<boolean> {
    try {
      const document = await this.getDocumentById(documentId);
      if (!document) return false;

      // Admin can access all documents
      if (userRoles.includes('admin')) {
        return true;
      }

      // Uploader can access their own documents
      if (document.uploaderId === userId) {
        return true;
      }

      // District manager can access all documents in R6 region
      if (userRoles.includes('district_manager')) {
        return true;
      }

      // Branch manager can access all documents in R6 region  
      if (userRoles.includes('branch_manager')) {
        return true;
      }

      // Branch user can access documents for their branch
      if (userRoles.includes('branch_user')) {
        return true;
      }

      // Regular users with uploader role can access all documents (for viewing)
      if (userRoles.includes('uploader') || userRoles.includes('user')) {
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking document access:', error);
      return false;
    }
  }

  /**
   * Get user's accessible branches based on roles
   */
  static async getUserAccessibleBranches(userId: number, userRoles: string[]): Promise<number[]> {
    try {
      // Admin can access all branches
      if (userRoles.includes('admin')) {
        const allBranches = await BranchService.getAllBranches();
        return allBranches.map(branch => branch.baCode);
      }

      // District manager can access all R6 branches (same as admin for R6 region)
      if (userRoles.includes('district_manager')) {
        const allBranches = await BranchService.getAllBranches();
        return allBranches
          .filter(branch => branch.regionCode === 'R6')
          .map(branch => branch.baCode);
      }

      // Branch manager can access all R6 branches
      if (userRoles.includes('branch_manager')) {
        const allBranches = await BranchService.getAllBranches();
        return allBranches
          .filter(branch => branch.regionCode === 'R6')
          .map(branch => branch.baCode);
      }

      // For branch users and uploaders, get user's assigned branches from PWA data
      if (userRoles.includes('branch_user') || userRoles.includes('uploader') || userRoles.includes('user')) {
        // Get user's PWA data to determine branch assignments
        const { getDb } = await import('@/db');
        const { users } = await import('@/db/schema');
        const { eq } = await import('drizzle-orm');
        
        const db = await getDb();
        const user = await db.query.users.findFirst({
          where: eq(users.id, userId)
        });
        
        if (user?.ba) {
          // User has a specific BA assignment, return that branch
          return [parseInt(user.ba, 10)];
        }
        
        // If no specific branch assignment, return empty array
        return [];
      }

      return [];
    } catch (error) {
      console.error('Error getting user accessible branches:', error);
      return [];
    }
  }

  /**
   * Get document file for download
   */
  static async getDocumentFile(documentId: number): Promise<{ buffer: Buffer; filename: string }> {
    try {
      const document = await this.getDocumentById(documentId);
      if (!document) {
        throw new Error('Document not found');
      }

      const buffer = await FileStorageService.retrieveFile(document.filePath);
      
      return {
        buffer,
        filename: document.originalFilename
      };
    } catch (error) {
      console.error('Error getting document file:', error);
      throw new DatabaseError('get_document_file', error as Error);
    }
  }

  /**
   * Search documents across all accessible branches
   */
  static async searchDocuments(
    searchTerm: string,
    accessibleBranches: number[],
    filters: Omit<DocumentFilters, 'search'>
  ): Promise<PaginatedResponse<DocumentWithRelations>> {
    const db = await getDb();

    try {
      if (accessibleBranches.length === 0) {
        return {
          data: [],
          total: 0,
          page: filters.page,
          limit: filters.limit,
          totalPages: 0
        };
      }

      const conditions = [
        or(...accessibleBranches.map(baCode => eq(documents.branchBaCode, baCode)))
      ];

      // Add status filter
      if (filters.status && filters.status !== 'all') {
        conditions.push(eq(documents.status, filters.status));
      }

      // Add date range filters
      if (filters.dateFrom) {
        conditions.push(gte(documents.uploadDate, filters.dateFrom));
      }
      if (filters.dateTo) {
        conditions.push(lte(documents.uploadDate, filters.dateTo));
      }

      // Add search condition
      const searchCondition = or(
        ilike(documents.subject, `%${searchTerm}%`),
        ilike(documents.mtNumber, `%${searchTerm}%`)
      );

      const whereClause = and(...conditions, searchCondition);

      // Get total count
      const [{ count: totalCount }] = await db
        .select({ count: count() })
        .from(documents)
        .where(whereClause);

      // Get paginated results
      const offset = (filters.page - 1) * filters.limit;
      const result = await db
        .select({
          document: documents,
          branch: branches,
          uploader: {
            id: users.id,
            username: users.username,
            firstName: users.firstName,
            lastName: users.lastName
          }
        })
        .from(documents)
        .leftJoin(branches, eq(documents.branchBaCode, branches.baCode))
        .leftJoin(users, eq(documents.uploaderId, users.id))
        .where(whereClause)
        .orderBy(desc(documents.uploadDate))
        .limit(filters.limit)
        .offset(offset);

      const documentsWithRelations = result.map(({ document, branch, uploader }) => ({
        ...document,
        branch: branch || undefined,
        uploader: uploader || undefined
      }));

      return {
        data: documentsWithRelations,
        total: totalCount,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(totalCount / filters.limit)
      };
    } catch (error) {
      console.error('Error searching documents:', error);
      throw new DatabaseError('search_documents', error as Error);
    }
  }

  /**
   * Update document metadata only
   */
  static async updateDocumentMetadata(
    documentId: number,
    metadata: DocumentUploadData
  ): Promise<Document> {
    const db = await getDb();

    try {
      // Verify branch exists
      const branch = await BranchService.getBranchByBaCode(metadata.branchBaCode);
      if (!branch) {
        throw new Error(`Branch with BA code ${metadata.branchBaCode} not found`);
      }

      // Update document metadata
      const [updatedDocument] = await db
        .update(documents)
        .set({
          branchBaCode: metadata.branchBaCode,
          mtNumber: metadata.mtNumber,
          mtDate: metadata.mtDate,
          subject: metadata.subject,
          monthYear: metadata.monthYear,
          updatedAt: new Date()
        })
        .where(eq(documents.id, documentId))
        .returning();

      if (!updatedDocument) {
        throw new Error('Failed to update document');
      }

      return updatedDocument;
    } catch (error) {
      console.error('Error updating document metadata:', error);
      throw new DatabaseError('update_document_metadata', error as Error);
    }
  }

  /**
   * Update document with new file and metadata
   */
  static async updateDocument(
    documentId: number,
    file: File,
    metadata: DocumentUploadData,
    userId: number
  ): Promise<Document> {
    const db = await getDb();

    try {
      // Validate file
      const validation = await FileValidationService.validateFile(file);
      if (!validation.isValid) {
        throw new Error(`File validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      // Verify branch exists
      const branch = await BranchService.getBranchByBaCode(metadata.branchBaCode);
      if (!branch) {
        throw new Error(`Branch with BA code ${metadata.branchBaCode} not found`);
      }

      // Get existing document to clean up old file
      const existingDocument = await this.getDocumentById(documentId);
      if (!existingDocument) {
        throw new Error('Document not found');
      }

      // Store new file
      const filePath = await FileStorageService.storeFile(file, documentId);

      // Update document record
      const [updatedDocument] = await db
        .update(documents)
        .set({
          filePath,
          originalFilename: file.name,
          fileSize: file.size,
          branchBaCode: metadata.branchBaCode,
          mtNumber: metadata.mtNumber,
          mtDate: metadata.mtDate,
          subject: metadata.subject,
          monthYear: metadata.monthYear,
          updatedAt: new Date()
        })
        .where(eq(documents.id, documentId))
        .returning();

      if (!updatedDocument) {
        throw new Error('Failed to update document');
      }

      // Clean up old file
      if (existingDocument.filePath && existingDocument.filePath !== filePath) {
        try {
          await FileStorageService.deleteFile(existingDocument.filePath);
        } catch (deleteError) {
          console.warn('Failed to delete old file:', deleteError);
          // Don't fail the update if old file deletion fails
        }
      }

      return updatedDocument;
    } catch (error) {
      console.error('Error updating document with file:', error);
      throw new DatabaseError('update_document', error as Error);
    }
  }

  /**
   * Get user's own documents (for drafts and personal documents)
   */
  static async getUserOwnDocuments(
    userId: number,
    filters: DocumentFilters & { search?: string }
  ): Promise<PaginatedResponse<DocumentWithRelations>> {
    const db = await getDb();

    try {
      const conditions = [eq(documents.uploaderId, userId)];

      // Add status filter
      if (filters.status && filters.status !== 'all') {
        conditions.push(eq(documents.status, filters.status));
      }

      // Add date range filters
      if (filters.dateFrom) {
        conditions.push(gte(documents.uploadDate, filters.dateFrom));
      }
      if (filters.dateTo) {
        conditions.push(lte(documents.uploadDate, filters.dateTo));
      }

      // Add search condition
      if (filters.search) {
        const searchCondition = or(
          ilike(documents.subject, `%${filters.search}%`),
          ilike(documents.mtNumber, `%${filters.search}%`)
        );
        conditions.push(searchCondition);
      }

      const whereClause = and(...conditions);

      // Get total count
      const [{ count: totalCount }] = await db
        .select({ count: count() })
        .from(documents)
        .where(whereClause);

      // Get paginated results
      const offset = (filters.page - 1) * filters.limit;
      const result = await db
        .select({
          document: documents,
          branch: branches,
          uploader: {
            id: users.id,
            username: users.username,
            firstName: users.firstName,
            lastName: users.lastName
          }
        })
        .from(documents)
        .leftJoin(branches, eq(documents.branchBaCode, branches.baCode))
        .leftJoin(users, eq(documents.uploaderId, users.id))
        .where(whereClause)
        .orderBy(desc(documents.uploadDate))
        .limit(filters.limit)
        .offset(offset);

      const documentsWithRelations = result.map(({ document, branch, uploader }) => ({
        ...document,
        branch: branch || undefined,
        uploader: uploader || undefined
      }));

      return {
        data: documentsWithRelations,
        total: totalCount,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(totalCount / filters.limit)
      };
    } catch (error) {
      console.error('Error getting user own documents:', error);
      throw new DatabaseError('get_user_own_documents', error as Error);
    }
  }
}