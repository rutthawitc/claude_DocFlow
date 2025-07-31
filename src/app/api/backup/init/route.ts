import { NextResponse } from 'next/server';
import { BackupSchedulerService } from '@/lib/services/backup-scheduler-service';

// This route initializes the backup scheduler
// It should be called when the application starts
export async function POST() {
  try {
    console.log('Initializing backup scheduler via API...');
    
    await BackupSchedulerService.initialize();
    
    return NextResponse.json({
      success: true,
      message: 'Backup scheduler initialized successfully'
    });

  } catch (error) {
    console.error('Error initializing backup scheduler:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to initialize backup scheduler',
        details: (error as Error).message
      },
      { status: 500 }
    );
  }
}

// Get backup scheduler status
export async function GET() {
  try {
    const status = await BackupSchedulerService.getSchedulerStatus();
    
    return NextResponse.json({
      success: true,
      data: {
        initialized: status.initialized,
        running: status.running,
        config: status.config,
        nextBackupTime: status.nextBackupTime?.toISOString(),
      }
    });

  } catch (error) {
    console.error('Error getting backup scheduler status:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get backup scheduler status',
        details: (error as Error).message
      },
      { status: 500 }
    );
  }
}