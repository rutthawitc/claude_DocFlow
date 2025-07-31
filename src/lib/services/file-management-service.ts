import { promises as fs } from 'fs';
import path from 'path';
import { getDb } from '@/db';
import { documents, systemSettings } from '@/db/schema';
import { eq, lt, count, sql } from 'drizzle-orm';

export interface FileStats {
  totalFiles: number;
  totalSize: number; // in bytes
  usedSpace: string; // formatted string like "2.3 GB"
  availableSpace: string; // formatted string like "7.7 GB"
  totalSpace: string; // formatted string like "10 GB" 
  usagePercentage: number;
  oldestFile?: {
    name: string;
    age: number; // days
    size: number;
  };
  largestFile?: {
    name: string;
    size: number;
  };
}

export interface FileSettings {
  maxFileSize: number; // MB
  retentionPeriod: number; // days
  uploadDirectory: string;
  maxStorageSize: number; // GB
  cleanupEnabled: boolean;
  backupEnabled: boolean;
}

export interface CleanupResult {
  filesRemoved: number;
  spaceFreed: number; // bytes
  errors: string[];
}

export class FileManagementService {
  private static readonly DEFAULT_UPLOAD_DIR = './uploads';
  private static readonly DEFAULT_SETTINGS: FileSettings = {
    maxFileSize: 10, // MB
    retentionPeriod: 365, // days
    uploadDirectory: './uploads',
    maxStorageSize: 10, // GB
    cleanupEnabled: true,
    backupEnabled: false,
  };

  /**
   * Get current file statistics
   */
  static async getFileStats(): Promise<FileStats> {
    try {
      const settings = await this.getFileSettings();
      const uploadDir = settings.uploadDirectory;

      // Ensure directory exists
      await fs.mkdir(uploadDir, { recursive: true });

      // Get all files in upload directory
      const files = await this.getAllFiles(uploadDir);
      let totalSize = 0;
      let oldestFile: FileStats['oldestFile'];
      let largestFile: FileStats['largestFile'];

      const now = Date.now();

      for (const file of files) {
        try {
          const stats = await fs.stat(file.path);
          const size = stats.size;
          totalSize += size;

          // Track oldest file
          const ageInDays = Math.floor((now - stats.mtime.getTime()) / (1000 * 60 * 60 * 24));
          if (!oldestFile || ageInDays > oldestFile.age) {
            oldestFile = {
              name: file.name,
              age: ageInDays,
              size: size,
            };
          }

          // Track largest file
          if (!largestFile || size > largestFile.size) {
            largestFile = {
              name: file.name,
              size: size,
            };
          }
        } catch (error) {
          console.warn(`Error reading file stats for ${file.path}:`, error);
        }
      }

      // Calculate storage metrics
      const maxStorageBytes = settings.maxStorageSize * 1024 * 1024 * 1024; // Convert GB to bytes
      const usagePercentage = Math.round((totalSize / maxStorageBytes) * 100);
      const availableBytes = maxStorageBytes - totalSize;

      return {
        totalFiles: files.length,
        totalSize,
        usedSpace: this.formatBytes(totalSize),
        availableSpace: this.formatBytes(availableBytes),
        totalSpace: this.formatBytes(maxStorageBytes),
        usagePercentage,
        oldestFile,
        largestFile,
      };
    } catch (error) {
      console.error('Error getting file stats:', error);
      throw new Error('Failed to retrieve file statistics');
    }
  }

  /**
   * Get current file management settings
   */
  static async getFileSettings(): Promise<FileSettings> {
    try {
      const db = await getDb();
      
      // Try to get settings from database
      const dbSettings = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.settingKey, 'fileManagement'))
        .limit(1);

      if (dbSettings.length > 0) {
        const settings = JSON.parse(dbSettings[0].settingValue) as FileSettings;
        return { ...this.DEFAULT_SETTINGS, ...settings };
      }

      // Return default settings if none found
      return this.DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Error getting file settings:', error);
      return this.DEFAULT_SETTINGS;
    }
  }

  /**
   * Update file management settings
   */
  static async updateFileSettings(newSettings: Partial<FileSettings>): Promise<FileSettings> {
    try {
      const db = await getDb();
      const currentSettings = await this.getFileSettings();
      const updatedSettings = { ...currentSettings, ...newSettings };

      // Validate settings
      if (updatedSettings.maxFileSize < 1 || updatedSettings.maxFileSize > 100) {
        throw new Error('Max file size must be between 1 and 100 MB');
      }

      if (updatedSettings.retentionPeriod < 1 || updatedSettings.retentionPeriod > 3650) {
        throw new Error('Retention period must be between 1 and 3650 days');
      }

      if (updatedSettings.maxStorageSize < 1 || updatedSettings.maxStorageSize > 1000) {
        throw new Error('Max storage size must be between 1 and 1000 GB');
      }

      // Ensure upload directory exists
      await fs.mkdir(updatedSettings.uploadDirectory, { recursive: true });

      // Save to database
      await db
        .insert(systemSettings)
        .values({
          settingKey: 'fileManagement',
          settingValue: JSON.stringify(updatedSettings),
          settingType: 'json',
          description: 'File management settings',
        })
        .onConflictDoUpdate({
          target: systemSettings.settingKey,
          set: {
            settingValue: JSON.stringify(updatedSettings),
            updatedAt: new Date(),
          },
        });

      return updatedSettings;
    } catch (error) {
      console.error('Error updating file settings:', error);
      throw new Error('Failed to update file settings');
    }
  }

  /**
   * Clean up old files based on retention policy
   */
  static async cleanupOldFiles(): Promise<CleanupResult> {
    const result: CleanupResult = {
      filesRemoved: 0,
      spaceFreed: 0,
      errors: [],
    };

    try {
      const settings = await this.getFileSettings();
      
      if (!settings.cleanupEnabled) {
        throw new Error('File cleanup is disabled in settings');
      }

      const db = await getDb();
      const retentionDate = new Date();
      retentionDate.setDate(retentionDate.getDate() - settings.retentionPeriod);

      // Get documents older than retention period
      const oldDocuments = await db
        .select({
          id: documents.id,
          filePath: documents.filePath,
          createdAt: documents.createdAt,
        })
        .from(documents)
        .where(lt(documents.createdAt, retentionDate));

      console.log(`Found ${oldDocuments.length} documents older than ${settings.retentionPeriod} days`);

      for (const doc of oldDocuments) {
        try {
          if (doc.filePath) {
            // Check if file exists before attempting to delete
            try {
              const stats = await fs.stat(doc.filePath);
              await fs.unlink(doc.filePath);
              result.filesRemoved++;
              result.spaceFreed += stats.size;
              console.log(`Deleted file: ${doc.filePath}`);
            } catch (fileError) {
              if ((fileError as any).code !== 'ENOENT') {
                result.errors.push(`Failed to delete file ${doc.filePath}: ${(fileError as Error).message}`);
              }
              // If file doesn't exist, we still want to clean up the database record
            }

            // Remove document record from database
            await db.delete(documents).where(eq(documents.id, doc.id));
          }
        } catch (error) {
          result.errors.push(`Error processing document ${doc.id}: ${(error as Error).message}`);
        }
      }

      // Clean up orphaned files (files without database records)
      await this.cleanupOrphanedFiles(result);

      console.log(`Cleanup completed: ${result.filesRemoved} files removed, ${this.formatBytes(result.spaceFreed)} freed`);
      return result;
    } catch (error) {
      console.error('Error during file cleanup:', error);
      result.errors.push(`Cleanup failed: ${(error as Error).message}`);
      return result;
    }
  }

  /**
   * Create backup of current files
   */
  static async createBackup(): Promise<{ success: boolean; backupPath?: string; error?: string }> {
    try {
      const settings = await this.getFileSettings();
      
      if (!settings.backupEnabled) {
        throw new Error('Backup is disabled in settings');
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join('./backups', `backup-${timestamp}`);
      
      await fs.mkdir(backupDir, { recursive: true });

      // Copy all files from upload directory to backup directory
      const files = await this.getAllFiles(settings.uploadDirectory);
      let filesCopied = 0;

      for (const file of files) {
        try {
          const relativePath = path.relative(settings.uploadDirectory, file.path);
          const backupPath = path.join(backupDir, relativePath);
          const backupPathDir = path.dirname(backupPath);
          
          await fs.mkdir(backupPathDir, { recursive: true });
          await fs.copyFile(file.path, backupPath);
          filesCopied++;
        } catch (error) {
          console.warn(`Failed to backup file ${file.path}:`, error);
        }
      }

      console.log(`Backup completed: ${filesCopied} files backed up to ${backupDir}`);
      return { success: true, backupPath: backupDir };
    } catch (error) {
      console.error('Backup failed:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Get all files in a directory recursively
   */
  private static async getAllFiles(dir: string): Promise<Array<{ name: string; path: string }>> {
    const files: Array<{ name: string; path: string }> = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          const subFiles = await this.getAllFiles(fullPath);
          files.push(...subFiles);
        } else {
          files.push({ name: entry.name, path: fullPath });
        }
      }
    } catch (error) {
      console.warn(`Error reading directory ${dir}:`, error);
    }

    return files;
  }

  /**
   * Clean up orphaned files (files without database records)
   */
  private static async cleanupOrphanedFiles(result: CleanupResult): Promise<void> {
    try {
      const settings = await this.getFileSettings();
      const db = await getDb();

      // Get all file paths from database
      const dbFilePaths = await db
        .select({ filePath: documents.filePath })
        .from(documents)
        .where(sql`${documents.filePath} IS NOT NULL`);

      const dbFilePathsSet = new Set(dbFilePaths.map(doc => doc.filePath));

      // Get all physical files
      const physicalFiles = await this.getAllFiles(settings.uploadDirectory);

      // Find orphaned files
      for (const file of physicalFiles) {
        if (!dbFilePathsSet.has(file.path)) {
          try {
            const stats = await fs.stat(file.path);
            await fs.unlink(file.path);
            result.filesRemoved++;
            result.spaceFreed += stats.size;
            console.log(`Deleted orphaned file: ${file.path}`);
          } catch (error) {
            result.errors.push(`Failed to delete orphaned file ${file.path}: ${(error as Error).message}`);
          }
        }
      }
    } catch (error) {
      result.errors.push(`Error cleaning orphaned files: ${(error as Error).message}`);
    }
  }

  /**
   * Format bytes to human readable string
   */
  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Get disk usage for a specific directory (if available)
   */
  static async getDiskUsage(dirPath: string): Promise<{ total: number; free: number; used: number } | null> {
    try {
      // This is a simplified version - in production you might want to use a library like 'statvfs'
      // For now, we'll return null and fall back to our configured limits
      return null;
    } catch (error) {
      console.warn('Could not get disk usage:', error);
      return null;
    }
  }
}