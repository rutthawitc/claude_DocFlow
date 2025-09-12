import { NextRequest, NextResponse } from 'next/server';
import { withAuthHandler } from '@/lib/middleware/api-auth';
import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';

// Validation schemas
const AdminTelegramSettingsSchema = z.object({
  enabled: z.boolean(),
  botToken: z.string(),
  defaultChatId: z.string(),
  notifications: z.object({
    documentAcknowledged: z.boolean(),
    additionalDocsCompleted: z.boolean(),
    documentSentBackToDistrict: z.boolean(),
    documentVerificationCompleted: z.boolean(),
    bulkDocumentsSent: z.boolean(),
    userRoleChanges: z.boolean(),
    workflowStatusChanges: z.boolean(),
  }),
  messageFormat: z.object({
    includeFullContext: z.boolean(),
    includeUserDetails: z.boolean(),
    includeBranchDetails: z.boolean(),
    includeDocumentDetails: z.boolean(),
    includeTimestamp: z.boolean(),
  }),
});

const ADMIN_SETTINGS_FILE = path.join(process.cwd(), 'tmp', 'admin-telegram-settings.json');

// Ensure tmp directory exists
async function ensureTmpDirectory() {
  const tmpDir = path.dirname(ADMIN_SETTINGS_FILE);
  try {
    await fs.access(tmpDir);
  } catch {
    await fs.mkdir(tmpDir, { recursive: true });
  }
}

// GET - Load admin telegram settings
export const GET = withAuthHandler(async (request, { user }) => {
  try {
    await ensureTmpDirectory();
    
    const data = await fs.readFile(ADMIN_SETTINGS_FILE, 'utf8');
    const settings = JSON.parse(data);
    
    return NextResponse.json({
      success: true,
      data: settings
    });
  } catch (error) {
    // If file doesn't exist, return default settings
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      const defaultSettings = {
        enabled: false,
        botToken: "",
        defaultChatId: "",
        notifications: {
          documentAcknowledged: true,
          additionalDocsCompleted: true,
          documentSentBackToDistrict: true,
          documentVerificationCompleted: true,
          bulkDocumentsSent: true,
          userRoleChanges: false,
          workflowStatusChanges: true,
        },
        messageFormat: {
          includeFullContext: true,
          includeUserDetails: true,
          includeBranchDetails: true,
          includeDocumentDetails: true,
          includeTimestamp: true,
        },
      };
      
      return NextResponse.json({
        success: true,
        data: defaultSettings
      });
    }
    
    console.error('Error loading admin telegram settings:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to load admin telegram settings'
    }, { status: 500 });
  }
}, {
  requireAuth: true,
  requireAdminAccess: true,
  rateLimit: 'api'
});

// POST - Save admin telegram settings
export const POST = withAuthHandler(async (request, { user, validatedData }) => {
  try {
    await ensureTmpDirectory();
    
    // Save to file
    await fs.writeFile(ADMIN_SETTINGS_FILE, JSON.stringify(validatedData.body, null, 2));
    
    console.log('Admin Telegram settings saved by user:', user.username);
    
    return NextResponse.json({
      success: true,
      message: 'Admin Telegram settings saved successfully'
    });
  } catch (error) {
    console.error('Error saving admin telegram settings:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to save admin telegram settings'
    }, { status: 500 });
  }
}, {
  requireAuth: true,
  requireAdminAccess: true,
  rateLimit: 'api',
  validation: {
    body: AdminTelegramSettingsSchema
  }
});