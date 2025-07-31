# DocFlow Automatic Backup System

## Overview
The DocFlow Automatic Backup System provides robust, configurable, and reliable backup management for the entire application ecosystem. This comprehensive system ensures data integrity, allows flexible configuration, and provides detailed monitoring capabilities.

## 1. Backup Scheduler Service (`BackupSchedulerService`)

### Core Capabilities
- **Automatic Daily Scheduling**: Configurable backup time with default at 02:00
- **Flexible Retention Management**: Configurable retention period (1-365 days)
- **Comprehensive Job Tracking**: Detailed backup job history and monitoring
- **Server-Side Execution**: Secure, environment-aware backup initialization

### Configuration Parameters
```typescript
interface BackupSchedulerConfig {
  autoBackup: boolean;           // Enable/disable automatic backups
  autoBackupTime: string;        // Backup execution time (HH:mm format)
  backupRetentionDays: number;   // Days to retain backup files (1-365)
}
```

### Scheduling Mechanism
```typescript
class BackupSchedulerService {
  private scheduleBackup(time: string) {
    // Calculate next backup time
    const [hours, minutes] = time.split(':').map(Number);
    const now = new Date();
    const nextBackupTime = new Date(
      now.getFullYear(), 
      now.getMonth(), 
      now.getDate(), 
      hours, 
      minutes
    );

    // Adjust if time has passed today
    if (nextBackupTime <= now) {
      nextBackupTime.setDate(nextBackupTime.getDate() + 1);
    }

    // Schedule next backup
    const delay = nextBackupTime.getTime() - now.getTime();
    setTimeout(() => {
      this.performBackup();
      // Reschedule for next day
      this.scheduleBackup(time);
    }, delay);
  }
}
```

## 2. API Endpoints

### Backup Schedule Management
- `GET /api/backup/schedule`
  - Retrieve current backup schedule configuration
  - Returns `BackupSchedulerConfig`

- `PUT /api/backup/schedule`
  - Update backup schedule configuration
  - Requires admin permissions
  - Validates and applies new configuration

- `POST /api/backup/schedule/trigger`
  - Manually trigger an immediate backup
  - Bypasses scheduled time
  - Requires admin permissions

### Backup History
- `GET /api/backup/history`
  - Retrieve comprehensive backup job history
  - Supports pagination and filtering
  - Returns backup job details:
    ```typescript
    interface BackupJobRecord {
      id: string;
      timestamp: Date;
      status: 'success' | 'failed' | 'partial';
      duration: number;
      fileSize: number;
      errorMessage?: string;
    }
    ```

### Scheduler Initialization
- `GET /api/backup/init`
  - Check backup scheduler status
  - Verify initialization requirements

- `POST /api/backup/init`
  - Force reinitialization of backup scheduler
  - Useful for recovering from configuration errors

## 3. User Interface Components

### BackupInitializer
```tsx
function BackupInitializer() {
  return (
    <Card>
      <CardHeader>
        <h2>Backup Management</h2>
        <StatusIndicator 
          status={backupSchedulerStatus} 
          // Possible statuses: Running, Disabled, Stopped
        />
      </CardHeader>
      <CardContent>
        <BackupScheduleForm 
          onSubmit={updateBackupConfiguration} 
        />
        <BackupHistoryTable />
        <ManualBackupButton />
      </CardContent>
    </Card>
  );
}
```

## 4. System Integration

### Configuration Management
- Integrated with `SystemSettingsService`
- Persistent configuration storage
- Real-time configuration updates

### Notification System
- Telegram alerts for:
  - Backup start
  - Successful backup completion
  - Backup failures
  - Configuration changes

## 5. Technical Implementation Details

### Backup Execution Workflow
1. Validate system readiness
2. Prepare backup directories
3. Execute database and file system backup
4. Compress and encrypt backup
5. Store backup with timestamp
6. Clean up old backups based on retention policy
7. Log backup job details
8. Send notification

### Error Handling and Resilience
- Graceful failure modes
- Comprehensive error logging
- Automatic recovery mechanisms
- Configurable retry strategies

## 6. Configuration Best Practices

### Recommended Settings
```json
{
  "autoBackup": true,
  "autoBackupTime": "02:00",
  "backupRetentionDays": 30,
  "backupEncryptionEnabled": true
}
```

## 7. Troubleshooting Guide

### Common Issues
- **Backup Failed**: Check system logs, verify permissions
- **Scheduler Not Running**: Reinitialize via API
- **Retention Policy Not Working**: Verify configuration

### Debugging Steps
1. Check system settings
2. Verify file system permissions
3. Review backup job history
4. Check Telegram notification logs

## 8. Security Considerations
- Encrypted backup storage
- Access-controlled backup management
- Secure file handling
- Comprehensive audit logging

## 9. Performance Optimization
- Incremental backup support
- Parallel backup processing
- Configurable compression levels

## Appendix: Environment Variables
```
BACKUP_STORAGE_PATH=/path/to/backups
BACKUP_MAX_PARALLEL_JOBS=2
BACKUP_ENCRYPTION_KEY=your-secure-key
```