import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { FileValidationResult, FileValidationError, DocumentUploadError } from '@/lib/types';

export class FileValidationService {
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly ALLOWED_MIME_TYPES = ['application/pdf'];
  private static readonly PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46]; // %PDF

  /**
   * Validate uploaded file
   */
  static async validateFile(file: File): Promise<FileValidationResult> {
    const errors: FileValidationError[] = [];

    // Check if file exists
    if (!file) {
      errors.push({
        type: 'FILE_MISSING',
        message: 'No file provided'
      });
      return { isValid: false, errors };
    }

    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      errors.push({
        type: 'FILE_SIZE',
        message: `File size exceeds maximum limit of ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`,
        details: { actualSize: file.size, maxSize: this.MAX_FILE_SIZE }
      });
    }

    // Check MIME type
    if (!this.ALLOWED_MIME_TYPES.includes(file.type)) {
      errors.push({
        type: 'FILE_TYPE',
        message: `Invalid file type. Only PDF files are allowed.`,
        details: { actualType: file.type, allowedTypes: this.ALLOWED_MIME_TYPES }
      });
    }

    // Check PDF signature
    try {
      const isValidPDF = await this.validatePDFSignature(file);
      if (!isValidPDF) {
        errors.push({
          type: 'FILE_CORRUPT',
          message: 'Invalid PDF file signature'
        });
      }
    } catch (error) {
      errors.push({
        type: 'FILE_CORRUPT',
        message: 'Unable to read file content',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate PDF file signature
   */
  private static async validatePDFSignature(file: File): Promise<boolean> {
    try {
      const buffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);
      
      // Check PDF magic bytes
      for (let i = 0; i < this.PDF_SIGNATURE.length; i++) {
        if (uint8Array[i] !== this.PDF_SIGNATURE[i]) {
          return false;
        }
      }

      // Check for PDF EOF marker
      const content = new TextDecoder().decode(uint8Array);
      if (!content.includes('%%EOF')) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating PDF signature:', error);
      return false;
    }
  }

  /**
   * Sanitize filename
   */
  static sanitizeFilename(filename: string): string {
    // Remove dangerous characters and limit length
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 100);
  }

  /**
   * Generate unique filename
   */
  static generateUniqueFilename(originalFilename: string, documentId?: number): string {
    const sanitized = this.sanitizeFilename(originalFilename);
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    
    const name = path.parse(sanitized).name;
    const ext = path.parse(sanitized).ext || '.pdf';
    
    if (documentId) {
      return `doc_${documentId}_${timestamp}_${random}${ext}`;
    }
    
    return `${name}_${timestamp}_${random}${ext}`;
  }
}

export class FileStorageService {
  private static readonly UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
  private static readonly ENCRYPTION_KEY = process.env.FILE_ENCRYPTION_KEY || 'default-key-change-in-production';

  /**
   * Initialize upload directory
   */
  static async initializeUploadDir(): Promise<void> {
    try {
      await fs.access(this.UPLOAD_DIR);
    } catch {
      await fs.mkdir(this.UPLOAD_DIR, { recursive: true });
    }
  }

  /**
   * Store file with encryption
   */
  static async storeFile(file: File, documentId: number): Promise<{ filePath: string; fileSize: number }> {
    await this.initializeUploadDir();

    const filename = FileValidationService.generateUniqueFilename(file.name, documentId);
    const filePath = path.join(this.UPLOAD_DIR, filename);

    try {
      const buffer = await file.arrayBuffer();
      const encrypted = await this.encryptBuffer(Buffer.from(buffer));
      
      await fs.writeFile(filePath, encrypted);
      
      return {
        filePath: filename, // Store relative path
        fileSize: file.size
      };
    } catch (error) {
      console.error('Error storing file:', error);
      throw new Error('Failed to store file');
    }
  }

  /**
   * Retrieve file with decryption
   */
  static async retrieveFile(filePath: string): Promise<Buffer> {
    try {
      const fullPath = path.join(this.UPLOAD_DIR, filePath);
      const encrypted = await fs.readFile(fullPath);
      return await this.decryptBuffer(encrypted);
    } catch (error) {
      console.error('Error retrieving file:', error);
      throw new Error('Failed to retrieve file');
    }
  }

  /**
   * Delete file
   */
  static async deleteFile(filePath: string): Promise<void> {
    try {
      const fullPath = path.join(this.UPLOAD_DIR, filePath);
      await fs.unlink(fullPath);
    } catch (error) {
      console.error('Error deleting file:', error);
      // Don't throw error for file deletion failures
    }
  }

  /**
   * Check if file exists
   */
  static async fileExists(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.UPLOAD_DIR, filePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file stats
   */
  static async getFileStats(filePath: string): Promise<{ size: number; createdAt: Date }> {
    try {
      const fullPath = path.join(this.UPLOAD_DIR, filePath);
      const stats = await fs.stat(fullPath);
      return {
        size: stats.size,
        createdAt: stats.birthtime
      };
    } catch (error) {
      console.error('Error getting file stats:', error);
      throw new Error('Failed to get file stats');
    }
  }

  /**
   * Encrypt buffer
   */
  private static async encryptBuffer(buffer: Buffer): Promise<Buffer> {
    try {
      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync(this.ENCRYPTION_KEY, 'salt', 32);
      const iv = crypto.randomBytes(16);
      
      const cipher = crypto.createCipher(algorithm, key);
      const encrypted = Buffer.concat([
        iv,
        cipher.update(buffer),
        cipher.final()
      ]);
      
      return encrypted;
    } catch (error) {
      console.error('Encryption error:', error);
      // In development, store without encryption
      if (process.env.NODE_ENV === 'development') {
        return buffer;
      }
      throw new Error('Failed to encrypt file');
    }
  }

  /**
   * Decrypt buffer
   */
  private static async decryptBuffer(encrypted: Buffer): Promise<Buffer> {
    try {
      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync(this.ENCRYPTION_KEY, 'salt', 32);
      
      const iv = encrypted.slice(0, 16);
      const encryptedData = encrypted.slice(16);
      
      const decipher = crypto.createDecipher(algorithm, key);
      const decrypted = Buffer.concat([
        decipher.update(encryptedData),
        decipher.final()
      ]);
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      // In development, return as-is if decryption fails
      if (process.env.NODE_ENV === 'development') {
        return encrypted;
      }
      throw new Error('Failed to decrypt file');
    }
  }
}

export class StreamingFileHandler {
  /**
   * Handle streaming file upload from request
   */
  static async handleFileUpload(request: Request): Promise<{ file: File; formData: FormData }> {
    try {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      
      if (!file) {
        throw new DocumentUploadError([{
          type: 'FILE_MISSING',
          message: 'No file provided in form data'
        }]);
      }

      return { file, formData };
    } catch (error) {
      console.error('Error handling file upload:', error);
      if (error instanceof DocumentUploadError) {
        throw error;
      }
      throw new Error('Failed to process file upload');
    }
  }

  /**
   * Stream file for download
   */
  static async streamFileDownload(filePath: string, originalFilename: string): Promise<Response> {
    try {
      const fileBuffer = await FileStorageService.retrieveFile(filePath);
      
      return new Response(fileBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${originalFilename}"`,
          'Content-Length': fileBuffer.length.toString(),
          'Cache-Control': 'private, max-age=3600'
        }
      });
    } catch (error) {
      console.error('Error streaming file download:', error);
      throw new Error('Failed to stream file download');
    }
  }

  /**
   * Process temporary file upload
   */
  static async processTempFileUpload(file: File): Promise<{ tempPath: string; fileSize: number }> {
    const tempDir = os.tmpdir();
    const tempFilename = `upload_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.pdf`;
    const tempPath = path.join(tempDir, tempFilename);

    try {
      const buffer = await file.arrayBuffer();
      await fs.writeFile(tempPath, Buffer.from(buffer));
      
      return {
        tempPath,
        fileSize: file.size
      };
    } catch (error) {
      console.error('Error processing temp file upload:', error);
      throw new Error('Failed to process temporary file upload');
    }
  }

  /**
   * Clean up temporary file
   */
  static async cleanupTempFile(tempPath: string): Promise<void> {
    try {
      await fs.unlink(tempPath);
    } catch (error) {
      console.error('Error cleaning up temp file:', error);
      // Don't throw error for cleanup failures
    }
  }
}