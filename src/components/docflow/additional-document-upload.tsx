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
  AlertCircle
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

interface AdditionalFile {
  id: number;
  documentId: number;
  itemIndex: number;
  itemName: string;
  filePath: string;
  originalFilename: string;
  fileSize: number;
  uploaderId: number;
  createdAt: string;
  updatedAt: string;
}

interface AdditionalDocumentUploadProps {
  documentId: number;
  additionalDocs: string[];
  userRoles?: string[];
  onFileUploaded?: () => void;
}

export function AdditionalDocumentUpload({ 
  documentId, 
  additionalDocs = [], 
  userRoles = [],
  onFileUploaded 
}: AdditionalDocumentUploadProps) {
  const [uploadingItems, setUploadingItems] = useState<Set<number>>(new Set());
  const [existingFiles, setExistingFiles] = useState<Record<number, AdditionalFile>>({});
  const [loading, setLoading] = useState(true);

  // Check if user can upload files
  const canUpload = userRoles.includes('branch_user') || 
                   userRoles.includes('branch_manager') || 
                   userRoles.includes('admin');

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
      formData.append('itemIndex', itemIndex.toString());
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
      const response = await fetch(`/api/documents/${documentId}/additional-files/${itemIndex}/download`, {
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
      const response = await fetch(`/api/documents/${documentId}/additional-files?itemIndex=${itemIndex}`, {
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

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          {additionalDocs.filter(doc => doc && doc.trim() !== '').map((doc, index) => {
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

                  <div className="flex items-center gap-2">
                    {existingFile && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleFileDownload(index, existingFile.originalFilename)}
                          className="h-8"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          ดาวน์โหลด
                        </Button>
                        
                        {canUpload && (
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

                    {canUpload && (
                      <div className="relative">
                        <Button
                          variant={existingFile ? "outline" : "default"}
                          size="sm"
                          disabled={isUploading}
                          className="h-8"
                          onClick={() => {
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
                          onChange={(e) => {
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
      </CardContent>
    </Card>
  );
}