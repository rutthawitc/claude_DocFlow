# Telegram API Documentation

This document provides comprehensive documentation for the Telegram notification system API endpoints in DocFlow.

## Overview

The Telegram API enables real-time notifications for document workflow events including uploads, status changes, and system alerts. All endpoints require authentication and appropriate permissions.

## Authentication

All Telegram API endpoints require:
- Valid authentication session
- Admin or district_manager role (except for system alerts which may have different requirements)
- Rate limiting applies to all endpoints

## Rate Limiting

- **API Rate Limit**: 100 requests per 15 minutes per IP
- **Login Rate Limit**: 5 attempts per 15 minutes per IP (for auth endpoints)

## Endpoints

### 1. Test Bot Connection

Test the validity of a Telegram bot token by attempting to connect and retrieve bot information.

**Endpoint:** `POST /api/telegram/test-connection`

**Authentication:** Required (Admin/District Manager)

**Request Body:**
```json
{
  "botToken": "123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZ"
}
```

**Response - Success:**
```json
{
  "success": true,
  "botInfo": {
    "id": 123456789,
    "is_bot": true,
    "first_name": "DocFlow Bot",
    "username": "docflow_bot",
    "can_join_groups": true,
    "can_read_all_group_messages": false,
    "supports_inline_queries": false
  }
}
```

**Response - Error:**
```json
{
  "success": false,
  "error": "Unauthorized to use bot token"
}
```

**Rate Limiting Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1640995200
```

---

### 2. Send Test Message

Send a test message to verify chat configuration and bot permissions.

**Endpoint:** `POST /api/telegram/test-message`

**Authentication:** Required (Admin/District Manager)

**Request Body:**
```json
{
  "botToken": "123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  "chatId": "-1001234567890"
}
```

**Response - Success:**
```json
{
  "success": true,
  "messageId": 123
}
```

**Response - Error:**
```json
{
  "success": false,
  "error": "Chat not found"
}
```

---

### 3. Send System Alert

Send a system alert notification to the configured Telegram chat.

**Endpoint:** `POST /api/telegram/system-alert`

**Authentication:** Required (Admin/District Manager)

**Request Body:**
```json
{
  "title": "System Maintenance",
  "message": "DocFlow will be undergoing maintenance from 2:00 AM to 4:00 AM",
  "severity": "warning"
}
```

**Parameters:**
- `title` (string, required): Alert title
- `message` (string, required): Alert message content
- `severity` (string, optional): Alert severity level - `"info"`, `"warning"`, or `"error"` (default: `"info"`)

**Response - Success:**
```json
{
  "success": true,
  "message": "System alert sent successfully"
}
```

**Response - Error:**
```json
{
  "success": false,
  "error": "Failed to send system alert"
}
```

---

### 4. Get Telegram Settings

Retrieve current Telegram notification settings.

**Endpoint:** `GET /api/telegram/settings`

**Authentication:** Required (Admin/District Manager)

**Response - Success:**
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "botToken": "123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    "defaultChatId": "-1001234567890",
    "notifications": {
      "documentUploaded": true,
      "documentSent": true,
      "documentAcknowledged": true,
      "documentSentBack": true,
      "systemAlerts": false,
      "dailyReports": true
    },
    "messageFormat": {
      "includeUserName": true,
      "includeBranchName": true,
      "includeTimestamp": true
    }
  }
}
```

**Response - No Settings:**
```json
{
  "success": true,
  "data": null
}
```

---

### 5. Save Telegram Settings

Save or update Telegram notification settings.

**Endpoint:** `POST /api/telegram/settings`

**Authentication:** Required (Admin/District Manager)

**Request Body:**
```json
{
  "enabled": true,
  "botToken": "123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  "defaultChatId": "-1001234567890",
  "notifications": {
    "documentUploaded": true,
    "documentSent": true,
    "documentAcknowledged": true,
    "documentSentBack": true,
    "systemAlerts": false,
    "dailyReports": true
  },
  "messageFormat": {
    "includeUserName": true,
    "includeBranchName": true,
    "includeTimestamp": true
  }
}
```

**Validation Rules:**
- `enabled` (boolean, required): Master enable/disable toggle
- `botToken` (string, required if enabled): Valid Telegram bot token format
- `defaultChatId` (string, required if enabled): Valid chat ID or username
- `notifications` (object, required): Notification type preferences
- `messageFormat` (object, required): Message formatting preferences

**Response - Success:**
```json
{
  "success": true,
  "message": "Telegram settings saved successfully"
}
```

**Response - Validation Error:**
```json
{
  "success": false,
  "error": "Bot token and chat ID are required when enabled"
}
```

---

## Automatic Notifications

The following endpoints automatically trigger Telegram notifications when enabled:

### Document Upload
- **Endpoint:** `POST /api/documents`
- **Trigger:** When a document is successfully uploaded
- **Notification Type:** `documentUploaded`

### Document Status Update
- **Endpoint:** `PATCH /api/documents/[id]/status`
- **Triggers:** When document status changes to:
  - `sent_to_branch` → `documentSent` notification
  - `acknowledged` → `documentAcknowledged` notification
  - `sent_back_to_district` → `documentSentBack` notification

## Error Handling

All endpoints follow consistent error response format:

```json
{
  "success": false,
  "error": "Error message",
  "message": "Detailed error description (optional)"
}
```

### Common Error Codes

| HTTP Status | Error Type | Description |
|-------------|------------|-------------|
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 400 | Bad Request | Invalid request body or parameters |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |

## Bot Token Validation

Bot tokens must follow Telegram's format:
- Format: `{bot_id}:{bot_token}`
- Example: `123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZ`
- Bot ID must be numeric
- Token part must be at least 20 characters

## Chat ID Validation

Chat IDs can be in the following formats:
- **Numeric ID** (positive for users, negative for groups): `-1001234567890`
- **Username** (with @ prefix): `@channelname`
- **Group/Channel ID**: Negative numbers for groups and channels

## Message Format

Telegram notifications are formatted as follows:

```
🔔 DocFlow Notification

{emoji} เอกสาร {mtNumber} {action}
📝 เรื่อง: {subject}
🏢 สาขา: {branchName} (if includeBranchName)
👤 โดย: {userFullName} (if includeUserName)
💬 หมายเหตุ: {comment} (if comment exists)
🕒 เวลา: {timestamp} (if includeTimestamp)

🔗 เอกสาร ID: {documentId}
```

### Action Emojis and Text

| Action | Emoji | Thai Text |
|--------|-------|-----------|
| uploaded | 📄 | ถูกอัปโหลดใหม่ |
| sent | 📤 | ส่งไปยังสาขาแล้ว |
| acknowledged | ✅ | ได้รับการรับทราบจากสาขา |
| sent_back | 🔄 | ถูกส่งกลับจากสาขา |

## Settings Persistence

Settings are stored in `./tmp/telegram-settings.json` with the following structure:

```json
{
  "enabled": true,
  "botToken": "encrypted_or_plain_token",
  "defaultChatId": "-1001234567890",
  "notifications": {
    "documentUploaded": true,
    "documentSent": true,
    "documentAcknowledged": true,
    "documentSentBack": true,
    "systemAlerts": false,
    "dailyReports": true
  },
  "messageFormat": {
    "includeUserName": true,
    "includeBranchName": true,
    "includeTimestamp": true
  }
}
```

## Security Considerations

1. **Token Security**: Bot tokens should be treated as secrets
2. **Access Control**: Only admin and district_manager roles can modify settings
3. **Rate Limiting**: All endpoints are rate-limited to prevent abuse
4. **Error Handling**: Notification failures don't break document operations
5. **Input Validation**: All inputs are validated using Zod schemas
6. **File Permissions**: Settings file should have restricted read/write permissions

## Settings Workflow and Best Practices

### Save-Then-Test Workflow ⭐ IMPORTANT

The Telegram notification system uses a **save-then-test** workflow to ensure reliability:

1. **Modify Settings in UI**: Change notification preferences, bot token, chat ID, etc.
2. **Save Settings**: Click "บันทึกการตั้งค่า Telegram" to persist changes to backend
3. **Test Functionality**: Use test buttons to verify notifications work with saved settings

#### Why This Workflow?

- **Settings Persistence**: Test functions use saved settings from `tmp/telegram-settings.json`, not UI state
- **Reliability**: Prevents accidental notifications from unsaved changes
- **Consistency**: All notification operations use the same committed settings
- **Error Prevention**: Ensures UI state matches backend configuration

#### Common Issue and Resolution

**Problem**: Test shows "200 OK" but no message sent
```
POST /api/telegram/system-alert 200 in 3927ms, has no message sent to telegram.
```

**Cause**: UI shows system alerts enabled but settings file has `"systemAlerts": false`

**Solution**:
1. ✅ Verify toggle states in UI
2. ❌ **Click "บันทึกการตั้งค่า Telegram"** (this step is often missed)
3. ✅ Test system alert functionality

#### Settings UI Organization

The settings page now has improved organization:
- **Section-Specific Saves**: Each settings section has its own save button
- **Clear Labeling**: "บันทึกการตั้งค่า Telegram" vs "บันทึกการตั้งค่าระบบ"
- **Consistent Design**: Full-width buttons with proper loading states
- **Better UX**: No confusion about which settings are being saved

---

## Usage Examples

### Setting up Telegram Notifications

1. **Create a Telegram Bot:**
   - Message @BotFather on Telegram
   - Use `/newbot` command
   - Get your bot token

2. **Get Chat ID:**
   - Add bot to your group/channel
   - Send a message mentioning the bot
   - Use Telegram Bot API to get updates and find chat ID

3. **Configure in DocFlow:**
   - Go to `/settings` page
   - Enable Telegram notifications
   - Enter bot token and chat ID
   - Configure notification preferences
   - Test connection and messages

### Testing the Setup

```bash
# Test bot connection
curl -X POST http://localhost:3000/api/telegram/test-connection \
  -H "Content-Type: application/json" \
  -d '{"botToken": "YOUR_BOT_TOKEN"}'

# Send test message
curl -X POST http://localhost:3000/api/telegram/test-message \
  -H "Content-Type: application/json" \
  -d '{"botToken": "YOUR_BOT_TOKEN", "chatId": "YOUR_CHAT_ID"}'
```

## Troubleshooting

### Common Issues

1. **Bot not responding:**
   - Verify bot token is correct
   - Ensure bot is not blocked
   - Check bot permissions in the chat

2. **Chat not found:**
   - Verify chat ID format
   - Ensure bot is added to the group/channel
   - Check if chat exists and is accessible

3. **Permission denied:**
   - Verify user has admin or district_manager role
   - Check authentication status
   - Ensure session is valid

4. **Rate limit exceeded:**
   - Wait for rate limit reset
   - Implement exponential backoff
   - Check rate limit headers in response

For additional support, check the application logs and verify all environment variables are properly configured.