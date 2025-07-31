import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { BackupSchedulerService, BackupScheduleConfig } from '@/lib/services/backup-scheduler-service';
import { z } from 'zod';

// Validation schemas
const updateScheduleSchema = z.object({
  enabled: z.boolean().optional(),
  time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)').optional(),
  retentionDays: z.number().min(1).max(365).optional(),
});

// GET - Get current backup schedule configuration
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user has admin or district_manager role
    const userRoles = session.user.pwa?.roles || [];
    const hasPermission = userRoles.includes('admin') || userRoles.includes('district_manager');
    
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const config = await BackupSchedulerService.getScheduleConfig();
    const nextBackupTime = await BackupSchedulerService.getNextBackupTime();
    
    return NextResponse.json({
      success: true,
      data: {
        ...config,
        nextBackupTime: nextBackupTime?.toISOString(),
      }
    });

  } catch (error) {
    console.error('Error getting backup schedule:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get backup schedule' },
      { status: 500 }
    );
  }
}

// PUT - Update backup schedule configuration
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user has admin or district_manager role
    const userRoles = session.user.pwa?.roles || [];
    const hasPermission = userRoles.includes('admin') || userRoles.includes('district_manager');
    
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Validate input
    const validationResult = updateScheduleSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid input data',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const updateData = validationResult.data;
    
    // Update schedule configuration
    const success = await BackupSchedulerService.updateScheduleConfig(updateData);
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to update backup schedule' },
        { status: 500 }
      );
    }

    // Get updated configuration
    const updatedConfig = await BackupSchedulerService.getScheduleConfig();
    const nextBackupTime = await BackupSchedulerService.getNextBackupTime();

    return NextResponse.json({
      success: true,
      data: {
        ...updatedConfig,
        nextBackupTime: nextBackupTime?.toISOString(),
      },
      message: 'Backup schedule updated successfully'
    });

  } catch (error) {
    console.error('Error updating backup schedule:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update backup schedule' },
      { status: 500 }
    );
  }
}

// POST - Trigger manual backup
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user has admin or district_manager role
    const userRoles = session.user.pwa?.roles || [];
    const hasPermission = userRoles.includes('admin') || userRoles.includes('district_manager');
    
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Trigger manual backup
    const result = await BackupSchedulerService.triggerManualBackup();

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result,
        message: 'Manual backup completed successfully'
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Backup failed',
          data: result
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error triggering manual backup:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to trigger manual backup' },
      { status: 500 }
    );
  }
}