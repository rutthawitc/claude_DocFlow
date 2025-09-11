// DocFlow Types and Interfaces

export enum DocumentStatus {
  DRAFT = "draft",
  SENT_TO_BRANCH = "sent_to_branch", 
  ACKNOWLEDGED = "acknowledged",
  SENT_BACK_TO_DISTRICT = "sent_back_to_district"
}

export enum LogAction {
  LOGIN = "login",
  LOGOUT = "logout",
  CREATE_DOCUMENT = "create_document",
  NOTIFY_SENT = "notify_sent", 
  STATUS_UPDATE = "status_update",
  ADD_COMMENT = "add_comment",
  VIEW_DOCUMENT = "view_document",
  DOWNLOAD_DOCUMENT = "download_document"
}

// Core Data Models
export interface Branch {
  id: number;
  baCode: number;
  branchCode: number;
  name: string;
  regionId: number;
  regionCode: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Document {
  id: number;
  filePath: string;
  originalFilename: string;
  fileSize: number | null;
  branchBaCode: number;
  uploadDate: Date;
  mtNumber: string;
  mtDate: Date;
  subject: string;
  monthYear: string;
  docReceivedDate?: Date;
  status: string;
  uploaderId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Comment {
  id: number;
  documentId: number;
  userId: number;
  content: string;
  createdAt: Date;
}

export interface ActivityLog {
  id: number;
  userId: number | null;
  action: string;
  documentId: number | null;
  branchBaCode: number | null;
  details: Record<string, any> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface DocumentStatusHistory {
  id: number;
  documentId: number;
  fromStatus: string | null;
  toStatus: string;
  changedBy: number;
  comment: string | null;
  createdAt: Date;
}

// Extended Data Models with Relations
export interface DocumentWithRelations extends Document {
  branch?: Branch;
  uploader?: {
    id: number;
    username: string;
    firstName: string | null;
    lastName: string | null;
  };
  comments?: Comment[];
  statusHistory?: DocumentStatusHistory[];
  commentCount?: number;
}

export interface BranchWithDocumentCounts extends Branch {
  documentCounts: {
    total: number;
    draft: number;
    sent_to_branch: number;
    acknowledged: number;
    sent_back_to_district: number;
  };
}

// Form and API Data Types
export interface DocumentUploadData {
  branchBaCode: number;
  mtNumber: string;
  mtDate: string;
  subject: string;
  monthYear: string;
  docReceivedDate?: string;
  hasAdditionalDocs?: boolean;
  additionalDocsCount?: number;
  additionalDocs?: string[];
}

export interface DocumentFilters {
  status?: DocumentStatus | 'all';
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  page: number;
  limit: number;
}

export interface DocumentCounts {
  [key: string]: number;
  total: number;
  draft: number;
  sent_to_branch: number;
  acknowledged: number;
  sent_back_to_district: number;
}

// File Validation Types
export interface FileValidationResult {
  isValid: boolean;
  errors: FileValidationError[];
}

export interface FileValidationError {
  type: 'FILE_TYPE' | 'FILE_SIZE' | 'FILE_CORRUPT' | 'FILE_MISSING';
  message: string;
  details?: any;
}

// Dashboard and Analytics Types
export interface DashboardMetrics {
  totalDocuments: number;
  documentsByStatus: Record<DocumentStatus, number>;
  documentsByBranch: Array<{ branchName: string; count: number }>;
  averageProcessingTime: number;
  recentActivity: ActivityLog[];
}

export interface BranchOverview {
  branch: Branch;
  documentCount: number;
  pendingCount: number;
  lastActivity: Date | null;
}

// User Types with DocFlow Extensions
export interface PWAUserData {
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  costCenter?: string;
  ba?: string;
  part?: string;
  area?: string;
  jobName?: string;
  level?: string;
  divName?: string;
  depName?: string;
  orgName?: string;
  position?: string;
}

export interface UserWithBranch {
  id: number;
  username: string;
  firstName: string | null;
  lastName: string | null;
  branch: Branch | null;
  roles: string[];
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Notification Types
export interface TelegramNotificationData {
  branchName: string;
  subject: string;
  mtNumber: string;
  monthYear: string;
  uploaderName: string;
}

// Error Types
export class DocumentUploadError extends Error {
  constructor(
    public validationErrors: FileValidationError[],
    message: string = 'Document upload failed'
  ) {
    super(message);
    this.name = 'DocumentUploadError';
  }
}

export class AccessDeniedError extends Error {
  constructor(
    public userId: number,
    public resource: string,
    public action: string
  ) {
    super(`Access denied: User ${userId} cannot ${action} ${resource}`);
    this.name = 'AccessDeniedError';
  }
}

export class DatabaseError extends Error {
  constructor(
    public operation: string,
    public originalError: Error
  ) {
    super(`Database operation failed: ${operation}`);
    this.name = 'DatabaseError';
  }
}

// Branch Data for Initialization
export const R6_BRANCHES: Omit<Branch, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { baCode: 1060, branchCode: 5521011, name: "กปภ.สาขาขอนแก่น(ชั้นพิเศษ)", regionId: 6, regionCode: "R6", isActive: true },
  { baCode: 1061, branchCode: 5521012, name: "กปภ.สาขาบ้านไผ่", regionId: 6, regionCode: "R6", isActive: true },
  { baCode: 1062, branchCode: 5521013, name: "กปภ.สาขาชุมแพ", regionId: 6, regionCode: "R6", isActive: true },
  { baCode: 1063, branchCode: 5521014, name: "กปภ.สาขาน้ำพอง", regionId: 6, regionCode: "R6", isActive: true },
  { baCode: 1064, branchCode: 5521015, name: "กปภ.สาขาชนบท", regionId: 6, regionCode: "R6", isActive: true },
  { baCode: 1065, branchCode: 5521016, name: "กปภ.สาขากระนวน", regionId: 6, regionCode: "R6", isActive: true },
  { baCode: 1066, branchCode: 5521017, name: "กปภ.สาขาหนองเรือ", regionId: 6, regionCode: "R6", isActive: true },
  { baCode: 1067, branchCode: 5521018, name: "กปภ.สาขาเมืองพล", regionId: 6, regionCode: "R6", isActive: true },
  { baCode: 1068, branchCode: 5521019, name: "กปภ.สาขากาฬสินธุ์", regionId: 6, regionCode: "R6", isActive: true },
  { baCode: 1069, branchCode: 5521020, name: "กปภ.สาขากุฉินารายณ์", regionId: 6, regionCode: "R6", isActive: true },
  { baCode: 1070, branchCode: 5521021, name: "กปภ.สาขาสมเด็จ", regionId: 6, regionCode: "R6", isActive: true },
  { baCode: 1071, branchCode: 5521022, name: "กปภ.สาขามหาสารคาม", regionId: 6, regionCode: "R6", isActive: true },
  { baCode: 1072, branchCode: 5521023, name: "กปภ.สาขาพยัคฆภูมิพิสัย", regionId: 6, regionCode: "R6", isActive: true },
  { baCode: 1073, branchCode: 5521024, name: "กปภ.สาขาชัยภูมิ", regionId: 6, regionCode: "R6", isActive: true },
  { baCode: 1074, branchCode: 5521025, name: "กปภ.สาขาแก้งคร้อ", regionId: 6, regionCode: "R6", isActive: true },
  { baCode: 1075, branchCode: 5521026, name: "กปภ.สาขาจัตุรัส", regionId: 6, regionCode: "R6", isActive: true },
  { baCode: 1076, branchCode: 5521027, name: "กปภ.สาขาหนองบัวแดง", regionId: 6, regionCode: "R6", isActive: true },
  { baCode: 1077, branchCode: 5521028, name: "กปภ.สาขาภูเขียว", regionId: 6, regionCode: "R6", isActive: true },
  { baCode: 1133, branchCode: 5521029, name: "กปภ.สาขาร้อยเอ็ด", regionId: 6, regionCode: "R6", isActive: true },
  { baCode: 1134, branchCode: 5521030, name: "กปภ.สาขาโพนทอง", regionId: 6, regionCode: "R6", isActive: true },
  { baCode: 1135, branchCode: 5521031, name: "กปภ.สาขาสุวรรณภูมิ", regionId: 6, regionCode: "R6", isActive: true },
  { baCode: 1245, branchCode: 5521032, name: "กปภ.สาขาบำเหน็จณรงค์", regionId: 6, regionCode: "R6", isActive: true }
];