import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { BackupSchedulerService } from '@/lib/services/backup-scheduler-service';

// GET - Get backup job history
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    
    // Validate limit
    const validLimit = Math.min(Math.max(limit, 1), 100);

    const history = BackupSchedulerService.getJobHistory(validLimit);
    
    return NextResponse.json({
      success: true,
      data: {
        history,
        total: history.length
      }
    });

  } catch (error) {
    console.error('Error getting backup history:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get backup history' },
      { status: 500 }
    );
  }
}