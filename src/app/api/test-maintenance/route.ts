import { NextRequest, NextResponse } from 'next/server';
import { SystemSettingsService } from '@/lib/services/system-settings-service';

// Simple test endpoint to check/toggle maintenance mode
export async function GET(request: NextRequest) {
  try {
    const isMaintenanceMode = await SystemSettingsService.isMaintenanceModeEnabled();
    
    return NextResponse.json({
      success: true,
      maintenanceMode: isMaintenanceMode,
      message: isMaintenanceMode ? 'Maintenance mode is ENABLED' : 'Maintenance mode is DISABLED'
    });
  } catch (error) {
    console.error('Test maintenance error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check maintenance mode' },
      { status: 500 }
    );
  }
}

// Toggle maintenance mode for testing
export async function POST(request: NextRequest) {
  try {
    const { enable } = await request.json();
    
    const success = await SystemSettingsService.setSetting(
      'maintenanceMode',
      enable,
      'boolean',
      'Test toggle of maintenance mode'
    );
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to toggle maintenance mode' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      maintenanceMode: enable,
      message: `Maintenance mode ${enable ? 'ENABLED' : 'DISABLED'} successfully`
    });
  } catch (error) {
    console.error('Toggle maintenance error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to toggle maintenance mode' },
      { status: 500 }
    );
  }
}