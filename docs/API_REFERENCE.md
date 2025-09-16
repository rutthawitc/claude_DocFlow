# 🔗 DocFlow API Reference

## คู่มือการใช้งาน API สำหรับนักพัฒนา

เอกสารนี้ครอบคลุม REST API ทั้งหมดของระบบ DocFlow พร้อมตัวอย่างการใช้งาน

---

## 🔐 Authentication

### Overview
DocFlow ใช้ **NextAuth.js v5** สำหรับการยืนยันตัวตน และ **JWT Bearer Token** สำหรับ API Authentication

### Getting API Token
```bash
# Login to get session cookie
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"username": "your_username", "password": "your_password"}'

# Extract token from session (for programmatic access)
curl -X GET http://localhost:3000/api/auth/session \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

### API Request Headers
```bash
# Required headers for API calls
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
X-Requested-With: XMLHttpRequest
```

---

## 📄 Documents API

### Base URL: `/api/documents`

#### 1. Upload Document
**POST** `/api/documents`

**Headers:**
```bash
Content-Type: multipart/form-data
```

**Request Body (FormData):**
```javascript
{
  "file": File,                    // PDF file (max 10MB)
  "branchBaCode": 1060,           // Branch BA code
  "mtNumber": "MT001-2024",       // Document number
  "mtDate": "2024-01-15",         // Document date (YYYY-MM-DD)
  "subject": "เรื่องทดสอบ",        // Document subject
  "monthYear": "มกราคม 2567",     // Month/Year in Thai
  "docReceivedDate": "2024-01-16", // Optional: received date
  "hasAdditionalDocs": true,       // Boolean: has additional documents
  "additionalDocsCount": 2,        // Number of additional docs
  "additionalDocs": ["เอกสาร 1", "เอกสาร 2"], // Array of descriptions
  "action": "send"                 // "save" or "send"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "mtNumber": "MT001-2024",
    "status": "sent_to_branch",
    "branchBaCode": 1060,
    "filePath": "/uploads/documents/123.pdf",
    "createdAt": "2024-01-16T10:30:00Z"
  },
  "message": "Document uploaded successfully"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/documents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@document.pdf" \
  -F "branchBaCode=1060" \
  -F "mtNumber=MT001-2024" \
  -F "mtDate=2024-01-15" \
  -F "subject=เรื่องทดสอบ" \
  -F "monthYear=มกราคม 2567" \
  -F "action=send"
```

#### 2. Get Documents List
**GET** `/api/documents`

**Query Parameters:**
```bash
search?           string    # Search in mtNumber or subject
status?           string    # "all", "draft", "sent_to_branch", etc.
page?             number    # Page number (default: 1)
limit?            number    # Items per page (default: 20, max: 100)
dateFrom?         string    # Start date (YYYY-MM-DD)
dateTo?           string    # End date (YYYY-MM-DD)
sortBy?           string    # "uploadDate", "mtDate", "subject", "status"
sortOrder?        string    # "asc", "desc"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": 123,
        "mtNumber": "MT001-2024",
        "subject": "เรื่องทดสอบ",
        "status": "sent_to_branch",
        "branchBaCode": 1060,
        "branch": {
          "name": "กปภ.สาขาขอนแก่น(ชั้นพิเศษ)"
        },
        "uploader": {
          "username": "john.doe",
          "firstName": "John",
          "lastName": "Doe"
        },
        "commentCount": 3,
        "createdAt": "2024-01-16T10:30:00Z"
      }
    ],
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```

**Example:**
```bash
curl -X GET "http://localhost:3000/api/documents?search=MT001&status=sent_to_branch&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 3. Get Document by ID
**GET** `/api/documents/[id]`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "mtNumber": "MT001-2024",
    "subject": "เรื่องทดสอบ",
    "status": "sent_to_branch",
    "branchBaCode": 1060,
    "filePath": "/uploads/documents/123.pdf",
    "originalFilename": "document.pdf",
    "hasAdditionalDocs": true,
    "additionalDocsCount": 2,
    "additionalDocs": ["เอกสาร 1", "เอกสาร 2"],
    "branch": {
      "id": 1,
      "name": "กปภ.สาขาขอนแก่น(ชั้นพิเศษ)",
      "baCode": 1060
    },
    "uploader": {
      "username": "john.doe",
      "firstName": "John",
      "lastName": "Doe"
    },
    "comments": [
      {
        "comment": {
          "id": 456,
          "content": "กรุณาตรวจสอบข้อมูล",
          "createdAt": "2024-01-16T11:00:00Z"
        },
        "user": {
          "username": "jane.smith",
          "firstName": "Jane",
          "lastName": "Smith"
        }
      }
    ],
    "statusHistory": [
      {
        "fromStatus": "draft",
        "toStatus": "sent_to_branch",
        "createdAt": "2024-01-16T10:30:00Z",
        "changedByUser": {
          "username": "john.doe"
        }
      }
    ],
    "createdAt": "2024-01-16T10:30:00Z"
  }
}
```

**Example:**
```bash
curl -X GET http://localhost:3000/api/documents/123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 4. Update Document
**PATCH** `/api/documents/[id]`

**Request Body:**
```json
{
  "mtNumber": "MT001-2024-UPDATED",
  "subject": "เรื่องทดสอบ (แก้ไข)",
  "hasAdditionalDocs": false,
  "additionalDocsCount": 0,
  "additionalDocs": []
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "mtNumber": "MT001-2024-UPDATED",
    "subject": "เรื่องทดสอบ (แก้ไข)"
  },
  "message": "Document updated successfully"
}
```

#### 5. Update Document Status
**PATCH** `/api/documents/[id]/status`

**Request Body:**
```json
{
  "status": "acknowledged",
  "comment": "ได้รับทราบแล้ว"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "status": "acknowledged",
    "statusHistory": [...]
  },
  "message": "Document status updated successfully"
}
```

#### 6. Delete Document
**DELETE** `/api/documents/[id]`

**Response:**
```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

#### 7. Download Document
**GET** `/api/documents/[id]/download`

**Response:**
- **Content-Type**: `application/pdf`
- **Content-Disposition**: `attachment; filename="document.pdf"`
- Binary PDF content

**Example:**
```bash
curl -X GET http://localhost:3000/api/documents/123/download \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o downloaded_document.pdf
```

#### 8. Stream Document (for PDF viewer)
**GET** `/api/documents/[id]/stream`

**Response:**
- **Content-Type**: `application/pdf`
- **Content-Disposition**: `inline`
- Binary PDF content for viewing

---

## 🏢 Branches API

### Base URL: `/api/branches`

#### 1. Get All Branches
**GET** `/api/branches`

**Query Parameters:**
```bash
includeCounts?    boolean   # Include document counts (default: false)
includeInactive?  boolean   # Include inactive branches (default: false)
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "กปภ.สาขาขอนแก่น(ชั้นพิเศษ)",
      "baCode": 1060,
      "district": "R6",
      "isActive": true,
      "documentCount": 45,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### 2. Get Branch Documents
**GET** `/api/documents/branch/[branchBaCode]`

**Response:** Same as Documents API with branch filter applied

**Example:**
```bash
curl -X GET http://localhost:3000/api/documents/branch/1060 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 💬 Comments API

### Base URL: `/api/documents/[id]/comments`

#### 1. Get Comments
**GET** `/api/documents/[id]/comments`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "comment": {
        "id": 456,
        "documentId": 123,
        "userId": 789,
        "content": "กรุณาตรวจสอบข้อมูลในหน้า 3",
        "createdAt": "2024-01-16T11:00:00Z"
      },
      "user": {
        "id": 789,
        "username": "jane.smith",
        "firstName": "Jane",
        "lastName": "Smith"
      }
    }
  ]
}
```

#### 2. Add Comment
**POST** `/api/documents/[id]/comments`

**Request Body:**
```json
{
  "content": "ได้รับทราบข้อมูลแล้ว"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "comment": {
      "id": 457,
      "documentId": 123,
      "content": "ได้รับทราบข้อมูลแล้ว",
      "createdAt": "2024-01-16T12:00:00Z"
    },
    "user": {
      "username": "current.user",
      "firstName": "Current",
      "lastName": "User"
    }
  },
  "message": "Comment added successfully"
}
```

#### 3. Update Comment
**PATCH** `/api/documents/[id]/comments/[commentId]`

**Request Body:**
```json
{
  "content": "แก้ไข: ได้รับทราบข้อมูลแล้ว และจะดำเนินการ"
}
```

#### 4. Delete Comment
**DELETE** `/api/documents/[id]/comments/[commentId]`

**Response:**
```json
{
  "success": true,
  "message": "Comment deleted successfully"
}
```

---

## 👥 Users API (Admin Only)

### Base URL: `/api/admin/users`

#### 1. Get All Users
**GET** `/api/admin/users`

**Query Parameters:**
```bash
search?     string    # Search username, firstName, lastName
role?       string    # Filter by role name
page?       number    # Page number
limit?      number    # Items per page
```

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": 1,
        "username": "john.doe",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "isLocalAdmin": false,
        "roles": [
          {
            "id": 1,
            "name": "uploader",
            "description": "Can upload documents"
          }
        ],
        "lastLoginAt": "2024-01-16T10:00:00Z",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "total": 50,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

#### 2. Create User (Local Admin)
**POST** `/api/admin/users`

**Request Body:**
```json
{
  "username": "new.user",
  "firstName": "New",
  "lastName": "User",
  "email": "new.user@example.com",
  "password": "secure_password",
  "roleIds": [1, 2]
}
```

#### 3. Update User
**PATCH** `/api/admin/users/[userId]`

**Request Body:**
```json
{
  "roleIds": [1, 3],
  "email": "updated.email@example.com"
}
```

#### 4. Delete User
**DELETE** `/api/admin/users/[userId]`

---

## 🎭 Roles API (Admin Only)

### Base URL: `/api/admin/roles`

#### 1. Get All Roles
**GET** `/api/admin/roles`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "admin",
      "description": "System administrator",
      "permissions": [
        {
          "id": 1,
          "name": "admin:full_access",
          "description": "Full system access"
        }
      ],
      "userCount": 3,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### 2. Create Role
**POST** `/api/admin/roles`

**Request Body:**
```json
{
  "name": "custom_role",
  "description": "Custom role description",
  "permissionIds": [1, 2, 3]
}
```

#### 3. Update Role
**PATCH** `/api/admin/roles/[roleId]`

**Request Body:**
```json
{
  "description": "Updated description",
  "permissionIds": [1, 2, 4, 5]
}
```

---

## ⚙️ System API

### System Settings
**GET/PUT** `/api/system-settings`

#### Get Settings
**GET** `/api/system-settings`

**Response:**
```json
{
  "success": true,
  "data": {
    "maintenance_mode_enabled": false,
    "maintenance_message": "ระบบกำลังปรับปรุง",
    "telegram_notifications_enabled": true,
    "max_file_size_mb": 10,
    "session_timeout_minutes": 240
  }
}
```

#### Update Settings
**PUT** `/api/system-settings`

**Request Body:**
```json
{
  "maintenance_mode_enabled": true,
  "maintenance_message": "ระบบกำลังอัปเดต กลับมาใหม่ใน 30 นาที"
}
```

### Health Check
**GET** `/api/health`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-16T12:00:00Z",
  "service": "DocFlow API",
  "version": "1.0.0",
  "checks": {
    "database": {
      "status": "up",
      "responseTime": 15
    },
    "cache": {
      "status": "up",
      "type": "redis",
      "stats": {
        "hits": 1500,
        "misses": 100,
        "hitRate": 0.94
      }
    }
  },
  "uptime": 86400
}
```

### Cache Statistics
**GET** `/api/cache/stats`

**Response:**
```json
{
  "success": true,
  "data": {
    "hits": 1500,
    "misses": 100,
    "sets": 200,
    "deletes": 50,
    "hitRate": 0.94,
    "totalOperations": 1600
  }
}
```

---

## 📱 Telegram API

### Base URL: `/api/telegram`

#### 1. Test Connection
**POST** `/api/telegram/test-connection`

**Request Body:**
```json
{
  "botToken": "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
}
```

#### 2. Test Message
**POST** `/api/telegram/test-message`

**Request Body:**
```json
{
  "botToken": "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11",
  "chatId": "-1001234567890",
  "message": "This is a test message from DocFlow"
}
```

#### 3. Send System Alert
**POST** `/api/telegram/system-alert`

**Request Body:**
```json
{
  "message": "🚨 System Alert: Database backup completed",
  "priority": "high"
}
```

#### 4. Get/Update Settings
**GET/POST** `/api/telegram/settings`

---

## 📁 File Management API

### Base URL: `/api/files/management`

#### 1. Get File Statistics
**GET** `/api/files/management`

**Response:**
```json
{
  "success": true,
  "data": {
    "totalFiles": 1250,
    "totalSizeBytes": 5368709120,
    "totalSizeMB": 5120,
    "documentFiles": 1200,
    "temporaryFiles": 50,
    "oldestFile": "2024-01-01T00:00:00Z",
    "newestFile": "2024-01-16T12:00:00Z"
  }
}
```

#### 2. Cleanup Files
**POST** `/api/files/management/cleanup`

**Request Body:**
```json
{
  "olderThanDays": 30,
  "includeOrphaned": true,
  "dryRun": false
}
```

#### 3. Backup Files
**POST** `/api/files/management/backup`

**Request Body:**
```json
{
  "destination": "/backup/files",
  "compress": true
}
```

---

## 🔄 Bulk Operations API

### Bulk Send Documents
**POST** `/api/documents/bulk-send`

**Request Body:**
```json
{
  "documentIds": [123, 124, 125]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sentCount": 3,
    "failedCount": 0,
    "results": [
      {
        "documentId": 123,
        "status": "success"
      },
      {
        "documentId": 124,
        "status": "success"
      },
      {
        "documentId": 125,
        "status": "success"
      }
    ]
  },
  "message": "Documents sent successfully"
}
```

---

## 🚫 Error Handling

### Standard Error Response
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "validation error details"
  }
}
```

### HTTP Status Codes

| Status | Description | Example |
|--------|-------------|---------|
| **200** | Success | Request completed successfully |
| **201** | Created | Resource created successfully |
| **400** | Bad Request | Invalid request data |
| **401** | Unauthorized | Authentication required |
| **403** | Forbidden | Permission denied |
| **404** | Not Found | Resource not found |
| **422** | Validation Error | Input validation failed |
| **429** | Rate Limited | Too many requests |
| **500** | Server Error | Internal server error |
| **503** | Service Unavailable | Maintenance mode |

### Common Error Codes

#### Authentication Errors
- `AUTH_REQUIRED`: Authentication required
- `AUTH_INVALID`: Invalid credentials
- `TOKEN_EXPIRED`: JWT token expired
- `SESSION_EXPIRED`: Session timeout

#### Permission Errors
- `PERMISSION_DENIED`: Insufficient permissions
- `BRANCH_ACCESS_DENIED`: No access to branch
- `ADMIN_REQUIRED`: Admin access required

#### Validation Errors
- `VALIDATION_ERROR`: Input validation failed
- `FILE_TOO_LARGE`: File exceeds size limit
- `INVALID_FILE_TYPE`: Only PDF files allowed
- `REQUIRED_FIELD`: Required field missing

#### Resource Errors
- `DOCUMENT_NOT_FOUND`: Document does not exist
- `USER_NOT_FOUND`: User does not exist
- `BRANCH_NOT_FOUND`: Branch does not exist

#### System Errors
- `DATABASE_ERROR`: Database connection failed
- `CACHE_ERROR`: Cache operation failed
- `FILE_UPLOAD_ERROR`: File upload failed
- `RATE_LIMIT_EXCEEDED`: Too many requests

---

## 🔒 Rate Limiting

### Rate Limits by Endpoint

| Endpoint | Limit | Window |
|----------|-------|--------|
| **Login** | 5 attempts | 15 minutes |
| **Upload** | 10 uploads | 1 hour |
| **API General** | 100 requests | 15 minutes |
| **Health Check** | Unlimited | - |

### Rate Limit Headers
```bash
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 85
X-RateLimit-Reset: 1642345678
Retry-After: 900
```

---

## 📊 Request/Response Examples

### JavaScript/TypeScript Client
```typescript
class DocFlowAPI {
  private baseURL = 'http://localhost:3000/api';
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }

  // Get documents
  async getDocuments(params?: any) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/documents?${query}`);
  }

  // Upload document
  async uploadDocument(formData: FormData) {
    return fetch(`${this.baseURL}/documents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      body: formData,
    }).then(res => res.json());
  }

  // Add comment
  async addComment(documentId: number, content: string) {
    return this.request(`/documents/${documentId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }
}

// Usage
const api = new DocFlowAPI('your-jwt-token');

// Get documents
const documents = await api.getDocuments({
  search: 'MT001',
  status: 'sent_to_branch',
  page: 1,
  limit: 10
});

// Upload document
const formData = new FormData();
formData.append('file', pdfFile);
formData.append('mtNumber', 'MT001-2024');
formData.append('subject', 'Test Document');
formData.append('branchBaCode', '1060');
// ... other fields

const result = await api.uploadDocument(formData);
```

### Python Client
```python
import requests
import json

class DocFlowAPI:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.token = token
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
    
    def get_documents(self, **params):
        response = requests.get(
            f'{self.base_url}/documents',
            headers=self.headers,
            params=params
        )
        return response.json()
    
    def upload_document(self, file_path, document_data):
        headers = {'Authorization': f'Bearer {self.token}'}
        
        with open(file_path, 'rb') as f:
            files = {'file': f}
            response = requests.post(
                f'{self.base_url}/documents',
                headers=headers,
                files=files,
                data=document_data
            )
        return response.json()

# Usage
api = DocFlowAPI('http://localhost:3000/api', 'your-jwt-token')

# Get documents
documents = api.get_documents(
    search='MT001',
    status='sent_to_branch',
    page=1,
    limit=10
)

# Upload document
result = api.upload_document('document.pdf', {
    'mtNumber': 'MT001-2024',
    'subject': 'Test Document',
    'branchBaCode': '1060',
    'mtDate': '2024-01-15',
    'monthYear': 'มกราคม 2567',
    'action': 'send'
})
```

---

## 🧪 Testing

### API Testing with curl
```bash
#!/bin/bash
# api-test.sh

BASE_URL="http://localhost:3000/api"
TOKEN="your-jwt-token"

# Test health check
echo "Testing health check..."
curl -s "$BASE_URL/health" | jq '.'

# Test authentication
echo "Testing authentication..."
curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/user/info" | jq '.'

# Test document list
echo "Testing document list..."
curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/documents?limit=5" | jq '.'

# Test invalid endpoint
echo "Testing 404..."
curl -s "$BASE_URL/invalid-endpoint" | jq '.'
```

### Postman Collection
```json
{
  "info": {
    "name": "DocFlow API",
    "description": "Complete API collection for DocFlow system"
  },
  "auth": {
    "type": "bearer",
    "bearer": [
      {
        "key": "token",
        "value": "{{jwt_token}}",
        "type": "string"
      }
    ]
  },
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:3000/api"
    },
    {
      "key": "jwt_token",
      "value": "your-jwt-token"
    }
  ]
}
```

---

## 📝 Changelog

### v1.0.0 (January 2025)
- Initial API release
- Document management endpoints
- User and role management
- Telegram integration
- File management API
- Health check and monitoring

### Planned Features
- Webhooks for real-time notifications
- GraphQL API endpoint
- Advanced search with filters
- Bulk operations API
- API versioning

---

*API Reference ฉบับนี้อัปเดตล่าสุด: มกราคม 2025*