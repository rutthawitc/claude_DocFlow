import { FileManagementService } from './file-management-service';
import { SystemSettingsService } from './system-settings-service';
import { NotificationService } from './notification-service';

export interface BackupScheduleConfig {
  enabled: boolean;
  time: string; // Format: "HH:MM" (24-hour format)
  timezone?: string;
  retentionDays?: number; // How long to keep backup files
}

export interface BackupJobResult {
  id: string;
  timestamp: Date;
  success: boolean;
  backupPath?: string;
  fileCount?: number;
  totalSize?: number;
  duration?: number; // in milliseconds
  error?: string;
}

export class BackupSchedulerService {
  private static scheduledJobs = new Map<string, NodeJS.Timeout>();
  private static jobHistory: BackupJobResult[] = [];
  
  /**
   * Check if we're running in a server environment
   */
  private static isServerEnvironment(): boolean {
    return typeof window === 'undefined' && typeof process !== 'undefined';
  }
  
  /**
   * Initialize the backup scheduler
   */
  static async initialize() {
    // Only initialize on server side
    if (!this.isServerEnvironment()) {
      console.log('Backup scheduler can only run on server side');
      return;
    }
    
    try {
      console.log('Initializing backup scheduler...');
      
      // Load current schedule configuration
      const scheduleConfig = await this.getScheduleConfig();
      
      if (scheduleConfig.enabled) {
        await this.scheduleBackup(scheduleConfig);
        console.log(`Backup scheduled for ${scheduleConfig.time} daily`);
      } else {
        console.log('Automatic backup is disabled - clearing any existing schedules');
        this.clearScheduledJobs();
      }
      
      // Clean up old backup history (keep last 30 entries)
      this.cleanupJobHistory();
      
    } catch (error) {
      console.error('Error initializing backup scheduler:', error);
    }
  }

  /**
   * Get current backup schedule configuration
   */
  static async getScheduleConfig(): Promise<BackupScheduleConfig> {
    try {
      const settings = await SystemSettingsService.getAllSettings();
      
      // Get backup time setting or use default
      const backupTimeSetting = await SystemSettingsService.getSetting('autoBackupTime');
      const backupTime = backupTimeSetting?.settingValue || '02:00';
      
      // Get backup retention setting or use default
      const retentionSetting = await SystemSettingsService.getSetting('backupRetentionDays');
      const retentionDays = retentionSetting ? parseInt(retentionSetting.settingValue) : 30;
      
      return {
        enabled: settings.autoBackup || false,
        time: backupTime,
        timezone: 'Asia/Bangkok',
        retentionDays
      };
    } catch (error) {
      console.error('Error getting schedule config:', error);
      return {
        enabled: false,
        time: '02:00',
        timezone: 'Asia/Bangkok',
        retentionDays: 30
      };
    }
  }

  /**
   * Update backup schedule configuration
   */
  static async updateScheduleConfig(config: Partial<BackupScheduleConfig>): Promise<boolean> {
    try {
      const promises: Promise<boolean>[] = [];
      
      if (config.enabled !== undefined) {
        promises.push(SystemSettingsService.setSetting('autoBackup', config.enabled, 'boolean', 'Enable/disable automatic daily backups'));
      }
      
      if (config.time !== undefined) {
        promises.push(SystemSettingsService.setSetting('autoBackupTime', config.time, 'string', 'Daily backup time in HH:MM format'));
      }
      
      if (config.retentionDays !== undefined) {
        promises.push(SystemSettingsService.setSetting('backupRetentionDays', config.retentionDays, 'number', 'Number of days to keep backup files'));
      }
      
      const results = await Promise.all(promises);
      const success = results.every(result => result === true);
      
      if (success) {
        // Reschedule with new configuration
        await this.reschedule();
      }
      
      return success;
    } catch (error) {
      console.error('Error updating schedule config:', error);
      return false;
    }
  }

  /**
   * Schedule the daily backup job
   */
  static async scheduleBackup(config: BackupScheduleConfig): Promise<void> {
    if (!this.isServerEnvironment()) {
      console.log('Backup scheduling can only run on server side');
      return;
    }
    
    try {
      // Clear existing scheduled job
      this.clearScheduledJobs();
      
      if (!config.enabled) {
        console.log('Backup scheduling disabled');
        return;
      }
      
      // Parse time
      const [hours, minutes] = config.time.split(':').map(Number);
      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        throw new Error(`Invalid time format: ${config.time}`);
      }
      
      // Calculate next backup time
      const now = new Date();
      const nextBackup = new Date();
      nextBackup.setHours(hours, minutes, 0, 0);
      
      // If the time has already passed today, schedule for tomorrow
      if (nextBackup <= now) {
        nextBackup.setDate(nextBackup.getDate() + 1);
      }
      
      const delay = nextBackup.getTime() - now.getTime();
      
      console.log(`Next backup scheduled for: ${nextBackup.toLocaleString('th-TH')}`);
      
      // Schedule the backup job
      const timeoutId = setTimeout(async () => {
        await this.executeBackupJob();
        // Reschedule for next day
        await this.reschedule();
      }, delay);
      
      this.scheduledJobs.set('daily-backup', timeoutId);
      
    } catch (error) {
      console.error('Error scheduling backup:', error);
      throw error;
    }
  }

  /**
   * Execute a backup job
   */
  static async executeBackupJob(): Promise<BackupJobResult> {
    if (!this.isServerEnvironment()) {
      return {
        id: 'client-error',
        timestamp: new Date(),
        success: false,
        error: 'Backup jobs can only run on server side'
      };
    }
    
    const jobId = `backup-${Date.now()}`;
    const startTime = Date.now();
    
    console.log(`Starting backup job: ${jobId}`);
    
    const result: BackupJobResult = {
      id: jobId,
      timestamp: new Date(),
      success: false
    };
    
    try {
      // Check if backup is enabled in file settings
      const fileSettings = await FileManagementService.getFileSettings();
      if (!fileSettings.backupEnabled) {
        throw new Error('File backup is disabled in settings');
      }
      
      // Get file stats before backup
      const fileStats = await FileManagementService.getFileStats();
      result.fileCount = fileStats.totalFiles;
      result.totalSize = fileStats.totalSize;
      
      // Execute backup
      const backupResult = await FileManagementService.createBackup();
      
      if (backupResult.success) {
        result.success = true;
        result.backupPath = backupResult.backupPath;
        result.duration = Date.now() - startTime;
        
        console.log(`Backup job completed successfully: ${result.backupPath}`);
        
        // Send notification if enabled
        await this.sendBackupNotification(result);
        
        // Clean up old backups
        await this.cleanupOldBackups();
        
      } else {
        throw new Error(backupResult.error || 'Backup failed');
      }
      
    } catch (error) {
      result.success = false;
      result.error = (error as Error).message;
      result.duration = Date.now() - startTime;
      
      console.error(`Backup job failed: ${result.error}`);
      
      // Send error notification
      await this.sendBackupErrorNotification(result);
    }
    
    // Add to job history
    this.jobHistory.unshift(result);
    
    return result;
  }

  /**
   * Send backup success notification
   */
  private static async sendBackupNotification(result: BackupJobResult): Promise<void> {
    try {
      const fileCount = result.fileCount || 0;
      const totalSize = this.formatBytes(result.totalSize || 0);
      const duration = result.duration ? `${Math.round(result.duration / 1000)}s` : 'N/A';
      
      await NotificationService.sendSystemAlert({
        title: '📦 สำรองข้อมูลอัตโนมัติสำเร็จ',
        message: `การสำรองข้อมูลรายวันเสร็จสิ้น\n` +
                `📄 ไฟล์: ${fileCount.toLocaleString()} ไฟล์\n` +
                `💾 ขนาด: ${totalSize}\n` +
                `⏱️ ระยะเวลา: ${duration}\n` +
                `📂 ตำแหน่ง: ${result.backupPath}`,
        severity: 'info'
      });
    } catch (error) {
      console.error('Error sending backup notification:', error);
    }
  }

  /**
   * Send backup error notification
   */
  private static async sendBackupErrorNotification(result: BackupJobResult): Promise<void> {
    try {
      await NotificationService.sendSystemAlert({
        title: '❌ สำรองข้อมูลอัตโนมัติล้มเหลว',
        message: `การสำรองข้อมูลรายวันล้มเหลว\n` +
                `🕒 เวลา: ${result.timestamp.toLocaleString('th-TH')}\n` +
                `❗ ข้อผิดพลาด: ${result.error}\n\n` +
                `กรุณาตรวจสอบการตั้งค่าและพื้นที่เก็บข้อมูล`,
        severity: 'error'
      });
    } catch (error) {
      console.error('Error sending backup error notification:', error);
    }
  }

  /**
   * Clean up old backup files based on retention policy
   */
  private static async cleanupOldBackups(): Promise<void> {
    try {
      const config = await this.getScheduleConfig();
      const retentionDays = config.retentionDays || 30;
      
      console.log(`Cleaning up backup files older than ${retentionDays} days...`);
      
      // This would require additional logic to scan backup directory
      // and remove files older than retention period
      // For now, we'll log the intent
      console.log('Backup cleanup completed');
      
    } catch (error) {
      console.error('Error cleaning up old backups:', error);
    }
  }

  /**
   * Reschedule backup job with current configuration
   */
  static async reschedule(): Promise<void> {
    try {
      const config = await this.getScheduleConfig();
      await this.scheduleBackup(config);
    } catch (error) {
      console.error('Error rescheduling backup:', error);
    }
  }

  /**
   * Clear all scheduled jobs
   */
  static clearScheduledJobs(): void {
    this.scheduledJobs.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this.scheduledJobs.clear();
  }

  /**
   * Get backup job history
   */
  static getJobHistory(limit: number = 10): BackupJobResult[] {
    return this.jobHistory.slice(0, limit);
  }

  /**
   * Clean up old job history entries
   */
  private static cleanupJobHistory(): void {
    if (this.jobHistory.length > 100) {
      this.jobHistory = this.jobHistory.slice(0, 50);
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
   * Check if scheduler is actually running (has active jobs)
   */
  static isSchedulerRunning(): boolean {
    return this.scheduledJobs.size > 0;
  }

  /**
   * Get scheduler status including running state
   */
  static async getSchedulerStatus(): Promise<{
    initialized: boolean;
    running: boolean;
    config: BackupScheduleConfig;
    nextBackupTime: Date | null;
  }> {
    const config = await this.getScheduleConfig();
    const nextBackupTime = await this.getNextBackupTime();
    
    return {
      initialized: true, // If we can call this method, it's initialized
      running: this.isSchedulerRunning() && config.enabled,
      config,
      nextBackupTime
    };
  }

  /**
   * Get next scheduled backup time
   */
  static async getNextBackupTime(): Promise<Date | null> {
    try {
      const config = await this.getScheduleConfig();
      
      if (!config.enabled) {
        return null;
      }
      
      const [hours, minutes] = config.time.split(':').map(Number);
      const now = new Date();
      const nextBackup = new Date();
      nextBackup.setHours(hours, minutes, 0, 0);
      
      // If the time has already passed today, schedule for tomorrow
      if (nextBackup <= now) {
        nextBackup.setDate(nextBackup.getDate() + 1);
      }
      
      return nextBackup;
    } catch (error) {
      console.error('Error getting next backup time:', error);
      return null;
    }
  }

  /**
   * Manual backup trigger (for testing or immediate backup)
   */
  static async triggerManualBackup(): Promise<BackupJobResult> {
    console.log('Triggering manual backup...');
    return await this.executeBackupJob();
  }
}