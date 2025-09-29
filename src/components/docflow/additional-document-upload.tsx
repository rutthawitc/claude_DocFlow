'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Upload, 
  Download, 
  Trash2, 
  Loader2,
  CheckCircle,
  AlertCircle,
  Eye,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
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
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AdditionalDocumentPDFModal } from './additional-document-pdf-modal';

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
  createdAt: string;
  updatedAt: string;
}

interface AdditionalDocumentUploadProps {
  documentId: number;
  additionalDocs: string[];
  userRoles?: string[];
  documentStatus?: string;
  onFileUploaded?: () => void;
}

export function AdditionalDocumentUpload({ 
  documentId, 
  additionalDocs = [], 
  userRoles = [],
  documentStatus = '',
  onFileUploaded 
}: AdditionalDocumentUploadProps) {
  const [uploadingItems, setUploadingItems] = useState<Set<number>>(new Set());
  const [existingFiles, setExistingFiles] = useState<Record<number, AdditionalFile>>({});
  const [loading, setLoading] = useState(true);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [selectedPdfFile, setSelectedPdfFile] = useState<{
    itemIndex: number;
    itemName: string;
    filename: string;
  } | null>(null);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [pendingIncorrectVerification, setPendingIncorrectVerification] = useState<{
    itemIndex: number;
    itemName: string;
  } | null>(null);

  // Check if user can upload files
  const canUpload = userRoles.includes('branch_user') || 
                   userRoles.includes('branch_manager') || 
                   userRoles.includes('admin');

  // Check if user can verify files (admin, district_manager, uploader)
  const canVerify = userRoles.includes('admin') || 
                   userRoles.includes('district_manager') || 
                   userRoles.includes('uploader');

  // Check if document status allows uploads (must be acknowledged and not completed)
  const isDocumentAcknowledged = documentStatus === 'acknowledged';
  const isDocumentCompleted = documentStatus === 'complete';
  const canUploadBasedOnStatus = canUpload && isDocumentAcknowledged && !isDocumentCompleted;

  // Debug logging
  console.log('AdditionalDocumentUpload - userRoles:', userRoles);
  console.log('AdditionalDocumentUpload - canVerify:', canVerify);
  console.log('AdditionalDocumentUpload - documentStatus:', documentStatus);
  console.log('AdditionalDocumentUpload - isDocumentAcknowledged:', isDocumentAcknowledged);
  console.log('AdditionalDocumentUpload - canUploadBasedOnStatus:', canUploadBasedOnStatus);
  console.log('AdditionalDocumentUpload - existingFiles:', existingFiles);

  // Fetch existing files
  useEffect(() => {
    const fetchExistingFiles = async () => {
      try {
        const response = await fetch(`/api/documents/${documentId}/additional-files`, {
          credentials: 'include'
        });

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
        console.error('Error fetching existing files:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchExistingFiles();
  }, [documentId]);

  // Handle file upload
  const handleFileUpload = async (file: File, itemIndex: number, itemName: string) => {
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      toast.error('กรุณาเลือกไฟล์ PDF เท่านั้น');
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error('ขนาดไฟล์ต้องไม่เกิน 10MB');
      return;
    }

    setUploadingItems(prev => new Set(prev).add(itemIndex));

    try {
      const formData = new FormData();
      formData.append('file', file);
      // Add 1 to itemIndex since additional docs start from index 1 (0 is reserved for emendation)
      formData.append('itemIndex', (itemIndex + 1).toString());
      formData.append('itemName', itemName);

      const response = await fetch(`/api/documents/${documentId}/additional-files`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success('อัปโหลดไฟล์เรียบร้อย');
        
        // Refresh existing files
        const filesResponse = await fetch(`/api/documents/${documentId}/additional-files`, {
          credentials: 'include'
        });
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
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('ไม่สามารถอัปโหลดไฟล์ได้');
    } finally {
      setUploadingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemIndex);
        return newSet;
      });
    }
  };

  // Handle file download
  const handleFileDownload = async (itemIndex: number, filename: string) => {
    try {
      // Add 1 to itemIndex since additional docs start from index 1 (0 is reserved for emendation)
      const actualItemIndex = itemIndex + 1;
      const response = await fetch(`/api/documents/${documentId}/additional-files/${actualItemIndex}/download`, {
        credentials: 'include'
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(link);
        toast.success('ดาวน์โหลดเรียบร้อย');
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('ไม่สามารถดาวน์โหลดไฟล์ได้');
    }
  };

  // Handle file delete
  const handleFileDelete = async (itemIndex: number) => {
    try {
      // Add 1 to itemIndex since additional docs start from index 1 (0 is reserved for emendation)
      const actualItemIndex = itemIndex + 1;
      const response = await fetch(`/api/documents/${documentId}/additional-files?itemIndex=${actualItemIndex}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success('ลบไฟล์เรียบร้อย');
        
        // Remove from existing files
        setExistingFiles(prev => {
          const newFiles = { ...prev };
          delete newFiles[itemIndex];
          return newFiles;
        });

        if (onFileUploaded) {
          onFileUploaded();
        }
      } else {
        throw new Error(result.error || 'Delete failed');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('ไม่สามารถลบไฟล์ได้');
    }
  };

  // Handle PDF view
  const handlePdfView = (itemIndex: number, itemName: string, filename: string) => {
    // Add 1 to itemIndex since additional docs start from index 1 (0 is reserved for emendation)
    setSelectedPdfFile({ itemIndex: itemIndex + 1, itemName, filename });
    setPdfModalOpen(true);
  };

  // Handle verification status change
  const handleVerificationChange = async (itemIndex: number, isVerified: boolean, comment?: string) => {
    try {
      // Use itemIndex directly (0-based indexing)
      const body: any = { itemIndex, isVerified };
      if (comment && !isVerified) {
        body.comment = comment;
      }

      const response = await fetch(`/api/documents/${documentId}/additional-files`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(isVerified ? 'ยืนยันเอกสารเรียบร้อย' : 'ยกเลิกการยืนยันพร้อมความคิดเห็นเรียบร้อย');
        
        // Refresh existing files to get updated verification status
        const filesResponse = await fetch(`/api/documents/${documentId}/additional-files`, {
          credentials: 'include'
        });
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
        throw new Error(result.error || 'Verification update failed');
      }
    } catch (error) {
      console.error('Verification error:', error);
      toast.error('ไม่สามารถอัพเดทสถานะการยืนยันได้');
    }
  };

  // Handle opening comment dialog for incorrect verification
  const handleIncorrectVerification = (itemIndex: number, itemName: string) => {
    setPendingIncorrectVerification({ itemIndex, itemName });
    setCommentDialogOpen(true);
    setCommentText('');
  };

  // Handle submitting comment for incorrect verification
  const handleSubmitIncorrectComment = async () => {
    if (!pendingIncorrectVerification) return;

    await handleVerificationChange(
      pendingIncorrectVerification.itemIndex, 
      false, 
      commentText.trim() || undefined
    );

    // Close dialog and reset state
    setCommentDialogOpen(false);
    setCommentText('');
    setPendingIncorrectVerification(null);
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
  const filteredDocs = additionalDocs.filter(doc => doc && doc.trim() !== '');
  const allDocsUploaded = filteredDocs.length > 0 && filteredDocs.every((_, index) => existingFiles[index]);
  
  // Check if all documents are verified
  const allDocsVerified = allDocsUploaded && filteredDocs.every((_, index) => {
    const file = existingFiles[index];
    return file && file.isVerified === true;
  });

  return (
    <>
    <Card>
      <CardContent className="p-6">
        {/* All documents uploaded indicator */}
        {allDocsUploaded && (
          <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-700">
                {allDocsVerified 
                  ? "ตรวจสอบเอกสารครบแล้ว กรุณาส่งต้นฉบับ"
                  : "เอกสารแนบครบแล้วกำลังตรวจสอบ"
                }
              </span>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {filteredDocs.map((doc, index) => {
            const existingFile = existingFiles[index];
            const isUploading = uploadingItems.has(index);

            return (
              <div key={index} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-700">
                        {index + 1}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 mb-2">{doc}</p>
                      
                      {existingFile ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm text-green-700">มีไฟล์แล้ว</span>
                            <Badge variant="outline" className="text-xs">
                              {formatFileSize(existingFile.fileSize)}
                            </Badge>
                            {existingFile.isVerified && (
                              <div className="flex items-center gap-1">
                                <Check className="h-3 w-3 text-green-600" />
                                <span className="text-xs text-green-600">เอกสารถูกต้อง</span>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-gray-600">
                            {existingFile.originalFilename}
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-orange-500" />
                          <span className="text-sm text-orange-700">ยังไม่มีไฟล์</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      {existingFile && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePdfView(index, doc, existingFile.originalFilename)}
                            className="h-8"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            ดูเอกสาร
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleFileDownload(index, existingFile.originalFilename)}
                            className="h-8"
                          >
                            <Download className="h-3 w-3 mr-1" />
                            ดาวน์โหลด
                          </Button>
                          
                          {canUploadBasedOnStatus && existingFile.isVerified !== true && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>ยืนยันการลบไฟล์</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    คุณต้องการลบไฟล์ &ldquo;{existingFile.originalFilename}&rdquo; หรือไม่? 
                                    การกระทำนี้ไม่สามารถย้อนกลับได้
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
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

                      {canUpload && (!existingFile || !existingFile.isVerified) && (
                        <div className="relative">
                          <Button
                            variant={existingFile ? "outline" : "default"}
                            size="sm"
                            disabled={
                              isUploading || 
                              (existingFile?.isVerified === true) || 
                              (existingFile?.isVerified === false) || 
                              !isDocumentAcknowledged
                            }
                            className="h-8"
                            onClick={() => {
                              if (!isDocumentAcknowledged) {
                                return;
                              }
                              const input = document.getElementById(`file-input-${index}`) as HTMLInputElement;
                              input?.click();
                            }}
                          >
                            {isUploading ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                กำลังอัปโหลด...
                              </>
                            ) : (
                              <>
                                <Upload className="h-3 w-3 mr-1" />
                                {existingFile ? 'เปลี่ยนไฟล์' : 'อัปโหลด'}
                              </>
                            )}
                          </Button>
                          
                          <input
                            id={`file-input-${index}`}
                            type="file"
                            accept=".pdf"
                            className="hidden"
                            disabled={!isDocumentAcknowledged}
                            onChange={(e) => {
                              if (!isDocumentAcknowledged) {
                                return;
                              }
                              const file = e.target.files?.[0];
                              if (file) {
                                handleFileUpload(file, index, doc);
                              }
                              e.target.value = '';
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {existingFile && (canVerify || !canVerify) && (
                      <div className="bg-blue-50 px-3 py-3 rounded-md">
                        {canVerify ? (
                          // Admin/District Manager/Uploader - can change verification status
                          <div className="space-y-2">
                            <div className="text-xs font-medium text-blue-700 mb-2">สถานะการตรวจสอบ:</div>
                            <RadioGroup
                              value={existingFile.isVerified === true ? "correct" : existingFile.isVerified === false ? "incorrect" : ""}
                              onValueChange={(value) => {
                                console.log(`Radio changed for index ${index}:`, value);
                                if (value === "correct") {
                                  handleVerificationChange(index, true);
                                } else if (value === "incorrect") {
                                  // Open comment dialog for incorrect verification
                                  handleIncorrectVerification(index, doc);
                                }
                              }}
                              className="flex space-x-6"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="incorrect" id={`incorrect-${index}`} />
                                <Label
                                  htmlFor={`incorrect-${index}`}
                                  className="text-sm font-medium text-red-700 cursor-pointer"
                                >
                                  เอกสารไม่ถูกต้อง
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="correct" id={`correct-${index}`} />
                                <Label
                                  htmlFor={`correct-${index}`}
                                  className="text-sm font-medium text-green-700 cursor-pointer"
                                >
                                  เอกสารถูกต้อง
                                </Label>
                              </div>
                            </RadioGroup>
                            {existingFile.isVerified === false && existingFile.verificationComment && (
                              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                                <div className="font-medium text-red-700 mb-1">ความคิดเห็น:</div>
                                <div className="text-red-600 break-words">{existingFile.verificationComment}</div>
                              </div>
                            )}
                          </div>
                        ) : (
                          // Branch users - read-only status display
                          <div className="space-y-1">
                            <div className="text-xs font-medium text-blue-700">สถานะการตรวจสอบ:</div>
                            <div className="flex items-center space-x-2">
                              {existingFile.isVerified === true ? (
                                <>
                                  <Check className="h-4 w-4 text-green-600" />
                                  <span className="text-sm font-medium text-green-700">เอกสารถูกต้อง</span>
                                </>
                              ) : existingFile.isVerified === false ? (
                                <>
                                  <AlertCircle className="h-4 w-4 text-red-600" />
                                  <span className="text-sm font-medium text-red-700">เอกสารไม่ถูกต้อง</span>
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="h-4 w-4 text-gray-500" />
                                  <span className="text-sm font-medium text-gray-600">ยังไม่ตรวจสอบ</span>
                                </>
                              )}
                            </div>
                            {existingFile.isVerified === false && existingFile.verificationComment && (
                              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                                <div className="font-medium text-red-700 mb-1">ความคิดเห็น:</div>
                                <div className="text-red-600 break-words">{existingFile.verificationComment}</div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!canUpload && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              คุณไม่มีสิทธิ์ในการอัปโหลดไฟล์ สามารถดาวน์โหลดไฟล์ที่มีอยู่ได้เท่านั้น
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
              คลิกปุ่ม "รับทราบ" ในส่วนจัดการสถานะด้านข้าง เพื่อเปิดใช้งานการอัปโหลดไฟล์
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
              เอกสารนี้ได้ดำเนินการครบถ้วนแล้ว ไม่สามารถแก้ไขหรือเพิ่มเติมได้อีก
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
            กรุณาระบุความคิดเห็นเกี่ยวกับเหตุผลที่เอกสาร{pendingIncorrectVerification?.itemName ? ` "${pendingIncorrectVerification.itemName}"` : ''} ไม่ถูกต้อง
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
              setCommentText('');
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