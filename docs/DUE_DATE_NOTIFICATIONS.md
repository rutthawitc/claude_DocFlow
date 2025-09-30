# Due Date Notification System

## Overview

The Due Date Notification System automatically monitors additional document due dates and sends Telegram notifications for documents that are overdue, due today, or approaching their deadline.

## Features

- **Automated Daily Checks**: Runs daily at 8:00 AM Thailand time
- **Smart Categorization**: Groups documents by urgency (overdue, today, soon)
- **Telegram Integration**: Sends formatted notifications via Telegram
- **Manual Triggers**: Admin/District managers can manually trigger notifications
- **Statistics Dashboard**: View real-time statistics about due dates

## Notification Categories

### 🔴 Overdue (เกินกำหนด)
- Documents past their due date
- High priority notifications
- Individual alerts sent for each overdue document
- Shows number of days overdue

### 🟠 Due Today (ครบกำหนดวันนี้)
- Documents due today
- Included in daily summary
- Urgent attention required

### 🟡 Soon (ใกล้ครบกำหนด)
- Documents due within 1-3 days
- Reminder notifications
- Helps prevent overdue situations

## Setup Instructions

### 1. Environment Variables

Add the following to your `.env` file:

```bash
# Required: Secret key for cron job authentication
CRON_SECRET=your-secure-random-secret-key

# Optional: Your application URL (for GitHub Actions)
APP_URL=https://your-app-domain.com

# Required: Telegram Bot Configuration (if not already set)
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_CHAT_ID=your-telegram-chat-id
```

**Generate CRON_SECRET:**
```bash
# Generate a secure random secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. GitHub Secrets Configuration

If using GitHub Actions for automated scheduling:

1. Go to your repository → Settings → Secrets and variables → Actions
2. Add the following secrets:
   - `CRON_SECRET`: Your cron secret key
   - `APP_URL`: Your application URL (e.g., https://docflow.example.com)

### 3. Database Setup

The system uses existing database tables:
- `documents` - Contains `additional_docs_due_dates` array
- `additional_document_files` - Contains `due_date` field

No additional database setup required.

## API Endpoints

### 1. Get Due Date Statistics

**Endpoint:** `GET /api/notifications/due-dates`

**Authentication:** Required (Admin or District Manager)

**Response:**
```json
{
  "success": true,
  "data": {
    "statistics": {
      "total": 25,
      "overdue": 3,
      "today": 2,
      "soon": 5,
      "onTime": 15
    }
  }
}
```

### 2. Manual Trigger Notifications

**Endpoint:** `POST /api/notifications/due-dates`

**Authentication:** Required (Admin or District Manager)

**Response:**
```json
{
  "success": true,
  "data": {
    "sent": 4,
    "overdue": 3,
    "today": 2,
    "soon": 5,
    "errors": []
  }
}
```

### 3. Cron Job Endpoint

**Endpoint:** `GET /api/cron/due-date-notifications`

**Authentication:** Bearer token (CRON_SECRET)

**Headers:**
```
Authorization: Bearer <CRON_SECRET>
```

**Response:**
```json
{
  "success": true,
  "timestamp": "2025-09-30T01:00:00.000Z",
  "duration": "1234ms",
  "results": {
    "sent": 4,
    "overdue": 3,
    "today": 2,
    "soon": 5,
    "errors": []
  }
}
```

## Scheduling Options

### Option 1: GitHub Actions (Recommended)

The workflow file `.github/workflows/due-date-notifications.yml` is pre-configured.

**Schedule:** Daily at 8:00 AM Thailand time (1:00 AM UTC)

**Manual Trigger:**
1. Go to Actions tab in GitHub
2. Select "Due Date Notifications"
3. Click "Run workflow"

### Option 2: External Cron Service

Use services like:
- **cron-job.org** (Free)
- **EasyCron** (Free tier available)
- **UptimeRobot** (Can be used as cron with HTTP monitoring)

**Configuration:**
- **URL:** `https://your-app.com/api/cron/due-date-notifications`
- **Method:** GET or POST
- **Schedule:** `0 1 * * *` (1:00 AM UTC = 8:00 AM ICT)
- **Headers:** `Authorization: Bearer YOUR_CRON_SECRET`

### Option 3: Vercel Cron Jobs

Add to `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/cron/due-date-notifications",
    "schedule": "0 1 * * *"
  }]
}
```

Note: Vercel cron jobs run in UTC timezone.

### Option 4: Manual Command (Development/Testing)

```bash
# Test the notification system
curl -X GET \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-app.com/api/cron/due-date-notifications
```

## Notification Format

### Summary Notification Example

```
📅 **สรุปเอกสารที่ต้องดำเนินการ**
━━━━━━━━━━━━━━━━━━━━

🔴 **เอกสารเกินกำหนด: 3 รายการ**
  • 55210-5/444 - สำเนาบัตรประชาชน
    สาขา: กปภ.สาขาขอนแก่น
    เกินมา 2 วัน

🟠 **เอกสารครบกำหนดวันนี้: 2 รายการ**
  • 55210-5/445 - ใบเสร็จรับเงิน
    สาขา: กปภ.สาขาบ้านไผ่

🟡 **เอกสารใกล้ครบกำหนด (1-3 วัน): 5 รายการ**
  • 55210-5/446 - หนังสือมอบอำนาจ
    สาขา: กปภ.สาขาชุมแพ
    เหลืออีก 2 วัน

📊 **รวมทั้งหมด: 10 รายการ**

💡 กรุณาดำเนินการตรวจสอบและอัพโหลดเอกสารให้ครบถ้วน
```

### Individual Overdue Notification Example

```
🚨 **เอกสารเกินกำหนดส่ง**
━━━━━━━━━━━━━━━━━━━━

📄 **เลขที่หนังสือ:** 55210-5/444
📋 **เรื่อง:** ขอเบิกค่าใช้จ่ายโครงการ...
🏢 **สาขา:** กปภ.สาขาขอนแก่น
📎 **เอกสารที่ต้องส่ง:** สำเนาบัตรประชาชน
⏰ **เกินกำหนดมาแล้ว:** 2 วัน

⚠️ **กรุณาดำเนินการอัพโหลดเอกสารโดยด่วน**
```

## Monitoring & Logs

### View Notification Logs

Check application logs for notification activity:

```bash
# Docker logs
docker-compose logs -f app | grep "due date"

# Or filter for specific events
docker-compose logs app | grep "notification"
```

### Check Statistics

Use the API endpoint or create a dashboard page:

```bash
curl -X GET \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  https://your-app.com/api/notifications/due-dates
```

## Troubleshooting

### Notifications Not Sending

1. **Check Telegram Configuration:**
   ```bash
   # Test Telegram connection
   curl -X POST https://your-app.com/api/telegram/test-connection
   ```

2. **Verify CRON_SECRET:**
   ```bash
   # Test cron endpoint
   curl -X GET \
     -H "Authorization: Bearer YOUR_CRON_SECRET" \
     https://your-app.com/api/cron/due-date-notifications
   ```

3. **Check Database:**
   ```sql
   -- Check documents with due dates
   SELECT
     d.id,
     d.mt_number,
     adf.item_name,
     adf.due_date,
     adf.is_verified
   FROM additional_document_files adf
   JOIN documents d ON adf.document_id = d.id
   WHERE adf.due_date IS NOT NULL
   AND (adf.is_verified IS NULL OR adf.is_verified = false)
   ORDER BY adf.due_date;
   ```

### GitHub Action Fails

1. Check GitHub Secrets are set correctly
2. Verify APP_URL is accessible
3. Check workflow logs in Actions tab
4. Ensure CRON_SECRET matches between app and GitHub

### No Documents in Notifications

This is normal if:
- All documents are verified as correct
- No documents have due dates set
- All documents are well ahead of their due dates (4+ days)

## Testing

### Manual Test

```bash
# 1. Trigger notifications manually
curl -X POST \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  https://your-app.com/api/notifications/due-dates

# 2. Check statistics
curl -X GET \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  https://your-app.com/api/notifications/due-dates
```

### Create Test Data

```sql
-- Create a test document with overdue additional document
-- (Run this in your database to test notifications)

-- Get a test document ID
SELECT id FROM documents LIMIT 1;

-- Update due date to yesterday for testing
UPDATE additional_document_files
SET due_date = CURRENT_DATE - INTERVAL '1 day',
    is_verified = NULL
WHERE document_id = <YOUR_TEST_DOCUMENT_ID>
AND item_index = 0;

-- Then trigger notifications to see the result
```

## Performance Considerations

- **Query Optimization**: Uses indexed columns (due_date, is_verified)
- **Batch Processing**: Groups notifications to avoid rate limits
- **Error Handling**: Continues processing even if individual notifications fail
- **Caching**: Statistics can be cached for dashboard displays

## Security

- **Authentication**: Cron endpoint protected by CRON_SECRET
- **Authorization**: Manual triggers require admin/district_manager roles
- **Rate Limiting**: API endpoints have rate limiting enabled
- **Secure Secrets**: Never commit CRON_SECRET to repository

## Future Enhancements

Potential improvements:
- Email notifications in addition to Telegram
- Custom notification schedules per branch
- SMS notifications for critical overdue documents
- Dashboard widget showing due date statistics
- Export overdue reports to PDF/Excel
- Escalation notifications for severely overdue items

## Support

For issues or questions:
1. Check application logs
2. Review this documentation
3. Test individual components (Telegram, API endpoints)
4. Contact system administrator

---

**Last Updated:** September 30, 2025
**Version:** 1.0.0