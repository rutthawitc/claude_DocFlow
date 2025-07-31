import { BackupSchedulerService } from './services/backup-scheduler-service';

/**
 * Initialize application services
 * This should be called when the application starts
 */
export async function initializeApp() {
  try {
    console.log('Initializing DocFlow application services...');
    
    // Initialize backup scheduler
    await BackupSchedulerService.initialize();
    
    console.log('DocFlow application services initialized successfully');
    
  } catch (error) {
    console.error('Error initializing application services:', error);
    // Don't throw the error to prevent app from crashing
    // Services can be retried later
  }
}

/**
 * Cleanup application services
 * This should be called when the application is shutting down
 */
export function cleanupApp() {
  try {
    console.log('Cleaning up DocFlow application services...');
    
    // Clear scheduled backup jobs
    BackupSchedulerService.clearScheduledJobs();
    
    console.log('DocFlow application services cleaned up successfully');
    
  } catch (error) {
    console.error('Error cleaning up application services:', error);
  }
}

// Handle process termination signals
if (typeof process !== 'undefined') {
  process.on('SIGINT', () => {
    console.log('Received SIGINT, cleaning up...');
    cleanupApp();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, cleaning up...');
    cleanupApp();
    process.exit(0);
  });
}