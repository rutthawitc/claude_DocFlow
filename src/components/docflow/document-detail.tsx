'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { 
  ArrowLeft, 
  Download, 
  MessageSquare, 
  Send, 
  User, 
  Calendar,
  FileText,
  Building,
  Hash,
  Edit3,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { StatusManagement } from './status-management';
import { CommentSystem } from './comment-system';
import { PDFViewer } from './pdf-viewer';
import { DocumentStatus } from '@/lib/types';

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
  comments?: Comment[];
  statusHistory?: StatusHistory[];
}

interface Comment {
  id: number;
  documentId: number;
  userId: number;
  content: string;
  createdAt: string;
  user?: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
  };
}

interface StatusHistory {
  id: number;
  documentId: number;
  fromStatus: string | null;
  toStatus: string;
  changedBy: number;
  comment: string | null;
  createdAt: string;
  changedByUser?: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
  };
}

interface DocumentDetailProps {
  documentId: number;
  userRoles?: string[];
  userId?: number;
}

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-700',
  sent_to_branch: 'bg-orange-100 text-orange-700',
  acknowledged: 'bg-green-100 text-green-700',
  sent_back_to_district: 'bg-blue-100 text-blue-700'
};

const STATUS_LABELS = {
  draft: 'ร่าง',
  sent_to_branch: 'ส่งไป',
  acknowledged: 'รับทราบ',
  sent_back_to_district: 'ส่งกลับเขต'
};

export function DocumentDetail({ documentId, userRoles = [], userId }: DocumentDetailProps) {
  const router = useRouter();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Fetch document details
  useEffect(() => {
    const fetchDocument = async () => {
      try {
        const response = await fetch(`/api/documents/${documentId}`, {
          credentials: 'include'
        });

        const result = await response.json();

        if (response.ok && result.success) {
          setDocument(result.data);
        } else {
          throw new Error(result.error || 'Failed to fetch document');
        }
      } catch (error) {
        console.error('Error fetching document:', error);
        toast.error('ไม่สามารถโหลดเอกสารได้');
        router.push('/documents');
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [documentId, router]);

  // Handle download
  const handleDownload = async () => {
    if (!document) return;

    // Check if we're in the browser environment
    if (typeof window === 'undefined') {
      console.error('Download can only be triggered on the client side');
      return;
    }

    try {
      const response = await fetch(`/api/documents/${documentId}/download`, {
        credentials: 'include'
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = window.document.createElement('a');
        link.href = url;
        link.download = document.originalFilename;
        window.document.body.appendChild(link);
        link.click();
        window.URL.revokeObjectURL(url);
        window.document.body.removeChild(link);
        toast.success('ดาวน์โหลดเรียบร้อย');
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('ไม่สามารถดาวน์โหลดไฟล์ได้');
    }
  };

  // Handle status update
  const handleStatusUpdate = async (newStatus: string, comment = '') => {
    if (!document) return;

    setUpdatingStatus(true);
    try {
      const response = await fetch(`/api/documents/${documentId}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus, comment })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setDocument(prev => prev ? { ...prev, status: newStatus } : null);
        toast.success('อัปเดทสถานะเรียบร้อย');
        
        // Refresh document to get updated status history
        window.location.reload();
      } else {
        throw new Error(result.error || 'Status update failed');
      }
    } catch (error) {
      console.error('Status update error:', error);
      toast.error('ไม่สามารถอัปเดทสถานะได้');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Handle comment submission
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!commentText.trim()) return;

    setSubmittingComment(true);
    try {
      const response = await fetch(`/api/documents/${documentId}/comments`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: commentText })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Add new comment to the list
        setDocument(prev => {
          if (!prev) return null;
          return {
            ...prev,
            comments: [...(prev.comments || []), result.data]
          };
        });
        setCommentText('');
        toast.success('เพิ่มความคิดเห็นเรียบร้อย');
      } else {
        throw new Error(result.error || 'Comment submission failed');
      }
    } catch (error) {
      console.error('Comment submission error:', error);
      toast.error('ไม่สามารถเพิ่มความคิดเห็นได้');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Check user permissions
  const canUpdateStatus = () => {
    return userRoles.includes('branch_user') || 
           userRoles.includes('branch_manager') || 
           userRoles.includes('admin');
  };

  const canAddComment = () => {
    return userRoles.includes('branch_user') || 
           userRoles.includes('branch_manager') || 
           userRoles.includes('admin');
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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        กำลังโหลด...
      </div>
    );
  }

  if (!document) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
        <h3 className="text-lg font-medium">ไม่พบเอกสาร</h3>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          กลับ
        </Button>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            ดาวน์โหลด
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Document Info */}
        <div className="xl:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-xl">{document.mtNumber}</CardTitle>
                <Badge 
                  variant="outline" 
                  className={STATUS_COLORS[document.status as keyof typeof STATUS_COLORS]}
                >
                  {STATUS_LABELS[document.status as keyof typeof STATUS_LABELS]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900">เรื่อง</h3>
                <p className="text-gray-700 mt-1">{document.subject}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">
                    วันที่ มท: {format(new Date(document.mtDate), 'dd MMMM yyyy', { locale: th })}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">
                    ประจำเดือน: {document.monthYear}
                  </span>
                </div>

                {document.branch && (
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      {document.branch.name}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">
                    {formatFileSize(document.fileSize)}
                  </span>
                </div>
              </div>

              {document.uploader && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">ผู้อัปโหลด</h4>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      {document.uploader.firstName} {document.uploader.lastName}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* PDF Viewer */}
          <PDFViewer
            documentId={document.id}
            filename={document.originalFilename}
          />

          {/* Comments Section */}
          <CommentSystem
            documentId={document.id}
            initialComments={document.comments || []}
            userRoles={userRoles}
            currentUserId={userId}
            refreshInterval={10000}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Management */}
          <Card>
            <CardHeader>
              <CardTitle>จัดการสถานะ</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusManagement
                documentId={document.id}
                currentStatus={document.status as DocumentStatus}
                userRoles={userRoles}
                onStatusUpdate={(newStatus) => {
                  setDocument(prev => {
                    if (!prev) return null;
                    return { ...prev, status: newStatus };
                  });
                }}
              />
            </CardContent>
          </Card>

          {/* Status History */}
          {document.statusHistory && document.statusHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>ประวัติการเปลี่ยนสถานะ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {document.statusHistory.map((history) => (
                    <div key={history.id} className="border-l-2 border-gray-200 pl-3">
                      <div className="flex items-center justify-between mb-1">
                        <Badge 
                          variant="outline" 
                          className={STATUS_COLORS[history.toStatus as keyof typeof STATUS_COLORS]}
                        >
                          {STATUS_LABELS[history.toStatus as keyof typeof STATUS_LABELS]}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500">
                          {format(new Date(history.createdAt), 'dd/MM/yyyy HH:mm', { locale: th })}
                        </p>
                        {history.changedByUser && (
                          <p className="text-xs font-medium text-gray-700">
                            โดย {history.changedByUser.firstName} {history.changedByUser.lastName}
                          </p>
                        )}
                      </div>
                      {history.comment && (
                        <p className="text-sm text-gray-600 mt-1">
                          {history.comment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}