# DocFlow API Testing Guide

This document provides comprehensive testing instructions for all DocFlow API endpoints, including authentication methods and example requests.

## 🔐 Authentication

DocFlow uses NextAuth.js with PWA integration for authentication. All protected endpoints require a valid session.

### Authentication Methods

#### Method 1: Browser Session (Recommended for Testing)
1. Login through the web interface at `http://localhost:3000/login`
2. Use the browser's session cookie for subsequent API calls
3. Include credentials in fetch requests

#### Method 2: Session Token (For API Testing Tools)
1. Login through browser first
2. Extract session token from browser DevTools
3. Use token in Authorization header

### Getting Session Token

```javascript
// In browser console after login
document.cookie
  .split('; ')
  .find(row => row.startsWith('next-auth.session-token'))
  ?.split('=')[1]
```

## 📋 API Endpoints Overview

| Endpoint | Method | Purpose | Auth Required |
|----------|---------|---------|---------------|
| `/api/documents` | POST | Upload document | ✅ |
| `/api/documents` | GET | Search documents | ✅ |
| `/api/documents/[id]` | GET | Get document details | ✅ |
| `/api/documents/[id]` | DELETE | Delete document | ✅ |
| `/api/documents/[id]/status` | PATCH | Update document status | ✅ |
| `/api/documents/[id]/comments` | POST | Add comment | ✅ |
| `/api/documents/[id]/comments` | GET | Get comments | ✅ |
| `/api/documents/[id]/download` | GET | Download file | ✅ |
| `/api/documents/branch/[branchBaCode]` | GET | Get branch documents | ✅ |
| `/api/branches` | GET | List branches | ✅ |

## 🧪 Testing Scenarios

### 1. Document Upload

#### Test Case: Valid PDF Upload

```bash
curl -X POST http://localhost:3000/api/documents \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -F "file=@test-document.pdf" \
  -F "branchBaCode=1060" \
  -F "mtNumber=MT001-2024" \
  -F "mtDate=2024-01-15" \
  -F "subject=ขอเบิกค่าใช้จ่ายเดินทาง" \
  -F "monthYear=มกราคม 2567"
```

**Expected Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "filePath": "doc_1_1705123456789_abc123.pdf",
    "originalFilename": "test-document.pdf",
    "fileSize": 524288,
    "branchBaCode": 1060,
    "uploadDate": "2024-01-15",
    "mtNumber": "MT001-2024",
    "mtDate": "2024-01-15",
    "subject": "ขอเบิกค่าใช้จ่ายเดินทาง",
    "monthYear": "มกราคม 2567",
    "status": "draft",
    "uploaderId": 1,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "message": "Document uploaded successfully"
}
```

#### Test Case: Invalid File Type

```bash
curl -X POST http://localhost:3000/api/documents \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -F "file=@test-document.txt" \
  -F "branchBaCode=1060" \
  -F "mtNumber=MT001-2024" \
  -F "mtDate=2024-01-15" \
  -F "subject=Test document" \
  -F "monthYear=มกราคม 2567"
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "File validation failed",
  "message": "Invalid file type. Only PDF files are allowed."
}
```

#### Test Case: Missing Required Fields

```bash
curl -X POST http://localhost:3000/api/documents \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -F "file=@test-document.pdf" \
  -F "branchBaCode=1060"
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Missing required fields: branchBaCode, mtNumber, mtDate, subject, monthYear"
}
```

### 2. Document Retrieval

#### Test Case: Get Document Details

```bash
curl -X GET http://localhost:3000/api/documents/1 \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "filePath": "doc_1_1705123456789_abc123.pdf",
    "originalFilename": "test-document.pdf",
    "fileSize": 524288,
    "branchBaCode": 1060,
    "uploadDate": "2024-01-15",
    "mtNumber": "MT001-2024",
    "mtDate": "2024-01-15",
    "subject": "ขอเบิกค่าใช้จ่ายเดินทาง",
    "monthYear": "มกราคม 2567",
    "status": "draft",
    "uploaderId": 1,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "branch": {
      "id": 1,
      "baCode": 1060,
      "branchCode": 5521011,
      "name": "กปภ.สาขาขอนแก่น(ชั้นพิเศษ)",
      "regionId": 6,
      "regionCode": "R6",
      "isActive": true
    },
    "uploader": {
      "id": 1,
      "username": "user001",
      "firstName": "John",
      "lastName": "Doe"
    },
    "comments": [],
    "statusHistory": []
  }
}
```

#### Test Case: Document Not Found

```bash
curl -X GET http://localhost:3000/api/documents/999 \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

**Expected Response (404):**
```json
{
  "success": false,
  "error": "Document not found"
}
```

### 3. Status Updates

#### Test Case: Update Document Status

```bash
curl -X PATCH http://localhost:3000/api/documents/1/status \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "status": "sent_to_branch",
    "comment": "ส่งเอกสารให้สาขาเรียบร้อย"
  }'
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "sent_to_branch",
    "updatedAt": "2024-01-15T10:35:00.000Z"
  },
  "message": "Document status updated to sent_to_branch"
}
```

#### Test Case: Invalid Status

```bash
curl -X PATCH http://localhost:3000/api/documents/1/status \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "status": "invalid_status"
  }'
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Invalid status. Must be one of: draft, sent_to_branch, acknowledged, sent_back_to_district"
}
```

### 4. Comments System

#### Test Case: Add Comment

```bash
curl -X POST http://localhost:3000/api/documents/1/comments \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "content": "เอกสารครบถ้วนแล้ว กรุณาดำเนินการตามขั้นตอน"
  }'
```

**Expected Response (201):**
```json
{
  "success": true,
  "data": {
    "comment": {
      "id": 1,
      "documentId": 1,
      "userId": 1,
      "content": "เอกสารครบถ้วนแล้ว กรุณาดำเนินการตามขั้นตอน",
      "createdAt": "2024-01-15T10:40:00.000Z"
    },
    "user": {
      "id": 1,
      "username": "user001",
      "firstName": "John",
      "lastName": "Doe"
    }
  },
  "message": "Comment added successfully"
}
```

#### Test Case: Empty Comment

```bash
curl -X POST http://localhost:3000/api/documents/1/comments \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "content": ""
  }'
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Comment content is required"
}
```

### 5. File Download

#### Test Case: Download Document

```bash
curl -X GET http://localhost:3000/api/documents/1/download \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -o downloaded-document.pdf
```

**Expected Response:** PDF file download with headers:
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="test-document.pdf"
Content-Length: 524288
```

### 6. Branch Operations

#### Test Case: List All Branches

```bash
curl -X GET http://localhost:3000/api/branches \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "baCode": 1060,
      "branchCode": 5521011,
      "name": "กปภ.สาขาขอนแก่น(ชั้นพิเศษ)",
      "regionId": 6,
      "regionCode": "R6",
      "isActive": true,
      "createdAt": "2024-01-15T08:00:00.000Z",
      "updatedAt": "2024-01-15T08:00:00.000Z"
    }
  ]
}
```

#### Test Case: List Branches with Document Counts

```bash
curl -X GET "http://localhost:3000/api/branches?includeCounts=true" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "baCode": 1060,
      "branchCode": 5521011,
      "name": "กปภ.สาขาขอนแก่น(ชั้นพิเศษ)",
      "regionId": 6,
      "regionCode": "R6",
      "isActive": true,
      "documentCounts": {
        "total": 5,
        "draft": 1,
        "sent_to_branch": 3,
        "acknowledged": 1,
        "sent_back_to_district": 0
      }
    }
  ]
}
```

### 7. Branch Documents

#### Test Case: Get Branch Documents

```bash
curl -X GET http://localhost:3000/api/documents/branch/1060 \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": 1,
        "filePath": "doc_1_1705123456789_abc123.pdf",
        "originalFilename": "test-document.pdf",
        "fileSize": 524288,
        "branchBaCode": 1060,
        "uploadDate": "2024-01-15",
        "mtNumber": "MT001-2024",
        "mtDate": "2024-01-15",
        "subject": "ขอเบิกค่าใช้จ่ายเดินทาง",
        "monthYear": "มกราคม 2567",
        "status": "sent_to_branch",
        "uploaderId": 1,
        "branch": {
          "name": "กปภ.สาขาขอนแก่น(ชั้นพิเศษ)"
        },
        "uploader": {
          "username": "user001",
          "firstName": "John",
          "lastName": "Doe"
        }
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

#### Test Case: Filter by Status

```bash
curl -X GET "http://localhost:3000/api/documents/branch/1060?status=sent_to_branch&page=1&limit=10" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

#### Test Case: Search Documents

```bash
curl -X GET "http://localhost:3000/api/documents/branch/1060?search=MT001&dateFrom=2024-01-01&dateTo=2024-01-31" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

### 8. Document Search

#### Test Case: Global Document Search

```bash
curl -X GET "http://localhost:3000/api/documents?search=เบิกจ่าย&status=all&page=1&limit=20" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

## 🛡️ Authorization Testing

### Test Different User Roles

#### Test Case: Uploader Role
- Can upload documents ✅
- Can view own documents ✅
- Cannot view other users' documents ❌
- Cannot update document status ❌

#### Test Case: Branch User Role
- Cannot upload documents ❌
- Can view branch documents ✅
- Can update document status ✅
- Can add comments ✅

#### Test Case: Branch Manager Role
- Cannot upload documents ❌
- Can view all R6 branch documents ✅
- Can approve documents ✅
- Can generate reports ✅

#### Test Case: Admin Role
- Can perform all operations ✅
- Can access all branches ✅
- Can delete documents ✅
- Can manage users ✅

## 🧪 JavaScript/Fetch Examples

### Authentication Setup

```javascript
// Get session token from cookies
function getSessionToken() {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('next-auth.session-token'))
    ?.split('=')[1];
}

// Base fetch with authentication
async function authenticatedFetch(url, options = {}) {
  const token = getSessionToken();
  
  return fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      ...options.headers,
      'Authorization': token ? `Bearer ${token}` : '',
    }
  });
}
```

### Upload Document

```javascript
async function uploadDocument(file, metadata) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('branchBaCode', metadata.branchBaCode);
  formData.append('mtNumber', metadata.mtNumber);
  formData.append('mtDate', metadata.mtDate);
  formData.append('subject', metadata.subject);
  formData.append('monthYear', metadata.monthYear);

  const response = await authenticatedFetch('/api/documents', {
    method: 'POST',
    body: formData
  });

  return response.json();
}

// Usage
const fileInput = document.querySelector('#file-input');
const file = fileInput.files[0];

const result = await uploadDocument(file, {
  branchBaCode: 1060,
  mtNumber: 'MT001-2024',
  mtDate: '2024-01-15',
  subject: 'ขอเบิกค่าใช้จ่าย',
  monthYear: 'มกราคม 2567'
});

console.log(result);
```

### Update Document Status

```javascript
async function updateDocumentStatus(documentId, status, comment = '') {
  const response = await authenticatedFetch(`/api/documents/${documentId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ status, comment })
  });

  return response.json();
}

// Usage
const result = await updateDocumentStatus(1, 'acknowledged', 'รับทราบเรียบร้อย');
console.log(result);
```

### Add Comment

```javascript
async function addComment(documentId, content) {
  const response = await authenticatedFetch(`/api/documents/${documentId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ content })
  });

  return response.json();
}

// Usage
const result = await addComment(1, 'กรุณาตรวจสอบเอกสารเพิ่มเติม');
console.log(result);
```

## 🐛 Error Handling

### Common Error Responses

#### 401 Unauthorized
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

#### 403 Forbidden
```json
{
  "success": false,
  "error": "Insufficient permissions to upload documents"
}
```

#### 404 Not Found
```json
{
  "success": false,
  "error": "Document not found"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal server error"
}
```

## 📊 Performance Testing

### Load Testing with curl

```bash
# Test concurrent uploads
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/documents \
    -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
    -F "file=@test-document-$i.pdf" \
    -F "branchBaCode=1060" \
    -F "mtNumber=MT00$i-2024" \
    -F "mtDate=2024-01-15" \
    -F "subject=Test document $i" \
    -F "monthYear=มกราคม 2567" &
done
wait
```

### Response Time Testing

```bash
# Measure API response time
time curl -X GET http://localhost:3000/api/documents/1 \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

## 🔧 Troubleshooting

### Common Issues

1. **Session Token Expired**
   - Re-login through browser
   - Get new session token

2. **File Upload Fails**
   - Check file size (max 10MB)
   - Verify PDF format
   - Ensure all required fields are provided

3. **Access Denied**
   - Verify user roles
   - Check branch access permissions
   - Ensure user has required permissions

4. **Database Connection Issues**
   - Check if PostgreSQL is running: `docker-compose ps`
   - Verify DATABASE_URL in .env file
   - Test connection: `pnpm db:studio`

### Debug Mode

Set environment variable for detailed logging:
```bash
NODE_ENV=development pnpm dev
```

## 📋 Testing Checklist

- [ ] Authentication works correctly
- [ ] File upload validates PDF files
- [ ] File upload rejects invalid files
- [ ] Document retrieval works with proper access control
- [ ] Status updates work for authorized users
- [ ] Comments can be added and retrieved
- [ ] File download works correctly
- [ ] Branch listing respects user permissions
- [ ] Search and filtering work properly
- [ ] Error handling returns appropriate status codes
- [ ] Activity logging captures all actions
- [ ] Performance is acceptable under load

## 🚀 Next Steps

After API testing is complete:
1. Build frontend UI components
2. Implement PDF viewer
3. Add Telegram notifications
4. Create dashboard and analytics
5. Add mobile responsive design

---

**Note**: Replace `YOUR_SESSION_TOKEN` with actual session token obtained from browser after login. For production testing, use proper API authentication tokens.