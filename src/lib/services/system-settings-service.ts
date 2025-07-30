import { getDb } from '@/db';
import { systemSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';

export interface SystemSetting {
  id: number;
  settingKey: string;
  settingValue: string;
  settingType: string; // Will be 'string' | 'boolean' | 'number' | 'json' but keeping as string for DB compatibility
  description?: string | null;
  updatedBy?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SystemSettingsData {
  maintenanceMode: boolean;
  autoBackup: boolean;
  debugMode: boolean;
  cacheEnabled: boolean;
  maintenanceMessage?: string;
  maintenanceStartTime?: string;
  maintenanceEndTime?: string;
}

export class SystemSettingsService {
  /**
   * Get a specific system setting by key
   */
  static async getSetting(key: string): Promise<SystemSetting | null> {
    try {
      const db = await getDb();
      if (!db) {
        console.error('Database client not available');
        return null;
      }

      const result = await db.query.systemSettings.findFirst({
        where: eq(systemSettings.settingKey, key),
      });

      return result || null;
    } catch (error) {
      console.error('Error getting system setting:', error);
      return null;
    }
  }

  /**
   * Get all system settings as an object
   */
  static async getAllSettings(): Promise<SystemSettingsData> {
    try {
      const db = await getDb();
      if (!db) {
        console.error('Database client not available');
        return this.getDefaultSettings();
      }

      const results = await db.query.systemSettings.findMany();
      
      const settings: Partial<SystemSettingsData> = {};
      
      results.forEach((setting) => {
        const key = setting.settingKey as keyof SystemSettingsData;
        let value: any = setting.settingValue;

        // Parse based on type
        switch (setting.settingType) {
          case 'boolean':
            value = setting.settingValue === 'true';
            break;
          case 'number':
            value = parseFloat(setting.settingValue);
            break;
          case 'json':
            try {
              value = JSON.parse(setting.settingValue);
            } catch {
              value = setting.settingValue;
            }
            break;
          default:
            value = setting.settingValue;
        }

        settings[key] = value;
      });

      // Merge with defaults to ensure all settings exist
      return { ...this.getDefaultSettings(), ...settings };
    } catch (error) {
      console.error('Error getting all system settings:', error);
      return this.getDefaultSettings();
    }
  }

  /**
   * Set a system setting
   */
  static async setSetting(
    key: string, 
    value: any, 
    type: 'string' | 'boolean' | 'number' | 'json' = 'string',
    description?: string,
    updatedBy?: number
  ): Promise<boolean> {
    try {
      const db = await getDb();
      if (!db) {
        console.error('Database client not available');
        return false;
      }

      let stringValue: string;
      switch (type) {
        case 'boolean':
          stringValue = value ? 'true' : 'false';
          break;
        case 'number':
          stringValue = value.toString();
          break;
        case 'json':
          stringValue = JSON.stringify(value);
          break;
        default:
          stringValue = String(value);
      }

      // Check if setting exists
      const existing = await this.getSetting(key);
      
      if (existing) {
        // Update existing setting
        await db.update(systemSettings)
          .set({
            settingValue: stringValue,
            settingType: type,
            description: description || existing.description,
            updatedBy,
            updatedAt: new Date(),
          })
          .where(eq(systemSettings.settingKey, key));
      } else {
        // Create new setting
        await db.insert(systemSettings).values({
          settingKey: key,
          settingValue: stringValue,
          settingType: type,
          description,
          updatedBy,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      return true;
    } catch (error) {
      console.error('Error setting system setting:', error);
      return false;
    }
  }

  /**
   * Set multiple system settings at once
   */
  static async setSettings(
    settings: Partial<SystemSettingsData>, 
    updatedBy?: number
  ): Promise<boolean> {
    try {
      const promises = Object.entries(settings).map(([key, value]) => {
        let type: 'string' | 'boolean' | 'number' | 'json' = 'string';
        let description = '';

        // Determine type and description based on key
        switch (key) {
          case 'maintenanceMode':
            type = 'boolean';
            description = 'Enable/disable maintenance mode';
            break;
          case 'autoBackup':
            type = 'boolean';
            description = 'Enable/disable automatic daily backups';
            break;
          case 'debugMode':
            type = 'boolean';
            description = 'Enable/disable debug logging';
            break;
          case 'cacheEnabled':
            type = 'boolean';
            description = 'Enable/disable data caching';
            break;
          case 'maintenanceMessage':
            type = 'string';
            description = 'Message to display during maintenance';
            break;
          case 'maintenanceStartTime':
          case 'maintenanceEndTime':
            type = 'string';
            description = 'Maintenance schedule time';
            break;
        }

        return this.setSetting(key, value, type, description, updatedBy);
      });

      const results = await Promise.all(promises);
      return results.every(result => result === true);
    } catch (error) {
      console.error('Error setting multiple system settings:', error);
      return false;
    }
  }

  /**
   * Check if maintenance mode is enabled
   */
  static async isMaintenanceModeEnabled(): Promise<boolean> {
    try {
      const setting = await this.getSetting('maintenanceMode');
      return setting ? setting.settingValue === 'true' : false;
    } catch (error) {
      console.error('Error checking maintenance mode:', error);
      return false;
    }
  }

  /**
   * Get default system settings
   */
  static getDefaultSettings(): SystemSettingsData {
    return {
      maintenanceMode: false,
      autoBackup: true,
      debugMode: false,
      cacheEnabled: true,
      maintenanceMessage: 'ระบบอยู่ระหว่างการบำรุงรักษา กรุณากลับมาอีกครั้งในภายหลัง',
      maintenanceStartTime: '',
      maintenanceEndTime: '',
    };
  }

  /**
   * Initialize default system settings in database
   */
  static async initializeDefaultSettings(): Promise<boolean> {
    try {
      const defaults = this.getDefaultSettings();
      return await this.setSettings(defaults);
    } catch (error) {
      console.error('Error initializing default settings:', error);
      return false;
    }
  }
}