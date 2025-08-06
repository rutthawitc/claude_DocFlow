import { withAuthHandler } from '@/lib/middleware/api-auth';
import { ApiResponseHandler } from '@/lib/middleware/api-responses';
import { SystemSettingsService } from '@/lib/services/system-settings-service';
import { DOCFLOW_PERMISSIONS } from '@/lib/auth/docflow-auth';

// Simple validation function
function validateSystemSettings(data: unknown): { 
  valid: boolean; 
  error?: string; 
  data?: Record<string, unknown>; 
} {
  try {
    if (typeof data !== 'object' || data === null) {
      return { valid: false, error: 'Request body must be an object' };
    }

    const allowedFields = [
      'maintenanceMode', 'autoBackup', 'debugMode', 'cacheEnabled',
      'maintenanceMessage', 'maintenanceStartTime', 'maintenanceEndTime'
    ];

    const validatedData: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (allowedFields.includes(key)) {
        validatedData[key] = value;
      }
    }

    return { valid: true, data: validatedData };
  } catch (error) {
    return { valid: false, error: 'Invalid JSON data' };
  }
}

export const GET = withAuthHandler(
  async () => {
    console.log('System Settings API - GET request');
    
    const settings = await SystemSettingsService.getAllSettings();
    return ApiResponseHandler.success(settings);
  },
  {
    requiredPermissions: [
      DOCFLOW_PERMISSIONS.ADMIN_FULL_ACCESS,
      DOCFLOW_PERMISSIONS.SETTINGS_MANAGE,
      DOCFLOW_PERMISSIONS.ADMIN_SYSTEM
    ]
  }
);

export const PUT = withAuthHandler(
  async (request, { user }) => {
    console.log('System Settings API - PUT request');

    const requestBody = await request.json();
    const validation = validateSystemSettings(requestBody);
    
    if (!validation.valid) {
      return ApiResponseHandler.badRequest(validation.error!);
    }

    const settingsData = validation.data;
    console.log('Settings data to update:', settingsData);

    const success = await SystemSettingsService.setSettings(
      settingsData, 
      user.databaseId
    );

    if (!success) {
      return ApiResponseHandler.internalError('Failed to update system settings');
    }

    const updatedSettings = await SystemSettingsService.getAllSettings();
    console.log('System settings updated successfully');

    return ApiResponseHandler.success(
      updatedSettings,
      'System settings updated successfully'
    );
  },
  {
    requiredPermissions: [
      DOCFLOW_PERMISSIONS.ADMIN_FULL_ACCESS,
      DOCFLOW_PERMISSIONS.SETTINGS_MANAGE,
      DOCFLOW_PERMISSIONS.ADMIN_SYSTEM
    ]
  }
);

export const POST = withAuthHandler(
  async () => {
    console.log('System Settings API - POST request (initialize)');

    const success = await SystemSettingsService.initializeDefaultSettings();

    if (!success) {
      return ApiResponseHandler.internalError('Failed to initialize default settings');
    }

    const settings = await SystemSettingsService.getAllSettings();

    return ApiResponseHandler.success(
      settings,
      'Default system settings initialized successfully',
      201
    );
  },
  {
    requiredPermissions: [DOCFLOW_PERMISSIONS.ADMIN_FULL_ACCESS]
  }
);