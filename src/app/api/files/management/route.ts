import { NextRequest, NextResponse } from 'next/server';
import { withAuthHandler } from '@/lib/middleware/api-auth';
import { FileManagementService } from '@/lib/services/file-management-service';
import { z } from 'zod';

// Validation schemas
const FileSettingsSchema = z.object({
  maxFileSize: z.number().min(1).max(100).optional(),
  retentionPeriod: z.number().min(1).max(3650).optional(),
  uploadDirectory: z.string().min(1).optional(),
  maxStorageSize: z.number().min(1).max(1000).optional(),
  cleanupEnabled: z.boolean().optional(),
  backupEnabled: z.boolean().optional(),
});

const CleanupRequestSchema = z.object({
  action: z.literal('cleanup'),
  confirm: z.boolean(),
});

const BackupRequestSchema = z.object({
  action: z.literal('backup'),
  destination: z.string().min(1).optional(),
});

/**
 * GET /api/files/management - Get file management settings and statistics
 */
export const GET = withAuthHandler(async (request, { user }) => {
  const settings = await FileManagementService.getFileSettings();
  const stats = await FileManagementService.getFileStats();

  return NextResponse.json({
    success: true,
    data: {
      settings,
      stats
    },
    message: 'File management data retrieved successfully'
  });
}, {
  requireAuth: true,
  requireAdminAccess: true,
  rateLimit: 'api'
});

/**
 * PUT /api/files/management - Update file management settings
 */
export const PUT = withAuthHandler(async (request, { user, validatedData }) => {
  const body = validatedData.body;
  const updatedSettings = await FileManagementService.updateFileSettings(body);

  return NextResponse.json({
    success: true,
    data: updatedSettings,
    message: 'File management settings updated successfully'
  });
}, {
  requireAuth: true,
  requireAdminAccess: true,
  rateLimit: 'api',
  validation: {
    body: FileSettingsSchema
  }
});

/**
 * POST /api/files/management - Perform file management actions (cleanup, backup)
 */
export const POST = withAuthHandler(async (request, { user, validatedData }) => {
  const body = validatedData.body;
  const { action } = body;

  if (action === 'cleanup') {
    if (!body.confirm) {
      return NextResponse.json(
        { success: false, error: 'Cleanup action must be confirmed' },
        { status: 400 }
      );
    }

    const cleanupResult = await FileManagementService.cleanupOldFiles();
    return NextResponse.json({
      success: true,
      data: cleanupResult,
      message: `File cleanup completed successfully. ${cleanupResult.deletedCount} files removed, ${cleanupResult.spaceSaved} bytes freed.`
    });
  } else if (action === 'backup') {
    const backupResult = await FileManagementService.createBackup(body.destination);
    return NextResponse.json({
      success: true,
      data: backupResult,
      message: 'File backup completed successfully'
    });
  } else {
    return NextResponse.json(
      { success: false, error: 'Invalid action. Supported actions: cleanup, backup' },
      { status: 400 }
    );
  }
}, {
  requireAuth: true,
  requireAdminAccess: true,
  rateLimit: 'api',
  validation: {
    body: z.union([CleanupRequestSchema, BackupRequestSchema])
  }
});