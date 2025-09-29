"use client";

import React, { useState, useEffect, useCallback } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import {
  Search,
  Filter,
  Download,
  Eye,
  Calendar,
  FileText,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
  MessageSquare,
  BadgeCheck,
  BookCheck,
  ShieldX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/auth-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { CommentSystem } from "@/components/docflow/comment-system";

interface Document {
  id: number;
  originalFilename: string;
  fileSize: number;
  branchBaCode: number;
  uploadDate: string;
  mtNumber: string;
  mtDate: string;
  subject: string;
  monthYear: string;
  status: string;
  uploaderId: number;
  createdAt: string;
  updatedAt: string;
  additionalDocs?: string[];
  commentCount?: number;
  branch?: {
    id: number;
    name: string;
    baCode: number;
  };
  uploader?: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
  };
}

interface AdditionalFile {
  id: number;
  documentId: number;
  itemIndex: number;
  itemName: string;
  filePath: string;
  originalFilename: string;
  fileSize: number;
  uploaderId: number;
  isVerified: boolean | null;
  verifiedBy: number | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface VerificationStatusProps {
  documentId: number;
  additionalDocs?: string[];
}

interface SendBackButtonProps {
  doc: Document;
  onSendBack: (id: number) => void;
  disabled: boolean;
}

interface DocumentsListProps {
  branchBaCode?: number;
  title?: string;
  showBranchFilter?: boolean;
}

interface Filters {
  search: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  page: number;
  limit: number;
}

const STATUS_COLORS = {
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  sent_to_branch: "bg-orange-100 text-orange-700 border-orange-200",
  acknowledged: "bg-green-100 text-green-700 border-green-200",
  sent_back_to_district: "bg-blue-100 text-blue-700 border-blue-200",
  complete: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const STATUS_LABELS = {
  draft: "ร่าง",
  sent_to_branch: "เอกสารจากเขต",
  acknowledged: "รับทราบแล้ว",
  sent_back_to_district: "ส่งกลับเขต",
  complete: "เสร็จสิ้น",
};

// Modern Verification Status Component with Progress Bar
function VerificationStatus({
  documentId,
  additionalDocs = [],
}: VerificationStatusProps) {
  const [verificationData, setVerificationData] = useState<{
    verified: number;
    incorrect: number;
    unverified: number;
    notUploaded: number;
    total: number;
    allVerified: boolean;
  }>({
    verified: 0,
    incorrect: 0,
    unverified: 0,
    notUploaded: 0,
    total: 0,
    allVerified: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVerificationStatus = async () => {
      // Check if there are any meaningful additional docs
      const filteredDocs = additionalDocs.filter(doc => doc && doc.trim() !== '');
      if (!additionalDocs || additionalDocs.length === 0 || filteredDocs.length === 0) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/documents/${documentId}/additional-files`,
          {
            credentials: "include",
          },
        );

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            const files: AdditionalFile[] = result.data;
            const filteredDocs = additionalDocs.filter(
              (doc) => doc && doc.trim() !== "",
            );

            let verified = 0;
            let incorrect = 0;
            let unverified = 0;
            let notUploaded = 0;

            // Count verification status for each additional document
            // Note: Additional docs now use 0-based indexing directly
            filteredDocs.forEach((_, index) => {
              const actualIndex = index; // Use 0-based indexing for additional docs
              const file = files.find((f) => f.itemIndex === actualIndex);
              if (file) {
                if (file.isVerified === true) {
                  verified++;
                } else if (file.isVerified === false) {
                  incorrect++;
                } else {
                  unverified++; // Uploaded but not yet reviewed
                }
              } else {
                notUploaded++; // Document not uploaded yet
              }
            });

            const allVerified =
              filteredDocs.length > 0 &&
              verified === filteredDocs.length &&
              incorrect === 0 &&
              unverified === 0 &&
              notUploaded === 0;

            setVerificationData({
              verified,
              incorrect,
              unverified,
              notUploaded,
              total: filteredDocs.length,
              allVerified,
            });
          }
        }
      } catch (error) {
        console.error("Error fetching verification status:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVerificationStatus();
  }, [documentId, additionalDocs]);

  if (loading || verificationData.total === 0) {
    return null;
  }

  const progressPercentage =
    verificationData.total > 0
      ? (verificationData.verified / verificationData.total) * 100
      : 0;

  return (
    <div className="w-full">
      <div className="text-sm font-medium text-gray-700 mb-2 flex items-center justify-between">
        <span>สถานะการตรวจสอบ</span>
        <span className="text-xs text-gray-500">
          {verificationData.verified}/{verificationData.total}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-3 overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-700 ease-out relative ${
            progressPercentage === 100
              ? "bg-gradient-to-r from-green-500 via-green-600 to-green-700"
              : "bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700"
          }`}
          style={{ width: `${progressPercentage}%` }}
        >
          {progressPercentage > 0 && (
            <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse"></div>
          )}
        </div>
      </div>

      {/* Status Indicators */}
      <div className="space-y-2">
        {verificationData.verified > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center justify-center w-5 h-5 bg-green-100 rounded-full">
              <CheckCircle className="h-3 w-3 text-green-600" />
            </div>
            <span className="text-green-700 font-medium">
              ตรวจแล้ว {verificationData.verified} ฉบับ
            </span>
          </div>
        )}

        {verificationData.incorrect > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center justify-center w-5 h-5 bg-red-100 rounded-full">
              <AlertCircle className="h-3 w-3 text-red-600" />
            </div>
            <span className="text-red-700 font-medium">
              ต้องส่งใหม่ {verificationData.incorrect} ฉบับ
            </span>
          </div>
        )}

        {verificationData.unverified > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center justify-center w-5 h-5 bg-yellow-100 rounded-full">
              <Clock className="h-3 w-3 text-yellow-600" />
            </div>
            <span className="text-yellow-700 font-medium">
              ยังไม่ตรวจสอบ {verificationData.unverified} ฉบับ
            </span>
          </div>
        )}

        {verificationData.notUploaded > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center justify-center w-5 h-5 bg-orange-100 rounded-full animate-bounce">
              <Clock className="h-3 w-3 text-orange-600" />
            </div>
            <span className="text-orange-700 font-medium animate-pulse">
              ยังไม่ตรวจสอบ {verificationData.notUploaded} ฉบับ
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function DocumentsList({
  branchBaCode,
  title = "เอกสารทั้งหมด",
  showBranchFilter = true,
}: DocumentsListProps) {
  const { hasRole, hasPermission, user, isLoading: authLoading } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(0);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<{
    [key: number]: boolean;
  }>({});
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [deletedDocumentInfo, setDeletedDocumentInfo] = useState<{
    mtNumber: string;
    subject: string;
  } | null>(null);
  const [sendBackDialogOpen, setSendBackDialogOpen] = useState<{
    [key: number]: boolean;
  }>({});
  const [sendBackComment, setSendBackComment] = useState("");
  const [sendingBackId, setSendingBackId] = useState<number | null>(null);
  const [commentsDialogOpen, setCommentsDialogOpen] = useState<{
    [key: number]: boolean;
  }>({});
  const [error, setError] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);

  const [filters, setFilters] = useState<Filters>({
    search: "",
    status: "all",
    dateFrom: "",
    dateTo: "",
    page: 1,
    limit: 20,
  });

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsForbidden(false);

    try {
      const queryParams = new URLSearchParams();

      if (filters.search) queryParams.append("search", filters.search);
      if (filters.status !== "all")
        queryParams.append("status", filters.status);
      if (filters.dateFrom) queryParams.append("dateFrom", filters.dateFrom);
      if (filters.dateTo) queryParams.append("dateTo", filters.dateTo);
      queryParams.append("page", filters.page.toString());
      queryParams.append("limit", filters.limit.toString());

      // Add timestamp to prevent caching issues, especially for branch views
      queryParams.append("_t", Date.now().toString());
      // Add random parameter to defeat any client-side caching
      queryParams.append("_r", Math.random().toString(36).substring(7));

      const endpoint = branchBaCode
        ? `/api/documents/branch/${branchBaCode}?${queryParams}`
        : `/api/documents?${queryParams}`;

      const response = await fetch(endpoint, {
        credentials: "include",
        cache: "no-store", // Ensure fresh data, especially important for branch views
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          setIsForbidden(true);
          setError('คุณไม่มีสิทธิ์เข้าถึงเอกสารสาขานี้');
          setDocuments([]);
          setLoading(false);
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();

      if (!responseText) {
        throw new Error("Empty response from server");
      }

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error(
          "JSON parse error:",
          parseError,
          "Response text:",
          responseText,
        );
        throw new Error("Invalid JSON response from server");
      }

      if (result.success) {
        setDocuments(result.data.data || []);
        setTotalPages(result.data.totalPages || 0);
        setTotalDocuments(result.data.total || 0);
      } else {
        throw new Error(result.error || "Failed to fetch documents");
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
      setError(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการโหลดเอกสาร');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [branchBaCode, filters]);

  // Initial load and refetch when filters change
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Handle filter changes
  const handleFilterChange = useCallback(
    (key: keyof Filters, value: string | number) => {
      setFilters((prev) => ({
        ...prev,
        [key]: value,
        page: key !== "page" ? 1 : (value as number), // Reset to page 1 when changing filters
      }));
    },
    [],
  );

  // Handle search with debounce
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (filters.search !== "") {
        fetchDocuments();
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [filters.search]);

  // Download document
  const handleDownload = async (documentId: number, filename: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}/download`, {
        credentials: "include",
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error("Download failed");
      }
    } catch (error) {
      console.error("Download error:", error);
    }
  };

  // Delete document
  const handleDelete = async (documentId: number) => {
    setDeletingId(documentId);

    // Find the document info for the success message
    const docToDelete = documents.find((doc) => doc.id === documentId);

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        console.log("Delete API successful, updating UI...");

        // Use flushSync to force immediate synchronous updates
        flushSync(() => {
          // Remove document from local state immediately
          setDocuments((prev) => {
            const newDocs = prev.filter((doc) => doc.id !== documentId);
            console.log(
              "Documents updated:",
              prev.length,
              "->",
              newDocs.length,
            );
            return newDocs;
          });

          setTotalDocuments((prev) => {
            const newTotal = prev - 1;
            console.log("Total documents updated:", prev, "->", newTotal);
            return newTotal;
          });

          // Close the delete confirmation dialog
          setDeleteDialogOpen((prev) => ({ ...prev, [documentId]: false }));
        });

        // Set document info and show success dialog
        if (docToDelete) {
          setDeletedDocumentInfo({
            mtNumber: docToDelete.mtNumber,
            subject: docToDelete.subject,
          });
        }
        setSuccessDialogOpen(true);

        // Force refresh the data from server to ensure consistency
        // This is especially important for branch-specific views
        // Multiple refreshes to handle any backend delays and cache clearing
        setTimeout(() => {
          fetchDocuments();
        }, 100);
        setTimeout(() => {
          fetchDocuments();
        }, 500);
        setTimeout(() => {
          fetchDocuments();
        }, 1500);

        // Also trigger a page refresh for branch views to clear any lingering cache
        if (branchBaCode) {
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }

        console.log("Document deleted successfully, UI should update now");
      } else {
        const error = await response.json();
        console.error("Delete failed:", error.error);
        alert(`ลบเอกสารไม่สำเร็จ: ${error.error}`);
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("เกิดข้อผิดพลาดในการลบเอกสาร");
    } finally {
      setDeletingId(null);
    }
  };

  // Check if user can delete document
  const canDeleteDocument = (doc: Document): boolean => {
    // Admin can delete any document
    if (hasRole("admin")) return true;

    // Users with delete permission can delete any document
    if (hasPermission("documents:delete")) return true;

    // Document owner can delete their own draft documents
    if (user?.id === doc.uploaderId.toString() && doc.status === "draft")
      return true;

    return false;
  };

  // Send back to district handler
  const handleSendBackToDistrict = async (documentId: number) => {
    if (!sendBackComment.trim()) {
      alert("กรุณาใส่ความคิดเห็น");
      return;
    }

    setSendingBackId(documentId);

    try {
      const response = await fetch(`/api/documents/${documentId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          status: "sent_back_to_district",
          comment: sendBackComment,
        }),
      });

      if (response.ok) {
        // Close dialog and reset state
        setSendBackDialogOpen((prev) => ({ ...prev, [documentId]: false }));
        setSendBackComment("");

        // Refresh documents list
        fetchDocuments();
      } else {
        const error = await response.json();
        alert(
          `เกิดข้อผิดพลาด: ${error.error || "ไม่สามารถส่งเอกสารกลับเขตได้"}`,
        );
      }
    } catch (error) {
      console.error("Error sending document back to district:", error);
      alert("เกิดข้อผิดพลาดในการส่งเอกสารกลับเขต");
    } finally {
      setSendingBackId(null);
    }
  };

  // SendBackButton component
  const SendBackButton = ({
    doc,
    onSendBack,
    disabled,
  }: SendBackButtonProps) => {
    const [verificationStatus, setVerificationStatus] = useState<{
      verified: number;
      total: number;
      allVerified: boolean;
    } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const checkVerificationStatus = async () => {
        // Check if there are any meaningful additional docs
        const filteredDocs = doc.additionalDocs?.filter(d => d && d.trim() !== '') || [];
        if (!doc.hasAdditionalDocs || !doc.additionalDocs || doc.additionalDocs.length === 0 || filteredDocs.length === 0) {
          setLoading(false);
          return;
        }

        try {
          const response = await fetch(
            `/api/documents/${doc.id}/additional-files`,
            {
              credentials: "include",
            },
          );

          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
              const files: AdditionalFile[] = result.data;
              const filteredDocs = doc.additionalDocs.filter(
                (docItem) => docItem && docItem.trim() !== "",
              );

              let verified = 0;
              let total = filteredDocs.length;

              filteredDocs.forEach((_, index) => {
                // Additional docs now use 0-based indexing directly
                const file = files.find((f) => f.itemIndex === index);
                if (file && file.isVerified === true) {
                  verified++;
                }
              });

              const allVerified =
                total > 0 &&
                verified === total &&
                files.filter((f) => f.isVerified === false).length === 0 &&
                files.filter((f) => f.isVerified === null).length === 0;

              setVerificationStatus({
                verified,
                total,
                allVerified,
              });
            }
          }
        } catch (error) {
          console.error("Error checking verification status:", error);
        } finally {
          setLoading(false);
        }
      };

      checkVerificationStatus();
    }, [doc.id, doc.additionalDocs]);

    // Only show button if document is acknowledged and all additional docs are verified
    if (
      loading ||
      !verificationStatus ||
      doc.status !== "acknowledged" ||
      !verificationStatus.allVerified
    ) {
      return null;
    }

    return (
      <Button
        size="default"
        onClick={() => onSendBack(doc.id)}
        disabled={disabled}
        className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-3 shadow-lg hover:shadow-xl transition-all duration-200 border-0"
      >
        <BadgeCheck className="h-5 w-5 mr-2" />
        ส่งเอกสารต้นฉบับ
      </Button>
    );
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-gray-600">{totalDocuments} เอกสาร</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDocuments}
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            รีเฟรช
          </Button>

          {!isForbidden && !error && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              ตัวกรอง
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && !isForbidden && !error && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">ค้นหา</label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="เลขที่ มท หรือ เรื่อง"
                    value={filters.search}
                    onChange={(e) =>
                      handleFilterChange("search", e.target.value)
                    }
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">สถานะ</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">ทั้งหมด</option>
                  <option value="draft">Draft</option>
                  <option value="sent_to_branch">เอกสารจากเขต</option>
                  <option value="acknowledged">รับทราบ</option>
                  <option value="sent_back_to_district">ส่งกลับเขต</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">วันที่เริ่มต้น</label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) =>
                    handleFilterChange("dateFrom", e.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">วันที่สิ้นสุด</label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">กำลังโหลด...</span>
        </div>
      ) : isForbidden ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ShieldX className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <h3 className="text-lg font-medium text-red-600 mb-2">
              ไม่อนุญาตให้เข้าถึง
            </h3>
            <p className="text-gray-600">
              คุณไม่มีสิทธิ์เข้าถึงเอกสารของสาขานี้
            </p>
            <p className="text-sm text-gray-500 mt-2">
              กรุณาติดต่อผู้ดูแลระบบหากคุณควรมีสิทธิ์เข้าถึง
            </p>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <h3 className="text-lg font-medium text-red-600 mb-2">
              เกิดข้อผิดพลาด
            </h3>
            <p className="text-gray-600">
              {error}
            </p>
          </CardContent>
        </Card>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              ไม่พบเอกสาร
            </h3>
            <p className="text-gray-500">
              ไม่มีเอกสารที่ตรงกับเงื่อนไขการค้นหา
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {documents.map((doc) => {
            console.log("Rendering documents:", documents.length);
            
            // Render compact format for completed documents
            if (doc.status === 'complete') {
              return (
                <Card
                  key={`doc-${doc.id}-${doc.updatedAt}`}
                  className="group hover:shadow-lg transition-all duration-300 hover:border-emerald-300 bg-white hover:-translate-y-1 border border-emerald-200"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <BookCheck className="h-5 w-5 text-emerald-600" />
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {doc.mtNumber} - {doc.subject}
                          </h3>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link href={`/documents/${doc.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            ดูรายละเอียดเอกสาร
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          className="hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700"
                          onClick={() => handleDownload(doc.id, doc.originalFilename)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          ดาวน์โหลด
                        </Button>
                        {((user?.pwa?.roles || []).includes('admin') || (user?.pwa?.roles || []).includes('uploader') || (user?.pwa?.roles || []).includes('district_manager')) && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="hover:bg-red-50 hover:border-red-200 hover:text-red-700"
                            onClick={() => setDeleteDialogOpen((prev) => ({ ...prev, [doc.id]: true }))}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            ลบ
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                  
                  {/* Delete Dialog for Completed Documents */}
                  {((user?.pwa?.roles || []).includes('admin') || (user?.pwa?.roles || []).includes('uploader') || (user?.pwa?.roles || []).includes('district_manager')) && (
                    <Dialog
                      open={deleteDialogOpen[doc.id] || false}
                      onOpenChange={(open) =>
                        setDeleteDialogOpen((prev) => ({
                          ...prev,
                          [doc.id]: open,
                        }))
                      }
                    >
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>ยืนยันการลบเอกสาร</DialogTitle>
                          <DialogDescription>
                            คุณแน่ใจหรือไม่ที่จะลบเอกสาร "{doc.mtNumber} - {doc.subject}"?
                            <br />
                            การดำเนินการนี้ไม่สามารถยกเลิกได้
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() =>
                              setDeleteDialogOpen((prev) => ({
                                ...prev,
                                [doc.id]: false,
                              }))
                            }
                          >
                            ยกเลิก
                          </Button>
                          <Button
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => handleDelete(doc.id)}
                            disabled={deletingId === doc.id}
                          >
                            {deletingId === doc.id ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                กำลังลบ...
                              </>
                            ) : (
                              "ลบเอกสาร"
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </Card>
              );
            }
            
            // Render full format for non-completed documents
            return (
            <Card
              key={`doc-${doc.id}-${doc.updatedAt}`}
              className="group hover:shadow-xl transition-all duration-300 hover:border-gray-300 bg-white hover:-translate-y-1 border border-gray-200"
            >
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                  {/* Left Side - Document Information */}
                  <div className="flex-1 p-4 md:p-6 md:border-r border-gray-100">
                    {/* Header with Status */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="space-y-2">
                        <Badge
                          variant="outline"
                          className={`${STATUS_COLORS[doc.status as keyof typeof STATUS_COLORS]} text-xs font-medium px-2 py-1`}
                        >
                          {
                            STATUS_LABELS[
                              doc.status as keyof typeof STATUS_LABELS
                            ]
                          }
                        </Badge>
                        <div className="text-sm text-gray-500">
                          ประจำ: {doc.monthYear}
                        </div>
                      </div>
                    </div>

                    {/* Document Title and Subject */}
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-xl text-gray-900">
                          {doc.mtNumber}
                        </h3>
                        {doc.status === 'complete' && (
                          <BookCheck className="h-5 w-5 text-emerald-600" />
                        )}
                      </div>
                      <p className="text-gray-700 text-base leading-relaxed">
                        {doc.subject}
                      </p>
                      {showBranchFilter && doc.branch && (
                        <p className="text-sm text-blue-600 mt-2 font-medium">
                          {doc.branch.name}
                        </p>
                      )}
                    </div>

                    {/* Document Metadata with Icons */}
                    <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 pb-4 border-b border-gray-100">
                      <div className="flex items-center gap-2 hover:text-gray-800 transition-colors">
                        <div className="p-1 bg-blue-50 rounded-full">
                          <Calendar className="h-3 w-3 text-blue-600" />
                        </div>
                        <span className="font-medium">
                          {format(new Date(doc.mtDate), "dd/MM/yyyy", {
                            locale: th,
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 hover:text-gray-800 transition-colors">
                        <div className="p-1 bg-purple-50 rounded-full">
                          <FileText className="h-3 w-3 text-purple-600" />
                        </div>
                        <span className="font-medium">
                          {formatFileSize(doc.fileSize)}
                        </span>
                      </div>
                    </div>

                    {/* Uploader Information */}
                    {doc.uploader && (
                      <div className="pt-4 text-sm text-gray-600">
                        <div className="flex items-center justify-between">
                          <span>
                            โดย:{" "}
                            <span className="font-medium text-gray-900">
                              {doc.uploader.firstName} {doc.uploader.lastName}
                            </span>
                          </span>
                          <span className="text-xs text-gray-500">
                            {format(
                              new Date(doc.createdAt),
                              "dd/MM/yyyy HH:mm",
                              { locale: th },
                            )}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Side - Status & Actions */}
                  <div className="md:w-80 p-4 md:p-6 bg-gradient-to-br from-gray-50 to-gray-100/50">
                    {/* Verification Status with Progress */}
                    {doc.hasAdditionalDocs && doc.additionalDocs && doc.additionalDocs.filter(doc => doc && doc.trim() !== '').length > 0 && (
                      <div className="mb-6 p-3 md:p-4 bg-white rounded-lg border">
                        <VerificationStatus
                          documentId={doc.id}
                          additionalDocs={doc.additionalDocs}
                        />
                      </div>
                    )}

                    {/* Primary Action Button */}
                    <div className="space-y-3">
                      <SendBackButton
                        doc={doc}
                        onSendBack={(id) =>
                          setSendBackDialogOpen((prev) => ({
                            ...prev,
                            [id]: true,
                          }))
                        }
                        disabled={sendingBackId === doc.id}
                      />

                      {/* Secondary Action Buttons */}
                      <div className="flex flex-col gap-2">
                        <Link href={`/documents/${doc.id}`} className="w-full">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all duration-200"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            ดูรายละเอียดเอกสาร
                          </Button>
                        </Link>

                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all duration-200"
                          onClick={() =>
                            handleDownload(doc.id, doc.originalFilename)
                          }
                        >
                          <Download className="h-4 w-4 mr-2" />
                          ดาวน์โหลด
                        </Button>

                        {/* Comment Count Button - Always show for interactive purposes */}
                        <Dialog 
                          open={commentsDialogOpen[doc.id] || false}
                          onOpenChange={(open) => setCommentsDialogOpen(prev => ({ ...prev, [doc.id]: open }))}
                        >
                          <DialogTrigger asChild>
                            <div 
                              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-medium transition-all duration-200 cursor-pointer hover:shadow-md ${
                                doc.commentCount && doc.commentCount > 0
                                  ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100 text-blue-700 hover:from-blue-100 hover:to-indigo-100'
                                  : 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200 text-gray-600 hover:from-gray-100 hover:to-gray-200'
                              }`}
                              onClick={() => setCommentsDialogOpen(prev => ({ ...prev, [doc.id]: true }))}
                            >
                              <div className={`p-1 rounded-full ${
                                doc.commentCount && doc.commentCount > 0
                                  ? 'bg-blue-100'
                                  : 'bg-gray-200'
                              }`}>
                                <MessageSquare className={`h-3 w-3 ${
                                  doc.commentCount && doc.commentCount > 0
                                    ? 'text-blue-600'
                                    : 'text-gray-500'
                                }`} />
                              </div>
                              <span>
                                {doc.commentCount && doc.commentCount > 0 
                                  ? `${doc.commentCount} ความคิดเห็น`
                                  : 'เพิ่มความคิดเห็น'
                                }
                              </span>
                            </div>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <MessageSquare className="h-5 w-5 text-blue-600" />
                                ความคิดเห็นของเอกสาร {doc.mtNumber}
                              </DialogTitle>
                              <DialogDescription>
                                {doc.subject}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="flex-1 overflow-hidden">
                              {user && !authLoading ? (
                                <CommentSystem
                                  documentId={doc.id}
                                  userRoles={user?.pwa?.roles || []}
                                  currentUserId={user?.id ? parseInt(user.id) : undefined}
                                  refreshInterval={10000}
                                />
                              ) : (
                                <div className="flex items-center justify-center py-8">
                                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                                  <span>กำลังโหลดความคิดเห็น...</span>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>

                        {canDeleteDocument(doc) && (
                          <Dialog
                            open={deleteDialogOpen[doc.id] || false}
                            onOpenChange={(open) =>
                              setDeleteDialogOpen((prev) => ({
                                ...prev,
                                [doc.id]: open,
                              }))
                            }
                          >
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                disabled={deletingId === doc.id}
                                onClick={() =>
                                  setDeleteDialogOpen((prev) => ({
                                    ...prev,
                                    [doc.id]: true,
                                  }))
                                }
                              >
                                {deletingId === doc.id ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4 mr-2" />
                                )}
                                ลบ
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>ยืนยันการลบเอกสาร</DialogTitle>
                                <DialogDescription>
                                  คุณแน่ใจหรือไม่ที่จะลบเอกสาร &quot;
                                  {doc.mtNumber}&quot; - {doc.subject}?
                                  <br />
                                  <strong className="text-red-600">
                                    การดำเนินการนี้ไม่สามารถยกเลิกได้
                                  </strong>
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <Button
                                  variant="outline"
                                  onClick={() =>
                                    setDeleteDialogOpen((prev) => ({
                                      ...prev,
                                      [doc.id]: false,
                                    }))
                                  }
                                >
                                  ยกเลิก
                                </Button>
                                <Button
                                  className="bg-red-600 hover:bg-red-700"
                                  onClick={() => handleDelete(doc.id)}
                                  disabled={deletingId === doc.id}
                                >
                                  {deletingId === doc.id ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                      กำลังลบ...
                                    </>
                                  ) : (
                                    "ลบเอกสาร"
                                  )}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && !isForbidden && !error && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-700">
            หน้า {filters.page} จาก {totalPages} ({totalDocuments} เอกสาร)
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFilterChange("page", filters.page - 1)}
              disabled={filters.page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              ก่อนหน้า
            </Button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <Button
                    key={page}
                    variant={filters.page === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleFilterChange("page", page)}
                  >
                    {page}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFilterChange("page", filters.page + 1)}
              disabled={filters.page >= totalPages}
            >
              ถัดไป
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Success Dialog */}
      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div>
                <DialogTitle className="text-green-800">
                  ลบเอกสารสำเร็จ
                </DialogTitle>
                <DialogDescription className="text-gray-600">
                  เอกสารถูกลบออกจากระบบเรียบร้อยแล้ว
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="py-4">
            {deletedDocumentInfo && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">
                  เอกสารที่ถูกลบ:
                </h4>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="font-medium">เลขที่:</span>{" "}
                    {deletedDocumentInfo.mtNumber}
                  </p>
                  <p>
                    <span className="font-medium">เรื่อง:</span>{" "}
                    {deletedDocumentInfo.subject}
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setSuccessDialogOpen(false);
                setDeletedDocumentInfo(null);
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              ตกลง
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Back to District Dialogs */}
      {documents.map((doc) => (
        <Dialog
          key={`sendback-${doc.id}`}
          open={sendBackDialogOpen[doc.id] || false}
          onOpenChange={(open) => {
            setSendBackDialogOpen((prev) => ({ ...prev, [doc.id]: open }));
            if (!open) {
              setSendBackComment("");
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ส่งเอกสารเพิ่มเติมกลับเขต</DialogTitle>
              <DialogDescription>
                คุณต้องการส่งเอกสาร &quot;{doc.mtNumber}&quot; - {doc.subject}{" "}
                กลับเขตหรือไม่?
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <label
                htmlFor="sendBackComment"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                ความคิดเห็น <span className="text-red-500">*</span>
              </label>
              <Textarea
                id="sendBackComment"
                placeholder="กรุณาใส่ความคิดเห็นเกี่ยวกับการส่งเอกสารกลับเขต"
                value={sendBackComment}
                onChange={(e) => setSendBackComment(e.target.value)}
                rows={4}
                className="w-full"
              />
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setSendBackDialogOpen((prev) => ({
                    ...prev,
                    [doc.id]: false,
                  }));
                  setSendBackComment("");
                }}
              >
                ยกเลิก
              </Button>
              <Button
                onClick={() => handleSendBackToDistrict(doc.id)}
                disabled={sendingBackId === doc.id || !sendBackComment.trim()}
                className="bg-green-600 hover:bg-green-700"
              >
                {sendingBackId === doc.id ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    กำลังส่ง...
                  </>
                ) : (
                  "ส่งกลับเขต"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ))}
    </div>
  );
}
