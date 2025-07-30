import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { SystemSettingsService } from '@/lib/services/system-settings-service';
import { DOCFLOW_PERMISSIONS } from '@/lib/auth/docflow-auth';
import { DocFlowAuth } from '@/lib/auth/docflow-auth';
import { getDb } from '@/db';
import { eq } from 'drizzle-orm';
import { users } from '@/db/schema';

// Helper function to get actual user database ID from username
async function getUserDatabaseId(username: string): Promise<number | null> {
  try {
    const db = await getDb();
    if (!db) return null;
    
    const user = await db.query.users.findFirst({
      where: eq(users.username, username)
    });
    
    return user?.id || null;
  } catch (error) {
    console.error('Error getting user database ID:', error);
    return null;
  }
}

// Simple validation function
function validateSystemSettings(data: any): { 
  valid: boolean; 
  error?: string; 
  data?: any; 
} {
  try {
    if (typeof data !== 'object' || data === null) {
      return { valid: false, error: 'Request body must be an object' };
    }

    const allowedFields = [
      'maintenanceMode', 'autoBackup', 'debugMode', 'cacheEnabled',
      'maintenanceMessage', 'maintenanceStartTime', 'maintenanceEndTime'
    ];

    const validatedData: any = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (allowedFields.includes(key)) {
        validatedData[key] = value;
      }
    }

    return { valid: true, data: validatedData };
  } catch (error) {
    return { valid: false, error: 'Invalid JSON data' };
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('System Settings API - GET request');

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('User authenticated:', session.user.id);

    const db = await getDb();
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database connection failed' },
        { status: 500 }
      );
    }

    console.log('Session user ID (username):', session.user.id);
    const actualUserId = await getUserDatabaseId(session.user.id);
    
    if (!actualUserId) {
      return NextResponse.json(
        { success: false, error: 'User not found in database' },
        { status: 401 }
      );
    }
    
    console.log('Actual database user ID:', actualUserId);
    const userPermissions = await DocFlowAuth.getUserRolesAndPermissions(actualUserId);
    console.log('User permissions:', userPermissions.permissions);
    console.log('Required permissions:', [DOCFLOW_PERMISSIONS.ADMIN_FULL_ACCESS, DOCFLOW_PERMISSIONS.SETTINGS_MANAGE, DOCFLOW_PERMISSIONS.ADMIN_SYSTEM]);
    
    const hasPermission = userPermissions.permissions.some((permission: string) => 
      [DOCFLOW_PERMISSIONS.ADMIN_FULL_ACCESS, DOCFLOW_PERMISSIONS.SETTINGS_MANAGE, DOCFLOW_PERMISSIONS.ADMIN_SYSTEM].includes(permission)
    );

    console.log('Has required permission:', hasPermission);

    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: 'Permission denied. Admin access required.', userPermissions: userPermissions.permissions },
        { status: 403 }
      );
    }

    console.log('Permission check passed');

    const settings = await SystemSettingsService.getAllSettings();

    return NextResponse.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('System Settings API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('System Settings API - PUT request');

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('User authenticated:', session.user.id);

    const db = await getDb();
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database connection failed' },
        { status: 500 }
      );
    }

    console.log('Session user ID (username):', session.user.id);
    const actualUserId = await getUserDatabaseId(session.user.id);
    
    if (!actualUserId) {
      return NextResponse.json(
        { success: false, error: 'User not found in database' },
        { status: 401 }
      );
    }
    
    console.log('Actual database user ID:', actualUserId);
    const userPermissions = await DocFlowAuth.getUserRolesAndPermissions(actualUserId);
    console.log('User permissions:', userPermissions.permissions);
    console.log('Required permissions:', [DOCFLOW_PERMISSIONS.ADMIN_FULL_ACCESS, DOCFLOW_PERMISSIONS.SETTINGS_MANAGE, DOCFLOW_PERMISSIONS.ADMIN_SYSTEM]);
    
    const hasPermission = userPermissions.permissions.some((permission: string) => 
      [DOCFLOW_PERMISSIONS.ADMIN_FULL_ACCESS, DOCFLOW_PERMISSIONS.SETTINGS_MANAGE, DOCFLOW_PERMISSIONS.ADMIN_SYSTEM].includes(permission)
    );

    console.log('Has required permission:', hasPermission);

    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: 'Permission denied. Admin access required.', userPermissions: userPermissions.permissions },
        { status: 403 }
      );
    }

    console.log('Permission check passed');

    const requestBody = await request.json();
    const validation = validateSystemSettings(requestBody);
    
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const settingsData = validation.data;
    console.log('Settings data to update:', settingsData);

    const success = await SystemSettingsService.setSettings(
      settingsData, 
      actualUserId
    );

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to update system settings' },
        { status: 500 }
      );
    }

    const updatedSettings = await SystemSettingsService.getAllSettings();

    console.log('System settings updated successfully');

    return NextResponse.json({
      success: true,
      message: 'System settings updated successfully',
      data: updatedSettings
    });
  } catch (error) {
    console.error('System Settings API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('System Settings API - POST request (initialize)');

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database connection failed' },
        { status: 500 }
      );
    }

    const userPermissions = await DocFlowAuth.getUserRolesAndPermissions(parseInt(session.user.id));
    const isAdmin = userPermissions.permissions.includes(DOCFLOW_PERMISSIONS.ADMIN_FULL_ACCESS);

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Permission denied. Admin access required.' },
        { status: 403 }
      );
    }

    const success = await SystemSettingsService.initializeDefaultSettings();

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to initialize default settings' },
        { status: 500 }
      );
    }

    const settings = await SystemSettingsService.getAllSettings();

    return NextResponse.json({
      success: true,
      message: 'Default system settings initialized successfully',
      data: settings
    });
  } catch (error) {
    console.error('System Settings API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}