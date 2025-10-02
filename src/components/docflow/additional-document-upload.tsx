"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Upload,
  Download,
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle,
  Eye,
  Check,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { AdditionalDocumentPDFModal } from "./additional-document-pdf-modal";

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
  verificationComment: string | null;
  correctionCount: number;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AdditionalDocumentUploadProps {
  documentId: number;
  additionalDocs: string[];
  additionalDocsDueDates?: string[];
  userRoles?: string[];
  documentStatus?: string;
  additionalDocsReceivedDate?: string;
  onFileUploaded?: () => void;
}

export function AdditionalDocumentUpload({
  documentId,
  additionalDocs = [],
  additionalDocsDueDates = [],
  userRoles = [],
  documentStatus = "",
  additionalDocsReceivedDate,
  onFileUploaded,
}: AdditionalDocumentUploadProps) {
  const [uploadingItems, setUploadingItems] = useState<Set<number>>(new Set());
  const [existingFiles, setExistingFiles] = useState<
    Record<number, AdditionalFile>
  >({});
  const [loading, setLoading] = useState(true);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [selectedPdfFile, setSelectedPdfFile] = useState<{
    itemIndex: number;
    itemName: string;
    filename: string;
  } | null>(null);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [pendingIncorrectVerification, setPendingIncorrectVerification] =
    useState<{
      itemIndex: number;
      itemName: string;
    } | null>(null);
  const [receivingAdditionalDocs, setReceivingAdditionalDocs] = useState(false);
  const [localReceivedDate, setLocalReceivedDate] = useState<string | undefined>(additionalDocsReceivedDate);

  // Check if user can upload files
  const canUpload =
    userRoles.includes("branch_user") ||
    userRoles.includes("branch_manager") ||
    userRoles.includes("admin");

  // Check if user can verify files (admin, district_manager, uploader)
  const canVerify =
    userRoles.includes("admin") ||
    userRoles.includes("district_manager") ||
    userRoles.includes("uploader");

  // Check if document status allows uploads (must be acknowledged and not completed)
  const isDocumentAcknowledged = documentStatus === "acknowledged";
  const isDocumentCompleted = documentStatus === "complete";
  const canUploadBasedOnStatus =
    canUpload && isDocumentAcknowledged && !isDocumentCompleted;

  // Debug logging
  console.log("AdditionalDocumentUpload - userRoles:", userRoles);
  console.log("AdditionalDocumentUpload - canVerify:", canVerify);
  console.log("AdditionalDocumentUpload - documentStatus:", documentStatus);
  console.log(
    "AdditionalDocumentUpload - isDocumentAcknowledged:",
    isDocumentAcknowledged,
  );
  console.log(
    "AdditionalDocumentUpload - canUploadBasedOnStatus:",
    canUploadBasedOnStatus,
  );
  console.log("AdditionalDocumentUpload - existingFiles:", existingFiles);

  // Fetch existing files
  useEffect(() => {
    const fetchExistingFiles = async () => {
      try {
        const response = await fetch(
          `/api/documents/${documentId}/additional-files`,
          {
            credentials: "include",
          },
        );

        const result = await response.json();

        if (response.ok && result.success) {
          const filesMap: Record<number, AdditionalFile> = {};
          result.data.forEach((file: AdditionalFile) => {
            // All additional documents now use 0-based indexing directly
            filesMap[file.itemIndex] = file;
          });
          setExistingFiles(filesMap);
        }
      } catch (error) {
        console.error("Error fetching existing files:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchExistingFiles();
  }, [documentId]);

  // Handle file upload
  const handleFileUpload = async (
    file: File,
    itemIndex: number,
    itemName: string,
  ) => {
    if (!file) return;

    // Validate file type
    if (file.type !== "application/pdf") {
      toast.error("กรุณาเลือกไฟล์ PDF เท่านั้น");
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error("ขนาดไฟล์ต้องไม่เกิน 10MB");
      return;
    }

    setUploadingItems((prev) => new Set(prev).add(itemIndex));

    try {
      const formData = new FormData();
      formData.append("file", file);
      // Use itemIndex directly (0-based indexing for additional docs)
      formData.append("itemIndex", itemIndex.toString());
      formData.append("itemName", itemName);

      const response = await fetch(
        `/api/documents/${documentId}/additional-files`,
        {
          method: "POST",
          credentials: "include",
          body: formData,
        },
      );

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success("อัปโหลดไฟล์เรียบร้อย");

        // Refresh existing files
        const filesResponse = await fetch(
          `/api/documents/${documentId}/additional-files`,
          {
            credentials: "include",
          },
        );
        const filesResult = await filesResponse.json();

        if (filesResponse.ok && filesResult.success) {
          const filesMap: Record<number, AdditionalFile> = {};
          filesResult.data.forEach((file: AdditionalFile) => {
            // All additional documents now use 0-based indexing directly
            filesMap[file.itemIndex] = file;
          });
          setExistingFiles(filesMap);
        }

        if (onFileUploaded) {
          onFileUploaded();
        }
      } else {
        throw new Error(result.error || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("ไม่สามารถอัปโหลดไฟล์ได้");
    } finally {
      setUploadingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(itemIndex);
        return newSet;
      });
    }
  };

  // Handle file download
  const handleFileDownload = async (itemIndex: number, filename: string) => {
    try {
      // Use itemIndex directly (0-based indexing for additional docs)
      const response = await fetch(
        `/api/documents/${documentId}/additional-files/${itemIndex}/download`,
        {
          credentials: "include",
        },
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(link);
        toast.success("ดาวน์โหลดเรียบร้อย");
      } else {
        throw new Error("Download failed");
      }
    } catch (error) {
      console.error("Download error:", error);
      toast.error("ไม่สามารถดาวน์โหลดไฟล์ได้");
    }
  };

  // Handle file delete
  const handleFileDelete = async (itemIndex: number) => {
    try {
      // Use itemIndex directly (0-based indexing for additional docs)
      const response = await fetch(
        `/api/documents/${documentId}/additional-files?itemIndex=${itemIndex}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success("ลบไฟล์เรียบร้อย");

        // Remove from existing files
        setExistingFiles((prev) => {
          const newFiles = { ...prev };
          delete newFiles[itemIndex];
          return newFiles;
        });

        if (onFileUploaded) {
          onFileUploaded();
        }
      } else {
        throw new Error(result.error || "Delete failed");
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("ไม่สามารถลบไฟล์ได้");
    }
  };

  // Handle PDF view
  const handlePdfView = (
    itemIndex: number,
    itemName: string,
    filename: string,
  ) => {
    // Use itemIndex directly (0-based indexing for additional docs)
    setSelectedPdfFile({ itemIndex, itemName, filename });
    setPdfModalOpen(true);
  };

  // Handle verification status change
  const handleVerificationChange = async (
    itemIndex: number,
    isVerified: boolean,
    comment?: string,
  ) => {
    try {
      // Use itemIndex directly (0-based indexing)
      const body: any = { itemIndex, isVerified };
      if (comment && !isVerified) {
        body.comment = comment;
      }

      const response = await fetch(
        `/api/documents/${documentId}/additional-files`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(
          isVerified
            ? "ยืนยันเอกสารเรียบร้อย"
            : "ยกเลิกการยืนยันพร้อมความคิดเห็นเรียบร้อย",
        );

        // Refresh existing files to get updated verification status
        const filesResponse = await fetch(
          `/api/documents/${documentId}/additional-files`,
          {
            credentials: "include",
          },
        );
        const filesResult = await filesResponse.json();

        if (filesResponse.ok && filesResult.success) {
          const filesMap: Record<number, AdditionalFile> = {};
          filesResult.data.forEach((file: AdditionalFile) => {
            // All additional documents now use 0-based indexing directly
            filesMap[file.itemIndex] = file;
          });
          setExistingFiles(filesMap);
        }

        if (onFileUploaded) {
          onFileUploaded();
        }
      } else {
        throw new Error(result.error || "Verification update failed");
      }
    } catch (error) {
      console.error("Verification error:", error);
      toast.error("ไม่สามารถอัพเดทสถานะการยืนยันได้");
    }
  };

  // Handle opening comment dialog for incorrect verification
  const handleIncorrectVerification = (itemIndex: number, itemName: string) => {
    setPendingIncorrectVerification({ itemIndex, itemName });
    setCommentDialogOpen(true);
    setCommentText("");
  };

  // Handle submitting comment for incorrect verification
  const handleSubmitIncorrectComment = async () => {
    if (!pendingIncorrectVerification) return;

    await handleVerificationChange(
      pendingIncorrectVerification.itemIndex,
      false,
      commentText.trim() || undefined,
    );

    // Close dialog and reset state
    setCommentDialogOpen(false);
    setCommentText("");
    setPendingIncorrectVerification(null);
  };

  // Handle receive additional documents
  const handleReceiveAdditionalDocs = async () => {
    try {
      setReceivingAdditionalDocs(true);
      const response = await fetch(
        `/api/documents/${documentId}/receive-additional-docs`,
        {
          method: "PATCH",
          credentials: "include",
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        setLocalReceivedDate(result.data.receivedDate);
        toast.success("บันทึกการรับเอกสารเพิ่มเติมสำเร็จ");

        if (onFileUploaded) {
          onFileUploaded();
        }
      } else {
        throw new Error(result.error || "Failed to mark as received");
      }
    } catch (error) {
      console.error("Receive additional docs error:", error);
      toast.error("ไม่สามารถบันทึกการรับเอกสารเพิ่มเติมได้");
    } finally {
      setReceivingAdditionalDocs(false);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Calculate days until due date and get status
  const getDueDateStatus = (dueDate: string | null) => {
    // If documents have been received, show green "received" status
    if (localReceivedDate) {
      return { status: 'received', days: 0, color: 'text-green-600 bg-green-50 border-green-200' };
    }

    if (!dueDate) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { status: 'overdue', days: Math.abs(diffDays), color: 'text-red-600 bg-red-50 border-red-200' };
    } else if (diffDays === 0) {
      return { status: 'today', days: 0, color: 'text-orange-600 bg-orange-50 border-orange-200' };
    } else if (diffDays <= 3) {
      return { status: 'soon', days: diffDays, color: 'text-yellow-600 bg-yellow-50 border-yellow-200' };
    } else {
      return { status: 'normal', days: diffDays, color: 'text-green-600 bg-green-50 border-green-200' };
    }
  };

  // Format due date in Thai format
  const formatDueDate = (dueDate: string | null) => {
    if (!dueDate) return '';
    const date = new Date(dueDate);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            กำลังโหลด...
          </div>
        </CardContent>
      </Card>
    );
  }

  // Check if all additional documents have been uploaded
  const filteredDocs = additionalDocs.filter((doc) => doc && doc.trim() !== "");
  const allDocsUploaded =
    filteredDocs.length > 0 &&
    filteredDocs.every((_, index) => existingFiles[index]);

  // Check if all documents are verified
  const allDocsVerified =
    allDocsUploaded &&
    filteredDocs.every((_, index) => {
      const file = existingFiles[index];
      return file && file.isVerified === true;
    });

  return (
    <>
      <Card>
        <CardContent className="p-6">
          {/* All documents uploaded indicator */}
          {allDocsUploaded && !localReceivedDate && (
            <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-700">
                    {allDocsVerified
                      ? "ตรวจสอบเอกสารครบแล้ว"
                      : "เอกสารแนบครบแล้วกำลังตรวจสอบ"}
                  </span>
                </div>
                {/* Show button only for admin/district_manager when status is sent_back_to_district and all docs verified */}
                {canVerify && documentStatus === 'sent_back_to_district' && allDocsVerified && (
                  <Button
                    onClick={handleReceiveAdditionalDocs}
                    disabled={receivingAdditionalDocs}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {receivingAdditionalDocs ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        กำลังบันทึก...
                      </>
                    ) : (
                      'รับเอกสารเพิ่มเติมแล้ว'
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Show received confirmation */}
          {localReceivedDate && (
            <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-700">
                  รับเอกสารเพิ่มเติมแล้วเมื่อวันที่ {formatDueDate(localReceivedDate)}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {filteredDocs.map((doc, index) => {
              const existingFile = existingFiles[index];
              const isUploading = uploadingItems.has(index);
              const verificationState = existingFile?.isVerified;
              const isPendingVerification =
                verificationState === null || verificationState === undefined;

              return (
                <div
                  key={index}
                  className="rounded-2xl border border-gray-200 bg-white shadow-sm"
                >
                  <div className="space-y-6 p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-base font-semibold text-blue-700">
                          {index + 1}
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-3">
                            <p className="text-lg font-semibold text-gray-900">
                              {doc}
                            </p>
                            {(() => {
                              // If documents have been received by admin, show received date for all users
                              if (localReceivedDate) {
                                return (
                                  <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-green-600 bg-green-50 border-green-200">
                                    รับเอกสารแล้วเมื่อวันที่ {formatDueDate(localReceivedDate)}
                                  </span>
                                );
                              }

                              const dueDate = existingFile?.dueDate || additionalDocsDueDates[index];
                              const dueDateStatus = getDueDateStatus(dueDate);
                              if (!dueDateStatus) return null;

                              const formattedDate = formatDueDate(dueDate);
                              let timeRemaining = '';
                              if (dueDateStatus.status === 'overdue') {
                                timeRemaining = `เกินกำหนด ${dueDateStatus.days} วัน`;
                              } else if (dueDateStatus.status === 'today') {
                                timeRemaining = 'ครบกำหนดวันนี้';
                              } else {
                                timeRemaining = `เหลือระยะเวลา ${dueDateStatus.days} วัน`;
                              }

                              return (
                                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${dueDateStatus.color}`}>
                                  กำหนดส่ง: {formattedDate} / {timeRemaining}
                                </span>
                              );
                            })()}
                            {existingFile &&
                              existingFile.correctionCount > 0 && (
                                <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                                  แก้ไขครั้งที่ {existingFile.correctionCount}
                                </span>
                              )}
                          </div>
                          <p className="text-sm text-gray-500">
                            {existingFile
                              ? existingFile.originalFilename
                              : "ยังไม่มีไฟล์ที่อัปโหลด"}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {existingFile && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 rounded-full border-gray-200 px-3 text-sm font-medium"
                              onClick={() =>
                                handlePdfView(
                                  index,
                                  doc,
                                  existingFile.originalFilename,
                                )
                              }
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              ดูเอกสาร
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 rounded-full border-gray-200 px-3 text-sm font-medium"
                              onClick={() =>
                                handleFileDownload(
                                  index,
                                  existingFile.originalFilename,
                                )
                              }
                            >
                              <Download className="mr-2 h-4 w-4" />
                              ดาวน์โหลด
                            </Button>
                            {canUploadBasedOnStatus &&
                              verificationState !== true && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-9 rounded-full border-red-200 px-3 text-sm font-medium text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        ยืนยันการลบไฟล์
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        คุณต้องการลบไฟล์ &ldquo;
                                        {existingFile.originalFilename}&rdquo;
                                        หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        ยกเลิก
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleFileDelete(index)}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        ลบไฟล์
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                          </>
                        )}

                        {canUpload &&
                          (verificationState !== true || !existingFile) && (
                            <div>
                              <Button
                                variant={existingFile ? "outline" : "default"}
                                size="sm"
                                className="h-9 rounded-full px-4 text-sm font-medium"
                                disabled={
                                  isUploading ||
                                  !isDocumentAcknowledged ||
                                  isDocumentCompleted ||
                                  verificationState === false
                                }
                                onClick={() => {
                                  if (
                                    !isDocumentAcknowledged ||
                                    isDocumentCompleted ||
                                    verificationState === false
                                  ) {
                                    return;
                                  }
                                  const input = document.getElementById(
                                    `file-input-${index}`,
                                  ) as HTMLInputElement | null;
                                  input?.click();
                                }}
                              >
                                {isUploading ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    กำลังอัปโหลด...
                                  </>
                                ) : (
                                  <>
                                    <Upload className="mr-2 h-4 w-4" />
                                    {existingFile
                                      ? "เปลี่ยนไฟล์"
                                      : "อัปโหลดไฟล์"}
                                  </>
                                )}
                              </Button>
                              <input
                                id={`file-input-${index}`}
                                type="file"
                                accept="application/pdf"
                                className="hidden"
                                onChange={(event) => {
                                  const file = event.target.files?.[0];
                                  if (file) {
                                    handleFileUpload(file, index, doc);
                                  }
                                  event.target.value = "";
                                }}
                              />
                            </div>
                          )}
                      </div>
                    </div>

                    {existingFile ? (
                      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                        <CheckCircle className="h-4 w-4" />
                        <span className="font-medium">มีไฟล์แล้ว</span>
                        <div className="h-4 w-px bg-emerald-200" />
                        <div className="flex items-center gap-2 text-emerald-700">
                          <FileText className="h-4 w-4" />
                          {formatFileSize(existingFile.fileSize)}
                        </div>
                        {verificationState === true && (
                          <span className="ml-auto inline-flex items-center gap-2 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white">
                            <Check className="h-4 w-4" /> เอกสารถูกต้อง
                          </span>
                        )}
                        {verificationState === false && (
                          <span className="ml-auto inline-flex items-center gap-2 rounded-full bg-red-500 px-3 py-1 text-xs font-semibold text-white">
                            <AlertCircle className="h-4 w-4" /> เอกสารไม่ถูกต้อง
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between rounded-xl border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500">
                        <div className="flex items-center gap-2 font-medium">
                          <AlertCircle className="h-4 w-4 text-orange-500" />
                          ยังไม่มีไฟล์แนบ
                        </div>
                        {canUpload &&
                          isDocumentAcknowledged &&
                          !isDocumentCompleted && (
                            <button
                              type="button"
                              onClick={() => {
                                const input = document.getElementById(
                                  `file-input-${index}`,
                                ) as HTMLInputElement | null;
                                input?.click();
                              }}
                              className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                            >
                              อัปโหลดไฟล์
                            </button>
                          )}
                      </div>
                    )}

                    {/* Only show verification status section for admin and district_manager */}
                    {/* For branch users, show only verification comment when document is incorrect */}
                    {(canVerify || (existingFile?.isVerified === false && existingFile.verificationComment)) && (
                      <div className="space-y-3 border-t border-gray-100 pt-4">
                        {canVerify && (
                          <>
                            <p className="text-sm font-semibold text-gray-700">
                              สถานะการตรวจสอบ:
                            </p>

                            <div className="flex flex-wrap gap-3">
                              {(() => {
                                const correctDisabled =
                                  !existingFile || verificationState === true;
                                const incorrectDisabled =
                                  !existingFile || verificationState === false;
                                return (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className={
                                        verificationState === true
                                          ? "h-10 rounded-sm border-emerald-500 bg-emerald-500 px-6 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60 disabled:pointer-events-none"
                                          : "h-10 rounded-sm border-emerald-200 bg-white px-6 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 disabled:opacity-60 disabled:pointer-events-none"
                                      }
                                      onClick={() =>
                                        handleVerificationChange(index, true)
                                      }
                                      disabled={correctDisabled}
                                    >
                                      <Check className="mr-2 h-4 w-4" />
                                      เอกสารถูกต้อง
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className={
                                        verificationState === false
                                          ? "h-10 rounded-sm border-red-500 bg-red-500 px-6 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60 disabled:pointer-events-none"
                                          : "h-10 rounded-sm border-red-200 bg-white px-6 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60 disabled:pointer-events-none"
                                      }
                                      onClick={() =>
                                        handleIncorrectVerification(index, doc)
                                      }
                                      disabled={incorrectDisabled}
                                    >
                                      <AlertCircle className="mr-2 h-4 w-4" />
                                      เอกสารไม่ถูกต้อง
                                    </Button>
                                  </>
                                );
                              })()}
                            </div>
                          </>
                        )}

                        {existingFile?.isVerified === false &&
                          existingFile.verificationComment && (
                            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                              <p className="font-semibold">ความคิดเห็น:</p>
                              <p className="whitespace-pre-line text-red-600">
                                {existingFile.verificationComment}
                              </p>
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {!canUpload && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                คุณไม่มีสิทธิ์ในการอัปโหลดไฟล์
                สามารถดาวน์โหลดไฟล์ที่มีอยู่ได้เท่านั้น
              </p>
            </div>
          )}

          {canUpload && !isDocumentAcknowledged && !isDocumentCompleted && (
            <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <p className="text-sm text-orange-700 font-medium">
                  กรุณารับทราบเอกสารก่อนอัปโหลดไฟล์เพิ่มเติม
                </p>
              </div>
              <p className="text-xs text-orange-600 mt-1">
                คลิกปุ่ม "รับทราบ" ในส่วนจัดการสถานะด้านข้าง
                เพื่อเปิดใช้งานการอัปโหลดไฟล์
              </p>
            </div>
          )}

          {canUpload && isDocumentCompleted && (
            <div className="mt-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
                <p className="text-sm text-emerald-700 font-medium">
                  เอกสารเสร็จสิ้นแล้ว
                </p>
              </div>
              <p className="text-xs text-emerald-600 mt-1">
                เอกสารนี้ได้ดำเนินการครบถ้วนแล้ว
                ไม่สามารถแก้ไขหรือเพิ่มเติมได้อีก
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comment Dialog for Incorrect Verification */}
      <Dialog open={commentDialogOpen} onOpenChange={setCommentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              เอกสารไม่ถูกต้อง
            </DialogTitle>
            <DialogDescription>
              กรุณาระบุความคิดเห็นเกี่ยวกับเหตุผลที่เอกสาร
              {pendingIncorrectVerification?.itemName
                ? ` "${pendingIncorrectVerification.itemName}"`
                : ""}{" "}
              ไม่ถูกต้อง
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="เช่น ข้อมูลไม่ครบถ้วน, ไฟล์เสียหาย, รูปแบบไม่ถูกต้อง..."
              className="min-h-[100px] resize-none"
              maxLength={500}
            />
            <div className="text-right text-xs text-gray-500 mt-1">
              {commentText.length}/500
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCommentDialogOpen(false);
                setCommentText("");
                setPendingIncorrectVerification(null);
              }}
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleSubmitIncorrectComment}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={!commentText.trim()}
            >
              ยืนยันเอกสารไม่ถูกต้อง
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF Modal */}
      {selectedPdfFile && (
        <AdditionalDocumentPDFModal
          isOpen={pdfModalOpen}
          onClose={() => {
            setPdfModalOpen(false);
            setSelectedPdfFile(null);
          }}
          documentId={documentId}
          itemIndex={selectedPdfFile.itemIndex}
          itemName={selectedPdfFile.itemName}
          filename={selectedPdfFile.filename}
        />
      )}
    </>
  );
}
