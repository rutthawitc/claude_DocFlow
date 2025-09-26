'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { PDFViewer } from './pdf-viewer';

interface EmendationFile {
  id: number;
  documentId: number;
  itemIndex: number;
  itemName: string;
  filePath: string;
  originalFilename: string;
  fileSize: number;
  uploaderId: number;
  createdAt: string;
  uploader?: {
    firstName: string;
    lastName: string;
  };
}

interface EmendationDocumentViewerProps {
  documentId: number;
  userRoles?: string[];
}

export function EmendationDocumentViewer({
  documentId,
  userRoles = []
}: EmendationDocumentViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [emendationFiles, setEmendationFiles] = useState<EmendationFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch emendation document files
  useEffect(() => {
    const fetchEmendationFiles = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/documents/${documentId}/additional-files`, {
          credentials: 'include',
        });

        const result = await response.json();

        if (response.ok && result.success) {
          // Filter for emendation documents (we could add a flag later to distinguish)
          // For now, we'll consider all additional files as potential emendation docs
          setEmendationFiles(result.data || []);
        } else {
          throw new Error(result.error || 'Failed to fetch emendation files');
        }
      } catch (error) {
        console.error('Error fetching emendation files:', error);
        setError('ไม่สามารถโหลดเอกสารแก้ไขได้');
      } finally {
        setLoading(false);
      }
    };

    fetchEmendationFiles();
  }, [documentId]);

  // Handle file download
  const handleDownload = async (file: EmendationFile) => {
    try {
      const response = await fetch(
        `/api/documents/${documentId}/additional-files/${file.itemIndex}/download`,
        {
          credentials: 'include',
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.originalFilename;
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

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Don't render if no emendation files
  if (loading) {
    // Show minimal loading state, don't take up much space
    return (
      <div className="flex items-center gap-2 p-2 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>กำลังตรวจสอบเอกสารแก้ไข...</span>
      </div>
    );
  }

  if (error) {
    // Show error but don't render full card if it's just "no files found"
    if (error.includes('ไม่สามารถโหลดเอกสารแก้ไขได้')) {
      return null; // This usually means no files exist, so don't show anything
    }
    return (
      <Card className="border-red-200 bg-red-50 mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (emendationFiles.length === 0) {
    return null; // Don't render if no emendation files
  }

  return (
    <Card className="border-blue-200 bg-blue-50 mb-6">
      <CardHeader
        className="cursor-pointer hover:bg-blue-100 transition-colors pb-3"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <span className="text-blue-800">เอกสารแก้ไข</span>
            <Badge variant="secondary" className="bg-blue-200 text-blue-800">
              {emendationFiles.length} ไฟล์
            </Badge>
          </div>
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-blue-600" />
          ) : (
            <ChevronRight className="h-5 w-5 text-blue-600" />
          )}
        </CardTitle>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-4">
            {emendationFiles.map((file) => (
              <div key={file.id} className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <FileText className="h-6 w-6 text-red-600 mt-1" />
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">
                        {file.originalFilename}
                      </h4>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>ขนาด: {formatFileSize(file.fileSize)}</p>
                        {file.uploader && (
                          <p>อัปโหลดโดย: {file.uploader.firstName} {file.uploader.lastName}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(file)}
                      className="text-gray-600 border-gray-300 hover:bg-gray-50"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      ดาวน์โหลด
                    </Button>
                  </div>
                </div>

                {/* PDF Viewer for this file */}
                <div className="border-t border-gray-200 pt-3">
                  <PDFViewer
                    documentId={documentId}
                    filename={file.originalFilename}
                    additionalFileIndex={file.itemIndex}
                    compact={true}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}